/* ============================================================
   ШАХМАТЫ — настоящий 3D (WebGL / three.js)
   Объёмные точёные фигуры, камера сверху-сбоку (видно макушки),
   клики через raycaster → та же логика ходов, что и в 2D.
   Экспортирует window.Chess3D: init / update / setVisible / dispose / resize
   ============================================================ */
(function () {
  const T = window.THREE;
  if (!T) { console.warn('[3D] three.js не загружен'); return; }

  const N = 8, S = 1;            // 8×8, размер клетки = 1 юнит
  const HALF = (N * S) / 2;

  let scene, camera, renderer, raycaster, pointer, rafId = null;
  let root, boardGroup, pieceGroup, hlGroup, sqMeshes = [];
  let container, hooks = {}, visible = false, needsRender = true;
  const pieceCache = {};        // геометрии по типу

  // ---- Профили точёных фигур (правый силуэт: x=радиус, y=высота) ----
  function arc(cx, cy, r, a0, a1, steps) {
    const p = [];
    for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return p;
  }
  function baseStem(baseR, baseH, neckR, neckY) {
    return [[0, 0], [baseR, 0], [baseR, baseH * 0.5], [baseR * 0.8, baseH], [neckR * 1.4, baseH + 0.03], [neckR, neckY]];
  }
  const PROFILES = {
    p: () => {   // пешка
      let s = baseStem(0.34, 0.12, 0.12, 0.42);
      s = s.concat([[0.19, 0.46], [0.11, 0.50]]);
      s = s.concat(arc(0, 0.60, 0.15, -Math.PI / 2, Math.PI / 2, 10));
      return s;
    },
    r: () => {   // ладья — тело (зубцы добавляются боксами)
      let s = baseStem(0.37, 0.14, 0.18, 0.42);
      s = s.concat([[0.22, 0.48], [0.20, 0.58], [0.27, 0.62], [0.29, 0.72], [0.33, 0.74], [0.33, 0.80], [0, 0.80]]);
      return s;
    },
    b: () => {   // слон
      let s = baseStem(0.34, 0.12, 0.13, 0.5);
      s = s.concat([[0.18, 0.56], [0.10, 0.60]]);
      s = s.concat(arc(0, 0.72, 0.15, -Math.PI / 2, Math.PI / 2, 10));
      s = s.concat([[0.05, 0.90], [0.07, 0.98], [0, 1.0]]);
      return s;
    },
    q: () => {   // ферзь — тело с чашей короны (бусины сверху отдельно)
      let s = baseStem(0.38, 0.14, 0.15, 0.56);
      s = s.concat([[0.20, 0.62], [0.29, 0.72], [0.33, 0.78]]);                       // воротник
      s = s.concat([[0.21, 0.82], [0.30, 0.90], [0.31, 0.96], [0.16, 0.96], [0.14, 0.90], [0, 0.90]]);  // чаша короны
      return s;
    },
    k: () => {   // король — тело с круглой макушкой (крест отдельно)
      let s = baseStem(0.40, 0.15, 0.16, 0.58);
      s = s.concat([[0.22, 0.64], [0.31, 0.74], [0.34, 0.80]]);                       // воротник
      s = s.concat([[0.24, 0.84], [0.15, 0.86]]);                                     // шея
      s = s.concat(arc(0, 0.98, 0.13, -Math.PI / 2, Math.PI / 2, 8));                 // круглая макушка
      return s;
    },
    n: () => {   // конь — постамент (голова добавляется силуэтом)
      let s = baseStem(0.37, 0.14, 0.18, 0.36);
      s = s.concat([[0.22, 0.42], [0.15, 0.48], [0, 0.48]]);
      return s;
    },
  };

  function pieceGeometry(type) {
    if (pieceCache[type]) return pieceCache[type];
    const pts = PROFILES[type]().map(p => new T.Vector2(p[0], p[1]));
    const g = new T.LatheGeometry(pts, 40);
    g.computeVertexNormals();
    pieceCache[type] = g;
    return g;
  }

  // Ладья: тело + зубцы (кирпичики) по кругу с промежутками
  function rookMesh(mat) {
    const grp = new T.Group();
    const body = new T.Mesh(pieceGeometry('r'), mat); body.castShadow = true; grp.add(body);
    const merlon = new T.BoxGeometry(0.16, 0.18, 0.14);
    const R = 0.24, y = 0.88, n = 8;
    for (let i = 0; i < n; i += 2) {
      const a = (i / n) * Math.PI * 2;
      const m = new T.Mesh(merlon, mat); m.castShadow = true;
      m.position.set(Math.cos(a) * R, y, Math.sin(a) * R); m.rotation.y = -a;
      grp.add(m);
    }
    return grp;
  }

  // Конь: постамент + настоящая голова коня (выдавленный силуэт)
  let _knightGeo = null;
  function knightHeadGeo() {
    if (_knightGeo) return _knightGeo;
    const sh = new T.Shape();
    sh.moveTo(-0.10, -0.34);
    sh.lineTo(0.22, -0.34);
    sh.lineTo(0.26, -0.04);
    sh.lineTo(0.21, 0.16);
    sh.lineTo(0.10, 0.30);
    sh.lineTo(0.03, 0.38);      // между ушами
    sh.lineTo(-0.01, 0.27);
    sh.lineTo(-0.07, 0.31);     // ухо
    sh.lineTo(-0.11, 0.20);
    sh.lineTo(-0.25, 0.11);     // лоб
    sh.lineTo(-0.35, 0.00);     // кончик морды
    sh.lineTo(-0.34, -0.11);
    sh.lineTo(-0.18, -0.13);    // низ морды
    sh.lineTo(-0.12, -0.23);    // челюсть
    sh.closePath();
    const g = new T.ExtrudeGeometry(sh, { depth: 0.30, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2 });
    g.center(); g.computeVertexNormals();
    _knightGeo = g; return g;
  }
  function knightMesh(mat) {
    const grp = new T.Group();
    const base = new T.Mesh(pieceGeometry('n'), mat); base.castShadow = true; grp.add(base);
    const head = new T.Mesh(knightHeadGeo(), mat); head.castShadow = true;
    head.position.set(0, 0.74, 0); head.scale.set(1.08, 1.08, 1.0);
    grp.add(head);
    return grp;
  }

  // Король: тело + крест
  function kingMesh(mat) {
    const grp = new T.Group();
    const body = new T.Mesh(pieceGeometry('k'), mat); body.castShadow = true; grp.add(body);
    const v = new T.Mesh(new T.BoxGeometry(0.08, 0.28, 0.08), mat); v.position.y = 1.24; v.castShadow = true; grp.add(v);
    const h = new T.Mesh(new T.BoxGeometry(0.22, 0.08, 0.08), mat); h.position.y = 1.23; h.castShadow = true; grp.add(h);
    return grp;
  }

  // Ферзь: тело + бусины короны + шарик сверху
  function queenMesh(mat) {
    const grp = new T.Group();
    const body = new T.Mesh(pieceGeometry('q'), mat); body.castShadow = true; grp.add(body);
    const bead = new T.SphereGeometry(0.065, 12, 10);
    const R = 0.28, y = 0.99, n = 8;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const m = new T.Mesh(bead, mat); m.castShadow = true; m.position.set(Math.cos(a) * R, y, Math.sin(a) * R); grp.add(m); }
    const top = new T.Mesh(new T.SphereGeometry(0.10, 14, 12), mat); top.position.y = 1.05; top.castShadow = true; grp.add(top);
    return grp;
  }

  function buildPiece(type, mat) {
    if (type === 'r') return rookMesh(mat);
    if (type === 'n') return knightMesh(mat);
    if (type === 'k') return kingMesh(mat);
    if (type === 'q') return queenMesh(mat);
    const m = new T.Mesh(pieceGeometry(type), mat); m.castShadow = true; return m;
  }

  let matWhite, matBlack, matSel;
  function makeMaterials(theme) {
    // цвета фигур/доски под тему (по умолчанию — «дерево»)
    const P = {
      classic: { w: 0xf3f3f4, b: 0x26282e, ld: 0xe9e9ea, dk: 0x6d7280 },
      brown: { w: 0xf1e4c6, b: 0x4a2f18, ld: 0xf0d9b5, dk: 0xb58863 },
      green: { w: 0xeef0e8, b: 0x2c3327, ld: 0xeeeed2, dk: 0x6f9f57 },
    }[theme] || { w: 0xf1e4c6, b: 0x4a2f18, ld: 0xf0d9b5, dk: 0xb58863 };
    matWhite = new T.MeshStandardMaterial({ color: P.w, roughness: 0.35, metalness: 0.05 });
    matBlack = new T.MeshStandardMaterial({ color: P.b, roughness: 0.4, metalness: 0.05 });
    return P;
  }

  function buildBoard(P) {
    if (boardGroup) { root.remove(boardGroup); disposeGroup(boardGroup); }
    boardGroup = new T.Group(); sqMeshes = [];
    const lightMat = new T.MeshStandardMaterial({ color: P.ld, roughness: 0.6 });
    const darkMat = new T.MeshStandardMaterial({ color: P.dk, roughness: 0.6 });
    const geo = new T.BoxGeometry(S, 0.18, S);
    for (let f = 0; f < N; f++) for (let r = 0; r < N; r++) {
      const dark = (f + r) % 2 === 0;
      const m = new T.Mesh(geo, dark ? darkMat : lightMat);
      m.position.set((f - 3.5) * S, -0.09, (3.5 - r) * S);
      m.receiveShadow = true;
      m.userData.sq = r * 8 + f;
      boardGroup.add(m); sqMeshes.push(m);
    }
    // рамка
    const frameMat = new T.MeshStandardMaterial({ color: 0x2a2016, roughness: 0.7 });
    const fr = new T.Mesh(new T.BoxGeometry(N + 0.5, 0.22, N + 0.5), frameMat);
    fr.position.y = -0.12; fr.receiveShadow = true; boardGroup.add(fr);
    root.add(boardGroup);
  }

  function disposeGroup(g) { g.traverse(o => { if (o.isMesh) { if (o.geometry && !Object.values(pieceCache).includes(o.geometry)) o.geometry.dispose && o.geometry.dispose(); } }); }

  const NS = {};
  NS.init = function (el, h) {
    if (renderer) return;
    container = el; hooks = h || {};
    scene = new T.Scene();
    scene.background = null;
    root = new T.Group(); scene.add(root);

    const w = el.clientWidth || 360, ht = el.clientHeight || 360;
    camera = new T.PerspectiveCamera(38, w / ht, 0.1, 100);

    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, ht);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // свет
    scene.add(new T.AmbientLight(0xffffff, 0.62));
    const dir = new T.DirectionalLight(0xffffff, 0.95);
    dir.position.set(4, 10, 6); dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 1; dir.shadow.camera.far = 40;
    dir.shadow.camera.left = -7; dir.shadow.camera.right = 7;
    dir.shadow.camera.top = 7; dir.shadow.camera.bottom = -7;
    scene.add(dir);
    const fill = new T.DirectionalLight(0xffffff, 0.25); fill.position.set(-5, 6, -4); scene.add(fill);

    pieceGroup = new T.Group(); root.add(pieceGroup);
    hlGroup = new T.Group(); root.add(hlGroup);

    raycaster = new T.Raycaster(); pointer = new T.Vector2();
    renderer.domElement.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', NS.resize);

    makeMaterials((hooks.theme && hooks.theme()) || 'brown');
    camera.position.set(0, 8.4, 8.2);
    camera.lookAt(0, 0.2, -0.3);
    positionCamera();
    animate();
  };

  function positionCamera() {
    // камера смотрит сверху-сбоку со стороны игрока (низ)
    const ar = camera.aspect || 1;
    const dist = ar < 0.85 ? 10.6 : 9.6;   // на узких экранах чуть дальше
    camera.position.set(0, dist * 0.96, dist);
    camera.lookAt(0, 0.5, -0.5);
    camera.updateProjectionMatrix();
  }

  function onPointer(e) {
    if (!visible) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([boardGroup, pieceGroup], true);
    for (const h of hits) {
      let o = h.object; while (o && o.userData.sq === undefined) o = o.parent;
      if (o && o.userData.sq !== undefined) { if (hooks.onTap) hooks.onTap(o.userData.sq); return; }
    }
  }

  function addPiece(color, type, sq) {
    const mat = color === 'w' ? matWhite : matBlack;
    const mesh = buildPiece(type, mat);
    const f = sq % 8, r = (sq / 8) | 0;
    mesh.position.set((f - 3.5) * S, 0, (3.5 - r) * S);
    mesh.userData.sq = sq;
    mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
    pieceGroup.add(mesh);
  }

  function tintPlane(sq, color, y, op) {
    const f = sq % 8, r = (sq / 8) | 0;
    const g = new T.PlaneGeometry(S * 0.98, S * 0.98);
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set((f - 3.5) * S, y, (3.5 - r) * S);
    hlGroup.add(m);
  }
  function dot(sq, cap) {
    const f = sq % 8, r = (sq / 8) | 0;
    const g = cap ? new T.TorusGeometry(0.34, 0.05, 8, 20) : new T.CylinderGeometry(0.13, 0.13, 0.04, 20);
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: cap ? 0xff6b6b : 0x2e7d32, transparent: true, opacity: 0.75, depthWrite: false }));
    if (cap) m.rotation.x = Math.PI / 2;
    m.position.set((f - 3.5) * S, 0.12, (3.5 - r) * S);
    hlGroup.add(m);
  }

  NS.update = function (state, o) {
    o = o || {};
    if (!renderer) return;
    // тема сменилась?
    if (o.theme && o.theme !== NS._theme) { const P = makeMaterials(o.theme); buildBoard(P); NS._theme = o.theme; }
    if (!boardGroup) { buildBoard(makeMaterials(o.theme || 'brown')); NS._theme = o.theme || 'brown'; }
    // ориентация доски (за чёрных / ход чёрных в «Рядом»)
    root.rotation.y = o.flip ? Math.PI : 0;
    // фигуры
    for (let i = pieceGroup.children.length - 1; i >= 0; i--) pieceGroup.remove(pieceGroup.children[i]);
    const b = state.board;
    for (let s = 0; s < 64; s++) { const p = b[s]; if (p) addPiece(p[0], p[1], s); }
    // подсветки
    for (let i = hlGroup.children.length - 1; i >= 0; i--) hlGroup.remove(hlGroup.children[i]);
    if (o.last) { if (o.last.from != null) tintPlane(o.last.from, 0xffd666, 0.10, 0.5); if (o.last.to != null) tintPlane(o.last.to, 0xffd666, 0.10, 0.5); }
    if (o.selected != null && o.selected >= 0) tintPlane(o.selected, 0x6c8cff, 0.11, 0.6);
    if (o.legal) for (const m of o.legal) dot(m.to, o.occupied ? o.occupied(m.to) : false);
    if (o.checkSq != null && o.checkSq >= 0) tintPlane(o.checkSq, 0xff4d4d, 0.12, 0.6);
    needsRender = true;
  };

  NS.setVisible = function (v) {
    visible = !!v;
    if (container) container.style.display = v ? 'block' : 'none';
    if (v) { NS.resize(); needsRender = true; }
  };

  NS.resize = function () {
    if (!renderer || !container) return;
    const w = container.clientWidth || 360, h = container.clientHeight || 360;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    positionCamera();
    needsRender = true;
  };

  function animate() {
    rafId = requestAnimationFrame(animate);
    if (visible && needsRender) { renderer.render(scene, camera); needsRender = false; }
  }

  window.Chess3D = NS;
})();

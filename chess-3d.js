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
  let targetRotY = 0, curRotY = 0, rotInit = false;   // плавный разворот доски
  const pieceCache = {};        // геометрии по типу

  // ---- Профили точёных фигур (правый силуэт: x=радиус, y=высота) ----
  function arc(cx, cy, r, a0, a1, steps) {
    const p = [];
    for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return p;
  }
  // Классическое стонтоновское основание: широкий диск + торовый валик + узкая ножка
  function baseStem(baseR, neckR, neckY) {
    return [
      [0, 0], [baseR, 0], [baseR, 0.045],
      [baseR * 0.90, 0.09], [baseR * 0.80, 0.12],
      [baseR * 0.85, 0.19], [baseR * 0.60, 0.27],   // валик
      [neckR * 1.55, 0.33], [neckR, neckY],
    ];
  }
  const PROFILES = {
    p: () => {   // пешка
      let s = baseStem(0.32, 0.115, 0.42);
      s = s.concat([[0.155, 0.45], [0.205, 0.48], [0.165, 0.52], [0.11, 0.55]]);      // воротник
      s = s.concat(arc(0, 0.665, 0.15, -Math.PI / 2, Math.PI / 2, 14));               // головка-шар
      return s;
    },
    r: () => {   // ладья — тело (зубцы добавляются боксами)
      let s = baseStem(0.36, 0.24, 0.44);
      s = s.concat([[0.245, 0.50], [0.235, 0.66], [0.265, 0.68], [0.30, 0.70], [0.30, 0.78], [0, 0.78]]);
      return s;
    },
    b: () => {   // слон — митра с шариком
      let s = baseStem(0.31, 0.115, 0.46);
      s = s.concat([[0.15, 0.49], [0.205, 0.52], [0.16, 0.56], [0.105, 0.605]]);      // воротник
      s = s.concat([[0.14, 0.66], [0.185, 0.74], [0.185, 0.82], [0.12, 0.905], [0.07, 0.955]]);  // митра
      s = s.concat(arc(0, 1.0, 0.055, -Math.PI / 2, Math.PI / 2, 8));                 // шарик сверху
      return s;
    },
    q: () => {   // ферзь — воротник + чаша короны (зубцы сверху отдельно)
      let s = baseStem(0.34, 0.13, 0.52);
      s = s.concat([[0.16, 0.56], [0.25, 0.64], [0.29, 0.705]]);                      // воротник
      s = s.concat([[0.20, 0.75], [0.28, 0.83], [0.29, 0.90], [0.15, 0.90], [0.13, 0.84], [0, 0.86]]);  // чаша короны
      return s;
    },
    k: () => {   // король — воротник + корона (крест отдельно)
      let s = baseStem(0.36, 0.15, 0.54);
      s = s.concat([[0.17, 0.58], [0.27, 0.66], [0.31, 0.725]]);                      // воротник
      s = s.concat([[0.22, 0.77], [0.29, 0.85], [0.29, 0.92], [0.15, 0.92], [0.15, 0.98], [0.09, 1.0], [0, 1.0]]);  // корона
      return s;
    },
    n: () => {   // конь — постамент (голова добавляется силуэтом)
      let s = baseStem(0.35, 0.19, 0.36);
      s = s.concat([[0.22, 0.42], [0.15, 0.46], [0, 0.46]]);
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
    const R = 0.22, y = 0.85, n = 8;
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

  // Король: тело + корона-обод + крест
  function kingMesh(mat) {
    const grp = new T.Group();
    const body = new T.Mesh(pieceGeometry('k'), mat); body.castShadow = true; grp.add(body);
    const v = new T.Mesh(new T.BoxGeometry(0.08, 0.30, 0.08), mat); v.position.y = 1.17; v.castShadow = true; grp.add(v);
    const h = new T.Mesh(new T.BoxGeometry(0.22, 0.08, 0.08), mat); h.position.y = 1.13; h.castShadow = true; grp.add(h);
    return grp;
  }

  // Ферзь: тело + зубцы короны (шипы с шариками) + шарик по центру
  function queenMesh(mat) {
    const grp = new T.Group();
    const body = new T.Mesh(pieceGeometry('q'), mat); body.castShadow = true; grp.add(body);
    const spike = new T.ConeGeometry(0.055, 0.16, 10);
    const tip = new T.SphereGeometry(0.052, 10, 8);
    const R = 0.25, y = 0.98, n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
      const c = new T.Mesh(spike, mat); c.castShadow = true; c.position.set(x, y, z); grp.add(c);
      const t = new T.Mesh(tip, mat); t.castShadow = true; t.position.set(x, y + 0.10, z); grp.add(t);
    }
    const top = new T.Mesh(new T.SphereGeometry(0.085, 14, 12), mat); top.position.y = 1.02; top.castShadow = true; grp.add(top);
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
      green: { w: 0xcbe3aa, b: 0x35592c, ld: 0xeeeed2, dk: 0x6f9f57 },
    }[theme] || { w: 0xf1e4c6, b: 0x4a2f18, ld: 0xf0d9b5, dk: 0xb58863 };
    matWhite = new T.MeshStandardMaterial({ color: P.w, roughness: 0.35, metalness: 0.05 });
    matBlack = new T.MeshStandardMaterial({ color: P.b, roughness: 0.4, metalness: 0.05 });
    return P;
  }

  // Процедурная текстура клеток (белая основа + затемнения — умножается на цвет)
  const _texCache = {};
  function genTexture(type) {
    if (type === 'plain' || type === 'glass') return null;
    if (_texCache[type]) return _texCache[type];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
    if (type === 'wood') {
      for (let i = 0; i < 128; i += 2) { const a = 0.05 + 0.05 * Math.abs(Math.sin(i * 0.45)); x.fillStyle = 'rgba(60,40,20,' + a + ')'; x.fillRect(i, 0, 1, 128); }
      for (let k = 0; k < 6; k++) { const px = Math.floor(Math.random() * 128); x.fillStyle = 'rgba(40,25,10,0.12)'; x.fillRect(px, 0, 2, 128); }
    } else if (type === 'marble') {
      for (let k = 0; k < 44; k++) { const px = Math.random() * 128, py = Math.random() * 128, r = 8 + Math.random() * 26, dark = Math.random() < 0.5; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, dark ? 'rgba(110,110,120,0.10)' : 'rgba(255,255,255,0.13)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
      x.strokeStyle = 'rgba(110,110,125,0.22)'; x.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) { x.beginPath(); let px = Math.random() * 128, py = 0; x.moveTo(px, py); for (let s = 0; s < 8; s++) { px += (Math.random() - 0.5) * 42; py += 16; x.lineTo(px, py); } x.stroke(); }
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; _texCache[type] = t; return t;
  }

  function buildBoard(P, tex) {
    if (boardGroup) { root.remove(boardGroup); disposeGroup(boardGroup); }
    boardGroup = new T.Group(); sqMeshes = [];
    const map = genTexture(tex);
    const rough = tex === 'marble' ? 0.28 : tex === 'glass' ? 0.08 : 0.6;
    const metal = tex === 'glass' ? 0.28 : 0.05;
    const lightMat = new T.MeshStandardMaterial({ color: P.ld, roughness: rough, metalness: metal, map: map || null });
    const darkMat = new T.MeshStandardMaterial({ color: P.dk, roughness: rough, metalness: metal, map: map || null });
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
    // камера смотрит сверху-сбоку со стороны игрока (низ).
    // Дальше и выше — чтобы вся доска влезала в кадр с полями.
    const ar = camera.aspect || 1;
    const dist = ar < 0.85 ? 11.6 : 10.6;   // на узких экранах чуть дальше
    camera.position.set(0, dist * 1.02, dist);
    camera.lookAt(0, 0.2, -0.3);
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
    mesh.scale.set(0.72, 1.0, 0.72);   // стройнее (уже по толщине)
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
    // тема или текстура сменились?
    const tex = o.texture || 'plain';
    if (!boardGroup || (o.theme && o.theme !== NS._theme) || tex !== NS._tex) {
      const th = o.theme || NS._theme || 'brown';
      const P = makeMaterials(th);
      buildBoard(P, tex);
      NS._theme = th; NS._tex = tex;
    }
    // ориентация доски (за чёрных / ход чёрных в «Рядом») — плавный поворот
    targetRotY = o.flip ? Math.PI : 0;
    if (!rotInit) { curRotY = targetRotY; root.rotation.y = curRotY; rotInit = true; }
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
    if (v) { rotInit = false; NS.resize(); needsRender = true; }   // при показе — без анимации спина
  };

  // Переместить canvas движка в другой контейнер (игровая ↔ учебная доска)
  NS.mount = function (el) {
    if (!renderer || !el || el === container) { if (el === container) { NS.resize(); } return; }
    if (container) container.style.display = 'none';
    container = el;
    el.appendChild(renderer.domElement);
    el.style.display = 'block';
    rotInit = false;
    NS.resize();
    needsRender = true;
  };
  // Сменить обработчик клика по клетке (ход в игре / в уроке)
  NS.setTap = function (fn) { hooks.onTap = fn; };
  NS.mounted = function () { return container; };

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
    if (!visible) return;
    if (root && Math.abs(curRotY - targetRotY) > 0.002) {
      curRotY += (targetRotY - curRotY) * 0.16;
      if (Math.abs(curRotY - targetRotY) < 0.01) curRotY = targetRotY;
      root.rotation.y = curRotY;
      needsRender = true;
    }
    if (needsRender) { renderer.render(scene, camera); needsRender = false; }
  }

  window.Chess3D = NS;
})();

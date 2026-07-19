/* ==========================================================================
   ИГРА «ПО МАРШРУТУ ВЕЛИКИХ ПУТЕШЕСТВЕННИКОВ»
   На той же карте мира (worldmap.svg, равнопромежуточная проекция) поверх
   рисуется серая линия реального маршрута. Игрок «обводит» её пальцем/мышью
   от старта к финишу: пройденная часть подсвечивается цветом, а на ключевых
   точках всплывают названия мест и даты.
   Независимо от app.js и map.js.
   ========================================================================== */
"use strict";

(function () {
  const W = 1000, H = 556;
  const projX = (lon) => ((lon + 180) / 360) * W;
  const projY = (lat) => 286 - lat * 3.2;

  // --- Маршруты первооткрывателей. Точки — по реальным координатам [lon, lat].
  //     У точек с датой она всплывает при прохождении; промежуточные точки
  //     (пустая дата) задают форму морского/сухопутного пути. ---
  const EXPLORERS = [
    {
      id: "columbus",
      name: "Христофор Колумб",
      years: "1492–1493",
      title: "Открытие Америки",
      about: "Переплыл Атлантический океан и достиг Америки, приняв её за Индию.",
      pts: [
        { n: "Палос, Испания", d: "3 авг. 1492", lon: -6.9, lat: 37.2 },
        { n: "Канарские о-ва", d: "сен. 1492", lon: -15.6, lat: 28.1 },
        { n: "Атлантический океан", d: "", lon: -45, lat: 25 },
        { n: "о. Сан-Сальвадор", d: "12 окт. 1492", lon: -74.5, lat: 24.0 },
        { n: "Куба", d: "окт. 1492", lon: -78.8, lat: 21.5 },
        { n: "Эспаньола (Гаити)", d: "дек. 1492", lon: -72.0, lat: 19.0 },
      ],
    },
    {
      id: "gama",
      name: "Васко да Гама",
      years: "1497–1498",
      title: "Морской путь в Индию",
      about: "Впервые прошёл морем из Европы в Индию вокруг Африки.",
      pts: [
        { n: "Лиссабон, Португалия", d: "8 июля 1497", lon: -9.1, lat: 38.7 },
        { n: "О-ва Зелёного Мыса", d: "1497", lon: -23.5, lat: 15.0 },
        { n: "Атлантика", d: "", lon: -5, lat: -25 },
        { n: "Мыс Доброй Надежды", d: "нояб. 1497", lon: 18.5, lat: -34.4 },
        { n: "Малинди, Кения", d: "апр. 1498", lon: 40.1, lat: -3.2 },
        { n: "Каликут, Индия", d: "20 мая 1498", lon: 75.8, lat: 11.3 },
      ],
    },
    {
      id: "polo",
      name: "Марко Поло",
      years: "1271–1275",
      title: "Путешествие в Китай",
      about: "По Великому шёлковому пути добрался из Венеции ко двору хана в Китае.",
      pts: [
        { n: "Венеция", d: "1271", lon: 12.3, lat: 45.4 },
        { n: "Акра (Ближний Восток)", d: "1271", lon: 35.1, lat: 32.9 },
        { n: "Ормуз, Персия", d: "1272", lon: 56.3, lat: 27.1 },
        { n: "Памир (Шёлковый путь)", d: "1273", lon: 74.0, lat: 38.0 },
        { n: "Пустыня Гоби", d: "", lon: 95.0, lat: 41.0 },
        { n: "Ханбалык (Пекин)", d: "1275", lon: 116.4, lat: 39.9 },
      ],
    },
    {
      id: "nikitin",
      name: "Афанасий Никитин",
      years: "1468–1474",
      title: "Хождение за три моря",
      about: "Русский купец из Твери, одним из первых европейцев достигший Индии.",
      pts: [
        { n: "Тверь", d: "1468", lon: 35.9, lat: 56.9 },
        { n: "Астрахань (устье Волги)", d: "1468", lon: 48.0, lat: 46.3 },
        { n: "Дербент (Каспий)", d: "1468", lon: 48.3, lat: 42.1 },
        { n: "Ормуз, Персия", d: "1469", lon: 56.3, lat: 27.1 },
        { n: "Чаул, Индия", d: "1471", lon: 72.9, lat: 18.6 },
        { n: "Бидар, Индия", d: "1471", lon: 77.5, lat: 17.9 },
      ],
    },
    {
      id: "cook",
      name: "Джеймс Кук",
      years: "1768–1769",
      title: "Первое плавание в Тихий океан",
      about: "Обошёл мыс Горн и через Тихий океан достиг островов Океании.",
      pts: [
        { n: "Плимут, Англия", d: "26 авг. 1768", lon: -4.1, lat: 50.4 },
        { n: "о. Мадейра", d: "сен. 1768", lon: -16.9, lat: 32.7 },
        { n: "Рио-де-Жанейро", d: "нояб. 1768", lon: -43.2, lat: -22.9 },
        { n: "Мыс Горн", d: "янв. 1769", lon: -67.3, lat: -55.9 },
        { n: "Тихий океан", d: "", lon: -110, lat: -30 },
        { n: "Таити", d: "апр. 1769", lon: -149.6, lat: -17.7 },
      ],
    },
  ];

  const $ = (s) => document.querySelector(s);
  const THRESH = 30;          // насколько близко к линии нужно вести (px карты)
  const WINDOW = 16;          // на сколько точек вперёд смотрим при обводке
  const STEP = 6;             // шаг ресемплинга линии (px)

  // Готовим пиксельные координаты
  EXPLORERS.forEach((e) => e.pts.forEach((p) => { p.x = projX(p.lon); p.y = projY(p.lat); }));

  // Плотная линия + индексы опорных точек
  function buildPath(pts) {
    const path = [], wp = [];
    for (let k = 0; k < pts.length - 1; k++) {
      wp[k] = path.length;
      const a = pts[k], b = pts[k + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const n = Math.max(1, Math.round(Math.hypot(dx, dy) / STEP));
      for (let s = 0; s < n; s++) path.push([a.x + dx * (s / n), a.y + dy * (s / n)]);
    }
    wp[pts.length - 1] = path.length;
    path.push([pts[pts.length - 1].x, pts[pts.length - 1].y]);
    return { path, wp };
  }

  function ptsAttr(arr) { return arr.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" "); }

  // ---------- Состояние ----------
  const G = { idx: 0, progIdx: 0, path: [], wp: [], tracing: false, done: false, host: null };

  function buildSVG(exp) {
    const { path, wp } = buildPath(exp.pts);
    G.path = path; G.wp = wp;

    let s = `<svg class="routemap" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Карта маршрута">`;
    s += `<image href="worldmap.svg" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"></image>`;
    // Серая линия всего маршрута
    s += `<polyline class="route-base" points="${ptsAttr(path)}"></polyline>`;
    // Подсвеченная (пройденная) часть — обновляется при обводке
    s += `<polyline class="route-prog" id="routeProg" points=""></polyline>`;
    // Опорные точки с подписями (название + дата)
    exp.pts.forEach((p, i) => {
      const cls = i === 0 ? "wp start" : i === exp.pts.length - 1 ? "wp end" : "wp";
      const up = p.y > 70;                     // подпись сверху, если есть место
      const ly = up ? p.y - 16 : p.y + 26;
      s += `<g class="${cls}" id="wp-${i}">`;
      s += `<circle class="wp-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6"></circle>`;
      s += `<text class="wp-name" x="${p.x.toFixed(1)}" y="${ly.toFixed(1)}">${p.n}</text>`;
      if (p.d) s += `<text class="wp-date" x="${p.x.toFixed(1)}" y="${(ly + 15).toFixed(1)}">${p.d}</text>`;
      s += `</g>`;
    });
    // Метки «Старт» / «Финиш»
    const a = exp.pts[0], z = exp.pts[exp.pts.length - 1];
    s += `<text class="route-tag" x="${a.x.toFixed(1)}" y="${(a.y + (a.y > 70 ? -30 : 42)).toFixed(1)}">▶ старт</text>`;
    // Курсор (голова обводки)
    s += `<circle class="route-cursor" id="routeCursor" cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="9" opacity="0"></circle>`;
    s += `</svg>`;
    return s;
  }

  function loadExplorer() {
    const exp = EXPLORERS[G.idx];
    G.host.innerHTML = buildSVG(exp);
    const svg = G.host.querySelector(".routemap");
    G.svg = svg;
    G.progIdx = 0; G.done = false; G.tracing = false;

    // Стартовую точку показываем сразу
    $("#wp-0").classList.add("show");

    $("#routePrompt").innerHTML =
      `<span class="rp-name">${exp.name}</span>` +
      `<span class="rp-years">${exp.years}</span>` +
      `<span class="rp-title">${exp.title}</span>`;
    $("#routeCount").textContent = `${G.idx + 1} / ${EXPLORERS.length}`;
    $("#routePct").textContent = "0%";
    $("#routeBar").style.width = "0%";
    $("#routeFeedback").hidden = true;
    $("#routeHint").textContent = "Проведите по серой линии от ▶ старта к финишу — по пути появятся даты";
    const nb = $("#routeNext");
    nb.disabled = true;
    nb.textContent = G.idx === EXPLORERS.length - 1 ? "Завершить ✓" : "Следующий путешественник →";

    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointercancel", onUp);
    svg.addEventListener("pointerleave", onUp);
  }

  function toMap(evt) {
    const pt = G.svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(G.svg.getScreenCTM().inverse());
  }

  function onDown(evt) {
    if (G.done) return;
    evt.preventDefault();
    G.tracing = true;
    try { G.svg.setPointerCapture(evt.pointerId); } catch (e) {}
    process(evt);
  }
  function onMove(evt) { if (G.tracing && !G.done) { evt.preventDefault(); process(evt); } }
  function onUp() { G.tracing = false; }

  function process(evt) {
    const p = toMap(evt);
    let bestK = G.progIdx, bestD = Infinity;
    const top = Math.min(G.progIdx + WINDOW, G.path.length - 1);
    for (let k = G.progIdx; k <= top; k++) {
      const dx = G.path[k][0] - p.x, dy = G.path[k][1] - p.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; bestK = k; }
    }
    if (bestD <= THRESH * THRESH && bestK > G.progIdx) advanceTo(bestK);
  }

  function advanceTo(k) {
    G.progIdx = k;
    const covered = G.path.slice(0, k + 1);
    $("#routeProg").setAttribute("points", ptsAttr(covered));
    const cur = G.path[k], cursor = $("#routeCursor");
    cursor.setAttribute("cx", cur[0].toFixed(1));
    cursor.setAttribute("cy", cur[1].toFixed(1));
    cursor.setAttribute("opacity", "1");

    // Раскрываем достигнутые опорные точки
    G.wp.forEach((wi, i) => {
      if (k >= wi) {
        const g = $("#wp-" + i);
        if (g && !g.classList.contains("show")) {
          g.classList.add("show");
          if (EXPLORERS[G.idx].pts[i].d) flashDate(EXPLORERS[G.idx].pts[i]);
        }
      }
    });

    const pct = Math.round((k / (G.path.length - 1)) * 100);
    $("#routePct").textContent = pct + "%";
    $("#routeBar").style.width = pct + "%";

    if (k >= G.path.length - 1) finishExplorer();
  }

  function flashDate(p) {
    const fb = $("#routeFeedback");
    fb.hidden = false;
    fb.className = "map-feedback ok";
    fb.innerHTML = `📍 <b>${p.n}</b> — <span class="hl-green">${p.d}</span>`;
  }

  function finishExplorer() {
    G.done = true;
    const exp = EXPLORERS[G.idx];
    $("#routeBar").style.width = "100%";
    $("#routePct").textContent = "100%";
    const fb = $("#routeFeedback");
    fb.hidden = false;
    fb.className = "map-feedback ok";
    fb.innerHTML = `🎉 <strong>Маршрут пройден!</strong> ${exp.name} (${exp.years}) — ${exp.about}`;
    $("#routeHint").textContent = "Отлично! Двигаемся к следующему путешественнику.";
    $("#routeNext").disabled = false;
  }

  function start() {
    G.idx = 0;
    G.host = $("#routeHost");
    if (window.showScreen) window.showScreen("route");
    loadExplorer();
  }

  function next() {
    if (!G.done) return;
    if (G.idx < EXPLORERS.length - 1) { G.idx++; loadExplorer(); }
    else finishAll();
  }

  function finishAll() {
    const fb = $("#routeFeedback");
    fb.hidden = false;
    fb.className = "map-feedback ok";
    fb.innerHTML = `🏆 <strong>Вы прошли маршруты всех путешественников!</strong> Отправимся в путь заново?`;
    $("#routePrompt").innerHTML = `<span class="rp-name">Все маршруты пройдены 🌍</span><span class="rp-title">Великие географические открытия</span>`;
    $("#routeHint").textContent = "Нажмите, чтобы пройти путешествия заново.";
    const nb = $("#routeNext");
    nb.textContent = "Пройти заново ↻";
    nb.disabled = false;
    G.done = true;
    G.idx = -1; // следующий next() начнёт с 0
    nb.onclick = null;
    G.replay = true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = $("#routeBtn");
    if (btn) btn.addEventListener("click", start);
    const nb = $("#routeNext");
    if (nb) nb.addEventListener("click", () => {
      if (G.replay) { G.replay = false; start(); return; }
      next();
    });
    const quit = $("#routeQuit");
    if (quit) quit.addEventListener("click", () => {
      if (typeof renderHome === "function") renderHome();
      if (window.showScreen) window.showScreen("home");
    });
  });
})();

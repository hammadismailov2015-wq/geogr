/* ==========================================================================
   КАРТИНКИ-СХЕМЫ ДЛЯ ВОПРОСОВ (рисуются в коде, SVG)
   Вопрос может содержать поле img: { kind, ... }. PICS.render(spec) возвращает
   строку <svg>…</svg> со схемой, где нужная часть «обведена» красным кольцом.
   ========================================================================== */
"use strict";

window.PICS = (function () {
  // Красное кольцо-обводка вокруг нужной детали
  function ring(x, y, r) {
    return `<circle cx="${x}" cy="${y}" r="${r || 20}" fill="rgba(225,29,42,.10)" ` +
      `stroke="#e11d2a" stroke-width="3.5" stroke-dasharray="6 5"/>`;
  }

  // ---------- РЕКА (вид сверху) ----------
  function river(hi) {
    const P = { source: [55, 48], channel: [126, 100], tributary: [236, 96], mouth: [250, 158] };
    let s = "";
    s += `<rect x="0" y="0" width="320" height="190" fill="#cbe6c6"/>`;              // суша
    s += `<polygon points="228,150 320,150 320,190 208,190" fill="#8fd0f0"/>`;       // море
    // горы у истока
    s += `<polygon points="28,58 48,24 68,58" fill="#a1887f"/><polygon points="40,58 60,30 80,58" fill="#8d6e63"/>`;
    s += `<polygon points="42,36 48,24 54,36" fill="#fff"/><polygon points="54,40 60,30 66,40" fill="#fff"/>`;
    // главная река (русло)
    s += `<polyline points="55,48 92,78 126,100 168,122 210,142 250,158" fill="none" stroke="#2b8ed6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
    // приток
    s += `<polyline points="255,52 244,74 236,96 222,118 210,142" fill="none" stroke="#2b8ed6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
    const p = P[hi] || P.channel;
    s += ring(p[0], p[1], 21);
    return frame(s);
  }

  // ---------- ФЛАГИ ----------
  function flag(c) {
    const X = 30, Y = 18, Wd = 260, Ht = 154;
    let g = "";
    const band3h = (a, b, d) =>
      `<rect x="${X}" y="${Y}" width="${Wd}" height="${Ht / 3}" fill="${a}"/>` +
      `<rect x="${X}" y="${Y + Ht / 3}" width="${Wd}" height="${Ht / 3}" fill="${b}"/>` +
      `<rect x="${X}" y="${Y + 2 * Ht / 3}" width="${Wd}" height="${Ht / 3}" fill="${d}"/>`;
    const band3v = (a, b, d) =>
      `<rect x="${X}" y="${Y}" width="${Wd / 3}" height="${Ht}" fill="${a}"/>` +
      `<rect x="${X + Wd / 3}" y="${Y}" width="${Wd / 3}" height="${Ht}" fill="${b}"/>` +
      `<rect x="${X + 2 * Wd / 3}" y="${Y}" width="${Wd / 3}" height="${Ht}" fill="${d}"/>`;
    if (c === "ru") g = band3h("#ffffff", "#0039a6", "#d52b1e");
    else if (c === "fr") g = band3v("#0055a4", "#ffffff", "#ef4135");
    else if (c === "it") g = band3v("#009246", "#ffffff", "#ce2b37");
    else if (c === "de") g = band3h("#111111", "#dd0000", "#ffce00");
    else if (c === "jp") {
      g = `<rect x="${X}" y="${Y}" width="${Wd}" height="${Ht}" fill="#fff"/>` +
        `<circle cx="${X + Wd / 2}" cy="${Y + Ht / 2}" r="${Ht * 0.3}" fill="#bc002d"/>`;
    } else if (c === "us") {
      for (let i = 0; i < 13; i++)
        g += `<rect x="${X}" y="${Y + i * Ht / 13}" width="${Wd}" height="${Ht / 13}" fill="${i % 2 ? "#fff" : "#b22234"}"/>`;
      const cw = Wd * 0.42, ch = Ht * 7 / 13;
      g += `<rect x="${X}" y="${Y}" width="${cw}" height="${ch}" fill="#3c3b6e"/>`;
      for (let r = 0; r < 4; r++)
        for (let col = 0; col < 5; col++)
          g += `<circle cx="${X + 10 + col * (cw - 18) / 4}" cy="${Y + 9 + r * (ch - 16) / 3}" r="2.3" fill="#fff"/>`;
    } else if (c === "eu") {
      g = `<rect x="${X}" y="${Y}" width="${Wd}" height="${Ht}" fill="#003399"/>`;
      const ecx = X + Wd / 2, ecy = Y + Ht / 2, rad = Ht * 0.33;
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 6;
        g += star(ecx + rad * Math.cos(a), ecy + rad * Math.sin(a), 9, "#ffcc00");
      }
    }
    g += `<rect x="${X}" y="${Y}" width="${Wd}" height="${Ht}" fill="none" stroke="#334155" stroke-width="2"/>`;
    return frame(g);
  }

  // ---------- КОМПАС / СТОРОНЫ СВЕТА ----------
  function compass(hi) {
    const C = 110, main = 88, diag = 60;
    const dirs = {
      n: [0, -1, main], e: [1, 0, main], s: [0, 1, main], w: [-1, 0, main],
      ne: [0.707, -0.707, diag], se: [0.707, 0.707, diag], sw: [-0.707, 0.707, diag], nw: [-0.707, -0.707, diag],
    };
    let s = `<circle cx="${C}" cy="${C}" r="100" fill="#eef4fb" stroke="#b9c6d6" stroke-width="2"/>`;
    Object.keys(dirs).forEach((k) => {
      const [ux, uy, R] = dirs[k];
      const px = -uy, py = ux;                 // перпендикуляр
      const bw = R === main ? 17 : 11;
      const tip = [C + ux * R, C + uy * R];
      const b1 = [C + px * bw, C + py * bw], b2 = [C - px * bw, C - py * bw];
      const on = k === hi;
      const fill = on ? "#e11d2a" : (R === main ? "#4a6b8a" : "#9db4c9");
      s += `<polygon points="${tip[0]},${tip[1]} ${b1[0]},${b1[1]} ${b2[0]},${b2[1]}" fill="${fill}" stroke="#fff" stroke-width="1.5"/>`;
    });
    s += `<circle cx="${C}" cy="${C}" r="9" fill="#33475b"/>`;
    s += `<text x="${C}" y="24" text-anchor="middle" font-family="Segoe UI, sans-serif" font-weight="800" font-size="18" fill="#16324f">С</text>`;
    return `<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Компас">${s}</svg>`;
  }

  // ---------- ГОРА (в разрезе) ----------
  function mountain(hi) {
    const P = { peak: [160, 50], slope: [112, 108], foot: [78, 156] };
    let s = "";
    s += `<rect x="0" y="0" width="320" height="190" fill="#dff1fb"/>`;               // небо
    s += `<rect x="0" y="158" width="320" height="32" fill="#cbe6c6"/>`;              // равнина
    s += `<polygon points="40,160 160,38 280,160" fill="#9e8b7e"/>`;                  // гора
    s += `<polygon points="130,72 160,38 190,72 172,66 160,74 148,66" fill="#ffffff"/>`; // снежная шапка
    const p = P[hi] || P.peak;
    s += ring(p[0], p[1], 20);
    return frame(s);
  }

  // ---------- ЛИТОСФЕРА: строение Земли ----------
  function earth(hi) {
    const cx = 160, cy = 96;
    let s = `<rect x="0" y="0" width="320" height="190" fill="#0b1020"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="86" fill="#e2733b"/>`;                                  // мантия
    s += `<circle cx="${cx}" cy="${cy}" r="86" fill="none" stroke="#5d4037" stroke-width="7"/>`;   // земная кора
    s += `<circle cx="${cx}" cy="${cy}" r="32" fill="#ffb300"/>`;                                   // ядро
    s += `<circle cx="${cx}" cy="${cy}" r="32" fill="none" stroke="#ff8f00" stroke-width="3"/>`;
    const P = { crust: [cx, cy - 84], mantle: [cx + 58, cy - 20], core: [cx, cy] };
    const p = P[hi] || P.core;
    s += ring(p[0], p[1], hi === "core" ? 20 : 16);
    return frame(s);
  }

  // ---------- АТМОСФЕРА: слои ----------
  function atmos(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#1e2b63"/>`;                          // верхние слои
    s += `<rect x="0" y="72" width="320" height="54" fill="#7fb2e6"/>`;                             // стратосфера
    s += `<rect x="0" y="126" width="320" height="46" fill="#bfe3f5"/>`;                            // тропосфера
    s += `<rect x="0" y="172" width="320" height="18" fill="#7bbf6a"/>`;                            // земля
    s += `<circle cx="40" cy="24" r="1.6" fill="#fff"/><circle cx="120" cy="18" r="1.4" fill="#fff"/><circle cx="230" cy="30" r="1.7" fill="#fff"/><circle cx="285" cy="16" r="1.4" fill="#fff"/>`;
    s += `<g fill="#ffffff"><ellipse cx="210" cy="150" rx="28" ry="11"/><ellipse cx="190" cy="153" rx="16" ry="9"/></g>`;
    s += `<polygon points="28,172 58,140 88,172" fill="#8d6e63"/><polygon points="58,172 58,140 88,172" fill="#795548"/>`;
    const P = { upper: [120, 40], strato: [120, 99], tropo: [90, 150] };
    const p = P[hi] || P.tropo;
    s += ring(p[0], p[1], 17);
    return frame(s);
  }

  // ---------- ОЗЁРА И БОЛОТА ----------
  function waterland(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#cfe8c4"/>`;
    s += `<ellipse cx="92" cy="102" rx="72" ry="46" fill="#3fa6dd"/>`;
    s += `<ellipse cx="92" cy="102" rx="72" ry="46" fill="none" stroke="#2b7fb0" stroke-width="2"/>`;
    s += `<ellipse cx="242" cy="120" rx="64" ry="42" fill="#6f9e5a"/>`;
    s += `<ellipse cx="228" cy="126" rx="13" ry="6" fill="#4a86a8"/><ellipse cx="262" cy="114" rx="11" ry="5" fill="#4a86a8"/><ellipse cx="250" cy="138" rx="9" ry="4" fill="#4a86a8"/>`;
    s += `<g stroke="#3f6b3a" stroke-width="2.4" stroke-linecap="round">`;
    [[214, 120], [236, 108], [258, 128], [276, 118]].forEach((c) => { s += `<line x1="${c[0]}" y1="${c[1]}" x2="${c[0]}" y2="${c[1] - 16}"/>`; });
    s += `</g>`;
    const P = { lake: [92, 102], swamp: [242, 120] };
    const p = P[hi] || P.lake;
    s += ring(p[0], p[1], 22);
    return frame(s);
  }

  // ---------- КООРДИНАТЫ: градусная сетка ----------
  function grid(hi) {
    const cx = 160, cy = 96, R = 84;
    let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#bfe0f2" stroke="#2b6f9e" stroke-width="2"/>`;
    s += `<clipPath id="gc"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>`;
    s += `<g clip-path="url(#gc)" stroke="#6a97b5" stroke-width="1.4" fill="none">`;
    for (let dy = -56; dy <= 56; dy += 28) s += `<line x1="${cx - R}" y1="${cy + dy}" x2="${cx + R}" y2="${cy + dy}"/>`;
    s += `<line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}"/>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="30" ry="${R}"/><ellipse cx="${cx}" cy="${cy}" rx="60" ry="${R}"/>`;
    s += `</g>`;
    s += `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="#12557f" stroke-width="2.6"/>`;
    const P = { equator: [cx - 42, cy], meridian: [cx, cy - 42], parallel: [cx - 24, cy - 56] };
    const p = P[hi] || P.equator;
    s += ring(p[0], p[1], 17);
    return frame(s);
  }

  // ---------- ЛЕДНИК ----------
  function glacier(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#d7eefb"/>`;
    s += `<rect x="0" y="152" width="320" height="38" fill="#bfe3f5"/>`;
    s += `<polygon points="28,156 150,28 272,156" fill="#8a8f98"/>`;
    s += `<polygon points="112,70 150,28 188,70 168,62 150,70 132,62" fill="#ffffff"/>`;
    s += `<polygon points="150,58 170,118 150,160 130,118" fill="#eaf6ff" stroke="#bcdcef" stroke-width="1.5"/>`;
    const P = { ice: [150, 118], snow: [150, 48] };
    const p = P[hi] || P.ice;
    s += ring(p[0], p[1], 19);
    return frame(s);
  }

  // ---------- АЙСБЕРГ ----------
  function iceberg(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#bfe3f5"/>`;
    s += `<rect x="0" y="84" width="320" height="106" fill="#3f8fc0"/>`;
    s += `<polygon points="122,84 150,150 220,156 236,84" fill="#cfeaf7" opacity="0.92"/>`;
    s += `<polygon points="150,84 176,40 206,84" fill="#ffffff" stroke="#d6ecfb" stroke-width="1.5"/>`;
    s += `<line x1="0" y1="84" x2="320" y2="84" stroke="#eaf6ff" stroke-width="2" stroke-dasharray="7 5"/>`;
    if (hi === "under") s += ring(176, 122, 26);
    return frame(s);
  }

  // ---------- ПОДЗЕМНЫЕ ВОДЫ ----------
  function ground(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#cfe8f7"/>`;
    s += `<rect x="0" y="44" width="320" height="26" fill="#8bbf6a"/>`;                             // почва
    s += `<rect x="0" y="70" width="320" height="34" fill="#e9d7a6"/>`;                             // песок
    s += `<rect x="0" y="104" width="320" height="20" fill="#7fb7d6"/>`;                            // вода в порах
    s += `<rect x="0" y="124" width="320" height="66" fill="#9c7b57"/>`;                            // глина (водоупор)
    s += `<rect x="150" y="40" width="16" height="64" fill="#6b6b6b"/>`;                            // колодец
    s += `<rect x="150" y="104" width="16" height="20" fill="#2b7fb0"/>`;
    const P = { aquifer: [74, 113], aquiclude: [74, 152], well: [158, 90] };
    const p = P[hi] || P.aquifer;
    s += ring(p[0], p[1], 18);
    return frame(s);
  }

  // ---------- СОЛНЕЧНАЯ СИСТЕМА ----------
  function solar(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#0b1230"/>`;
    [[40, 26], [120, 20], [230, 34], [292, 22], [70, 150], [260, 158]].forEach((c) => { s += `<circle cx="${c[0]}" cy="${c[1]}" r="1.5" fill="#fff"/>`; });
    s += `<circle cx="16" cy="95" r="40" fill="#ffd54a"/><circle cx="16" cy="95" r="40" fill="none" stroke="#ffb300" stroke-width="2"/>`;
    s += `<ellipse cx="252" cy="95" rx="27" ry="8" fill="none" stroke="#cbb37a" stroke-width="3" transform="rotate(-18 252 95)"/>`;
    const pl = [[70, 6, "#b0a08f"], [100, 9, "#d9a066"], [132, 10, "#3f8fd6"], [160, 7, "#c1440e"], [206, 20, "#d9b38c"], [252, 15, "#e3c98a"], [288, 10, "#9fe0e6"], [312, 8, "#4b6fd6"]];
    pl.forEach((c) => { s += `<circle cx="${c[0]}" cy="95" r="${c[1]}" fill="${c[2]}"/>`; });
    const P = { sun: [16, 95, 28], earth: [132, 95, 16], jupiter: [206, 95, 26], saturn: [252, 95, 24] };
    const p = P[hi] || P.earth;
    s += ring(p[0], p[1], p[2]);
    return frame(s);
  }

  // ---------- ПОГОДА: значки ----------
  function weather(sym) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#dff1fb"/>`;
    const cloud = (cx, cy, f) =>
      `<g fill="${f || "#c8d3de"}"><ellipse cx="${cx}" cy="${cy}" rx="48" ry="24"/>` +
      `<ellipse cx="${cx - 32}" cy="${cy + 10}" rx="26" ry="18"/><ellipse cx="${cx + 32}" cy="${cy + 10}" rx="26" ry="18"/>` +
      `<rect x="${cx - 58}" y="${cy + 6}" width="116" height="22" rx="11"/></g>`;
    if (sym === "sun") {
      s += `<g stroke="#f6a821" stroke-width="6" stroke-linecap="round">`;
      for (let a = 0; a < 360; a += 45) {
        const r = a * Math.PI / 180;
        s += `<line x1="${(160 + Math.cos(r) * 46).toFixed(1)}" y1="${(95 + Math.sin(r) * 46).toFixed(1)}" x2="${(160 + Math.cos(r) * 66).toFixed(1)}" y2="${(95 + Math.sin(r) * 66).toFixed(1)}"/>`;
      }
      s += `</g><circle cx="160" cy="95" r="34" fill="#ffcf33" stroke="#f6a821" stroke-width="3"/>`;
    } else if (sym === "rain") {
      s += cloud(160, 70);
      s += `<g stroke="#3f8fd6" stroke-width="4" stroke-linecap="round">`;
      [120, 150, 180, 210].forEach((x) => { s += `<line x1="${x}" y1="116" x2="${x - 8}" y2="146"/>`; });
      s += `</g>`;
    } else if (sym === "snow") {
      s += cloud(160, 70);
      s += `<g fill="#ffffff" stroke="#b6c6d2" stroke-width="1">`;
      [[120, 132], [150, 142], [180, 132], [210, 142], [135, 160], [195, 160]].forEach((c) => { s += `<circle cx="${c[0]}" cy="${c[1]}" r="5"/>`; });
      s += `</g>`;
    } else if (sym === "storm") {
      s += cloud(160, 68, "#8894a2");
      s += `<polygon points="150,110 176,110 160,136 178,136 146,176 158,144 140,144" fill="#ffd23f" stroke="#e0a500" stroke-width="1.5"/>`;
    }
    return frame(s);
  }

  // ---------- ПРИРОДНЫЕ ЗОНЫ: пейзажи ----------
  function zone(sym) {
    let s = "";
    if (sym === "desert") {
      s += `<rect x="0" y="0" width="320" height="120" fill="#cfe8f7"/><circle cx="255" cy="44" r="26" fill="#ffcf33"/>`;
      s += `<rect x="0" y="108" width="320" height="82" fill="#f0d488"/>`;
      s += `<path d="M0,150 Q80,120 160,150 T320,150 L320,190 L0,190 Z" fill="#e6c46e"/>`;
      s += `<g fill="#3f9e57"><rect x="150" y="118" width="12" height="48" rx="6"/><rect x="132" y="130" width="10" height="22" rx="5"/><rect x="170" y="126" width="10" height="26" rx="5"/></g>`;
    } else if (sym === "taiga") {
      s += `<rect x="0" y="0" width="320" height="140" fill="#cfe8f7"/><rect x="0" y="130" width="320" height="60" fill="#7cae5b"/>`;
      const fir = (x, b) => `<g fill="#1f6b3a"><polygon points="${x},${b - 70} ${x - 24},${b - 30} ${x + 24},${b - 30}"/><polygon points="${x},${b - 52} ${x - 28},${b - 6} ${x + 28},${b - 6}"/></g><rect x="${x - 4}" y="${b - 8}" width="8" height="14" fill="#6b4a2b"/>`;
      s += fir(70, 148) + fir(160, 152) + fir(250, 148);
    } else if (sym === "tundra") {
      s += `<rect x="0" y="0" width="320" height="130" fill="#c3d3dd"/><circle cx="60" cy="40" r="20" fill="#ffe6a0"/>`;
      s += `<rect x="0" y="120" width="320" height="70" fill="#cdd8cc"/>`;
      s += `<g fill="#ffffff"><ellipse cx="90" cy="150" rx="34" ry="10"/><ellipse cx="220" cy="165" rx="44" ry="12"/><ellipse cx="272" cy="140" rx="24" ry="8"/></g>`;
      s += `<g fill="#6b7f4a"><circle cx="150" cy="150" r="5"/><circle cx="166" cy="152" r="4"/><circle cx="58" cy="170" r="5"/></g>`;
    } else if (sym === "steppe") {
      s += `<rect x="0" y="0" width="320" height="120" fill="#cfe8f7"/><circle cx="255" cy="40" r="24" fill="#ffcf33"/>`;
      s += `<rect x="0" y="112" width="320" height="78" fill="#c9b24a"/>`;
      s += `<g stroke="#9c8f3a" stroke-width="2.4" stroke-linecap="round">`;
      [30, 70, 120, 175, 225, 285].forEach((x) => { s += `<line x1="${x}" y1="150" x2="${x - 5}" y2="128"/><line x1="${x}" y1="150" x2="${x + 5}" y2="128"/><line x1="${x}" y1="150" x2="${x}" y2="126"/>`; });
      s += `</g>`;
    }
    return frame(s);
  }

  // ---------- ПОЧВА: горизонты (разрез) ----------
  function soil(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#cfe8f7"/>`;
    s += `<rect x="0" y="30" width="320" height="20" fill="#6fae4f"/>`;                             // трава
    s += `<rect x="0" y="50" width="320" height="42" fill="#4a3527"/>`;                             // перегнойный (тёмный)
    s += `<rect x="0" y="92" width="320" height="40" fill="#8a6b4a"/>`;                             // переходный
    s += `<rect x="0" y="132" width="320" height="58" fill="#9c9186"/>`;                            // материнская порода
    s += `<g fill="#7d7266"><circle cx="60" cy="160" r="8"/><circle cx="150" cy="170" r="10"/><circle cx="250" cy="158" r="9"/><circle cx="212" cy="177" r="7"/></g>`;
    s += `<g stroke="#3f2d1e" stroke-width="2" fill="none"><path d="M80,50 q-6,20 4,40"/><path d="M160,50 q8,18 -2,38"/><path d="M240,50 q-4,22 6,40"/></g>`;
    const P = { humus: [70, 71], rock: [70, 160] };
    const p = P[hi] || P.humus;
    s += ring(p[0], p[1], 18);
    return frame(s);
  }

  // ---------- ВУЛКАН (в разрезе) ----------
  function volcano(hi) {
    let s = `<rect x="0" y="0" width="320" height="150" fill="#cfe8f7"/>`;
    s += `<rect x="0" y="150" width="320" height="40" fill="#5d4037"/>`;
    s += `<ellipse cx="160" cy="172" rx="36" ry="13" fill="#e64a19"/><ellipse cx="160" cy="172" rx="36" ry="13" fill="none" stroke="#ffab91" stroke-width="1.5"/>`; // очаг
    s += `<polygon points="44,150 160,44 276,150" fill="#8a7a6d"/>`;                                  // конус
    s += `<polygon points="156,150 164,150 168,168 152,168" fill="#ff7043"/>`;                        // канал к очагу
    s += `<polygon points="153,58 167,58 174,150 146,150" fill="#ff5722"/>`;                          // жерло
    s += `<polygon points="158,52 172,52 214,150 196,150" fill="#ff8a50"/>`;                          // лава по склону
    s += `<ellipse cx="160" cy="52" rx="14" ry="6" fill="#bf360c"/>`;                                 // кратер
    s += `<g fill="#cfd8dc" opacity="0.85"><circle cx="160" cy="34" r="10"/><circle cx="150" cy="26" r="8"/><circle cx="173" cy="24" r="9"/></g>`; // дым
    const P = { crater: [160, 50], vent: [160, 104], chamber: [160, 172], lava: [200, 120] };
    const p = P[hi] || P.crater;
    s += ring(p[0], p[1], hi === "chamber" ? 24 : 18);
    return frame(s);
  }

  // ---------- ЗЕМЛЕТРЯСЕНИЕ (в разрезе) ----------
  function quake(hi) {
    let s = `<rect x="0" y="0" width="320" height="72" fill="#cfe8f7"/>`;
    s += `<rect x="0" y="72" width="320" height="118" fill="#a9835d"/>`;
    s += `<g fill="none" stroke="#e64a19" stroke-width="2.5"><circle cx="160" cy="150" r="24"/><circle cx="160" cy="150" r="42" opacity="0.6"/><circle cx="160" cy="150" r="60" opacity="0.35"/></g>`;
    s += `<line x1="160" y1="150" x2="160" y2="72" stroke="#4e342e" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    s += `<polygon points="160,136 165,148 178,150 165,152 160,164 155,152 142,150 155,148" fill="#ffca28" stroke="#e64a19" stroke-width="1.5"/>`; // очаг
    const house = (x) => `<rect x="${x - 9}" y="54" width="18" height="16" fill="#eceff1" stroke="#90a4ae"/><polygon points="${x - 12},54 ${x},42 ${x + 12},54" fill="#b0413e"/>`;
    s += house(132) + house(160) + house(188);
    s += `<circle cx="160" cy="72" r="6" fill="#e11d2a" stroke="#fff" stroke-width="2"/>`;            // эпицентр
    const P = { focus: [160, 150], epicenter: [160, 72], waves: [110, 128] };
    const p = P[hi] || P.focus;
    s += ring(p[0], p[1], 18);
    return frame(s);
  }

  // ---------- КРУГОВОРОТ ВОДЫ ----------
  function watercycle(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#dff1fb"/>`;
    s += `<circle cx="284" cy="30" r="20" fill="#ffcf33"/>`;
    s += `<path d="M0,120 Q90,110 150,150 L150,190 L0,190 Z" fill="#3f8fc0"/>`;                        // море
    s += `<path d="M150,190 L150,150 Q210,120 260,150 L320,150 L320,190 Z" fill="#7cae5b"/>`;         // суша
    s += `<polygon points="228,150 264,96 300,150" fill="#9e8b7e"/><polygon points="250,124 264,96 278,124 271,120 264,124 257,120" fill="#fff"/>`;
    s += `<g fill="#ffffff"><ellipse cx="150" cy="50" rx="40" ry="20"/><ellipse cx="126" cy="58" rx="22" ry="15"/><ellipse cx="174" cy="58" rx="22" ry="15"/></g>`; // облако
    s += `<g stroke="#2b7fb0" stroke-width="3" fill="none"><path d="M70,112 L70,76 M64,86 L70,76 L76,86"/><path d="M96,116 L96,82 M90,92 L96,82 L102,92"/></g>`; // испарение
    s += `<g stroke="#2b7fb0" stroke-width="3" stroke-linecap="round"><line x1="206" y1="76" x2="201" y2="96"/><line x1="223" y1="76" x2="218" y2="96"/><line x1="240" y1="76" x2="235" y2="96"/></g>`; // осадки
    s += `<path d="M262,150 Q210,150 150,168" fill="none" stroke="#2b8ed6" stroke-width="5" stroke-linecap="round"/>`; // река
    const P = { evaporation: [82, 94], cloud: [150, 50], rain: [223, 88], river: [188, 158] };
    const p = P[hi] || P.evaporation;
    s += ring(p[0], p[1], 20);
    return frame(s);
  }

  // ---------- МОРСКИЕ ТЕЧЕНИЯ ----------
  function current(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#4a9fd4"/>`;
    s += `<path d="M0,0 L90,0 Q70,60 100,100 Q70,150 90,190 L0,190 Z" fill="#8bbf6a"/>`;              // суша
    s += `<path d="M150,170 Q120,110 150,50" fill="none" stroke="#e53935" stroke-width="7" stroke-linecap="round"/>`; // тёплое
    s += `<polygon points="150,42 140,60 160,60" fill="#e53935"/>`;
    s += `<path d="M240,30 Q272,100 240,160" fill="none" stroke="#1e88e5" stroke-width="7" stroke-linecap="round"/>`;  // холодное
    s += `<polygon points="240,168 230,150 250,150" fill="#1e88e5"/>`;
    const P = { warm: [135, 110], cold: [258, 96] };
    const p = P[hi] || P.warm;
    s += ring(p[0], p[1], 22);
    return frame(s);
  }

  // Пятиконечная звезда
  function star(cx, cy, r, fill) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.42 : r;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      pts.push((cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1));
    }
    return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
  }

  // ---------- ОКЕАН: рельеф дна ----------
  function oceanfloor(hi) {
    let s = `<rect x="0" y="0" width="320" height="46" fill="#cfe8f7"/>`;
    s += `<rect x="0" y="46" width="320" height="144" fill="#4a9fd4"/>`;
    s += `<polygon points="0,28 56,34 66,72 135,86 180,150 250,150 258,150 266,178 274,150 320,150 320,190 0,190" fill="#7a6b5f"/>`;
    const P = { shelf: [100, 80], slope: [156, 120], bed: [214, 152], trench: [266, 172] };
    const p = P[hi] || P.shelf;
    s += ring(p[0], p[1], hi === "trench" ? 15 : 18);
    return frame(s);
  }

  // ---------- МОРЯ: залив и пролив ----------
  function seamap(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#4a9fd4"/>`;
    s += `<path d="M0,30 L86,30 Q48,95 86,160 L0,160 Z" fill="#8bbf6a"/>`;               // суша с заливом
    s += `<path d="M320,18 L320,82 L232,82 Q252,48 240,18 Z" fill="#8bbf6a"/>`;           // земля 1
    s += `<path d="M320,110 L320,178 L240,178 Q250,142 232,110 Z" fill="#8bbf6a"/>`;      // земля 2 (между ними пролив)
    const P = { sea: [162, 40], bay: [58, 95], strait: [284, 96] };
    const p = P[hi] || P.sea;
    s += ring(p[0], p[1], 20);
    return frame(s);
  }

  // ---------- ОСТРОВ / ПОЛУОСТРОВ ----------
  function island(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#4a9fd4"/>`;
    s += `<path d="M320,70 L320,190 L120,190 L155,150 Q205,140 235,120 Q285,96 320,70 Z" fill="#8bbf6a"/>`; // материк с полуостровом
    s += `<ellipse cx="86" cy="78" rx="44" ry="30" fill="#8bbf6a"/>`;                     // остров
    const P = { island: [86, 78], peninsula: [236, 120] };
    const p = P[hi] || P.island;
    s += ring(p[0], p[1], 24);
    return frame(s);
  }

  // ---------- ПЛАН МЕСТНОСТИ: условные знаки ----------
  function mapsign(sym) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#dff1fb"/>`;
    if (sym === "forest") {
      s += `<rect x="0" y="150" width="320" height="40" fill="#8fbf6a"/>`;               // трава
      const tree = (x, sc) =>
        `<rect x="${x - 4 * sc}" y="${150 - 26 * sc}" width="${8 * sc}" height="${26 * sc}" fill="#7a4a25"/>` +
        `<circle cx="${x}" cy="${150 - 40 * sc}" r="${20 * sc}" fill="#2e7d32"/>` +
        `<circle cx="${x - 13 * sc}" cy="${150 - 30 * sc}" r="${14 * sc}" fill="#358a34"/>` +
        `<circle cx="${x + 13 * sc}" cy="${150 - 30 * sc}" r="${14 * sc}" fill="#358a34"/>`;
      s += tree(100, 1) + tree(215, 1) + tree(158, 1.15);
    } else if (sym === "meadow") {
      s += `<rect x="0" y="118" width="320" height="72" fill="#9ccf74"/>`;                // луг
      s += `<g stroke="#3f7d2e" stroke-width="3" stroke-linecap="round" fill="none">`;
      [66, 104, 142, 180, 218, 256].forEach((x) => { s += `<path d="M${x},152 q-7,-22 -3,-32 M${x},152 q1,-28 1,-36 M${x},152 q9,-20 7,-30"/>`; });
      s += `</g>`;
      s += `<circle cx="128" cy="120" r="5" fill="#ffd23f"/><circle cx="205" cy="128" r="5" fill="#e57373"/>`; // цветы
    } else if (sym === "swamp") {
      s += `<rect x="0" y="112" width="320" height="78" fill="#6f9e7f"/>`;                // топь
      s += `<g fill="#4a86a8"><ellipse cx="108" cy="152" rx="36" ry="9"/><ellipse cx="212" cy="142" rx="30" ry="8"/><ellipse cx="160" cy="168" rx="26" ry="7"/></g>`; // вода
      s += `<g stroke="#4e6b3a" stroke-width="3" stroke-linecap="round">`;
      [92, 132, 198, 240].forEach((x) => s += `<line x1="${x}" y1="150" x2="${x}" y2="114"/>`);
      s += `</g>`;
      s += `<g fill="#6d4c2b">`;
      [92, 132, 198, 240].forEach((x) => s += `<rect x="${x - 3}" y="108" width="6" height="14" rx="3"/>`); // початки камыша
      s += `</g>`;
    } else if (sym === "river") {
      s += `<rect x="0" y="0" width="320" height="190" fill="#9ccf74"/>`;                 // берега
      s += `<path d="M44,30 Q150,70 150,110 Q150,150 262,168 L280,156 Q168,140 168,110 Q168,80 60,20 Z" fill="#3b93d6"/>`;
      s += `<path d="M52,26 Q159,66 159,110 Q159,150 270,162" fill="none" stroke="#bfe3f5" stroke-width="2"/>`;
    }
    return frame(s);
  }

  // ---------- ЯЗЫКИ: письменность ----------
  function script(sym) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#f2ede0"/>`;
    const txt = sym === "cyrillic" ? "Абв" : sym === "latin" ? "Abc" : "文字";
    s += `<text x="160" y="120" text-anchor="middle" font-size="70" font-weight="800" font-family="Segoe UI, sans-serif" fill="#3949ab">${txt}</text>`;
    return frame(s);
  }

  // ---------- ЧАСОВЫЕ ПОЯСА: день и ночь ----------
  function daynight(hi) {
    let s = `<rect x="0" y="0" width="320" height="190" fill="#0b1230"/>`;
    [[250, 28], [292, 58], [268, 150], [302, 112]].forEach((c) => s += `<circle cx="${c[0]}" cy="${c[1]}" r="1.5" fill="#fff"/>`);
    s += `<circle cx="16" cy="95" r="30" fill="#ffd54a"/>`;
    s += `<g stroke="#ffd54a" stroke-width="4" stroke-linecap="round"><line x1="52" y1="95" x2="74" y2="95"/><line x1="40" y1="62" x2="58" y2="74"/><line x1="40" y1="128" x2="58" y2="116"/></g>`;
    const cx = 190, cy = 95, R = 72;
    s += `<path d="M${cx},${cy - R} A${R},${R} 0 0,0 ${cx},${cy + R} Z" fill="#4a9fd4"/>`;   // день (левая)
    s += `<path d="M${cx},${cy - R} A${R},${R} 0 0,1 ${cx},${cy + R} Z" fill="#16233f"/>`;   // ночь (правая)
    s += `<ellipse cx="${cx - 34}" cy="${cy - 4}" rx="17" ry="26" fill="#6fae4f"/>`;
    s += `<line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="#fff" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#9fc7e0" stroke-width="2"/>`;
    const P = { day: [cx - 38, cy], night: [cx + 38, cy] };
    const p = P[hi] || P.night;
    s += ring(p[0], p[1], 22);
    return frame(s);
  }

  function frame(inner) {
    return `<svg viewBox="0 0 320 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Схема">${inner}</svg>`;
  }

  return {
    render(spec) {
      if (!spec || !spec.kind) return "";
      if (spec.kind === "river") return river(spec.hi);
      if (spec.kind === "flag") return flag(spec.c);
      if (spec.kind === "compass") return compass(spec.hi);
      if (spec.kind === "mountain") return mountain(spec.hi);
      if (spec.kind === "earth") return earth(spec.hi);
      if (spec.kind === "atmos") return atmos(spec.hi);
      if (spec.kind === "waterland") return waterland(spec.hi);
      if (spec.kind === "grid") return grid(spec.hi);
      if (spec.kind === "glacier") return glacier(spec.hi);
      if (spec.kind === "iceberg") return iceberg(spec.hi);
      if (spec.kind === "ground") return ground(spec.hi);
      if (spec.kind === "solar") return solar(spec.hi);
      if (spec.kind === "weather") return weather(spec.sym);
      if (spec.kind === "zone") return zone(spec.sym);
      if (spec.kind === "soil") return soil(spec.hi);
      if (spec.kind === "volcano") return volcano(spec.hi);
      if (spec.kind === "quake") return quake(spec.hi);
      if (spec.kind === "watercycle") return watercycle(spec.hi);
      if (spec.kind === "current") return current(spec.hi);
      if (spec.kind === "oceanfloor") return oceanfloor(spec.hi);
      if (spec.kind === "seamap") return seamap(spec.hi);
      if (spec.kind === "island") return island(spec.hi);
      if (spec.kind === "mapsign") return mapsign(spec.sym);
      if (spec.kind === "script") return script(spec.sym);
      if (spec.kind === "daynight") return daynight(spec.hi);
      return "";
    },
  };
})();

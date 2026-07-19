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
      return "";
    },
  };
})();

/* ==========================================================================
   МАТЕМАТИКА · 6 КЛАСС — рисунки для объяснений (SVG)
   window.mathPic(key) возвращает готовую SVG-схему по ключу.
   Цвета: обводка — currentColor (цвет текста темы), заливки — мягкие
   полупрозрачные, читаются и в тёмной, и в светлой теме.
   ========================================================================== */
(function () {
  "use strict";

  var BLUE = "rgba(99,102,241,.28)", BLUE_S = "#6366f1";
  var ORANGE = "rgba(245,158,11,.30)", ORANGE_S = "#f59e0b";
  var GREEN = "rgba(34,197,94,.30)", GREEN_S = "#22c55e";
  var CYAN = "rgba(34,211,238,.28)", CYAN_S = "#06b6d4";

  function txt(x, y, s, size, color) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" ' +
      'font-family="system-ui,Segoe UI,sans-serif" font-size="' + (size || 12) + '" ' +
      'font-weight="600" fill="' + (color || "currentColor") + '">' + s + "</text>";
  }
  function svg(vb, inner) {
    return '<svg viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" ' +
      'fill="none" stroke="currentColor">' + inner + "</svg>";
  }

  // Короткая насечка «равные стороны» посередине отрезка p1–p2
  function tick(p1, p2) {
    var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
    var dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len; // перпендикуляр
    var k = 5;
    return '<line x1="' + (mx - nx * k) + '" y1="' + (my - ny * k) +
      '" x2="' + (mx + nx * k) + '" y2="' + (my + ny * k) +
      '" stroke="currentColor" stroke-width="2"/>';
  }
  function poly(pts, fill, sw) {
    return '<polygon points="' + pts.map(function (p) { return p[0] + "," + p[1]; }).join(" ") +
      '" fill="' + fill + '" stroke="currentColor" stroke-width="' + (sw || 2) + '"/>';
  }

  var PICS = {

    /* Дробь: 3/4 закрашено */
    fraction: function () {
      var x0 = 10, y0 = 15, w = 70, h = 55, inner = "";
      for (var i = 0; i < 4; i++) {
        inner += '<rect x="' + (x0 + i * w) + '" y="' + y0 + '" width="' + w + '" height="' + h +
          '" fill="' + (i < 3 ? BLUE : "transparent") + '" stroke="' + BLUE_S + '" stroke-width="2"/>';
      }
      inner += txt(150, y0 + h + 20, "3 части закрашены из 4  →  3/4", 13);
      return svg("0 0 300 100", inner);
    },

    /* Основные плоские фигуры */
    figures: function () {
      var inner = "";
      inner += '<rect x="20" y="25" width="60" height="60" fill="' + BLUE + '" stroke="' + BLUE_S + '" stroke-width="2"/>';
      inner += txt(50, 108, "Квадрат", 11);
      inner += '<rect x="108" y="35" width="88" height="46" fill="' + ORANGE + '" stroke="' + ORANGE_S + '" stroke-width="2"/>';
      inner += txt(152, 108, "Прямоугольник", 10);
      inner += poly([[252, 25], [286, 85], [218, 85]], GREEN);
      inner += txt(252, 108, "Треугольник", 10);
      inner += '<circle cx="340" cy="55" r="30" fill="' + CYAN + '" stroke="' + CYAN_S + '" stroke-width="2"/>';
      inner += txt(340, 108, "Круг", 11);
      return svg("0 0 380 122", inner);
    },

    /* Проценты: 25 клеток из 100 */
    percent: function () {
      var inner = "", cell = 17, gap = 1, x0 = 8, y0 = 8, shaded = 25;
      for (var r = 0; r < 10; r++) {
        for (var c = 0; c < 10; c++) {
          var n = r * 10 + c;
          inner += '<rect x="' + (x0 + c * (cell + gap)) + '" y="' + (y0 + r * (cell + gap)) +
            '" width="' + cell + '" height="' + cell + '" fill="' +
            (n < shaded ? BLUE : "transparent") + '" stroke="' + BLUE_S + '" stroke-width="1"/>';
        }
      }
      return svg("0 0 196 192", inner);
    },

    /* Круговая диаграмма: 50% + 25% + 25% */
    piechart: function () {
      var inner = "";
      inner += '<path d="M80 80 L80 20 A60 60 0 0 1 80 140 Z" fill="' + BLUE + '" stroke="' + BLUE_S + '" stroke-width="2"/>';
      inner += '<path d="M80 80 L80 140 A60 60 0 0 1 20 80 Z" fill="' + ORANGE + '" stroke="' + ORANGE_S + '" stroke-width="2"/>';
      inner += '<path d="M80 80 L20 80 A60 60 0 0 1 80 20 Z" fill="' + GREEN + '" stroke="' + GREEN_S + '" stroke-width="2"/>';
      inner += txt(104, 84, "50%", 13);
      inner += txt(52, 112, "25%", 12);
      inner += txt(52, 58, "25%", 12);
      inner += txt(80, 158, "Весь круг = 100 %", 12);
      return svg("0 0 160 170", inner);
    },

    /* Виды треугольников по сторонам */
    triSides: function () {
      var t1 = [[60, 22], [90, 82], [30, 82]];      // равносторонний
      var t2 = [[180, 18], [206, 85], [154, 85]];   // равнобедренный
      var t3 = [[300, 24], [338, 85], [268, 80]];   // разносторонний
      var inner = "";
      inner += poly(t1, BLUE) + tick(t1[0], t1[1]) + tick(t1[1], t1[2]) + tick(t1[2], t1[0]);
      inner += txt(60, 105, "Равносторонний", 9.5);
      inner += poly(t2, ORANGE) + tick(t2[0], t2[1]) + tick(t2[0], t2[2]);
      inner += txt(180, 105, "Равнобедренный", 9.5);
      inner += poly(t3, GREEN);
      inner += txt(300, 105, "Разносторонний", 9.5);
      return svg("0 0 366 118", inner);
    },

    /* Виды треугольников по углам */
    triAngles: function () {
      var inner = "";
      // остроугольный
      inner += poly([[60, 24], [92, 82], [28, 82]], BLUE);
      inner += txt(60, 104, "Остроугольный", 9.5);
      // прямоугольный + метка прямого угла
      inner += poly([[158, 24], [158, 82], [216, 82]], ORANGE);
      inner += '<path d="M158 70 L170 70 L170 82" fill="none" stroke="currentColor" stroke-width="1.5"/>';
      inner += txt(188, 104, "Прямоугольный", 9.5);
      // тупоугольный (тупой угол у вершины C)
      inner += poly([[268, 80], [352, 80], [300, 62]], GREEN);
      inner += '<path d="M291 66 A11 11 0 0 0 309 66" fill="none" stroke="currentColor" stroke-width="1.5"/>';
      inner += txt(310, 104, "Тупоугольный", 9.5);
      return svg("0 0 366 116", inner);
    },

    /* Осевая симметрия: домик + ось */
    symmetry: function () {
      var inner = "";
      inner += '<rect x="60" y="72" width="80" height="58" fill="' + BLUE + '" stroke="' + BLUE_S + '" stroke-width="2"/>';
      inner += poly([[54, 72], [146, 72], [100, 34]], ORANGE);
      inner += '<line x1="100" y1="20" x2="100" y2="140" stroke="' + CYAN_S + '" stroke-width="2" stroke-dasharray="6 5"/>';
      inner += txt(100, 15, "ось симметрии", 11, CYAN_S);
      inner += txt(78, 108, "=", 18);
      inner += txt(122, 108, "=", 18);
      return svg("0 0 200 150", inner);
    },

    /* Окружность: радиус и диаметр */
    circle: function () {
      var cx = 120, cy = 100, r = 75, inner = "";
      inner += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + CYAN + '" stroke="' + CYAN_S + '" stroke-width="2.5"/>';
      // диаметр (горизонталь)
      inner += '<line x1="' + (cx - r) + '" y1="' + cy + '" x2="' + (cx + r) + '" y2="' + cy + '" stroke="' + ORANGE_S + '" stroke-width="2"/>';
      inner += txt(cx + 34, cy - 8, "d", 15, ORANGE_S);
      // радиус (в верхний правый угол)
      var ex = cx + r * 0.71, ey = cy - r * 0.71;
      inner += '<line x1="' + cx + '" y1="' + cy + '" x2="' + ex + '" y2="' + ey + '" stroke="' + BLUE_S + '" stroke-width="2"/>';
      inner += txt((cx + ex) / 2 + 10, (cy + ey) / 2 - 4, "r", 15, BLUE_S);
      // центр
      inner += '<circle cx="' + cx + '" cy="' + cy + '" r="3.5" fill="currentColor" stroke="none"/>';
      inner += txt(cx - 12, cy + 16, "O", 13);
      inner += txt(cx, 195, "d = 2r", 13);
      return svg("0 0 240 205", inner);
    },
  };

  window.mathPic = function (key) {
    return PICS[key] ? PICS[key]() : "";
  };
})();

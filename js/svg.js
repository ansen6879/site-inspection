/* 依輸入即時產生 SVG 示意圖（比例示意，非施工圖）。顏色以 CSS class 控制，配合深色模式。 */
(function (root) {
  'use strict';
  var SC = root.SC = root.SC || {};
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function f1(x) { return Math.round(x * 10) / 10; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function svg(w, h, body, title) {
    return '<svg class="fig" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(title || '示意圖') + '">' +
      '<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" class="hatch"/></pattern>' +
      '<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arrowhead"/></marker></defs>' +
      body + '</svg>';
  }
  function rect(x, y, w, h, cls) { return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(Math.max(w, 0)) + '" height="' + f1(Math.max(h, 0)) + '" class="' + cls + '"/>'; }
  function line(x1, y1, x2, y2, cls) { return '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" class="' + cls + '"/>'; }
  function text(x, y, s, cls, anchor) { return '<text x="' + f1(x) + '" y="' + f1(y) + '" class="' + (cls || 'lbl') + '" text-anchor="' + (anchor || 'middle') + '">' + esc(s) + '</text>'; }
  function circle(x, y, r, cls) { return '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(Math.max(r, 1)) + '" class="' + cls + '"/>'; }
  function dimH(x1, x2, y, label, cls) {
    return line(x1, y, x2, y, 'dim ' + (cls || '')) + line(x1, y - 5, x1, y + 5, 'dim') + line(x2, y - 5, x2, y + 5, 'dim') + text((x1 + x2) / 2, y - 6, label, 'lbl sm ' + (cls || ''));
  }
  function dimV(x, y1, y2, label, cls, side) {
    var tx = side === 'left' ? x - 6 : x + 6;
    return line(x, y1, x, y2, 'dim ' + (cls || '')) + line(x - 5, y1, x + 5, y1, 'dim') + line(x - 5, y2, x + 5, y2, 'dim') + text(tx, (y1 + y2) / 2 + 4, label, 'lbl sm ' + (cls || ''), side === 'left' ? 'end' : 'start');
  }
  function stCls(st) { return 'st-' + (st || 'na'); }
  function worst(items, keys) {
    var order = { fail: 3, tol: 2, pass: 1, na: 0, info: 0 }, w = 'na';
    items.forEach(function (i) { if (keys.indexOf(i.key) >= 0 && order[i.status] > order[w]) w = i.status; });
    return w;
  }
  function stOf(items, key) { var i = items.filter(function (x) { return x.key === key; })[0]; return i ? i.status : 'na'; }

  // 01 穿樑：梁立面
  function beamHole(r, v) {
    var f = r.fig, h = f.h, W = 640, H = 280;
    if (!isNum(h) || h <= 0) return svg(W, 120, text(W / 2, 60, '請輸入梁深 h', 'lbl'), '穿樑');
    var ground = f.member === 'ground';
    var phi = isNum(f.phi) ? f.phi : h / 4, yc = isNum(f.yc) ? f.yc : h / 2;
    var dist = isNum(f.distFace) ? f.distFace : 2.5 * h;
    var Lshow = Math.max(dist + phi / 2 + h, 3.2 * h, (isNum(f.adjDist) ? dist + f.adjDist + h : 0));
    var x0 = 50, sc = Math.min((W - x0 - 70) / Lshow, (H - 90) / h), y0 = 40, bh = h * sc;
    var X = function (cm) { return x0 + cm * sc; }, Y = function (cm) { return y0 + cm * sc; };
    var b = '';
    b += rect(x0 - 34, y0 - 25, 34, bh + 50, 'col');
    b += text(x0 - 17, y0 + bh + 42, '柱', 'lbl sm');
    b += rect(x0, y0, Lshow * sc, bh, 'conc');
    if (!ground) {
      b += rect(x0, y0, 2 * h * sc, bh, 'z-bad');
      b += rect(X(2 * h), y0, (Lshow - 2 * h) * sc, bh / 3, 'z-warn');
      b += rect(X(2 * h), Y(2 * h / 3), (Lshow - 2 * h) * sc, bh / 3, 'z-warn');
      b += rect(X(2 * h), Y(h / 3), (Lshow - 2 * h) * sc, bh / 3, 'z-ok');
      b += text(X(h), y0 + bh / 2 + 4, '2h 內不得穿孔', 'lbl sm bad');
      b += text(X(2 * h) + (Lshow - 2 * h) * sc / 2, Y(h / 2) - phi / 2 * sc - 6, '允許開孔區（中央 1/3）', 'lbl sm ok');
      b += dimH(x0, X(2 * h), y0 - 12, '2h = ' + f1(2 * h));
      b += dimV(x0 + Lshow * sc + 8, y0, Y(h / 3), 'h/3', '', 'right') + dimV(x0 + Lshow * sc + 8, Y(h / 3), Y(2 * h / 3), 'h/3', '', 'right') + dimV(x0 + Lshow * sc + 8, Y(2 * h / 3), y0 + bh, 'h/3', '', 'right');
    } else {
      b += text(x0 + Lshow * sc / 2, y0 - 10, '地梁：孔徑 ≤ H/3；孔徑 < H/10 免補強', 'lbl sm');
    }
    var hs = worst(r.items, ['dia', 'topEdge', 'botEdge', 'face']);
    // 補強示意
    if (!ground && v.diagBar && v.diagBar !== 'none') {
      var cx = X(dist), cy = Y(yc), L = Math.min(h * 0.55, phi * 1.4 + 10) * sc;
      b += line(cx - L, cy - L, cx + L, cy + L, 'rebar thin') + line(cx - L, cy + L, cx + L, cy - L, 'rebar thin');
    }
    if (!ground && isNum(f.s) && f.s > 0) {
      var nL = isNum(v.sideL) ? v.sideL : 0, nR = isNum(v.sideR) ? v.sideR : 0, gap = Math.min(f.s / 2, 6) * sc;
      for (var k = 0; k < nL; k++) b += line(X(dist - phi / 2) - 5 * sc - k * gap, y0 + 4, X(dist - phi / 2) - 5 * sc - k * gap, y0 + bh - 4, 'rebar thin');
      for (k = 0; k < nR; k++) b += line(X(dist + phi / 2) + 5 * sc + k * gap, y0 + 4, X(dist + phi / 2) + 5 * sc + k * gap, y0 + bh - 4, 'rebar thin');
    }
    b += circle(X(dist), Y(yc), phi / 2 * sc, 'hole ' + stCls(hs));
    b += text(X(dist), Y(yc) + 4, 'φ' + f1(phi), 'lbl sm');
    if (isNum(f.adjDist)) {
      var ap = isNum(f.adjPhi) ? f.adjPhi : phi;
      b += circle(X(dist + f.adjDist), Y(yc), ap / 2 * sc, 'hole ' + stCls(stOf(r.items, 'adj')));
      b += dimH(X(dist), X(dist + f.adjDist), y0 + bh + 18, '中心距 ' + f1(f.adjDist), stCls(stOf(r.items, 'adj')));
    }
    b += dimH(x0, X(dist), y0 + bh + (isNum(f.adjDist) ? 40 : 22), '孔中心距柱面 ' + f1(dist));
    return svg(W, H, b, '穿樑示意圖');
  }

  // 02 搭接
  function lap(r, v) {
    var W = 640, H = 170, req = r.fig.required, m = r.fig.measured;
    if (!isNum(req)) return svg(W, 80, text(W / 2, 40, r.items[0] ? r.items[0].label + '：' + (r.items[0].measured || '') : '', 'lbl'), '搭接');
    var mm = isNum(m) ? m : req, Lmax = Math.max(req, mm) * 1.0, x0 = 140, sc = (W - x0 - 140) / Lmax, b = '';
    var st = r.items[0].status;
    b += line(20, 60, x0 + mm * sc, 60, 'rebar') + line(x0, 78, W - 20, 78, 'rebar');
    b += rect(x0, 52, mm * sc, 34, 'z-' + (st === 'fail' ? 'bad' : st === 'tol' ? 'warn' : 'ok') + ' faint');
    b += dimH(x0, x0 + req * sc, 120, '規定 ' + req + ' cm');
    b += dimH(x0, x0 + mm * sc, 36, isNum(m) ? '實測 ' + m + ' cm' : '實測（未輸入）', stCls(st));
    if (isNum(m) && m < req) b += rect(x0 + m * sc, 100, (req - m) * sc, 8, 'z-bad') + text(x0 + (m + (req - m) / 2) * sc, 150, '不足 ' + f1(req - m) + ' cm', 'lbl sm bad');
    b += text(20, 52, v.bar || '', 'lbl sm', 'start');
    return svg(W, H, b, '搭接示意圖');
  }

  // 03 箍筋：立面＋彎鉤詳圖
  function stirrup(r, v) {
    var f = r.fig, W = 640, H = 300, b = '';
    if (f.member === 'beam') {
      var h = isNum(f.h) ? f.h : 60, zone = f.special ? 2 * h : 0;
      var L = Math.max(zone * 1.8, 3 * h, (isNum(f.L1) ? f.L1 * 1.5 : 0)), x0 = 50, sc = (W - 90) / L, y0 = 40, bh = Math.min(h * sc, 110);
      b += rect(x0 - 30, y0 - 20, 30, bh + 40, 'col') + rect(x0, y0, L * sc, bh, 'conc');
      if (f.special) {
        b += rect(x0, y0, zone * sc, bh, 'z-ok faint');
        b += dimH(x0, x0 + zone * sc, y0 - 10, '加密區 2h = ' + f1(zone));
      }
      var x = isNum(f.x0) ? f.x0 : 5, s1 = isNum(f.s1) && f.s1 > 0 ? f.s1 : 10, s2 = isNum(f.s2) && f.s2 > 0 ? f.s2 : 20, end1 = isNum(f.L1) ? f.L1 : zone;
      var guard = 0;
      while (x <= L && guard++ < 200) {
        var inZone = f.special && x <= end1 + 1e-9;
        b += line(x0 + x * sc, y0 + 5, x0 + x * sc, y0 + bh - 5, 'rebar thin ' + (inZone ? stCls(stOf(r.items, 's1')) : stCls(stOf(r.items, 's2'))));
        x += inZone ? s1 : s2;
      }
      if (f.special && isNum(f.x0)) b += dimH(x0, x0 + f.x0 * sc, y0 + bh + 18, '第一支 ' + f.x0, stCls(stOf(r.items, 'x0')));
      var lim = function (x) { return isNum(x) ? f1(x) : '—'; }; // 條件未填時不顯示 NaN
      b += text(x0 + L * sc / 2, y0 + bh + 40, (f.special ? '加密區上限 ' + lim(f.smax1) + '，' : '') + '一般區上限 ' + lim(f.smax2) + ' cm', 'lbl sm');
      b += hookDetail(W / 2, y0 + bh + 140, r, v);
      return svg(W, y0 + bh + 250, b, '梁箍筋示意圖');
    }
    // 柱：直立立面
    var Hn = isNum(f.Hn) ? f.Hn : 300, cx = 150, top = 20, ch = 250, scy = ch / Hn, lo = f.lo || 0;
    b += rect(cx - 30, top - 15, 60, 15, 'col') + rect(cx - 30, top + ch, 60, 15, 'col');
    b += rect(cx - 25, top, 50, ch, 'conc');
    if (f.special) {
      b += rect(cx - 25, top, 50, lo * scy, 'z-ok faint') + rect(cx - 25, top + ch - lo * scy, 50, lo * scy, 'z-ok faint');
      b += dimV(cx + 40, top, top + lo * scy, 'ℓo ≥ ' + f1(lo), '', 'right') + dimV(cx + 40, top + ch - lo * scy, top + ch, 'ℓo ≥ ' + f1(lo), '', 'right');
    }
    var s1c = isNum(f.s1) && f.s1 > 0 ? f.s1 : 10, s2c = isNum(f.s2) && f.s2 > 0 ? f.s2 : 15, y = 5, g = 0;
    while (y < Hn && g++ < 200) {
      var inLo = f.special && (y <= lo || y >= Hn - lo);
      b += line(cx - 22, top + y * scy, cx + 22, top + y * scy, 'rebar thin ' + (inLo ? stCls(stOf(r.items, 's1')) : stCls(stOf(r.items, 's2'))));
      y += inLo ? s1c : s2c;
    }
    b += dimV(cx - 45, top, top + ch, 'Hn ' + f1(Hn), '', 'left');
    b += hookDetail(470, 170, r, v);
    return svg(W, H, b, '柱箍筋示意圖');
  }
  function hookDetail(cx, cy, r, v) {
    var st = worst(r.items, ['hook', 'ext']), b = '';
    b += rect(cx - 70, cy - 70, 140, 140, 'conc');
    b += '<rect x="' + (cx - 55) + '" y="' + (cy - 55) + '" width="110" height="110" rx="8" class="rebar hoop ' + stCls(st) + '"/>';
    var ang = isNum(v.hookAngle) ? v.hookAngle : 135;
    if (ang >= 135) b += '<path d="M' + (cx - 47) + ',' + (cy - 55) + ' l28,28 M' + (cx - 55) + ',' + (cy - 47) + ' l28,28" class="rebar thin ' + stCls(st) + '"/>';
    else b += '<path d="M' + (cx - 47) + ',' + (cy - 55) + ' l0,30 M' + (cx - 55) + ',' + (cy - 47) + ' l30,0" class="rebar thin ' + stCls(st) + '"/>';
    [[-45, -45], [45, -45], [-45, 45], [45, 45], [0, -45], [0, 45]].forEach(function (p) { b += circle(cx + p[0], cy + p[1], 5, 'bar'); });
    b += line(cx, cy - 55, cx, cy + 55, 'rebar thin');
    b += text(cx, cy + 92, '彎鉤 ' + ang + '°，延伸 ≥ 6db 且 ≥ 7.5cm', 'lbl sm');
    return b;
  }

  // 04 保護層
  function cover(r) {
    var f = r.fig, W = 640, H = 230, b = '', s = 9;
    var m = isNum(f.measured) ? f.measured : f.design, st = r.items.filter(function (i) { return i.key === 'cover'; })[0].status;
    var y0 = 30, x0 = 200, w = 240, hh = 150;
    b += rect(x0, y0, w, hh, 'conc');
    var cy = f.face === 'top' ? y0 + m * s + 9 : f.face === 'bottom' ? y0 + hh - m * s - 9 : y0 + hh / 2;
    var cx = f.face === 'side' ? x0 + m * s + 9 : x0 + w / 2;
    b += circle(cx, cy, 9, 'bar ' + stCls(st));
    if (f.face === 'side') b += dimH(x0, x0 + m * s, cy - 18, '實測 ' + f1(m), stCls(st)) + line(x0 + f.design * s, y0, x0 + f.design * s, y0 + hh, 'guide');
    else if (f.face === 'top') b += dimV(cx + 30, y0, y0 + m * s, '實測 ' + f1(m), stCls(st), 'right') + line(x0, y0 + f.design * s, x0 + w, y0 + f.design * s, 'guide');
    else b += dimV(cx + 30, y0 + hh - m * s, y0 + hh, '實測 ' + f1(m), stCls(st), 'right') + line(x0, y0 + hh - f.design * s, x0 + w, y0 + hh - f.design * s, 'guide');
    b += text(W / 2, H - 15, '虛線＝設計保護層 ' + f1(f.design) + ' cm（規範最小 ' + f1(f.req) + ' cm）', 'lbl sm');
    return svg(W, H, b, '保護層示意圖');
  }

  // 05 淨間距
  function clearSpacing(r) {
    var f = r.fig, W = 640, H = 170, b = '', sc = 22, d = f.db * sc, m = isNum(f.measured) ? f.measured : f.req, st = r.items[0].status;
    var x = 120, y = 80;
    b += rect(60, 30, 520, 100, 'conc');
    for (var k = 0; k < 4; k++) { b += circle(x + d / 2, y, d / 2, 'bar'); if (k < 3) { var x2 = x + d + m * sc; if (k === 1) b += dimH(x + d, x2, y - d / 2 - 12, '淨距 ' + f1(m), stCls(st)); x = x2; } }
    b += text(W / 2, 155, '規定 ≥ ' + f1(f.req) + ' cm', 'lbl sm');
    return svg(W, H, b, '淨間距示意圖');
  }

  // 06 搭接位置
  function lapZone(r) {
    var f = r.fig, W = 640, b = '';
    if (f.member === 'beam') {
      var H = 200, Ln = f.Ln || 600, h = f.h || 60, x0 = 40, sc = (W - 80) / Ln, y0 = 60, bh = 60;
      b += rect(x0 - 25, y0 - 20, 25, bh + 40, 'col') + rect(x0 + Ln * sc, y0 - 20, 25, bh + 40, 'col') + rect(x0, y0, Ln * sc, bh, 'conc');
      b += rect(x0, y0, 2 * h * sc, bh, 'z-bad') + rect(x0 + (Ln - 2 * h) * sc, y0, 2 * h * sc, bh, 'z-bad');
      if (f.layer === 'top' && isNum(f.zL)) b += rect(x0, y0, f.zL * sc, 14, 'z-warn') + rect(x0 + (Ln - f.zR) * sc, y0, f.zR * sc, 14, 'z-warn');
      if (f.layer !== 'top' && isNum(f.m1)) b += rect(x0 + f.m1 * sc, y0 + bh - 14, (f.m2 - f.m1) * sc, 14, 'z-warn') + text(x0 + Ln * sc / 2, y0 + bh + 18, '跨中連續區', 'lbl sm bad');
      var yb = f.layer === 'top' ? y0 + 8 : y0 + bh - 8, st = r.overall;
      if (isNum(f.x1) && isNum(f.x2)) { b += rect(x0 + f.x1 * sc, yb - 6, (f.x2 - f.x1) * sc, 12, 'lapbar ' + stCls(st)); b += dimH(x0 + f.x1 * sc, x0 + f.x2 * sc, y0 - 28, '搭接 ' + f1(f.x1) + '～' + f1(f.x2), stCls(st)); }
      b += text(x0 + h * sc, y0 + bh / 2 + 4, '2h', 'lbl sm bad') + text(x0 + (Ln - h) * sc, y0 + bh / 2 + 4, '2h', 'lbl sm bad');
      b += dimH(x0, x0 + Ln * sc, y0 + bh + 40, 'Ln = ' + f1(Ln));
      return svg(W, H, b, '梁搭接位置示意圖');
    }
    var Hn = f.Hn || 300, cx = 300, top = 20, ch = 250, s = ch / Hn;
    b += rect(cx - 30, top, 60, ch, 'conc') + rect(cx - 30, top, 60, Hn / 4 * s, 'z-bad') + rect(cx - 30, top + ch - Hn / 4 * s, 60, Hn / 4 * s, 'z-bad');
    if (isNum(f.x1) && isNum(f.x2)) b += rect(cx + 8, top + ch - f.x2 * s, 10, (f.x2 - f.x1) * s, 'lapbar ' + stCls(r.overall));
    b += dimV(cx + 50, top + Hn / 4 * s, top + ch - Hn / 4 * s, '搭接範圍 Hn/2', '', 'right') + dimV(cx - 50, top, top + ch, 'Hn ' + f1(Hn), '', 'left');
    return svg(W, 300, b, '柱搭接位置示意圖');
  }

  // 07 錨定
  function anchor(r) {
    var f = r.fig, W = 640, H = 220, b = '', req = f.required, m = isNum(f.measured) ? f.measured : req, st = r.items[0].status;
    var x0 = 360, sc = 200 / Math.max(req, m, 1);
    b += rect(x0 - 10, 20, 230, 180, 'conc') + rect(x0 - 10, 20, 230, 180, 'col faint');
    b += rect(40, 60, x0 - 50, 70, 'conc');
    b += text(x0 + 105, 15, '柱（接頭）', 'lbl sm');
    var ye = 75;
    b += '<path d="M40,' + ye + ' H' + f1(x0 + m * sc) + (f.type === 'straight' ? '' : ' v70') + '" class="rebar ' + stCls(st) + '"/>';
    b += dimH(x0, x0 + req * sc, 180, '規定 ' + req, '');
    b += dimH(x0, x0 + m * sc, 55, isNum(f.measured) ? '實測 ' + f.measured : '實測（未輸入）', stCls(st));
    b += line(x0, 20, x0, 200, 'guide');
    b += text(x0 - 4, 212, '臨界斷面（柱面）', 'lbl sm', 'end');
    return svg(W, H, b, '錨定示意圖');
  }

  // 08 埋管
  function embed(r) {
    var f = r.fig, W = 640, H = 220, b = '', st = r.overall;
    if (f.member === 'slab') {
      var t = f.t || 15, sc = 140 / t, od = isNum(f.od) ? f.od : t / 4, sp = isNum(f.spacing) ? f.spacing : 3 * od;
      b += rect(40, 40, 560, t * sc, 'conc');
      b += line(40, 40 + 3 * sc, 600, 40 + 3 * sc, 'rebar thin') + line(40, 40 + (t - 3) * sc, 600, 40 + (t - 3) * sc, 'rebar thin');
      var cx = 200;
      for (var k = 0; k < 3; k++) b += circle(cx + k * Math.min(sp * sc, 160), 40 + t * sc / 2, od * sc / 2, 'hole ' + stCls(st));
      b += dimV(620, 40, 40 + t * sc, 't = ' + t, '', 'left') + text(W / 2, 205, '管外徑 ≤ t/3，中心距 ≥ 3 倍管徑', 'lbl sm');
      return svg(W, H, b, '版牆埋管示意圖');
    }
    if (f.member === 'column') {
      var bb = f.b || 50, hc = f.hc || 50, s2 = 160 / Math.max(bb, hc);
      b += rect(240, 30, bb * s2, hc * s2, 'conc ' + stCls(st));
      if (isNum(f.od)) for (var n = 0; n < Math.min(f.n || 0, 6); n++) b += circle(240 + bb * s2 / 2 - 20 + n * 10, 30 + hc * s2 / 2, f.od * s2 / 2, 'hole ' + stCls(st));
      b += text(W / 2, 210, '柱內埋管面積 ≤ 柱斷面 4%，內徑 ≤ 5cm', 'lbl sm');
      return svg(W, H, b, '柱埋管示意圖');
    }
    b += rect(240, 20, 160, 180, 'conc');
    for (var j = 0; j < 3; j++) b += circle(320, 60 + j * 40, 10, 'hole ' + stCls(st));
    b += text(W / 2, 214, '內徑 ≤ 5cm，一排豎向排列於梁中心', 'lbl sm');
    return svg(W, H, b, '梁埋管示意圖');
  }

  // 09 洩水坡度：縱斷面（垂直放大）
  function slope(r) {
    var f = r.fig, W = 640, H = 240, b = '';
    if (!isNum(f.reqS) || f.reqS <= 0) return svg(W, 80, text(W / 2, 40, '請輸入規定坡度', 'lbl'), '洩水坡度');
    if (f.rows) { // 地坪
      var rows = f.rows.filter(function (p) { return isNum(p.x) && isNum(p.need); });
      if (!rows.length) return svg(W, 80, text(W / 2, 40, '請輸入測點距離', 'lbl'), '地坪洩水');
      // 縱軸同時涵蓋應有高度、實測高度與落水頭（0），實測低於落水頭的點也畫在圖內
      var hs = [0]; rows.forEach(function (p) { hs.push(p.need); if (isNum(p.m)) hs.push(p.m); });
      var maxX = Math.max.apply(null, rows.map(function (p) { return p.x; })), hiZ = Math.max.apply(null, hs), loZ = Math.min.apply(null, hs);
      var x0 = 60, sx = (W - 120) / (maxX || 1), sz = 150 / ((hiZ - loZ) || 1), base = 45 + hiZ * sz; // base＝落水頭高程（0）的 y
      b += line(x0, base, W - 40, base, 'dim') + circle(x0, base, 6, 'drain') + text(x0, base + 20, '落水頭', 'lbl sm');
      rows.forEach(function (p, k) {
        var x = x0 + p.x * sx, it = r.items.filter(function (i) { return i.key === p.key; })[0], st = it ? it.status : 'na'; // 依測點代號取狀態（無效列不在 rows 內）
        b += line(x, base, x, base - p.need * sz, 'guide') + circle(x, base - p.need * sz, 3, 'dot');
        if (isNum(p.m)) b += circle(x, base - p.m * sz, 6, 'pt ' + stCls(st));
        b += text(x, Math.min(base + 20, H - 6), p.name, 'lbl sm');
      });
      b += text(W / 2, 20, '虛線＝應有高度；實心圓＝實測', 'lbl sm');
      return svg(W, H, b, '地坪洩水示意圖');
    }
    // 測點須全部有距離與高程才出圖；不逐點過濾，以免區段顏色（f.seg）與點序錯位
    var pts = f.pts || [];
    if (f.msg) return svg(W, 80, text(W / 2, 40, f.msg, 'lbl'), '洩水坡度');
    if (pts.length < 2 || pts.some(function (p) { return !isNum(p.x) || !isNum(p.z); })) return svg(W, 80, text(W / 2, 40, '請輸入至少 2 個測點的距離與讀數', 'lbl'), '洩水坡度');
    var xs = pts.map(function (p) { return p.x; }), zs = pts.map(function (p) { return p.z; });
    var minX = Math.min.apply(null, xs), maxX2 = Math.max.apply(null, xs), minZ = Math.min.apply(null, zs), maxZ2 = Math.max.apply(null, zs);
    var spanZ = Math.max(maxZ2 - minZ, (maxX2 - minX) * f.reqS, 1);
    var X = function (x) { return 50 + (x - minX) / ((maxX2 - minX) || 1) * (W - 100); };
    // 捲尺量測：畫出量測基準的樓版（高程 0）。樓版至管的距離遠大於落差，故樓版位置不依比例，以尺寸線標讀數
    var slab = f.slab === 'above' || f.slab === 'below' ? f.slab : '', top = slab === 'above' ? 95 : 40, hgt = slab ? 110 : 150;
    var Z = function (z) { return top + (maxZ2 - z) / spanZ * hgt; };
    if (slab) {
      var uf = f.unit === 'mm' ? 10 : f.unit === 'm' ? 0.01 : 1, ul = f.unit === 'mm' || f.unit === 'm' ? f.unit : 'cm';
      var sy = slab === 'above' ? 50 : 200; H = slab === 'above' ? 270 : 266;
      var band = slab === 'above' ? rect(0, sy - 16, W, 16, 'conc') : rect(0, sy, W, 16, 'conc');
      b += band + line(0, sy, W, sy, 'slabln') + text(8, slab === 'above' ? sy - 22 : sy + 34, slab === 'above' ? '樓版（量測基準）' : '樓版／地坪（量測基準）', 'lbl xs', 'start');
      pts.forEach(function (p) {
        var px = X(p.x), py = Z(p.z), rd = Math.abs(p.z) * uf, ry = (sy + py) / 2 + 5;
        b += line(px, sy, px, py, 'guide') + line(px - 6, sy, px + 6, sy, 'dim');
        b += text(px > W / 2 ? px - 6 : px + 6, ry, (Math.round(rd * 100) / 100) + ul, 'lbl xs', px > W / 2 ? 'end' : 'start');
      });
    }
    // 規定坡度參考線（自首點起）
    b += line(X(pts[0].x), Z(pts[0].z), X(maxX2), Z(pts[0].z - (maxX2 - pts[0].x) * f.reqS), 'guide');
    for (var k = 1; k < pts.length; k++) {
      var sg = f.seg ? f.seg[k - 1] : null;
      b += line(X(pts[k - 1].x), Z(pts[k - 1].z), X(pts[k].x), Z(pts[k].z), 'prof ' + stCls(sg ? sg.st : r.overall));
    }
    pts.forEach(function (p, k) {
      var pond = f.pondIdx ? f.pondIdx.indexOf(k) >= 0 : false; // 依點序，點名重複也不誤標
      b += circle(X(p.x), Z(p.z), pond ? 8 : 5, pond ? 'pt st-fail' : 'pt');
      // 版下量：上方是讀數尺寸線，點名改放測點下方以免重疊
      b += text(X(p.x), slab === 'above' ? Z(p.z) + 26 : Z(p.z) - 12, p.name, 'lbl sm') + text(X(p.x), H - 12, f1(p.x / 100) + 'm', 'lbl xs');
    });
    b += text(W - 10, 20, '垂直放大；虛線＝規定坡度', 'lbl xs', 'end');
    return svg(W, H, b, '洩水坡度縱斷面');
  }

  // 圖面樣式（以 CSS 變數著色；匯出 PNG 時換成實際色值）
  var FIG_CSS = [
    '.fig{width:100%;height:auto;display:block;font-family:var(--font)}',
    '.fig .conc{fill:var(--conc);stroke:var(--line);stroke-width:1.2}',
    '.fig .col{fill:var(--colfill);stroke:var(--line);stroke-width:1.2}',
    '.fig .faint{opacity:.45}',
    '.fig .z-ok{fill:var(--ok-bg);stroke:none}',
    '.fig .z-warn{fill:var(--tol-bg);stroke:none}',
    '.fig .z-bad{fill:url(#hatch);stroke:none}',
    '.fig .hatch{stroke:var(--fail);stroke-width:3;opacity:.45}',
    '.fig .rebar{fill:none;stroke:var(--rebar);stroke-width:4;stroke-linecap:round}',
    '.fig .rebar.thin{stroke-width:2}',
    '.fig .hoop{stroke-width:3}',
    '.fig .bar{fill:var(--rebar)}',
    '.fig .hole{fill:var(--bg);stroke-width:3}',
    '.fig .lapbar{stroke:none}',
    '.fig .dim{stroke:var(--muted);stroke-width:1}',
    '.fig .guide{stroke:var(--muted);stroke-width:1.2;stroke-dasharray:5 4;fill:none}',
    '.fig .prof{stroke-width:4;fill:none}',
    '.fig .slabln{stroke:var(--line);stroke-width:2.5}',
    '.fig .pt{fill:var(--fg)}',
    '.fig .dot{fill:var(--muted)}',
    '.fig .drain{fill:var(--accent)}',
    '.fig .arrowhead{fill:var(--muted)}',
    '.fig .lbl{fill:var(--fg);font-size:22px}',
    '.fig .lbl.sm{font-size:19px}',
    '.fig .lbl.xs{font-size:15px;fill:var(--muted)}',
    '.fig .lbl.ok{fill:var(--ok)}',
    '.fig .lbl.bad{fill:var(--fail)}',
    '.fig .st-pass{stroke:var(--ok)}', '.fig .st-tol{stroke:var(--tol)}', '.fig .st-fail{stroke:var(--fail)}', '.fig .st-na{stroke:var(--muted)}',
    '.fig .lapbar.st-pass,.fig .pt.st-pass,.fig .bar.st-pass{fill:var(--ok)}', '.fig .lapbar.st-tol,.fig .pt.st-tol,.fig .bar.st-tol{fill:var(--tol)}',
    '.fig .lapbar.st-fail,.fig .pt.st-fail,.fig .bar.st-fail{fill:var(--fail)}', '.fig .lapbar.st-na{fill:var(--muted)}',
    '.fig text.st-pass{fill:var(--ok);stroke:none}', '.fig text.st-tol{fill:var(--tol);stroke:none}', '.fig text.st-fail{fill:var(--fail);stroke:none}'
  ].join('\n');
  SC.FIG_CSS = FIG_CSS;
  // 匯出用：把 var(--x) 換成目前主題實際色值
  SC.figCss = function (cs) {
    return FIG_CSS.replace(/var\((--[\w-]+)\)/g, function (_, n) { return (cs.getPropertyValue(n) || '').trim() || '#888'; });
  };

  SC.svg = { beamHole: beamHole, lap: lap, stirrup: stirrup, cover: cover, clearSpacing: clearSpacing, lapZone: lapZone, anchor: anchor, embed: embed, slope: slope,
    // 共用繪圖工具（機電示意圖 svg-mep.js 使用）
    _h: { isNum: isNum, f1: f1, svg: svg, rect: rect, line: line, text: text, circle: circle, dimH: dimH, dimV: dimV, stCls: stCls, stOf: stOf, worst: worst } };
  if (typeof module !== 'undefined' && module.exports) { module.exports = SC.svg; require('./svg-mep.js'); }
})(typeof globalThis !== 'undefined' ? globalThis : this);

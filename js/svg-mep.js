/* 機電示意圖（比例示意，非施工圖）。顏色沿用 svg.js 的 CSS class。 */
(function (root) {
  'use strict';
  var SC = root.SC = root.SC || {};
  var G = SC.svg._h;
  var isNum = G.isNum, f1 = G.f1, svg = G.svg, rect = G.rect, line = G.line, text = G.text, circle = G.circle, dimH = G.dimH, dimV = G.dimV, stCls = G.stCls, stOf = G.stOf;

  // 導線管斷面＋佔積率長條
  function conduit(r) {
    var f = r.fig, W = 640, H = 260, b = '';
    if (!isNum(f.full)) return svg(W, 80, text(W / 2, 45, '請選擇管徑並輸入導線', 'lbl'), '導線管');
    var cx = 125, cy = 130, R = 105;
    b += circle(cx, cy, R, 'hole ' + stCls(f.st));
    // 依面積比例縮放導線圓；由大到小，逐一放在不重疊且最低（沉在管底）的位置（示意）
    var list = [];
    f.rows.forEach(function (w) { for (var k = 0; k < w.n && list.length < 150; k++) list.push(R * Math.sqrt(w.area / f.full)); });
    list.sort(function (p, q) { return q - p; });
    var cand = [], placed = [], g = 3;
    for (var y = -R; y <= R; y += g) for (var x = -R; x <= R; x += g) cand.push([x, y, Math.sqrt(x * x + y * y)]);
    cand.sort(function (p, q) { return (q[1] - p[1]) || (Math.abs(p[0]) - Math.abs(q[0])); });
    list.forEach(function (rr) {
      for (var k = 0; k < cand.length; k++) {
        var p = cand[k];
        if (p[2] + rr > R - 1) continue;
        if (placed.every(function (q) { var dx = p[0] - q[0], dy = p[1] - q[1]; return dx * dx + dy * dy >= (rr + q[2]) * (rr + q[2]); })) { placed.push([p[0], p[1], rr]); return; }
      }
    });
    placed.forEach(function (q) { b += circle(cx + q[0], cy + q[1], q[2], 'bar'); });
    if (list.length > placed.length) b += text(cx, cy + R + 22, '圖示僅繪 ' + placed.length + '／' + list.length + ' 條', 'lbl xs');
    b += text(cx, 18, '管徑 ' + f.size + ' mm，' + f.N + ' 條', 'lbl sm');
    // 佔積率長條（0～70%）
    var x0 = 290, x1 = 610, yb = 120, sc = (x1 - x0) / 70, pct = Math.min(f.fillPct, 70);
    b += rect(x0, yb, x1 - x0, 26, 'conc');
    b += rect(x0, yb, pct * sc, 26, 'lapbar ' + stCls(f.st));
    f.marks.forEach(function (mk, k) {
      b += line(x0 + mk * sc, yb - 18, x0 + mk * sc, yb + 44, 'guide');
      b += text(x0 + mk * sc, k % 2 ? yb + 62 : yb - 24, mk + '%', 'lbl xs');
    });
    b += text((x0 + x1) / 2, 60, '佔積率 ' + f1(f.fillPct) + '%（總和 ' + f.A + ' mm²）', 'lbl sm ' + stCls(f.st));
    b += text((x0 + x1) / 2, 222, '31%＝2 條　53%＝1 條', 'lbl xs');
    b += text((x0 + x1) / 2, 244, '60%＝管長 6m 以下', 'lbl xs');
    return svg(W, H, b, '導線管佔積率示意圖');
  }

  // 單一量測值與合格範圍（接地、絕緣）
  // exact：定值 ± 誤差，軸只取該值附近（±6 倍誤差）以免刻度擠在一起
  function gaugeRow(y, label, lo, hi, m, st, unit, W, exact) {
    var x0 = 30, x1 = W - 30, b = '', from = 0, top;
    if (exact) { var c = (lo + hi) / 2, w = (hi - lo) * 3; from = c - w; top = c + w; if (isNum(m)) { from = Math.min(from, m - w / 6); top = Math.max(top, m + w / 6); } }
    else top = isFinite(hi) ? Math.max(hi * 1.6, isNum(m) ? m * 1.15 : 0, lo * 1.6) : Math.max(lo * 4, isNum(m) ? m * 1.2 : 0, 1);
    var sc = (x1 - x0) / ((top - from) || 1);
    var X = function (v) { return x0 + (Math.min(Math.max(v, from), top) - from) * sc; };
    b += text(x0, y, label, 'lbl sm', 'start');
    b += rect(x0, y + 12, x1 - x0, 22, 'z-bad');
    b += rect(X(Math.max(lo, from)), y + 12, X(isFinite(hi) ? hi : top) - X(Math.max(lo, from)), 22, 'z-ok');
    if (exact) b += text(X((lo + hi) / 2), y + 52, f1((lo + hi) / 2) + ' ± ' + f1((hi - lo) / 2), 'lbl xs');
    else {
      if (lo > 0) b += text(X(lo), y + 52, f1(lo), 'lbl xs');
      if (isFinite(hi)) b += text(X(hi), y + 52, f1(hi), 'lbl xs');
    }
    if (isNum(m)) {
      var xm = X(m);
      b += line(xm, y + 6, xm, y + 40, 'prof ' + stCls(st));
      b += text(Math.min(Math.max(xm, x0 + 60), x1 - 60), y + 70, '實測 ' + f1(m) + (unit ? ' ' + unit : ''), 'lbl sm ' + stCls(st));
    }
    return b;
  }
  function gauge(r) {
    var f = r.fig, W = 640;
    return svg(W, 120, gaugeRow(26, f.label + '（綠色＝合格範圍，' + f.unit + '）', f.lo, f.hi, f.m, f.st, f.unit, W), f.label + '示意圖');
  }

  // 無障礙馬桶平面（仿規範圖505.2：左為側牆、上為後牆；尺寸依實測，未填者以規定值示意）
  // 平面上標 A～D，數值與判定列在右側
  function toiletPlan(r) {
    var p = r.fig.plan, W = 640, H = 400, b = '';
    var wall = isNum(p.wall) ? p.wall : 60, side = isNum(p.side) ? p.side : 70, front = isNum(p.front) ? p.front : 70, turn = isNum(p.turn) ? p.turn : 150;
    var roomW = Math.max(wall + 20 + side, wall + 20 + turn - 20, 160), roomD = 70 + front + 50;
    var s = Math.min(330 / roomW, 340 / roomD), x0 = 34, y0 = 34;
    var X = function (cm) { return x0 + cm * s; }, Y = function (cm) { return y0 + cm * s; };
    var cls = function (k) { return stCls(stOf(r.items, k)); };
    b += rect(x0 - 12, y0 - 12, 12, roomD * s + 12, 'col') + rect(x0 - 12, y0 - 12, roomW * s + 12, 12, 'col');
    b += line(X(roomW), y0, X(roomW), Y(roomD), 'guide') + line(x0, Y(roomD), X(roomW), Y(roomD), 'guide');
    b += rect(X(wall - 22), y0, 44 * s, 20 * s, 'conc') + '<ellipse cx="' + f1(X(wall)) + '" cy="' + f1(Y(45)) + '" rx="' + f1(20 * s) + '" ry="' + f1(25 * s) + '" class="conc"/>';
    b += rect(x0, Y(70 + front), 55 * s, 45 * s, 'conc') + '<ellipse cx="' + f1(X(27)) + '" cy="' + f1(Y(70 + front + 22)) + '" rx="' + f1(16 * s) + '" ry="' + f1(12 * s) + '" class="hole"/>';
    var cx = X(Math.min(wall + 20 + turn / 2 - 10, roomW - turn / 2)), cy = Y(70 + Math.max(front, turn / 2) / 2 + 20);
    b += circle(cx, cy, turn / 2 * s, 'guide ' + cls('turn')) + text(cx, cy + 6, 'D', 'lbl ' + cls('turn'));
    // A 中心距牆、B 側邊淨距、C 前緣淨距
    b += line(x0, Y(55), X(wall), Y(55), 'prof ' + cls('wall')) + text(X(wall / 2), Y(55) - 6, 'A', 'lbl ' + cls('wall'));
    b += line(X(wall + 20), Y(45), X(wall + 20 + side), Y(45), 'prof ' + cls('side')) + text(X(wall + 20 + side / 2), Y(45) - 6, 'B', 'lbl ' + cls('side'));
    b += line(X(wall), Y(70), X(wall), Y(70 + front), 'prof ' + cls('front')) + text(X(wall) + 14, Y(70 + front / 2) + 6, 'C', 'lbl ' + cls('front'), 'start');
    b += line(X(wall) - 20 * s, Y(70), X(wall) + 20 * s, Y(70), 'dim');
    // 右側說明
    var lx = 400, rows = [['A', '馬桶中心線距側牆', p.wall, '≤ 60', 'wall'], ['B', '側邊至牆或器具淨距', p.side, '≥ 70', 'side'], ['C', '前緣至前方器具淨距', p.front, '≥ 70', 'front'], ['D', '迴轉空間直徑', p.turn, '≥ 150', 'turn']];
    rows.forEach(function (rw, k) {
      var y = 60 + k * 74;
      b += text(lx, y, rw[0] + '　' + rw[1], 'lbl sm', 'start');
      b += text(lx + 22, y + 28, (isNum(rw[2]) ? rw[2] + ' cm' : '未填') + '（' + rw[3] + '）', 'lbl sm ' + cls(rw[4]), 'start');
    });
    b += text(W - 10, H - 8, '仿規範圖505.2 示意；單位 cm', 'lbl xs', 'end');
    return svg(W, H, b, '無障礙馬桶平面示意圖');
  }

  // 無障礙：各檢查項目的合格範圍與實測位置
  function bands(r) {
    var f = r.fig, W = 640, rows = f.bands || [], b = '';
    if (f.plan) return toiletPlan(r);
    if (!rows.length) return svg(W, 80, text(W / 2, 45, '本項目無數值示意，請看下方判定', 'lbl sm'), f.title || '示意圖');
    rows.forEach(function (rw, k) { b += gaugeRow(26 + k * 92, rw.unit ? rw.label : rw.label + '（cm）', rw.lo, rw.hi, rw.m, rw.st, rw.unit || 'cm', W, rw.exact); });
    return svg(W, 26 + rows.length * 92, b, f.title + '示意圖');
  }

  // 撒水頭平面（左、上為牆）
  function sprinkler(r) {
    var f = r.fig, W = 640, H = 340, b = '', R = f.r || 2.1;
    if (f.type === 'side') {
      var a = isNum(f.a) ? f.a : 3.6, wx = isNum(f.wx) ? f.wx : a / 2, dp = isNum(f.depth) ? f.depth : 3.6;
      var ext = wx + a + 2.2, s = Math.min((W - 80) / ext, (H - 110) / Math.max(dp, 3.6));
      var X = function (m) { return 40 + m * s; }, Y = function (m) { return 40 + m * s; };
      b += line(40, 40, W - 20, 40, 'rebar') + line(40, 40, 40, Y(dp) + 10, 'rebar');
      [wx, wx + a].forEach(function (hx) { b += rect(X(hx - 1.8), 40, 3.6 * s, 3.6 * s, 'z-ok faint') + circle(X(hx), 46, 7, 'pt'); });
      b += line(40, Y(dp), W - 20, Y(dp), 'guide') + text(W - 24, Y(dp) - 6, '房間深度 ' + f1(dp) + ' m', 'lbl xs', 'end');
      b += dimH(X(wx), X(wx + a), Y(Math.min(dp, 3.6)) + 26, '間距 ' + f1(a) + ' m', stCls(stOf(r.items, 'along')));
      b += dimH(40, X(wx), 22, '距側牆 ' + f1(wx), stCls(stOf(r.items, 'side')));
      b += text(W / 2, H - 12, '側壁型：牆面二側 1.8m、前方 3.6m 以內（綠色）', 'lbl xs');
      return svg(W, H, b, '側壁型撒水頭平面示意圖');
    }
    var A = isNum(f.a) ? f.a : R * Math.SQRT2, B = isNum(f.b) ? f.b : R * Math.SQRT2;
    var wx2 = isNum(f.wx) ? f.wx : A / 2, wy2 = isNum(f.wy) ? f.wy : B / 2;
    var extX = wx2 + A + A / 2, extY = wy2 + B + B / 2, s2 = Math.min((W - 70) / extX, (H - 60) / extY);
    var X2 = function (m) { return 40 + m * s2; }, Y2 = function (m) { return 30 + m * s2; };
    b += line(40, 30, X2(extX), 30, 'rebar') + line(40, 30, 40, Y2(extY), 'rebar');
    var lay = f.layout || 'grid';
    var heads = lay === 'single' ? [[wx2, wy2]] : lay === 'row' ? [[wx2, wy2], [wx2 + A, wy2]] : [[wx2, wy2], [wx2 + A, wy2], [wx2, wy2 + B], [wx2 + A, wy2 + B]];
    heads.forEach(function (h) { b += circle(X2(h[0]), Y2(h[1]), R * s2, 'guide'); });
    heads.forEach(function (h) { b += circle(X2(h[0]), Y2(h[1]), 7, 'pt'); });
    function far(px, py, hx, hy, key) {
      if (!isNum(px)) return '';
      var st = stCls(stOf(r.items, key));
      return line(X2(px), Y2(py), X2(hx), Y2(hy), 'guide ' + st) + circle(X2(px), Y2(py), 6, 'pt ' + st);
    }
    if (lay === 'grid') {
      if (isNum(f.a) && isNum(f.b)) b += far(wx2 + A / 2, wy2 + B / 2, wx2, wy2, 'cov');
      if (isNum(f.wx)) b += far(0, wy2 + (isNum(f.b) ? B / 2 : 0), wx2, wy2, 'wallX');
      if (isNum(f.wy)) b += far(wx2 + (isNum(f.a) ? A / 2 : 0), 0, wx2, wy2, 'wallY');
    } else if (lay === 'row' && isNum(f.a) && isNum(f.wy)) b += far(wx2 + A / 2, 0, wx2, wy2, 'cov');
    if (isNum(f.wx) && isNum(f.wy)) b += far(0, 0, wx2, wy2, 'corner');
    if (lay !== 'single') b += dimH(X2(wx2), X2(wx2 + A), Y2(wy2 + (lay === 'grid' ? B : 0)) + 30, 'a = ' + f1(A) + ' m');
    if (lay === 'grid') b += dimV(X2(wx2 + A) + 30, Y2(wy2), Y2(wy2 + B), 'b = ' + f1(B) + ' m', '', 'right');
    b += text(W - 14, H - 10, '虛線圓＝半徑 ' + R + ' m；圓點＝最遠點', 'lbl xs', 'end');
    return svg(W, H, b, '撒水頭平面示意圖');
  }

  // 探測器立面
  function detector(r) {
    var f = r.fig, W = 640, H = 230, b = '', s = 2;
    var wallCm = isNum(f.wall) ? Math.min(f.wall, 200) : 90, drop = isNum(f.drop) ? Math.min(f.drop, 80) : 10;
    var xw = 60, yc = 50, xd = xw + 20 + wallCm * s;
    b += rect(xw, 20, W - 80, 30, 'conc') + rect(xw - 20, 20, 20, 190, 'col');
    b += line(xw, yc + f.dropMax * s, W - 30, yc + f.dropMax * s, 'guide') + text(W - 34, yc + f.dropMax * s - 6, '下端限 ' + f.dropMax + 'cm', 'lbl xs', 'end');
    b += line(xd, yc, xd, yc + drop * s - 14, 'rebar thin') + rect(xd - 22, yc + drop * s - 14, 44, 14, 'lapbar ' + stCls(stOf(r.items, 'drop')));
    b += dimV(xd + 40, yc, yc + drop * s, isNum(f.drop) ? '下端 ' + f.drop + ' cm' : '下端（未輸入）', stCls(stOf(r.items, 'drop')), 'right');
    if (!f.heat) b += dimH(xw, xd, 185, isNum(f.wall) ? '距牆或樑 ' + f.wall + ' cm（≥ 60）' : '距牆或樑（未輸入）', stCls(stOf(r.items, 'wall')));
    if (isNum(f.need)) b += text(W - 30, 215, '至少 ' + f.need + ' 個，實設 ' + (isNum(f.n) ? f.n : '—') + ' 個', 'lbl sm ' + stCls(stOf(r.items, 'count')), 'end');
    return svg(W, H, b, '探測器立面示意圖');
  }

  var S = SC.svg;
  S.conduit = conduit; S.gauge = gauge; S.bands = bands; S.sprinkler = sprinkler; S.detector = detector;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof globalThis !== 'undefined' ? globalThis : this);

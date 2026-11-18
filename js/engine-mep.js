/* 機電判定核心：只做計算，不碰畫面。回傳格式同 engine.js：{ items, overall, derived, fig }。
 * 法規限值為絕對值，不套用 RC04-7 或 ±5% 許可差；無障礙規範定值尺寸依 103.1 誤差 ≤ 3%。
 */
(function (root) {
  'use strict';
  var SC = root.SC = root.SC || {};
  var M = SC.data.MEP, H = SC.engine._h;
  var isNum = H.isNum, mk = H.mk, minItem = H.minItem, maxItem = H.maxItem, boolItem = H.boolItem, infoItem = H.infoItem, result = H.result, EPS = H.EPS;
  function r1(x) { return Math.round(x * 10) / 10; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function wireById(id) { return M.WIRES.filter(function (w) { return w.id === id; })[0]; }
  var NO_TOL = '法規限值，不套用許可差';

  // ---------- 導線管佔積率（用電規則第 328、343 條）----------
  // 判定方式（使用者 2026-11-18 決定「以查表為準」）：
  //   線徑相同 → 第 1 款查表（管長 6m 以下另可依第 2 款）；表本身不適用時（金屬管單條、非金屬管超過 100mm、
  //   22mm² 以上超過 9 條）才依第 4 款表三二八～八。線徑不同 → 第 3 款 40%。含電纜 → 第 4 款。
  //   查表結果為「表列管徑皆不足」或「此管徑未列（較表列小）」者判不合格，不再以表三二八～八放寬。
  function cableRoute(C, s, A, N, why) {
    var full = s[0] / 0.4, pct = M.cablePct(N), lim = pct * full;
    return { id: 't4', name: (why ? why + '，' : '') + '依表三二八～八（' + (N <= 2 ? N + ' 條' : '超過 2 條') + ' ' + Math.round(pct * 100) + '%）', ok: A <= lim + EPS,
      text: '佔積率 ' + r1(A / full * 100) + '%' + (A <= lim + EPS ? ' ≤ ' : ' > ') + Math.round(pct * 100) + '%', basis: C.art + '第 4 款、表三二八～八' };
  }
  function conduitRoutes(C, size, rows, A, N, sameW, hasCable, short) {
    var s = C.sizes[size], routes = [];
    if (!s) return routes;
    if (sameW) {
      var row = sameW.row;
      if (N <= 9) {
        var col = C.minSize[N], min = col ? col[row] : undefined, n1 = '線徑相同、' + N + ' 條：查' + C.tMin;
        if (!col) routes.push(cableRoute(C, s, A, N, C.tMin + '未列 ' + N + ' 條'));
        else if (min !== undefined) routes.push({ id: 't1', name: n1, ok: size >= min, text: '最小管徑 ' + min + ' mm', basis: C.art + '第 1 款、' + C.tMin });
        else if (C.overflowTo88) routes.push(cableRoute(C, s, A, N, C.tMin + '超出表列（' + C.overflowNote + '）'));
        else routes.push({ id: 't1', name: n1, ok: false, text: '表列最大管徑仍不足', basis: C.art + '第 1 款、' + C.tMin });
      } else {
        var arr = C.maxCount[size], mx = arr ? arr[row] : undefined, n2 = '線徑相同、超過 9 條：查' + C.tMax;
        var coverRows = Math.max.apply(null, Object.keys(C.maxCount).map(function (k) { return C.maxCount[k].length; }));
        var maxListed = Math.max.apply(null, Object.keys(C.maxCount).map(Number));
        if (row >= coverRows) routes.push(cableRoute(C, s, A, N, C.tMax + '未列此線徑'));
        else if (mx !== undefined) routes.push({ id: 't1', name: n2, ok: N <= mx, text: '此管徑最多 ' + mx + ' 條', basis: C.art + '第 1 款、' + C.tMax });
        else if (size > maxListed && C.overflowTo88) routes.push(cableRoute(C, s, A, N, C.tMax + '超出表列（' + C.overflowNote + '）'));
        else routes.push({ id: 't1', name: n2, ok: false, text: '表未列此管徑（管徑不足）', basis: C.art + '第 1 款、' + C.tMax });
      }
      if (short === true) {
        var sm = row <= 3 && C.shortMax[size] ? C.shortMax[size][row] : undefined;
        if (sm !== undefined) routes.push({ id: 't2', name: '管長 6m 以下、線徑相同：查' + C.tShort, ok: N <= sm, text: '此管徑最多 ' + sm + ' 條', basis: C.art + '第 2 款、' + C.tShort });
        // 8mm² 以下而表未列此管徑者，不另套 60%（附表註：60% 欄適用於表未列之 14mm² 以上導線）
        else if (row <= 3) routes.push({ id: 't2', name: '管長 6m 以下、線徑相同：查' + C.tShort, ok: null, text: '表未列此管徑', basis: C.art + '第 2 款、' + C.tShort });
        else routes.push({ id: 't2', name: '管長 6m 以下、線徑相同：截面積 60%', ok: A <= s[1] + EPS, text: '總和 ' + r1(A) + (A <= s[1] + EPS ? ' ≤ ' : ' > ') + s[1] + ' mm²（' + C.tArea + ' 60% 欄）', basis: C.art + '第 2 款、' + C.tArea });
      }
    } else if (!hasCable) {
      routes.push({ id: 't3', name: '線徑不同：截面積 40%', ok: A <= s[0] + EPS, text: '總和 ' + r1(A) + (A <= s[0] + EPS ? ' ≤ ' : ' > ') + s[0] + ' mm²（' + C.tArea + ' 40% 欄）', basis: C.art + '第 3 款、表三二八～五、' + C.tArea });
    } else {
      routes.push(cableRoute(C, s, A, N, '含電纜'));
    }
    return routes;
  }
  function conduitFill(i) {
    var C = M.CONDUITS[i.ctype], items = [];
    if (!C) throw new Error('未知導線管種類');
    // 每一列都必須完整：條數未填、非正整數或電纜未填外徑者，整體維持待輸入（不可略過該列而判合格）
    var rows = (i.wires || []).map(function (w, k) {
      var n = isNum(w.n) ? w.n : NaN;
      if (w.w === 'cable') return { k: k + 1, cable: true, n: n, od: w.od, area: isNum(w.od) && w.od > 0 ? Math.PI * w.od * w.od / 4 : NaN, label: '電纜 外徑 ' + w.od + ' mm' };
      var ww = wireById(w.w);
      return ww ? { k: k + 1, id: ww.id, row: ww.row, n: n, area: ww.area, label: ww.label } : { k: k + 1, n: n, area: NaN };
    });
    var bad = rows.filter(function (r) { return !isNum(r.n) || r.n <= 0 || Math.floor(r.n) !== r.n || !isNum(r.area); });
    if (!rows.length || bad.length) {
      items.push(mk({ key: 'fill', label: '導線管佔積率', status: 'na', unit: '',
        note: rows.length ? '第 ' + bad.map(function (r) { return r.k; }).join('、') + ' 列不完整：條數須為正整數，電纜須填外徑（不用的列請刪除）' : '請輸入管內導線（線徑、條數）' }));
      return result(items, {}, {});
    }
    var A = rows.reduce(function (s, r) { return s + r.n * r.area; }, 0);
    var N = rows.reduce(function (s, r) { return s + r.n; }, 0);
    var hasCable = rows.some(function (r) { return r.cable; });
    var sameW = !hasCable && rows.every(function (r) { return r.id === rows[0].id; }) ? wireById(rows[0].id) : null;
    var size = i.size, s = C.sizes[size];
    if (!s) return result([mk({ key: 'fill', label: '導線管佔積率', status: 'na', unit: '', note: '請選擇導線管管徑' })], {}, {});
    var full = s[0] / 0.4;
    var routes = conduitRoutes(C, size, rows, A, N, sameW, hasCable, i.short);
    var anyOk = routes.some(function (r) { return r.ok === true; }), anyKnown = routes.some(function (r) { return r.ok !== null; });
    // 最小可用管徑：同一導線組合，依管徑由小到大找第一個符合者
    var minOK = null;
    Object.keys(C.sizes).map(Number).sort(function (a, b) { return a - b; }).some(function (sz) {
      var rr = conduitRoutes(C, sz, rows, A, N, sameW, hasCable, i.short);
      if (rr.some(function (r) { return r.ok === true; })) { minOK = sz; return true; }
      return false;
    });
    items.push(mk({ key: 'fill', label: '導線管管徑（佔積率）', measured: size + ' mm', required: minOK ? minOK + ' mm 以上' : '本管種最大管徑仍不足', unit: '', op: '',
      status: anyOk ? 'pass' : anyKnown ? 'fail' : 'na', basis: '用電規則' + C.art + '（線徑相同以查表為準；管長 6m 以下得依第 2 款）', tolNote: NO_TOL,
      note: '共 ' + N + ' 條，截面積總和 ' + r1(A) + ' mm²，佔積率 ' + r1(A / full * 100) + '%' + (sameW ? '（線徑相同）' : hasCable ? '（含電纜，依第 4 款）' : '（線徑不同）') }));
    routes.forEach(function (r) {
      items.push(infoItem('r_' + r.id, r.name, (r.ok === true ? '✔ 符合　' : r.ok === false ? '✖ 不符合　' : '— ') + r.text, '用電規則' + r.basis));
    });
    if (sameW && i.short !== true && sameW.row <= 3) items.push(infoItem('shortHint', '管長 6m 以下', '若管長 6m 以下無顯著彎曲、導線容易更換，可改選「是」再判定（第 2 款較寬鬆）'));
    items.push(infoItem('ground', '計入導線', '被接地導線、設備接地導線及搭接導線均應計入，以外徑截面積計算；多芯電纜當作 1 條', '表三二八～八 註2、註3'));
    var fillPct = A / full * 100;
    return result(items, { A: A, N: N, full: full, minOK: minOK, routes: routes },
      { size: size, full: full, A: r1(A), N: N, fillPct: fillPct, rows: rows, st: items[0].status, marks: [31, 40, 53, 60] });
  }

  // ---------- 接地電阻（用電規則第 92 條表九二、第 88 條表八八～二、第 966 條）----------
  function groundRes(i) {
    var items = [], g = M.GROUND.filter(function (x) { return x.id === i.kind; })[0];
    if (!g) throw new Error('請選擇接地種類');
    var max = g.max, basis = g.id === 'arrester' ? '用電規則第 966 條（避雷器 10Ω 以下）' : '用電規則第 92 條、表九二', note = '';
    if (g.id === 'third') {
      var t = M.GROUND_THIRD.filter(function (x) { return x.id === i.third; })[0];
      max = t ? t.max : NaN; if (t) basis += '（第三種，' + t.label + '）';
      if (i.elcb && isNum(i.mA) && M.ELCB[i.mA]) {
        var e = M.ELCB[i.mA][i.wet ? 0 : 1];
        note = '裝設漏電斷路器 ' + i.mA + 'mA（' + (i.wet ? '潮濕場所' : '其他場所') + '）：表八八～二 ' + e + 'Ω；表九二 ' + max + 'Ω，取寬者';
        if (e > max) { max = e; basis = '用電規則表九二 註1、第 88 條、表八八～二'; }
      }
    }
    items.push(mk({ key: 'r', label: '接地電阻', measured: i.measured, required: max, unit: 'Ω', op: '≤', status: H.isNum(i.measured) && isNum(max) ? (i.measured <= max + EPS ? 'pass' : 'fail') : 'na', basis: basis, tolNote: NO_TOL, note: note }));
    if (g.id === 'third' && i.elcb) items.push(infoItem('elcb', '漏電斷路器', '以防範感電為目的者應採高靈敏度高速型；外殼另施接地且接地電阻未超過表八八～二、動作時間 0.1 秒以內者，得採中靈敏度型', '用電規則第 88 條第 2 款'));
    return result(items, { max: max }, { m: i.measured, lo: 0, hi: max, unit: 'Ω', label: '接地電阻', st: items[0].status });
  }

  // ---------- 絕緣電阻（用電規則第 10 條、表一○）----------
  function insulation(i) {
    var items = [], c = M.INSUL.filter(function (x) { return x.id === i.circuit; })[0];
    if (!c) throw new Error('請選擇電路電壓');
    if (i.method === 'leak') {
      items.push(maxItem('leak', '洩漏電流', i.measured, M.LEAK_MAX, 0, '用電規則第 10 條第 1 款、表一○（1.0mA 以下）', '', ''));
      items[0].unit = 'mA'; items[0].tolNote = NO_TOL;
      // 新設線路須另以絕緣電阻計確認 1MΩ 以上；只有洩漏電流時整體維持待查驗，不宣告合格
      if (i.isNew) items.push(mk({ key: 'newLine', label: '新設線路絕緣電阻（1MΩ 以上）', status: 'na', unit: '', basis: '用電規則第 10 條第 4 款', tolNote: NO_TOL, note: '洩漏電流不能取代；請改選「絕緣電阻計」量測' }));
      return result(items, {}, { m: i.measured, lo: 0, hi: M.LEAK_MAX, unit: 'mA', label: '洩漏電流', st: items[0].status });
    }
    var req = i.isNew ? Math.max(M.INSUL_NEW, c.mohm) : c.mohm;
    var it = minItem('ir', '絕緣電阻', i.measured, req, 0, i.isNew ? '用電規則第 10 條第 4 款（新設線路 1MΩ 以上）' : '用電規則第 10 條第 1 款、表一○（' + c.label + '）', '', i.isNew ? '既設線路定期測定時之下限為 ' + c.mohm + 'MΩ（表一○）' : '');
    it.unit = 'MΩ'; it.tolNote = NO_TOL;
    items.push(it);
    items.push(infoItem('meter', '量測儀器', '絕緣電阻計額定電壓 500V；220V 以下電路得用 250V', '用電規則第 10 條第 6 款'));
    items.push(infoItem('how', '量測方式', '導線間應隔離用電器具內之電路；導線與大地間為用電器具在使用狀態下量測', '用電規則第 10 條第 2、3 款'));
    return result(items, { req: req }, { m: i.measured, lo: req, hi: Infinity, unit: 'MΩ', label: '絕緣電阻', st: it.status });
  }

  // ---------- 撒水頭（消防標準第 46～48 條）----------
  function sprinkler(i) {
    var items = [], fig = { type: i.type, a: i.a, b: i.b, wx: i.wx, wy: i.wy, depth: i.depth };
    function m(it, unit) { it.unit = unit; it.tolNote = NO_TOL; return it; }
    function r3(x) { return Math.round(x * 1000) / 1000; }
    // 超出限值時標示超出量（避免顯示四捨五入後與限值相同卻判不合格）
    function over(v, max, unit) { return isNum(v) && v > max + EPS ? '，超出 ' + Number((v - max).toPrecision(2)) + ' ' + unit : ''; }
    // 距離以未四捨五入之值判定；畫面另附計算值（3 位小數）
    function dist(key, label, v, max, basis, note) {
      var it = m(maxItem(key, label, v, max, 0, basis, '', (note ? note + '；' : '') + (isNum(v) ? '計算值 ' + r3(v) + ' m' + over(v, max, 'm') : '')), 'm');
      return it;
    }
    // 型式適用場所（第 46 條第 1 項第 4、5 款）：小區劃型限住宿居室、病房等；側壁型限其居室及走廊、通道；兩者限第一種感度
    if (i.type === 'small' || i.type === 'side') {
      var okPlace = i.type === 'small' ? i.place === 'lodging' : (i.place === 'lodging' || i.place === 'corridor');
      items.push(boolItem('placeOk', (i.type === 'small' ? '小區劃型' : '側壁型') + '撒水頭適用場所', okPlace, '消防標準第 46 條第 1 項第 ' + (i.type === 'small' ? '4' : '5') + ' 款',
        '限第 12 條第 1 款第 3、6 目、第 2 款第 7 目、第 5 款第 1 目等場所之住宿居室、病房及類似處所' + (i.type === 'side' ? '，及其走廊、通道' : ''),
        (SC.data.MEP.SPRINKLER_PLACES.filter(function (x) { return x.id === i.place; })[0] || { label: '—' }).label, '所列處所'));
      items.push(boolItem('sens1', '撒水頭為第一種感度', i.sens1 === true ? true : i.sens1 === false ? false : null, '消防標準第 46 條第 1 項第 ' + (i.type === 'small' ? '4' : '5') + ' 款（以第一種感度為限）', '', i.sens1 ? '第一種' : i.sens1 === false ? '非第一種' : '—', '第一種'));
    }
    function pos(x) { return isNum(x) && x > 0; }
    function nonneg(x) { return isNum(x) && x >= 0; }
    function badDim(key, label, unit) { return mk({ key: key, label: label, status: 'na', unit: unit || 'm', note: '數值須大於 0（距牆可為 0）' }); }
    if (i.type === 'side') {
      var B = '消防標準第 46 條第 1 項第 5 款';
      fig.r = 1.8;
      if (i.sideOne) {
        // 單支：以撒水頭至兩側牆之較遠者檢核
        items.push(nonneg(i.wx) ? dist('side', '撒水頭至兩側牆（較遠者）', i.wx, 1.8, B + '（牆面二側 1.8m 以下）') : isNum(i.wx) ? badDim('side', '撒水頭至兩側牆（較遠者）') : mk({ key: 'side', label: '撒水頭至兩側牆（較遠者）', status: 'na', unit: 'm', basis: B, note: '請輸入撒水頭至較遠側牆距離' }));
      } else {
        items.push(pos(i.a) ? dist('along', '沿牆至最遠點（撒水頭間距 / 2）', i.a / 2, 1.8, B + '（牆面二側 1.8m 以下）') : isNum(i.a) ? badDim('along', '沿牆撒水頭間距')
          : mk({ key: 'along', label: '沿牆撒水頭間距', status: 'na', unit: 'm', basis: B, note: '請輸入沿牆撒水頭間距' }));
        items.push(nonneg(i.wx) ? dist('side', '端部撒水頭至側牆', i.wx, 1.8, B) : isNum(i.wx) ? badDim('side', '端部撒水頭至側牆') : mk({ key: 'side', label: '端部撒水頭至側牆', status: 'na', unit: 'm', basis: B, note: '請輸入端部撒水頭至側牆距離' }));
      }
      items.push(pos(i.depth) || !isNum(i.depth) ? dist('depth', '牆壁前方至撒水頭（房間深度）', i.depth, 3.6, B + '（前方 3.6m 以下）') : badDim('depth', '房間深度'));
      items.push(m(maxItem('wall', '撒水頭與裝置面（牆壁）間距', i.wallDist, 15, 0, '消防標準第 47 條第 1 項第 7 款第 1 目', ''), 'cm'));
      items.push(m(maxItem('ceil', '迴水板與天花板或樓板間距', i.ceilDist, 15, 0, '消防標準第 47 條第 1 項第 7 款第 2 目', ''), 'cm'));
      items.push(boolItem('clear', '迴水板下方及水平方向 45cm 內淨空', i.clear === null || i.clear === undefined ? null : i.clear, '消防標準第 47 條第 1 項第 7 款第 3 目', '', i.clear ? '淨空' : i.clear === false ? '有障礙物' : '—', '淨空'));
    } else {
      var R = SC.data.MEP.sprinklerRadius(i.place, i.type, i.fireproof);
      fig.r = R.r;
      // edge：true＝牆邊、牆角必檢（表單預設）；false＝僅中間區域（整體不得顯示合格）；未指定（直接呼叫引擎）＝有填牆距才檢核
      var a = i.a, b = i.b, lay = i.layout || 'grid', edge = i.edge === true, edgeOpt = i.edge !== true && i.edge !== false;
      fig.layout = lay;
      function need(key, label, note) { return mk({ key: key, label: label, status: 'na', unit: 'm', required: R.r, op: '≤', basis: R.basis, note: note }); }
      function cnt(x) { return isNum(x) && x >= 1 && Math.floor(x) === x; }
      // 已填但無效（0、負數、小數）的支數或房間尺寸：列待輸入，不當成未填
      function badCount(x) { return isNum(x) && !cnt(x); }
      if ((isNum(i.wx) && i.wx < 0) || (isNum(i.wy) && i.wy < 0)) items.push(badDim('wallNeg', '撒水頭至牆距離'));
      ['nx', 'ny', 'n'].forEach(function (k) { if (badCount(i[k])) items.push(mk({ key: 'badCount', label: '撒水頭支數', status: 'na', unit: '', note: '支數須為正整數（' + i[k] + ' 無效）' })); });
      ['roomL', 'roomW', 'roomArea'].forEach(function (k) { if (isNum(i[k]) && !(i[k] > 0)) items.push(badDim('badRoom', '房間尺寸', k === 'roomArea' ? 'm²' : 'm')); });
      // 房間尺寸與「至較遠牆距離」須一致：較遠牆距介於房間尺寸的一半與全長之間（同一組資料推導覆蓋與防護面積）
      function consist(far, len, what) {
        if (!isNum(far) || !pos(len)) return;
        if (far < len / 2 - EPS || far > len + EPS) items.push(mk({ key: 'consist', label: '量測資料矛盾', status: 'na', unit: '', note: what + '：至較遠牆距離 ' + far + ' m 應介於房間尺寸一半（' + r3(len / 2) + ' m）與全長（' + len + ' m）之間' }));
      }
      if (lay === 'grid') {
        if ((isNum(a) && !pos(a)) || (isNum(b) && !pos(b))) items.push(badDim('cov', '撒水頭間距'));
        else items.push(isNum(a) && isNum(b) ? dist('cov', '格網中心至撒水頭距離', Math.sqrt(a * a + b * b) / 2, R.r, R.basis, '間距 ' + a + ' × ' + b + ' m；正方形配置最大間距 ' + r2(R.r * Math.SQRT2) + ' m')
          : need('cov', '格網中心至撒水頭距離', '請輸入兩向撒水頭間距 a、b'));
        if (edge) {
          items.push(isNum(i.wx) && isNum(b) ? dist('wallX', '牆邊最遠點至撒水頭（左右牆）', Math.sqrt(i.wx * i.wx + b * b / 4), R.r, R.basis, '撒水頭距牆 ' + i.wx + ' m') : need('wallX', '牆邊最遠點至撒水頭（左右牆）', '請輸入最外側撒水頭距左右牆及間距 b'));
          items.push(isNum(i.wy) && isNum(a) ? dist('wallY', '牆邊最遠點至撒水頭（前後牆）', Math.sqrt(i.wy * i.wy + a * a / 4), R.r, R.basis, '撒水頭距牆 ' + i.wy + ' m') : need('wallY', '牆邊最遠點至撒水頭（前後牆）', '請輸入最外側撒水頭距前後牆及間距 a'));
          items.push(isNum(i.wx) && isNum(i.wy) ? dist('corner', '牆角至撒水頭', Math.sqrt(i.wx * i.wx + i.wy * i.wy), R.r, R.basis) : need('corner', '牆角至撒水頭', '請輸入距左右牆及前後牆距離'));
        } else if (edgeOpt) {
          if (isNum(i.wx)) items.push(dist('wallX', '牆邊最遠點至撒水頭（左右牆）', isNum(b) ? Math.sqrt(i.wx * i.wx + b * b / 4) : i.wx, R.r, R.basis, '撒水頭距牆 ' + i.wx + ' m'));
          if (isNum(i.wy)) items.push(dist('wallY', '牆邊最遠點至撒水頭（前後牆）', isNum(a) ? Math.sqrt(i.wy * i.wy + a * a / 4) : i.wy, R.r, R.basis, '撒水頭距牆 ' + i.wy + ' m'));
          if (isNum(i.wx) && isNum(i.wy)) items.push(dist('corner', '牆角至撒水頭', Math.sqrt(i.wx * i.wx + i.wy * i.wy), R.r, R.basis));
          else items.push(mk({ key: 'edgeUnchecked', label: '牆邊、牆角未檢核', status: 'na', unit: '', basis: R.basis, note: '未填撒水頭至左右、前後牆距離，牆邊與牆角未檢核' }));
        } else items.push(mk({ key: 'edgeUnchecked', label: '牆邊、牆角未檢核', status: 'na', unit: '', basis: R.basis, note: '僅檢核中間區域；第 46 條要求任一點均須符合，牆邊、牆角另行檢核前不判定整體合格' }));
      } else if (lay === 'row') {
        // 單排：沿排間距 a、支數 n；撒水頭至兩側牆取較遠者 wy；端部撒水頭至端牆（較遠者）wx
        if (isNum(a) && !pos(a)) items.push(badDim('cov', '沿排間距'));
        else items.push(isNum(a) && isNum(i.wy) ? dist('cov', '兩撒水頭中點之側牆處至撒水頭', Math.sqrt(a * a / 4 + i.wy * i.wy), R.r, R.basis, '沿排間距 ' + a + ' m、距側牆 ' + i.wy + ' m') : need('cov', '兩撒水頭中點之側牆處至撒水頭', '請輸入沿排間距 a 及撒水頭至側牆（較遠側）'));
        items.push(isNum(i.wx) && isNum(i.wy) ? dist('corner', '端部牆角至撒水頭', Math.sqrt(i.wx * i.wx + i.wy * i.wy), R.r, R.basis) : need('corner', '端部牆角至撒水頭', '請輸入端部撒水頭至端牆及至側牆距離'));
        consist(i.wy, i.roomW, '房間寬度');
      } else {
        // 單支：至最遠牆角
        items.push(isNum(i.wx) && isNum(i.wy) ? dist('corner', '最遠牆角至撒水頭', Math.sqrt(i.wx * i.wx + i.wy * i.wy), R.r, R.basis, '取撒水頭至兩向較遠牆面之距離') : need('corner', '最遠牆角至撒水頭', '請輸入撒水頭至兩向較遠牆面距離'));
        consist(i.wx, i.roomL, '房間長度'); consist(i.wy, i.roomW, '房間寬度');
      }
      if (i.type === 'small') {
        var B4 = '消防標準第 46 條第 1 項第 4 款';
        var under = function (v, req) { return isNum(v) && v < req - EPS ? '不足 ' + Number((req - v).toPrecision(2)) + ' m' : ''; };
        if (lay !== 'single' && pos(a)) items.push(m(minItem('sa', '撒水頭間距（左右／沿排）', a, 3, 0, B4 + '（間距 3m 以上）', '', under(a, 3)), 'm'));
        if (lay === 'grid' && pos(b)) items.push(m(minItem('sb', '撒水頭間距（前後）', b, 3, 0, B4, '', under(b, 3)), 'm'));
        // 每支最大防護面積（13m² 以下）：有填支數時只計實際存在的位置（邊列、中間列）；未填支數時保守地一併計入中間撒水頭
        var area = NaN, how = '';
        if (lay === 'grid') {
          var kx = cnt(i.nx), ky = cnt(i.ny), known = kx && ky;
          if (!(pos(a) && pos(b))) how = '請輸入兩向撒水頭間距';
          else if (badCount(i.nx) || badCount(i.ny)) how = '支數須為正整數';
          else if ((kx && i.nx < 2) || (ky && i.ny < 2)) how = '格網兩向各須 2 支以上（只有一排請改選單排）';
          else {
            var cols = [], rows = [];
            if (edge || (edgeOpt && nonneg(i.wx) && nonneg(i.wy))) {
              if (nonneg(i.wx) && nonneg(i.wy)) { cols.push(i.wx + a / 2); rows.push(i.wy + b / 2); }
              else how = '請輸入最外側撒水頭距左右牆、前後牆距離';
            }
            if (!how) {
              if (!kx || i.nx >= 3) cols.push(a);
              if (!ky || i.ny >= 3) rows.push(b);
              if (cols.length && rows.length) {
                area = Math.max.apply(null, cols) * Math.max.apply(null, rows);
                how = '每支最大寬 ' + r3(Math.max.apply(null, cols)) + ' × 深 ' + r3(Math.max.apply(null, rows)) + ' = ' + r3(area) + (known ? '' : '（未填支數，含中間撒水頭保守計算）');
              } else how = '僅中間區域且無中間撒水頭，防護面積未檢核';
            }
          }
        } else if (lay === 'row') {
          var nKnown = cnt(i.n);
          if (badCount(i.n)) how = '支數須為正整數';
          else if (!(pos(a) && nonneg(i.wx) && pos(i.roomW))) how = '請輸入沿排間距、端部至端牆距離及房間寬度';
          else if (nKnown && i.n < 2) how = '單排須 2 支以上（只有一支請改選單支）';
          else {
            var shares = [i.wx + a / 2]; if (!nKnown || i.n >= 3) shares.push(a);
            area = Math.max.apply(null, shares) * i.roomW; how = '沿排最大分擔 ' + r3(Math.max.apply(null, shares)) + ' × 房寬 ' + i.roomW + ' = ' + r3(area) + (nKnown ? '' : '（未填支數，含中間撒水頭保守計算）');
          }
        } else {
          if (pos(i.roomL) && pos(i.roomW)) {
            area = i.roomL * i.roomW; how = '單支防護整間 ' + i.roomL + ' × ' + i.roomW + ' = ' + r3(area);
            if (pos(i.roomArea) && Math.abs(i.roomArea - area) > 0.02 * area + EPS) {
              items.push(mk({ key: 'consist', label: '量測資料矛盾', status: 'na', unit: '', note: '房間長寬乘積 ' + r3(area) + ' m² 與所填面積 ' + r3(i.roomArea) + ' m² 不符（取較大者判定）' }));
              area = Math.max(area, i.roomArea); how += '；所填面積 ' + r3(i.roomArea) + '，取較大者';
            }
          }
          else if (pos(i.roomArea)) {
            area = i.roomArea; how = '單支防護整間 ' + r3(area);
            // 以至較遠牆距離推得房間面積範圍：wx·wy ～ 4·wx·wy；超出即資料矛盾
            if (nonneg(i.wx) && nonneg(i.wy) && (area > 4 * i.wx * i.wy + EPS || area < i.wx * i.wy - EPS))
              items.push(mk({ key: 'consist', label: '量測資料矛盾', status: 'na', unit: '', note: '房間面積 ' + r3(area) + ' m² 與撒水頭至較遠牆距離不符（應介於 ' + r3(i.wx * i.wy) + '～' + r3(4 * i.wx * i.wy) + ' m²）' }));
          }
          else how = '請輸入房間長度、寬度';
        }
        items.push(isNum(area) ? m(maxItem('area', '每支撒水頭最大防護面積', area, 13, 0, B4 + '（13m² 以下）', '', '計算值 ' + how + ' m²' + over(area, 13, 'm²')), 'm²')
          : mk({ key: 'area', label: '每支撒水頭最大防護面積', status: 'na', unit: 'm²', basis: B4 + '（13m² 以下）', note: how }));
      }
      // 位置（密閉式）
      if (i.mount === 'beam') {
        items.push(m(maxItem('dBeam', '迴水板與樑底間距', i.dBeam, 10, 0, '消防標準第 47 條第 1 項第 4 款', ''), 'cm'));
        items.push(m(maxItem('dSlab', '迴水板與樓板或天花板間距', i.dSlab, 50, 0, '消防標準第 47 條第 1 項第 4 款', ''), 'cm'));
      } else {
        items.push(m(maxItem('d1', '迴水板距裝置面（樓板或天花板）', i.d1, 30, 0, '消防標準第 47 條第 1 項第 3 款', ''), 'cm'));
      }
      if (isNum(i.sideDist)) {
        var smax = SC.data.MEP.sideBeamMax(i.sideDist);
        items.push(m(maxItem('sideRise', '迴水板高出樑底面', i.sideRise, smax, 0, '消防標準第 47 條第 1 項第 8 款（與樑側面淨距 ' + i.sideDist + 'cm → ' + (smax ? smax + 'cm 以下' : '不得高出，即零') + '）', '', '迴水板在樑底以下者填 0 或負值'), 'cm'));
        var dc = i.mount === 'beam' ? i.dSlab : i.d1;
        if (isNum(dc) && dc > 30) items.push(boolItem('guard', '防護板（迴水板距天花板超過 30cm）', i.guard === null || i.guard === undefined ? null : i.guard, '消防標準第 47 條第 2 項', '金屬材料、直徑 30cm 以上，與迴水板距離 30cm 以下', i.guard ? '已設置' : i.guard === false ? '未設置' : '—', '應設置'));
      }
      items.push(boolItem('clear', '迴水板下方 45cm、水平 30cm 內淨空', i.clear === null || i.clear === undefined ? null : i.clear, '消防標準第 47 條第 1 項第 2 款', '', i.clear ? '淨空' : i.clear === false ? '有障礙物' : '—', '淨空'));
      items.push(infoItem('zone', '區劃與障礙物', '裝置面四周以淨高 40cm 以上之樑區劃者按各區劃裝置（樑間距 180cm 以下者不在此限）；風管等障礙物寬度超過 120cm 者，其下方亦應設置', '消防標準第 47 條第 1 項第 5、6 款'));
    }
    if (isNum(i.ambient) && isNum(i.marked)) {
      var T = SC.data.MEP.sprinklerTemp(i.ambient);
      items.push(boolItem('temp', '標示溫度（周圍最高 ' + i.ambient + '°C）', i.marked >= T.lo - EPS && i.marked < T.hi, '消防標準第 48 條', '', i.marked + '°C', T.text));
    }
    return result(items, {}, fig);
  }

  // ---------- 探測器（消防標準第 114～122 條）----------
  function detector(i) {
    var items = [], T = M.DETECTOR_TYPES.filter(function (x) { return x.id === i.dtype; })[0];
    if (!T) throw new Error('請選擇探測器種類');
    var cls = i.cls, clsLabel = (T.classes.filter(function (c) { return c[0] === cls; })[0] || ['', ''])[1], Hh = i.H;
    function m(it, unit) { it.unit = unit; it.tolNote = NO_TOL; return it; }
    var ok = M.detectorAllowed(i.dtype, cls, Hh);
    items.push(boolItem('height', '裝置面高度適用（' + T.label + clsLabel + '）', ok, '消防標準第 114 條' + (isNum(Hh) && Hh >= 20 ? '；第 116 條第 1 款（超過 20m 除火焰式外得免設）' : ''), '高度不同時以平均高度計', isNum(Hh) ? Hh + ' m' : '—', ok === false ? '不適用此高度' : '適用'));
    // 選型（第 117、118 條）：先判斷場所可否使用此種探測器，再檢查高度、數量及位置
    var LOC = { room: '居室等', corridor: '走廊、通道', stair: '樓梯、斜坡通道', shaft: '昇降機坑道、管道間' };
    if (T.heat) {
      var must = i.loc === 'stair' || i.loc === 'shaft' || i.must118 === true;
      items.push(boolItem('select', '設置場所可用熱式探測器', i.must118 === null || i.must118 === undefined ? (must ? false : null) : !must,
        '消防標準第 118 條', '下列場所應就偵煙式、熱煙複合式或火焰式選設：樓梯或斜坡通道（偵煙式）；昇降機坑道或配管配線管道間（偵煙式）；天花板等高度 15m 以上未滿 20m（偵煙式、火焰式）；超過 20m（火焰式）；供第 12 條第 1 款、第 2 款第 2 目、第 6～10 目、第 4 款及第 5 款使用之走廊或通道；供第 12 條第 1 款、第 2 款第 2 目、第 6 目、第 8～10 目及第 5 款使用之地下層、無開口樓層及 11 層以上樓層',
        LOC[i.loc] || '—', '非第 118 條所列場所'));
    }
    // 第 117 條：特殊環境（可複選；未勾選＝尚未確認）。偵煙式不得設於所列環境；熱式依附表判定每一項環境，所需性能逐項確認
    var envs = Array.isArray(i.env117) ? i.env117.slice() : i.env117 ? [i.env117] : i.bad117 === true ? ['other'] : i.bad117 === false ? ['none'] : [];
    var envLabel = envs.map(function (e) { return (M.ENV117.filter(function (x) { return x[0] === e; })[0] || ['', e])[1]; }).join('、') || '—';
    var B117 = '消防標準第 117 條及附表';
    if (!envs.length) items.push(mk({ key: T.heat ? 'env117' : 'select', label: '設置環境（第 117 條）', status: 'na', unit: '', basis: B117, note: '請確認設置環境（可複選；無特殊環境請選「確認無下列情形」）' }));
    else if (envs.indexOf('none') >= 0 && envs.length > 1) items.push(mk({ key: T.heat ? 'env117' : 'select', label: '設置環境（第 117 條）', status: 'na', unit: '', basis: B117, note: '「確認無下列情形」不可與其他環境同時勾選' }));
    else if (!T.heat) {
      items.push(boolItem('select', '設置環境可用偵煙式探測器', envs[0] === 'none', '消防標準第 117 條第 1 項',
        '偵煙式或熱煙複合式局限型不得設於：一、塵埃、粉末或水蒸氣會大量滯留；二、會散發腐蝕性氣體；三、廚房及其他平時煙會滯留；四、顯著高溫；五、排放廢氣會大量滯留；六、煙會大量流入；七、會結露；八、設有用火設備其火焰外露；九、其他對探測器機能會造成障礙之場所',
        envLabel, '無第 117 條所列情形'));
    } else if (envs[0] === 'none') {
      items.push(boolItem('env117', '設置環境（第 117 條）', true, B117, '', envLabel, '無特殊環境'));
    } else {
      var allowList = M.ALLOW117[i.dtype + '-' + cls] || [];
      var listed = envs.filter(function (e) { return e !== 'other'; }), bad = listed.filter(function (e) { return allowList.indexOf(e) < 0; });
      if (listed.length) items.push(boolItem('env117', '設置環境可選設此探測器（第 117 條附表）', bad.length === 0, B117,
        bad.length ? '附表未列為可選設：' + bad.map(function (e) { return (M.ENV117.filter(function (x) { return x[0] === e; })[0] || ['', e])[1]; }).join('、') : '每一項環境均須為附表可選設', envLabel, T.label + clsLabel + ' 可選設'));
      if (envs.indexOf('other') >= 0) items.push(mk({ key: 'envOther', label: '其他妨礙探測器機能之環境', status: 'na', unit: '', basis: B117, note: '附表未列之情形，請依實際狀況與消防設計確認選型' }));
      M.perfNeeds(i.dtype, cls, listed).forEach(function (k) {
        var v = i['perf_' + k];
        items.push(boolItem('perf_' + k, M.PERF117[k], v === true ? true : v === false ? false : null, B117, '', v === true ? '具備' : v === false ? '不具備' : '—', '具備'));
      });
    }
    if (T.heat) items.push(m(maxItem('drop', '探測器下端距裝置面', i.drop, 30, 0, '消防標準第 120 條第 1 款', ''), 'cm'));
    else items.push(m(maxItem('drop', '探測器下端距裝置面', i.drop, 60, 0, '消防標準第 122 條第 2 款', ''), 'cm'));
    var eff = null, need = null;
    if (T.heat || i.loc === 'room') {
      if (T.heat) { var row = M.HEAT_AREA[i.dtype + '-' + cls]; if (row && isNum(Hh) && Hh < 8) eff = row[(Hh < 4 ? 0 : 2) + (i.fireproof ? 0 : 1)]; }
      else { var sr = M.SMOKE_AREA[cls]; if (sr && isNum(Hh) && Hh < 20) eff = sr[Hh < 4 ? 0 : 1]; }
      if (isNum(eff) && isNum(i.area) && i.area > 0) need = Math.ceil(i.area / eff - 1e-9);
      var basisA = T.heat ? '消防標準第 120 條第 2 款（' + (i.fireproof ? '防火構造' : '其他建築物') + '）' : '消防標準第 122 條第 4 款';
      var cnt = minItem('count', '探測區域內探測器數', i.n, need, 0, basisA, '', isNum(eff) ? '有效探測範圍 ' + eff + ' m²／個' + (isNum(i.area) ? '，探測區域 ' + i.area + ' m² → 至少 ' + need + ' 個' : '') : (isNum(Hh) ? '此種類／高度無有效探測範圍（表列「–」）' : '請輸入裝置面高度'));
      cnt.unit = '個'; cnt.tolNote = NO_TOL;
      if (!isNum(eff) && isNum(Hh)) cnt.status = 'fail';
      items.push(cnt);
    }
    if (!T.heat) {
      items.push(m(minItem('wall', '探測器距牆壁或樑', i.wall, 60, 0, '消防標準第 122 條第 3 款', ''), 'cm'));
      var three = cls === '3';
      if (i.loc === 'corridor') {
        items.push(m(maxItem('walk', '走廊、通道探測器步行間距', i.walk, three ? 20 : 30, 0, '消防標準第 122 條第 5 款（' + (three ? '三種 20m' : '30m') + '）', ''), 'm'));
        items.push(m(maxItem('end', '距盡頭牆壁', i.endDist, three ? 10 : 15, 0, '消防標準第 122 條第 5 款（' + (three ? '三種 10m' : '15m') + '）', ''), 'm'));
      } else if (i.loc === 'stair') {
        items.push(m(maxItem('vert', '樓梯、斜坡通道垂直距離間隔', i.vert, three ? 10 : 15, 0, '消防標準第 122 條第 6 款（' + (three ? '三種 10m' : '15m') + '）', ''), 'm'));
      } else {
        items.push(infoItem('entry', '小房間', '居室天花板高度 2.3m 以下或樓地板面積 40m² 以下時，應設在出入口附近', '消防標準第 122 條第 1 款'));
        items.push(infoItem('return', '回風口', '天花板設排氣口或回風口時，偵煙式應裝置於其周圍 1m 範圍內', '消防標準第 115 條第 3 款'));
      }
    }
    if (isNum(i.vent)) items.push(m(minItem('vent', '距出風口', i.vent, 1.5, 0, '消防標準第 115 條第 1、2 款（牆上出風口距天花板 1m 以上者不在此限）', ''), 'm'));
    if (isNum(i.angle)) items.push(boolItem('angle', '探測器傾斜角度', i.angle < 45, '消防標準第 115 條第 5 款（不得傾斜 45 度以上）', '', i.angle + '°', '未滿 45°'));
    if ((i.dtype === 'fixed' || i.dtype === 'comp') && isNum(i.ambient) && isNum(i.nominal))
      items.push(m(maxItem('temp', '平時最高周圍溫度', i.ambient, i.nominal - 20, 0, '消防標準第 120 條第 3 款（比標稱動作溫度低 20°C 以上）', '', '標稱 ' + i.nominal + '°C'), '°C'));
    items.push(infoItem('zone', '探測區域', '以裝置面四周淨高 ' + (T.heat ? '40' : '60') + 'cm 以上之樑或類似構造體區劃者為一探測區域，各區域分別檢討', '消防標準第 119 條'));
    if (!T.heat && i.loc === 'shaft') items.push(infoItem('shaftTop', '昇降機坑道、管道間', '管道截面積 1m² 以上者應設在最頂部；昇降路頂部有機械室且有開口者設於機械室', '消防標準第 122 條第 7 款'));
    return result(items, { eff: eff, need: need }, { heat: T.heat, drop: i.drop, dropMax: T.heat ? 30 : 60, wall: i.wall, need: need, n: i.n, H: Hh });
  }

  // ---------- 無障礙設施（機電相關）----------
  function accessible(i) {
    var it = M.ACC_ITEMS.concat(M.ACC_FIXTURES).filter(function (x) { return x.id === i.item; })[0];
    if (!it) throw new Error('請選擇項目');
    var items = [], bands = [], sv = {};
    (it.selects || []).forEach(function (s) { sv[s.k] = i[s.k] || s.def; });
    it.checks.forEach(function (c) {
      if (c.when && sv[c.when[0]] !== c.when[1]) return;
      var mv = i[c.k], basis = '無障礙規範 ' + c.basis, item;
      if (c.kind === 'ref') { // 參考附錄（第 105 點：非強制），只列結果
        var okr = isNum(mv) ? mv >= c.lo - EPS && mv <= c.hi + EPS : null;
        items.push(infoItem(c.k, c.label + '（參考）', (okr === true ? '✔ 符合　' : okr === false ? '✖ 不符合　' : '') + (isNum(mv) ? '實測 ' + mv + ' cm，' : '') + '參考值 ' + c.lo + '～' + c.hi + ' cm', basis));
        return;
      }
      if (c.kind === 'bool') {
        item = boolItem(c.k, c.label, mv === true ? true : mv === false ? false : null, basis, '', mv === true ? '是' : mv === false ? '否' : '—', '是');
      } else if (c.kind === 'range') {
        item = mk({ key: c.k, label: c.label, measured: mv, required: c.lo + '～' + c.hi + ' cm', op: '範圍', status: isNum(mv) ? (mv >= c.lo - EPS && mv <= c.hi + EPS ? 'pass' : 'fail') : 'na', basis: basis, tolNote: '限定範圍，不另加誤差（103.1）' });
        bands.push({ label: c.label, lo: c.lo, hi: c.hi, m: mv, st: item.status });
      } else if (c.kind === 'exact') {
        var tol = c.v * M.ACC_EXACT_TOL;
        item = mk({ key: c.k, label: c.label, measured: mv, required: c.v + ' cm（±' + r2(tol) + '）', op: '≈', status: isNum(mv) ? (Math.abs(mv - c.v) <= tol + EPS ? 'pass' : 'fail') : 'na', basis: basis, tolNote: '未註明最大、最小或範圍之尺寸，誤差不得大於 3%（103.1）' });
        bands.push({ label: c.label, lo: c.v - tol, hi: c.v + tol, m: mv, st: item.status, exact: true });
      } else if (c.kind === 'min') {
        item = minItem(c.k, c.label, mv, c.v, 0, basis, ''); item.tolNote = '最小值，不另加誤差（103.1）';
        bands.push({ label: c.label, lo: c.v, hi: Infinity, m: mv, st: item.status });
      } else {
        var v = i.tight && c.alt ? c.alt : c.v;
        item = maxItem(c.k, c.label, mv, v, 0, basis + (c.alt ? '（設置位置不足得放寬至 ' + c.alt + 'cm）' : ''), ''); item.tolNote = '最大值，不另加誤差（103.1）';
        bands.push({ label: c.label, lo: 0, hi: v, m: mv, st: item.status });
      }
      items.push(item);
    });
    if (it.link) items.push(boolItem('link', '求助鈴連接裝置', i.link === null || i.link === undefined ? null : i.link, '無障礙規範 ' + it.link, '', i.link ? '已連接' : i.link === false ? '未連接' : '—', '連接至服務台或外部警示燈、聲響'));
    if (it.id === 'elevPanel') items.push(boolItem('touch', '按鈕型式', i.touch === null || i.touch === undefined ? null : !i.touch, '無障礙規範 406.5（不得使用觸控式按鈕）', '', i.touch ? '觸控式' : i.touch === false ? '機械按鈕' : '—', '非觸控式'));
    if (it.id === 'basin' && sv.rail === 'none') items.push(infoItem('railNone', '扶手', '檯面式洗面盆，或壁掛式洗面盆已於下方加設安全支撐者，得免設扶手', '無障礙規範 507.6'));
    if (it.note) items.push(infoItem('note', '其他規定', it.note));
    var plan = it.id === 'toilet' ? { side: i.side, front: i.front, wall: i.wall, turn: i.turn } : null;
    return result(items, {}, { bands: bands, title: it.label, plan: plan });
  }

  // ---------- 一般衛生器具與給排水（建築物給水排水設備設計技術規範）----------
  function plumbing(i) {
    var items = [], B = '給排水規範 ', fig = { bands: [], title: '' };
    function u(it, unit) { it.unit = unit; it.tolNote = it.tolNote && it.tolNote !== '不套用許可差' ? it.tolNote : NO_TOL; return it; }
    function band(label, lo, hi, m, st, unit) { fig.bands.push({ label: label, lo: lo, hi: hi, m: m, st: st, unit: unit }); }
    function yesItem(key, label, v, basis, note) { return boolItem(key, label, v === true ? true : v === false ? false : null, basis, note || '', v === true ? '是' : v === false ? '否' : '—', '是'); }
    var it = M.PLUMB_ITEMS.filter(function (x) { return x.id === i.item; })[0];
    if (!it) throw new Error('請選擇項目');
    fig.title = it.label;
    if (it.id === 'trap') {
      var seal = mk({ key: 'seal', label: '存水彎封水深度', measured: i.seal, required: '5～10 cm', op: '範圍', unit: 'cm', status: isNum(i.seal) ? (i.seal >= 5 - EPS && i.seal <= 10 + EPS ? 'pass' : 'fail') : 'na', basis: B + '4.4.4', tolNote: NO_TOL, note: '特殊情況經確認無妨礙衛生安全之虞，或仍具備阻絕功能者不在此限' });
      items.push(seal); band('封水深度（cm）', 5, 10, i.seal, seal.status, 'cm');
      if (i.wallBasin) { var dr = u(maxItem('drop', '壁掛洗手臺落水口至存水彎堰口垂直距離', i.drop, 60, 0, B + '4.4.3', ''), 'cm'); items.push(dr); band('落水口至堰口（cm）', 0, 60, i.drop, dr.status, 'cm'); }
      items.push(yesItem('clean', '存水彎附清潔口或可拆卸構造', i.clean, B + '4.4.5'));
      items.push(infoItem('dry', '樓板排水存水彎', '封水容易蒸發者應加深水封並定期補水', B + '4.4.6'));
    } else if (it.id === 'supply') {
      var f = M.SUPPLY_MIN.filter(function (x) { return x.id === i.fixture; })[0];
      if (!f) throw new Error('請選擇器具');
      var d = u(minItem('dia', f.label + '連接水管口徑', i.dia, f.min, 0, B + '3.4.2（' + f.min + 'mm 以上）', ''), 'mm');
      items.push(d); band('口徑（mm）', f.min, Infinity, i.dia, d.status, 'mm');
      if (f.flush) items.push(yesItem('vb', '沖水閥具消除真空設備或真空破除器', i.vb, B + '3.4.1'));
    } else if (it.id === 'flow') {
      var q = M.MAX_FLOW.filter(function (x) { return x.id === i.fixture; })[0];
      if (!q) throw new Error('請選擇器具');
      var qi = isNum(q.min)
        ? mk({ key: 'q', label: q.label + (q.small ? '（大號）' : '') + '使用水量', measured: i.q, required: q.min + '～' + q.max + ' ' + q.unit, op: '範圍', unit: q.unit, status: isNum(i.q) ? (i.q >= q.min - EPS && i.q <= q.max + EPS ? 'pass' : 'fail') : 'na', basis: B + '3.4.3 表3-3', tolNote: NO_TOL })
        : u(maxItem('q', q.label + (q.small ? '（大號）' : '') + '使用水量', i.q, q.max, 0, B + '3.4.3 表3-3', ''), q.unit);
      items.push(qi); band(q.label + '（' + q.unit + '）', q.min || 0, q.max, i.q, qi.status, q.unit);
      if (q.small) { var qs = u(maxItem('q2', q.label + '（小號）使用水量', i.q2, q.small, 0, B + '3.4.3 表3-3', ''), q.unit); items.push(qs); band('小號（' + q.unit + '）', 0, q.small, i.q2, qs.status, q.unit); }
      items.push(infoItem('src', '量測方式', '以產品標示、型錄或現場量測（盛水計時）確認；有國家標準或國際標準者從其規定', B + '3.4.3'));
    } else if (it.id === 'pressure') {
      var pmin = i.flush ? 1.0 : 0.3;
      var p = u(minItem('p', '器具供水水壓', i.p, pmin, 0, B + '3.4.4（' + (i.flush ? '沖水閥或特殊裝置 1.0' : '0.3') + 'kg/cm² 以上）', ''), 'kg/cm²');
      items.push(p); band('水壓（kg/cm²）', pmin, 3.5, i.p, p.status, 'kg/cm²');
      if (isNum(i.p) && i.p > 3.5 + EPS) items.push(yesItem('prv', '已設中間水槽或減壓閥（水壓超過 3.5kg/cm²）', i.prv, B + '3.4.6'));
      else items.push(infoItem('prv', '水壓上限', '一般給水壓力超過 3.5kg/cm² 時，應設置中間水槽或減壓閥', B + '3.4.6'));
    } else if (it.id === 'airGap') {
      // 須有出水口內徑才能判合格；未填內徑時，低於 50mm 直接不合格，其餘待輸入
      var hasD = isNum(i.d) && i.d > 0, req = hasD ? Math.max(i.d, 50) : 50;
      var g = u(minItem('gap', '出水口高出溢水面', i.gap, req, 0, B + '3.4.9（一管徑以上且不得小於 50mm）', '', hasD ? '出水口內徑 ' + i.d + ' mm' : '請輸入出水口內徑'), 'mm');
      if (!hasD && g.status === 'pass') g.status = 'na';
      items.push(g); band('出水口空間（mm）', req, Infinity, i.gap, g.status, 'mm');
    } else if (it.id === 'drain') {
      var reqS = isNum(i.dia) ? (i.dia <= 75 ? 1 / 50 : 1 / 100) : NaN;
      var s = isNum(i.drop) && isNum(i.len) && i.len > 0 ? i.drop / (i.len * 100) : NaN;
      items.push(mk({ key: 'slope', label: '排水橫管坡度', measured: s, required: reqS, unit: 'slope', op: '≥', status: !isNum(reqS) || !isNum(s) ? 'na' : s < -EPS ? 'fail' : s >= reqS - EPS ? 'pass' : 'fail',
        basis: B + '4.2.3（管徑 75mm 以下 1/50、超過 75mm 1/100）', tolNote: NO_TOL, note: isNum(s) ? '落差 ' + i.drop + ' cm／長度 ' + i.len + ' m' + (s < 0 ? '（逆坡）' : '') : '請輸入管徑、落差、長度' }));
      items.push(infoItem('even', '配管', '排水橫管不得有凹凸；多點檢測可用「洩水坡度」模組找逆坡、積水點', B + '4.2.6'));
      fig = { pts: isNum(s) && isNum(reqS) ? [{ name: '起點', x: 0, z: 0 }, { name: '終點', x: i.len * 100, z: -i.drop }] : [], reqS: reqS, slope: true };
    } else if (it.id === 'cleanout') {
      if (isNum(i.dia)) {
        var smax = i.dia <= 100 ? 15 : 30;
        if (isNum(i.spacing)) items.push(u(maxItem('spacing', '排水橫管清潔口間距', i.spacing, smax, 0, B + '4.5.1、4.5.3（管徑 100mm 以下 15m、超過 30m）', ''), 'm'));
        if (isNum(i.coDia)) items.push(u(i.dia <= 100
          ? mk({ key: 'coDia', label: '清潔口口徑', measured: i.coDia, required: i.dia, op: '=', unit: 'mm', status: Math.abs(i.coDia - i.dia) <= EPS ? 'pass' : 'fail', basis: B + '4.5.4（管徑 100mm 以下應與排水管同徑）' })
          : minItem('coDia', '清潔口口徑', i.coDia, 100, 0, B + '4.5.4（管徑大於 100mm 者不得小於 100mm）', ''), 'mm'));
      } else items.push(mk({ key: 'spacing', label: '清潔口', status: 'na', unit: '', note: '請輸入排水管管徑' }));
      var cd = isNum(i.coDia) ? i.coDia : i.dia;
      if (isNum(i.space)) items.push(u(minItem('space', '清潔口周圍保留空間', i.space, isNum(cd) && cd >= 75 ? 45 : 30, 0, B + '4.5.3（口徑 75mm 以上 45cm，未滿 30cm）', ''), 'cm'));
      items.push(infoItem('where', '設置位置', '橫支管與橫主管起點、長管中途、立管最低處、接基地排水管處、管徑變化或異種管相接處；隱蔽者延伸至裝修面並設面板', B + '4.5.1、4.5.2、4.5.6'));
    } else if (it.id === 'test') {
      if (i.kind === 'drain') {
        if (i.mode !== 'full') items.push(u(minItem('head', '試驗水頭（管路最高接頭處）', i.head, 3.3, 0, B + '4.7.1（分段、分層 3.3m 以上；全部試驗自最高開口灌水至滿溢）', ''), 'm'));
        else items.push(yesItem('fill', '除最高開口外開口皆密封、灌水至滿溢', i.fill, B + '4.7.1(1)'));
        items.push(u(minItem('min', '保持時間', i.min, 60, 0, B + '4.7.1', ''), '分鐘'));
        items.push(yesItem('noLeak', '無滲漏', i.noLeak, B + '4.7.1'));
      } else {
        items.push(u(minItem('p', '給水管試驗壓力', i.p, 10, 0, B + '3.5.16（10kg/cm² 以上，澆置混凝土前）', ''), 'kg/cm²'));
        items.push(u(minItem('min', '保持時間', i.min, 60, 0, B + '3.5.16', ''), '分鐘'));
        items.push(yesItem('noLeak', '無滲漏', i.noLeak, B + '3.5.16'));
      }
    } else if (it.id === 'sep') {
      if (i.same) items.push(u(minItem('v', '同一管溝：給水管底部高出排水或污水管最高點', i.v, 30, 0, B + '3.5.5', ''), 'cm'));
      else items.push(u(minItem('h', '埋設給水管與排水或污水管溝渠水平距離', i.h, 30, 0, B + '3.5.4', '', '相交時應在排水溝或污水管頂上或溝底通過'), 'cm'));
    } else if (it.id === 'interceptor') {
      if (i.kind === 'grease') {
        var gi = mk({ key: 'seal', label: '油脂截留器流出管前水封深度', measured: i.seal, required: '5～20 cm', op: '範圍', unit: 'cm', status: isNum(i.seal) ? (i.seal >= 5 - EPS && i.seal <= 20 + EPS ? 'pass' : 'fail') : 'na', basis: B + '4.6.2 說明(7)', tolNote: NO_TOL });
        items.push(gi); band('水封深度（cm）', 5, 20, i.seal, gi.status, 'cm');
        items.push(infoItem('vent', '通氣管', '油脂截留器應設置通氣管', B + '4.6.2 說明(9)'));
      } else {
        var si = u(minItem('seal', '截留砂或較重固體之截留器、分離器封水深度', i.seal, 15, 0, B + '4.6.7', ''), 'cm');
        items.push(si); band('封水深度（cm）', 15, Infinity, i.seal, si.status, 'cm');
      }
    } else { // height：依圖說，國內法規無一般器具安裝高度；未列項目依使用者規定 ±5%
      var dv = i.design, mv = i.measured, allow = isNum(dv) ? Math.abs(dv) * SC.data.TOL.pct : NaN;
      var st = !isNum(dv) || !isNum(mv) ? 'na' : Math.abs(mv - dv) <= EPS ? 'pass' : Math.abs(mv - dv) <= allow + EPS ? 'tol' : 'fail';
      items.push(mk({ key: 'h', label: (i.fixture || '器具') + '安裝高度', measured: mv, required: isNum(dv) ? dv + ' cm（±' + r1(allow) + '）' : '請輸入圖說值', op: '≈', unit: 'cm', status: st,
        basis: '依核定圖說（國內法規未規定一般器具安裝高度；無障礙器具請用「無障礙衛浴器具」）', tolNote: '未列於法規，採 ±5%' }));
      if (isNum(dv)) { band('安裝高度（cm）', dv - allow, dv + allow, mv, st, 'cm'); fig.bands[0].exact = true; }
    }
    return result(items, {}, fig);
  }

  var E = SC.engine;
  E.plumbing = plumbing;
  E.conduitFill = conduitFill; E.groundRes = groundRes; E.insulation = insulation;
  E.sprinkler = sprinkler; E.detector = detector; E.accessible = accessible;
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);

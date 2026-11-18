/* 判定核心：只做計算，不碰畫面。
 * 每個模組回傳 { items: [...], overall, derived, fig }。
 * item = { key, label, measured, required, unit, status, basis, tolNote, note }
 * status：pass 合格／tol 許可差內合格／fail 不合格／na 未輸入／info 說明
 * 長度單位一律 cm。
 */
(function (root) {
  'use strict';
  var SC = root.SC = root.SC || {};
  var D = SC.data;
  var EPS = 1e-9;

  // ---------- 共用 ----------
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function ceilCm(x) { return Math.ceil(x - 1e-7); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function r2(x) { return Math.round(x * 100) / 100; }
  // 輸入字串轉數字（嚴格）：全形數字與小數點、負號轉半形；整串須為數字（可帶正負號、科學記號如 1e-3），否則回傳 NaN（例如「2,5」「20abc」不接受）
  function parseNum(s) {
    if (typeof s === 'number') return isFinite(s) ? s : NaN;
    if (s === null || s === undefined) return NaN;
    var t = String(s).replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).replace(/[．。]/g, '.').replace(/[－−]/g, '-').trim();
    return /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t) ? parseFloat(t) : NaN;
  }
  function db(bar) { var b = D.BARS[bar]; if (!b) throw new Error('未知鋼筋號數：' + bar); return b.db; }
  function barIndex(bar) { return D.BAR_ORDER.indexOf(bar); }
  function smallBar(bar) { return barIndex(bar) <= barIndex('D19'); }

  // 下限型：實測需 ≥ 規定。allow = 可少於規定之容許量（cm）；pct = 以規定值百分比計
  function judgeMin(m, req, allow) {
    if (!isNum(m) || !isNum(req)) return 'na'; // 規定值尚無法計算（條件未填）也視為待輸入
    if (m >= req - EPS) return 'pass';
    if (allow > 0 && m >= req - allow - EPS) return 'tol';
    return 'fail';
  }
  // 上限型：實測需 ≤ 規定
  function judgeMax(m, req, allow) {
    if (!isNum(m) || !isNum(req)) return 'na';
    if (m <= req + EPS) return 'pass';
    if (allow > 0 && m <= req + allow + EPS) return 'tol';
    return 'fail';
  }
  function pctAllow(req) { return Math.abs(req) * D.TOL.pct; }
  function tolText(allow, src) { return allow > 0 ? src : '不套用許可差'; }

  function mk(o) {
    return {
      key: o.key, label: o.label, measured: o.measured, required: o.required, unit: o.unit || 'cm',
      status: o.status, basis: o.basis || '', tolNote: o.tolNote || '', note: o.note || '', op: o.op || ''
    };
  }
  function minItem(key, label, m, req, allow, basis, src, note) {
    return mk({ key: key, label: label, measured: m, required: req, op: '≥', status: judgeMin(m, req, allow),
      basis: basis, tolNote: tolText(allow, src), note: note });
  }
  function maxItem(key, label, m, req, allow, basis, src, note) {
    return mk({ key: key, label: label, measured: m, required: req, op: '≤', status: judgeMax(m, req, allow),
      basis: basis, tolNote: tolText(allow, src), note: note });
  }
  function boolItem(key, label, ok, basis, note, measuredText, requiredText) {
    return mk({ key: key, label: label, measured: measuredText, required: requiredText, unit: '', op: '',
      status: ok === null || ok === undefined ? 'na' : ok ? 'pass' : 'fail', basis: basis, tolNote: '是非項目，不套用許可差', note: note });
  }
  function infoItem(key, label, note, basis) {
    return mk({ key: key, label: label, status: 'info', note: note, basis: basis || '', unit: '' });
  }
  function overall(items) {
    var s = items.map(function (i) { return i.status; });
    if (s.indexOf('fail') >= 0) return 'fail';
    var hasNa = s.indexOf('na') >= 0, hasOk = s.indexOf('pass') >= 0 || s.indexOf('tol') >= 0;
    if (hasNa) return hasOk ? 'partial' : 'na'; // 尚有未輸入項目時不宣告整體合格
    if (s.indexOf('tol') >= 0) return 'tol';
    if (s.indexOf('pass') >= 0) return 'pass';
    return 'na';
  }
  function result(items, derived, fig) { return { items: items, overall: overall(items), derived: derived || {}, fig: fig || {} }; }
  function sqrtFc(fc) { return Math.sqrt(fc); }

  // ---------- 伸展長度與搭接（規範 25.4、25.5）----------
  // 25.4.2.3 簡化公式（未含 25.4.2.1(b) 30cm 下限）
  function ldRaw(o) {
    var d = db(o.bar), lam = o.light ? 0.75 : 1.0;
    var psit = o.top ? 1.3 : 1.0;
    var psie = o.epoxy === 'e15' ? 1.5 : o.epoxy === 'e12' ? 1.2 : 1.0;
    var prod = Math.min(psit * psie, 1.7); // 表 25.4.2.5 註1
    var div;
    if (o.spacingOK === false) div = smallBar(o.bar) ? 4.4 : 3.5;
    else div = smallBar(o.bar) ? 6.6 : 5.3;
    return o.fy * prod / (div * lam * sqrtFc(o.fc)) * d;
  }
  function developmentLength(o) { return Math.max(ldRaw(o), 30); } // 25.4.2.1
  function tensionLap(o) {                                          // 25.5.2.1
    var k = o.cls === 'A' ? 1.0 : 1.3;
    return Math.max(k * D.psiG(o.fy) * ldRaw(o), 30);
  }
  function compressionLap(o) {                                      // 25.5.5.1
    var d = db(o.bar), base;
    if (o.fy <= 4200) base = 0.0073 * o.fy * d;
    else if (o.fy <= 5600) base = (0.013 * o.fy - 24) * d;
    else base = Math.max((0.013 * o.fy - 24) * d, tensionLap(o));
    var l = Math.max(base, 30);
    if (o.fc < 210) l = l * 4 / 3;
    return l;
  }
  // 18.5.5.1 耐震接頭標準彎鉤（RC04-1）
  function ldhSeismic(o) {
    var d = db(o.bar), lam = o.light ? 0.75 : 1.0;
    var v = Math.max(0.06 * d * o.fy / (lam * sqrtFc(o.fc)), 8 * d, o.light ? Math.max(10 * d, 19) : 15);
    if (o.epoxy) v *= 1.2;
    return v;
  }
  // 25.4.3.1 一般標準彎鉤（RC03-5）
  function ldhGeneral(o) {
    var d = db(o.bar), lam = o.light ? 0.75 : 1.0;
    var psie = o.epoxy ? 1.2 : 1.0, psir = o.confined === false ? 1.6 : 1.0, psio = o.inCore === false ? 1.25 : 1.0;
    var psic = o.fc < 420 ? o.fc / 1050 + 0.6 : 1.0;
    var v = o.fy * psie * psir * psio * psic / (23 * lam * sqrtFc(o.fc)) * Math.pow(d, 1.5);
    return Math.max(v, 8 * d, 15);
  }

  // ---------- 01 穿樑 ----------
  function beamHole(i) {
    var items = [], h = i.h, phi = i.phi, ground = i.member === 'ground';
    var nCutEst = isNum(i.s) && i.s > 0 && isNum(phi) ? Math.max(1, Math.ceil(phi / i.s)) : null;
    var nCut = isNum(i.nCut) ? i.nCut : nCutEst;
    if (!ground) {
      items.push(maxItem('dia', '孔徑（套管外徑）', phi, h / 3, 0, 'RC06 梁穿孔補強詳圖 附註2（孔須在中央 1/3 梁深內）', '', '上限 = h/3'));
      items.push(minItem('topEdge', '孔上緣距梁頂', isNum(i.yc) && isNum(phi) ? i.yc - phi / 2 : NaN, h / 3, 0, 'RC06 附註2', '', '孔上緣須低於梁頂 h/3'));
      items.push(maxItem('botEdge', '孔下緣距梁頂', isNum(i.yc) && isNum(phi) ? i.yc + phi / 2 : NaN, 2 * h / 3, 0, 'RC06 附註2', '', '孔下緣須高於梁底 h/3'));
      items.push(minItem('face', '孔緣距柱面', isNum(i.distFace) && isNum(phi) ? i.distFace - phi / 2 : NaN, 2 * h, 0, 'RC06 附註3（距柱面 2 倍梁深內不得穿孔）', ''));
      if (isNum(i.adjDist)) {
        var big = Math.max(phi, isNum(i.adjPhi) ? i.adjPhi : phi);
        items.push(minItem('adj', '相鄰孔中心距', i.adjDist, Math.max(3 * big, 30), 0, 'RC06 附註4（≥ 3φ 且 ≥ 30cm，φ 取較大孔）', ''));
      }
      // 補強
      var diagOK = i.diagBar && i.diagBar !== 'none' ? i.diagBar === i.stirBar : (i.diagBar === 'none' ? false : null);
      items.push(boolItem('diag', '斜筋號數同箍筋', diagOK, 'RC06 附註7', '斜筋 45° 配置於孔兩側，自彎折處起須有足夠伸展長度 ℓd（附註5）',
        i.diagBar === 'none' ? '未配置' : i.diagBar || '—', i.stirBar || '同箍筋'));
      if (nCut !== null) {
        items.push(minItem('sideL', '孔左側垂直補強箍筋支數', i.sideL, nCut, 0, 'RC06 附註8（每側支數 ≥ 被切斷箍筋數）', '', '被切斷箍筋 ' + nCut + ' 支' + (isNum(i.nCut) ? '' : '（依 φ/s 估算，可改填實際值）')));
        items.push(minItem('sideR', '孔右側垂直補強箍筋支數', i.sideR, nCut, 0, 'RC06 附註8', ''));
      }
      if (isNum(i.s) && isNum(phi)) {
        if (phi > i.s + EPS) items.push(boolItem('uBar', 'ㄇ形箍筋', i.uStirrup === true ? true : i.uStirrup === false ? false : null, 'RC06 附註9（孔徑大於原箍筋間距時應增設ㄇ形箍筋）', '', i.uStirrup ? '已配置' : i.uStirrup === false ? '未配置' : '—', '需要'));
        else items.push(infoItem('uBar', 'ㄇ形箍筋', '孔徑未大於箍筋間距，不需加設', 'RC06 附註9'));
      }
      items.push(infoItem('coverNote', '孔緣保護層', '穿孔外緣與鋼筋距離須滿足保護層需求（目視確認）', 'RC06 附註6'));
    } else {
      items.push(maxItem('dia', '孔徑（或邊長）', phi, h / 3, 0, 'RC06 地梁穿孔補強詳圖 附註6（≤ H/3）', ''));
      if (isNum(i.adjDist)) items.push(minItem('adj', '相鄰孔中心距', i.adjDist, 3 * Math.max(phi, isNum(i.adjPhi) ? i.adjPhi : phi), 0, 'RC06 地梁 附註4（> 3 倍孔徑）', ''));
      var need = isNum(phi) && phi >= h / 10 - EPS;
      if (isNum(phi) && !need) items.push(infoItem('reinf', '補強', '孔徑小於 H/10，可不需補強', 'RC06 地梁 附註3'));
      if (need) {
        if (isNum(i.b) && i.b < 80) {
          items.push(minItem('tbCount', '孔上、下補強筋根數（每側）', i.tbCount, 4, 0, 'RC06 地梁剖面 B（梁寬 < 80cm：上下各 4-D19）', ''));
          items.push(boolItem('tbBar', '補強筋號數 ≥ D19', i.tbBar ? barIndex(i.tbBar) >= barIndex('D19') : null, 'RC06 地梁剖面 B', '', i.tbBar || '—', 'D19 以上'));
        } else items.push(infoItem('tb', '孔上、下補強筋', '梁寬 ≥ 80cm，補強筋依設計圖說', 'RC06 地梁剖面 B'));
        if (nCut !== null) {
          items.push(minItem('sideL', '孔左側補強箍筋支數', i.sideL, nCut, 0, 'RC06 地梁圖（補強箍筋量 ≥ 被截斷箍筋量 2 倍，分置孔兩側）', '', '被截斷箍筋 ' + nCut + ' 支'));
          items.push(minItem('sideR', '孔右側補強箍筋支數', i.sideR, nCut, 0, 'RC06 地梁圖', ''));
        }
        items.push(infoItem('anch', '補強筋錨定', '補強鋼筋須自鋼筋轉折起錨定 ℓd；未開孔部分之箍筋應直通', 'RC06 地梁 附註1、2'));
      }
    }
    return result(items, { nCutEst: nCutEst, nCut: nCut }, { member: i.member, h: h, phi: phi, yc: i.yc, distFace: i.distFace, s: i.s, adjDist: i.adjDist, adjPhi: i.adjPhi });
  }

  // ---------- 02 搭接 ----------
  function lap(i) {
    var items = [], derived = {};
    if (i.big) {
      items.push(boolItem('big', '鋼筋號數', false, i.mode === 'compression' ? '規範 25.5.5.2（受壓搭接不得大於 D36；D43、D57 受壓時可與 D36 以下搭接，依 25.5.5.3）' : '規範 25.5.1.1（大於 D36 之鋼筋不得搭接）', '', '大於 D36', 'D36 以下'));
      return result(items, derived, {});
    }
    if (i.mode === 'compression') {
      var lsc = compressionLap(i);
      derived.lsc = lsc;
      derived.ref = i.fc >= 210 && D.REF_COMP_LAP[i.fy] ? D.REF_COMP_LAP[i.fy][i.bar] : null;
      derived.refId = 'RC03-7';
      items.push(minItem('len', '受壓搭接長度', i.measured, ceilCm(lsc), D.TOL.lapLength.minus, '規範 25.5.5.1' + (i.fc < 210 ? '（fc\' < 210 增加 1/3）' : ''), D.TOL.lapLength.src));
    } else {
      var raw = ldRaw(i), lst = tensionLap(i);
      derived.ldRaw = raw; derived.ld = Math.max(raw, 30); derived.lst = lst; derived.psiG = D.psiG(i.fy);
      if (!i.light && (i.epoxy || 'none') === 'none' && i.spacingOK !== false && i.cls !== 'A') {
        derived.refId = i.top ? 'RC03-3' : 'RC03-4';
        derived.ref = D.refTableValue(derived.refId, i.bar, i.fy, i.fc);
      }
      items.push(minItem('len', (i.cls === 'A' ? '甲級' : '乙級') + '受拉搭接長度', i.measured, ceilCm(lst), D.TOL.lapLength.minus,
        '規範 25.5.2.1、25.4.2.3', D.TOL.lapLength.src, 'ℓd = ' + r1(raw) + ' cm（未含 30cm 下限），ψg = ' + D.psiG(i.fy)));
    }
    items.push(infoItem('mix', '不同號數搭接', '受拉：取大號鋼筋 ℓd 與小號鋼筋 ℓst 之大值（規範 25.5.2.2）；受壓：取大號 ℓdc 與小號 ℓsc 之大值（規範 25.5.5.4）'));
    return result(items, derived, { required: ceilCm(i.mode === 'compression' ? derived.lsc : derived.lst), measured: i.measured, bar: i.bar });
  }

  // ---------- 03 箍筋與繫筋 ----------
  function hookExtReq(bar, angle) {               // 規範 25.3.2／RC04-3（箍筋、肋筋）
    var d = db(bar);
    if (angle === 90) return barIndex(bar) <= barIndex('D16') ? Math.max(6 * d, 7.5) : 12 * d;
    if (angle === 180) return Math.max(4 * d, 6.5);
    return Math.max(6 * d, 7.5);
  }
  function bendDiaReq(bar) { return (barIndex(bar) <= barIndex('D16') ? 4 : 6) * db(bar); }

  function stirrup(i) {
    var items = [], derived = {}, special = i.frame !== 'ordinary';
    var dt = db(i.tieBar), dl = i.longBar ? db(i.longBar) : NaN;
    var k = D.seismicDbFactor(i.fyLong || 4200);
    var tolS = D.TOL.stirrupSpacing;
    if (i.member === 'beam') {
      if (special) {
        var smax = Math.min(i.d / 4, 15, k * dl);
        derived.smax1 = smax; derived.zone = 2 * i.h; derived.smax2 = i.d / 2;
        items.push(maxItem('x0', '第一支閉合箍筋距柱面', i.x0, 5, 0, '規範 18.3.4.4', ''));
        items.push(minItem('zone', '閉合箍筋（加密區）長度', i.L1, 2 * i.h, pctAllow(2 * i.h), '規範 18.3.4.1（2 倍梁深）', '未列於 RC04-7，採 ±5%'));
        items.push(maxItem('s1', '加密區間距', i.s1, smax, tolS.plus, '規範 18.3.4.4（d/4、15cm、' + k + 'db 取小值）', tolS.src,
          'd/4 = ' + r1(i.d / 4) + '，15，' + k + '×' + r2(dl) + ' = ' + r1(k * dl)));
        items.push(maxItem('s2', '非加密區間距', i.s2, i.d / 2, tolS.plus, '規範 18.3.4.6（d/2）', tolS.src));
        items.push(boolItem('hook', '閉合箍筋彎鉤', isNum(i.hookAngle) ? i.hookAngle >= 135 : null, '規範 18.3.4.3、25.3.2（耐震彎鉤 135°）', '', isNum(i.hookAngle) ? i.hookAngle + '°' : '—', '135°'));
        items.push(minItem('ext', '彎鉤直線延伸長度', i.hookExt, hookExtReq(i.tieBar, 135), pctAllow(hookExtReq(i.tieBar, 135)), '規範 25.3.2；RC04-3（6db 且 ≥ 7.5cm）', '未列於 RC04-7，採 ±5%'));
        items.push(boolItem('alt', '繫筋 90°／135° 彎鉤交替', i.alternate === 'na' ? null : i.alternate === 'yes', '規範 18.3.4.3（單邊有樓板時 90° 鉤置於樓板側）', i.alternate === 'na' ? '無繫筋' : '', i.alternate === 'yes' ? '交替' : i.alternate === 'no' ? '未交替' : '—', '交替'));
      } else {
        var lim = i.highShear ? Math.min(i.d / 4, 30) : Math.min(i.d / 2, 60);
        derived.smax2 = lim;
        items.push(maxItem('s2', '箍筋間距', i.s2, lim, tolS.plus, '規範 表 9.7.6.2.2（' + (i.highShear ? 'Vs > 1.06√fc\'bwd：d/4、30cm' : 'd/2、60cm') + ' 取小值）', tolS.src));
        if (isNum(i.hookAngle)) items.push(minItem('ext', '彎鉤直線延伸長度', i.hookExt, hookExtReq(i.tieBar, i.hookAngle), pctAllow(hookExtReq(i.tieBar, i.hookAngle)), '規範 25.3.2；RC04-3（' + i.hookAngle + '°）', '未列於 RC04-7，採 ±5%'));
      }
    } else { // column
      var bmin = Math.min(i.b, i.hc), bmax = Math.max(i.b, i.hc);
      if (special) {
        var so = Math.min(15, Math.max(10, 10 + (35 - i.hx) / 3));
        var lo = Math.max(bmax, i.Hn / 6, 45);
        var s1 = Math.min(bmin / 4, k * dl, so);
        var s2 = Math.min(15, k * dl);
        derived.lo = lo; derived.so = so; derived.smax1 = s1; derived.smax2 = s2;
        items.push(minItem('lo', '圍束區長度 ℓo', i.Lo, lo, pctAllow(lo), '規範 18.4.5.1（柱深、淨高 1/6、45cm 取大值）', '未列於 RC04-7，採 ±5%'));
        items.push(maxItem('hx', '受側撐縱筋間距 hx', i.hx, i.highAxial ? 20 : 35, 0, '規範 18.4.5.2(e)(f)', ''));
        items.push(maxItem('s1', '圍束區間距', i.s1, s1, tolS.plus, '規範 18.4.5.3（最小尺度/4、' + k + 'db、so 取小值）', tolS.src,
          'b/4 = ' + r1(bmin / 4) + '，' + k + 'db = ' + r1(k * dl) + '，so = ' + r1(so)));
        items.push(maxItem('s2', 'ℓo 範圍外間距', i.s2, s2, tolS.plus, '規範 18.4.5.5（15cm、' + k + 'db 取小值）', tolS.src));
        items.push(boolItem('hook', '閉合箍筋彎鉤', isNum(i.hookAngle) ? i.hookAngle >= 135 : null, '規範 18.4.5.2、25.3.2（耐震彎鉤 135°）', '', isNum(i.hookAngle) ? i.hookAngle + '°' : '—', '135°'));
        items.push(minItem('ext', '彎鉤直線延伸長度', i.hookExt, hookExtReq(i.tieBar, 135), pctAllow(hookExtReq(i.tieBar, 135)), '規範 25.3.2；RC04-3（6db 且 ≥ 7.5cm）', '未列於 RC04-7，採 ±5%'));
        items.push(boolItem('alt', '相鄰繫筋端部交替', i.alternate === 'na' ? null : i.alternate === 'yes', '規範 18.4.5.2(c)', i.alternate === 'na' ? '無繫筋' : '', i.alternate === 'yes' ? '交替' : i.alternate === 'no' ? '未交替' : '—', '交替'));
      } else {
        var sOrd = Math.min(16 * dl, 48 * dt, bmin);
        derived.smax2 = sOrd;
        items.push(maxItem('s2', '箍筋間距', i.s2, sOrd, tolS.plus, '規範 25.7.2.1（16 倍縱筋、48 倍箍筋、最小尺度 取小值）', tolS.src));
        if (isNum(i.hookAngle)) items.push(minItem('ext', '彎鉤直線延伸長度', i.hookExt, hookExtReq(i.tieBar, i.hookAngle), pctAllow(hookExtReq(i.tieBar, i.hookAngle)), '規範 25.3.2；RC04-3', '未列於 RC04-7，採 ±5%'));
      }
    }
    if (isNum(i.bendDia)) items.push(minItem('bend', '彎曲內直徑', i.bendDia, bendDiaReq(i.tieBar), pctAllow(bendDiaReq(i.tieBar)), '規範 25.3.2（D16 以下 4db、D19～D25 6db）', '未列於 RC04-7，採 ±5%'));
    if (isNum(i.nDesign) && isNum(i.nActual)) items.push(minItem('count', '箍筋總根數', i.nActual, i.nDesign, 0, 'RC04-7（間距許可差之前提：總根數不得減少）', '', '依設計圖根數'));
    return result(items, derived, { member: i.member, special: special, h: i.h, s1: i.s1, s2: i.s2, L1: i.L1, x0: i.x0, Lo: i.Lo, Hn: i.Hn, smax1: derived.smax1, smax2: derived.smax2, zone: derived.zone, lo: derived.lo, tieBar: i.tieBar, hookAngle: i.hookAngle });
  }

  // ---------- 04 保護層 ----------
  function cover(i) {
    var items = [];
    var c = D.COVER_CASES.filter(function (x) { return x.id === i.exposure; })[0];
    var req = c.rule({ barGroup: i.barGroup });
    var design = isNum(i.design) ? i.design : req;
    var tol;
    if (i.face === 'bottom') tol = D.TOL.coverBottom;
    else if (i.face === 'top') tol = !isNum(i.depth) ? null : i.depth <= 20 ? D.TOL.coverTopShallow : i.depth < 60 ? D.TOL.coverTopMid : D.TOL.coverTopDeep;
    else tol = D.TOL.coverSide;
    if (!tol) { // 頂面許可差依構材深度分級，未填深度不判定
      items.push(mk({ key: 'cover', label: '保護層厚度', measured: i.measured, required: design, op: '≥', status: 'na', basis: '規範 表 20.5.1.3.1；RC04-4', tolNote: 'RC04-7 頂面許可差依構材深度分級', note: '請輸入構材深度' }));
      return result(items, { req: req, design: design }, { req: req, design: design, measured: i.measured, face: i.face, tol: { minus: 0, plus: 0 } });
    }
    if (design < req - EPS) items.push(mk({ key: 'design', label: '設計保護層', measured: design, required: req, op: '≥', status: 'fail', basis: '規範 表 20.5.1.3.1；RC04-4', tolNote: '設計值本身小於規範最小值，請洽設計單位' }));
    var m = i.measured, st;
    if (!isNum(m)) st = 'na';
    else if (m < design - tol.minus - EPS) st = 'fail';
    else if (m < design - EPS) st = 'tol';
    else if (m > design + tol.plus + EPS) st = 'fail';
    else st = 'pass';
    items.push(mk({ key: 'cover', label: '保護層厚度', measured: m, required: design, op: '≥', status: st,
      basis: '規範 表 20.5.1.3.1；RC04-4（' + c.label + '）', tolNote: tol.src,
      note: (isNum(m) && m > design + tol.plus + EPS) ? '保護層過厚，超出許可差 +' + r1(tol.plus) + 'cm（有效深度減少）' : (tol.plus < Infinity ? '容許範圍 ' + r1(design - tol.minus) + '～' + r1(design + tol.plus) + ' cm' : '下限 ' + r1(design - tol.minus) + ' cm') }));
    items.push(infoItem('how', '量測方式', '有橫向鋼筋圍封主筋時，量至箍筋最外緣；無橫向鋼筋時，量至最外層鋼筋表面', 'RC04-4 附註2'));
    return result(items, { req: req, design: design, tol: tol }, { req: req, design: design, measured: m, face: i.face, tol: tol });
  }

  // ---------- 05 主筋淨間距 ----------
  function clearSpacing(i) {
    var items = [], d = db(i.bar), ag = isNum(i.dagg) ? i.dagg : 0;
    var req = i.member === 'column' ? Math.max(4, 1.5 * d, 4 / 3 * ag) : Math.max(2.5, d, 4 / 3 * ag);
    items.push(minItem('clear', '同層鋼筋淨間距', i.measured, req, D.TOL.clearSpacing.minus,
      i.member === 'column' ? '規範 25.2.3（4cm、1.5db、4/3 粒料粒徑 取大值）' : '規範 25.2.1（2.5cm、db、4/3 粒料粒徑 取大值）', D.TOL.clearSpacing.src,
      '粒料最大粒徑 ' + (ag ? ag + ' cm' : '未填') ));
    if (i.member !== 'column' && isNum(i.layer)) items.push(minItem('layer', '上下層鋼筋淨距', i.layer, 2.5, D.TOL.clearSpacing.minus, '規範 25.2.2；RC04-5 附註2（上下層須對齊）', D.TOL.clearSpacing.src));
    return result(items, { req: req }, { req: req, measured: i.measured, db: d, member: i.member });
  }

  // ---------- 06 搭接位置 ----------
  function lapZone(i) {
    var items = [], derived = {}, tol = D.TOL.bendGeneral;
    if (i.member === 'beam') {
      var x1 = i.x1, x2 = isNum(i.x1) && isNum(i.len) ? i.x1 + i.len : NaN, Ln = i.Ln, h = i.h;
      var ld = ceilCm(developmentLength({ bar: i.bar, fy: i.fy, fc: i.fc, top: i.layer === 'top' }));
      derived.ld = ld; derived.x2 = x2;
      items.push(minItem('face2hL', '搭接起點距左柱面', x1, 2 * h, tol.minus, '規範 18.3.3.3(b)（距接頭面 2 倍梁深內不得搭接）', tol.src));
      items.push(minItem('face2hR', '搭接終點距右柱面', isNum(x2) ? Ln - x2 : NaN, 2 * h, tol.minus, '規範 18.3.3.3(b)', tol.src));
      if (i.layer === 'top') {
        var zL = Math.max((i.leftType === 'int' ? 0.3 : 0.25) * Ln, ld), zR = Math.max((i.rightType === 'ext' ? 0.25 : 0.3) * Ln, ld);
        derived.zL = zL; derived.zR = zR;
        items.push(minItem('topL', '上層筋搭接起點距左柱面', x1, zL, tol.minus, 'RC05 大梁配筋（' + (i.leftType === 'int' ? '0.3Ln' : '0.25Ln') + '、伸展長度 取大者）', tol.src));
        items.push(minItem('topR', '上層筋搭接終點距右柱面', isNum(x2) ? Ln - x2 : NaN, zR, tol.minus, 'RC05 大梁配筋（' + (i.rightType === 'ext' ? '0.25Ln' : '0.3Ln') + '、伸展長度 取大者）', tol.src));
        if (zL + zR > Ln) items.push(infoItem('noZone', '上層筋搭接範圍', '依輸入條件中央無可搭接範圍，請依設計圖說或改用續接器（RC05 附註1）'));
      } else {
        var m1 = Ln / 2 - ld, m2 = Ln / 2 + ld;
        derived.m1 = m1; derived.m2 = m2;
        var gap = isNum(x2) ? Math.max(m1 - x2, x1 - m2) : NaN;
        items.push(minItem('botMid', '下層筋搭接與跨中連續區距離', gap, 0, tol.minus, 'RC05 大梁配筋（跨中心兩側各 ≥ 伸展長度須連續）', tol.src,
          '跨中連續區 ' + r1(m1) + '～' + r1(m2) + ' cm（自左柱面）'));
        items.push(infoItem('oneEnd', '下層主筋搭接', '左端已搭接者，不得再於右端搭接', 'RC05 附註2'));
      }
      if (isNum(i.sLap)) items.push(maxItem('sLap', '搭接範圍閉合箍筋間距', i.sLap, Math.min(i.d / 4, 10), D.TOL.stirrupSpacing.plus, '規範 18.3.3.3；RC05 附註3（d/4、10cm 取小值）', D.TOL.stirrupSpacing.src));
      return result(items, derived, { member: 'beam', Ln: Ln, h: h, x1: x1, x2: x2, layer: i.layer, zL: derived.zL, zR: derived.zR, m1: derived.m1, m2: derived.m2 });
    }
    var Hn = i.Hn, c1 = i.x1, c2 = isNum(i.x1) && isNum(i.len) ? i.x1 + i.len : NaN;
    items.push(minItem('colBot', '柱筋搭接起點距樓板頂', c1, Hn / 4, tol.minus, 'RC07 柱配筋參考圖（搭接於柱中央 Hn/2 範圍）', tol.src));
    items.push(minItem('colTop', '柱筋搭接終點距上層梁底', isNum(c2) ? Hn - c2 : NaN, Hn / 4, tol.minus, 'RC07 柱配筋參考圖', tol.src));
    items.push(infoItem('colEvery', '柱主筋搭接', '每兩層搭接一次，每層之搭接鋼筋數應為主筋數之一半；機械續接器（SA 級）相鄰錯開 60cm 以上', 'RC07 註、注意事項8'));
    return result(items, { x2: c2 }, { member: 'column', Hn: Hn, x1: c1, x2: c2 });
  }

  // ---------- 07 錨定長度 ----------
  function anchor(i) {
    var items = [], derived = {}, req, basis, refId = null, ref = null;
    var tol = barIndex(i.bar) >= 0 ? D.TOL.embedSmall : D.TOL.embedLarge;
    if (i.type === 'general') {
      req = ldhGeneral(i); basis = '規範 25.4.3.1、表 25.4.3.2；RC03-5';
    } else {
      var ldh = ldhSeismic(i);
      derived.ldh = ldh;
      if (i.type === 'straight') { req = (i.deepPour ? 3.25 : 2.5) * ldh; basis = '規範 18.5.5.3（直通鋼筋 ' + (i.deepPour ? '3.25' : '2.5') + 'ℓdh）；RC04-1 附註8'; }
      else {
        req = ldh; basis = '規範 18.5.5.1；RC04-1';
        if (!i.light && !i.epoxy) { refId = 'RC04-1'; ref = D.refTableValue('RC04-1', i.bar, i.fy, i.fc); }
      }
    }
    derived.req = req; derived.refId = refId; derived.ref = ref;
    items.push(minItem('embed', '埋置（伸展）長度', i.measured, ceilCm(req), tol.minus, basis, tol.src));
    if (i.type !== 'straight' && isNum(i.tail)) items.push(minItem('tail', '90° 彎鉤自由端延伸', i.tail, 12 * db(i.bar), pctAllow(12 * db(i.bar)), '規範 25.3.1；RC04-2（12db）', '未列於 RC04-7，採 ±5%'));
    if (i.type === 'seismic') items.push(infoItem('core', '彎鉤位置', '90° 彎鉤應置於柱或邊界構材之圍束核心中，且應伸至圍束核心區之另一面', 'RC04-1 附註4、7'));
    return result(items, derived, { required: ceilCm(req), measured: i.measured, type: i.type });
  }

  // ---------- 08 埋管 ----------
  function embed(i) {
    var items = [];
    if (i.member === 'beam') {
      items.push(maxItem('id', '埋管內徑', i.id, 5, 0, 'RC06 柱、梁腹內部放置水電配管示意圖（內徑 > 5cm 不得埋入梁、板）', ''));
      items.push(boolItem('row', '排列方式', i.rows === 'single' ? true : i.rows === 'multi' ? false : null, 'RC06（以一排為原則，依序豎向排列綁紮於梁中心插筋上）', '', i.rows === 'single' ? '一排' : i.rows === 'multi' ? '多排' : '—', '一排'));
      return result(items, {}, { member: 'beam', id: i.id });
    }
    if (i.member === 'column') {
      var Ag = i.b * i.hc, A = isNum(i.n) && isNum(i.od) ? i.n * Math.PI * i.od * i.od / 4 + (isNum(i.extra) ? i.extra : 0) : NaN;
      var sizeOK = isNum(Ag) ? (i.b >= 45 && i.hc >= 45 && Ag > 2100) : null;
      items.push(boolItem('size', '柱斷面可否埋管', sizeOK, 'RC06 附註1（斷面小於 45×45cm 或 2100cm² 以下，柱內不得埋管）', '', isNum(Ag) ? i.b + '×' + i.hc + '（' + Ag + ' cm²）' : '—', '≥ 45×45 且 > 2100 cm²'));
      items.push(maxItem('area', '埋管所佔面積', A, 0.04 * Ag, 0, '規範 20.6.1 解說；RC06 附註2（含彎出之水平投影，≤ 柱斷面 4%）', '', '上限 ' + r1(0.04 * Ag) + ' cm²'));
      items.push(maxItem('id', '埋管內徑', i.id, 5, 0, 'RC06 附註2（≤ 5cm；規範 20.6.1 解說為 51mm）', ''));
      return result(items, { Ag: Ag, A: A }, { member: 'column', b: i.b, hc: i.hc, n: i.n, od: i.od });
    }
    items.push(maxItem('od', '管外徑', i.od, i.t / 3, 0, '規範 20.6.1 解說；RC01 捌-6（≤ 板、牆厚 1/3）', ''));
    if (isNum(i.spacing)) items.push(minItem('sp', '管中心間距', i.spacing, 3 * i.od, 0, '規範 20.6.1 解說（≥ 3 倍管徑）', ''));
    if (isNum(i.coverOut)) items.push(minItem('cov', '管外包混凝土厚度', i.coverOut, i.exposed ? 4 : 2, 0, '規範 20.6.1 解說 (2)（受風雨侵襲 40mm，否則 20mm）', ''));
    items.push(boolItem('layer', '管位於頂層與底層鋼筋之間', i.between === 'yes' ? true : i.between === 'no' ? false : null, '規範 20.6.1 解說 (1)', '管安裝時不得切斷、彎曲或移動鋼筋（解說 (4)）', i.between === 'yes' ? '是' : i.between === 'no' ? '否' : '—', '是'));
    return result(items, {}, { member: 'slab', t: i.t, od: i.od, spacing: i.spacing });
  }

  // ---------- 09 洩水坡度 ----------
  function slopeText(s) {
    if (!isNum(s)) return '—';
    if (Math.abs(s) < 1e-12) return '0（水平）';
    return '1/' + Math.round(1 / Math.abs(s)) + '（' + r2(Math.abs(s) * 100) + '%）' + (s < 0 ? ' 逆坡' : '');
  }
  function slopeForward(i) { // n：1/n；L cm
    var drop = i.L / i.n;
    return { drop: drop, slope: 1 / i.n };
  }
  function judgeSlope(s, reqS) {
    if (!isNum(s)) return 'na';
    if (s < -EPS) return 'fail';
    return judgeMin(s, reqS, pctAllow(reqS));
  }
  // 兩點判定：elevA、elevB 已換算為高程（cm，向上為正），水流 A→B
  function slopeTwoPoint(i) {
    var drop = i.elevA - i.elevB, s = drop / i.dist, reqS = 1 / i.n;
    var items = [mk({ key: 'slope', label: '實際坡度（A→B）', measured: s, required: reqS, unit: 'slope', op: '≥', status: judgeSlope(s, reqS),
      basis: '依圖說規定坡度 1/' + i.n, tolNote: '未列於 RC04-7，採 ±5%', note: s < -EPS ? '逆坡：B 點高於 A 點 ' + r1(-drop) + ' cm' : '落差 ' + r1(drop) + ' cm／距離 ' + r2(i.dist / 100) + ' m' })];
    return result(items, { drop: drop, slope: s }, { pts: [{ name: 'A', x: 0, z: i.elevA }, { name: 'B', x: i.dist, z: i.elevB }], reqS: reqS });
  }
  // 讀數換算高程：method = elev／tape（基準線往下量，越大越低）／level（水準儀，第 0 點讀數視為後視）
  function toElevations(method, pts, startElev) {
    var z = [], HI = null;
    for (var k = 0; k < pts.length; k++) {
      var p = pts[k];
      if (method === 'elev') z.push(p.r);
      else if (method === 'tape') z.push(-p.r);
      else {
        if (k === 0) { z.push(isNum(startElev) ? startElev : 0); HI = z[0] + p.r; }
        else { z.push(HI - p.r); }
        if (k > 0 && isNum(p.bs)) HI = z[k] + p.bs; // 轉點：儀器搬站後對此點之後視
      }
    }
    return z;
  }
  function slopeProfile(i) {
    var pts = i.points.filter(function (p) { return isNum(p.x) && isNum(p.r); });
    var items = [], reqS = 1 / i.n;
    if (pts.length < 2) return result([infoItem('few', '測點不足', '至少需要 2 個測點')], {}, {});
    var z = toElevations(i.method, pts, i.startElev);
    var seg = [];
    for (var k = 1; k < pts.length; k++) {
      var dx = pts[k].x - pts[k - 1].x, s = dx > 0 ? (z[k - 1] - z[k]) / dx : NaN;
      seg.push({ from: pts[k - 1].name, to: pts[k].name, s: s, st: dx > 0 ? judgeSlope(s, reqS) : 'na' });
      items.push(mk({ key: 'seg' + k, label: '區段 ' + pts[k - 1].name + '→' + pts[k].name, measured: s, required: reqS, unit: 'slope', op: '≥',
        status: seg[k - 1].st, basis: '依圖說規定坡度 1/' + i.n, tolNote: '未列於 RC04-7，採 ±5%', note: dx > 0 ? (s < -EPS ? '逆坡' : '') : '距離須遞增' }));
    }
    var ponds = [];
    for (k = 1; k < pts.length - 1; k++) if (z[k] < z[k - 1] - EPS && z[k] < z[k + 1] - EPS) ponds.push(pts[k].name);
    items.push(boolItem('pond', '積水點（中間低點）', ponds.length === 0, '多點縱斷面檢核', ponds.length ? '測點 ' + ponds.join('、') + ' 低於前後兩點，可能積水' : '', ponds.length ? ponds.join('、') : '無', '無'));
    var L = pts[pts.length - 1].x - pts[0].x, sAll = L > 0 ? (z[0] - z[z.length - 1]) / L : NaN;
    items.push(mk({ key: 'all', label: '整體坡度（首→末）', measured: sAll, required: reqS, unit: 'slope', op: '≥', status: judgeSlope(sAll, reqS), basis: '依圖說規定坡度 1/' + i.n, tolNote: '未列於 RC04-7，採 ±5%' }));
    return result(items, { z: z, seg: seg, ponds: ponds, sAll: sAll }, { pts: pts.map(function (p, k) { return { name: p.name, x: p.x, z: z[k] }; }), reqS: reqS, seg: seg, ponds: ponds });
  }
  // 地坪洩水：各點至落水頭水平距離 → 應高於落水頭之高度
  function slopeFloor(i) {
    var items = [], reqS = 1 / i.n, rows = [];
    i.points.forEach(function (p, k) {
      if (!isNum(p.x)) return;
      var need = p.x * reqS;
      rows.push({ name: p.name, x: p.x, need: need, m: p.m });
      if (isNum(p.m)) items.push(minItem('pt' + k, '測點 ' + p.name + ' 高於落水頭', p.m, r1(need), pctAllow(need), '依圖說規定坡度 1/' + i.n, '未列於 RC04-7，採 ±5%', '距落水頭 ' + r2(p.x / 100) + ' m'));
      else items.push(infoItem('pt' + k, '測點 ' + p.name + ' 應高於落水頭', r1(need) + ' cm（距落水頭 ' + r2(p.x / 100) + ' m）'));
    });
    return result(items, { rows: rows }, { rows: rows, reqS: reqS });
  }

  SC.engine = {
    parseNum: parseNum, judgeMin: judgeMin, judgeMax: judgeMax, overall: overall, ceilCm: ceilCm, r1: r1, r2: r2, slopeText: slopeText,
    ldRaw: ldRaw, developmentLength: developmentLength, tensionLap: tensionLap, compressionLap: compressionLap,
    ldhSeismic: ldhSeismic, ldhGeneral: ldhGeneral, hookExtReq: hookExtReq, bendDiaReq: bendDiaReq,
    beamHole: beamHole, lap: lap, stirrup: stirrup, cover: cover, clearSpacing: clearSpacing, lapZone: lapZone,
    anchor: anchor, embed: embed, slopeForward: slopeForward, slopeTwoPoint: slopeTwoPoint, slopeProfile: slopeProfile,
    slopeFloor: slopeFloor, toElevations: toElevations,
    // 共用判定工具（機電模組 engine-mep.js 使用）
    _h: { isNum: isNum, mk: mk, minItem: minItem, maxItem: maxItem, boolItem: boolItem, infoItem: infoItem, result: result, EPS: EPS }
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = SC.engine; require('./engine-mep.js'); }
})(typeof globalThis !== 'undefined' ? globalThis : this);

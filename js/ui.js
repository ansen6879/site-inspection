/* 畫面：首頁、模組表單（依 modules.js 自動產生）、判定結果、設定、說明。 */
(function () {
  'use strict';
  var SC = window.SC, D = SC.data, E = SC.engine, M = SC.modules;
  var app = document.getElementById('app');
  var STATUS = { pass: ['合格', '✔'], tol: ['許可差內合格', '▲'], fail: ['不合格', '✖'], na: ['待輸入', '…'], info: ['說明', 'ⓘ'], partial: ['部分合格（尚有未輸入）', '…'] };

  // ---------- 本機記憶（僅本裝置；失敗時照常運作） ----------
  function load(key, def) { try { var s = localStorage.getItem('sis:' + key); return s ? JSON.parse(s) : def; } catch (e) { return def; } }
  function save(key, v) { try { localStorage.setItem('sis:' + key, JSON.stringify(v)); } catch (e) { /* 忽略 */ } }
  var settings = Object.assign({ fc: 280, fy: 4200, frame: 'special', dagg: 2.5, contrast: false, big: false, startPage: '' }, load('settings', {}));
  // 開啟軟體時直接進入的頁面：'' 先選土建／機電；civil、mep 分類；fav 我的最愛
  var START_PAGES = { civil: { title: '土建', hash: '#/c/civil' }, mep: { title: '機電', hash: '#/c/mep' }, fav: { title: '我的最愛', hash: '#/fav' } };
  var lastCat = settings.startPage === 'civil' || settings.startPage === 'mep' ? settings.startPage : 'civil'; // 模組頁返回時回到的分類
  var backTo = ''; // 從首頁或我的最愛點進模組時，返回原頁

  // ---------- 我的最愛（存本裝置；依加入順序） ----------
  var favs = load('favs', []).filter(function (id) { return !!M.byId(id); });
  function isFav(id) { return favs.indexOf(id) >= 0; }
  function toggleFav(id) {
    var k = favs.indexOf(id);
    if (k >= 0) favs.splice(k, 1); else favs.push(id);
    save('favs', favs);
    toast(k >= 0 ? '已從我的最愛移除' : '已加入我的最愛');
    return k < 0;
  }
  function applyTheme() {
    document.documentElement.classList.toggle('hc', !!settings.contrast);
    document.documentElement.classList.toggle('bigtext', !!settings.big);
  }
  applyTheme();
  var figStyle = document.createElement('style');
  figStyle.textContent = SC.FIG_CSS;
  document.head.appendChild(figStyle);

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(x, unit) {
    if (unit === 'slope') return E.slopeText(x);
    if (typeof x !== 'number' || !isFinite(x)) return x === undefined || x === null || (typeof x === 'number') ? '—' : esc(x);
    var v = Math.round(x * 100) / 100;
    return String(v) + (unit ? ' ' + unit : '');
  }
  function setTitle(t, back, favId) {
    document.getElementById('title').textContent = t;
    document.getElementById('back').hidden = !back;
    var fb = document.getElementById('fav');
    fb.hidden = !favId;
    if (favId) paintStar(fb, isFav(favId));
    fb.dataset.id = favId || '';
  }
  function paintStar(b, on) {
    b.textContent = on ? '★' : '☆';
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? '從我的最愛移除' : '加入我的最愛');
  }

  // ---------- 首頁 ----------
  // 分類：土建、機電；共用模組（洩水坡度）兩邊都列
  var CATS = {
    civil: { title: '土建', icon: '▦', desc: '穿樑、搭接、箍筋、保護層、淨間距、錨定、埋管、洩水坡度', groups: ['civil', 'shared'] },
    mep: { title: '機電', icon: '⚡', desc: '佔積率、接地、絕緣、撒水頭、探測器、無障礙、衛浴給排水、洩水坡度', groups: ['mep', 'shared'] }
  };
  // 項目卡片：連結＋右上角星號（星號是獨立按鈕，不放在連結裡）
  function tile(m, onFavChange) {
    var w = el('div', { class: 'tilewrap' });
    var a = el('a', { class: 'tile', href: '#/m/' + m.id }, '<span class="ic" aria-hidden="true">' + m.icon + '</span><span class="tt">' + esc(m.title) + '</span><span class="ds">' + esc(m.desc) + '</span>');
    a.addEventListener('click', function () { backTo = location.hash || '#/home'; });
    var s = el('button', { type: 'button', class: 'star' });
    paintStar(s, isFav(m.id));
    s.addEventListener('click', function () { paintStar(s, toggleFav(m.id)); if (onFavChange) onFavChange(); });
    w.appendChild(a); w.appendChild(s);
    return w;
  }
  function favSection(showEmptyHint) {
    var box = el('section', { class: 'favs' });
    function draw() {
      box.innerHTML = '';
      box.appendChild(el('h2', { class: 'grp' }, '★ 我的最愛'));
      if (!favs.length) {
        if (showEmptyHint) box.appendChild(el('p', { class: 'hint empty' }, '在任何項目右上角按 ☆，就會出現在這裡。'));
        return;
      }
      var wrap = el('div', { class: 'tiles' });
      favs.forEach(function (id) { wrap.appendChild(tile(M.byId(id), draw)); });
      box.appendChild(wrap);
    }
    draw();
    return box;
  }
  function favView() {
    setTitle('我的最愛', true);
    app.innerHTML = '';
    app.appendChild(favSection(true));
    app.appendChild(startToggle('fav'));
  }
  // 依分類／模組列出判定依據（土建：規範＋參考圖；機電：各模組對應法規）
  function mepSrc(k) { var s = D.MEP.SOURCES[k]; return s.name + '（' + s.edition + '）'; }
  function footNote(cat) {
    var basis = cat === 'mep' ? Object.keys(D.MEP.SOURCES).map(mepSrc).join('、')
      : D.SOURCES.code.name + '（' + D.SOURCES.code.edition + '）、' + D.SOURCES.ref.name + ' ' + D.SOURCES.ref.edition;
    return el('p', { class: 'foot' }, '依據：' + basis + '。本工具為現場輔助判定，以核定圖說及設計者意見為準。');
  }
  function moduleBasis(m) {
    if (m.src && D.MEP.SOURCES[m.src]) { var s = D.MEP.SOURCES[m.src]; return '依 ' + s.name + '（' + s.edition + '，查核 ' + s.checked + '）'; }
    return '依 ' + D.SOURCES.code.edition + '規範（查核 ' + D.SOURCES.code.checked + '）及參考圖 ' + D.SOURCES.ref.edition;
  }
  // 固定開啟頁：'' 每次先選分類；'civil'、'mep' 直接進該分類；'fav' 直接進我的最愛
  function startToggle(cat) {
    var row = el('div', { class: 'fld pin' });
    row.appendChild(el('span', { class: 'lab' }, '開啟軟體時'));
    var seg = el('div', { class: 'seg' });
    [[cat, '直接進入「' + START_PAGES[cat].title + '」'], ['', '先選土建／機電']].forEach(function (o) {
      var b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(settings.startPage === o[0]), class: settings.startPage === o[0] ? 'on' : '' }, esc(o[1]));
      b.addEventListener('click', function () { settings.startPage = o[0]; save('settings', settings); toast(o[0] ? '下次開啟直接進入' + START_PAGES[cat].title : '下次開啟先選分類'); route(); });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    return row;
  }
  function home() {
    setTitle('現場查驗小幫手', false);
    app.innerHTML = '';
    if (favs.length) app.appendChild(favSection(false));
    app.appendChild(el('h2', { class: 'grp' }, '請選擇查驗類別'));
    var wrap = el('div', { class: 'cats' });
    Object.keys(CATS).forEach(function (k) {
      var c = CATS[k];
      var a = el('a', { class: 'cat cat-' + k, href: '#/c/' + k }, '<span class="ic" aria-hidden="true">' + c.icon + '</span><span class="tt">' + esc(c.title) + '</span><span class="ds">' + esc(c.desc) + '</span>' +
        (settings.startPage === k ? '<span class="pinned">開啟時直接進入</span>' : ''));
      wrap.appendChild(a);
    });
    app.appendChild(wrap);
    app.appendChild(el('p', { class: 'hint' }, '進入類別後，可設定「開啟軟體時直接進入」該類別；常用項目按右上角 ☆ 加入「我的最愛」。'));
    app.appendChild(el('p', { class: 'foot' }, '本工具為現場輔助判定，以核定圖說及設計者意見為準；各項判定依據列在結果下方及「說明」頁。'));
  }
  function category(cat) {
    var c = CATS[cat];
    if (!c) { location.hash = '#/home'; return; }
    setTitle(c.title, true);
    app.innerHTML = '';
    c.groups.forEach(function (g) {
      var mods = M.list.filter(function (m) { return m.group === g; });
      if (!mods.length) return;
      app.appendChild(el('h2', { class: 'grp' }, g === 'shared' ? '土建、機電共用' : c.title));
      var wrap = el('div', { class: 'tiles' });
      mods.forEach(function (m) { wrap.appendChild(tile(m)); });
      app.appendChild(wrap);
    });
    if (cat === 'mep' && M.mepPlanned.length) {
      app.appendChild(el('h2', { class: 'grp' }, '機電（開發中）'));
      var ul = el('div', { class: 'tiles' });
      M.mepPlanned.forEach(function (p) { ul.appendChild(el('div', { class: 'tile off', 'aria-disabled': 'true' }, '<span class="tt">' + esc(p.title) + '</span><span class="ds">' + esc(p.note) + '</span>')); });
      app.appendChild(ul);
    }
    app.appendChild(startToggle(cat));
    app.appendChild(footNote(cat));
  }

  // ---------- 模組頁 ----------
  function defVal(f) {
    if (typeof f.def === 'string' && f.def.charAt(0) === '@') return settings[f.def.slice(1)];
    if (f.def !== undefined) return JSON.parse(JSON.stringify(f.def));
    if (f.t === 'seg' || f.t === 'sel') return '';
    return f.t === 'num' ? NaN : '';
  }
  function moduleView(id) {
    var m = M.byId(id);
    if (!m) { location.hash = '#/'; return; }
    setTitle(m.title, true, m.id);
    var saved = load('draft:' + id, {});
    if (m.migrate) saved = m.migrate(saved) || saved; // 舊版草稿欄位轉換
    var v = {};
    m.fields.forEach(function (f) { if (f.k) v[f.k] = saved[f.k] !== undefined && saved[f.k] !== null ? saved[f.k] : defVal(f); });
    m.fields.forEach(function (f) { if (f.t === 'num' && typeof v[f.k] !== 'number') v[f.k] = E.parseNum(v[f.k]); });
    // 格式錯誤的原始輸入（保留原字串與紅框；修正前不判定合格）：主欄位存 v.__bad[key]，列表存 row.__bad[col]
    v.__bad = saved.__bad && typeof saved.__bad === 'object' ? saved.__bad : {};

    app.innerHTML = '';
    var layout = el('div', { class: 'mod' });
    var form = el('form', { class: 'form', autocomplete: 'off' });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    var out = el('section', { class: 'out', 'aria-live': 'polite' });
    layout.appendChild(form); layout.appendChild(out);
    app.appendChild(layout);
    var bar = el('div', { class: 'sumbar' });
    app.appendChild(bar);
    bar.addEventListener('click', function () { out.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

    function buildForm() {
      form.innerHTML = '';
      m.fields.forEach(function (f) {
        if (f.show && !f.show(v)) return;
        if (f.t === 'h') { form.appendChild(el('h3', { class: 'sec' }, esc(f.label))); return; }
        var row = el('div', { class: 'fld' + (f.t === 'rows' ? ' wide' : '') });
        var idf = 'f_' + f.k;
        row.appendChild(el('label', { for: idf, class: 'lab' }, esc(f.label)));
        var ctrl;
        if (f.t === 'num') {
          var unit = f.unit === '@unit' ? v.unit : f.unit;
          ctrl = el('div', { class: 'numwrap' });
          var badTxt = v.__bad[f.k];
          var inp = el('input', { id: idf, type: 'text', inputmode: 'decimal', enterkeyhint: 'next', value: badTxt !== undefined ? badTxt : isFinite(v[f.k]) ? String(v[f.k]) : '' });
          if (badTxt !== undefined) markBad(inp, NaN);
          inp.addEventListener('input', function () { var x = E.parseNum(inp.value); v[f.k] = x; setBad(v.__bad, f.k, inp.value, x); markBad(inp, x); changed(f.k, false); });
          ctrl.appendChild(inp);
          if (unit) ctrl.appendChild(el('span', { class: 'unit' }, esc(unit)));
        } else if (f.t === 'seg') {
          ctrl = el('div', { class: 'seg', role: 'radiogroup', id: idf });
          var segOpts = typeof f.opts === 'function' ? f.opts(v) : f.opts;
          // 選項隨其他欄位變動（如探測器種別）：原值不在選項內時改為預設值或第一項
          if (typeof f.opts === 'function' && segOpts.length && !segOpts.some(function (o) { return o[0] === v[f.k]; })) {
            v[f.k] = segOpts.some(function (o) { return o[0] === f.def; }) ? f.def : segOpts[0][0];
          }
          segOpts.forEach(function (o) {
            var b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(v[f.k] === o[0]), class: v[f.k] === o[0] ? 'on' : '' }, esc(o[1]));
            // 有預設值的欄位（構材、受力等）必須擇一，不可取消；其餘是非題可再按一次清除
            b.addEventListener('click', function () { var nv = (v[f.k] === o[0] && f.def === undefined) ? '' : o[0]; if (nv === v[f.k]) return; v[f.k] = nv; changed(f.k, true); });
            ctrl.appendChild(b);
          });
        } else if (f.t === 'multi') {
          // 複選：可勾多項；f.exclusive 為互斥選項（例如「確認無下列情形」）
          if (!Array.isArray(v[f.k])) v[f.k] = v[f.k] ? [v[f.k]] : [];
          ctrl = el('div', { class: 'seg multi', role: 'group', id: idf });
          f.opts.forEach(function (o) {
            var on = v[f.k].indexOf(o[0]) >= 0;
            var b = el('button', { type: 'button', role: 'checkbox', 'aria-checked': String(on), class: on ? 'on' : '' }, esc(o[1]));
            b.addEventListener('click', function () {
              var arr = v[f.k].slice(), i = arr.indexOf(o[0]);
              if (i >= 0) arr.splice(i, 1);
              else if (o[0] === f.exclusive) arr = [o[0]];
              else { arr = arr.filter(function (x) { return x !== f.exclusive; }); arr.push(o[0]); }
              v[f.k] = arr; changed(f.k, true);
            });
            ctrl.appendChild(b);
          });
        } else if (f.t === 'rows') {
          ctrl = rowsCtrl(f);
        } else {
          var opts = f.t === 'bar' ? D.BAR_ORDER.map(function (b) { return [b, b + '（' + D.BARS[b].no + '）']; })
            : f.t === 'fc' ? D.FC_OPTIONS.map(function (x) { return [String(x), x + ' kgf/cm²']; })
            : f.t === 'fy' ? D.FY_OPTIONS.map(function (x) { return [String(x.v), x.label]; })
            : typeof f.opts === 'function' ? f.opts(v) : f.opts;
          ctrl = el('select', { id: idf });
          opts.forEach(function (o) { var op = el('option', { value: o[0] }, esc(o[1])); if (String(v[f.k]) === String(o[0])) op.selected = true; ctrl.appendChild(op); });
          if (opts.length && !opts.some(function (o) { return String(o[0]) === String(v[f.k]); })) { v[f.k] = opts[0][0]; }
          ctrl.addEventListener('change', function () { v[f.k] = (f.t === 'fc' || f.t === 'fy') ? parseFloat(ctrl.value) : ctrl.value; changed(f.k, true); });
        }
        row.appendChild(ctrl);
        if (f.hint) row.appendChild(el('div', { class: 'hint' }, esc(f.hint)));
        form.appendChild(row);
      });
      var tools = el('div', { class: 'tools' });
      var clr = el('button', { type: 'button', class: 'btn ghost' }, '清除量測值');
      clr.addEventListener('click', function () { m.fields.forEach(function (f) { if (f.k) v[f.k] = defVal(f); if (f.t === 'num' && typeof v[f.k] !== 'number') v[f.k] = NaN; }); v.__bad = {}; changed('', true); });
      tools.appendChild(clr);
      form.appendChild(tools);
    }

    function rowsCtrl(f) {
      if (!Array.isArray(v[f.k])) v[f.k] = JSON.parse(JSON.stringify(f.def || []));
      var cols = f.cols.filter(function (c) { return !c.show || c.show(v); });
      var box = el('div', { class: 'rows' });
      var head = el('div', { class: 'rrow head' });
      cols.forEach(function (c) { head.appendChild(el('span', { style: 'flex:' + c.w }, esc(c.label))); });
      head.appendChild(el('span', { class: 'rx' }, ''));
      box.appendChild(head);
      v[f.k].forEach(function (rw, idx) {
        var r = el('div', { class: 'rrow' });
        cols.forEach(function (c) {
          if (c.t === 'sel') {
            var s = el('select', { style: 'flex:' + c.w, 'aria-label': c.label + ' 第' + (idx + 1) + '列' });
            if (rw[c.k] === undefined || !c.opts.some(function (o) { return o[0] === rw[c.k]; })) rw[c.k] = c.opts[0][0];
            c.opts.forEach(function (o) { var op = el('option', { value: o[0] }, esc(o[1])); if (o[0] === rw[c.k]) op.selected = true; s.appendChild(op); });
            s.addEventListener('change', function () { rw[c.k] = s.value; changed(f.k, false); });
            r.appendChild(s);
            return;
          }
          var rbad = rw.__bad && rw.__bad[c.k];
          var inp = el('input', { type: 'text', inputmode: c.t === 'num' ? 'decimal' : 'text', style: 'flex:' + c.w, 'aria-label': c.label + ' 第' + (idx + 1) + '列',
            value: rbad !== undefined ? rbad : rw[c.k] === undefined || rw[c.k] === null || (typeof rw[c.k] === 'number' && !isFinite(rw[c.k])) ? '' : String(rw[c.k]) });
          if (rbad !== undefined) markBad(inp, NaN);
          inp.addEventListener('input', function () {
            if (c.t === 'num') { var x = E.parseNum(inp.value); rw[c.k] = inp.value.trim() === '' ? null : x; if (!rw.__bad) rw.__bad = {}; setBad(rw.__bad, c.k, inp.value, x); markBad(inp, x); }
            else rw[c.k] = inp.value;
            changed(f.k, false);
          });
          r.appendChild(inp);
        });
        var del = el('button', { type: 'button', class: 'rx', 'aria-label': '刪除第' + (idx + 1) + '列' }, '✕');
        del.addEventListener('click', function () { v[f.k].splice(idx, 1); changed(f.k, true); });
        r.appendChild(del);
        box.appendChild(r);
      });
      var add = el('button', { type: 'button', class: 'btn ghost' }, esc(f.addLabel || '＋ 新增測點'));
      add.addEventListener('click', function () {
        if (f.newRow) { v[f.k].push(JSON.parse(JSON.stringify(f.newRow))); changed(f.k, true); return; }
        var last = v[f.k][v[f.k].length - 1]; var nm = last && last.name ? nextName(last.name) : 'P' + (v[f.k].length + 1);
        v[f.k].push({ name: nm }); changed(f.k, true);
      });
      box.appendChild(add);
      return box;
    }
    function nextName(n) { var c = n.charCodeAt(n.length - 1); if (/^[A-Y]$/.test(n)) return String.fromCharCode(c + 1); var mm = n.match(/^(.*?)(\d+)$/); return mm ? mm[1] + (parseInt(mm[2], 10) + 1) : n + '2'; }

    function changed(k, rebuild) {
      if (m.onChange) m.onChange(v, k);
      save('draft:' + id, v);
      if (rebuild) {
        var y = window.scrollY, act = document.activeElement && document.activeElement.id;
        buildForm(); window.scrollTo(0, y);
        if (act) { var a = document.getElementById(act); if (a) a.focus({ preventScroll: true }); }
      }
      compute();
    }

    function compute() {
      var r, vv = M.visible(m, v); // 隱藏（不適用）欄位不參與判定
      try { r = m.run(m.prep ? m.prep(vv) : vv); }
      catch (e) { out.innerHTML = '<div class="banner st-na">輸入不完整：' + esc(e.message) + '</div>'; bar.className = 'sumbar st-na'; bar.textContent = '輸入不完整'; return; }
      var nBad = M.badCount(m, v);
      if (nBad) { // 有可見欄位格式錯誤：加一筆待輸入，整體不得顯示合格
        var items = [{ key: '_bad', label: '輸入格式錯誤', status: 'na', unit: '', note: '有 ' + nBad + ' 個欄位不是有效數字（紅框），修正前不判定合格', basis: '', tolNote: '', op: '' }].concat(r.items);
        r = Object.assign({}, r, { items: items, overall: E.overall(items) });
      }
      renderResult(m, r, out, bar, vv);
    }
    buildForm(); compute();
  }

  function renderResult(m, r, out, bar, v) {
    var st = r.overall, s = STATUS[st] || STATUS.na;
    var nFail = r.items.filter(function (i) { return i.status === 'fail'; }).length, nTol = r.items.filter(function (i) { return i.status === 'tol'; }).length;
    var summary = s[1] + ' ' + s[0] + (nFail ? '（' + nFail + ' 項不合格）' : nTol ? '（' + nTol + ' 項許可差內）' : '');
    out.innerHTML = '';
    out.appendChild(el('div', { class: 'banner st-' + st }, esc(summary)));
    var figBox = el('div', { class: 'figbox' });
    try { figBox.innerHTML = m.fig(r, m.prep ? m.prep(v) : v); } catch (e) { figBox.innerHTML = '<p class="hint">圖面無法繪製：' + esc(e.message) + '</p>'; }
    out.appendChild(figBox);
    var extra = m.extra ? m.extra(r) : '';
    if (extra) out.appendChild(el('p', { class: 'extra' }, esc(extra)));
    var list = el('ul', { class: 'items' });
    r.items.forEach(function (i) {
      var li = el('li', { class: 'item st-' + i.status });
      var st2 = STATUS[i.status] || STATUS.na;
      var val = i.status === 'info' ? '' : (i.op ? '<div class="val">實測 <b>' + fmt(i.measured, i.unit) + '</b>　' + esc(i.op) + '　規定 <b>' + fmt(i.required, i.unit) + '</b></div>'
        : (i.measured !== undefined ? '<div class="val">實測 <b>' + fmt(i.measured) + '</b>　規定 <b>' + fmt(i.required) + '</b></div>' : ''));
      li.innerHTML = '<div class="ih"><span class="chip">' + st2[1] + ' ' + st2[0] + '</span><span class="il">' + esc(i.label) + '</span></div>' + val +
        (i.note ? '<div class="note">' + esc(i.note) + '</div>' : '') +
        (i.basis ? '<div class="basis">依據：' + esc(i.basis) + '</div>' : '') +
        (i.tolNote && i.status !== 'info' ? '<div class="basis">許可差：' + esc(i.tolNote) + '</div>' : '');
      list.appendChild(li);
    });
    out.appendChild(list);
    out.appendChild(el('p', { class: 'foot' }, moduleBasis(m) + '。現場輔助判定，以核定圖說及設計者意見為準。'));
    bar.className = 'sumbar st-' + st;
    bar.textContent = summary + '　看結果 ▼';
  }
  // 非空白但無法解析為數字的輸入：標紅框，判定維持待輸入
  function setBad(map, k, text, x) { if (text.trim() !== '' && !isFinite(x)) map[k] = text; else delete map[k]; }
  function markBad(inp, x) { var bad = inp.value.trim() !== '' && !isFinite(x); inp.classList.toggle('bad', bad); if (bad) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
  function toast(msg) { var t = el('div', { class: 'toast', role: 'status' }, esc(msg)); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2500); }

  // ---------- 設定 ----------
  function settingsView() {
    setTitle('設定', true);
    app.innerHTML = '';
    var f = el('form', { class: 'form' });
    function sel(label, key, opts) {
      var row = el('div', { class: 'fld' }); row.appendChild(el('label', { class: 'lab' }, esc(label)));
      var s = el('select'); opts.forEach(function (o) { var op = el('option', { value: o[0] }, esc(o[1])); if (String(settings[key]) === String(o[0])) op.selected = true; s.appendChild(op); });
      s.addEventListener('change', function () { settings[key] = s.value === '' || isNaN(parseFloat(s.value)) ? s.value : parseFloat(s.value); save('settings', settings); toast('已儲存'); });
      row.appendChild(s); f.appendChild(row);
    }
    function tog(label, key) {
      var row = el('div', { class: 'fld' }); row.appendChild(el('label', { class: 'lab' }, esc(label)));
      var seg = el('div', { class: 'seg' });
      [[true, '開'], [false, '關']].forEach(function (o) { var b = el('button', { type: 'button', class: settings[key] === o[0] ? 'on' : '' }, o[1]); b.addEventListener('click', function () { settings[key] = o[0]; save('settings', settings); applyTheme(); settingsView(); }); seg.appendChild(b); });
      row.appendChild(seg); f.appendChild(row);
    }
    f.appendChild(el('h3', { class: 'sec' }, '開啟軟體時'));
    sel('首頁', 'startPage', [['', '先選土建／機電'], ['civil', '直接進入土建'], ['mep', '直接進入機電'], ['fav', '直接進入我的最愛']]);
    f.appendChild(el('h3', { class: 'sec' }, '本案常用值（新開模組時帶入）'));
    sel('混凝土 fc\'', 'fc', D.FC_OPTIONS.map(function (x) { return [x, x + ' kgf/cm²']; }));
    sel('鋼筋 fy', 'fy', D.FY_OPTIONS.map(function (x) { return [x.v, x.label]; }));
    sel('構架類別', 'frame', [['special', '特殊抗彎矩構架（耐震）'], ['ordinary', '一般構材']]);
    sel('粗粒料最大粒徑', 'dagg', [[1.9, '19 mm'], [2.5, '25 mm'], [3.8, '38 mm']]);
    f.appendChild(el('h3', { class: 'sec' }, '顯示'));
    tog('戶外高對比', 'contrast');
    tog('大字體', 'big');
    var clr = el('button', { type: 'button', class: 'btn ghost' }, '清除各模組暫存輸入');
    clr.addEventListener('click', function () { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('sis:draft:') === 0) localStorage.removeItem(k); }); } catch (e) { } toast('已清除'); });
    f.appendChild(clr);
    app.appendChild(f);
  }

  function aboutView() {
    setTitle('說明與依據', true);
    var v = window.SC_VERSION || '';
    app.innerHTML = '<div class="prose">' +
      '<h3>判定依據</h3><ul><li>' + esc(D.SOURCES.code.name) + '（' + esc(D.SOURCES.code.edition) + '），查核日期 ' + esc(D.SOURCES.code.checked) + '</li>' +
      '<li>' + esc(D.SOURCES.ref.name) + ' ' + esc(D.SOURCES.ref.edition) + '：搭接、彎鉤、保護層、穿孔補強、梁柱配筋、許可差（表 RC04-7）</li>' +
      Object.keys(D.MEP.SOURCES).map(function (k) { var s = D.MEP.SOURCES[k]; return '<li>' + esc(s.name) + '（' + esc(s.edition) + '），查核日期 ' + esc(s.checked) + '</li>'; }).join('') + '</ul>' +
      '<p>機電項目依法規條文判定，不套用許可差；無障礙規範未註明最大、最小或範圍之定值尺寸，依 103.1 誤差 3% 以內為合格。</p>' +
      '<h3>判定方式</h3><ul><li>✔ 合格：達到規定值</li><li>▲ 許可差內合格：未達規定值，但在 RC04-7 許可差內；RC04-7 未列的數值項目採 ±5%</li><li>✖ 不合格：超出許可差；彎鉤角度、號數等是非項目不套用許可差</li></ul>' +
      '<p>搭接長度以規範公式計算（無條件進位至 cm），並列出參考圖表值；兩者最多相差 2 cm。參考圖 RC05 梁箍筋間距仍為舊制，本工具依 112年版規範 18.3.4.4（d/4、15cm、6db）。</p>' +
      '<h3>安裝到手機</h3><ul><li>Android（Chrome）：選單 →「安裝應用程式」或「加到主畫面」</li><li>iPhone／iPad（Safari）：分享 →「加入主畫面」</li><li>安裝後不需網路即可使用；有網路時自動更新。</li></ul>' +
      '<h3>關於</h3><ul><li>開發者：AnsenTAN</li><li>版本：V' + esc(v) + '</li></ul>' +
      '<p class="foot">現場輔助判定工具，以核定圖說及設計者意見為準。所有計算在本機完成，不上傳任何資料。</p></div>';
  }

  // ---------- 路由 ----------
  var firstRoute = true;
  function route() {
    var h = location.hash || '#/';
    // 剛開啟軟體（無指定頁）且設定了固定開啟的分類 → 直接進入
    if (firstRoute && (h === '#/' || h === '#') && START_PAGES[settings.startPage]) { firstRoute = false; location.replace(START_PAGES[settings.startPage].hash); return; }
    firstRoute = false;
    if (h.indexOf('#/m/') === 0) moduleView(h.slice(4));
    else if (h.indexOf('#/c/') === 0) { lastCat = h.slice(4); backTo = ''; category(lastCat); }
    else if (h === '#/fav') favView();
    else if (h === '#/settings') settingsView();
    else if (h === '#/about') aboutView();
    else home();
    window.scrollTo(0, 0);
  }
  // 返回鍵依頁面層級回上一層（不依瀏覽紀錄，避免固定開啟分類時回不到選擇頁）
  document.getElementById('back').addEventListener('click', function () {
    var h = location.hash || '#/';
    if (h.indexOf('#/m/') === 0) {
      var m = M.byId(h.slice(4));
      // 從首頁的我的最愛、最愛頁點進來的回原頁；其餘回所屬分類
      if (backTo === '#/home' || backTo === '#/' || backTo === '#/fav') { location.hash = backTo === '#/' ? '#/home' : backTo; return; }
      location.hash = '#/c/' + (m && m.group === 'civil' ? 'civil' : m && m.group === 'mep' ? 'mep' : lastCat);
    } else location.hash = '#/home';
  });
  document.getElementById('fav').addEventListener('click', function () {
    var id = this.dataset.id; if (!id) return;
    paintStar(this, toggleFav(id));
  });
  window.addEventListener('hashchange', route);
  route();

  // 離線快取
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // 新版整組快取完成並啟用後，重新載入一次，讓畫面與程式都換成同一組新版（輸入暫存在本機，不會遺失）
    // 每次換成新的 controller（含第一次安裝）都重新載入一次：第一次開啟時頁面是直接從網路載入，
    // 重新載入後改由核對過的整組快取提供（輸入暫存在本機，不會遺失）
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!reloaded) { reloaded = true; location.reload(); }
    });
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }
})();

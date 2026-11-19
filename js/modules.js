/* 模組定義：欄位與計算、圖面的對應。畫面由 ui.js 依此自動產生。 */
(function (root) {
  'use strict';
  var SC = root.SC = root.SC || {};
  var D = SC.data, E = SC.engine, G = SC.svg;
  var BAR_OPTS = D.BAR_ORDER.map(function (b) { return [b, b + '（' + D.BARS[b].no + '）']; });
  var YN = [['yes', '是'], ['no', '否']];
  function yn(x) { return x === 'yes' ? true : x === 'no' ? false : null; }
  // 表格欄位清空時存成 null／undefined，不可被乘成 0
  function num(x, k) { return typeof x === 'number' && isFinite(x) ? x * k : NaN; }

  var MODULES = [
    {
      id: 'beamHole', group: 'civil', icon: '◯', title: '穿樑檢核', desc: '孔位、孔徑、距柱面、相鄰孔、補強筋',
      fields: [
        { k: 'member', t: 'seg', label: '構材', opts: [['beam', '梁'], ['ground', '地梁']], def: 'beam' },
        { k: 'h', t: 'num', label: '梁深 h（地梁為 H）', unit: 'cm' },
        { k: 'b', t: 'num', label: '梁寬 b', unit: 'cm', show: function (v) { return v.member === 'ground'; } },
        { t: 'h', label: '孔徑與位置' },
        { k: 'pipeType', t: 'sel', label: '孔徑來源', opts: [['manual', '直接輸入孔徑'], ['SGP', D.PIPE_OD.types.SGP.label], ['PVC', D.PIPE_OD.types.PVC.label]], def: 'manual' },
        { k: 'pipeSize', t: 'sel', label: '標稱管徑', opts: function (v) { var t = D.PIPE_OD.types[v.pipeType]; return t ? Object.keys(t.sizes).map(function (s) { return [s, s + '　外徑 ' + t.sizes[s] + ' cm']; }) : []; }, show: function (v) { return v.pipeType !== 'manual'; }, hint: D.PIPE_OD.note },
        { k: 'sleeveAdd', t: 'num', label: '套管外徑比管外徑大', unit: 'cm', def: 0, show: function (v) { return v.pipeType !== 'manual'; }, hint: '依各案施工規範；孔徑 = 管外徑 + 此值' },
        { k: 'phi', t: 'num', label: '孔徑（套管外徑）φ', unit: 'cm', show: function (v) { return v.pipeType === 'manual'; } },
        { k: 'distFace', t: 'num', label: '孔中心距柱面', unit: 'cm', show: function (v) { return v.member !== 'ground'; } },
        { k: 'yc', t: 'num', label: '孔中心距梁頂', unit: 'cm', show: function (v) { return v.member !== 'ground'; } },
        { k: 'adjDist', t: 'num', label: '與相鄰孔中心距（選填）', unit: 'cm' },
        { k: 'adjPhi', t: 'num', label: '相鄰孔孔徑（選填）', unit: 'cm' },
        { t: 'h', label: '補強' },
        { k: 's', t: 'num', label: '原箍筋間距 s', unit: 'cm' },
        { k: 'stirBar', t: 'bar', label: '箍筋號數', def: 'D13', show: function (v) { return v.member !== 'ground'; } },
        { k: 'diagBar', t: 'sel', label: '斜筋號數', opts: [['', '—'], ['none', '未配置']].concat(BAR_OPTS), def: '', show: function (v) { return v.member !== 'ground'; } },
        { k: 'nCut', t: 'num', label: '被切斷箍筋數（選填，空白時以 φ/s 估算）', unit: '支' },
        { k: 'sideL', t: 'num', label: '孔左側補強箍筋', unit: '支' },
        { k: 'sideR', t: 'num', label: '孔右側補強箍筋', unit: '支' },
        { k: 'uStirrup', t: 'seg', label: '已配置ㄇ形箍筋', opts: YN, show: function (v) { return v.member !== 'ground'; } },
        { k: 'tbCount', t: 'num', label: '孔上、下補強筋（每側根數）', unit: '根', show: function (v) { return v.member === 'ground'; } },
        { k: 'tbBar', t: 'bar', label: '孔上、下補強筋號數', def: 'D19', show: function (v) { return v.member === 'ground'; } }
      ],
      prep: function (v) {
        var o = Object.assign({}, v);
        if (v.pipeType !== 'manual') { var t = D.PIPE_OD.types[v.pipeType]; var od = t && t.sizes[v.pipeSize]; o.phi = typeof od === 'number' ? od + (isFinite(v.sleeveAdd) ? v.sleeveAdd : 0) : NaN; }
        o.uStirrup = yn(v.uStirrup);
        return o;
      },
      run: function (o) { return E.beamHole(o); }, fig: G.beamHole
    },
    {
      id: 'lap', group: 'civil', icon: '═', title: '鋼筋搭接', desc: '受拉甲／乙級、受壓搭接長度',
      fields: [
        { k: 'mode', t: 'seg', label: '受力', opts: [['tension', '受拉'], ['compression', '受壓']], def: 'tension' },
        { k: 'big', t: 'seg', label: '鋼筋大於 D36', opts: YN, def: 'no' },
        { k: 'bar', t: 'bar', label: '鋼筋號數', def: 'D22', show: function (v) { return v.big !== 'yes'; } },
        { k: 'fy', t: 'fy', label: '鋼筋 fy', def: '@fy' },
        { k: 'fc', t: 'fc', label: '混凝土 fc\'', def: '@fc' },
        { k: 'cls', t: 'seg', label: '搭接等級', opts: [['B', '乙級'], ['A', '甲級']], def: 'B', show: function (v) { return v.mode === 'tension'; }, hint: '甲級：(使用As/需求As) ≥ 2.0 且搭接鋼筋 ≤ 50%（規範 表 25.5.2.1）' },
        { k: 'top', t: 'seg', label: '頂層筋（下方澆置厚度 > 30cm）', opts: YN, def: 'no', show: function (v) { return v.mode === 'tension'; } },
        { k: 'spacingOK', t: 'seg', label: '淨間距 ≥ db、保護層 ≥ db 且有最少箍筋', opts: YN, def: 'yes', show: function (v) { return v.mode === 'tension'; }, hint: '否 → 採表 25.4.2.3「其他情況」公式' },
        { k: 'epoxy', t: 'sel', label: '環氧樹脂塗布', opts: [['none', '無（含鍍鋅）'], ['e12', '有（一般）ψe=1.2'], ['e15', '有（保護層 < 3db 或淨距 < 6db）ψe=1.5']], def: 'none', show: function (v) { return v.mode === 'tension'; } },
        { k: 'light', t: 'seg', label: '輕質混凝土', opts: YN, def: 'no', show: function (v) { return v.mode === 'tension'; } },
        { t: 'h', label: '現場量測' },
        { k: 'measured', t: 'num', label: '實測搭接長度', unit: 'cm' }
      ],
      prep: function (v) { var o = Object.assign({}, v); o.big = v.big === 'yes'; o.top = v.top === 'yes'; o.light = v.light === 'yes'; o.spacingOK = v.spacingOK !== 'no'; return o; },
      run: function (o) { return E.lap(o); }, fig: G.lap,
      extra: function (r) { var d = r.derived; return d.ref ? '參考圖 ' + d.refId + ' 表值：' + d.ref + ' cm（判定以規範公式為準）' : ''; }
    },
    {
      id: 'stirrup', group: 'civil', icon: '▭', title: '箍筋與繫筋', desc: '加密區、間距、彎鉤 135°、繫筋交替',
      fields: [
        { k: 'member', t: 'seg', label: '構材', opts: [['beam', '梁'], ['column', '柱']], def: 'beam' },
        { k: 'frame', t: 'seg', label: '構架類別', opts: [['special', '特殊抗彎矩構架（耐震）'], ['ordinary', '一般構材']], def: '@frame' },
        { k: 'h', t: 'num', label: '梁深 h', unit: 'cm', show: function (v) { return v.member === 'beam'; } },
        { k: 'd', t: 'num', label: '有效深度 d', unit: 'cm', show: function (v) { return v.member === 'beam'; }, hint: 'd = h − 主筋中心至最近混凝土面距離（RC05 附註5）' },
        { k: 'highShear', t: 'seg', label: 'Vs > 1.06√fc\' bw d（依設計）', opts: YN, def: 'no', show: function (v) { return v.member === 'beam' && v.frame === 'ordinary'; } },
        { k: 'b', t: 'num', label: '柱寬 b', unit: 'cm', show: function (v) { return v.member === 'column'; } },
        { k: 'hc', t: 'num', label: '柱深 h', unit: 'cm', show: function (v) { return v.member === 'column'; } },
        { k: 'Hn', t: 'num', label: '柱淨高 Hn', unit: 'cm', show: function (v) { return v.member === 'column'; } },
        { k: 'hx', t: 'num', label: '受側撐縱筋最大中心距 hx', unit: 'cm', show: function (v) { return v.member === 'column' && v.frame === 'special'; } },
        { k: 'highAxial', t: 'seg', label: 'Pu > 0.3Agfc\' 或 fc\' > 700（依設計）', opts: YN, def: 'no', show: function (v) { return v.member === 'column' && v.frame === 'special'; } },
        { k: 'longBar', t: 'bar', label: '最小縱向主筋號數', def: 'D25' },
        { k: 'fyLong', t: 'fy', label: '主筋 fy', def: '@fy' },
        { k: 'tieBar', t: 'bar', label: '箍筋號數', def: 'D13' },
        { t: 'h', label: '現場量測' },
        { k: 'x0', t: 'num', label: '第一支箍筋距柱面', unit: 'cm', show: function (v) { return v.member === 'beam' && v.frame === 'special'; } },
        { k: 'L1', t: 'num', label: '加密區長度（自柱面）', unit: 'cm', show: function (v) { return v.member === 'beam' && v.frame === 'special'; } },
        { k: 'Lo', t: 'num', label: '圍束區長度 ℓo', unit: 'cm', show: function (v) { return v.member === 'column' && v.frame === 'special'; } },
        { k: 's1', t: 'num', label: '加密區（圍束區）間距', unit: 'cm', show: function (v) { return v.frame === 'special'; } },
        { k: 's2', t: 'num', label: '一般區間距', unit: 'cm' },
        { k: 'hookAngle', t: 'seg', label: '彎鉤角度', opts: [['135', '135°'], ['90', '90°'], ['180', '180°']], def: '135' },
        { k: 'hookExt', t: 'num', label: '彎鉤直線延伸長度', unit: 'cm' },
        // 規範 18.3.4.3：梁繫筋 90°／135° 交替；但僅一側有樓板圍束時，90° 鉤應置於樓板側
        { k: 'slabSide', t: 'seg', label: '可圍束受繫筋支撐縱筋之樓板', opts: [['both', '兩側皆有（或皆無）'], ['one', '僅一側有']], hint: '規範 18.3.4.3：僅一側有樓板可圍束受繫筋支撐之縱向鋼筋時，90° 鉤應置於該側', show: function (v) { return v.member === 'beam' && v.frame === 'special'; } },
        { k: 'alternate', t: 'seg', label: '繫筋 90°／135° 交替', opts: [['yes', '交替'], ['no', '未交替'], ['na', '無繫筋']], show: function (v) { return v.member === 'beam' && v.frame === 'special' && v.slabSide === 'both'; } },
        { k: 'altLong', t: 'seg', label: '沿縱向鋼筋（上下層）相鄰繫筋端部交替', opts: [['yes', '交替'], ['no', '未交替'], ['na', '無繫筋']], show: function (v) { return v.member === 'column' && v.frame === 'special'; } },
        { k: 'altPeri', t: 'seg', label: '沿斷面周邊相鄰繫筋端部交替', opts: [['yes', '交替'], ['no', '未交替'], ['na', '無繫筋']], show: function (v) { return v.member === 'column' && v.frame === 'special'; }, hint: '規範 18.4.5.2(c)：兩個方向都須交替' },
        { k: 'hookSide', t: 'seg', label: '繫筋 90° 鉤位置', opts: [['slab', '在樓板側'], ['wrong', '不在樓板側'], ['na', '無繫筋']], show: function (v) { return v.member === 'beam' && v.frame === 'special' && v.slabSide === 'one'; } },
        { k: 'bendDia', t: 'num', label: '彎曲內直徑（選填）', unit: 'cm' },
        { k: 'nDesign', t: 'num', label: '設計根數（選填）', unit: '支' },
        { k: 'nActual', t: 'num', label: '實際根數（選填）', unit: '支' }
      ],
      prep: function (v) { var o = Object.assign({}, v); o.hookAngle = parseFloat(v.hookAngle); o.highShear = v.highShear === 'yes'; o.highAxial = v.highAxial === 'yes'; o.fyLong = parseFloat(v.fyLong); return o; },
      run: function (o) { return E.stirrup(o); }, fig: G.stirrup
    },
    {
      id: 'cover', group: 'civil', icon: '▣', title: '保護層', desc: '依暴露環境、構材，含 RC04-7 許可差',
      fields: [
        { k: 'exposure', t: 'sel', label: '暴露環境與構材', opts: D.COVER_CASES.map(function (c) { return [c.id, c.label]; }), def: 'beamcol' },
        { k: 'barGroup', t: 'seg', label: '鋼筋', opts: D.COVER_BAR_GROUPS.map(function (g) { return [g.id, g.label]; }), def: 'mid', show: function (v) { return v.exposure === 'weather' || v.exposure === 'slab'; } },
        { k: 'face', t: 'seg', label: '量測面', opts: [['bottom', '底面'], ['side', '側面'], ['top', '頂面（無模板）']], def: 'side' },
        { k: 'depth', t: 'num', label: '構材深度（頂面用）', unit: 'cm', show: function (v) { return v.face === 'top'; } },
        { k: 'design', t: 'num', label: '設計保護層（空白＝規範最小值）', unit: 'cm' },
        { t: 'h', label: '現場量測' },
        { k: 'measured', t: 'num', label: '實測保護層', unit: 'cm', hint: '有箍筋時量至箍筋外緣' }
      ],
      run: function (o) { return E.cover(o); }, fig: G.cover
    },
    {
      id: 'clearSpacing', group: 'civil', icon: '⋯', title: '主筋淨間距', desc: '同層淨距、上下層淨距',
      fields: [
        { k: 'member', t: 'seg', label: '構材', opts: [['beam', '梁、版'], ['column', '柱、牆邊界']], def: 'beam' },
        { k: 'bar', t: 'bar', label: '鋼筋號數', def: 'D25' },
        { k: 'dagg', t: 'num', label: '粗粒料最大粒徑', unit: 'cm', def: '@dagg' },
        { t: 'h', label: '現場量測' },
        { k: 'measured', t: 'num', label: '同層淨間距', unit: 'cm' },
        { k: 'layer', t: 'num', label: '上下層淨距（選填）', unit: 'cm', show: function (v) { return v.member !== 'column'; } }
      ],
      run: function (o) { return E.clearSpacing(o); }, fig: G.clearSpacing
    },
    {
      id: 'lapZone', group: 'civil', icon: '⇔', title: '搭接位置', desc: '梁 2h 禁區、上下層筋範圍、柱中段',
      fields: [
        { k: 'member', t: 'seg', label: '構材', opts: [['beam', '梁'], ['column', '柱']], def: 'beam' },
        { k: 'layer', t: 'seg', label: '主筋', opts: [['top', '上層筋'], ['bottom', '下層筋']], def: 'top', show: function (v) { return v.member === 'beam'; } },
        { k: 'Ln', t: 'num', label: '淨跨 Ln', unit: 'cm', show: function (v) { return v.member === 'beam'; } },
        { k: 'h', t: 'num', label: '梁深 h', unit: 'cm', show: function (v) { return v.member === 'beam'; } },
        { k: 'leftType', t: 'seg', label: '左端支承', opts: [['ext', '外端'], ['int', '內支承']], def: 'ext', show: function (v) { return v.member === 'beam' && v.layer === 'top'; } },
        { k: 'rightType', t: 'seg', label: '右端支承', opts: [['int', '內支承'], ['ext', '外端']], def: 'int', show: function (v) { return v.member === 'beam' && v.layer === 'top'; } },
        { k: 'bar', t: 'bar', label: '主筋號數（算伸展長度）', def: 'D25', show: function (v) { return v.member === 'beam'; } },
        { k: 'fy', t: 'fy', label: '主筋 fy', def: '@fy', show: function (v) { return v.member === 'beam'; } },
        { k: 'fc', t: 'fc', label: 'fc\'', def: '@fc', show: function (v) { return v.member === 'beam'; } },
        { k: 'd', t: 'num', label: '有效深度 d（檢核搭接區箍筋用）', unit: 'cm', show: function (v) { return v.member === 'beam'; } },
        { k: 'Hn', t: 'num', label: '柱淨高 Hn', unit: 'cm', show: function (v) { return v.member === 'column'; } },
        { t: 'h', label: '現場量測' },
        { k: 'x1', t: 'num', label: '搭接起點（梁：距左柱面；柱：距樓板頂）', unit: 'cm' },
        { k: 'len', t: 'num', label: '搭接長度', unit: 'cm' },
        { k: 'sLap', t: 'num', label: '搭接範圍箍筋間距（選填）', unit: 'cm', show: function (v) { return v.member === 'beam'; } }
      ],
      prep: function (v) { var o = Object.assign({}, v); o.fy = parseFloat(v.fy); o.fc = parseFloat(v.fc); return o; },
      run: function (o) { return E.lapZone(o); }, fig: G.lapZone
    },
    {
      id: 'anchor', group: 'civil', icon: '⌐', title: '錨定長度', desc: '耐震接頭彎鉤、一般彎鉤、直通鋼筋',
      fields: [
        { k: 'type', t: 'sel', label: '型式', opts: [['seismic', '耐震接頭標準彎鉤 ℓdh（RC04-1）'], ['straight', '穿越接頭直通鋼筋'], ['general', '一般標準彎鉤 ℓdh（RC03-5）']], def: 'seismic' },
        { k: 'bar', t: 'bar', label: '鋼筋號數', def: 'D25' },
        { k: 'fy', t: 'fy', label: '鋼筋 fy', def: '@fy' },
        { k: 'fc', t: 'fc', label: 'fc\'', def: '@fc' },
        { k: 'epoxy', t: 'seg', label: '環氧樹脂塗布', opts: YN, def: 'no' },
        { k: 'light', t: 'seg', label: '輕質混凝土', opts: YN, def: 'no' },
        { k: 'deepPour', t: 'seg', label: '鋼筋下方一次澆置深度 > 30cm', opts: YN, def: 'no', show: function (v) { return v.type === 'straight'; } },
        { k: 'confined', t: 'seg', label: '彎鉤有足夠圍束（ψr = 1.0）', opts: YN, def: 'yes', show: function (v) { return v.type === 'general'; }, hint: 'Ath ≥ 0.4Ahs 或中心距 ≥ 6db' },
        { k: 'inCore', t: 'seg', label: '彎鉤在柱核心內且側保護層 ≥ 6.5cm（ψo = 1.0）', opts: YN, def: 'yes', show: function (v) { return v.type === 'general'; } },
        { t: 'h', label: '現場量測' },
        { k: 'measured', t: 'num', label: '實測埋置長度（自臨界斷面）', unit: 'cm' },
        { k: 'tail', t: 'num', label: '90° 彎鉤自由端長度（選填）', unit: 'cm', show: function (v) { return v.type !== 'straight'; } }
      ],
      prep: function (v) { var o = Object.assign({}, v); ['epoxy', 'light', 'deepPour'].forEach(function (k) { o[k] = v[k] === 'yes'; }); o.confined = v.confined !== 'no'; o.inCore = v.inCore !== 'no'; return o; },
      run: function (o) { return E.anchor(o); }, fig: G.anchor,
      extra: function (r) { return r.derived.ref ? '參考圖 RC04-1 表值：' + r.derived.ref + ' cm' : ''; }
    },
    {
      id: 'embed', group: 'civil', icon: '⊙', title: '埋管', desc: '梁、柱、版牆內預埋管線',
      fields: [
        { k: 'member', t: 'seg', label: '構材', opts: [['beam', '梁'], ['column', '柱'], ['slab', '版、牆']], def: 'slab' },
        { k: 'id', t: 'num', label: '埋管內徑', unit: 'cm', show: function (v) { return v.member !== 'slab'; } },
        { k: 'rows', t: 'seg', label: '排列', opts: [['single', '一排'], ['multi', '多排']], show: function (v) { return v.member === 'beam'; } },
        { k: 'b', t: 'num', label: '柱寬', unit: 'cm', show: function (v) { return v.member === 'column'; } },
        { k: 'hc', t: 'num', label: '柱深', unit: 'cm', show: function (v) { return v.member === 'column'; } },
        { k: 'n', t: 'num', label: '埋管支數', unit: '支', show: function (v) { return v.member === 'column'; } },
        { k: 'od', t: 'num', label: '管外徑', unit: 'cm', show: function (v) { return v.member !== 'beam'; } },
        { k: 'extra', t: 'num', label: '彎出水平投影及配件面積（選填）', unit: 'cm²', show: function (v) { return v.member === 'column'; } },
        { k: 't', t: 'num', label: '版、牆厚 t', unit: 'cm', show: function (v) { return v.member === 'slab'; } },
        { k: 'spacing', t: 'num', label: '管中心間距', unit: 'cm', show: function (v) { return v.member === 'slab'; } },
        { k: 'coverOut', t: 'num', label: '管外包混凝土厚（選填）', unit: 'cm', show: function (v) { return v.member === 'slab'; } },
        { k: 'exposed', t: 'seg', label: '直接受風雨侵襲', opts: YN, def: 'no', show: function (v) { return v.member === 'slab'; } },
        { k: 'between', t: 'seg', label: '管位於上下層鋼筋之間', opts: YN, show: function (v) { return v.member === 'slab'; } }
      ],
      prep: function (v) { var o = Object.assign({}, v); o.exposed = v.exposed === 'yes'; return o; },
      run: function (o) { return E.embed(o); }, fig: G.embed
    },
    {
      id: 'slope', group: 'shared', icon: '⟋', title: '洩水坡度', desc: '正算、兩點判定、多點縱斷面、地坪洩水',
      fields: [
        { k: 'mode', t: 'sel', label: '計算方式', opts: [['forward', '① 正算：坡度 × 長度 → 落差'], ['two', '② 兩點判定'], ['profile', '③ 多點檢測（找逆坡、積水點）'], ['floor', '④ 地坪洩水放樣／檢核']], def: 'two' },
        { k: 'preset', t: 'sel', label: '用途', opts: D.SLOPE_PRESETS.map(function (p) { return [p.id, p.label]; }), def: 'custom' },
        { k: 'n', t: 'num', label: '規定坡度 1/n 的 n', unit: '', def: 100, hint: '例：1/100 填 100；1% = 1/100' },
        { k: 'L', t: 'num', label: '水平長度', unit: 'm', show: function (v) { return v.mode === 'forward'; } },
        { k: 'method', t: 'seg', label: '量測方式', opts: [['tape', '捲尺'], ['level', '水準儀＋標尺'], ['elev', '直接輸入高程']], def: 'tape', show: function (v) { return v.mode === 'two' || v.mode === 'profile'; } },
        { k: 'unit', t: 'seg', label: '讀數單位', opts: [['cm', 'cm'], ['mm', 'mm'], ['m', 'm']], def: 'cm', show: function (v) { return v.mode === 'two' || v.mode === 'profile'; },
          hint: '捲尺：自水平基準線（水線）往下量，數字越大越低；水準儀：標尺讀數越大越低' },
        { t: 'h', label: '測點', show: function (v) { return v.mode !== 'forward'; } },
        { k: 'dist', t: 'num', label: 'A→B 水平距離', unit: 'm', show: function (v) { return v.mode === 'two'; } },
        { k: 'a', t: 'num', label: 'A 點（上游）讀數', unit: '@unit', show: function (v) { return v.mode === 'two'; } },
        { k: 'b', t: 'num', label: 'B 點（下游）讀數', unit: '@unit', show: function (v) { return v.mode === 'two'; } },
        { k: 'pts', t: 'rows', label: '測點（自上游往下游）', show: function (v) { return v.mode === 'profile'; },
          cols: [{ k: 'name', t: 'text', label: '點名', w: 2 }, { k: 'x', t: 'num', label: '累計距離 m', w: 3 }, { k: 'r', t: 'num', label: '讀數', w: 3 }, { k: 'bs', t: 'num', label: '轉點後視', w: 3, show: function (v) { return v.method === 'level'; } }],
          def: [{ name: 'A', x: 0 }, { name: 'B' }, { name: 'C' }], hint: '水準儀：第 1 點讀數當後視；搬站時在轉點填「轉點後視」' },
        { k: 'fpts', t: 'rows', label: '測點（距落水頭）', show: function (v) { return v.mode === 'floor'; },
          cols: [{ k: 'name', t: 'text', label: '點名', w: 3 }, { k: 'x', t: 'num', label: '距落水頭 m', w: 4 }, { k: 'm', t: 'num', label: '實測高於落水頭 cm（選填）', w: 4 }],
          def: [{ name: '牆角1' }, { name: '牆角2' }, { name: '門口' }] }
      ],
      onChange: function (v, k) { if (k === 'preset') { var p = D.SLOPE_PRESETS.filter(function (x) { return x.id === v.preset; })[0]; if (p && p.id !== 'custom') v.n = p.n; } },
      run: function (v) {
        var unitCm = v.unit === 'mm' ? 0.1 : v.unit === 'm' ? 100 : 1;
        // 規定坡度與引擎共用同一套檢查（n 須為有限正數）
        if (!isFinite(E.reqSlope(v.n))) return { items: [{ key: 'n', label: '規定坡度', status: 'na', note: '請輸入規定坡度 1/n 的 n（正數）' }], overall: 'na', derived: {}, fig: {} };
        if (v.mode === 'forward') {
          var okL = isFinite(v.L) && v.L > 0, fw = okL ? E.slopeForward({ n: v.n, L: v.L * 100 }) : { drop: NaN, slope: E.reqSlope(v.n) };
          okL = okL && isFinite(fw.drop);
          return { items: [{ key: 'drop', label: '應有落差', status: okL ? 'info' : 'na', note: okL ? '坡度 1/' + v.n + '，長度 ' + v.L + ' m → 落差 ' + E.r1(fw.drop) + ' cm（' + E.r1(fw.drop * 10) + ' mm）' : '請輸入水平長度（正數）' }],
            overall: okL ? 'info' : 'na', derived: fw, fig: { pts: okL ? [{ name: '起點', x: 0, z: 0 }, { name: '終點', x: v.L * 100, z: -fw.drop }] : [], reqS: E.reqSlope(v.n), msg: okL ? '' : '請輸入正的水平長度' } };
        }
        if (v.mode === 'two') {
          // 同一站讀兩點：捲尺與水準儀皆為「數字越大越低」
          var z = v.method === 'elev' ? [v.a * unitCm, v.b * unitCm] : [-v.a * unitCm, -v.b * unitCm];
          return E.slopeTwoPoint({ elevA: z[0], elevB: z[1], dist: v.dist * 100, n: v.n });
        }
        if (v.mode === 'profile') {
          var filled = function (p, ks) { return ks.some(function (k) { return typeof p[k] === 'number'; }); }; // 換算前判斷是否有填
          var pts = (v.pts || []).map(function (p) { return { name: p.name || '?', x: num(p.x, 100), r: num(p.r, unitCm), bs: num(p.bs, unitCm), filled: filled(p, ['x', 'r', 'bs']) }; });
          return E.slopeProfile({ method: v.method, n: v.n, points: pts });
        }
        return E.slopeFloor({ n: v.n, points: (v.fpts || []).map(function (p) { return { name: p.name || '?', x: num(p.x, 100), m: num(p.m, 1), filled: typeof p.x === 'number' || typeof p.m === 'number' }; }) });
      },
      fig: G.slope, raw: true
    }
  ];

  // ---------- 機電（src：判定依據來源，對應 data-mep.js SOURCES）----------
  var P = D.MEP;
  var NOT_SIDE = function (v) { return v.type !== 'side'; };
  var SIDE = function (v) { return v.type === 'side'; };
  var HEAT = function (v) { return v.dtype !== 'smoke'; };
  var SMOKE = function (v) { return v.dtype === 'smoke'; };
  // 無障礙模組：依項目清單產生欄位與前處理（項目內選項 selects、是非項目 bool、條件 when）
  function makeAcc(list, defId) {
    var fields = [{ k: 'item', t: 'sel', label: '查驗項目', opts: list.map(function (x) { return [x.id, x.label + '（' + x.sec + '）']; }), def: defId }];
    function selVal(v, it, k) { var s = (it.selects || []).filter(function (x) { return x.k === k; })[0]; return v[it.id + '_' + k] || (s && s.def); }
    list.forEach(function (it) {
      (it.selects || []).forEach(function (s) {
        fields.push({ k: it.id + '_' + s.k, t: 'seg', label: s.label, opts: s.opts, def: s.def, show: function (v) { return v.item === it.id; } });
      });
      if (it.id === 'elevPanel') fields.push({ k: 'tight', t: 'seg', label: '設置位置不足（最上層放寬至 130cm）', opts: YN, def: 'no', show: function (v) { return v.item === 'elevPanel' && selVal(v, it, 'rowType') !== 'single'; } });
    });
    fields.push({ t: 'h', label: '現場量測（cm）' });
    list.forEach(function (it) {
      it.checks.forEach(function (c) {
        var show = function (v) { return v.item === it.id && (!c.when || selVal(v, it, c.when[0]) === c.when[1]); };
        if (c.kind === 'bool') fields.push({ k: it.id + '_' + c.k, t: 'seg', label: c.label, opts: YN, show: show });
        else fields.push({ k: it.id + '_' + c.k, t: 'num', label: c.label, unit: 'cm', show: show,
          hint: c.kind === 'exact' ? '定值 ' + c.v + 'cm，誤差 ≤ 3%（103.1）' : c.kind === 'range' ? '範圍 ' + c.lo + '～' + c.hi + ' cm' : c.kind === 'ref' ? '參考附錄（非強制）' + c.lo + '～' + c.hi + ' cm' : '' });
      });
      if (it.link) fields.push({ k: it.id + '_link', t: 'seg', label: '求助鈴已連至服務台或外部警示燈／聲響', opts: YN, show: function (v) { return v.item === it.id; } });
      if (it.id === 'elevPanel') fields.push({ k: 'elevPanel_touch', t: 'seg', label: '使用觸控式按鈕', opts: YN, show: function (v) { return v.item === 'elevPanel'; } });
    });
    function prep(v) {
      var o = { item: v.item, tight: v.tight === 'yes', link: yn(v[v.item + '_link']), touch: yn(v.elevPanel_touch) };
      var it = list.filter(function (x) { return x.id === v.item; })[0];
      if (it) {
        (it.selects || []).forEach(function (s) { o[s.k] = selVal(v, it, s.k); });
        it.checks.forEach(function (c) { var x = v[it.id + '_' + c.k]; o[c.k] = c.kind === 'bool' ? yn(x) : x; });
      }
      return o;
    }
    return { fields: fields, prep: prep };
  }
  var ACC = makeAcc(P.ACC_ITEMS, 'toiletBell'), ACCF = makeAcc(P.ACC_FIXTURES, 'toilet');

  var MEP_MODULES = [
    {
      id: 'conduitFill', group: 'mep', src: 'elec', icon: '◎', title: '導線管佔積率', desc: '金屬管、PVC 管內導線數與管徑',
      fields: [
        { k: 'ctype', t: 'sel', label: '導線管種類', opts: Object.keys(P.CONDUITS).map(function (k) { return [k, P.CONDUITS[k].label]; }), def: 'pvc' },
        { k: 'size', t: 'sel', label: '管徑', opts: function (v) { var c = P.CONDUITS[v.ctype]; return c ? Object.keys(c.sizes).map(function (s) { return [s, s + ' mm']; }) : []; }, def: '20' },
        { k: 'short', t: 'seg', label: '管長 6m 以下、無顯著彎曲、導線容易更換', opts: YN, def: 'no' },
        { t: 'h', label: '管內導線（含被接地導線、接地線）' },
        { k: 'wires', t: 'rows', label: '導線', addLabel: '＋ 新增線徑', newRow: { w: '3.5', n: 1 },
          cols: [{ k: 'w', t: 'sel', label: '線徑', w: 5, opts: P.WIRES.map(function (w) { return [w.id, w.label]; }).concat([['cable', '電纜（填外徑）']]) },
            { k: 'n', t: 'num', label: '條數', w: 2 }, { k: 'od', t: 'num', label: '電纜外徑 mm', w: 3 }],
          def: [{ w: '2.0', n: 3 }], hint: '單線以 mm、絞線以 mm² 表示；線徑不同請分列；多芯電纜 1 條算 1 條，填外徑 mm' }
      ],
      prep: function (v) {
        var o = Object.assign({}, v); o.size = parseFloat(v.size); o.short = yn(v.short);
        o.wires = (v.wires || []).map(function (w) { return { w: w.w || '2.0', n: typeof w.n === 'number' ? w.n : NaN, od: typeof w.od === 'number' ? w.od : NaN }; });
        return o;
      },
      run: function (o) { return E.conduitFill(o); }, fig: G.conduit
    },
    {
      id: 'groundRes', group: 'mep', src: 'elec', icon: '⏚', title: '接地電阻', desc: '特種、第一～三種接地、避雷器、漏電斷路器',
      fields: [
        { k: 'kind', t: 'sel', label: '接地種類', opts: P.GROUND.map(function (g) { return [g.id, g.label]; }), def: 'third' },
        { k: 'third', t: 'sel', label: '對地電壓', opts: P.GROUND_THIRD.map(function (g) { return [g.id, g.label + '：' + g.max + 'Ω 以下']; }), def: 'v150', show: function (v) { return v.kind === 'third'; } },
        { k: 'elcb', t: 'seg', label: '該分路裝設漏電斷路器', opts: YN, def: 'no', show: function (v) { return v.kind === 'third'; } },
        { k: 'mA', t: 'sel', label: '漏電斷路器額定靈敏度電流', opts: Object.keys(P.ELCB).map(function (k) { return [k, k + ' mA']; }), def: '30', show: function (v) { return v.kind === 'third' && v.elcb === 'yes'; } },
        { k: 'wet', t: 'seg', label: '場所', opts: [['other', '其他場所'], ['wet', '潮濕場所']], def: 'other', show: function (v) { return v.kind === 'third' && v.elcb === 'yes'; } },
        { t: 'h', label: '現場量測' },
        { k: 'measured', t: 'num', label: '接地電阻實測值', unit: 'Ω' }
      ],
      prep: function (v) { var o = Object.assign({}, v); o.elcb = v.elcb === 'yes'; o.mA = parseFloat(v.mA); o.wet = v.wet === 'wet'; return o; },
      run: function (o) { return E.groundRes(o); }, fig: G.gauge
    },
    {
      id: 'insulation', group: 'mep', src: 'elec', icon: 'Ω', title: '絕緣電阻', desc: '低壓電路絕緣電阻、洩漏電流',
      fields: [
        { k: 'circuit', t: 'sel', label: '電路電壓', opts: P.INSUL.map(function (c) { return [c.id, c.label]; }), def: 'v150' },
        { k: 'isNew', t: 'seg', label: '線路', opts: [['new', '新設線路'], ['old', '既設線路（定期測定）']], def: 'new' },
        { k: 'method', t: 'seg', label: '量測儀器', opts: [['mohm', '絕緣電阻計'], ['leak', '洩漏電流計']], def: 'mohm' },
        { t: 'h', label: '現場量測' },
        { k: 'mohm', t: 'num', label: '絕緣電阻實測值（取最低值）', unit: 'MΩ', show: function (v) { return v.method !== 'leak'; } },
        { k: 'mA', t: 'num', label: '洩漏電流實測值（取最高值）', unit: 'mA', show: function (v) { return v.method === 'leak'; } }
      ],
      prep: function (v) { var o = Object.assign({}, v); o.isNew = v.isNew !== 'old'; o.measured = v.method === 'leak' ? v.mA : v.mohm; return o; },
      run: function (o) { return E.insulation(o); }, fig: G.gauge
    },
    {
      id: 'sprinkler', group: 'mep', src: 'fire', icon: '✱', title: '撒水頭', desc: '水平距離、迴水板位置、側面有樑、標示溫度',
      fields: [
        { k: 'type', t: 'sel', label: '撒水頭種類', opts: P.SPRINKLER_TYPES.map(function (x) { return [x.id, x.label]; }), def: 'std' },
        { k: 'place', t: 'sel', label: '場所', opts: P.SPRINKLER_PLACES.map(function (x) { return [x.id, x.label]; }), def: 'other' },
        { k: 'sens1', t: 'seg', label: '撒水頭為第一種感度', opts: YN, show: function (v) { return v.type === 'small' || v.type === 'side'; } },
        { k: 'fireproof', t: 'seg', label: '防火構造建築物', opts: YN, def: 'yes', show: function (v) { return (v.type === 'std' || v.type === 'qr') && v.place !== 'stage' && v.place !== 'park'; } },
        { t: 'h', label: '配置（平面，單位 m）' },
        { k: 'layout', t: 'seg', label: '配置', opts: [['grid', '格網（兩向多支）'], ['row', '單排'], ['single', '單支']], def: 'grid', show: NOT_SIDE },
        { k: 'edge', t: 'seg', label: '檢核範圍', opts: [['yes', '含牆邊、牆角'], ['no', '僅中間區域']], def: 'yes', show: function (v) { return v.type !== 'side' && (v.layout || 'grid') === 'grid'; } },
        { k: 'a', t: 'num', label: '撒水頭間距 a（左右；單排為沿排間距）', unit: 'm', show: function (v) { return v.type !== 'side' && v.layout !== 'single'; } },
        { k: 'b', t: 'num', label: '撒水頭間距 b（前後）', unit: 'm', show: function (v) { return v.type !== 'side' && (v.layout || 'grid') === 'grid'; } },
        { k: 'wx', t: 'num', label: '最外側撒水頭至左右牆（較遠者；單排為至端牆）', unit: 'm', show: function (v) { return v.type !== 'side' && !((v.layout || 'grid') === 'grid' && v.edge === 'no'); } },
        { k: 'wy', t: 'num', label: '最外側撒水頭至前後牆（較遠者；單排為至側牆）', unit: 'm', show: function (v) { return v.type !== 'side' && !((v.layout || 'grid') === 'grid' && v.edge === 'no'); } },
        { k: 'nx', t: 'num', label: '撒水頭支數（左右方向）', unit: '支', show: function (v) { return v.type === 'small' && (v.layout || 'grid') === 'grid'; } },
        { k: 'ny', t: 'num', label: '撒水頭支數（前後方向）', unit: '支', show: function (v) { return v.type === 'small' && (v.layout || 'grid') === 'grid'; } },
        { k: 'n', t: 'num', label: '撒水頭支數（沿排）', unit: '支', show: function (v) { return v.type === 'small' && v.layout === 'row'; } },
        { k: 'roomL', t: 'num', label: '房間長度（左右方向牆間距）', unit: 'm', show: function (v) { return v.type !== 'side' && v.layout === 'single'; } },
        { k: 'roomW', t: 'num', label: '房間寬度（前後方向牆間距）', unit: 'm', show: function (v) { return v.type !== 'side' && (v.layout === 'single' || v.layout === 'row'); } },
        { k: 'roomArea', t: 'num', label: '或房間（區劃）面積（未量長寬時）', unit: 'm²', show: function (v) { return v.type === 'small' && v.layout === 'single'; }, hint: '有長寬時以長寬計算；只填面積時須與撒水頭至較遠牆距離相符' },
        { k: 'sideOne', t: 'seg', label: '撒水頭數量', opts: [['multi', '多支（沿牆）'], ['one', '單支']], def: 'multi', show: SIDE },
        { k: 'sa', t: 'num', label: '沿牆撒水頭間距', unit: 'm', show: function (v) { return v.type === 'side' && v.sideOne !== 'one'; } },
        { k: 'sx', t: 'num', label: '撒水頭至側牆（多支：端部至側牆；單支：至較遠側牆）', unit: 'm', show: SIDE },
        { k: 'depth', t: 'num', label: '房間深度（撒水頭至前方牆壁）', unit: 'm', show: SIDE },
        { t: 'h', label: '安裝位置（單位 cm）' },
        { k: 'mount', t: 'seg', label: '裝置位置', opts: [['slab', '樓板、天花板下'], ['beam', '樑下']], def: 'slab', show: NOT_SIDE },
        { k: 'd1', t: 'num', label: '迴水板距裝置面（樓板或天花板）', unit: 'cm', show: function (v) { return v.type !== 'side' && v.mount !== 'beam'; } },
        { k: 'dBeam', t: 'num', label: '迴水板距樑底', unit: 'cm', show: function (v) { return v.type !== 'side' && v.mount === 'beam'; } },
        { k: 'dSlab', t: 'num', label: '迴水板距樓板或天花板', unit: 'cm', show: function (v) { return v.type !== 'side' && v.mount === 'beam'; } },
        { k: 'sideDist', t: 'num', label: '與樑側面淨距離（側面有樑時填）', unit: 'cm', show: NOT_SIDE },
        { k: 'sideRise', t: 'num', label: '迴水板高出樑底面', unit: 'cm', show: NOT_SIDE, hint: '側面有樑時填；迴水板在樑底以下填 0 或負值' },
        { k: 'guard', t: 'seg', label: '已設防護板（側面有樑且迴水板距天花板超過 30cm 時）', opts: YN, show: NOT_SIDE },
        { k: 'wallDist', t: 'num', label: '撒水頭與牆壁間距', unit: 'cm', show: SIDE },
        { k: 'ceilDist', t: 'num', label: '迴水板與天花板或樓板間距', unit: 'cm', show: SIDE },
        { k: 'clear', t: 'seg', label: '迴水板周圍淨空（無障礙物）', opts: YN },
        { t: 'h', label: '標示溫度（選填）' },
        { k: 'ambient', t: 'num', label: '裝置場所平時最高周圍溫度', unit: '°C' },
        { k: 'marked', t: 'num', label: '撒水頭標示溫度', unit: '°C' }
      ],
      prep: function (v) {
        var o = Object.assign({}, v); o.fireproof = v.fireproof === 'yes'; o.clear = yn(v.clear); o.guard = yn(v.guard); o.sens1 = yn(v.sens1); o.edge = v.edge !== 'no'; o.sideOne = v.sideOne === 'one';
        if (v.type === 'side') { o.a = v.sa; o.wx = v.sx; }
        return o;
      },
      run: function (o) { return E.sprinkler(o); }, fig: G.sprinkler
    },
    {
      id: 'detector', group: 'mep', src: 'fire', icon: '◉', title: '火警探測器', desc: '適用高度、下端距離、個數、距牆樑與出風口',
      fields: [
        { k: 'dtype', t: 'sel', label: '探測器種類', opts: P.DETECTOR_TYPES.map(function (x) { return [x.id, x.label]; }), def: 'smoke' },
        { k: 'cls', t: 'seg', label: '種別', opts: function (v) { var t = P.DETECTOR_TYPES.filter(function (x) { return x.id === v.dtype; })[0]; return t ? t.classes : []; }, def: '2' },
        { k: 'H', t: 'num', label: '裝置面高度（高度不同時取平均）', unit: 'm' },
        { k: 'fireproof', t: 'seg', label: '防火構造建築物', opts: YN, def: 'yes', show: HEAT },
        { k: 'loc', t: 'seg', label: '設置場所', opts: [['room', '居室等'], ['corridor', '走廊、通道'], ['stair', '樓梯、斜坡'], ['shaft', '坑道、管道間']], def: 'room' },
        { k: 'must118', t: 'seg', label: '屬第 118 條所列場所（依用途判斷）', opts: YN, show: HEAT,
          hint: '供第 12 條第 1 款、第 2 款第 2、6～10 目、第 4、5 款使用之走廊或通道；或供第 12 條第 1 款、第 2 款第 2、6、8～10 目、第 5 款使用之地下層、無開口樓層、11 層以上樓層；或天花板高 15m 以上（15～20m 限偵煙式、火焰式；超過 20m 限火焰式）' },
        { k: 'env117', t: 'multi', label: '設置環境（第 117 條，可複選）', opts: P.ENV117.map(function (x) { return [x[0], x[1]]; }), def: [], exclusive: 'none',
          hint: '未勾選＝尚未確認。偵煙式不得設於所列環境；熱式依附表選設並具備必要性能' },
        { k: 'perf_dust', t: 'seg', label: P.PERF117.dust, opts: YN, show: function (v) { return P.perfNeeds(v.dtype, v.cls, v.env117).indexOf('dust') >= 0; } },
        { k: 'perf_water', t: 'seg', label: P.PERF117.water, opts: YN, show: function (v) { return P.perfNeeds(v.dtype, v.cls, v.env117).indexOf('water') >= 0; } },
        { k: 'perf_acid', t: 'seg', label: P.PERF117.acid, opts: YN, show: function (v) { return P.perfNeeds(v.dtype, v.cls, v.env117).indexOf('acid') >= 0; } },
        { t: 'h', label: '現場量測' },
        { k: 'area', t: 'num', label: '探測區域面積', unit: 'm²', show: function (v) { return v.dtype !== 'smoke' || v.loc === 'room'; }, hint: '以淨高 40cm（偵煙式 60cm）以上之樑區劃者，各區域分別計算' },
        { k: 'n', t: 'num', label: '該區域實設探測器數', unit: '個', show: function (v) { return v.dtype !== 'smoke' || v.loc === 'room'; } },
        { k: 'drop', t: 'num', label: '探測器下端距裝置面', unit: 'cm' },
        { k: 'wall', t: 'num', label: '探測器距牆壁或樑', unit: 'cm', show: SMOKE },
        { k: 'walk', t: 'num', label: '探測器步行距離間隔', unit: 'm', show: function (v) { return v.dtype === 'smoke' && v.loc === 'corridor'; } },
        { k: 'endDist', t: 'num', label: '距盡頭牆壁', unit: 'm', show: function (v) { return v.dtype === 'smoke' && v.loc === 'corridor'; } },
        { k: 'vert', t: 'num', label: '垂直距離間隔', unit: 'm', show: function (v) { return v.dtype === 'smoke' && v.loc === 'stair'; } },
        { k: 'vent', t: 'num', label: '距出風口（選填）', unit: 'm' },
        { k: 'angle', t: 'num', label: '傾斜角度（選填）', unit: '°' },
        { k: 'ambient', t: 'num', label: '平時最高周圍溫度（選填）', unit: '°C', show: function (v) { return v.dtype === 'fixed' || v.dtype === 'comp'; } },
        { k: 'nominal', t: 'num', label: '標稱動作溫度（選填）', unit: '°C', show: function (v) { return v.dtype === 'fixed' || v.dtype === 'comp'; } }
      ],
      prep: function (v) { var o = Object.assign({}, v); o.fireproof = v.fireproof === 'yes'; o.must118 = yn(v.must118); o.bad117 = yn(v.bad117); ['dust', 'water', 'acid'].forEach(function (k) { o['perf_' + k] = yn(v['perf_' + k]); }); return o; },
      // 換探測器種類或種別時，性能確認須重新回答（不同探測器）；ui 只在值實際改變時呼叫
      onChange: function (v, k) { if (k === 'dtype' || k === 'cls') { v.perf_dust = ''; v.perf_water = ''; v.perf_acid = ''; } },
      // 舊版草稿：以「屬第 117 條不得設置處所」是／否記錄 → 轉為環境複選（是＝其他確認妨礙，保留不合格；否＝確認無）
      migrate: function (s) {
        if (s && s.env117 === undefined && (s.bad117 === 'yes' || s.bad117 === 'no')) { s.env117 = s.bad117 === 'yes' ? ['other'] : ['none']; delete s.bad117; }
        if (s && typeof s.env117 === 'string') s.env117 = s.env117 ? [s.env117] : [];
        return s;
      },
      run: function (o) { return E.detector(o); }, fig: G.detector
    },
    {
      id: 'accessible', group: 'mep', src: 'acc', icon: '♿', title: '無障礙設施（機電）', desc: '求助鈴、開關插座、沖水、昇降機按鈕、水龍頭',
      fields: ACC.fields, prep: ACC.prep,
      run: function (o) { return E.accessible(o); }, fig: G.bands
    },
    {
      id: 'accFixture', group: 'mep', src: 'acc', icon: '🚻', title: '無障礙衛浴器具', desc: '馬桶、扶手、小便器、洗面盆、鏡子、浴缸、淋浴間',
      fields: ACCF.fields, prep: ACCF.prep,
      run: function (o) { return E.accessible(o); }, fig: G.bands
    },
    {
      id: 'plumbing', group: 'mep', src: 'plumb', icon: '🚰', title: '衛生器具與給排水', desc: '存水彎、口徑、用水量、水壓、排水坡度、清潔口、試壓、安裝高度',
      fields: (function () {
        var IS = function (id) { return function (v) { return v.item === id; }; };
        return [
          { k: 'item', t: 'sel', label: '查驗項目', opts: P.PLUMB_ITEMS.map(function (x) { return [x.id, x.label + '（' + x.sec + '）']; }), def: 'trap' },
          { k: 'supFix', t: 'sel', label: '器具', opts: P.SUPPLY_MIN.map(function (x) { return [x.id, x.label + '（' + x.min + 'mm 以上）']; }), def: 'basin', show: IS('supply') },
          { k: 'flowFix', t: 'sel', label: '器具', opts: P.MAX_FLOW.map(function (x) { return [x.id, x.label]; }), def: 'tap', show: IS('flow') },
          { k: 'hFix', t: 'sel', label: '器具', opts: P.DESIGN_FIXTURES.map(function (x) { return [x, x]; }), def: P.DESIGN_FIXTURES[0], show: IS('height') },
          { k: 'wallBasin', t: 'seg', label: '壁掛式洗手臺', opts: YN, def: 'no', show: IS('trap') },
          { k: 'flush', t: 'seg', label: '沖水閥或需高壓之特殊裝置', opts: YN, def: 'no', show: IS('pressure') },
          { k: 'testKind', t: 'seg', label: '試驗管路', opts: [['supply', '給水管'], ['drain', '排水、通氣管']], def: 'supply', show: IS('test') },
          { k: 'testMode', t: 'seg', label: '試驗方式', opts: [['part', '分段、分層'], ['full', '全部（灌滿）']], def: 'part', show: function (v) { return v.item === 'test' && v.testKind === 'drain'; } },
          { k: 'same', t: 'seg', label: '埋設於同一管溝', opts: YN, def: 'no', show: IS('sep') },
          { k: 'icKind', t: 'seg', label: '截留器種類', opts: [['grease', '油脂截留器'], ['sand', '砂、重固體截留器、分離器']], def: 'grease', show: IS('interceptor') },
          { t: 'h', label: '現場量測' },
          { k: 'seal', t: 'num', label: '封水深度', unit: 'cm', show: function (v) { return v.item === 'trap' || v.item === 'interceptor'; } },
          { k: 'drop', t: 'num', label: '落水口至存水彎堰口垂直距離', unit: 'cm', show: function (v) { return v.item === 'trap' && v.wallBasin === 'yes'; } },
          { k: 'clean', t: 'seg', label: '附清潔口或可拆卸', opts: YN, show: IS('trap') },
          { k: 'dia', t: 'num', label: '連接水管口徑', unit: 'mm', show: IS('supply') },
          { k: 'vb', t: 'seg', label: '已設真空破除器（沖水閥）', opts: YN, show: function (v) { return v.item === 'supply' && v.supFix === 'wcValve'; } },
          { k: 'q', t: 'num', label: '使用水量（二段式填大號）', unit: '', show: IS('flow'), hint: '水龍頭、蓮蓬頭為每分鐘公升；馬桶、小便器為每次沖水公升' },
          { k: 'q2', t: 'num', label: '小號使用水量', unit: 'L/次', show: function (v) { return v.item === 'flow' && v.flowFix === 'wc2'; } },
          { k: 'p', t: 'num', label: '水壓', unit: 'kg/cm²', show: function (v) { return v.item === 'pressure' || (v.item === 'test' && v.testKind !== 'drain'); } },
          { k: 'prv', t: 'seg', label: '已設中間水槽或減壓閥', opts: YN, show: IS('pressure') },
          { k: 'd', t: 'num', label: '出水口內徑', unit: 'mm', show: IS('airGap') },
          { k: 'gap', t: 'num', label: '出水口至溢水面高度', unit: 'mm', show: IS('airGap') },
          { k: 'pipeDia', t: 'num', label: '排水管管徑', unit: 'mm', show: function (v) { return v.item === 'drain' || v.item === 'cleanout'; } },
          { k: 'ddrop', t: 'num', label: '兩點落差', unit: 'cm', show: IS('drain') },
          { k: 'len', t: 'num', label: '水平長度', unit: 'm', show: IS('drain') },
          { k: 'spacing', t: 'num', label: '清潔口間距', unit: 'm', show: IS('cleanout') },
          { k: 'coDia', t: 'num', label: '清潔口口徑', unit: 'mm', show: IS('cleanout') },
          { k: 'space', t: 'num', label: '清潔口周圍保留空間', unit: 'cm', show: IS('cleanout') },
          { k: 'head', t: 'num', label: '最高接頭處水頭', unit: 'm', show: function (v) { return v.item === 'test' && v.testKind === 'drain' && v.testMode !== 'full'; } },
          { k: 'fill', t: 'seg', label: '開口密封並灌水至滿溢', opts: YN, show: function (v) { return v.item === 'test' && v.testKind === 'drain' && v.testMode === 'full'; } },
          { k: 'min', t: 'num', label: '保持時間', unit: '分鐘', show: IS('test') },
          { k: 'noLeak', t: 'seg', label: '無滲漏', opts: YN, show: IS('test') },
          { k: 'h', t: 'num', label: '給水管與排水管溝渠水平距離', unit: 'cm', show: function (v) { return v.item === 'sep' && v.same !== 'yes'; } },
          { k: 'vsep', t: 'num', label: '給水管底部高出排水管最高點', unit: 'cm', show: function (v) { return v.item === 'sep' && v.same === 'yes'; } },
          { k: 'design', t: 'num', label: '圖說安裝高度（距完成地坪）', unit: 'cm', show: IS('height') },
          { k: 'measured', t: 'num', label: '實測安裝高度', unit: 'cm', show: IS('height') }
        ];
      })(),
      prep: function (v) {
        var o = Object.assign({}, v);
        o.fixture = v.item === 'supply' ? v.supFix : v.item === 'flow' ? v.flowFix : v.hFix;
        o.wallBasin = v.wallBasin === 'yes'; o.flush = v.flush === 'yes'; o.same = v.same === 'yes';
        o.clean = yn(v.clean); o.vb = yn(v.vb); o.prv = yn(v.prv); o.fill = yn(v.fill); o.noLeak = yn(v.noLeak);
        o.kind = v.item === 'test' ? v.testKind : v.icKind; o.mode = v.testMode;
        o.dia = v.item === 'supply' ? v.dia : v.pipeDia; o.drop = v.item === 'drain' ? v.ddrop : v.drop; o.v = v.vsep;
        return o;
      },
      run: function (o) { return E.plumbing(o); },
      fig: function (r, o) { return r.fig.slope ? G.slope(r, o) : G.bands(r, o); }
    }
  ];
  MEP_MODULES.forEach(function (m) { MODULES.push(m); });
  var MEP_PLANNED = [];

  // 只保留目前顯示（適用）的欄位值：隱藏的數字欄為 NaN、選項欄為空白、列表為空，避免切換選項後沿用隱藏的舊值
  function visible(m, v) {
    var o = Object.assign({}, v);
    m.fields.forEach(function (f) {
      if (!f.k || !f.show || f.show(v)) return;
      o[f.k] = f.t === 'num' ? NaN : (f.t === 'rows' || f.t === 'multi') ? [] : '';
    });
    return o;
  }
  // 目前顯示的欄位中，格式錯誤（非空白但不是數字）的個數
  function badCount(m, v) {
    var n = 0, bad = v.__bad || {};
    m.fields.forEach(function (f) {
      if (!f.k || (f.show && !f.show(v))) return;
      if (f.t === 'num' && bad[f.k] !== undefined) n++;
      if (f.t === 'rows' && Array.isArray(v[f.k])) {
        var cols = (f.cols || []).filter(function (c) { return !c.show || c.show(v); }).map(function (c) { return c.k; });
        v[f.k].forEach(function (rw) { if (rw && rw.__bad) cols.forEach(function (k) { if (rw.__bad[k] !== undefined) n++; }); });
      }
    });
    return n;
  }
  SC.modules = { list: MODULES, mepPlanned: MEP_PLANNED, visible: visible, badCount: badCount, byId: function (id) { return MODULES.filter(function (m) { return m.id === id; })[0]; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);

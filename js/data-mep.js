/* 機電規範參數資料檔：所有限值集中在這裡，每一項標註出處。
 * 出處縮寫：
 *   用電規則 = 用戶用電設備裝置規則（全國法規資料庫，修正日期 115.11.04）
 *   消防標準 = 各類場所消防安全設備設置標準（全國法規資料庫，修正日期 113.04.24）
 *   無障礙規範 = 建築物無障礙設施設計規範（內政部 108.1.4 修正，108.7.1 生效；內政部主管法規共用系統現行版）
 * 附表為官方 PDF 轉錄；法規改版時只改本檔並更新 SOURCES 的查核日期，再跑測試。
 */
(function (root) {
  'use strict';
  var SC = root.SC = root.SC || {};
  SC.data = SC.data || {};

  var SOURCES = {
    elec: { name: '用戶用電設備裝置規則', edition: '115.11.04 修正', checked: '2026-11-18' },
    fire: { name: '各類場所消防安全設備設置標準', edition: '113.04.24 修正', checked: '2026-11-18' },
    acc: { name: '建築物無障礙設施設計規範', edition: '108.7.1 生效版', checked: '2026-11-18' },
    plumb: { name: '建築物給水排水設備設計技術規範', edition: '國土署公布全文（含 4.1.3、4.4.7、4.4.8 修正；修正日期待查證）', checked: '2026-11-18' }
  };

  // ---------- 一般衛生器具與給排水（建築物給水排水設備設計技術規範；依建築技術規則建築設備編第 26 條訂定）----------
  // 3.4.2 衛生設備連接水管口徑下限（mm）；flush：採沖水閥（3.4.1 應有真空破除器；3.4.4 水壓 1.0kg/cm² 以上）
  var SUPPLY_MIN = [
    { id: 'basin', label: '洗面盆', min: 10 },
    { id: 'tub', label: '浴缸', min: 13 },
    { id: 'shower', label: '蓮蓬頭', min: 13 },
    { id: 'urinal', label: '小便器', min: 13 },
    { id: 'wcTank', label: '水洗馬桶（水箱式）', min: 10 },
    { id: 'wcValve', label: '水洗馬桶（沖水閥式）', min: 25, flush: true },
    { id: 'fountain', label: '飲水器', min: 10 },
    { id: 'tap', label: '水栓', min: 13 }
  ];
  // 3.4.3 表3-3 衛生設備最大使用水量
  var MAX_FLOW = [
    { id: 'tap', label: '水龍頭（不含浴缸水龍頭）', unit: 'L/min', max: 9 },
    { id: 'urinal', label: '小便器', unit: 'L/次', max: 3 },
    { id: 'wc1', label: '一段式水洗馬桶', unit: 'L/次', max: 6 },
    { id: 'wc2', label: '二段式水洗馬桶', unit: 'L/次', max: 6, small: 3 },
    { id: 'shower', label: '蓮蓬頭', unit: 'L/min', max: 10, min: 5 }
  ];
  // 依圖說檢核安裝高度之常見器具（國內法規無一般器具安裝高度，以核定圖說為準）
  var DESIGN_FIXTURES = ['洗面盆上緣', '小便器（斗緣）', '馬桶座墊', '水龍頭、水栓', '蓮蓬頭', '淋浴龍頭', '洗槽（拖布盆）', '毛巾架、衛生紙架', '鏡子底緣', '其他'];
  var PLUMB_ITEMS = [
    { id: 'trap', label: '存水彎（封水深度、壁掛洗手臺落差）', sec: '4.4' },
    { id: 'supply', label: '器具給水連接管口徑、真空破除器', sec: '3.4.1、3.4.2' },
    { id: 'flow', label: '器具最大使用水量（省水）', sec: '3.4.3' },
    { id: 'pressure', label: '器具供水水壓', sec: '3.4.4、3.4.6' },
    { id: 'airGap', label: '給水出水口空間（防逆流）', sec: '3.4.9' },
    { id: 'drain', label: '排水橫管坡度', sec: '4.2.3' },
    { id: 'cleanout', label: '清潔口（間距、周圍空間、口徑）', sec: '4.5' },
    { id: 'test', label: '給水、排水管路試壓', sec: '3.5.16、4.7.1' },
    { id: 'sep', label: '給水管與排水管間距', sec: '3.5.4、3.5.5' },
    { id: 'interceptor', label: '截留器封水深度', sec: '4.6' },
    { id: 'height', label: '器具安裝高度（依圖說）', sec: '圖說' }
  ];

  // ---------- 導線管佔積率（用電規則第 328、343 條及附表）----------
  // 表三二八～五 絕緣導線外徑截面積（含絕緣層，mm²）；row = 管徑選定表的列（2.0mm 與 3.5mm²、2.6mm 與 5.5mm² 同列）
  var WIRES = [
    { id: '1.6', label: '1.6 mm', area: 8, row: 0 },
    { id: '2.0', label: '2.0 mm', area: 13, row: 1 },
    { id: '2.6', label: '2.6 mm', area: 20, row: 2 },
    { id: '3.5', label: '3.5 mm²', area: 13, row: 1 },
    { id: '5.5', label: '5.5 mm²', area: 20, row: 2 },
    { id: '8', label: '8 mm²', area: 29, row: 3 },
    { id: '14', label: '14 mm²', area: 46, row: 4 },
    { id: '22', label: '22 mm²', area: 67, row: 5 },
    { id: '30', label: '30 mm²', area: 87, row: 6 },
    { id: '38', label: '38 mm²', area: 104, row: 7 },
    { id: '50', label: '50 mm²', area: 133, row: 8 },
    { id: '60', label: '60 mm²', area: 154, row: 9 },
    { id: '80', label: '80 mm²', area: 189, row: 10 },
    { id: '100', label: '100 mm²', area: 227, row: 11 },
    { id: '125', label: '125 mm²', area: 284, row: 12 },
    { id: '150', label: '150 mm²', area: 347, row: 13 },
    { id: '200', label: '200 mm²', area: 416, row: 14 },
    { id: '250', label: '250 mm²', area: 531, row: 15 },
    { id: '325', label: '325 mm²', area: 661, row: 16 },
    { id: '400', label: '400 mm²', area: 805, row: 17 },
    { id: '500', label: '500 mm²', area: 963, row: 18 }
  ];

  // 導線管：管徑 → [截面積 40%, 60%]（mm²）
  // minSize：線徑相同、導線數 ≤ 9 之最小管徑（key＝導線數，陣列索引＝WIRES.row；陣列較短＝表未列）
  // maxCount：線徑相同、超過 9 條之最多導線數（key＝管徑，陣列索引＝row 0～4）
  // shortMax：管長 6 米以下之最多導線數（key＝管徑，陣列索引＝row 0～3）
  var CONDUITS = {
    thick: {
      label: '厚金屬導線管（管徑以內徑表示）', art: '第 328 條', tArea: '表三二八～六', tMin: '表三二八～一', tMax: '表三二八～三', tShort: '表三二八～四',
      sizes: { 16: [84, 126], 22: [150, 225], 28: [251, 376], 36: [427, 640], 42: [574, 862], 54: [919, 1373], 70: [1520, 2281], 82: [2126, 3190], 92: [2756, 4135], 104: [3554, 5331] },
      minSize: {
        2: [16, 16, 16, 22, 22, 28, 36, 36, 36, 42, 42, 54, 54, 70, 70, 82, 82, 92, 104],
        3: [16, 16, 22, 22, 28, 28, 36, 36, 42, 42, 54, 54, 70, 70, 70, 82, 92, 92, 104],
        4: [16, 22, 22, 28, 28, 36, 36, 42, 54, 54, 54, 70, 70, 82, 82, 92, 104],
        5: [22, 22, 28, 28, 36, 42, 42, 54, 54, 70, 70, 70, 82, 82, 92, 104],
        6: [22, 22, 28, 36, 36, 42, 54, 54, 70, 70, 70, 82, 82, 92, 104],
        7: [22, 28, 28, 36, 36, 54, 54, 54, 70, 70, 82, 82, 92, 104],
        8: [28, 28, 36, 36, 42, 54, 54, 70, 70, 70, 82, 92, 104, 104],
        9: [28, 28, 36, 36, 42, 54, 70, 70, 70, 82, 82, 92, 104]
      },
      maxCount: { 28: [12], 36: [21, 18, 13], 42: [28, 25, 17, 13], 54: [45, 39, 28, 21, 15], 70: [76, 66, 47, 35, 26], 82: [106, 92, 66, 49, 36], 92: [136, 118, 85, 63, 47], 104: [177, 154, 111, 82, 61] },
      shortMax: { 16: [9, 6, 4, 2], 22: [15, 11, 7, 4] }
    },
    thin: {
      label: '薄金屬、無螺紋金屬導線管（管徑以外徑表示）', art: '第 328 條', tArea: '表三二八～七', tMin: '表三二八～二', tMax: '表三二八～三', tShort: '表三二八～四',
      sizes: { 15: [57, 85], 19: [79, 118], 25: [154, 231], 31: [256, 385], 39: [382, 573], 51: [711, 1066], 63: [1116, 1667], 75: [1636, 2455] },
      minSize: {
        2: [15, 19, 25, 25, 25, 31, 39, 39, 51, 51, 51, 63, 63, 63, 75, 75],
        3: [15, 19, 25, 25, 31, 31, 39, 39, 51, 51, 51, 63, 63, 75, 75],
        4: [25, 25, 25, 31, 31, 39, 51, 51, 51, 63, 63, 75, 75, 75],
        5: [25, 25, 31, 31, 39, 51, 51, 51, 63, 63, 75, 75],
        6: [25, 25, 31, 39, 39, 51, 51, 63, 63, 75, 75],
        7: [25, 31, 31, 39, 51, 51, 63, 63, 75, 75, 75],
        8: [31, 31, 31, 39, 51, 51, 63, 63, 75, 75],
        9: [31, 31, 39, 51, 51, 63, 63, 63, 75]
      },
      maxCount: { 31: [12, 11], 39: [19, 16, 11], 51: [35, 30, 22, 16, 12], 63: [55, 48, 34, 25, 19], 75: [81, 71, 51, 38, 18] },
      shortMax: { 15: [6, 4, 3], 19: [9, 6, 4, 2], 25: [15, 11, 7, 4] }
    },
    pvc: {
      label: '非金屬導線管（PVC、HDPE，標稱管徑）', art: '第 343 條', tArea: '表三四三～四', tMin: '表三四三～一', tMax: '表三四三～二', tShort: '表三四三～三',
      overflowTo88: true, overflowNote: '表三四三～一 註2：管徑超過 100mm 者依表三二八～八',
      sizes: { 16: [101, 152], 20: [152, 228], 28: [246, 369], 35: [384, 577], 41: [502, 753], 52: [816, 1225], 65: [1410, 2115], 80: [1892, 2808], 100: [3141, 4712], 125: [4908, 7362], 150: [6881, 10321] },
      minSize: {
        1: [16, 16, 16, 16, 16, 16, 16, 20, 20, 20, 28, 28, 35, 35, 41, 41, 52, 52, 65],
        2: [16, 16, 16, 20, 20, 28, 35, 35, 41, 41, 52, 52, 65, 65, 65, 80, 80, 100, 100],
        3: [16, 16, 16, 20, 28, 35, 35, 41, 41, 52, 52, 65, 65, 65, 80, 80, 100, 100, 100],
        4: [16, 16, 20, 28, 28, 35, 41, 41, 52, 52, 65, 65, 65, 80, 80, 100, 100],
        5: [16, 20, 28, 28, 35, 41, 41, 52, 52, 65, 65, 80, 80, 80, 100, 100],
        6: [20, 20, 28, 35, 35, 41, 52, 52, 65, 65, 65, 80, 80, 100, 100, 100],
        7: [20, 28, 28, 35, 41, 52, 52, 52, 65, 65, 80, 80, 100, 100, 100],
        8: [28, 28, 35, 35, 41, 52, 52, 65, 65, 80, 80, 80, 100, 100],
        9: [28, 28, 35, 41, 41, 52, 65, 65, 80, 80, 80, 100, 100, 100]
      },
      maxCount: { 28: [12], 35: [19, 16, 12], 41: [26, 22, 16, 12], 52: [42, 36, 26, 19, 14], 65: [70, 61, 44, 32, 24], 80: [95, 83, 59, 44, 33] },
      shortMax: { 16: [10, 7, 5, 2], 20: [15, 11, 7, 4] }
    }
  };
  // 表三二八～八：導線數 1 → 53%、2 → 31%、超過 2 → 40%（多芯電纜當作 1 條）
  function cablePct(n) { return n <= 1 ? 0.53 : n === 2 ? 0.31 : 0.40; }

  // ---------- 接地與絕緣（用電規則第 10、88、92、966 條）----------
  // 表九二 接地種類與電阻值（Ω 以下）
  var GROUND = [
    { id: 'special', label: '特種接地（三相四線多重接地系統：用戶變壓器低壓電源系統接地、高壓用電設備接地）', max: 10 },
    { id: 'first', label: '第一種接地（非接地系統：用戶高壓用電設備接地）', max: 25 },
    { id: 'second', label: '第二種接地（三相三線非接地系統：用戶變壓器低壓電源系統接地）', max: 50 },
    { id: 'third', label: '第三種接地（低壓用電設備、內線系統、變比器二次側、支持低壓設備之金屬體）', max: null },
    { id: 'arrester', label: '避雷器接地', max: 10 }
  ];
  var GROUND_THIRD = [
    { id: 'v150', label: '對地電壓 150V 以下', max: 100 },
    { id: 'v300', label: '對地電壓 151～300V', max: 50 },
    { id: 'v301', label: '對地電壓 301V 以上', max: 10 }
  ];
  // 表八八～二 漏電保護接地電阻：額定靈敏度動作電流 mA → [潮濕場所, 其他場所] Ω
  var ELCB = { 30: [500, 500], 50: [500, 500], 75: [333, 500], 100: [250, 500], 150: [166, 333], 200: [125, 250], 300: [83, 166], 500: [50, 100], 1000: [25, 50] };
  // 表一○ 低壓電路之絕緣電阻（MΩ 以上）與洩漏電流（mA 以下）
  var INSUL = [
    { id: 'v150', label: '300V 以下，對地電壓 150V 以下（如 110V、單相三線 110/220V）', mohm: 0.1 },
    { id: 'v300', label: '300V 以下，對地電壓超過 150V（如三相 220V）', mohm: 0.2 },
    { id: 'over', label: '超過 300V（如 380/220V、480V 之低壓電路）', mohm: 0.4 }
  ];
  var INSUL_NEW = 1.0, LEAK_MAX = 1.0;

  // ---------- 撒水頭（消防標準第 46～48 條）----------
  var SPRINKLER_PLACES = [
    { id: 'other', label: '一般場所（第 46 條第 1 項第 3 款）' },
    { id: 'stage', label: '舞臺、道具室、放映室、易燃物品倉庫（第 1 款）' },
    { id: 'park', label: '汽車修理廠、室內停車空間、機械停車場（第 2 款）' },
    { id: 'lodging', label: '住宿居室、病房及類似處所（第 4 款所列場所）' },
    { id: 'corridor', label: '前款場所之走廊、通道（第 5 款）' }
  ];
  var SPRINKLER_TYPES = [
    { id: 'std', label: '一般反應型（第二種感度）' },
    { id: 'qr', label: '快速反應型（第一種感度）' },
    { id: 'small', label: '小區劃型（住宿居室、病房等）' },
    { id: 'side', label: '側壁型（住宿居室、走廊等）' }
  ];
  // 任一點至撒水頭水平距離上限（m）
  function sprinklerRadius(place, type, fireproof) {
    if (place === 'stage') return { r: 1.7, basis: '消防標準第 46 條第 1 項第 1 款（1.7m）' };
    if (place === 'park') return { r: 2.1, basis: '消防標準第 46 條第 1 項第 2 款（2.1m）' };
    if (type === 'qr') return fireproof ? { r: 2.6, basis: '消防標準第 46 條第 1 項第 3 款第 2 目（快速反應型，防火構造 2.6m）' } : { r: 2.3, basis: '消防標準第 46 條第 1 項第 3 款第 2 目（快速反應型 2.3m）' };
    if (type === 'small') return { r: 2.6, basis: '消防標準第 46 條第 1 項第 4 款（小區劃型 2.6m）' };
    return fireproof ? { r: 2.3, basis: '消防標準第 46 條第 1 項第 3 款第 1 目（一般反應型，防火構造 2.3m）' } : { r: 2.1, basis: '消防標準第 46 條第 1 項第 3 款第 1 目（一般反應型 2.1m）' };
  }
  // 第 47 條第 1 項第 8 款 側面有樑：與樑側面淨距離（cm）→ 迴水板高出樑底面上限（cm）
  function sideBeamMax(d) {
    if (d < 75) return 0;
    if (d < 100) return 9;
    if (d < 150) return 14;
    return 29;
  }
  // 第 48 條 最高周圍溫度 → 標示溫度範圍（°C；hi 為「未滿」）
  function sprinklerTemp(t) {
    if (t < 39) return { lo: -Infinity, hi: 75, text: '75°C 未滿' };
    if (t < 64) return { lo: 75, hi: 121, text: '75°C 以上 121°C 未滿' };
    if (t < 106) return { lo: 121, hi: 162, text: '121°C 以上 162°C 未滿' };
    return { lo: 162, hi: Infinity, text: '162°C 以上' };
  }

  // ---------- 探測器（消防標準第 114～122 條）----------
  var DETECTOR_TYPES = [
    { id: 'diff', label: '差動式局限型', heat: true, classes: [['1', '一種'], ['2', '二種']] },
    { id: 'comp', label: '補償式局限型', heat: true, classes: [['1', '一種'], ['2', '二種']] },
    { id: 'fixed', label: '定溫式局限型', heat: true, classes: [['S', '特種'], ['1', '一種'], ['2', '二種']] },
    { id: 'smoke', label: '偵煙式局限型（光電式、離子式）', heat: false, classes: [['1', '一種'], ['2', '二種'], ['3', '三種']] }
  ];
  // 第 120 條 熱式局限型有效探測範圍（m²）：[未滿4m 防火構造, 未滿4m 其他, 4～8m 防火構造, 4～8m 其他]；null＝表列「–」
  var HEAT_AREA = {
    'diff-1': [90, 50, 45, 30], 'diff-2': [70, 40, 35, 25],
    'comp-1': [90, 50, 45, 30], 'comp-2': [70, 40, 35, 25],
    'fixed-S': [70, 40, 35, 25], 'fixed-1': [60, 30, 30, 15], 'fixed-2': [20, 15, null, null]
  };
  // 第 122 條 偵煙式有效探測範圍（m²）：[未滿4m, 4～20m]
  var SMOKE_AREA = { '1': [150, 75], '2': [150, 75], '3': [50, null] };
  // 第 117 條 特殊環境與附表：可選設之探測器（○）及必要性能（附表註二～四）
  var ENV117 = [
    ['none', '確認無下列情形'],
    ['1', '灰塵、粉末會大量滯留'], ['2', '水蒸氣會大量滯留'], ['3', '會散發腐蝕性氣體'],
    ['4', '廚房及其他平時煙會滯留'], ['5', '顯著高溫'], ['6', '排放廢氣會大量滯留'],
    ['7', '煙會大量流入'], ['8', '會結露'], ['9', '設有用火設備其火焰外露'],
    ['other', '其他（確認）會對探測器機能造成障礙']
  ];
  var ALLOW117 = {
    'diff-1': ['1', '6', '7'], 'diff-2': ['1', '6', '7'],
    'comp-1': ['1', '3', '6', '7', '8'], 'comp-2': ['1', '2', '3', '6', '7', '8'],
    'fixed-S': ['1', '2', '3', '4', '5', '6', '7', '8', '9'], 'fixed-1': ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  };
  var PERF117 = { dust: '具灰塵、粉末不易入侵之構造（附表註二）', water: '具防水性能（附表註三）', acid: '依腐蝕性氣體別具耐酸或耐鹼性能（附表註四）' };
  // 單一環境所需之性能種類（dust／water／acid），無則 null
  function perf117(type, env) {
    if (env === '1' && (type === 'diff' || type === 'comp')) return 'dust';
    if ((env === '2' || env === '4' || env === '8') && (type === 'fixed' || type === 'comp')) return 'water';
    if (env === '3' && (type === 'fixed' || type === 'comp')) return 'acid';
    return null;
  }
  // 多項環境同時成立時，可選設之環境須全部在附表內，所需性能逐項確認
  function perfNeeds(type, cls, envs) {
    var allow = ALLOW117[type + '-' + cls] || [], out = [];
    (envs || []).forEach(function (e) { var k = allow.indexOf(e) >= 0 ? perf117(type, e) : null; if (k && out.indexOf(k) < 0) out.push(k); });
    return out;
  }

  // 第 114 條 依裝置高度可選用之探測器（本工具涵蓋之局限型）
  function detectorAllowed(type, cls, H) {
    if (!(H >= 0)) return null;
    if (H < 4) return true;
    if (H < 8) {
      if (type === 'fixed') return cls === 'S' || cls === '1';
      if (type === 'smoke') return cls === '1' || cls === '2';
      return true;
    }
    if (H < 15) return type === 'smoke' && (cls === '1' || cls === '2');
    if (H < 20) return type === 'smoke' && cls === '1';
    return false;
  }

  // ---------- 無障礙設施（機電相關，無障礙規範）----------
  // 量測值皆為 cm；kind：range 範圍內、min 以上、max 以下、exact 定值（103.1 誤差 ≤ 3%）
  var ACC_ITEMS = [
    { id: 'toiletBell', label: '無障礙廁所盥洗室求助鈴', sec: '504.4', checks: [
      { k: 'b1x', label: '求助鈴 1：按鍵中心距馬桶前緣往後', kind: 'exact', v: 15, basis: '504.4.1' },
      { k: 'b1h', label: '求助鈴 1：按鍵中心高於馬桶座墊', kind: 'exact', v: 60, basis: '504.4.1' },
      { k: 'b2h', label: '求助鈴 2（跌倒用）：按鍵中心距地板面', kind: 'range', lo: 15, hi: 25, basis: '504.4.1' }],
      link: '504.4.2（連至服務台或類似空間；無服務台者連至廁所盥洗室外之警示燈或聲響）' },
    { id: 'bathBell', label: '無障礙浴室（浴缸）求助鈴', sec: '605.5', checks: [
      { k: 'w1h', label: '浴缸以外牆上求助鈴：按鍵中心距地板面', kind: 'range', lo: 90, hi: 120, basis: '605.5.1' },
      { k: 'pull', label: '連接拉桿下端距地板面', kind: 'range', lo: 15, hi: 25, basis: '605.5.1' },
      { k: 'tubH', label: '浴缸側牆求助鈴：按鍵中心高於浴缸上緣', kind: 'range', lo: 15, hi: 30, basis: '605.5.1' }],
      link: '605.5.2（連至服務台或類似空間；無服務台者連至浴室外之警示燈或聲響）' },
    { id: 'showerBell', label: '無障礙淋浴間求助鈴', sec: '606.6', checks: [
      { k: 'h1', label: '求助鈴 1：按鍵中心距地板面', kind: 'range', lo: 90, hi: 120, basis: '606.6.1' },
      { k: 'h2', label: '求助鈴 2（跌倒用）：按鍵中心距地板面', kind: 'range', lo: 15, hi: 25, basis: '606.6.1' }],
      link: '606.6.2（連至服務台或類似空間；無服務台者連至浴室外之警示燈或聲響）' },
    { id: 'roomBell', label: '無障礙客房求助鈴', sec: '1005', checks: [
      { k: 'h1', label: '求助鈴 1：按鍵中心距地板面', kind: 'range', lo: 90, hi: 120, basis: '1005.1' },
      { k: 'h2', label: '求助鈴 2（跌倒用）：按鍵中心距地板面', kind: 'range', lo: 15, hi: 25, basis: '1005.1' }],
      link: '1005.2（連至服務台或類似空間；無服務台者連至客房外部之警示燈或聲響）' },
    { id: 'toiletSwitch', label: '無障礙廁所盥洗室電燈開關', sec: '502.4', checks: [
      { k: 'h', label: '開關高度（距地板面）', kind: 'range', lo: 70, hi: 100, basis: '502.4' },
      { k: 'c', label: '距柱或牆角', kind: 'min', v: 30, basis: '502.4' }] },
    { id: 'roomOutlet', label: '無障礙客房插座及開關', sec: '1004.3', checks: [
      { k: 'h', label: '插座、開關高度（距地板面）', kind: 'range', lo: 70, hi: 100, basis: '1004.3' },
      { k: 'c', label: '距柱、牆角', kind: 'min', v: 30, basis: '1004.3' }] },
    { id: 'flush', label: '馬桶手動沖水控制', sec: '505.4', checks: [
      { k: 'x', label: '中心點距馬桶前緣往前', kind: 'exact', v: 10, basis: '505.4' },
      { k: 'h', label: '中心點高於馬桶座墊', kind: 'exact', v: 40, basis: '505.4' }],
      note: '手動沖水控制設於 L 型扶手之側牆上；馬桶旁無側面牆壁者，依手可觸及範圍（A102.3）' },
    { id: 'elevCall', label: '無障礙昇降機呼叫鈕', sec: '404.2', checks: [
      { k: 'h', label: '下組呼叫鈕中心點距地板面', kind: 'range', lo: 85, hi: 90, basis: '404.2' },
      { k: 'size', label: '呼叫鈕尺寸（長、寬或直徑）', kind: 'min', v: 2, basis: '404.2' },
      { k: 'two', label: '梯廳及門廳內設 2 組呼叫鈕，上組左邊設點字', kind: 'bool', basis: '404.2' },
      { k: 'sign', label: '下組呼叫鈕上方設 5cm×5cm 無障礙標誌', kind: 'bool', basis: '404.2' }] },
    { id: 'elevPanel', label: '昇降機輪椅使用者操作盤', sec: '406.4', selects: [{ k: 'rowType', label: '按鈕排列', opts: [['multi', '多排'], ['single', '單排']], def: 'multi' }], checks: [
      { k: 'top', label: '最上層樓層按鈕中心點距機廂地面', kind: 'max', v: 120, alt: 130, basis: '406.4', when: ['rowType', 'multi'] },
      { k: 'bot', label: '最下層按鈕中心點距機廂地面', kind: 'range', lo: 85, hi: 90, basis: '406.4', when: ['rowType', 'multi'] },
      { k: 'single', label: '樓層按鈕中心點距機廂地面', kind: 'range', lo: 85, hi: 90, basis: '406.4', when: ['rowType', 'single'] },
      { k: 'front', label: '操作盤距機廂入口壁面', kind: 'min', v: 30, basis: '406.4' },
      { k: 'back', label: '操作盤距入口對側壁面', kind: 'min', v: 20, basis: '406.4' },
      { k: 'size', label: '按鈕尺寸（長、寬或直徑）', kind: 'min', v: 2, basis: '406.5' },
      { k: 'gap', label: '按鈕間距離', kind: 'min', v: 1, basis: '406.5' },
      { k: 'keys', label: '操作盤含緊急事故通報器、各通達樓層及開、關按鍵', kind: 'bool', basis: '406.4' }] },
    { id: 'autoDoor', label: '自動門開關裝置', sec: '205.4.1', checks: [
      { k: 'h', label: '裝置中心點距地板面', kind: 'range', lo: 85, hi: 90, basis: '205.4.1' },
      { k: 'c', label: '距柱、牆角', kind: 'min', v: 30, basis: '205.4.1' },
      { k: 'reopen', label: '門受物體或人阻礙時可自動停止並重新開啟（現場試驗）', kind: 'bool', basis: '205.4.1' }] },
    { id: 'showerTap', label: '淋浴間水龍頭操作桿及蓮蓬頭', sec: '606.4', checks: [
      { k: 'h', label: '設置高度（距地板面）', kind: 'range', lo: 40, hi: 120, basis: '606.4' },
      { k: 'c', label: '距柱、牆角', kind: 'min', v: 30, basis: '606.4' }] }
  ];
  // 無障礙廁所盥洗室、浴室之衛浴器具（無障礙規範第 5、6 章）；kind 另有 bool（是非項目，應為「是」）、ref（參考附錄，非強制，只列結果不判不合格）
  // selects：項目內的選項（如扶手型式），check.when = [選項 key, 值] 時才檢查
  var ACC_FIXTURES = [
    { id: 'toilet', label: '無障礙馬桶', sec: '505.2、505.3', checks: [
      { k: 'seat', label: '座墊高度（距地板面）', kind: 'range', lo: 40, hi: 45, basis: '505.3' },
      { k: 'back', label: '背靠距馬桶前緣', kind: 'range', lo: 42, hi: 50, basis: '505.3' },
      { k: 'backGap', label: '背靠下緣與座墊淨距離', kind: 'exact', v: 20, basis: '505.3' },
      { k: 'side', label: '馬桶側邊至牆或其他器具淨距（至少一側）', kind: 'min', v: 70, basis: '505.2（圖505.2）' },
      { k: 'front', label: '馬桶前緣至前方牆或器具（如洗面盆）淨距', kind: 'min', v: 70, basis: '505.2（圖505.2）' },
      { k: 'wall', label: '馬桶中心線距側牆（扶手設於側牆時）', kind: 'max', v: 60, basis: '505.2（圖505.2）' },
      { k: 'turn', label: '廁所內迴轉空間直徑', kind: 'min', v: 150, basis: '504.1（邊緣 20cm 內符合膝蓋淨容納空間者得計入）' },
      { k: 'paper', label: '衛生紙出口距馬桶（設衛生紙架時）', kind: 'ref', lo: 45, hi: 65, basis: 'A405.1（參考附錄，非強制；紙架距馬桶前端左右 20cm 內）' },
      { k: 'noLid', label: '一般型式馬桶、不可有蓋', kind: 'bool', basis: '505.3' }] },
    { id: 'railL', label: '馬桶側邊 L 型扶手', sec: '505.5', checks: [
      { k: 'out', label: '扶手外緣距馬桶中心線', kind: 'exact', v: 35, basis: '505.5' },
      { k: 'hTop', label: '水平扶手上緣高於馬桶座墊', kind: 'exact', v: 27, basis: '505.5' },
      { k: 'vFront', label: '垂直扶手外緣距馬桶前緣', kind: 'exact', v: 27, basis: '505.5' },
      { k: 'hLen', label: '水平段長度', kind: 'min', v: 70, basis: '505.5' },
      { k: 'vLen', label: '垂直段長度', kind: 'min', v: 70, basis: '505.5' },
      { k: 'fix', label: 'L 型扶手中間固定點未設於垂直部分', kind: 'bool', basis: '505.5' }] },
    { id: 'railMove', label: '馬桶可動（掀起式）扶手', sec: '505.6', checks: [
      { k: 'out', label: '使用狀態扶手外緣距馬桶中心線', kind: 'exact', v: 35, basis: '505.6' },
      { k: 'top', label: '扶手上緣高於馬桶座墊', kind: 'exact', v: 27, basis: '505.6' },
      { k: 'over', label: '扶手突出馬桶前端長度', kind: 'range', lo: 0, hi: 15, basis: '505.6（不得短於馬桶前端，突出不得大於 15cm）' },
      { k: 'lock', label: '掀起式扶手可固定', kind: 'bool', basis: '505.6' }] },
    { id: 'urinal', label: '無障礙小便器', sec: '506', checks: [
      { k: 'rim', label: '突出端距地板面', kind: 'max', v: 38, basis: '506.3' },
      { k: 'clrL', label: '小便器中心線至左側隔板淨距', kind: 'min', v: 50, basis: '506.5' },
      { k: 'clrR', label: '小便器中心線至右側隔板淨距', kind: 'min', v: 50, basis: '506.5' },
      { k: 'railGap', label: '兩側扶手中心線距離', kind: 'exact', v: 60, basis: '506.6' },
      { k: 'railLen', label: '兩側扶手長度', kind: 'exact', v: 55, basis: '506.6' },
      { k: 'railTop', label: '兩側扶手上緣距地板面', kind: 'exact', v: 85, basis: '506.6' },
      { k: 'railBot', label: '兩側扶手下緣距地板面', kind: 'range', lo: 65, hi: 70, basis: '506.6' },
      { k: 'frontTop', label: '前方扶手上緣距地板面', kind: 'exact', v: 120, basis: '506.6' },
      { k: 'frontWall', label: '前方扶手中心線距牆壁', kind: 'exact', v: 25, basis: '506.6' },
      { k: 'level', label: '小便器前方無高差、無門檻', kind: 'bool', basis: '506.1、506.2' }] },
    { id: 'basin', label: '無障礙洗面盆', sec: '507', selects: [{ k: 'rail', label: '扶手型式', opts: [['ring', '環狀扶手'], ['fixed', '固定扶手'], ['none', '檯面式或已加安全支撐（免設扶手）']], def: 'ring' }], checks: [
      { k: 'top', label: '洗面盆上緣距地板面', kind: 'max', v: 80, basis: '507.3' },
      { k: 'knee', label: '下方淨高（距可靠近邊緣 20cm 內）', kind: 'min', v: 65, basis: '507.3、A102.6（膝蓋淨容納空間）' },
      { k: 'depth', label: '盆外緣（含環狀扶手）至水龍頭操作端、感應處、出水口', kind: 'max', v: 40, basis: '507.5' },
      { k: 'ringUp', label: '環狀扶手上緣高於洗面盆邊緣', kind: 'range', lo: 1, hi: 3, basis: '507.6', when: ['rail', 'ring'] },
      { k: 'fixOut', label: '固定扶手突出洗面盆邊緣長度', kind: 'exact', v: 25, basis: '507.6', when: ['rail', 'fixed'] },
      { k: 'fixIn', label: '兩側固定扶手內緣距離', kind: 'range', lo: 70, hi: 75, basis: '507.6', when: ['rail', 'fixed'] },
      { k: 'fixLevel', label: '固定扶手使用狀態上緣與洗面盆上緣齊平', kind: 'bool', basis: '507.6', when: ['rail', 'fixed'] },
      { k: 'lever', label: '水龍頭有撥桿或自動感應', kind: 'bool', basis: '507.4' },
      { k: 'level', label: '洗面盆前方無高差', kind: 'bool', basis: '507.2' },
      { k: 'pipe', label: '下方外露管線及器具表面無尖銳或易磨蝕', kind: 'bool', basis: '507.5' }] },
    { id: 'mirror', label: '無障礙廁所鏡子', sec: '504.3', checks: [
      { k: 'bottom', label: '鏡面底端距地板面', kind: 'max', v: 90, basis: '504.3' },
      { k: 'height', label: '鏡面高度', kind: 'min', v: 90, basis: '504.3' }] },
    { id: 'bathtub', label: '無障礙浴缸及扶手', sec: '605', checks: [
      { k: 'len', label: '浴缸內側長度', kind: 'max', v: 135, basis: '605.3' },
      { k: 'h', label: '浴缸外側距地板面', kind: 'range', lo: 40, hi: 45, basis: '605.3' },
      { k: 'front', label: '浴缸前方淨空間深度（至對面牆或器具）', kind: 'min', v: 80, basis: '605.2（長度不得小於浴缸長度）' },
      { k: 'sH', label: '側牆水平扶手上緣高於浴缸上緣', kind: 'range', lo: 15, hi: 20, basis: '605.4.1' },
      { k: 'sHLen', label: '側牆水平扶手長度', kind: 'min', v: 90, basis: '605.4.1' },
      { k: 'sVTop', label: '側牆垂直扶手上緣距浴缸底面', kind: 'min', v: 150, basis: '605.4.1' },
      { k: 'sVGap', label: '垂直扶手下緣距水平扶手上緣', kind: 'max', v: 10, basis: '605.4.1' },
      { k: 'sVBack', label: '垂直扶手距浴缸靠背側外緣', kind: 'exact', v: 70, basis: '605.4.1' },
      { k: 'oBot', label: '出水側對向牆垂直扶手下端高於浴缸上緣', kind: 'range', lo: 15, hi: 20, basis: '605.4.2' },
      { k: 'oLen', label: '出水側對向牆垂直扶手長度', kind: 'min', v: 90, basis: '605.4.2' },
      { k: 'oEdge', label: '對向牆垂直扶手距浴缸外側邊緣', kind: 'max', v: 10, basis: '605.4.2' },
      { k: 'slip', label: '浴缸底面設止滑片', kind: 'bool', basis: '605.3' }] },
    { id: 'shower', label: '無障礙淋浴間座椅及扶手', sec: '606', checks: [
      { k: 'turn', label: '淋浴間內迴轉空間直徑', kind: 'min', v: 150, basis: '606.2（邊緣 20cm 內符合膝蓋淨容納空間者得計入）' },
      { k: 'seat', label: '沐浴椅座面高度', kind: 'range', lo: 40, hi: 45, basis: '606.3' },
      { k: 'hTop', label: '水平扶手上緣距地板面', kind: 'range', lo: 75, hi: 85, basis: '606.5' },
      { k: 'hLen', label: '水平扶手長度', kind: 'min', v: 120, basis: '606.5' },
      { k: 'vTop', label: '垂直扶手上緣距地板面', kind: 'max', v: 150, basis: '606.5' },
      { k: 'vGap', label: '垂直扶手下緣距水平扶手上緣', kind: 'max', v: 10, basis: '606.5' },
      { k: 'vTap', label: '垂直扶手與水龍頭水平距離', kind: 'max', v: 40, basis: '606.5' },
      { k: 'vCorner', label: '垂直扶手距牆角', kind: 'min', v: 30, basis: '606.5' },
      { k: 'chair', label: '沐浴椅具扶手及背靠、防滑', kind: 'bool', basis: '606.3' }] }
  ];
  var ACC_EXACT_TOL = 0.03; // 無障礙規範 103.1：未註明最大、最小或限定範圍之尺寸，誤差不得大於 3%

  SC.data.MEP = {
    SOURCES: SOURCES, WIRES: WIRES, CONDUITS: CONDUITS, cablePct: cablePct,
    GROUND: GROUND, GROUND_THIRD: GROUND_THIRD, ELCB: ELCB, INSUL: INSUL, INSUL_NEW: INSUL_NEW, LEAK_MAX: LEAK_MAX,
    SPRINKLER_PLACES: SPRINKLER_PLACES, SPRINKLER_TYPES: SPRINKLER_TYPES, sprinklerRadius: sprinklerRadius, sideBeamMax: sideBeamMax, sprinklerTemp: sprinklerTemp,
    DETECTOR_TYPES: DETECTOR_TYPES, HEAT_AREA: HEAT_AREA, SMOKE_AREA: SMOKE_AREA, detectorAllowed: detectorAllowed, ENV117: ENV117, ALLOW117: ALLOW117, perf117: perf117, PERF117: PERF117, perfNeeds: perfNeeds,
    ACC_ITEMS: ACC_ITEMS, ACC_FIXTURES: ACC_FIXTURES, ACC_EXACT_TOL: ACC_EXACT_TOL,
    SUPPLY_MIN: SUPPLY_MIN, MAX_FLOW: MAX_FLOW, DESIGN_FIXTURES: DESIGN_FIXTURES, PLUMB_ITEMS: PLUMB_ITEMS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SC.data.MEP;
})(typeof globalThis !== 'undefined' ? globalThis : this);

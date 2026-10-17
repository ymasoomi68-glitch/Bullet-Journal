/* دفتر برنامه روزانه — منطق برنامه */
(function () {
  'use strict';

  var J = window.Jalali;
  var store = window.localforage;

  /* ============================================================
   * کارهای روزانه (ترتیب همان ترتیبی است که نمایش داده می‌شود)
   * ============================================================ */
  var DEFAULT_TASKS = [
    { id: 'wake',    title: 'بیدار شدن و صبحانه خوردن', icon: '🌅', hue: 32 },
    { id: 'dishes',  title: 'شستن ظرف‌ها',               icon: '🍽️', hue: 200 },
    { id: 'cook',    title: 'پختن غذا',                  icon: '🍳', hue: 18 },
    { id: 'lunch',   title: 'خوردن ناهار',               icon: '🥗', hue: 140 },
    { id: 'dust',    title: 'گردگیری',                   icon: '✨', hue: 280 },
    { id: 'laundry', title: 'شستن لباس‌ها',              icon: '👕', hue: 215 },
    { id: 'study',   title: 'خواندن درس',                icon: '📚', hue: 255 },
    { id: 'self',    title: 'به خود رسیدن',              icon: '💅', hue: 335 },
    { id: 'sweep',   title: 'جارو کردن خانه',            icon: '🧹', hue: 45 },
    { id: 'dinner',  title: 'خوردن شام',                 icon: '🍲', hue: 5 }
  ];
  /* همهٔ کارها، از جمله کارهای حذف‌شده (برای حفظ سابقه در گزارش‌ها).
   * هر کار بازهٔ فعال بودن دارد: from (اولین روز) و to (آخرین روز)؛ null یعنی بدون محدودیت. */
  var TASKS = [];
  var ICONS = ['🌅', '🍽️', '🍳', '🥗', '✨', '👕', '📚', '💅', '🧹', '🍲',
               '🛒', '🧺', '🪴', '💧', '☕', '🛏️', '🧼', '📞', '🎨', '🧵',
               '🍎', '💊', '🌙', '📝', '🚿', '🧽', '🍰', '🎧', '🌷', '⭐'];
  var HUES = [330, 200, 140, 280, 45, 18, 255, 5, 170, 95];
  var FONT_PX = { sm: '14px', md: '16px', lg: '18px', xl: '20px' };
  var FONT_LABEL = { sm: 'کوچک', md: 'متوسط', lg: 'بزرگ', xl: 'خیلی بزرگ' };

  function isIso(s) { return typeof s === 'string' && !isNaN(J.fromIso(s)); }

  function prepTask(t) {
    t.f = t.from ? J.fromIso(t.from) : -Infinity;
    t.e = t.to ? J.fromIso(t.to) : Infinity;
    return t;
  }
  function resetTasks() {
    TASKS = DEFAULT_TASKS.map(function (t) {
      return prepTask({ id: t.id, title: t.title, icon: t.icon, hue: t.hue, from: null, to: null });
    });
  }
  function sanitizeTasks(arr) {
    if (!Array.isArray(arr) || !arr.length) return null;
    var seen = Object.create(null), out = [];
    arr.forEach(function (t) {
      if (!t || typeof t.id !== 'string' || typeof t.title !== 'string' || !t.title.trim() || seen[t.id]) return;
      seen[t.id] = true;
      out.push(prepTask({
        id: t.id.slice(0, 40), title: t.title.trim().slice(0, 40),
        icon: (typeof t.icon === 'string' && t.icon) ? t.icon.slice(0, 8) : '⭐',
        hue: typeof t.hue === 'number' ? t.hue : 330,
        from: isIso(t.from) ? t.from : null, to: isIso(t.to) ? t.to : null
      }));
    });
    return out.length ? out : null;
  }
  function isActive(t, j) { return j >= t.f && j <= t.e; }
  function dayTasks(j) { return TASKS.filter(function (t) { return isActive(t, j); }); }
  function findTask(id) {
    for (var i = 0; i < TASKS.length; i++) if (TASKS[i].id === id) return TASKS[i];
    return null;
  }
  function doneCount(j) {
    var s = doneSet(j);
    return dayTasks(j).filter(function (t) { return s.has(t.id); }).length;
  }

  var WD = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  var WD_S = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var MONTHS_S = ['فرو', 'ارد', 'خرد', 'تیر', 'مرد', 'شهر', 'مهر', 'آبا', 'آذر', 'دی', 'بهم', 'اسف'];

  var RING_C = 326.73; /* محیط دایره با شعاع ۵۲ */

  var ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4m0 0L8 8m4-4l4 4M5 15v4a2 2 0 002 2h10a2 2 0 002-2v-4"/></svg>',
    upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
  };

  /* ============================================================
   * ابزارهای کمکی
   * ============================================================ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function fa(n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function pct(a, b) { return b ? Math.round(a * 100 / b) : 0; }
  function faPct(n) { return fa(n) + '٪'; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function weekStartOf(j) { return j - J.weekdayIndex(j); }

  /* ============================================================
   * وضعیت برنامه
   * ============================================================ */
  var state = {
    tab: 'today',
    today: J.todayJdn(),
    viewDay: J.todayJdn(),
    weekStart: 0,
    monthY: 0,
    monthM: 0,
    yearY: 0,
    days: new Map(),               /* jdn → Set از شناسهٔ کارهای انجام‌شده */
    meta: { firstUse: null, name: '', font: 'md' },
    reg: null,
    updating: false,
    applying: false
  };

  function firstJ() {
    var j = state.meta.firstUse ? J.fromIso(state.meta.firstUse) : NaN;
    return isNaN(j) ? state.today : j;
  }

  function doneSet(j) { return state.days.get(j) || new Set(); }

  function initPeriods() {
    state.weekStart = weekStartOf(state.today);
    var g = J.d2j(state.today);
    state.monthY = g.jy;
    state.monthM = g.jm;
    state.yearY = g.jy;
  }

  /* ============================================================
   * ذخیره‌سازی دائمی با localForage (IndexedDB)
   * ============================================================ */
  function initStore() {
    store.config({
      name: 'BulletJournal',
      storeName: 'journal',
      description: 'اطلاعات دفتر برنامه روزانه'
    });
  }

  function loadAll() {
    return store.iterate(function (val, key) {
      if (key.indexOf('day:') === 0) {
        var j = J.fromIso(key.slice(4));
        if (!isNaN(j) && val && Array.isArray(val.done)) {
          state.days.set(j, new Set(val.done.filter(function (id) { return typeof id === 'string'; })));
        }
      } else if (key === 'meta' && val && typeof val === 'object') {
        state.meta.firstUse = val.firstUse || null;
        state.meta.name = typeof val.name === 'string' ? val.name : '';
        if (FONT_PX[val.font]) state.meta.font = val.font;
      } else if (key === 'tasks') {
        var list = sanitizeTasks(val);
        if (list) TASKS = list;
      }
    });
  }

  function saveDay(j) {
    return store.setItem('day:' + J.toIso(j), { done: Array.from(doneSet(j)), updated: Date.now() });
  }
  function saveMeta() {
    return store.setItem('meta', { firstUse: state.meta.firstUse, name: state.meta.name, font: state.meta.font });
  }
  function plainTasks() {
    return TASKS.map(function (t) {
      return { id: t.id, title: t.title, icon: t.icon, hue: t.hue, from: t.from || null, to: t.to || null };
    });
  }
  function saveTasks() { return store.setItem('tasks', plainTasks()); }

  function requestPersistence() {
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    } catch (e) { /* مهم نیست */ }
  }

  /* ============================================================
   * آمار گزارش‌ها
   * ============================================================ */
  function stats(startJ, endJ) {
    var lo = Math.max(startJ, firstJ());
    var hi = Math.min(endJ, state.today);
    var byId = new Map();
    var perDay = new Map();
    var totalDone = 0, totalPossible = 0, counted = 0, full = 0;
    for (var j = lo; j <= hi; j++) {
      var act = dayTasks(j);
      if (!act.length) continue;
      counted++;
      var set = doneSet(j), c = 0;
      for (var i = 0; i < act.length; i++) {
        var t = act[i], e = byId.get(t.id);
        if (!e) { e = { task: t, done: [], miss: [] }; byId.set(t.id, e); }
        if (set.has(t.id)) { e.done.push(j); c++; }
        else e.miss.push(j);
      }
      perDay.set(j, { c: c, n: act.length });
      totalDone += c;
      totalPossible += act.length;
      if (c === act.length) full++;
    }
    var perTask = TASKS.filter(function (t) { return byId.has(t.id); }).map(function (t) { return byId.get(t.id); });
    return { lo: lo, hi: hi, counted: counted, perTask: perTask, perDay: perDay,
             totalDone: totalDone, totalPossible: totalPossible, full: full };
  }

  /* ============================================================
   * اجزای مشترک رندر
   * ============================================================ */
  function ringHTML(ratio, big, small, cls, full) {
    return '<div class="ring ' + (cls || '') + (full ? ' full' : '') + '" data-target="' + (RING_C * (1 - ratio)).toFixed(2) + '">' +
      '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="52"/>' +
      '<circle class="bar" cx="60" cy="60" r="52"/></svg>' +
      '<div class="lbl"><div><b>' + big + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</div></div></div>';
  }

  function animateRings(root) {
    var rings = $$('.ring', root);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        rings.forEach(function (r) {
          var bar = $('.bar', r);
          if (bar) bar.style.strokeDashoffset = r.dataset.target;
        });
      });
    });
  }

  function periodNav(prevAct, nextAct, title, sub, canPrev, canNext) {
    return '<div class="daynav">' +
      '<button class="nav-btn" type="button" data-action="' + prevAct + '" aria-label="قبلی"' + (canPrev ? '' : ' disabled') + '>' + ICON.prev + '</button>' +
      '<div class="mid"><strong>' + title + '</strong><small>' + (sub || '&nbsp;') + '</small></div>' +
      '<button class="nav-btn" type="button" data-action="' + nextAct + '" aria-label="بعدی"' + (canNext ? '' : ' disabled') + '>' + ICON.next + '</button>' +
      '</div>';
  }

  function summaryHTML(st, title) {
    var done = st.totalDone, miss = st.totalPossible - done;
    var p = pct(done, st.totalPossible);
    return '<div class="card summary">' +
      ringHTML(p / 100, faPct(p), 'انجام شده', 'sm', p === 100) +
      '<div class="sum-info"><div class="sum-title">' + title + '</div>' +
      '<div class="sline"><i class="dot done"></i>انجام‌شده: <b>' + fa(done) + '</b> کار</div>' +
      '<div class="sline"><i class="dot miss"></i>انجام‌نشده: <b>' + fa(miss) + '</b> کار</div>' +
      '<div class="sline"><i class="dot star"></i>روز کامل: <b>' + fa(st.full) + '</b> از ' + fa(st.counted) + ' روز</div>' +
      '</div></div>';
  }

  function highlightsHTML(st) {
    if (!st.counted) return '';
    var arr = st.perTask.map(function (t) { return { task: t.task, p: pct(t.done.length, t.done.length + t.miss.length) }; });
    if (!arr.length) return '';
    var best = arr.slice().sort(function (a, b) { return b.p - a.p; })[0];
    var worst = arr.slice().sort(function (a, b) { return a.p - b.p; })[0];
    if (best.p === worst.p) return '';
    return '<div class="hls">' +
      '<div class="hl"><small>🏆 بیشترین پایبندی</small><strong>' + esc(best.task.title) + '</strong><em>' + faPct(best.p) + '</em></div>' +
      '<div class="hl"><small>🌱 نیازمند توجه بیشتر</small><strong>' + esc(worst.task.title) + '</strong><em>' + faPct(worst.p) + '</em></div>' +
      '</div>';
  }

  function chipsFor(list, mode) {
    if (!list.length) return '';
    if (mode === 'year') {
      var m = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      list.forEach(function (j) { m[J.d2j(j).jm - 1]++; });
      return m.map(function (c, i) { return c ? '<span class="chip">' + MONTHS[i] + ' ' + fa(c) + '</span>' : ''; }).join('');
    }
    return list.map(function (j) {
      return '<span class="chip">' + (mode === 'week' ? WD[J.weekdayIndex(j)] : fa(J.d2j(j).jd)) + '</span>';
    }).join('');
  }

  function taskRowsHTML(st, mode) {
    return '<div class="tasklist">' + st.perTask.map(function (d) {
      var t = d.task, p = pct(d.done.length, d.done.length + d.miss.length);
      var cd = chipsFor(d.done, mode), cm = chipsFor(d.miss, mode);
      return '<details class="trow"><summary>' +
        '<span class="ico" style="--h:' + t.hue + '">' + t.icon + '</span>' +
        '<span class="tinfo">' +
          '<span class="tname"><span>' + esc(t.title) + '</span><span class="tpct">' + faPct(p) + '</span></span>' +
          '<span class="tmeta">' + fa(d.done.length) + ' روز انجام‌شده · ' + fa(d.miss.length) + ' روز انجام‌نشده</span>' +
          '<span class="tbar"><i class="' + (p < 50 ? 'low' : '') + '" style="width:' + p + '%"></i></span>' +
        '</span>' +
        '<span class="chev">' + ICON.down + '</span>' +
        '</summary><div class="tdetail">' +
        '<div class="chips done"><b>✅ انجام‌شده</b>' + (cd || '<span class="none">هنوز انجام نشده</span>') + '</div>' +
        '<div class="chips miss"><b>⭕ انجام‌نشده</b>' + (cm || '<span class="none">همه‌اش انجام شد 🎉</span>') + '</div>' +
        '</div></details>';
    }).join('') + '</div>';
  }

  function emptyHTML(text) {
    return '<div class="card empty"><span class="big">🌸</span>' + text + '</div>';
  }

  /* ============================================================
   * نمای «امروز»
   * ============================================================ */
  function greeting() {
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return 'صبح بخیر';
    if (h >= 12 && h < 16) return 'ظهر بخیر';
    if (h >= 16 && h < 19) return 'عصر بخیر';
    return 'شب بخیر';
  }

  function relLabel(j) {
    var d = state.today - j;
    if (d === 0) return 'امروز';
    if (d === 1) return 'دیروز';
    if (d === 2) return 'پریروز';
    return WD[J.weekdayIndex(j)];
  }

  function noteFor(c, n, isToday) {
    if (!n) return 'هنوز کاری تعریف نشده؛ از بخش تنظیمات کار اضافه کن';
    if (c === n) return 'آفرین! همهٔ کارها انجام شد 🎉';
    if (c === 0) return isToday ? 'با یک قدم کوچک شروع کن 🌱' : 'برای این روز هنوز کاری ثبت نشده';
    if (c >= n * 0.7) return 'تقریباً تمومه، کمی دیگه! ✨';
    if (c >= n * 0.4) return 'داری عالی پیش می‌ری، ادامه بده 💪';
    return 'شروع خوبی بود، ادامه بده 🌸';
  }

  function renderToday() {
    var el = $('#view-today');
    var j = state.viewDay, isToday = j === state.today;
    var g = J.d2j(j), set = doneSet(j), list = dayTasks(j), n = list.length, c = doneCount(j);
    var name = state.meta.name ? '، ' + esc(state.meta.name) : '';
    var greet = isToday ? greeting() + name + ' 🌸' : 'ثبت کارهای ' + relLabel(j);

    el.innerHTML =
      '<div class="card hero">' +
        '<div class="hero-text">' +
          '<p class="greet">' + greet + '</p>' +
          '<h1><span>' + WD[J.weekdayIndex(j)] + '</span> ' + fa(g.jd) + ' ' + MONTHS[g.jm - 1] + '</h1>' +
          '<p class="sub">' + fa(g.jy) + '</p>' +
          '<p class="note" id="today-note">' + noteFor(c, n, isToday) + '</p>' +
        '</div>' +
        '<div id="today-ring">' + ringHTML(n ? c / n : 0, fa(c) + '/' + fa(n), 'کار انجام شد', '', n > 0 && c === n) + '</div>' +
      '</div>' +
      '<div class="daynav">' +
        '<button class="nav-btn" type="button" data-action="day-prev" aria-label="روز قبل"' + (j > state.today - 400 ? '' : ' disabled') + '>' + ICON.prev + '</button>' +
        '<div class="mid"><strong>' + relLabel(j) + '</strong>' +
          (isToday ? '<small>کارهای امروز را تیک بزن</small>' : '<button class="link" type="button" data-action="day-today">بازگشت به امروز</button>') +
        '</div>' +
        '<button class="nav-btn" type="button" data-action="day-next" aria-label="روز بعد"' + (isToday ? ' disabled' : '') + '>' + ICON.next + '</button>' +
      '</div>' +
      '<ul class="tasks">' + list.map(function (t, i) {
        var done = set.has(t.id);
        return '<li class="task' + (done ? ' done' : '') + '" style="--i:' + i + ';--h:' + t.hue + '" data-id="' + t.id + '">' +
          '<button class="task-btn" type="button" data-task="' + t.id + '" aria-pressed="' + done + '">' +
            '<span class="ico">' + t.icon + '</span>' +
            '<span class="label">' + esc(t.title) + '</span>' +
            '<span class="check">' + ICON.check + '</span>' +
          '</button></li>';
      }).join('') + '</ul>' + (n ? '' : emptyHTML('برای این روز کاری تعریف نشده است.<br>از بخش «تنظیمات» می‌توانی کار اضافه کنی.'));

    animateRings(el);
  }

  function updateTodayDynamic() {
    var el = $('#view-today');
    var j = state.viewDay, set = doneSet(j), n = dayTasks(j).length, c = doneCount(j);
    $$('.task', el).forEach(function (li) {
      var done = set.has(li.dataset.id);
      li.classList.toggle('done', done);
      $('.task-btn', li).setAttribute('aria-pressed', done);
    });
    var ring = $('#today-ring .ring', el);
    if (ring) {
      ring.classList.toggle('full', n > 0 && c === n);
      $('.lbl b', ring).textContent = fa(c) + '/' + fa(n);
      $('.bar', ring).style.strokeDashoffset = (RING_C * (1 - (n ? c / n : 0))).toFixed(2);
    }
    var note = $('#today-note', el);
    if (note) note.textContent = noteFor(c, n, j === state.today);
  }

  function toggleTask(id) {
    var j = state.viewDay;
    var active = dayTasks(j), n = active.length;
    if (!active.some(function (t) { return t.id === id; })) return;
    var set = state.days.get(j);
    if (!set) { set = new Set(); state.days.set(j, set); }
    var wasFull = doneCount(j) === n;
    if (set.has(id)) set.delete(id); else set.add(id);

    var metaChanged = false;
    if (j < firstJ()) { state.meta.firstUse = J.toIso(j); metaChanged = true; }

    updateTodayDynamic();
    if (!wasFull && doneCount(j) === n) celebrate();

    saveDay(j).catch(function () { toast('ذخیره نشد؛ لطفاً دوباره تلاش کن.'); });
    if (metaChanged) saveMeta().catch(function () {});
  }

  function gotoDay(j) {
    if (isNaN(j) || j > state.today) return;
    state.viewDay = j;
    setTab('today');
  }

  /* ============================================================
   * نمای «هفتگی»
   * ============================================================ */
  function dateRangeLabel(sj, ej) {
    var s = J.d2j(sj), e = J.d2j(ej);
    if (s.jy !== e.jy) return fa(s.jd) + ' ' + MONTHS[s.jm - 1] + ' ' + fa(s.jy) + ' تا ' + fa(e.jd) + ' ' + MONTHS[e.jm - 1] + ' ' + fa(e.jy);
    if (s.jm !== e.jm) return fa(s.jd) + ' ' + MONTHS[s.jm - 1] + ' تا ' + fa(e.jd) + ' ' + MONTHS[e.jm - 1] + ' ' + fa(e.jy);
    return fa(s.jd) + ' تا ' + fa(e.jd) + ' ' + MONTHS[e.jm - 1] + ' ' + fa(e.jy);
  }

  function renderWeek() {
    var el = $('#view-week');
    var s = state.weekStart, e = s + 6;
    var st = stats(s, e);
    var cur = weekStartOf(state.today);
    var sub = s === cur ? 'این هفته' : (s === cur - 7 ? 'هفتهٔ گذشته' : '');

    var html = '<h2 class="page-title">گزارش هفتگی</h2>' +
      periodNav('week-prev', 'week-next', dateRangeLabel(s, e), sub, s > firstJ(), s < cur);

    if (!st.counted) {
      html += emptyHTML('برای این هفته هنوز روزی ثبت نشده است.');
    } else {
      var head = '<span></span>';
      for (var i = 0; i < 7; i++) {
        var dj = s + i;
        head += '<button class="wk-day' + (dj === state.today ? ' today' : '') + '" type="button"' +
          (dj <= state.today ? ' data-goto="' + dj + '"' : ' disabled') + ' aria-label="' + WD[i] + '">' +
          '<span>' + WD_S[i] + '</span><small>' + fa(J.d2j(dj).jd) + '</small></button>';
      }
      var rows = st.perTask.map(function (pt) {
        var t = pt.task, cells = '';
        for (var k = 0; k < 7; k++) {
          var jj = s + k;
          var counted = jj >= st.lo && jj <= st.hi && isActive(t, jj);
          var done = doneSet(jj).has(t.id);
          if (counted && done) cells += '<span class="cell done" title="انجام شد">' + ICON.check + '</span>';
          else if (counted) cells += '<span class="cell miss" title="انجام نشد">' + ICON.x + '</span>';
          else cells += '<span class="cell na"></span>';
        }
        return '<div class="wk-row"><span class="wk-name"><span class="e">' + t.icon + '</span><span>' + esc(t.title) + '</span></span>' + cells + '</div>';
      }).join('');

      html += summaryHTML(st, 'خلاصهٔ هفته') + highlightsHTML(st) +
        '<h3 class="sec-title">📋 جدول کارهای هفته</h3>' +
        '<div class="card wk"><div class="wk-head">' + head + '</div>' + rows + '</div>' +
        '<div class="legend"><span><i style="background:var(--grad-done)"></i>انجام شد</span><span><i style="background:rgba(240,138,165,.4)"></i>انجام نشد</span><span><i style="border:1.5px dashed var(--line)"></i>هنوز ثبت نشده</span></div>' +
        '<h3 class="sec-title">🔍 جزئیات هر کار</h3>' + taskRowsHTML(st, 'week');
    }
    el.innerHTML = html;
    animateRings(el);
  }

  /* ============================================================
   * نمای «ماهانه»
   * ============================================================ */
  function renderMonth() {
    var el = $('#view-month');
    var y = state.monthY, m = state.monthM;
    var s = J.j2d(y, m, 1), len = J.monthLength(y, m), e = s + len - 1;
    var st = stats(s, e);
    var cg = J.d2j(state.today);
    var isCur = cg.jy === y && cg.jm === m;

    var html = '<h2 class="page-title">گزارش ماهانه</h2>' +
      periodNav('month-prev', 'month-next', MONTHS[m - 1] + ' ' + fa(y), isCur ? 'این ماه · ' + fa(len) + ' روز' : fa(len) + ' روز', s > firstJ(), e < state.today);

    if (!st.counted) {
      html += emptyHTML('برای این ماه هنوز روزی ثبت نشده است.');
    } else {
      var lead = J.weekdayIndex(s), cells = '';
      for (var b = 0; b < lead; b++) cells += '<span aria-hidden="true"></span>';
      for (var d = 1; d <= len; d++) {
        var j = s + d - 1, pd = st.perDay.get(j), counted = !!pd;
        var c = pd ? pd.c : 0, r = pd ? pd.c / pd.n : 0;
        var cls = [];
        if (!counted) cls.push('na');
        else if (c === 0) cls.push('z');
        else { if (r >= 0.55) cls.push('hi'); if (c === pd.n) cls.push('full'); }
        if (j === state.today) cls.push('today');
        cells += '<button type="button" class="' + cls.join(' ') + '" style="--r:' + r.toFixed(2) + '"' +
          (j <= state.today ? ' data-goto="' + j + '"' : ' disabled') +
          ' aria-label="' + fa(d) + ' ' + MONTHS[m - 1] + (counted ? '، ' + fa(c) + ' کار انجام شد' : '') + '">' + fa(d) + '</button>';
      }
      var head = WD_S.map(function (w) { return '<span>' + w + '</span>'; }).join('');

      html += summaryHTML(st, 'خلاصهٔ ماه') + highlightsHTML(st) +
        '<h3 class="sec-title">📅 تقویم ماه</h3>' +
        '<div class="card"><div class="hm-head">' + head + '</div><div class="hm">' + cells + '</div>' +
        '<div class="legend"><span><i style="background:rgba(18,169,127,.25)"></i>کمتر</span><span><i style="background:rgba(18,169,127,.9)"></i>بیشتر</span><span><i style="background:rgba(240,138,165,.4)"></i>هیچ‌کدام</span><span>★ همهٔ کارها</span></div>' +
        '<p class="hint" style="text-align:center;margin-top:8px">با لمس هر روز، کارهای همان روز را ببین یا ویرایش کن.</p></div>' +
        '<h3 class="sec-title">🔍 جزئیات هر کار</h3>' + taskRowsHTML(st, 'month');
    }
    el.innerHTML = html;
    animateRings(el);
  }

  /* ============================================================
   * نمای «سالانه»
   * ============================================================ */
  function renderYear() {
    var el = $('#view-year');
    var y = state.yearY;
    var s = J.j2d(y, 1, 1), e = J.j2d(y + 1, 1, 1) - 1;
    var st = stats(s, e);
    var cg = J.d2j(state.today);

    var html = '<h2 class="page-title">گزارش سالانه</h2>' +
      periodNav('year-prev', 'year-next', 'سال ' + fa(y), y === cg.jy ? 'امسال' : '', s > firstJ(), e < state.today);

    if (!st.counted) {
      html += emptyHTML('برای این سال هنوز روزی ثبت نشده است.');
    } else {
      var bars = '';
      for (var m = 1; m <= 12; m++) {
        var ms = J.j2d(y, m, 1), me = ms + J.monthLength(y, m) - 1;
        var sm = stats(ms, me);
        var p = sm.counted ? pct(sm.totalDone, sm.totalPossible) : null;
        var cur = (cg.jy === y && cg.jm === m);
        bars += '<button type="button" class="ybar' + (p === null ? ' empty' : '') + (cur ? ' cur' : '') + '"' +
          (p === null ? ' disabled' : ' data-month="' + y + '-' + m + '"') + ' aria-label="' + MONTHS[m - 1] + (p === null ? '' : ' ' + faPct(p)) + '">' +
          '<span class="v">' + (p === null ? '' : fa(p)) + '</span>' +
          '<span class="track"><span class="col" style="height:' + (p === null ? 3 : Math.max(p, 3)) + '%"></span></span>' +
          '<span class="m">' + MONTHS_S[m - 1] + '</span></button>';
      }

      html += summaryHTML(st, 'خلاصهٔ سال') + highlightsHTML(st) +
        '<h3 class="sec-title">📈 درصد انجام کارها در هر ماه</h3>' +
        '<div class="card"><div class="ybars">' + bars + '</div>' +
        '<p class="hint" style="text-align:center;margin-top:10px">برای دیدن گزارش هر ماه، روی ستون آن بزن.</p></div>' +
        '<h3 class="sec-title">🔍 جزئیات هر کار</h3>' + taskRowsHTML(st, 'year');
    }
    el.innerHTML = html;
    animateRings(el);
    /* انیمیشن ارتفاع ستون‌ها */
    $$('.ybar .col', el).forEach(function (c) {
      var h = c.style.height; c.style.height = '3%';
      requestAnimationFrame(function () { requestAnimationFrame(function () { c.style.height = h; }); });
    });
  }

  /* ============================================================
   * نمای «تنظیمات»
   * ============================================================ */
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  function renderSettings() {
    var el = $('#view-settings');
    el.innerHTML =
      '<h2 class="page-title">تنظیمات</h2>' +

      '<div class="card set-card">' +
        '<div class="set-head"><span class="set-ico">📲</span><div><strong>نصب برنامه</strong>' +
        '<small>برنامه را مثل یک اپ روی صفحهٔ اصلی گوشی داشته باش. بعد از نصب بدون اینترنت هم کار می‌کند.</small></div></div>' +
        '<button class="btn primary" type="button" data-action="install" id="btn-install-set"></button>' +
      '</div>' +

      '<div class="card set-card">' +
        '<div class="set-head"><span class="set-ico">🔄</span><div><strong>به‌روزرسانی</strong>' +
        '<small id="ver-line">نسخهٔ برنامه: …</small></div></div>' +
        '<button class="btn soft" type="button" data-action="update" id="btn-update-set">' + ICON.refresh + '<span>بررسی و به‌روزرسانی</span></button>' +
      '</div>' +

      '<div class="card set-card">' +
        '<div class="set-head"><span class="set-ico">📝</span><div><strong>کارهای روزانه</strong>' +
        '<small>کار جدید اضافه کن، اسم یا شکلک کارها را عوض کن، یا کاری را حذف کن. سابقهٔ روزهای قبل در گزارش‌ها می‌ماند.</small></div></div>' +
        '<div id="task-mgr">' + managerListHTML() + '</div>' +
        '<button class="btn primary" type="button" data-action="task-add">' + ICON.plus + '<span>افزودن کار جدید</span></button>' +
      '</div>' +

      '<div class="card set-card">' +
        '<div class="set-head"><span class="set-ico">🔠</span><div><strong>اندازهٔ نوشته‌ها</strong>' +
        '<small>اندازهٔ حروف را مطابق راحتی چشمت انتخاب کن.</small></div></div>' +
        fontHTML() +
      '</div>' +

      '<div class="card set-card">' +
        '<div class="set-head"><span class="set-ico">💗</span><div><strong>اسم تو</strong>' +
        '<small>اگر بنویسی، برنامه هر روز با اسم خودت سلام می‌کند.</small></div></div>' +
        '<input class="field" id="name-input" type="text" maxlength="30" autocomplete="off" value="' + esc(state.meta.name) + '">' +
      '</div>' +

      '<div class="card set-card">' +
        '<div class="set-head"><span class="set-ico">🗂️</span><div><strong>نسخهٔ پشتیبان</strong>' +
        '<small>همهٔ اطلاعات روی همین دستگاه و برای همیشه ذخیره می‌شود. هر از گاهی یک نسخهٔ پشتیبان بگیر تا اگر گوشی عوض شد، اطلاعات از دست نرود.</small></div></div>' +
        '<div class="btn-row">' +
          '<button class="btn ghost" type="button" data-action="export">' + ICON.save + '<span>دریافت پشتیبان</span></button>' +
          '<button class="btn ghost" type="button" data-action="import">' + ICON.upload + '<span>بازیابی</span></button>' +
        '</div>' +
        '<p class="hint" id="persist-hint"></p>' +
      '</div>' +

      '<p class="about">ساخته‌شده با 💗 برای ثبت کارهای هر روز</p>';

    var inp = $('#name-input', el);
    inp.addEventListener('change', function () {
      state.meta.name = inp.value.trim();
      saveMeta().catch(function () {});
      toast('ذخیره شد ✓');
    });

    refreshInstallUI();
    showVersion();
    showPersistence();
  }

  function showPersistence() {
    var hint = $('#persist-hint');
    if (!hint) return;
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(function (ok) {
        if (!hint.isConnected) return;
        hint.textContent = ok
          ? '✓ مرورگر ذخیره‌سازی دائمی را برای این برنامه تأیید کرده است.'
          : 'اگر برنامه را نصب کنی، مرورگر اطلاعات را مطمئن‌تر نگه می‌دارد.';
      }).catch(function () {});
    }
  }

  /* ============================================================
   * پیام‌ها، پنجرهٔ پایین، جشن
   * ============================================================ */
  var toastTimer = null;
  function toast(msg, action) {
    var box = $('#toast');
    clearTimeout(toastTimer);
    box.innerHTML = '';
    var t = document.createElement('div');
    t.className = 'toast';
    var span = document.createElement('span');
    span.textContent = msg;
    t.appendChild(span);
    if (action) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = action.label;
      b.addEventListener('click', function () { box.innerHTML = ''; action.run(); });
      t.appendChild(b);
    }
    box.appendChild(t);
    toastTimer = setTimeout(function () { box.innerHTML = ''; }, action ? 12000 : 3200);
  }

  function openSheet(html) {
    $('#sheet-body').innerHTML = html;
    $('#sheet').hidden = false;
  }
  function closeSheet() { $('#sheet').hidden = true; }

  function celebrate() {
    toast('آفرین! همهٔ کارها انجام شد 🎉');
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cv = $('#confetti'), ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colors = ['#ff8ab0', '#e8467c', '#a855f7', '#f6b24a', '#47dcae', '#ffffff'];
    var parts = [];
    for (var i = 0; i < 120; i++) {
      parts.push({
        x: W / 2 + (Math.random() - 0.5) * 90, y: H * 0.55,
        vx: (Math.random() - 0.5) * 15, vy: -(Math.random() * 14 + 7),
        g: 0.36 + Math.random() * 0.2, s: 5 + Math.random() * 7,
        r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: colors[(Math.random() * colors.length) | 0]
      });
    }
    var t0 = performance.now();
    (function tick(now) {
      ctx.clearRect(0, 0, W, H);
      var alive = false;
      parts.forEach(function (p) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr;
        if (p.y < H + 30) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (alive && now - t0 < 4200) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  /* ============================================================
   * نصب برنامه (PWA)
   * ============================================================ */
  /* ============================================================
   * مدیریت کارها و اندازهٔ نوشته
   * ============================================================ */
  function activeNow() { return TASKS.filter(function (t) { return isActive(t, state.today); }); }

  function managerListHTML() {
    var list = activeNow();
    if (!list.length) return '<p class="hint">هنوز کاری نداری. با دکمهٔ زیر یک کار اضافه کن.</p>';
    return '<div class="mgr">' + list.map(function (t) {
      return '<div class="mrow"><span class="ico" style="--h:' + t.hue + '">' + t.icon + '</span>' +
        '<span class="mname">' + esc(t.title) + '</span>' +
        '<button class="mbtn" type="button" data-action="task-edit" data-id="' + esc(t.id) + '" aria-label="ویرایش ' + esc(t.title) + '">' + ICON.edit + '</button>' +
        '<button class="mbtn danger" type="button" data-action="task-del" data-id="' + esc(t.id) + '" aria-label="حذف ' + esc(t.title) + '">' + ICON.trash + '</button></div>';
    }).join('') + '</div>';
  }

  function openTaskSheet(id) {
    var t = id ? findTask(id) : null;
    if (id && !t) return;
    state.editId = t ? t.id : null;
    state.pickIcon = t ? t.icon : ICONS[0];
    var icons = ICONS.slice();
    if (icons.indexOf(state.pickIcon) < 0) icons.unshift(state.pickIcon);
    openSheet(
      '<h3 id="sheet-title">' + (t ? 'ویرایش کار' : 'افزودن کار جدید') + '</h3>' +
      '<label class="lbl-f" for="task-title">نام کار</label>' +
      '<input class="field" id="task-title" type="text" maxlength="40" autocomplete="off" value="' + (t ? esc(t.title) : '') + '">' +
      '<span class="lbl-f">شکلک</span>' +
      '<div class="icons" role="radiogroup" aria-label="شکلک">' + icons.map(function (ic) {
        var on = ic === state.pickIcon;
        return '<button type="button" class="ic' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-icon="' + ic + '">' + ic + '</button>';
      }).join('') + '</div>' +
      '<button class="btn primary" type="button" data-action="task-save">' + ICON.check + '<span>ذخیره</span></button>'
    );
    var inp = $('#task-title');
    if (inp && !t) setTimeout(function () { inp.focus(); }, 60);
  }

  function pickIcon(ic) {
    state.pickIcon = ic;
    $$('.ic').forEach(function (b) {
      var on = b.dataset.icon === ic;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
    });
  }

  function saveTaskForm() {
    var inp = $('#task-title');
    var title = inp ? inp.value.replace(/\s+/g, ' ').trim() : '';
    if (!title) { toast('اسم کار را بنویس.'); if (inp) inp.focus(); return; }
    if (state.editId) {
      var t = findTask(state.editId);
      if (t) { t.title = title; t.icon = state.pickIcon; }
    } else {
      TASKS.push(prepTask({
        id: 't' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36),
        title: title, icon: state.pickIcon, hue: HUES[TASKS.length % HUES.length],
        from: J.toIso(state.today), to: null
      }));
    }
    saveTasks().catch(function () { toast('ذخیره نشد؛ لطفاً دوباره تلاش کن.'); });
    closeSheet();
    renderAllViews();
    toast('ذخیره شد ✓');
  }

  function openDeleteSheet(id) {
    var t = findTask(id);
    if (!t) return;
    openSheet(
      '<h3 id="sheet-title">حذف «' + esc(t.title) + '»؟</h3>' +
      '<p>این کار از امروز به بعد در لیست روزانه نمی‌آید. سابقهٔ روزهای گذشته در گزارش‌ها باقی می‌ماند.</p>' +
      '<button class="btn danger" type="button" data-action="task-del-confirm" data-id="' + esc(t.id) + '">' + ICON.trash + '<span>بله، حذف شود</span></button>'
    );
  }

  function deleteTask(id) {
    var t = findTask(id);
    if (!t) return;
    if (t.f >= state.today) TASKS = TASKS.filter(function (x) { return x.id !== id; });
    else { t.to = J.toIso(state.today - 1); prepTask(t); }
    saveTasks().catch(function () { toast('ذخیره نشد؛ لطفاً دوباره تلاش کن.'); });
    closeSheet();
    renderAllViews();
    toast('کار حذف شد');
  }

  function fontHTML() {
    return '<div class="seg" role="radiogroup" aria-label="اندازهٔ نوشته">' + ['sm', 'md', 'lg', 'xl'].map(function (k) {
      var on = state.meta.font === k;
      return '<button type="button" class="' + (on ? 'on' : '') + '" role="radio" aria-checked="' + on + '" data-font="' + k + '">' + FONT_LABEL[k] + '</button>';
    }).join('') + '</div>' +
      '<p class="font-sample">نمونه: همین اندازهٔ نوشته را می‌بینی 🌸</p>';
  }

  function applyFont() {
    var px = FONT_PX[state.meta.font] || FONT_PX.md;
    document.documentElement.style.fontSize = px;
    try { localStorage.setItem('bj-font', px); } catch (e) { /* مهم نیست */ }
  }

  function setFont(k) {
    if (!FONT_PX[k]) return;
    state.meta.font = k;
    applyFont();
    saveMeta().catch(function () {});
    $$('.seg button').forEach(function (b) {
      var on = b.dataset.font === k;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
    });
  }

  var deferredPrompt = null;

  function refreshInstallUI() {
    var installed = isStandalone();
    var top = $('#btn-install-top');
    if (top) top.hidden = installed;
    var set = $('#btn-install-set');
    if (set) {
      set.className = 'btn ' + (installed ? 'mint' : 'primary');
      set.innerHTML = installed
        ? ICON.check + '<span>روی این دستگاه نصب شده است</span>'
        : ICON.download + '<span>نصب روی این دستگاه</span>';
    }
  }

  function installHelpHTML() {
    var ua = navigator.userAgent || '';
    var ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var steps;
    if (ios) {
      steps = '<li>برنامه را در مرورگر <b>Safari</b> باز کن.</li>' +
              '<li>روی دکمهٔ <b>اشتراک‌گذاری</b> (مربع با فلش رو به بالا) بزن.</li>' +
              '<li>گزینهٔ <b>Add to Home Screen</b> یا «افزودن به صفحهٔ آغازین» را انتخاب کن.</li>' +
              '<li>روی <b>Add</b> بزن؛ آیکن برنامه روی صفحهٔ اصلی ساخته می‌شود.</li>';
    } else {
      steps = '<li>منوی مرورگر (سه‌نقطه ⋮ یا ☰) را باز کن.</li>' +
              '<li>گزینهٔ <b>Install app</b> یا «نصب برنامه» یا «افزودن به صفحهٔ اصلی» را بزن.</li>' +
              '<li>نصب را تأیید کن؛ آیکن برنامه روی صفحهٔ اصلی ساخته می‌شود.</li>';
    }
    return '<h3 id="sheet-title">نصب روی این دستگاه</h3>' +
      '<p>مرورگر شما پنجرهٔ نصب خودکار را نشان نداد؛ با چند مرحلهٔ ساده خودت نصب کن:</p>' +
      '<ol>' + steps + '</ol>' +
      '<p class="hint">اگر قبلاً نصب کرده‌ای، برنامه را از آیکنش روی صفحهٔ اصلی باز کن.</p>';
  }

  function installApp() {
    if (isStandalone()) { toast('برنامه همین الان نصب و در حال اجراست ✓'); return; }
    if (deferredPrompt) {
      var p = deferredPrompt;
      deferredPrompt = null;
      p.prompt();
      p.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') requestPersistence();
        refreshInstallUI();
      }).catch(function () {});
      return;
    }
    openSheet(installHelpHTML());
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    refreshInstallUI();
  });
  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    refreshInstallUI();
    requestPersistence();
    toast('برنامه با موفقیت نصب شد 🎉');
  });

  /* ============================================================
   * به‌روزرسانی (سرویس‌ورکر)
   * ============================================================ */
  function getVersion() {
    return new Promise(function (resolve) {
      var sw = navigator.serviceWorker && navigator.serviceWorker.controller;
      if (!sw) return resolve(null);
      var ch = new MessageChannel();
      var done = false;
      ch.port1.onmessage = function (ev) { done = true; resolve(ev.data && ev.data.version); };
      sw.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
      setTimeout(function () { if (!done) resolve(null); }, 1500);
    });
  }

  function showVersion() {
    var line = $('#ver-line');
    if (!line) return;
    getVersion().then(function (v) {
      var l = $('#ver-line');
      if (l) l.textContent = v ? 'نسخهٔ برنامه: ' + fa(v) : 'نسخهٔ برنامه: در حال آماده‌سازی حالت آفلاین';
    });
  }

  function setUpdateBusy(busy) {
    ['#btn-update-top', '#btn-update-set'].forEach(function (sel) {
      var b = $(sel);
      if (b) b.classList.toggle('is-busy', busy);
    });
  }

  function applyUpdate(worker) {
    state.applying = true;
    worker.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(function () { if (state.applying) window.location.reload(); }, 3500);
  }

  function offerUpdate(worker) {
    toast('نسخهٔ جدید برنامه آماده است ✨', { label: 'به‌روزرسانی', run: function () { applyUpdate(worker); } });
  }

  function updateNow() {
    if (state.updating) return;
    if (!('serviceWorker' in navigator)) {
      toast('این مرورگر از به‌روزرسانی خودکار پشتیبانی نمی‌کند.');
      return;
    }
    if (!navigator.onLine) { toast('برای به‌روزرسانی به اینترنت نیاز است.'); return; }
    state.updating = true;
    setUpdateBusy(true);

    var reg = state.reg;
    var p = reg ? Promise.resolve(reg) : navigator.serviceWorker.getRegistration();
    p.then(function (r) {
      if (!r) throw new Error('no-reg');
      reg = r;
      if (r.waiting) return r.waiting;
      return r.update().then(function () {
        if (r.waiting) return r.waiting;
        var inst = r.installing;
        if (!inst) return null;
        return new Promise(function (resolve) {
          function check() {
            if (inst.state === 'installed') resolve(r.waiting || inst);
            else if (inst.state === 'redundant') resolve(null);
          }
          check();
          inst.addEventListener('statechange', check);
        });
      });
    }).then(function (worker) {
      if (worker) {
        toast('نسخهٔ جدید پیدا شد؛ در حال به‌روزرسانی…');
        applyUpdate(worker);
      } else {
        toast('نسخهٔ شما به‌روز است ✓');
      }
    }).catch(function (err) {
      if (err && err.message === 'no-reg') toast('یک بار برنامه را ببند و دوباره باز کن، بعد دوباره امتحان کن.');
      else toast('بررسی به‌روزرسانی انجام نشد؛ اینترنت را بررسی کن.');
    }).then(function () {
      state.updating = false;
      setUpdateBusy(false);
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (state.applying) window.location.reload();
    });
    navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then(function (reg) {
      state.reg = reg;
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(nw);
        });
      });
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.update().catch(function () {});
      showVersion();
    }).catch(function (err) { console.warn('ثبت سرویس‌ورکر انجام نشد', err); });
  }

  /* ============================================================
   * پشتیبان‌گیری و بازیابی
   * ============================================================ */
  function exportBackup() {
    var data = { app: 'bullet-journal', version: 2, exportedAt: new Date().toISOString(),
                 meta: { firstUse: state.meta.firstUse, name: state.meta.name, font: state.meta.font },
                 tasks: plainTasks(), days: {} };
    state.days.forEach(function (set, j) { if (set.size) data.days[J.toIso(j)] = Array.from(set); });
    var name = 'bullet-journal-backup-' + J.toIso(state.today) + '.json';
    var file = new File([JSON.stringify(data, null, 2)], name, { type: 'application/json' });

    var viaShare = (navigator.canShare && navigator.canShare({ files: [file] }))
      ? navigator.share({ files: [file], title: 'نسخهٔ پشتیبان دفتر برنامه' }).then(function () { return true; })
          .catch(function (e) { return e && e.name === 'AbortError' ? true : false; })
      : Promise.resolve(false);

    viaShare.then(function (handled) {
      if (handled) return;
      var url = URL.createObjectURL(file);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
      toast('نسخهٔ پشتیبان ذخیره شد ✓');
    });
  }

  function importBackup(file) {
    if (!file) return;
    file.text().then(function (text) {
      var data = JSON.parse(text);
      if (!data || data.app !== 'bullet-journal' || typeof data.days !== 'object' || !data.days) throw new Error('bad');
      var entries = Object.keys(data.days).filter(function (iso) {
        return !isNaN(J.fromIso(iso)) && Array.isArray(data.days[iso]);
      });
      if (!entries.length) { toast('در این فایل روزی برای بازیابی پیدا نشد.'); return; }
      var ok = window.confirm(fa(entries.length) + ' روز از نسخهٔ پشتیبان بازیابی شود؟\nاگر برای روزی اطلاعات ثبت‌شده باشد، با اطلاعات فایل جایگزین می‌شود.');
      if (!ok) return;

      var minJ = firstJ();
      var writes = entries.map(function (iso) {
        var j = J.fromIso(iso);
        if (j < minJ) minJ = j;
        state.days.set(j, new Set(data.days[iso].filter(function (id) { return typeof id === 'string'; })));
        return saveDay(j);
      });
      state.meta.firstUse = J.toIso(minJ);
      var restored = sanitizeTasks(data.tasks);
      if (restored) { TASKS = restored; writes.push(saveTasks()); }
      if (!state.meta.name && data.meta && typeof data.meta.name === 'string') state.meta.name = data.meta.name.slice(0, 30);
      writes.push(saveMeta());
      return Promise.all(writes).then(function () {
        toast(fa(entries.length) + ' روز با موفقیت بازیابی شد ✓');
        renderAllViews();
      });
    }).catch(function () {
      toast('فایل پشتیبان معتبر نیست.');
    });
  }

  /* ============================================================
   * ناوبری و رویدادها
   * ============================================================ */
  var RENDER = { today: renderToday, week: renderWeek, month: renderMonth, year: renderYear, settings: renderSettings };

  function setTab(tab) {
    state.tab = tab;
    $$('.tab').forEach(function (b) {
      var on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + tab); });
    RENDER[tab]();
    window.scrollTo(0, 0);
  }

  function renderAllViews() { RENDER[state.tab](); }

  function shiftMonth(delta) {
    var m = state.monthM + delta, y = state.monthY;
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    state.monthM = m; state.monthY = y;
  }

  function onAction(act, target) {
    switch (act) {
      case 'day-prev': state.viewDay -= 1; renderToday(); break;
      case 'day-next': if (state.viewDay < state.today) { state.viewDay += 1; renderToday(); } break;
      case 'day-today': state.viewDay = state.today; renderToday(); break;
      case 'week-prev': state.weekStart -= 7; renderWeek(); break;
      case 'week-next': state.weekStart += 7; renderWeek(); break;
      case 'month-prev': shiftMonth(-1); renderMonth(); break;
      case 'month-next': shiftMonth(1); renderMonth(); break;
      case 'year-prev': state.yearY -= 1; renderYear(); break;
      case 'year-next': state.yearY += 1; renderYear(); break;
      case 'install': installApp(); break;
      case 'update': updateNow(); break;
      case 'export': exportBackup(); break;
      case 'import': $('#file-import').click(); break;
      case 'close-sheet': closeSheet(); break;
      case 'task-add': openTaskSheet(null); break;
      case 'task-edit': openTaskSheet(target.dataset.id); break;
      case 'task-save': saveTaskForm(); break;
      case 'task-del': openDeleteSheet(target.dataset.id); break;
      case 'task-del-confirm': deleteTask(target.dataset.id); break;
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action],[data-tab],[data-task],[data-goto],[data-month],[data-font],[data-icon]');
    if (e.target.id === 'sheet') { closeSheet(); return; }
    if (!t || t.disabled) return;
    if (t.dataset.tab) setTab(t.dataset.tab);
    else if (t.dataset.task) toggleTask(t.dataset.task);
    else if (t.dataset.goto) gotoDay(parseInt(t.dataset.goto, 10));
    else if (t.dataset.font) setFont(t.dataset.font);
    else if (t.dataset.icon) pickIcon(t.dataset.icon);
    else if (t.dataset.month) {
      var parts = t.dataset.month.split('-');
      state.monthY = parseInt(parts[0], 10);
      state.monthM = parseInt(parts[1], 10);
      setTab('month');
    } else if (t.dataset.action) onAction(t.dataset.action, t);
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  $('#file-import').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    importBackup(f);
  });

  /* عوض شدن روز وقتی برنامه از پس‌زمینه برمی‌گردد (مثلاً بعد از نیمه‌شب) */
  function checkDayRollover() {
    var t = J.todayJdn();
    if (t === state.today) return;
    var old = state.today;
    var followDay = state.viewDay === old;
    var followWeek = state.weekStart === weekStartOf(old);
    var og = J.d2j(old), ng = J.d2j(t);
    var followMonth = state.monthY === og.jy && state.monthM === og.jm;
    var followYear = state.yearY === og.jy;
    state.today = t;
    if (followDay) state.viewDay = t;
    if (followWeek) state.weekStart = weekStartOf(t);
    if (followMonth) { state.monthY = ng.jy; state.monthM = ng.jm; }
    if (followYear) state.yearY = ng.jy;
    renderAllViews();
  }

  var lastUpdateCheck = Date.now();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    checkDayRollover();
    if (state.reg && Date.now() - lastUpdateCheck > 60 * 60 * 1000) {
      lastUpdateCheck = Date.now();
      state.reg.update().catch(function () {});
    }
  });

  /* ============================================================
   * شروع برنامه
   * ============================================================ */
  function boot() {
    initPeriods();
    resetTasks();
    initStore();
    store.ready().catch(function () {}).then(loadAll).catch(function (err) {
      console.warn('خواندن اطلاعات ناموفق بود', err);
      toast('خواندن اطلاعات ذخیره‌شده با مشکل روبه‌رو شد.');
    }).then(function () {
      applyFont();
      if (!state.meta.firstUse) {
        state.meta.firstUse = J.toIso(state.today);
        saveMeta().catch(function () {});
      }
      refreshInstallUI();
      setTab('today');
      registerSW();
      requestPersistence();
    });
  }

  boot();
})();

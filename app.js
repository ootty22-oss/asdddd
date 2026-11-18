/* الموجّه والحالة والصفحات الأساسية */
(function (P) {
  'use strict';
  const { h, $, $$, store } = P;
  const TYPE_NAMES = { mcq: 'اختيار من متعدد', tf: 'صح أو خطأ', fill: 'أكمل', define: 'عرّف', why: 'علّل', compare: 'قارن', law: 'قوانين', calc: 'حسابية', understand: 'فهم' };
  P.TYPE_NAMES = TYPE_NAMES;

  // ------------------------------------------------------------ البيانات
  P.init = function (D) {
    P.D = D; P.lessons = []; P.lessonById = {}; P.qById = {}; P.exById = {}; P.itemById = {};
    D.chapters.forEach(c => c.lessons.forEach(l => {
      l.chId = c.id; P.lessons.push(l); P.lessonById[l.id] = l;
      l.questions.forEach(q => { q.lesson = l.id; q.ch = c.n; P.qById[q.id] = q; });
      l.examples.forEach(e => { e.lesson = l.id; e.ch = c.n; P.exById[e.id] = e; });
      [...l.explain, ...l.definitions, ...l.laws, ...l.activities, ...l.enrich].forEach(it => { it.lesson = l.id; P.itemById[it.id] = it; });
    }));
    P.simById = {}; D.sims.forEach(s => P.simById[s.id] = s);
  };
  P.chOf = l => l.ch === 1 ? 'ch1c' : 'ch2c';

  // ------------------------------------------------------------ التقدم
  P.recordQ = function (qid, r) {
    const s = store.s; const o = s.q[qid] || { r: 0, n: 0 };
    o.r = r; o.n += 1; o.t = Date.now(); s.q[qid] = o; store.save();
  };
  P.lessonStats = function (lid) {
    const l = P.lessonById[lid]; let sum = 0, n = 0;
    l.questions.forEach(q => { const o = store.s.q[q.id]; if (o) { sum += o.r; n++; } });
    const review = l.cards.filter(c => store.s.cards[c.id] === 'review').length;
    return { acc: n ? sum / n : null, answered: n, total: l.questions.length, review, done: !!store.s.lessons[lid] };
  };
  P.needsReview = lid => { const st = P.lessonStats(lid); return (st.acc !== null && st.answered >= 3 && st.acc < 0.6) || st.review > 0; };
  P.chapterPct = function (ch) {
    const ls = P.D.chapters[ch - 1].lessons; return ls.filter(l => store.s.lessons[l.id]).length / ls.length;
  };
  P.overallPct = () => P.lessons.filter(l => store.s.lessons[l.id]).length / P.lessons.length;

  // ------------------------------------------------------------ الموجّه
  const ROUTES = {};
  P.route = (name, fn) => ROUTES[name] = fn;
  let cleanup = [];
  P.onLeave = fn => cleanup.push(fn);
  function go() {
    cleanup.forEach(f => { try { f(); } catch (e) { } }); cleanup = [];
    const hash = (location.hash || '#home').slice(1) || 'home';
    let name = hash, arg = null;
    const m = hash.match(/^(lesson|chapter|lab)-(.+)$/);
    if (m) { name = m[1]; arg = m[2]; }
    const fn = ROUTES[name] || ROUTES.home;
    const main = $('#app'); main.innerHTML = '';
    $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === name || (name === 'lesson' && a.dataset.r === 'map' && false)));
    try { fn(main, arg); } catch (e) { console.error(e); main.append(h('div', { class: 'box warnbox' }, 'تعذّر عرض هذا القسم: ' + e.message)); }
    if (name === 'lesson' || name === 'home') { store.s.last = hash; store.save(); }
    window.scrollTo(0, 0);
    const t = $('h1', main); document.title = (t ? P.strip(t.textContent) + ' – ' : '') + 'منصة الفيزياء التفاعلية';
  }
  P.go = go;
  P.start = function () { window.addEventListener('hashchange', go); go(); };

  // ------------------------------------------------------------ أدوات عرض
  P.srcPill = function (o) {
    if (!o) return '';
    const s = o.source === 'book' ? `<span class="pill book" title="${P.esc(o.ref || '')}">من الكتاب${o.ref ? ' · ' + o.ref : ''}</span>` : '<span class="pill extra">تدريب إضافي</span>';
    return s;
  };
  P.flagBox = txt => `<div class="box warnbox"><b>⚠ يحتاج إلى مراجعة:</b> ${txt}</div>`;
  P.lessonLink = l => `<a class="lchip ${store.s.lessons[l.id] ? 'done' : ''}" href="#lesson-${l.id}">${l.sec} ${l.title}</a>`;

  // ------------------------------------------------------------ الرئيسية
  P.route('home', function (main) {
    const pct = Math.round(P.overallPct() * 100);
    const last = store.s.last && store.s.last.startsWith('lesson-') ? P.lessonById[store.s.last.slice(7)] : null;
    const next = P.lessons.find(l => !store.s.lessons[l.id]);
    const cont = last || next || P.lessons[0];
    const answered = Object.keys(store.s.q).length;
    main.innerHTML = `
      <section class="hero">
        <div class="card main">
          <h1>منصة الفيزياء التفاعلية – الثالث المتوسط</h1>
          <p>الفصل الأول: الكهربائية الساكنة، والفصل الثاني: المغناطيسية. المحتوى منقول من الكتاب (ص 7–46).</p>
          <div class="row" style="justify-content:space-between;margin-top:10px"><span>التقدم العام</span><span class="big">${pct}%</span></div>
          <div class="bar-p"><i style="width:${pct}%"></i></div>
          <div class="row" style="margin-top:14px">
            <a class="btn" href="#lesson-${cont.id}">${last ? 'تابع من حيث توقفت' : 'ابدأ'}: ${cont.sec} ${cont.title}</a>
          </div>
        </div>
        <div class="card">
          <h3>ملخصك</h3>
          <div class="list small">
            <div class="li"><span>دروس مكتملة</span><b>${P.lessons.filter(l => store.s.lessons[l.id]).length} من ${P.lessons.length}</b></div>
            <div class="li"><span>أسئلة أجبت عنها</span><b>${answered}</b></div>
            <div class="li"><span>مسائل حللتها</span><b>${Object.keys(store.s.problems).length}</b></div>
            <div class="li"><span>اختبارات</span><b>${store.s.quizzes.length}</b></div>
          </div>
          ${store.persistent() ? '' : '<p class="small muted">التخزين في المتصفح غير متاح هنا، فسيضيع تقدمك عند إغلاق الصفحة.</p>'}
        </div>
      </section>
      <section class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        ${P.D.chapters.map(c => {
          const p = Math.round(P.chapterPct(c.n) * 100);
          return `<div class="card chcard ch${c.n}c"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${c.title}</h2><b>${p}%</b></div>
            <div class="bar-p c"><i style="width:${p}%"></i></div>
            <p class="small muted">صفحات الكتاب ${c.pages} · ${c.lessons.length} دروس</p>
            <div class="lessons">${c.lessons.map(P.lessonLink).join('')}</div>
            <div class="row"><a class="btn sm" href="#chapter-${c.n}">أسئلة الفصل من الكتاب</a></div></div>`;
        }).join('')}
      </section>
      <h2 style="margin-top:22px">الأقسام</h2>
      <section class="shortcuts">
        ${[['map', 'المخطط الذهني', 'كل المنهج في خريطة واحدة'], ['lab', 'المختبر', '14 محاكاة تفاعلية'], ['problems', 'المسائل', 'حل خطوة بخطوة وحاول بنفسك'],
           ['quiz', 'الاختبارات', 'بنك الأسئلة واختبارات الفصلين'], ['cards', 'بطاقات الحفظ', 'تعريفات وقوانين ومقارنات'], ['tutor', 'اسأل مدرس الفيزياء', 'اسأل عن أي فقرة أو مسألة'],
           ['progress', 'لوحة التقدم', 'نقاط قوتك وما تحتاج مراجعته']]
          .map(([r, t, d]) => `<a class="card shortcut" href="#${r}"><b>${t}</b><span>${d}</span></a>`).join('')}
      </section>`;
  });

  // ------------------------------------------------------------ صفحة الدرس
  function itemBox(it, kind, title, html, badge) {
    const fig = it.fig ? P.fig(it.fig) : '';
    return `<div class="item ${kind}" id="it-${it.id}"><h3>${title} ${badge || ''}</h3>${html}${fig}</div>`;
  }
  P.renderLaw = function (law, withExample) {
    const ex = law.example_id && P.exById[law.example_id];
    return `<div class="lawcard" id="it-${law.id}"><h3>${law.name} <span class="pill">مقرر</span></h3>
      ${law.statement ? `<p class="stmt"><b>نص القانون:</b> ${law.statement}</p>` : ''}
      ${law.formula}
      <div class="tablewrap"><table><tr><th>الرمز</th><th>الكمية</th><th>الوحدة</th></tr>${law.symbols.map(s => `<tr><td><span class="ltr">${s.sym}</span></td><td>${s.meaning}</td><td>${s.unit}</td></tr>`).join('')}</table></div>
      <dl class="kv"><dt>متى نستخدمه؟</dt><dd>${law.when}</dd></dl>
      ${law.notes && law.notes.length ? `<h4>ملاحظات</h4><ul>${law.notes.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
      ${withExample && ex ? `<h4>مثال محلول ${P.srcPill(ex)}</h4><p>${ex.text}</p><div class="solhere" data-ex="${ex.id}"></div>` : ''}
    </div>`;
  };

  P.route('lesson', function (main, id) {
    const l = P.lessonById[id];
    if (!l) { main.innerHTML = '<p>الدرس غير موجود.</p>'; return; }
    const c = P.D.chapters[l.ch - 1];
    const idx = P.lessons.indexOf(l), prev = P.lessons[idx - 1], next = P.lessons[idx + 1];
    const sections = [];
    let n = 0;
    const sec = (key, title, html) => { if (!html) return; n++; sections.push({ key, title, html: `<section class="sect" id="s-${key}"><h2><span class="n">${n}</span>${title}</h2>${html}</section>` }); };

    sec('intro', 'المقدمة', `<div class="intro3"><div class="card"><h4>ما الموضوع؟</h4><p>${l.intro.what}</p></div>
      <div class="card"><h4>ماذا سأتعلم؟</h4><ul>${l.intro.learn.map(x => `<li>${x}</li>`).join('')}</ul></div>
      <div class="card"><h4>لماذا هو مهم؟</h4><p>${l.intro.why}</p></div></div>`);
    let ex = l.summary + l.explain.map(it => itemBox(it, it.kind, it.title, it.html, it.kind === 'note' ? '' : '<span class="pill">مقرر</span>')).join('') +
      l.activities.map(a => itemBox(a, 'act', a.title, `<p><b>الأدوات:</b> ${a.tools}</p><ol>${a.steps.map(s => `<li>${s}</li>`).join('')}</ol><div class="box notebox"><b>النتيجة:</b> ${a.result}</div>`, '<span class="pill">نشاط من الكتاب</span>')).join('') +
      l.enrich.map(e => itemBox(e, 'enr', e.title, `<p>${e.html}</p>`, '<span class="pill enr">للاطلاع</span>')).join('');
    sec('explain', 'الشرح المبسّط', ex);
    if (l.definitions.length) sec('defs', 'التعريفات', l.definitions.map(d => itemBox(d, 'def', d.term, `<p>${d.text}</p>`, '<span class="pill">مقرر</span>')).join(''));
    if (l.laws.length) {
      const others = l.examples.filter(e => !l.laws.some(x => x.example_id === e.id));
      sec('laws', 'بطاقات القوانين', l.laws.map(x => P.renderLaw(x, true)).join('') +
        (others.length ? `<h3 style="margin-top:16px">أمثلة أخرى على الدرس</h3>${others.map(e => `<div class="item ex"><h3>${e.title} ${P.srcPill(e)}</h3><p>${e.text}</p><div class="solhere" data-ex="${e.id}"></div></div>`).join('')}
         <p><a class="btn sm" href="#problems">كل المسائل في قسم المسائل</a></p>` : ''));
    }
    if (l.figs.length) sec('figs', 'الرسوم', `<p class="small muted">رسوم مبسطة تعيد رسم أشكال الكتاب المهمة.</p><div class="grid">${l.figs.map(f => P.fig(f)).join('')}</div>`);
    if (l.sim_ids.length) sec('sims', 'المحاكاة المرتبطة', `<div class="simhere"></div>`);
    sec('quick', 'أسئلة سريعة', `<p class="small muted">خمسة أسئلة من بنك الدرس. للبنك كاملاً (${l.questions.length} سؤالاً) افتح <a href="#quiz" data-lesson="${l.id}" class="tobank">الاختبارات</a>.</p><div class="quickhere"></div>`);

    const flags = l.review_flags.map(P.flagBox).join('');
    main.innerHTML = `<div class="${P.chOf(l)}">
      <div class="crumbs"><a href="#home">الرئيسية</a> › <a href="#chapter-${c.n}">${c.title}</a> › ${l.sec}</div>
      <div class="lhead"><div class="sec">درس ${l.sec} · صفحات الكتاب ${l.pages}</div><h1 style="margin:0">${l.title} ${l.title_en ? `<span class="ltr muted small">${l.title_en}</span>` : ''}</h1></div>
      <div class="lessonlay"><nav class="toc" aria-label="أقسام الدرس">${sections.map(s => `<a href="#lesson-${l.id}" data-s="s-${s.key}">${s.title}</a>`).join('')}</nav>
      <div>${flags}${sections.map(s => s.html).join('')}
        <div class="donebar"><span>${store.s.lessons[l.id] ? '<b>✓ أنهيت هذا الدرس</b>' : 'هل أنهيت قراءة الدرس وحل أسئلته؟'}</span>
          <button class="btn ${l.ch === 1 ? 'ch1' : 'ch2'}" id="doneBtn">${store.s.lessons[l.id] ? 'إلغاء علامة الإنهاء' : 'أنهيت الدرس'}</button></div>
        <div class="nextprev">${prev ? `<a class="btn" href="#lesson-${prev.id}">→ ${prev.sec} ${prev.title}</a>` : '<span></span>'}${next ? `<a class="btn" href="#lesson-${next.id}">${next.sec} ${next.title} ←</a>` : ''}</div>
      </div></div></div>`;

    $$('.toc a', main).forEach(a => a.addEventListener('click', e => { e.preventDefault(); const t = document.getElementById(a.dataset.s); if (t) t.scrollIntoView({ behavior: P.reduced() ? 'auto' : 'smooth' }); }));
    $$('.solhere', main).forEach(el => el.append(P.solutionEl(P.exById[el.dataset.ex], { stepwise: true })));
    const sh = $('.simhere', main); if (sh) l.sim_ids.forEach(sid => sh.append(P.lab.mount(sid)));
    const qh = $('.quickhere', main);
    if (qh) {
      const auto = l.questions.filter(q => q.options || q.type === 'tf' || q.type === 'fill' || q.type === 'calc');
      P.shuffle(auto).slice(0, 5).forEach(q => qh.append(P.renderQuestion(q, {})));
    }
    $$('.tobank', main).forEach(a => a.addEventListener('click', () => { P.bankLesson = l.id; }));
    $('#doneBtn', main).addEventListener('click', () => {
      if (store.s.lessons[l.id]) delete store.s.lessons[l.id]; else { store.s.lessons[l.id] = Date.now(); P.toast('أحسنت! سُجّل الدرس مكتملاً.'); }
      store.save(); const y = window.scrollY; go(); window.scrollTo(0, y);
    });
  });

  // ------------------------------------------------------------ صفحة الفصل (أسئلة الكتاب)
  P.route('chapter', function (main, arg) {
    const c = P.D.chapters[(+arg || 1) - 1];
    main.innerHTML = `<div class="ch${c.n}c"><div class="crumbs"><a href="#home">الرئيسية</a> › ${c.title}</div>
      <div class="lhead"><div class="sec">صفحات الكتاب ${c.pages}</div><h1 style="margin:0">${c.title} <span class="ltr muted small">${c.title_en}</span></h1></div>
      ${c.review_flags.map(P.flagBox).join('')}
      ${c.contents ? `<div class="card"><h3>مفردات الفصل</h3><ul>${c.contents.map(x => `<li>${x}</li>`).join('')}</ul></div>` : ''}
      ${c.goals.length ? `<div class="card" style="margin-top:12px"><h3>الأهداف السلوكية</h3><p>بعد دراسة هذا الفصل ينبغي أن يكون الطالب قادراً على أن:</p><ul>${c.goals.map(x => `<li>${x}</li>`).join('')}</ul></div>` : ''}
      ${c.terms.length ? `<div class="card" style="margin-top:12px"><h3>المصطلحات العلمية</h3><div class="tablewrap"><table>${c.terms.map(t => `<tr><td>${t[0]}</td><td><span class="ltr">${t[1]}</span></td></tr>`).join('')}</table></div></div>` : ''}
      <h2 style="margin-top:18px">الدروس</h2><div class="row">${c.lessons.map(P.lessonLink).join('')}</div>
      <h2 style="margin-top:18px">أسئلة الفصل من الكتاب (بترتيب الكتاب)</h2><div id="bq"></div>
      ${c.book_problems.length ? '<h2 style="margin-top:18px">مسائل الفصل من الكتاب</h2><div id="bp"></div>' : ''}</div>`;
    const bq = $('#bq', main);
    c.book_questions.forEach(b => bq.append(P.renderQuestion(P.qById[b.qid], { showLesson: true })));
    const bp = $('#bp', main);
    if (bp) c.book_problems.forEach(id => bp.append(P.problemCard(P.exById[id])));
  });

  // ------------------------------------------------------------ لوحة التقدم
  P.route('progress', function (main) {
    const s = store.s;
    const rows = P.lessons.map(l => ({ l, st: P.lessonStats(l.id) }));
    const ranked = rows.filter(r => r.st.answered >= 3).sort((a, b) => b.st.acc - a.st.acc);
    const best = ranked.slice(0, 3), worst = ranked.slice(-3).reverse().filter(r => !best.includes(r));
    const review = rows.filter(r => P.needsReview(r.l.id));
    const pctTxt = v => v === null ? '—' : Math.round(v * 100) + '%';
    main.innerHTML = `<div class="page-head"><div><h1>لوحة التقدم</h1><p>${store.persistent() ? 'يُحفظ تقدمك في هذا المتصفح.' : 'التخزين في المتصفح غير متاح هنا: تقدمك محفوظ حتى إغلاق الصفحة فقط.'}</p></div></div>
      <div class="stats">
        ${P.D.chapters.map(c => { const p = Math.round(P.chapterPct(c.n) * 100); return `<div class="card stat ch${c.n}c"><div class="muted small">${c.short}</div><div class="big">${p}%</div><div class="bar-p c"><i style="width:${p}%"></i></div></div>`; }).join('')}
        <div class="card stat"><div class="muted small">دروس مكتملة</div><div class="big">${rows.filter(r => r.st.done).length}/${rows.length}</div></div>
        <div class="card stat"><div class="muted small">مسائل محلولة</div><div class="big">${Object.keys(s.problems).length}</div></div>
        <div class="card stat"><div class="muted small">أسئلة مُجابة</div><div class="big">${Object.keys(s.q).length}</div></div>
      </div>
      <div class="grid" style="margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card"><h3>الدروس المكتملة</h3><div class="row">${rows.filter(r => r.st.done).map(r => P.lessonLink(r.l)).join('') || '<span class="muted">لم تُنهِ أي درس بعد.</span>'}</div></div>
        <div class="card"><h3>تحتاج مراجعة</h3><p class="small muted">دقة أقل من 60% في أسئلة الدرس، أو بطاقات وضعتها في «أحتاج مراجعتها».</p>
          <div class="list">${review.map(r => `<div class="li"><a href="#lesson-${r.l.id}">${r.l.sec} ${r.l.title}</a><span class="small">${r.st.acc !== null ? 'الدقة ' + pctTxt(r.st.acc) : ''}${r.st.review ? ' · ' + r.st.review + ' بطاقة' : ''}</span></div>`).join('') || '<span class="muted">لا شيء حالياً.</span>'}</div></div>
        <div class="card"><h3>نقاط القوة</h3><div class="list">${best.map(r => `<div class="li"><span>${r.l.sec} ${r.l.title}</span><b class="pill ok">${pctTxt(r.st.acc)}</b></div>`).join('') || '<span class="muted">أجب عن 3 أسئلة على الأقل في الدرس ليظهر هنا.</span>'}</div></div>
        <div class="card"><h3>نقاط الضعف</h3><div class="list">${worst.map(r => `<div class="li"><a href="#lesson-${r.l.id}">${r.l.sec} ${r.l.title}</a><b class="pill warn">${pctTxt(r.st.acc)}</b></div>`).join('') || '<span class="muted">لا توجد بيانات كافية بعد.</span>'}</div></div>
      </div>
      <div class="card" style="margin-top:14px"><h3>دقة كل درس</h3><div class="tablewrap"><table><tr><th>الدرس</th><th>أسئلة مُجابة</th><th>الدقة</th><th>الحالة</th></tr>
        ${rows.map(r => `<tr><td><a href="#lesson-${r.l.id}">${r.l.sec} ${r.l.title}</a></td><td>${r.st.answered} / ${r.st.total}</td><td>${pctTxt(r.st.acc)}</td><td>${r.st.done ? '<span class="pill ok">مكتمل</span>' : ''} ${P.needsReview(r.l.id) ? '<span class="pill warn">مراجعة</span>' : ''}</td></tr>`).join('')}</table></div></div>
      <div class="card" style="margin-top:14px"><h3>سجل الاختبارات</h3>${s.quizzes.length ? `<div class="tablewrap"><table><tr><th>التاريخ</th><th>الاختبار</th><th>الدرجة</th><th>النسبة</th></tr>${s.quizzes.slice().reverse().map(z => `<tr><td>${new Date(z.date).toLocaleString('ar-IQ')}</td><td>${z.title}</td><td>${z.score} / ${z.total}</td><td>${Math.round(z.score / z.total * 100)}%</td></tr>`).join('')}</table></div>` : '<p class="muted">لم تؤدِّ أي اختبار بعد.</p>'}</div>
      <div class="card" style="margin-top:14px"><h3>تصدير التقدم أو تصفيره</h3>
        <div class="row"><button class="btn" id="exp">تصدير التقدم (نسخ نص JSON)</button><button class="btn" id="rst" style="color:var(--warn)">تصفير التقدم</button></div><div id="pz"></div></div>`;
    $('#exp', main).onclick = () => {
      const txt = store.exportText(); const pz = $('#pz', main);
      pz.innerHTML = `<pre class="export"></pre>`; $('pre', pz).textContent = txt;
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => P.toast('نُسخ نص التقدم.'), () => P.toast('لم يُسمح بالنسخ؛ انسخ النص من المربع.'));
    };
    $('#rst', main).onclick = () => {
      const pz = $('#pz', main);
      pz.innerHTML = `<div class="confirm"><p><b>هل أنت متأكد؟</b> سيُحذف كل تقدمك: الدروس المكتملة والإجابات والبطاقات وسجل الاختبارات.</p><div class="row"><button class="btn" id="yes" style="color:var(--warn)">نعم، صفّر التقدم</button><button class="btn" id="no">إلغاء</button></div></div>`;
      $('#yes', pz).onclick = () => { store.reset(); P.toast('صُفّر التقدم.'); go(); };
      $('#no', pz).onclick = () => pz.innerHTML = '';
    };
  });

  // ------------------------------------------------------------ السمة
  P.initTheme = function () {
    const btn = $('#theme'); let t = null;
    try { t = localStorage.getItem('phys3-theme'); } catch (e) { }
    const apply = v => { if (v) document.documentElement.setAttribute('data-theme', v); btn.textContent = (v || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark' ? 'فاتح' : 'داكن'; };
    apply(t);
    btn.onclick = () => {
      const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const nv = cur === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('phys3-theme', nv); } catch (e) { }
      apply(nv); go();
    };
  };
})(window.P);

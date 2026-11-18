/* عرض الأسئلة وتصحيحها، وبنك الأسئلة، والاختبارات الشاملة */
(function (P) {
  'use strict';
  const { h, $, $$, store } = P;
  const LET = ['a', 'b', 'c', 'd', 'e'];
  const UNITS = ['N', 'C', 'N/C', 'm', 'إلكترون', 'N·m²/C²'];

  function gradeFill(q, val) {
    if (q.value != null) { const v = P.parseNum(val); return isFinite(v) && P.close(v, q.value) ? 1 : 0; }
    const u = P.norm(val); if (!u) return 0;
    const uw = u.split(' ').map(P.normWord);
    return q.accept.some(a => { const an = P.norm(a); if (!an) return false; if (u === an || u.includes(an)) return 1; const aw = an.split(' ').map(P.normWord); return aw.every(w => uw.includes(w)); }) ? 1 : 0;
  }
  const modelText = q => {
    if (q.options) return `${LET[q.answer]}) ${q.options[q.answer]}`;
    if (q.type === 'tf') return q.answer ? 'صح' : 'خطأ';
    if (q.type === 'calc' || (q.type === 'fill' && q.value != null)) return `<span class="ltr">${P.sci(q.value)} ${q.unit || ''}</span>`;
    if (q.type === 'fill') return q.accept[0];
    return q.answer;
  };
  P.isAuto = q => !!(q.options || q.type === 'tf' || q.type === 'fill' || q.type === 'calc');

  /* opts: onAnswer(r), showLesson */
  P.renderQuestion = function (q, opts) {
    opts = opts || {};
    const l = P.lessonById[q.lesson];
    const el = h('div', { class: 'qcard', 'data-q': q.id });
    const meta = `<div class="qmeta"><span class="pill q">${P.TYPE_NAMES[q.type] || q.type}</span>${P.srcPill(q)}${opts.showLesson && l ? `<a class="pill" href="#lesson-${l.id}">${l.sec} ${l.title}</a>` : ''}${opts.num ? `<span class="pill">${opts.num}</span>` : ''}</div>`;
    el.innerHTML = meta + `<div class="qtext">${q.prompt}</div>` + (q.fig ? P.fig(q.fig) : '');
    const body = h('div'); el.append(body);
    const fb = h('div'); el.append(fb);
    let answered = false;
    const finish = (r, extra) => {
      if (answered) return; answered = true;
      P.recordQ(q.id, r);
      const cls = r === 1 ? 'ok' : r === 0.5 ? 'part' : 'bad';
      const head = r === 1 ? 'إجابة صحيحة.' : r === 0.5 ? 'إجابة جزئية.' : 'إجابة غير صحيحة.';
      fb.innerHTML = `<div class="fb ${cls}"><b>${head}</b> ${extra || ''}</div>` +
        ((q.options || q.type === 'tf') ? '' : `<div class="model"><b class="t">الإجابة:</b> ${modelText(q)}</div>`) +
        (q.explain ? `<div class="small muted">${q.explain}</div>` : '');
      if (opts.onAnswer) opts.onAnswer(r);
    };

    if (q.options || q.type === 'tf') {
      const list = q.options ? q.options.map((o, i) => [i, o]) : [[true, 'صح'], [false, 'خطأ']];
      const box = h('div', { class: 'opts' });
      list.forEach(([val, txt], i) => {
        const b = h('button', { class: 'opt', type: 'button', html: `${q.options ? `<span class="l">${LET[i]}</span>` : ''}<span>${txt}</span>` });
        b.onclick = () => {
          if (answered) return;
          const right = val === q.answer;
          $$('.opt', box).forEach((x, j) => { x.disabled = true; if (list[j][0] === q.answer) x.classList.add('right'); });
          if (!right) b.classList.add('wrong');
          finish(right ? 1 : 0, right ? '' : `الصحيح: ${q.options ? LET[q.answer] + ') ' + q.options[q.answer] : (q.answer ? 'صح' : 'خطأ')}`);
        };
        box.append(b);
      });
      body.append(box);
    } else if (q.type === 'fill' || q.type === 'calc') {
      const numeric = q.type === 'calc' || q.value != null;
      const inp = h('input', { class: 'ans', type: 'text', inputmode: numeric ? 'decimal' : 'text', placeholder: numeric ? 'مثال: 3.24e-5' : 'اكتب الكلمة الناقصة', 'aria-label': 'إجابتك', dir: numeric ? 'ltr' : 'rtl' });
      const unit = q.type === 'calc' ? h('select', { class: 'ans', 'aria-label': 'الوحدة', style: 'min-width:0' }, h('option', { value: '' }, 'الوحدة'), ...UNITS.map(u => h('option', { value: u }, u))) : null;
      const btn = h('button', { class: 'btn', type: 'button' }, 'تحقق');
      const row = h('div', { class: 'try' }, inp, unit, btn); body.append(row);
      const check = () => {
        if (answered) return;
        if (!inp.value.trim()) { fb.innerHTML = '<div class="fb hint">اكتب إجابتك أولاً.</div>'; return; }
        if (numeric && !isFinite(P.parseNum(inp.value))) { fb.innerHTML = '<div class="fb hint">اكتب عدداً، مثل 12 أو 3.24e-5 أو 2×10^3.</div>'; return; }
        let r = gradeFill(q, inp.value), note = '';
        if (r && unit) { if (!unit.value) { fb.innerHTML = '<div class="fb hint">الرقم صحيح؛ اختر الوحدة أيضاً.</div>'; return; } if (unit.value !== q.unit) { r = 0.5; note = 'الرقم صحيح لكن الوحدة خاطئة.'; } }
        inp.disabled = true; btn.disabled = true; if (unit) unit.disabled = true;
        finish(r, note);
      };
      btn.onclick = check; inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    } else {
      // أسئلة مفتوحة: يكتب الطالب ثم تظهر الإجابة النموذجية ويقيّم نفسه
      const ta = h('textarea', { class: 'ans', placeholder: 'اكتب إجابتك هنا أولاً…', 'aria-label': 'إجابتك' });
      const btn = h('button', { class: 'btn', type: 'button' }, 'اعرض الإجابة النموذجية');
      body.append(ta, h('div', { class: 'row', style: 'margin-top:6px' }, btn));
      btn.onclick = () => {
        if (ta.value.trim().length < 3) { fb.innerHTML = '<div class="fb hint">حاول أن تكتب إجابتك أولاً، ثم قارنها بالإجابة النموذجية.</div>'; ta.focus(); return; }
        ta.readOnly = true; btn.remove();
        const srcNote = q.source === 'book' && q.explain ? '' : '';
        fb.innerHTML = `<div class="model"><b class="t">الإجابة النموذجية:</b> ${q.answer}${q.answer_fig ? P.fig(q.answer_fig) : ''}</div>${q.explain ? `<div class="small muted">${q.explain}</div>` : ''}${srcNote}<p class="small">قيّم إجابتك بأمانة:</p>`;
        const rr = h('div', { class: 'row' });
        [[1, 'صحيحة'], [0.5, 'جزئية'], [0, 'خاطئة']].forEach(([r, t]) => rr.append(h('button', { class: 'btn sm', type: 'button', onclick: () => { rr.remove(); answered = false; const keep = fb.innerHTML; finish(r, ''); fb.innerHTML = keep + `<div class="fb ${r === 1 ? 'ok' : r ? 'part' : 'bad'}">قيّمت إجابتك: ${t}</div>`; } }, t)));
        fb.append(rr);
      };
    }
    return el;
  };

  // ------------------------------------------------------------ جلسة أسئلة (تدريب أو اختبار)
  function balanced(lessons, n) {
    const pools = P.shuffle(lessons).map(l => P.shuffle(l.questions));
    const out = []; let i = 0;
    while (out.length < n && pools.some(p => p.length)) { const p = pools[i % pools.length]; if (p.length) out.push(p.pop()); i++; }
    return P.shuffle(out);
  }
  function runSession(main, sess) {
    const res = {};
    const total = sess.qs.length;
    main.innerHTML = '';
    const bar = h('div', { class: 'scorebar' });
    const list = h('div');
    main.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, sess.title), h('p', null, sess.sub || ''))), bar, list);
    let t0 = Date.now(), timerId = null, finished = false;
    const draw = () => {
      const ans = Object.keys(res).length, score = Object.values(res).reduce((a, b) => a + b, 0);
      const pct = ans ? Math.round(score / ans * 100) : 0;
      let tm = '';
      if (sess.limit) { const left = Math.max(0, sess.limit - Math.floor((Date.now() - t0) / 1000)); tm = `<span class="timer">⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>`; if (!left && !finished) end(); }
      bar.innerHTML = `<span>أجبت عن <b>${ans}</b> من ${total}</span><span class="big">${score} / ${ans}</span><span>النسبة <b>${pct}%</b></span>${tm}`;
      const b = h('button', { class: 'btn primary sm', type: 'button' }, finished ? 'انتهى' : 'أنهِ وأظهر النتيجة'); b.disabled = finished; b.onclick = end; bar.append(b);
    };
    const end = () => {
      if (finished) return; finished = true; clearInterval(timerId);
      const score = Object.values(res).reduce((a, b) => a + b, 0);
      if (sess.log) { store.s.quizzes.push({ date: Date.now(), title: sess.title, score, total }); store.save(); }
      $$('.qcard button, .qcard input, .qcard textarea, .qcard select', list).forEach(x => { if (!x.closest('.fb')) x.disabled = true; });
      const wrong = sess.qs.filter(q => (res[q.id] || 0) < 1);
      const sum = h('div', { class: 'card', style: 'margin:12px 0' });
      sum.innerHTML = `<h2>النتيجة: ${score} من ${total} (${Math.round(score / total * 100)}%)</h2><p>${wrong.length ? `أخطأت أو لم تُجب عن ${wrong.length} سؤالاً.` : 'ممتاز! أجبت عن كل الأسئلة إجابة صحيحة.'}</p>`;
      const r = h('div', { class: 'row' });
      if (wrong.length) r.append(h('button', { class: 'btn primary', type: 'button', onclick: () => runSession(main, { title: 'إعادة ما أخطأت فيه', sub: sess.title, qs: wrong, log: false }) }, 'أعد ما أخطأت فيه'));
      r.append(h('a', { class: 'btn', href: '#progress' }, 'لوحة التقدم'), h('button', { class: 'btn', type: 'button', onclick: () => P.go() }, 'العودة إلى الاختبارات'));
      sum.append(r); bar.after(sum); draw(); sum.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    sess.qs.forEach((q, i) => list.append(P.renderQuestion(q, { showLesson: true, num: `${i + 1}`, onAnswer: r => { res[q.id] = r; draw(); if (Object.keys(res).length === total && !finished) end(); } })));
    if (sess.limit) { timerId = setInterval(draw, 1000); P.onLeave(() => clearInterval(timerId)); }
    draw();
  }
  P.runSession = runSession;

  P.route('quiz', function (main) {
    const pre = P.bankLesson; P.bankLesson = null;
    main.innerHTML = `<div class="page-head"><div><h1>بنك الأسئلة والاختبارات</h1><p>${Object.keys(P.qById).length} سؤالاً: أسئلة الكتاب موسومة «من الكتاب»، والبقية «تدريب إضافي».</p></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
        <div class="card ch1c" style="border-top:5px solid var(--ch1)"><h3>اختبار شامل للفصل الأول</h3><p class="small muted">20 سؤالاً عشوائياً موزعة بتوازن على دروس الكهربائية الساكنة.</p><button class="btn ch1" id="t1">ابدأ</button></div>
        <div class="card" style="border-top:5px solid var(--ch2)"><h3>اختبار شامل للفصل الثاني</h3><p class="small muted">15 سؤالاً عشوائياً من دروس المغناطيسية.</p><button class="btn ch2" id="t2">ابدأ</button></div>
        <div class="card" style="border-top:5px solid var(--ink)"><h3>الاختبار النهائي للفصلين</h3><p class="small muted">30 سؤالاً من الفصلين.</p><label class="small"><input type="checkbox" id="tm"> مؤقت 45 دقيقة</label><div style="margin-top:6px"><button class="btn primary" id="t3">ابدأ</button></div></div>
      </div>
      <div class="card" style="margin-top:14px"><h3>تدرّب على درس</h3>
        <div class="row"><select id="bl" class="ans" aria-label="الدرس" style="min-width:0">${P.lessons.map(l => `<option value="${l.id}">${l.sec} ${l.title} (${l.questions.length})</option>`).join('')}</select>
        <select id="bt" class="ans" aria-label="نوع السؤال" style="min-width:0"><option value="">كل الأنواع</option>${Object.entries(P.TYPE_NAMES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
        <select id="bs" class="ans" aria-label="المصدر" style="min-width:0"><option value="">كل المصادر</option><option value="book">من الكتاب</option><option value="extra">تدريب إضافي</option></select>
        <button class="btn primary" id="go">ابدأ التدريب</button></div>
        <p class="small muted">التدريب لا يُسجَّل في سجل الاختبارات، لكن نتائجه تُحسب في دقة كل درس.</p></div>`;
    if (pre) $('#bl', main).value = pre;
    const ch = n => P.D.chapters[n - 1].lessons;
    $('#t1', main).onclick = () => runSession(main, { title: 'اختبار شامل: الفصل الأول', sub: 'الكهربائية الساكنة', qs: balanced(ch(1), 20), log: true });
    $('#t2', main).onclick = () => runSession(main, { title: 'اختبار شامل: الفصل الثاني', sub: 'المغناطيسية', qs: balanced(ch(2), 15), log: true });
    $('#t3', main).onclick = () => runSession(main, { title: 'الاختبار النهائي للفصلين', qs: balanced(P.lessons, 30), log: true, limit: $('#tm', main).checked ? 45 * 60 : 0 });
    $('#go', main).onclick = () => {
      const l = P.lessonById[$('#bl', main).value], t = $('#bt', main).value, s = $('#bs', main).value;
      const qs = l.questions.filter(q => (!t || q.type === t) && (!s || q.source === s));
      if (!qs.length) { P.toast('لا توجد أسئلة بهذا الفلتر.'); return; }
      runSession(main, { title: `تدريب: ${l.sec} ${l.title}`, sub: `${qs.length} سؤالاً`, qs, log: false });
    };
  });
})(window.P);

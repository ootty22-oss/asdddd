/* بطاقات الحفظ */
(function (P) {
  'use strict';
  const { h, $, $$, store } = P;
  const KIND = { def: 'تعريف', law: 'قانون', unit: 'رموز ووحدات', note: 'تذكّر', compare: 'مقارنة', faq: 'سؤال شائع' };
  const KCOL = { def: 'var(--def)', law: 'var(--law)', unit: 'var(--law)', note: 'var(--note)', compare: 'var(--act)', faq: 'var(--ex)' };

  P.route('cards', function (main) {
    const all = P.lessons.flatMap(l => l.cards.map(c => Object.assign({ lesson: l.id, ch: l.ch }, c)));
    const st = { ch: '', lesson: '', kind: '', reviewOnly: false, i: 0 };
    main.innerHTML = `<div class="page-head"><div><h1>بطاقات الحفظ</h1><p>${all.length} بطاقة. اضغط البطاقة أو مفتاح المسافة لقلبها، والأسهم للتنقل.</p></div></div>
      <div class="card"><div class="row">
        <select id="cc" class="ans" style="min-width:0" aria-label="الفصل"><option value="">كل الفصول</option><option value="1">الفصل الأول</option><option value="2">الفصل الثاني</option></select>
        <select id="cl" class="ans" style="min-width:0" aria-label="الدرس"></select>
        <select id="ck" class="ans" style="min-width:0" aria-label="النوع"><option value="">كل الأنواع</option>${Object.entries(KIND).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
        <label class="small"><input type="checkbox" id="cr"> راجع ما أحتاج مراجعته فقط</label></div>
        <div class="row small muted" id="csum" style="margin-top:6px"></div></div>
      <div id="cstage"></div>`;
    const fillLessons = () => {
      $('#cl', main).innerHTML = '<option value="">كل الدروس</option>' + P.lessons.filter(l => !st.ch || l.ch === +st.ch).map(l => `<option value="${l.id}">${l.sec} ${l.title}</option>`).join('');
      $('#cl', main).value = st.lesson;
    };
    const deck = () => all.filter(c => (!st.ch || c.ch === +st.ch) && (!st.lesson || c.lesson === st.lesson) && (!st.kind || c.kind === st.kind) && (!st.reviewOnly || store.s.cards[c.id] === 'review'));
    const draw = () => {
      const d = deck();
      const known = all.filter(c => store.s.cards[c.id] === 'known').length, rev = all.filter(c => store.s.cards[c.id] === 'review').length;
      $('#csum', main).innerHTML = `<span>أتقنتها: <b>${known}</b></span> · <span>أحتاج مراجعتها: <b>${rev}</b></span> · <span>في هذه المجموعة: <b>${d.length}</b></span>`;
      const stage = $('#cstage', main); stage.innerHTML = '';
      if (!d.length) { stage.innerHTML = `<p class="card muted" style="margin-top:12px">${st.reviewOnly ? 'لا توجد بطاقات في «أحتاج مراجعتها» بهذا الفلتر. أحسنت!' : 'لا توجد بطاقات بهذا الفلتر.'}</p>`; return; }
      st.i = Math.max(0, Math.min(st.i, d.length - 1));
      const c = d[st.i], l = P.lessonById[c.lesson], mark = store.s.cards[c.id];
      const fl = h('div', { class: 'flash', tabindex: '0', role: 'button', 'aria-label': 'اقلب البطاقة' });
      fl.innerHTML = `<div class="face front"><span class="k pill" style="color:${KCOL[c.kind]}">${KIND[c.kind]}</span><div class="t">${P.esc(c.front)}</div><div class="small muted" style="margin-top:12px">${l.sec} ${l.title}</div></div>
        <div class="face back"><span class="k pill" style="color:${KCOL[c.kind]}">${KIND[c.kind]}</span><div class="t">${P.esc(c.back)}</div></div>`;
      const wrap = h('div', { class: `flash-wrap ch${c.ch}c` }, fl);
      fl.onclick = () => fl.classList.toggle('flipped');
      const ctl = h('div', { class: 'cardctl' },
        h('button', { class: 'btn', type: 'button', onclick: () => { st.i = (st.i - 1 + d.length) % d.length; draw(); } }, '→ السابقة'),
        h('span', { style: 'align-self:center' }, `${st.i + 1} / ${d.length}`),
        h('button', { class: 'btn', type: 'button', onclick: () => { st.i = (st.i + 1) % d.length; draw(); } }, 'التالية ←'));
      const mk = h('div', { class: 'cardctl' },
        h('button', { class: 'btn' + (mark === 'known' ? ' on' : ''), type: 'button', onclick: () => setMark(c, 'known', d) }, '✓ أتقنتها'),
        h('button', { class: 'btn' + (mark === 'review' ? ' on' : ''), type: 'button', onclick: () => setMark(c, 'review', d) }, 'أحتاج مراجعتها'));
      stage.append(wrap, ctl, mk);
    };
    const setMark = (c, m, d) => {
      if (store.s.cards[c.id] === m) delete store.s.cards[c.id]; else store.s.cards[c.id] = m;
      store.save();
      if (!(st.reviewOnly && m === 'known')) st.i = (st.i + 1) % d.length;
      draw();
    };
    $('#cc', main).onchange = e => { st.ch = e.target.value; st.lesson = ''; st.i = 0; fillLessons(); draw(); };
    $('#cl', main).onchange = e => { st.lesson = e.target.value; st.i = 0; draw(); };
    $('#ck', main).onchange = e => { st.kind = e.target.value; st.i = 0; draw(); };
    $('#cr', main).onchange = e => { st.reviewOnly = e.target.checked; st.i = 0; draw(); };
    const key = e => {
      if (!document.body.contains(main) || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const fl = $('.flash', main); if (!fl) return;
      if (e.key === ' ') { e.preventDefault(); fl.classList.toggle('flipped'); }
      if (e.key === 'ArrowLeft') { st.i++; draw(); } if (e.key === 'ArrowRight') { st.i = Math.max(0, st.i - 1); draw(); }
    };
    document.addEventListener('keydown', key); P.onLeave(() => document.removeEventListener('keydown', key));
    fillLessons(); draw();
  });
})(window.P);

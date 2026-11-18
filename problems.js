/* المسائل: حل خطوة بخطوة ووضع «حاول بنفسك» */
(function (P) {
  'use strict';
  const { h, $, $$, store } = P;
  const UNITS = ['N', 'C', 'N/C', 'm', 'إلكترون'];
  const LAWNAME = { coulomb: 'قانون كولوم', efield: 'E = F/q′', field_force: 'F = q′E', charge: 'q = n·e' };

  P.solutionEl = function (ex, opt) {
    opt = opt || {};
    const steps = [
      ['المعطيات', ex.given.join('، ')], ['المطلوب', ex.required], ['القانون', ex.law + `<div class="small muted">سبب اختياره: ${ex.why}</div>`],
      ['التعويض', ex.sub], ['الحساب', ex.work], ['الناتج', `<span class="result">${ex.answer_text}</span>`]];
    const wrap = h('div', { class: 'solution' });
    const ol = h('ol'); steps.forEach(([k, v]) => ol.append(h('li', { html: `<span class="lbl">${k}:</span> ${v}`, hidden: opt.stepwise ? true : null })));
    wrap.append(ol);
    if (opt.stepwise) {
      const lis = $$('li', ol);
      const row = h('div', { class: 'row' });
      const nx = h('button', { class: 'btn sm', type: 'button' }, 'أظهر الخطوة التالية');
      const all = h('button', { class: 'btn sm', type: 'button' }, 'أظهر الحل كاملاً');
      const upd = () => { const left = lis.filter(li => li.hidden).length; nx.disabled = !left; all.disabled = !left; nx.textContent = left ? `أظهر الخطوة التالية (${lis.length - left + 1}/${lis.length})` : 'اكتمل الحل'; };
      nx.onclick = () => { const li = lis.find(x => x.hidden); if (li) li.hidden = false; upd(); };
      all.onclick = () => { lis.forEach(x => x.hidden = false); upd(); };
      row.append(nx, all); wrap.prepend(row); upd();
      wrap.revealNext = () => nx.click(); wrap.revealAll = () => all.click();
    }
    return wrap;
  };

  P.problemCard = function (ex) {
    const l = P.lessonById[ex.lesson];
    const el = h('div', { class: 'qcard', 'data-ex': ex.id });
    const solved = store.s.problems[ex.id];
    el.innerHTML = `<div class="qmeta">${P.srcPill(ex)}<span class="pill">${LAWNAME[ex.calc.law]}</span><a class="pill" href="#lesson-${l.id}">${l.sec}</a>${solved ? '<span class="pill ok">✓ حللتها</span>' : ''}</div>
      <h3 style="margin:2px 0">${ex.title}</h3><p class="qtext" style="font-weight:500">${ex.text}</p>`;
    const zone = h('div'); el.append(zone);
    const ctl = h('div', { class: 'row' },
      h('button', { class: 'btn primary sm', type: 'button', onclick: () => tryMode() }, 'حاول بنفسك'),
      h('button', { class: 'btn sm', type: 'button', onclick: () => { zone.innerHTML = ''; zone.append(P.solutionEl(ex, { stepwise: true })); } }, 'اعرض الحل خطوة بخطوة'));
    el.insertBefore(ctl, zone);
    function tryMode() {
      zone.innerHTML = '';
      const inp = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'مثال: 3.24e-5', 'aria-label': 'الناتج', dir: 'ltr' });
      const unit = h('select', { 'aria-label': 'الوحدة' }, h('option', { value: '' }, 'الوحدة'), ...UNITS.map(u => h('option', { value: u }, u)));
      const b = h('button', { class: 'btn', type: 'button' }, 'تحقق');
      const fb = h('div'); const sol = P.solutionEl(ex, { stepwise: true }); sol.hidden = true;
      let tries = 0;
      zone.append(h('div', { class: 'try' }, h('span', null, 'الناتج:'), inp, unit, b), h('p', { class: 'small muted' }, 'اكتب العدد بصيغة مثل 12 أو 3.24e-5 أو 2×10^3، والمقدار دون إشارة.'), fb, sol);
      const check = () => {
        const v = P.parseNum(inp.value);
        if (!isFinite(v)) { fb.innerHTML = '<div class="fb hint">اكتب عدداً صحيح الصيغة.</div>'; return; }
        if (!unit.value) { fb.innerHTML = '<div class="fb hint">اختر الوحدة.</div>'; return; }
        const okNum = P.close(Math.abs(v), ex.answer, 0.01), okUnit = unit.value === ex.unit;
        if (okNum && okUnit) {
          fb.innerHTML = `<div class="fb ok"><b>صحيح!</b> ${ex.answer_text}</div>`;
          store.s.problems[ex.id] = Date.now(); store.save(); sol.hidden = false; sol.revealAll(); inp.disabled = b.disabled = unit.disabled = true;
          return;
        }
        tries++;
        let msg = okNum ? 'الرقم صحيح لكن الوحدة غير صحيحة.' : okUnit ? 'الوحدة صحيحة لكن الرقم غير صحيح.' : 'الإجابة غير صحيحة.';
        if (tries === 1) fb.innerHTML = `<div class="fb bad">${msg}</div><div class="fb hint"><b>تلميح:</b> ${ex.hint}</div>`;
        else { fb.innerHTML = `<div class="fb bad">${msg} تُكشف لك خطوة من الحل؛ حاول مرة أخرى.</div><div class="fb hint"><b>تلميح:</b> ${ex.hint}</div>`; sol.hidden = false; sol.revealNext(); }
      };
      b.onclick = check; inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
      inp.focus();
    }
    return el;
  };

  P.route('problems', function (main) {
    const all = P.lessons.flatMap(l => l.examples);
    main.innerHTML = `<div class="page-head"><div><h1>المسائل</h1><p>أمثلة الكتاب ومسائله (${all.filter(e => e.source === 'book').length}) ومسائل تدريب إضافية (${all.filter(e => e.source === 'extra').length}) على قوانين الكتاب الأربعة فقط. كل جواب أُعيد حسابه آلياً.</p></div></div>
      <div class="probfilters" role="group" aria-label="تصفية المسائل"><button class="btn sm on" data-f="">الكل</button><button class="btn sm" data-f="book">من الكتاب</button><button class="btn sm" data-f="extra">تدريب إضافي</button>
      <span style="width:12px"></span>${Object.entries(LAWNAME).map(([k, v]) => `<button class="btn sm" data-l="${k}"><span class="ltr">${v}</span></button>`).join('')}</div><div id="plist"></div>`;
    let fs = '', fl = '';
    const draw = () => {
      const pl = $('#plist', main); pl.innerHTML = '';
      const items = all.filter(e => (!fs || e.source === fs) && (!fl || e.calc.law === fl)).sort((a, b) => (a.source === 'book' ? 0 : 1) - (b.source === 'book' ? 0 : 1));
      items.forEach(e => pl.append(P.problemCard(e)));
      $$('[data-f]', main).forEach(b => b.classList.toggle('on', b.dataset.f === fs));
      $$('[data-l]', main).forEach(b => b.classList.toggle('on', b.dataset.l === fl));
    };
    $$('[data-f]', main).forEach(b => b.onclick = () => { fs = b.dataset.f; draw(); });
    $$('[data-l]', main).forEach(b => b.onclick = () => { fl = fl === b.dataset.l ? '' : b.dataset.l; draw(); });
    draw();
  });
})(window.P);

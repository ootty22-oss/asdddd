/* «اسأل مدرس الفيزياء»: يستعمل Claude إن أتاحته الصفحة، وإلا مساعداً محلياً يبحث في الكتاب */
(function (P) {
  'use strict';
  const { h, $, $$ } = P;

  // ------------------------------------------------------------ فهرس البحث
  let IDX = null;
  function buildIndex() {
    IDX = [];
    const add = (l, kind, title, html, extra) => IDX.push({ l, kind, title, html, text: P.norm(title + ' ' + P.strip(html) + ' ' + (extra || '')), tnorm: P.norm(title) });
    P.lessons.forEach(l => {
      add(l, 'درس', `${l.sec} ${l.title}`, l.summary + '<p>' + l.intro.what + '</p>');
      l.explain.forEach(it => add(l, it.kind === 'app' ? 'تطبيق' : it.kind === 'note' ? 'تذكّر' : 'شرح', it.title, it.html));
      l.definitions.forEach(d => add(l, 'تعريف', d.term, d.text));
      l.laws.forEach(x => add(l, 'قانون', x.name, (x.statement ? `<p>${x.statement}</p>` : '') + x.formula + '<p><b>متى نستخدمه؟</b> ' + x.when + '</p>', x.symbols.map(s => s.meaning).join(' ')));
      l.activities.forEach(a => add(l, 'نشاط', a.title, `<p>${a.tools}</p><ol>${a.steps.map(s => `<li>${s}</li>`).join('')}</ol><p><b>النتيجة:</b> ${a.result}</p>`));
      l.enrich.forEach(e => add(l, 'للاطلاع', e.title, e.html));
      l.questions.filter(q => !P.isAuto(q)).forEach(q => add(l, q.source === 'book' ? 'سؤال من الكتاب' : 'سؤال', P.strip(q.prompt).slice(0, 90), `<p><b>السؤال:</b> ${q.prompt}</p><p><b>الإجابة النموذجية:</b> ${q.answer}</p>`));
    });
  }
  const STOP = new Set(['ما', 'هو', 'هي', 'في', 'من', 'على', 'الى', 'الي', 'عن', 'ماذا', 'لماذا', 'كيف', 'هل', 'او', 'و', 'ان', 'مع', 'لي', 'اشرح', 'وضح', 'عرف', 'علل', 'متى', 'بين', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'يا', 'اريد', 'معنى', 'المقصود', 'بـ', 'ب', 'لل']);
  function search(q, n) {
    if (!IDX) buildIndex();
    const words = P.norm(q).split(' ').map(P.normWord).filter(w => w.length > 1 && !STOP.has(w));
    if (!words.length) return [];
    return IDX.map(it => {
      let s = 0;
      for (const w of words) { if (it.tnorm.includes(w)) s += 3; if (it.text.includes(w)) s += 1; }
      if (it.kind === 'تعريف' || it.kind === 'قانون') s *= 1.2;
      return { it, s };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n || 5).map(x => x.it);
  }
  P.searchBook = search;

  function lessonText(l) {
    const parts = [`[درس ${l.sec}: ${l.title} — صفحات الكتاب ${l.pages}]`, P.strip(l.summary)];
    l.explain.forEach(it => parts.push(`${it.title}: ${P.strip(it.html)}`));
    l.definitions.forEach(d => parts.push(`تعريف ${d.term}: ${P.strip(d.text)}`));
    l.laws.forEach(x => parts.push(`قانون ${x.name}: ${P.strip(x.statement || '')} ${P.strip(x.formula)} الرموز: ${x.symbols.map(s => `${s.sym} = ${P.strip(s.meaning)} (${s.unit})`).join('؛ ')}. ${P.strip(x.when)} ملاحظات: ${x.notes.map(P.strip).join('؛ ')}`));
    l.examples.filter(e => e.source === 'book').forEach(e => parts.push(`مثال من الكتاب: ${P.strip(e.text)} الحل: ${P.strip(e.answer_text)}`));
    l.activities.forEach(a => parts.push(`${a.title}: ${a.steps.map(P.strip).join(' ')} النتيجة: ${P.strip(a.result)}`));
    l.enrich.forEach(e => parts.push(`(للاطلاع) ${e.title}: ${P.strip(e.html)}`));
    return parts.join('\n');
  }

  // ------------------------------------------------------------ حلّال القوانين الأربعة (يعمل في الوضعين)
  const PRE = { C: 1, 'μC': 1e-6, nC: 1e-9 }, LEN = { m: 1, cm: 0.01 };
  const SOLVERS = {
    'coulomb-F': { t: 'قانون كولوم: إيجاد القوة F', f: [['q1', 'q₁', 'q'], ['q2', 'q₂', 'q'], ['r', 'r', 'len']] },
    'coulomb-q': { t: 'قانون كولوم: إيجاد شحنتين متماثلتين q', f: [['F', 'F (N)', 'n'], ['r', 'r', 'len']] },
    'coulomb-r': { t: 'قانون كولوم: إيجاد البعد r', f: [['q1', 'q₁', 'q'], ['q2', 'q₂', 'q'], ['F', 'F (N)', 'n']] },
    'efield-E': { t: 'المجال: E = F / q′', f: [['F', 'F (N)', 'n'], ['q', "q′", 'q']] },
    'force-F': { t: 'القوة في مجال: F = q′E', f: [['q', "q′", 'q'], ['E', 'E (N/C)', 'n']] },
    'charge-q': { t: 'الشحنة من عدد الإلكترونات: q = n × e', f: [['n', 'n (عدد الإلكترونات)', 'n']] },
    'charge-n': { t: 'عدد الإلكترونات: n = q ÷ e', f: [['q', 'q', 'q']] },
  };
  const S = v => `<span class="ltr">${P.sci(v)}</span>`;
  function solve(id, v) {
    const k = 9e9, e = 1.6e-19;
    const st = (g, law, sub, res) => `<div class="solution"><ol><li><span class="lbl">المعطيات:</span> ${g}</li><li><span class="lbl">القانون:</span> <span class="ltr">${law}</span></li><li><span class="lbl">التعويض:</span> <span class="ltr">${sub}</span></li><li><span class="lbl">الناتج:</span> <span class="result">${res}</span></li></ol></div>`;
    switch (id) {
      case 'coulomb-F': { const F = k * Math.abs(v.q1 * v.q2) / v.r ** 2; const typ = v.q1 * v.q2 > 0 ? 'تنافر' : v.q1 * v.q2 < 0 ? 'تجاذب' : '—';
        return st(`q₁ = ${S(v.q1)} C، q₂ = ${S(v.q2)} C، r = ${S(v.r)} m`, 'F = k q₁ q₂ / r²', `F = 9×10<sup>9</sup> × (${P.sci(Math.abs(v.q1))}) × (${P.sci(Math.abs(v.q2))}) / (${P.sci(v.r)})²`, `F = ${S(F)} N — قوة ${typ}`); }
      case 'coulomb-q': { const q = Math.sqrt(v.F * v.r ** 2 / k);
        return st(`F = ${S(v.F)} N، r = ${S(v.r)} m، الشحنتان متماثلتان`, 'q² = F r² / k', `q² = ${P.sci(v.F)} × (${P.sci(v.r)})² / 9×10<sup>9</sup> = ${P.sci(q * q)}`, `q = ${S(q)} C`); }
      case 'coulomb-r': { const r = Math.sqrt(k * Math.abs(v.q1 * v.q2) / v.F);
        return st(`q₁ = ${S(v.q1)} C، q₂ = ${S(v.q2)} C، F = ${S(v.F)} N`, 'r² = k q₁ q₂ / F', `r² = 9×10<sup>9</sup> × ${P.sci(Math.abs(v.q1))} × ${P.sci(Math.abs(v.q2))} / ${P.sci(v.F)} = ${P.sci(r * r)}`, `r = ${S(r)} m`); }
      case 'efield-E': return st(`F = ${S(v.F)} N، q′ = ${S(v.q)} C`, "E = F / q′", `E = ${P.sci(v.F)} / ${P.sci(v.q)}`, `E = ${S(v.F / v.q)} N/C`);
      case 'force-F': return st(`q′ = ${S(v.q)} C، E = ${S(v.E)} N/C`, "F = q′ E", `F = ${P.sci(v.q)} × ${P.sci(v.E)}`, `F = ${S(v.q * v.E)} N`);
      case 'charge-q': return st(`n = ${S(v.n)}، e = 1.6×10<sup>−19</sup> C`, 'q = n × e', `q = ${P.sci(v.n)} × 1.6×10<sup>−19</sup>`, `q = ${S(v.n * e)} C`);
      case 'charge-n': return st(`q = ${S(v.q)} C، e = 1.6×10<sup>−19</sup> C`, 'n = q ÷ e', `n = ${P.sci(Math.abs(v.q))} ÷ 1.6×10<sup>−19</sup>`, `n = ${S(Math.abs(v.q) / e)} إلكتروناً`);
    }
  }
  function solverPanel() {
    const box = h('div', { class: 'card', style: 'margin-top:14px' });
    box.innerHTML = `<h3>أدخل المعطيات: حل مسألة على قوانين الكتاب</h3><p class="small muted">يحسب الناتج بالكود ويعرض الخطوات. اكتب الأعداد مثل 3e-9 أو 3×10^-9.</p>
      <select class="ans" id="slaw" aria-label="القانون" style="min-width:0">${Object.entries(SOLVERS).map(([k, s]) => `<option value="${k}">${s.t}</option>`).join('')}</select><div class="solver" id="sfields"></div>
      <button class="btn primary" id="sgo" type="button">احسب خطوة بخطوة</button><div id="sout" style="margin-top:8px"></div>`;
    const fields = () => {
      const s = SOLVERS[$('#slaw', box).value];
      $('#sfields', box).innerHTML = s.f.map(([k, lbl, kind]) => `<label>${lbl}<span class="row" style="flex-wrap:nowrap"><input id="sv-${k}" inputmode="decimal" style="flex:1;min-width:0">${kind === 'q' ? `<select id="su-${k}"><option>μC</option><option>nC</option><option>C</option></select>` : kind === 'len' ? `<select id="su-${k}"><option>cm</option><option>m</option></select>` : ''}</span></label>`).join('');
      $('#sout', box).innerHTML = '';
    };
    $('#slaw', box).onchange = fields;
    $('#sgo', box).onclick = () => {
      const id = $('#slaw', box).value, s = SOLVERS[id], v = {};
      for (const [k, lbl, kind] of s.f) {
        const x = P.parseNum($('#sv-' + k, box).value);
        if (!isFinite(x) || (k !== 'q1' && k !== 'q2' && x <= 0) || x === 0) { $('#sout', box).innerHTML = `<div class="fb hint">اكتب قيمة صحيحة (غير صفرية) لـ ${lbl}.</div>`; return; }
        const u = $('#su-' + k, box); v[k] = x * (kind === 'q' ? PRE[u.value] : kind === 'len' ? LEN[u.value] : 1);
      }
      $('#sout', box).innerHTML = solve(id, v);
    };
    fields();
    return box;
  }

  // ------------------------------------------------------------ عرض نص المدرس
  function md(t) {
    let s = P.esc(t);
    s = s.replace(/\[معلومة إثرائية\]/g, '<span class="enrich-tag">معلومة إثرائية</span>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    s = s.split('\n').map(line => /^\s*[-•*]\s+/.test(line) ? '• ' + line.replace(/^\s*[-•*]\s+/, '') : line).join('<br>');
    return s;
  }

  const SYS = `أنت «مدرس الفيزياء» في منصة تعليمية لطالب الصف الثالث المتوسط (العراق). الكتاب المقرر: الفصل الأول الكهربائية الساكنة، والفصل الثاني المغناطيسية.
قواعد إلزامية:
1) أجب بالعربية الفصحى المبسطة، بفقرات قصيرة وأمثلة من الحياة اليومية.
2) اعتمد على «نص الكتاب» المرفق أدناه. لا تنسب إلى الكتاب شيئاً ليس فيه، ولا تغيّر نص قانون أو رمزه أو وحدته.
3) إذا أضفت معلومة ليست في النص المرفق فابدأ سطرها بالوسم [معلومة إثرائية].
4) في حل المسائل اكتب بالترتيب: المعطيات، المطلوب، القانون وسبب اختياره، التعويض، الحساب، الناتج مع الوحدة. استعمل k = 9×10^9 N·m²/C² و e = 1.6×10^-19 C، وحوّل cm إلى m و μC وnC إلى C. تحقق من حسابك.
5) لا تستعمل LaTeX. اكتب الصيغ نصاً مثل: F = k q1 q2 / r^2. يمكنك استعمال **غامق** وقوائم تبدأ بـ "-".
6) إن كان السؤال خارج الفيزياء فاعتذر بلطف واقترح سؤالاً من المنهج.`;

  P.route('tutor', function (main) {
    const hist = [];
    main.innerHTML = `<div class="page-head"><div><h1>اسأل مدرس الفيزياء</h1><p>اسأل عن فقرة أو قانون أو مسألة من الفصلين.</p></div></div>
      <div id="tbanner" class="banner local"><b>هذا المساعد يبحث في محتوى الكتاب ولا يعمل بالذكاء الاصطناعي.</b> يعرض لك الفقرات والتعريفات والقوانين الأقرب إلى سؤالك، ويحل مسائل القوانين الأربعة من نموذج «أدخل المعطيات» أسفل الصفحة.<div class="small muted" id="tcheck">جارٍ التحقق من توفر مدرس Claude في هذه الصفحة…</div></div>
      <div class="row" id="quick" style="margin-bottom:10px"></div>
      <div class="chat" id="chat" aria-live="polite"></div>
      <form class="composer" id="comp"><textarea id="tq" placeholder="مثال: ما الفرق بين الشحن بالتماس والشحن بالحث؟" aria-label="سؤالك"></textarea><button class="btn primary" type="submit">إرسال</button></form>
      <div id="solverhere"></div>`;
    const chat = $('#chat', main);
    let sample = null, busy = false, ctrl = null;
    const say = (who, html) => { const m = h('div', { class: 'msg ' + who, html }); chat.append(m); m.scrollIntoView({ block: 'nearest' }); return m; };
    say('bot', 'أهلاً! اكتب سؤالك عن الكهربائية الساكنة أو المغناطيسية.');
    $('#solverhere', main).append(solverPanel());

    const QUICK = [['اشرح فقرة', 'اشرح لي بطريقة مبسطة فقرة: الشحن بطريقة الحث'], ['بسّط قانوناً', 'بسّط لي قانون كولوم: ماذا يعني كل رمز ومتى أستعمله؟'], ['حل مسألة خطوة بخطوة', 'حل خطوة بخطوة: شحنتان نقطيتان موجبتان متماثلتان مقدار كل منهما 3×10^-9 C والبعد بينهما 5 cm. احسب قوة التنافر.'],
      ['أعد الشرح', 'لم أفهم الشرح السابق، أعد شرحه بطريقة أخرى ومثال من الحياة اليومية.'], ['مثال إضافي', 'أعطني مثالاً إضافياً محلولاً على قانون المجال الكهربائي E = F/q′.']];
    const quick = $('#quick', main);
    const setQuick = ai => { quick.innerHTML = ''; QUICK.filter((x, i) => ai || i < 3).forEach(([t, q]) => quick.append(h('button', { class: 'btn sm', type: 'button', onclick: () => { $('#tq', main).value = q; ask(); } }, t))); };
    setQuick(false);

    function localAnswer(q) {
      const hits = search(q, 5);
      if (!hits.length) return say('bot', 'لم أجد في الكتاب فقرة تطابق كلمات سؤالك. جرّب كلمات من المنهج مثل: الحث، الكشاف، كولوم، المجال، الدايا مغناطيسية. ولحل مسألة حسابية استعمل نموذج «أدخل المعطيات» أسفل الصفحة.');
      say('bot', `<p>هذه أقرب الفقرات في الكتاب إلى سؤالك:</p>` + hits.map(it => `<div class="item ${it.kind === 'تعريف' ? 'def' : it.kind === 'قانون' ? 'law' : it.kind === 'للاطلاع' ? 'enr' : 'concept'} ${P.chOf(it.l)}"><h3>${it.title} <span class="pill">${it.kind}</span></h3>${it.html}<div class="src"><a href="#lesson-${it.l.id}">افتح الدرس ${it.l.sec} ${it.l.title}</a></div></div>`).join('') +
        (/احسب|مقدار|كم|مسال|مساله|N\b|cm|μC|nC/i.test(q) ? '<p class="small">يبدو سؤالك حسابياً: استعمل نموذج «أدخل المعطيات» أسفل الصفحة ليحسب الحل خطوة بخطوة.</p>' : ''));
    }
    async function aiAnswer(q) {
      const hits = search(q + ' ' + hist.slice(-2).map(x => x.q).join(' '), 8);
      const ls = []; hits.forEach(it => { if (!ls.includes(it.l)) ls.push(it.l); });
      if (!ls.length) ls.push(...P.lessons.filter(l => l.laws.length));
      const ctx = ls.slice(0, 3).map(lessonText).join('\n\n');
      const prev = hist.slice(-4).map(x => `الطالب: ${x.q}\nالمدرس: ${x.a}`).join('\n\n');
      const input = `${SYS}\n\n=== نص الكتاب (المرجع) ===\n${ctx}\n=== نهاية نص الكتاب ===\n\n${prev ? 'المحادثة السابقة:\n' + prev + '\n\n' : ''}سؤال الطالب الآن: ${q}`;
      const m = say('bot', '<span class="muted">يفكر…</span>');
      ctrl = new AbortController();
      try {
        const r = await sample(input, { signal: ctrl.signal, cache: false, onText: ({ text }) => { m.innerHTML = md(text); } });
        m.innerHTML = md(r.text) + `<div class="src">المصدر: ${ls.slice(0, 3).map(l => `<a href="#lesson-${l.id}">${l.sec} ${l.title}</a>`).join('، ')}</div>`;
        hist.push({ q, a: r.text });
      } catch (e) {
        if (e && e.code === 'not_granted') { sample = null; setMode(false); m.remove(); localAnswer(q); return; }
        m.innerHTML = e && e.code === 'rate_limited' ? 'كثرت الأسئلة في وقت قصير؛ انتظر قليلاً ثم أعد المحاولة. إليك ما وجدته في الكتاب:' : 'تعذّر الوصول إلى المدرس الآن. إليك ما وجدته في الكتاب:';
        localAnswer(q);
      }
    }
    async function ask() {
      const ta = $('#tq', main), q = ta.value.trim(); if (!q || busy) return;
      ta.value = ''; say('me', P.esc(q)); busy = true;
      try { if (sample) await aiAnswer(q); else localAnswer(q); } finally { busy = false; }
    }
    $('#comp', main).addEventListener('submit', e => { e.preventDefault(); ask(); });
    $('#tq', main).addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } });

    function setMode(ai) {
      const b = $('#tbanner', main); if (!b) return;
      if (ai) { b.className = 'banner ai'; b.innerHTML = '<b>المدرس هنا يعمل بـ Claude (ذكاء اصطناعي)</b> ويجيب اعتماداً على نص الكتاب الذي تمرره له المنصة. أي معلومة من خارج الكتاب تظهر بوسم <span class="enrich-tag">معلومة إثرائية</span>. قد يخطئ أحياناً، فراجع الدرس عند الشك.'; }
      else { b.className = 'banner local'; b.innerHTML = '<b>هذا المساعد يبحث في محتوى الكتاب ولا يعمل بالذكاء الاصطناعي.</b> يعرض لك الفقرات والتعريفات والقوانين الأقرب إلى سؤالك، ويحل مسائل القوانين الأربعة من نموذج «أدخل المعطيات» أسفل الصفحة.'; }
      setQuick(ai);
    }
    let alive = true; P.onLeave(() => { alive = false; if (ctrl) ctrl.abort(); });
    if (window.claude && typeof window.claude.use === 'function') {
      window.claude.use('sample').then(s => { if (!alive) return; sample = s || null; setMode(!!sample); }).catch(() => alive && setMode(false));
    } else setMode(false);
  });
})(window.P);

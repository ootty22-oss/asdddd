/* رسوم SVG تعيد رسم أشكال الكتاب المهمة */
(function (P) {
  'use strict';
  const POS = 'var(--pos)', NEG = 'var(--neg)', INK = 'currentColor';
  const svg = (vb, w, body, label) => `<svg class="fig" viewBox="${vb}" style="max-width:${w}px" role="img" aria-label="${label || ''}">${body}</svg>`;
  const T = (x, y, s, o) => `<text x="${x}" y="${y}" font-size="${(o && o.fs) || 12}" text-anchor="${(o && o.a) || 'middle'}" fill="${(o && o.c) || 'currentColor'}" ${o && o.w ? 'font-weight="700"' : ''}>${s}</text>`;
  const chg = (x, y, s, r) => `<circle cx="${x}" cy="${y}" r="${r || 13}" fill="${s > 0 ? POS : NEG}"/>${T(x, y + 5, s > 0 ? '+' : '−', { fs: 16, c: '#fff', w: 1 })}`;
  const sm = (x, y, s) => T(x, y + 4, s > 0 ? '+' : '−', { fs: 13, c: s > 0 ? POS : NEG, w: 1 });
  const arrowHead = (id) => `<defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>`;

  function fieldSvg(charges, w, h, per, id, extra, mirrorX) {
    const lines = P.traceLines(charges, { per: per || 12, w, h, step: 2.5, r0: 14, pad: mirrorX != null ? 20 : Math.max(w, h), max: 2500, mirrorX });
    let s = arrowHead(id);
    const inb = p => p[0] > -2 && p[1] > -2 && p[0] < w + 2 && p[1] < h + 2;
    for (const ln of lines) {
      const segs = []; let cur = [];
      ln.pts.forEach(p => { if (inb(p)) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } }); if (cur.length) segs.push(cur);
      const pts = segs.sort((a, b) => b.length - a.length)[0] || [];
      if (pts.length < 4) continue;
      segs.forEach(sg => { if (sg.length > 1) s += `<path d="${P.pathD(sg)}" fill="none" stroke="var(--line-f)" stroke-width="1.4"/>`; });
      const k = Math.floor(pts.length * 0.45), a = pts[k], b = pts[Math.min(pts.length - 1, k + 2)];
      if (a && b) {
        const [p, q] = ln.dir > 0 ? [a, b] : [b, a];
        s += `<path d="M${p[0]},${p[1]} L${q[0]},${q[1]}" stroke="var(--line-f)" marker-end="url(#${id})" stroke-width="1.4"/>`;
      }
    }
    return s + (extra || '');
  }

  const F = {};
  F.atom = () => svg('0 0 280 180', 300, `<ellipse cx="140" cy="85" rx="115" ry="55" fill="none" stroke="var(--muted)" stroke-dasharray="4 4"/><ellipse cx="140" cy="85" rx="62" ry="30" fill="none" stroke="var(--muted)" stroke-dasharray="4 4"/>
    <circle cx="131" cy="80" r="12" fill="${POS}"/>${T(131, 84, 'p+', { fs: 10, c: '#fff' })}<circle cx="148" cy="90" r="12" fill="var(--neutral)"/>${T(148, 94, 'n', { fs: 11, c: '#fff' })}
    <circle cx="255" cy="85" r="9" fill="${NEG}"/>${T(255, 89, 'e−', { fs: 9, c: '#fff' })}<circle cx="78" cy="85" r="9" fill="${NEG}"/>${T(78, 89, 'e−', { fs: 9, c: '#fff' })}
    ${T(140, 168, 'النواة: بروتونات موجبة ونيوترونات متعادلة، والإلكترونات السالبة تدور حولها', { fs: 11 })}`, 'تركيب الذرة، شكل 11');

  F.scope = () => svg('0 0 240 230', 240, `<rect x="45" y="75" width="150" height="135" rx="8" fill="var(--glass)" stroke="var(--muted)"/><rect x="95" y="66" width="50" height="14" rx="4" fill="var(--cork)"/>
    <line x1="120" y1="32" x2="120" y2="135" stroke="var(--metal)" stroke-width="5"/><ellipse cx="120" cy="30" rx="32" ry="7" fill="var(--metal)"/>
    <path d="M120 135 L101 178" stroke="var(--gold)" stroke-width="5"/><path d="M120 135 L139 178" stroke="var(--gold)" stroke-width="5"/>
    ${T(190, 26, 'القرص المعدني', { fs: 11 })}${T(168, 112, 'الساق', { fs: 11 })}${T(175, 190, 'الورقتان', { fs: 11 })}${T(198, 64, 'سداد عازل', { fs: 10 })}${T(68, 205, 'الصندوق', { fs: 10 })}`, 'أجزاء الكشاف الكهربائي');

  F.uniform = () => svg('0 0 280 160', 300, `${arrowHead('au')}<rect x="20" y="20" width="14" height="115" fill="${POS}"/><rect x="246" y="20" width="14" height="115" fill="${NEG}"/>
    ${[32, 52, 72, 92, 112, 128].map(y => `<line x1="36" y1="${y}" x2="242" y2="${y}" stroke="currentColor" stroke-width="1.4" marker-end="url(#au)"/>`).join('')}
    ${T(27, 152, 'لوح موجب', { fs: 10 })}${T(253, 152, 'لوح سالب', { fs: 10 })}`, 'المجال الكهربائي المنتظم، شكل 27');

  F.efield = () => {
    const a = fieldSvg([{ x: 80, y: 85, q: 1 }, { x: 220, y: 85, q: -1 }], 300, 170, 14, 'ae1');
    return svg('0 0 300 190', 340, a + chg(80, 85, 1) + chg(220, 85, -1) + T(150, 184, 'الخطوط تبدأ من الشحنة الموجبة وتنتهي بالسالبة', { fs: 11 }), 'خطوط المجال بين شحنتين مختلفتين');
  };
  F.testcharge = () => {
    const a = fieldSvg([{ x: 75, y: 80, q: 1 }], 150, 160, 12, 'at1'), b = fieldSvg([{ x: 75, y: 80, q: -1 }], 150, 160, 12, 'at2');
    return svg('0 0 310 185', 340, `<g>${a}${chg(75, 80, 1)}<circle cx="122" cy="40" r="6" fill="var(--gold)"/>${T(122, 28, "q′", { fs: 11 })}</g>
      <g transform="translate(160,0)">${b}${chg(75, 80, -1)}<circle cx="122" cy="40" r="6" fill="var(--gold)"/>${T(122, 28, "q′", { fs: 11 })}</g>
      ${T(75, 178, '(25-a) شحنة موجبة', { fs: 11 })}${T(235, 178, '(25-b) شحنة سالبة', { fs: 11 })}`, 'شحنة الاختبار في مجال شحنة موجبة وسالبة');
  };
  F.magnet = () => {
    const a = fieldSvg([{ x: 200, y: 85, q: 1 }, { x: 100, y: 85, q: -1 }], 300, 170, 14, 'am1', '', 150);
    return svg('0 0 300 190', 340, a + `<rect x="95" y="70" width="55" height="30" fill="${NEG}"/><rect x="150" y="70" width="55" height="30" fill="${POS}"/>${T(122, 91, 'S', { fs: 15, c: '#fff' })}${T(178, 91, 'N', { fs: 15, c: '#fff' })}` +
      T(150, 184, 'خارج المغناطيس: من N إلى S، وتكمل دورتها داخله', { fs: 11 }), 'خطوط المجال المغناطيسي لساق مغناطيسية');
  };
  F.coulomb = () => svg('0 0 300 150', 320, `${arrowHead('ac')}
    ${chg(80, 40, 1, 16)}${chg(220, 40, 1, 16)}<line x1="60" y1="40" x2="20" y2="40" stroke="currentColor" stroke-width="2" marker-end="url(#ac)"/><line x1="240" y1="40" x2="280" y2="40" stroke="currentColor" stroke-width="2" marker-end="url(#ac)"/>
    ${T(35, 30, 'F₂₁', { fs: 11 })}${T(265, 30, 'F₁₂', { fs: 11 })}${T(150, 44, 'قوة تنافر', { fs: 12, w: 1 })}
    ${chg(80, 105, 1, 16)}${chg(220, 105, -1, 16)}<line x1="100" y1="105" x2="135" y2="105" stroke="currentColor" stroke-width="2" marker-end="url(#ac)"/><line x1="200" y1="105" x2="165" y2="105" stroke="currentColor" stroke-width="2" marker-end="url(#ac)"/>
    ${T(150, 96, 'قوة تجاذب', { fs: 12, w: 1 })}<line x1="80" y1="135" x2="220" y2="135" stroke="var(--muted)" stroke-dasharray="3 3"/>${T(150, 147, 'r', { fs: 12 })}`, 'القوى المتبادلة بين شحنتين، شكل 24');

  // خطوات الشحن بالحث (كرة) شكل 16
  F.induction = () => {
    const ball = (x, pl, mi) => `<circle cx="${x}" cy="70" r="26" fill="var(--metal-l)" stroke="var(--metal)"/>` + pl.map(p => sm(x + p[0], 70 + p[1], 1)).join('') + mi.map(p => sm(x + p[0], 70 + p[1], -1)).join('') + `<line x1="${x}" y1="96" x2="${x}" y2="122" stroke="var(--muted)" stroke-width="4"/>`;
    const rod = (x) => `<rect x="${x - 48}" y="20" width="14" height="70" rx="5" fill="var(--rubber)" transform="rotate(-25 ${x - 41} 55)"/>` + sm(x - 30, 76, -1) + sm(x - 34, 64, -1);
    const P1 = ball(70, [[-16, -8], [-18, 8]], [[16, -8], [18, 8]]) + rod(70);
    const P2 = ball(200, [[-16, -8], [-18, 8]], []) + rod(200) + `<path d="M222 82 L240 118" stroke="currentColor" stroke-width="2"/><path d="M232 118 h16 M235 122 h10 M238 126 h4" stroke="currentColor"/>`;
    const P3 = ball(330, [[-16, -8], [-18, 8]], []) + rod(330);
    const P4 = ball(460, [[-14, -14], [14, -14], [-18, 10], [18, 10]], []);
    return svg('0 0 520 160', 560, P1 + P2 + P3 + P4 + T(70, 150, '1 تقريب الساق') + T(200, 150, '2 التأريض') + T(330, 150, '3 قطع التأريض') + T(460, 150, '4 إبعاد الساق'), 'خطوات الشحن بالحث، شكل 16');
  };

  // الكشاف بالحث شكل 19
  F['scope-induction'] = () => {
    const sc = (x, disk, leaf, open, finger) => `<rect x="${x - 34}" y="62" width="68" height="78" rx="6" fill="var(--glass)" stroke="var(--muted)"/><line x1="${x}" y1="30" x2="${x}" y2="110" stroke="var(--metal)" stroke-width="4"/><ellipse cx="${x}" cy="28" rx="20" ry="5" fill="var(--metal)"/>
      <path d="M${x} 110 L${x - (open ? 14 : 3)} 136" stroke="var(--gold)" stroke-width="4"/><path d="M${x} 110 L${x + (open ? 14 : 3)} 136" stroke="var(--gold)" stroke-width="4"/>` +
      disk.map((s, i) => sm(x - 10 + i * 10, 20, s)).join('') + leaf.map((s, i) => sm(x - 20 + i * 40, 128, s)).join('') + (finger ? `<path d="M${x + 22} 28 q 20 -4 30 -18" stroke="var(--skin)" stroke-width="7" fill="none" stroke-linecap="round"/>` : '');
    const rod = x => `<rect x="${x - 14}" y="-12" width="12" height="30" rx="4" fill="var(--glass2)" stroke="var(--muted)" transform="rotate(-30 ${x} 0)"/>` + sm(x - 10, 6, 1);
    return svg('0 -16 520 190', 560, sc(65, [-1, -1], [1, 1], true) + rod(65) + sc(195, [-1, -1], [], false, true) + rod(195) + sc(325, [-1, -1], [], false) + rod(325) + sc(455, [], [-1, -1], true) +
      T(65, 165, '(19-b) تقريب الساق', { fs: 11 }) + T(195, 165, '(19-c) لمس القرص', { fs: 11 }) + T(325, 165, 'رفع الإصبع', { fs: 11 }) + T(455, 165, '(19-d) إبعاد الساق', { fs: 11 }), 'شحن الكشاف بالحث');
  };

  F.poles = () => {
    const bar = (x, y, w) => `<rect x="${x}" y="${y}" width="${w / 2}" height="18" fill="${POS}"/><rect x="${x + w / 2}" y="${y}" width="${w / 2}" height="18" fill="${NEG}"/>${T(x + 8, y + 13, 'N', { fs: 10, c: '#fff' })}${T(x + w - 8, y + 13, 'S', { fs: 10, c: '#fff' })}`;
    return svg('0 0 300 120', 320, bar(70, 10, 160) + bar(50, 50, 80) + bar(170, 50, 80) + [0, 1, 2, 3].map(i => bar(30 + i * 62, 90, 52)).join(''), 'تقطيع المغناطيس: كل قطعة لها قطبان، شكل 10');
  };
  F['mag-rub'] = () => svg('0 0 300 130', 320, `${arrowHead('ar')}<rect x="40" y="90" width="220" height="6" rx="3" fill="var(--metal)"/>
    <rect x="70" y="20" width="22" height="55" fill="${NEG}"/><rect x="70" y="0" width="22" height="20" fill="${POS}"/>${T(81, 72, 'S', { fs: 12, c: '#fff' })}
    <path d="M100 50 C 160 40, 210 40, 240 70" fill="none" stroke="currentColor" stroke-dasharray="4 3" marker-end="url(#ar)"/>
    ${T(45, 115, 'S', { fs: 13, w: 1 })}${T(255, 115, 'N', { fs: 13, w: 1, c: POS })}${T(150, 125, 'القطب في نهاية جهة الدلك مخالف للقطب الدالك (S ← N)', { fs: 10 })}`, 'التمغنط بالدلك، شكل 20');
  F['mag-ind'] = () => svg('0 0 300 90', 320, `<rect x="10" y="30" width="60" height="26" fill="${NEG}"/><rect x="70" y="30" width="60" height="26" fill="${POS}"/>${T(40, 48, 'S', { fs: 13, c: '#fff' })}${T(100, 48, 'N', { fs: 13, c: '#fff' })}
    <rect x="160" y="37" width="120" height="12" rx="4" fill="var(--metal)"/>${T(168, 30, 'S', { fs: 13, w: 1, c: NEG })}${T(272, 30, 'N', { fs: 13, w: 1, c: POS })}
    ${T(150, 80, 'المسمار: الطرف القريب مخالف، والبعيد مشابه للقطب المؤثر', { fs: 10 })}`, 'التمغنط بالحث، شكل 21');
  F.electromagnet = () => svg('0 0 300 140', 320, `<rect x="60" y="45" width="180" height="22" rx="4" fill="var(--metal)"/>
    ${Array.from({ length: 12 }, (_, i) => `<ellipse cx="${78 + i * 13}" cy="56" rx="5" ry="17" fill="none" stroke="var(--copper)" stroke-width="2.5"/>`).join('')}
    <path d="M78 73 L78 110 L120 110" stroke="var(--copper)" stroke-width="2" fill="none"/><path d="M221 73 L221 110 L180 110" stroke="var(--copper)" stroke-width="2" fill="none"/>
    <rect x="120" y="100" width="60" height="22" rx="3" fill="var(--muted)"/>${T(150, 116, 'بطارية', { fs: 11, c: '#fff' })}
    ${T(150, 30, 'ملف من سلك معزول حول قطعة فولاذ', { fs: 11 })}`, 'المغناطيس الكهربائي، شكل 22');

  // ----- أشكال الأسئلة
  F['q-ch1-s5'] = () => {
    const st = (x, ground, touch, label) => `<circle cx="${x}" cy="90" r="22" fill="var(--metal-l)" stroke="var(--metal)"/><rect x="${x - 3}" y="112" width="6" height="26" fill="var(--muted)"/><rect x="${x - 28}" y="138" width="56" height="7" fill="var(--ink2)"/>` +
      `<rect x="${x + (touch ? 2 : 14)}" y="${touch ? 18 : 6}" width="12" height="70" rx="5" fill="var(--glass2)" stroke="var(--muted)" transform="rotate(40 ${x + (touch ? 8 : 20)} ${touch ? 53 : 41})"/>` +
      (ground ? `<path d="M${x + 20} 82 L${x + 34} 82 L${x + 34} 146" stroke="currentColor" fill="none" stroke-width="1.5"/><path d="M${x + 27} 146 h14 M${x + 30} 150 h8 M${x + 32} 154 h4" stroke="currentColor"/>` : '') +
      T(x, 170, label, { fs: 11 });
    return svg('0 0 330 180', 360, st(275, false, false, '(a) كرة معزولة') + st(165, true, false, '(b) موصولة بالأرض') + st(55, false, true, '(c) كرة معزولة') + T(165, 12, 'ساق زجاج موجبة الشحنة في الحالات الثلاث', { fs: 10 }), 'سؤال 5: ساق زجاج وكرة معدنية في ثلاث حالات');
  };
  F['q-ch1-s7'] = () => {
    const box = (x, y, charges, id, lbl) => {
      const loc = charges.map(c => ({ x: c.x, y: c.y, q: c.q }));
      const body = fieldSvg(loc, 150, 150, 12, id);
      return `<g transform="translate(${x},${y})"><rect width="150" height="150" fill="none" stroke="var(--muted)"/><svg width="150" height="150" viewBox="0 0 150 150">${body}${charges.map(c => `<circle cx="${c.x}" cy="${c.y}" r="11" fill="var(--gold)"/>${T(c.x, c.y + 5, '؟', { fs: 13, c: '#222', w: 1 })}`).join('')}</svg>${T(75, 168, lbl, { fs: 12, w: 1 })}</g>`;
    };
    return svg('0 0 340 360', 380, box(175, 0, [{ x: 75, y: 75, q: 1 }], 's71', 'الشكل 1') + box(10, 0, [{ x: 75, y: 75, q: -1 }], 's72', 'الشكل 2') +
      box(175, 185, [{ x: 45, y: 75, q: 1 }, { x: 105, y: 75, q: 1 }], 's73', 'الشكل 3') + box(10, 185, [{ x: 45, y: 75, q: 1 }, { x: 105, y: 75, q: -1 }], 's74', 'الشكل 4'), 'سؤال 7: اكتب نوع الشحنة');
  };
  F['q-ch2-compass'] = () => {
    const comp = (x, nTop, horizontal, nLeft, lbl) => {
      let needle;
      if (horizontal) {
        const [lc, rc] = nLeft ? [POS, NEG] : [NEG, POS];
        needle = `<path d="M${x - 22} 60 L${x} 54 L${x} 66 z" fill="${lc}"/><path d="M${x + 22} 60 L${x} 54 L${x} 66 z" fill="${rc}"/>` + T(x - 34, 64, nLeft ? 'N' : 'S', { fs: 10 }) + T(x + 34, 64, nLeft ? 'S' : 'N', { fs: 10 });
      } else {
        const [tc, bc] = nTop ? [POS, NEG] : [NEG, POS];
        needle = `<path d="M${x} 38 L${x - 6} 60 L${x + 6} 60 z" fill="${tc}"/><path d="M${x} 82 L${x - 6} 60 L${x + 6} 60 z" fill="${bc}"/>` + T(x, 30, nTop ? 'N' : 'S', { fs: 10 }) + T(x, 98, nTop ? 'S' : 'N', { fs: 10 });
      }
      return `<circle cx="${x}" cy="60" r="25" fill="none" stroke="currentColor"/>${needle}${T(x, 118, lbl, { fs: 12 })}`;
    };
    const U = `<path d="M10 10 h28 v62 a22 22 0 0 0 44 0 v-62 h28 v62 a50 50 0 0 1 -100 0 z" fill="none"/>
      <path d="M10 10 h28 v62 a22 22 0 0 0 22 22 v28 a50 50 0 0 1 -50 -50 z" fill="${NEG}"/><path d="M110 10 h-28 v62 a22 22 0 0 1 -22 22 v28 a50 50 0 0 0 50 -50 z" fill="${POS}"/>
      ${T(24, 8, 'S', { fs: 12, c: NEG, w: 1 })}${T(96, 8, 'N', { fs: 12, c: POS, w: 1 })}<circle cx="60" cy="32" r="14" fill="none" stroke="currentColor"/>${T(60, 36, 'بوصلة', { fs: 8 })}`;
    return svg('0 0 420 135', 440, `<g transform="translate(295,0)">${U}</g>` + comp(240, false, false, false, '(a)') + comp(170, false, true, false, '(b)') + comp(100, true, false, false, '(c)') + comp(30, false, true, true, '(d)') +
      T(140, 132, 'الأحمر: القطب الشمالي للإبرة', { fs: 9 }), 'سؤال: اتجاه إبرة البوصلة بين قطبي مغناطيس U');
  };
  F['q-ch2-s4'] = () => {
    const bar = (x, l, r) => `<rect x="${x}" y="50" width="40" height="12" fill="${l === 'N' ? POS : NEG}"/><rect x="${x + 40}" y="50" width="40" height="12" fill="${r === 'N' ? POS : NEG}"/>${T(x + 4, 44, l, { fs: 10, a: 'start' })}${T(x + 76, 44, r, { fs: 10, a: 'end' })}`;
    const U = `<path d="M10 20 h14 v40 a16 16 0 0 0 16 16 v14 a30 30 0 0 1 -30 -30 z" fill="${NEG}"/><path d="M70 20 h-14 v40 a16 16 0 0 1 -16 16 v14 a30 30 0 0 0 30 -30 z" fill="${POS}"/>${T(17, 15, 'S', { fs: 10 })}${T(63, 15, 'N', { fs: 10 })}`;
    return svg('0 0 470 110', 480, `<g transform="translate(385,0)">${U}${T(40, 105, '(a)')}</g><g transform="translate(195,0)">${bar(0, 'N', 'S')}${bar(95, 'N', 'S')}${T(87, 105, '(b)')}</g><g transform="translate(0,0)">${bar(5, 'N', 'S')}${bar(100, 'S', 'N')}${T(92, 105, '(c)')}</g>`, 'سؤال 4: ارسم خطوط المجال');
  };
  F['q-ch2-s4-ans'] = () => {
    const panel = (x, w, poles, rects, id, lbl) => {
      const body = fieldSvg(poles, w, 140, 10, id);
      return `<g transform="translate(${x},0)"><rect width="${w}" height="140" fill="none" stroke="var(--muted)"/><svg width="${w}" height="140" viewBox="0 0 ${w} 140">${body}${rects}</svg>${T(w / 2, 156, lbl)}</g>`;
    };
    const r = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
    const a = panel(330, 130, [{ x: 45, y: 40, q: -1 }, { x: 85, y: 40, q: 1 }], r(33, 40, 24, 70, NEG) + r(73, 40, 24, 70, POS) + r(33, 100, 64, 14, 'var(--muted)'), 'sa', '(a) حرف U');
    const b = panel(165, 160, [{ x: 12, y: 70, q: 1 }, { x: 68, y: 70, q: -1 }, { x: 92, y: 70, q: 1 }, { x: 148, y: 70, q: -1 }], r(10, 64, 30, 12, POS) + r(40, 64, 30, 12, NEG) + r(90, 64, 30, 12, POS) + r(120, 64, 30, 12, NEG), 'sb', '(b) N S ... N S');
    const c = panel(0, 160, [{ x: 12, y: 70, q: 1 }, { x: 68, y: 70, q: -1 }, { x: 92, y: 70, q: -1 }, { x: 148, y: 70, q: 1 }], r(10, 64, 30, 12, POS) + r(40, 64, 30, 12, NEG) + r(90, 64, 30, 12, NEG) + r(120, 64, 30, 12, POS), 'sc', '(c) N S ... S N');
    return svg('0 0 460 165', 500, a + b + c, 'الإجابة النموذجية لسؤال رسم خطوط المجال');
  };

  P.fig = function (id) { const f = F[id]; return f ? `<figure class="figwrap">${f()}</figure>` : ''; };
  P.figIds = Object.keys(F);
})(window.P);

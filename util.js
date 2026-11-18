/* أدوات مشتركة: التخزين، الأرقام، النصوص، تتبع خطوط المجال */
window.P = window.P || {};
(function (P) {
  'use strict';
  // ---------------------------------------------------------- التخزين
  const KEY = 'phys3-progress-v1';
  const blank = () => ({ v: 1, lessons: {}, q: {}, cards: {}, quizzes: [], problems: {}, last: null, sims: {} });
  let mem = blank(), persistent = false;
  try {
    const raw = window.localStorage.getItem(KEY);
    persistent = true;
    if (raw) { const s = JSON.parse(raw); if (s && s.v === 1) mem = Object.assign(blank(), s); }
  } catch (e) { persistent = false; }
  P.store = {
    get s() { return mem; },
    persistent: () => persistent,
    save() { if (!persistent) return; try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { persistent = false; } },
    reset() { mem = blank(); this.save(); },
    exportText() { return JSON.stringify(mem, null, 1); }
  };

  // ---------------------------------------------------------- DOM
  P.$ = (sel, root) => (root || document).querySelector(sel);
  P.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  P.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  };
  P.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  P.strip = s => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // ---------------------------------------------------------- أرقام
  const SUP = { '-': '−' };
  P.sci = function (v, digits) {
    digits = digits || 3;
    if (!isFinite(v)) return '—';
    if (v === 0) return '0';
    const a = Math.abs(v), sign = v < 0 ? '−' : '';
    let e = Math.floor(Math.log10(a));
    let m = +(a / Math.pow(10, e)).toPrecision(digits);
    if (m >= 10) { m /= 10; e += 1; }
    if (e >= -2 && e <= 3) return sign + String(+a.toPrecision(digits));
    return `${sign}${m}×10<sup>${String(e).replace('-', SUP['-'])}</sup>`;
  };
  P.sciText = v => P.strip(P.sci(v).replace(/<sup>/, '^'));
  // يقبل: 3.24e-5 ، 3.24×10^-5 ، 3.24*10-5 ، ٣٫٢٤ ، 1/4
  P.parseNum = function (s) {
    if (s == null) return NaN;
    s = String(s).trim()
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٫,]/g, '.').replace(/[−–]/g, '-').replace(/\s+/g, '')
      .replace(/⁻/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d));
    s = s.replace(/^([+-]?[\d.]+)\s*[×x*X]\s*10\^?\(?([+-]?\d+)\)?$/, '$1e$2');
    s = s.replace(/^10\^?\(?([+-]?\d+)\)?$/, '1e$1');
    if (/^[+-]?\d+\/\d+$/.test(s)) { const [a, b] = s.split('/'); return +a / +b; }
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
    return parseFloat(s);
  };
  P.close = (a, b, tol) => Math.abs(a - b) <= (tol || 0.01) * Math.abs(b) + 1e-300;

  // ---------------------------------------------------------- نصوص عربية
  P.norm = s => P.strip(String(s)).toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[.,،؛:!؟?«»"'()\[\]{}…ـ–—-]/g, ' ').replace(/\s+/g, ' ').trim();
  P.normWord = w => P.norm(w).replace(/^(وال|بال|فال|كال|لل|ال)/, '');

  // ---------------------------------------------------------- تتبع خطوط المجال (لشحنات/أقطاب نقطية)
  // charges: [{x,y,q}] ؛ يعيد مصفوفة من المسارات [[x,y],...]
  P.fieldAt = function (charges, x, y) {
    let ex = 0, ey = 0;
    for (const c of charges) {
      const dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy + 1e-6, r = Math.sqrt(r2);
      const f = c.q / (r2 * r); ex += f * dx; ey += f * dy;
    }
    return [ex, ey];
  };
  P.traceLines = function (charges, opt) {
    opt = Object.assign({ per: 12, step: 3, max: 900, w: 600, h: 400, r0: 12, pad: 30 }, opt || {});
    const lines = [];
    const pos = charges.filter(c => c.q > 0), neg = charges.filter(c => c.q < 0);
    const sources = pos.length ? pos : neg;
    const dir = pos.length ? 1 : -1;
    for (const c of sources) {
      const n = Math.max(4, Math.round(opt.per * Math.min(2, Math.abs(c.q) / (Math.abs(sources[0].q) || 1))));
      for (let i = 0; i < n; i++) {
        const a = (i + 0.5) / n * 2 * Math.PI;
        let x = c.x + opt.r0 * Math.cos(a), y = c.y + opt.r0 * Math.sin(a);
        const pts = [[x, y]];
        for (let k = 0; k < opt.max; k++) {
          // RK2
          let [ex, ey] = P.fieldAt(charges, x, y); let m = Math.hypot(ex, ey) || 1;
          const mx = x + dir * opt.step * 0.5 * ex / m, my = y + dir * opt.step * 0.5 * ey / m;
          [ex, ey] = P.fieldAt(charges, mx, my); m = Math.hypot(ex, ey) || 1;
          x += dir * opt.step * ex / m; y += dir * opt.step * ey / m;
          pts.push([x, y]);
          if (x < -opt.pad || y < -opt.pad || x > opt.w + opt.pad || y > opt.h + opt.pad) break;
          let hit = false;
          for (const o of charges) if (o !== c && Math.hypot(x - o.x, y - o.y) < opt.r0 * 0.8) { hit = true; break; }
          if (hit) break;
        }
        lines.push({ pts, dir, hit: pts.length > 1 && charges.some(o => o !== c && Math.hypot(x - o.x, y - o.y) < opt.r0 * 0.8) });
      }
    }
    if (opt.mirrorX != null) lines.slice().forEach(l => { if (!l.hit) lines.push({ pts: l.pts.map(p => [2 * opt.mirrorX - p[0], p[1]]), dir: -l.dir, hit: false }); });
    return lines;
  };
  P.pathD = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');

  // ---------------------------------------------------------- canvas مساعد
  P.setupCanvas = function (cv, w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };
  P.css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
  P.arrow = function (ctx, x1, y1, x2, y2, color, w) {
    const a = Math.atan2(y2 - y1, x2 - x1), hl = Math.min(12, Math.hypot(x2 - x1, y2 - y1) * 0.5 + 4);
    ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = w || 2.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.6, y2 - Math.sin(a) * hl * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hl * Math.cos(a - 0.4), y2 - hl * Math.sin(a - 0.4));
    ctx.lineTo(x2 - hl * Math.cos(a + 0.4), y2 - hl * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
  };
  P.reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  P.toast = function (msg) {
    let t = P.$('#toast'); if (!t) { t = P.h('div', { id: 'toast', role: 'status' }); document.body.append(t); }
    t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2200);
  };
  P.shuffle = function (a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
})(window.P);

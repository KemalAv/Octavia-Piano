// ==================================================================================
// Keeps the text of inline SVG figures inside the room it has.
//
// SVG <text> never wraps or shrinks: a label that is longer than its panel (and in
// Indonesian / Spanish nearly every label is longer than in English) simply runs over the
// panel edge, off the picture, or into its neighbour. This fits each label after it is
// drawn:
//   1. find the room: the smallest rectangle of the figure that holds the label's anchor,
//      or the whole picture;
//   2. if the label is wider than that room, shrink the font a little and, if needed,
//      squeeze the letters (textLength) until it fits;
//   3. two labels on one line that still collide: the left one gives way.
// Only attributes are touched (never the text nodes), so React keeps working normally, and
// everything is undone and measured again after any change of the figure's content.
// ==================================================================================

const PAD = 5; // keep this far from a panel edge, in figure units
const MIN_FONT_SCALE = 0.8; // shrink the font by at most 20%...
const MIN_SQUEEZE = 0.62; // ...then squeeze the glyphs; never to less than 62% of their natural width
const FIT_ATTR = 'data-fit';

interface Box { x1: number; y1: number; x2: number; y2: number }

interface Matrix { a: number; b: number; c: number; d: number; e: number; f: number }

const toFigure = (svg: SVGSVGElement, el: SVGGraphicsElement): Matrix | null => {
  const svgCtm = svg.getScreenCTM();
  const elCtm = el.getScreenCTM();
  if (!svgCtm || !elCtm) return null;
  const m = svgCtm.inverse().multiply(elCtm);
  return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f };
};

const boxOf = (el: SVGGraphicsElement, m: Matrix): Box | null => {
  let b: DOMRect;
  try { b = el.getBBox(); } catch { return null; }
  if (!b.width && !b.height) return null;
  const xs = [m.a * b.x + m.c * b.y + m.e, m.a * (b.x + b.width) + m.c * (b.y + b.height) + m.e];
  const ys = [m.b * b.x + m.d * b.y + m.f, m.b * (b.x + b.width) + m.d * (b.y + b.height) + m.f];
  return { x1: Math.min(...xs), x2: Math.max(...xs), y1: Math.min(...ys), y2: Math.max(...ys) };
};

const resetText = (t: SVGTextElement) => {
  if (!t.hasAttribute(FIT_ATTR)) return;
  t.removeAttribute('textLength');
  t.removeAttribute('lengthAdjust');
  const original = t.getAttribute('data-fit-font');
  if (original !== null) {
    if (original === '') t.style.removeProperty('font-size');
    else t.style.fontSize = original;
  }
  t.removeAttribute('data-fit-font');
  if (t.hasAttribute('data-fit-transform')) {
    const original = t.getAttribute('data-fit-transform') || '';
    if (original === '') t.removeAttribute('transform');
    else t.setAttribute('transform', original);
    t.removeAttribute('data-fit-transform');
  }
  t.removeAttribute(FIT_ATTR);
};

const anchorOf = (t: SVGTextElement): 'start' | 'middle' | 'end' => {
  const a = t.getAttribute('text-anchor') || getComputedStyle(t).textAnchor;
  return a === 'middle' ? 'middle' : a === 'end' ? 'end' : 'start';
};

/** Makes `t` at most `room` wide (figure units), by font size first and letter squeeze second. */
const shrinkTo = (t: SVGTextElement, m: Matrix, current: number, room: number): boolean => {
  if (room <= 0 || current <= room) return false;
  const scale = Math.hypot(m.a, m.b) || 1;
  const ratio = room / current;
  if (!t.hasAttribute(FIT_ATTR)) {
    t.setAttribute(FIT_ATTR, '1');
    t.setAttribute('data-fit-font', t.style.fontSize || '');
  }
  const fontScale = Math.max(MIN_FONT_SCALE, ratio);
  if (fontScale < 1) {
    const px = parseFloat(getComputedStyle(t).fontSize) || 12;
    t.style.fontSize = `${(px * fontScale).toFixed(2)}px`;
  }
  // Natural width after the font change, then squeeze the rest.
  let natural = 0;
  try { natural = t.getComputedTextLength(); } catch { natural = 0; }
  const target = Math.max(room / scale, natural * MIN_SQUEEZE);
  if (natural > 0 && natural > target) {
    t.setAttribute('textLength', target.toFixed(1));
    t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
  return true;
};

const fitFigure = (svg: SVGSVGElement) => {
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (!vb || !vb.width) return;
  const texts = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim().length > 0) as SVGTextElement[];
  if (texts.length === 0) return;
  texts.forEach(resetText);

  // Panels: rectangles big enough to hold text, mapped into figure units.
  const panels: Box[] = [];
  svg.querySelectorAll('rect').forEach((r) => {
    const m = toFigure(svg, r as SVGGraphicsElement);
    if (!m || Math.abs(m.b) > 0.01 || Math.abs(m.c) > 0.01) return;
    const b = boxOf(r as SVGGraphicsElement, m);
    if (!b) return;
    const w = b.x2 - b.x1;
    const h = b.y2 - b.y1;
    if (w >= 26 && h >= 10 && w < vb.width * 0.995) panels.push(b);
  });

  const figure: Box = { x1: vb.x, y1: vb.y, x2: vb.x + vb.width, y2: vb.y + vb.height };

  // 1. fit every label to its room
  texts.forEach((t) => {
    const m = toFigure(svg, t);
    if (!m || Math.abs(m.b) > 0.01 || Math.abs(m.c) > 0.01) return; // rotated labels are left alone
    const box = boxOf(t, m);
    if (!box) return;
    const width = box.x2 - box.x1;
    const anchor = anchorOf(t);
    const px = anchor === 'start' ? box.x1 : anchor === 'end' ? box.x2 : (box.x1 + box.x2) / 2;
    const py = (box.y1 + box.y2) / 2;

    // Smallest panel that holds the anchor point and is wider than a sliver
    let room = figure;
    let best = Infinity;
    for (const p of panels) {
      if (px < p.x1 + 1 || px > p.x2 - 1 || py < p.y1 || py > p.y2) continue;
      const area = (p.x2 - p.x1) * (p.y2 - p.y1);
      if (area < best) { best = area; room = p; }
    }
    let available: number;
    if (anchor === 'start') available = room.x2 - PAD - px;
    else if (anchor === 'end') available = px - (room.x1 + PAD);
    else available = 2 * Math.min(px - (room.x1 + PAD), room.x2 - PAD - px);
    // A panel that starts after the label's anchor cannot be its room.
    if (available < 24) available = figure === room ? 24 : Math.max(available, 24);
    // Labels that overhang the *picture* are always fitted; labels that overhang a panel only when
    // they stick out of it by more than a few units.
    if (width > available + 1) {
      shrinkTo(t, m, width, available);
      // Still sticking out of the picture (a label that starts near the edge): slide it back in.
      const after = boxOf(t, m);
      if (after && room === figure) {
        let dx = 0;
        if (after.x2 > figure.x2 - PAD) dx = figure.x2 - PAD - after.x2;
        else if (after.x1 < figure.x1 + PAD) dx = figure.x1 + PAD - after.x1;
        if (dx !== 0) {
          const scaleX = Math.hypot(m.a, m.b) || 1;
          if (!t.hasAttribute('data-fit-transform')) t.setAttribute('data-fit-transform', t.getAttribute('transform') || '');
          t.setAttribute('transform', `translate(${(dx / scaleX).toFixed(1)} 0) ${t.getAttribute('data-fit-transform') || ''}`.trim());
          if (!t.hasAttribute(FIT_ATTR)) t.setAttribute(FIT_ATTR, '1');
        }
      }
    }
  });

  // 2. labels on the same line that still run into each other: each gives up half of the overlap
  const placed = texts.map((t) => {
    const m = toFigure(svg, t);
    const box = m && boxOf(t, m);
    return m && box ? { t, m, box } : null;
  }).filter(Boolean) as { t: SVGTextElement; m: Matrix; box: Box }[];
  placed.sort((a, b) => a.box.x1 - b.box.x1);
  // How much narrower a label must become to pull its `side` edge in by `amount`.
  const narrowBy = (t: SVGTextElement, side: 'left' | 'right', amount: number): number => {
    const anchor = anchorOf(t);
    if (anchor === 'middle') return 2 * amount;
    if ((anchor === 'start' && side === 'right') || (anchor === 'end' && side === 'left')) return amount;
    return 0; // the anchored edge cannot move
  };
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (b.box.x1 > a.box.x2) break;
      const heightA = a.box.y2 - a.box.y1;
      const sameLine = Math.abs((a.box.y1 + a.box.y2) / 2 - (b.box.y1 + b.box.y2) / 2) < heightA * 0.6;
      const identical = a.t.textContent === b.t.textContent && Math.abs(a.box.x1 - b.box.x1) < 1;
      if (!sameLine || identical) continue;
      const overlap = a.box.x2 - b.box.x1;
      if (overlap <= 1) continue;
      const half = overlap / 2 + 2;
      let cutA = narrowBy(a.t, 'right', half);
      let cutB = narrowBy(b.t, 'left', half);
      if (cutA === 0) cutB = narrowBy(b.t, 'left', overlap + 4);
      if (cutB === 0) cutA = narrowBy(a.t, 'right', overlap + 4);
      const wa = a.box.x2 - a.box.x1;
      const wb = b.box.x2 - b.box.x1;
      if (cutA > 0 && wa - cutA > 20) { shrinkTo(a.t, a.m, wa, wa - cutA); const nb = boxOf(a.t, a.m); if (nb) a.box = nb; }
      if (cutB > 0 && wb - cutB > 20) { shrinkTo(b.t, b.m, wb, wb - cutB); const nb = boxOf(b.t, b.m); if (nb) b.box = nb; }
    }
  }
};

/** Fits every figure under `root`, now and whenever its content changes. Returns a cleanup function. */
export function keepSvgTextFitted(root: HTMLElement): () => void {
  let frame = 0;
  let busy = false;
  const run = () => {
    frame = 0;
    busy = true;
    try {
      root.querySelectorAll('svg').forEach((svg) => {
        const r = svg.getBoundingClientRect();
        if (r.width > 40 && r.height > 20) fitFigure(svg as SVGSVGElement);
      });
    } catch {
      // a figure that cannot be measured is simply left as drawn
    }
    busy = false;
  };
  const schedule = () => {
    if (busy || frame) return;
    frame = requestAnimationFrame(run);
  };
  schedule();
  const observer = new MutationObserver(schedule); // child / text changes only: our own edits are attributes
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  window.addEventListener('resize', schedule);
  if ((document as any).fonts?.ready) (document as any).fonts.ready.then(schedule).catch(() => {});
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}

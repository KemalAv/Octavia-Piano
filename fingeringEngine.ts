import type { MidiNotePlaybackItem } from './types';

// ==================================================================================
// PIANO FINGERING ENGINE (no machine learning, no pattern tables)
//
// One dynamic-programming pass per hand over "events" (everything the hand has
// down at one onset: the new notes plus the notes it is still holding).
//
//   * Every event tries all anatomically ordered finger combinations.
//   * A vertical cost scores the hand shape of the event (comfortable spans
//     between each finger pair, after Parncutt et al. 1997).
//   * A transition cost scores how the hand gets from the previous event to
//     this one: either legato inside the hand (stretch, thumb passing) or by
//     moving the whole hand, which is cheap after a rest and expensive in a
//     fast passage.
//   * Notes that are still held keep their finger, so a held melody note is
//     never "re-used" by an inner voice.
//
// Chords and melody share one optimisation, so there are no seams between
// "chord rules" and "melody rules". Runs in O(events) and takes a few
// milliseconds even for long pieces.
// ==================================================================================

type Finger = 1 | 2 | 3 | 4 | 5;
type Hand = 'left' | 'right';
export type HandSize = 'XXS' | 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export interface FingeringOptions {
  /** Changes how far the hand may stretch. Default 'M'. */
  handSize?: HandSize;
  /** Notes that already carry a finger keep it and act as fixed anchors. Default true. */
  keepExisting?: boolean;
}

const INF = 1e9;

// Semitone span "higher finger minus lower finger" for the right hand:
// [minPractical, minComfortable, minRelaxed, maxRelaxed, maxComfortable, maxPractical]
export const SPAN: Record<number, number[]> = {
  12: [-5, -3, 1, 5, 8, 10],
  13: [-4, -2, 3, 7, 10, 12],
  14: [-3, -1, 5, 9, 12, 14],
  15: [-1, 1, 7, 10, 13, 15],
  23: [1, 1, 1, 3, 3, 5],
  24: [1, 1, 3, 4, 5, 7],
  25: [2, 2, 5, 6, 8, 10],
  34: [1, 1, 1, 2, 2, 4],
  35: [1, 1, 3, 4, 5, 7],
  45: [1, 1, 1, 2, 3, 5],
};

const HAND_SIZE_REACH: Record<HandSize, number> = { XXS: -3, XS: -2, S: -1, M: 0, L: 1, XL: 2, XXL: 3 };

// Where each finger rests in a relaxed five-finger position (semitones above the thumb).
const REST_OFFSET = [0, 0, 2, 4, 5, 7];

// Tie-breakers: strong fingers first, and spans close to the relaxed hand shape.
const FINGER_COST = [0, 0.1, 0, 0, 0.3, 0.2];
const NATURAL_WEIGHT = 0.15;

/** Distance of a span from the relaxed five-finger shape (neighbouring fingers 1-2 semitones apart). */
const offNatural = (lo: number, hi: number, s: number) => {
  const d = hi - lo;
  const max = d === 4 ? 7 : 2 * d;
  const min = d === 4 ? 7 : 2 * d - 1;
  return NATURAL_WEIGHT * (s > max ? s - max : s < min ? min - s : 0);
};

const BLACK = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const isBlack = (midi: number) => BLACK[((midi % 12) + 12) % 12] === 1;

const SIMULTANEOUS_MS = 35;
const MAX_HELD_SPAN = 14;

/** All strictly increasing finger tuples of each length. */
const COMBOS: number[][][] = (() => {
  const out: number[][][] = [[], [], [], [], [], []];
  const walk = (start: number, acc: number[]) => {
    if (acc.length > 0) out[acc.length].push([...acc]);
    for (let f = start; f <= 5; f++) {
      acc.push(f);
      walk(f + 1, acc);
      acc.pop();
    }
  };
  walk(1, []);
  return out;
})();

interface N {
  src: MidiNotePlaybackItem[]; // the note plus exact duplicates
  p: number; // pitch in the right-hand frame (left hand is mirrored)
  black: boolean;
  on: number;
  off: number;
  preset: number; // 0 = free
}

interface Ev {
  t: number;
  dt: number; // time since the previous event
  all: N[]; // sounding notes, ascending in frame pitch
  isNew: boolean[];
  prevIdx: number[]; // index of a held note inside the previous event, else -1
  cands: number[][];
  vcost: number[];
}

class Engine {
  private reach: number;

  constructor(handSize: HandSize) {
    this.reach = HAND_SIZE_REACH[handSize] ?? 0;
  }

  private range(lo: number, hi: number) {
    const r = SPAN[lo * 10 + hi];
    const g = lo === 1 ? this.reach : this.reach * 0.5;
    return { minP: r[0], minC: r[1], minR: r[2], maxR: r[3] + g * 0.5, maxC: r[4] + g, maxP: r[5] + g };
  }

  /** Cost of two fingers being down at the same time, `s` semitones apart (s > 0). */
  private vertical(lo: number, hi: number, s: number): number {
    const r = this.range(lo, hi);
    let c = 0;
    if (s > r.maxP) c += 15 + 5 * (s - r.maxP);
    else if (s < r.minP) c += 8 + 4 * (r.minP - s);
    if (s > r.maxC) c += 2 * (s - r.maxC);
    const w = lo === 1 ? 1 : 2;
    if (s > r.maxR) c += w * (s - r.maxR);
    else if (s < r.minR) c += w * (r.minR - s);
    if (lo === 1 && hi === 4 && s >= 12) c += 3; // octaves belong to thumb and little finger
    return c + offNatural(lo, hi, s);
  }

  /** Cost of the hand shape of one event. */
  private shape(all: N[], isNew: boolean[], f: number[], dt: number): number {
    // Weak fingers cost more the faster the passage is.
    const weak = 1 + 2 * Math.min(1, Math.max(0, (220 - dt) / 120));
    const k = all.length;
    let c = 0;
    let anyWhite = false;
    for (let i = 0; i < k; i++) if (!all[i].black) anyWhite = true;
    for (let i = 0; i < k; i++) {
      if (isNew[i]) {
        c += FINGER_COST[f[i]] * weak;
        if (all[i].black) {
          if (k === 1) c += f[i] === 1 ? 2 : f[i] === 5 ? 0.75 : 0;
          else if (anyWhite) c += f[i] === 1 ? 1 : f[i] === 5 ? 0.5 : 0;
        }
      }
      for (let j = i + 1; j < k; j++) {
        const s = all[j].p - all[i].p;
        if (f[i] === f[j]) c += 30; // only possible when more than five notes are forced on one hand
        else if (f[i] < f[j]) c += this.vertical(f[i], f[j], s);
        else c += this.vertical(f[j], f[i], -s); // crossed fingers (hand-edited fingering)
      }
    }
    return c;
  }

  /** Legato connection finger `fa` on `a` -> finger `fb` on `b` without moving the hand. */
  private legato(a: N, fa: number, b: N, fb: number): number {
    if (fa === fb) return a.p === b.p ? 0 : INF;
    const lo = fa < fb ? fa : fb;
    const hi = fa < fb ? fb : fa;
    const s = fa < fb ? b.p - a.p : a.p - b.p;
    const r = this.range(lo, hi);

    if (s < 0) {
      // Thumb passes under a finger, or a finger crosses over the thumb. Small passes are
      // scale technique, larger ones are the arpeggio pivot.
      if (lo !== 1 || hi === 5 || -s > (hi === 2 ? 5 : 8)) return INF;
      let c = 3 + (hi === 2 ? 1.5 : hi === 4 ? 0.2 : 0);
      if (-s > 2) c += 0.4 * (-s - 2);
      const thumbBlack = fa === 1 ? a.black : b.black;
      const otherBlack = fa === 1 ? b.black : a.black;
      if (thumbBlack && !otherBlack) c += 4;
      else if (!thumbBlack && otherBlack && -s <= 2) c -= 1; // the classic black-key scale pass
      return c;
    }

    if (s > r.maxP || s < r.minP) return INF;
    let c = offNatural(lo, hi, s);
    if (s === 0) c += 1; // changing finger on a repeated key
    if (s > r.maxC) c += 2 * (s - r.maxC);
    else if (s < r.minC) c += 2 * (r.minC - s);
    const w = lo === 1 ? 1 : 2;
    if (s > r.maxR) c += w * (s - r.maxR);
    else if (s < r.minR) c += w * (r.minR - s);

    // Thumb or little finger reaching up to a black key next to a white one.
    if (fb === 1 && b.black && !a.black) c += 2;
    if (fa === 1 && a.black && !b.black) c += 2;
    if (fb === 5 && b.black && !a.black) c += 1;
    if (fa === 5 && a.black && !b.black) c += 1;
    return c;
  }

  /** Cost of lifting the hand and placing it somewhere else. */
  private jump(a: N, fa: number, b: N, fb: number, tNow: number, tPrev: number, chordal: boolean): number {
    const gap = tNow - a.off;
    const ioi = tNow - Math.max(a.on, tPrev);
    const eGap = gap <= 60 ? 0 : gap >= 350 ? 1 : (gap - 60) / 290;
    // How far the hand has to travel. Past a few keys the exact distance stops mattering:
    // it is a leap either way, and the landing finger should follow from what comes next.
    const raw = Math.abs(b.p - REST_OFFSET[fb] - (a.p - REST_OFFSET[fa]));
    const shift = raw <= 5 ? raw : 5 + 0.2 * (raw - 5);
    if (chordal) {
      // Chords are moved as a block anyway, so a block move is not a broken legato line.
      const eIoi = ioi <= 150 ? 0 : ioi >= 600 ? 1 : (ioi - 150) / 450;
      const ease = Math.max(eGap, eIoi);
      return 0.3 + 3 * (1 - ease) + (0.15 + (1 - ease)) * shift;
    }
    const eIoi = ioi <= 250 ? 0 : ioi >= 1200 ? 1 : (ioi - 250) / 950;
    const ease = Math.max(eGap, 0.35 * eIoi);
    return 2 + 10 * (1 - ease) + (0.15 + 1.35 * (1 - ease)) * shift;
  }

  private transition(prev: Ev, pf: number[], cur: Ev, cf: number[]): number {
    // Held notes keep their finger.
    for (let j = 0; j < cur.all.length; j++) {
      const pi = cur.prevIdx[j];
      if (pi >= 0 && pf[pi] !== cf[j]) return INF;
    }
    let sum = 0;
    let count = 0;
    let released = 0;
    let fresh = 0;
    for (let i = 0; i < prev.all.length; i++) if (cur.prevIdx.indexOf(i) < 0) released++;
    for (let j = 0; j < cur.all.length; j++) if (cur.isNew[j]) fresh++;
    const chordal = released > 1 || fresh > 1;
    for (let i = 0; i < prev.all.length; i++) {
      const a = prev.all[i];
      if (cur.prevIdx.indexOf(i) >= 0) continue; // still held: covered by the hand shape
      for (let j = 0; j < cur.all.length; j++) {
        if (!cur.isNew[j]) continue;
        const b = cur.all[j];
        const l = this.legato(a, pf[i], b, cf[j]);
        const jmp = this.jump(a, pf[i], b, cf[j], cur.t, prev.t, chordal);
        sum += l < jmp ? l : jmp;
        count++;
      }
    }
    if (!count) return 0;
    // Block chords are placed by their own best shape; connecting them only matters a little
    // (enough to get legato thirds and sixths right).
    const blocks = released > 1 && fresh > 1;
    return (sum / count) * (blocks ? 0.15 : 1);
  }

  private candidates(all: N[], keepExisting: boolean): number[][] {
    const k = all.length;
    if (k > 5) {
      // More notes than fingers: spread the fingers evenly, neighbours share one.
      return [all.map((_, i) => 1 + Math.round((4 * i) / (k - 1)))];
    }
    const base = COMBOS[k];
    if (!keepExisting || all.every((n) => n.preset === 0)) return base;
    const fixed = base.filter((c) => c.every((f, i) => all[i].preset === 0 || all[i].preset === f));
    if (fixed.length) return fixed;
    // Preset fingers that are not in ascending order (e.g. hand-edited): honour them as they are.
    if (all.every((n) => n.preset !== 0)) return [all.map((n) => n.preset)];
    return base;
  }

  run(handNotes: MidiNotePlaybackItem[], hand: Hand, keepExisting: boolean) {
    if (!handNotes.length) return;
    const sign = hand === 'right' ? 1 : -1;
    const sorted = [...handNotes].sort((a, b) => a.timeMs - b.timeMs || a.midi - b.midi);

    // ---- group into onset events ----------------------------------------------------
    const groups: N[][] = [];
    let groupStart = -Infinity;
    for (const n of sorted) {
      const preset = keepExisting && n.finger && n.finger >= 1 && n.finger <= 5 ? n.finger : 0;
      if (n.timeMs - groupStart > SIMULTANEOUS_MS) {
        groups.push([]);
        groupStart = n.timeMs;
      }
      const g = groups[groups.length - 1];
      const dup = g.find((x) => x.p === sign * n.midi);
      if (dup) {
        dup.src.push(n);
        dup.off = Math.max(dup.off, n.timeMs + n.durationMs);
        if (!dup.preset) dup.preset = preset;
        continue;
      }
      g.push({
        src: [n],
        p: sign * n.midi,
        black: isBlack(n.midi),
        on: n.timeMs,
        off: n.timeMs + Math.max(1, n.durationMs || 0),
        preset,
      });
    }

    // ---- pedal-style durations ---------------------------------------------------------
    // Many MIDI files stretch note lengths to imitate the sustain pedal. Where the written
    // lengths ask for more than a hand can hold, treat lengths as "let ring", not "keep down".
    const overflow = new Uint8Array(groups.length);
    const holding = new Uint8Array(groups.length);
    {
      let ring: N[] = [];
      let tPrev = -Infinity;
      groups.forEach((g, gi) => {
        const t = g[0].on;
        const minOverlap = Math.max(70, 0.5 * Math.min(2000, t - tPrev));
        ring = ring.filter((n) => n.off - t >= minOverlap && !g.some((x) => x.p === n.p));
        if (ring.length) {
          holding[gi] = 1;
          let lo = Infinity;
          let hi = -Infinity;
          for (const n of ring) { if (n.p < lo) lo = n.p; if (n.p > hi) hi = n.p; }
          for (const n of g) { if (n.p < lo) lo = n.p; if (n.p > hi) hi = n.p; }
          if (ring.length + g.length > 5 || hi - lo > MAX_HELD_SPAN + this.reach) overflow[gi] = 1;
        }
        ring = [...ring, ...g];
        tPrev = t;
      });
    }
    const letRing = new Uint8Array(groups.length);
    for (let gi = 0; gi < groups.length; gi++) {
      let bad = 0;
      let total = 0;
      for (let k = Math.max(0, gi - 16); k <= Math.min(groups.length - 1, gi + 16); k++) {
        total += holding[k];
        bad += overflow[k];
      }
      if (total > 0 && bad / total > 0.2) letRing[gi] = 1;
    }

    // ---- build sounding sets ---------------------------------------------------------
    const events: Ev[] = [];
    let sounding: N[] = [];
    let prevT = -Infinity;
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const t = g[0].on;
      const minOverlap = Math.max(70, 0.5 * Math.min(2000, t - prevT));
      const held = letRing[gi] ? [] : sounding.filter((n) => n.off - t >= minOverlap && !g.some((x) => x.p === n.p));
      const fits = () => {
        const k = held.length + g.length;
        if (k > 5) return false;
        let lo = Infinity;
        let hi = -Infinity;
        for (const n of held) { if (n.p < lo) lo = n.p; if (n.p > hi) hi = n.p; }
        for (const n of g) { if (n.p < lo) lo = n.p; if (n.p > hi) hi = n.p; }
        return hi - lo <= MAX_HELD_SPAN + this.reach;
      };
      // Notes that cannot physically stay down (pedal-style durations) are let go, oldest first.
      while (held.length && !fits()) {
        let oldest = 0;
        for (let i = 1; i < held.length; i++) if (held[i].on < held[oldest].on) oldest = i;
        held.splice(oldest, 1);
      }
      events.push(this.makeEvent(t, t - prevT, held, g, events[events.length - 1], keepExisting));
      sounding = [...held, ...g];
      prevT = t;
    }

    // ---- Viterbi ---------------------------------------------------------------------
    const cost: Float64Array[] = [];
    const back: Int16Array[] = [];
    for (let i = 0; i < events.length; i++) {
      let ev = events[i];
      let c = new Float64Array(ev.cands.length);
      let b = new Int16Array(ev.cands.length).fill(-1);
      if (i === 0) {
        for (let x = 0; x < ev.cands.length; x++) c[x] = ev.vcost[x];
      } else {
        const prev = events[i - 1];
        const fill = () => {
          let best = INF;
          for (let x = 0; x < ev.cands.length; x++) {
            let m = INF;
            let arg = -1;
            for (let y = 0; y < prev.cands.length; y++) {
              const base = cost[i - 1][y];
              if (base >= INF) continue;
              const tr = this.transition(prev, prev.cands[y], ev, ev.cands[x]);
              if (tr >= INF) continue;
              const total = base + tr;
              if (total < m) { m = total; arg = y; }
            }
            c[x] = m >= INF ? INF : m + ev.vcost[x];
            b[x] = arg;
            if (c[x] < best) best = c[x];
          }
          return best;
        };
        if (fill() >= INF) {
          // The held fingers leave no way to play this event: release them.
          const fresh = ev.all.filter((_, j) => ev.isNew[j]);
          ev = events[i] = this.makeEvent(ev.t, ev.dt, [], fresh, undefined, keepExisting);
          c = new Float64Array(ev.cands.length);
          b = new Int16Array(ev.cands.length).fill(-1);
          fill();
        }
        // Keep numbers small on very long pieces.
        let min = INF;
        for (let x = 0; x < c.length; x++) if (c[x] < min) min = c[x];
        if (min < INF) for (let x = 0; x < c.length; x++) if (c[x] < INF) c[x] -= min;
      }
      cost.push(c);
      back.push(b);
    }

    // ---- backtrack -------------------------------------------------------------------
    let at = 0;
    const last = cost[cost.length - 1];
    for (let x = 1; x < last.length; x++) if (last[x] < last[at]) at = x;
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      const f = ev.cands[at];
      for (let j = 0; j < ev.all.length; j++) {
        if (!ev.isNew[j]) continue;
        for (const s of ev.all[j].src) s.finger = f[j] as Finger;
      }
      at = back[i][at];
      if (at < 0 && i > 0) {
        at = 0;
        const c = cost[i - 1];
        for (let x = 1; x < c.length; x++) if (c[x] < c[at]) at = x;
      }
    }
  }

  private makeEvent(t: number, dt: number, held: N[], fresh: N[], prev: Ev | undefined, keepExisting: boolean): Ev {
    const all = [...held, ...fresh].sort((a, b) => a.p - b.p);
    const isNew = all.map((n) => fresh.indexOf(n) >= 0);
    const prevIdx = all.map((n, j) => (isNew[j] || !prev ? -1 : prev.all.indexOf(n)));
    const cands = this.candidates(all, keepExisting);
    const vcost = cands.map((f) => this.shape(all, isNew, f, dt));
    return { t, dt, all, isNew, prevIdx, cands, vcost };
  }
}

/**
 * Assigns a finger (1-5) to every note. Notes must already carry `hand`.
 * Mutates the notes it is given.
 */
export function runFingeringEngine(
  leftHand: MidiNotePlaybackItem[],
  rightHand: MidiNotePlaybackItem[],
  options: FingeringOptions = {}
) {
  const engine = new Engine(options.handSize ?? 'M');
  const keep = options.keepExisting !== false;
  engine.run(rightHand, 'right', keep);
  engine.run(leftHand, 'left', keep);
}

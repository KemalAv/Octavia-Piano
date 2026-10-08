# MIDI Difficulty Engine Calibration & Smoothing Report

## Root Cause of Previous Score Inflation (`100,000+` PS on Easy Songs)
1. **Intra-Chord Micro-Gap Splitting (`q20Gap`)**: In unquantized or human-played MIDIs (or MIDIs with rolled chords/grace notes), notes inside a single chord often have `1ms–15ms` micro-offsets. Using the 20th percentile of non-zero gaps (`q20Gap`) shrank `chordWindowMs` down to `1ms`, splitting normal chords into separate sequential events with `dt = 1ms–5ms`.
2. **Unbuffered Raw `dt` Floor (`Math.max(2, dt)`)**: When a chord was split into `2ms` events, raw `150 / dt` treated a single rolled chord or grace note as a 500-NPS speed burst, multiplying strain by `74x–340x`.
3. **Unbounded Running Strain Accumulation**: Summing un-normalized `runningStrain` across split chord notes compounded single-chord strain into the thousands, which after `^1.22` power scaling produced scores in the hundreds of thousands (`80,000–500,000+` PS).

## Fixes Implemented in `midiAnalysis.ts`
1. **Topological Invariant Chord Window (`avgMsPerNote`)**:
   - `avgMsPerNote = (songEnd - songStart) / sorted.length` is mathematically invariant to intra-chord jitter because the sum of all gaps always equals total song span.
   - `chordWindowMs = Math.min(35, Math.max(2, avgMsPerNote * 0.25))` keeps the chord window at `30–35ms` for all normal pieces (grouping rolled/unquantized chords properly) while scaling down proportionally on high-speed MIDIs so fast streams are never merged into chords.
2. **Smoothed Hand Interval (`emaDt`) with `8ms` Floor**:
   - Each hand/limb tracks an exponential moving average of its inter-onset intervals (`emaDt = 0.35 * clampedDt + 0.65 * emaDt` when accelerating, `0.60 * clampedDt + 0.40 * emaDt` when decelerating).
   - Isolated grace notes, mordents, flams, or rolled-chord stragglers are absorbed by `emaDt` without creating fake spikes, while sustained fast streams converge to their true speed within a few notes.
3. **Preserved `FineTunePanel` Baseline Calibration**:
   - Kept the exact original calibrated formula weights and exponents (`DEFAULT_FINE_TUNED_WEIGHTS` and `^1.22` scaling) so normal 1x songs score in their exact intended `10–1,400` PS range.
   - Added logarithmic intra-segment event density scaling (`1 + 0.18 * log2(evCountInSeg / 2)`) and segment-count compensation when high-speed MIDIs compress many events into fewer `400ms` windows.

## Fix for Broken-Chord / Arpeggio Ostinato Over-Scoring (e.g. Bach Prelude in C Major BWV 846)
1. **Register Gravity & Idle Hand Relaxation**: Prevents the Left Hand from greedily walking up a rising arpeggio (`C4 -> E4 -> G4 -> C5 -> E5`) and stealing 97% of the song into a single hand.
2. **Static 1-Octave Hand-Span Box (`inStaticArpeggioBox`)**: Tracks the recent 4-note pitch window (`<= 800ms`) per hand. When single notes rock back and forth inside a single 1-octave hand span (`<= 12` semitones, such as `G4 - C5 - E5 - G4 - C5 - E5`), the wrist center is anchored to the midpoint of the hand's span rather than jumping 9 semitones on every finger alternation.
3. **True Consecutive Jackhammer Filter**: `jackStrain` only triggers when the same key is struck consecutively (`hand.lastNotes.includes(note.midi)`) or within a rapid tremolo window (`<= 250ms`), preventing 3-note arpeggio cycles (`G4 -> C5 -> E5 -> G4`) from being misclassified as same-key jackhammers.
4. **Capped Unique Held-Finger Independence**: Counts unique held pitches excluding currently struck notes (capped at max 3 held fingers) and discounts passive chord-sustaining holds inside static broken-chord patterns so pedaled/sustained arpeggios do not inflate `fingerIndependenceStrain`.

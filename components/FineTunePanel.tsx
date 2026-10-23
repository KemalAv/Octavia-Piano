import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  analyzeMidi,
  DEFAULT_FINE_TUNED_WEIGHTS,
  FineTunedWeights
} from '../midiAnalysis';
import { parseFileForAnalysis } from '../midiParser';
import { PIANO_KEYS_CONFIG, DRUM_MIDI_TO_NAME_MAP } from '../constants';
import { Screen, OnlineSong } from '../types';

interface FineTunePanelProps {
  onBack: () => void;
  instrumentMode: 'piano' | 'drum';
}

interface CalibrationSong extends OnlineSong {
  targetPS: number;
  currentPS: number;
  notesData?: any; // pre-parsed midi note data
  included: boolean;
  instrument_mode?: 'piano' | 'drum';
}

interface CalibrationSliderRowProps {
  label: string;
  weightKey: keyof FineTunedWeights;
  value: number;
  description: string;
  onChange: (key: keyof FineTunedWeights, val: number) => void;
  unit?: string;
  isGlobal?: boolean;
}

const CalibrationSliderRow: React.FC<CalibrationSliderRowProps> = ({
  label,
  weightKey,
  value,
  description,
  onChange,
  unit = 'x',
  isGlobal = false,
}) => {
  return (
    <div className={`p-3 rounded-xl border transition-all ${isGlobal ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'}`}>
      <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1.5 gap-2">
        <span className="truncate">{label}</span>
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            min="0.00"
            max="10.00"
            step="0.01"
            value={Number(value.toFixed(2))}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed)) onChange(weightKey, parsed);
            }}
            className="w-16 px-1.5 py-0.5 text-right font-mono text-xs font-bold bg-slate-900 border border-slate-700 rounded text-yellow-400 focus:outline-none focus:border-yellow-400"
          />
          <span className="text-yellow-400 font-bold font-mono text-xs w-4">{unit}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(weightKey, Math.max(0.00, Number((value - 0.01).toFixed(2))))}
          className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-extrabold rounded active:scale-95 transition"
          title="Decrease by 0.01x"
        >
          -
        </button>
        <input
          type="range"
          min="0.00"
          max="10.00"
          step="0.01"
          value={value}
          onChange={(e) => onChange(weightKey, parseFloat(e.target.value))}
          className="w-full accent-yellow-500 cursor-pointer"
        />
        <button
          type="button"
          onClick={() => onChange(weightKey, Math.min(10.00, Number((value + 0.01).toFixed(2))))}
          className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-extrabold rounded active:scale-95 transition"
          title="Increase by 0.01x"
        >
          +
        </button>
      </div>
      <span className="text-[10px] text-slate-500 block mt-1 leading-tight">{description}</span>
    </div>
  );
};

export const FineTunePanel: React.FC<FineTunePanelProps> = ({ onBack, instrumentMode: initialInstrumentMode }) => {
  const [activeTab, setActiveTab] = useState<'piano' | 'drum'>(initialInstrumentMode);
  const [songs, setSongs] = useState<CalibrationSong[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [weights, setWeights] = useState<FineTunedWeights>(() => {
    return DEFAULT_FINE_TUNED_WEIGHTS;
  });

  const [calibrating, setCalibrating] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [errorStats, setErrorStats] = useState<{ startError: number; endError: number } | null>(null);

  const [rankedFilter, setRankedFilter] = useState<'ranked' | 'all'>('ranked');
  const [sortBy, setSortBy] = useState<'difficulty_asc' | 'difficulty_desc' | 'title' | 'score_desc'>('difficulty_asc');

  const midiNoteToNameMap = useMemo(() => {
    const map = new Map<number, string>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.midiNote, key.name));
    Object.entries(DRUM_MIDI_TO_NAME_MAP).forEach(([midi, name]) => map.set(parseInt(midi), name));
    return map;
  }, []);

  // Live calculate score for a checked/included song
  const calculateSingleSongScore = useCallback(async (song: CalibrationSong) => {
    try {
      let notesData = song.notesData;
      if (!notesData) {
        notesData = await loadSongMidiData(song);
      }

      const result = analyzeMidi(
        notesData.notes,
        notesData.durationMs,
        undefined,
        notesData.durationMs,
        song.instrument_mode as 'piano' | 'drum',
        weights
      );

      setSongs(prev => prev.map(item => {
        if (item.id === song.id) {
          return {
            ...item,
            notesData,
            currentPS: result?.performanceScore ?? 0,
            difficulty_level: result?.difficultyLevel ?? 1
          };
        }
        return item;
      }));
    } catch (err) {
      console.warn(`Error calculating score for ${song.title}:`, err);
    }
  }, [weights]);

  // Fetch songs of the active mode
  const fetchSongs = useCallback(async () => {
    setIsLoadingSongs(true);
    setProgressLog([]);
    setErrorStats(null);
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('instrument_mode', activeTab);

      if (error) throw error;

      if (data) {
        // Map songs, set default target scores (current score as default target)
        const mapped: CalibrationSong[] = (data as any[]).map(song => ({
          ...song,
          targetPS: song.performance_score || 500,
          currentPS: 0, // initially 0, calculated live on check
          included: false,
        }));
        setSongs(mapped);
      }
    } catch (e: any) {
      console.error("Failed to load songs", e);
    } finally {
      setIsLoadingSongs(false);
    }
  }, [activeTab]);

  const displayedSongs = useMemo(() => {
    let result = [...songs];

    // Filter by ranked
    if (rankedFilter === 'ranked') {
      result = result.filter(s => s.is_ranked === true);
    }

    // Sort by selected order
    result.sort((a, b) => {
      if (sortBy === 'difficulty_asc') {
        return (a.difficulty_level ?? 0) - (b.difficulty_level ?? 0);
      } else if (sortBy === 'difficulty_desc') {
        return (b.difficulty_level ?? 0) - (a.difficulty_level ?? 0);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'score_desc') {
        return (b.currentPS ?? 0) - (a.currentPS ?? 0);
      }
      return 0;
    });

    return result;
  }, [songs, rankedFilter, sortBy]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  // Load and Parse MIDI file for a song
  const loadSongMidiData = async (song: CalibrationSong): Promise<any> => {
    if (song.notesData) return song.notesData;

    const { data: blob, error } = await supabase.storage
      .from('midi-files')
      .download(song.file_path);

    if (error) throw error;

    const file = new File([blob!], 'temp.mid');
    const isDrum = song.instrument_mode === 'drum';

    const songMidiNoteToNameMap = new Map<number, string>();
    PIANO_KEYS_CONFIG.forEach(key => songMidiNoteToNameMap.set(key.midiNote, key.name));
    if (isDrum) {
      Object.entries(DRUM_MIDI_TO_NAME_MAP).forEach(([midi, name]) => songMidiNoteToNameMap.set(parseInt(midi), name));
    }

    const analysisData = await parseFileForAnalysis(file, songMidiNoteToNameMap);
    if (!analysisData) throw new Error("Could not parse MIDI content");

    return {
      notes: analysisData.notes,
      durationMs: analysisData.originalTotalMusicalDurationMs
    };
  };

  // Recalculate current performance scores based on slider weights (calculates ONLY for checked/included songs)
  const recalculateScores = useCallback(async () => {
    const updated = [...songs];
    let parsedCount = 0;

    for (let i = 0; i < updated.length; i++) {
      const s = updated[i];
      if (!s.included) continue;

      try {
        let notesData = s.notesData;
        if (!notesData) {
          notesData = await loadSongMidiData(s);
          updated[i].notesData = notesData;
        }

        const result = analyzeMidi(
          notesData.notes,
          notesData.durationMs,
          undefined,
          notesData.durationMs,
          s.instrument_mode as 'piano' | 'drum',
          weights
        );

        if (result) {
          updated[i].currentPS = result.performanceScore;
          updated[i].difficulty_level = result.difficultyLevel;
        }
        parsedCount++;
      } catch (err) {
        console.warn(`Error updating score for ${s.title}:`, err);
      }
    }

    if (parsedCount > 0) {
      setSongs(updated);
    }
  }, [songs, weights]);

  // Automatically recalculate scores in real-time for any song that has notesData cached when weights change (checked only)
  useEffect(() => {
    setSongs(prevSongs => {
      let changed = false;
      const updated = prevSongs.map(s => {
        if (!s.included || !s.notesData) return s;
        const res = analyzeMidi(
          s.notesData.notes,
          s.notesData.durationMs,
          undefined,
          s.notesData.durationMs,
          s.instrument_mode as 'piano' | 'drum',
          weights
        );
        if (res && (res.performanceScore !== s.currentPS || res.difficultyLevel !== s.difficulty_level)) {
          changed = true;
          return {
            ...s,
            currentPS: res.performanceScore,
            difficulty_level: res.difficultyLevel
          };
        }
        return s;
      });
      return changed ? updated : prevSongs;
    });
  }, [weights]);

  // Triggered when sliders change
  const handleWeightChange = (key: keyof FineTunedWeights, val: number) => {
    if (isNaN(val)) return;
    const clamped = Math.max(0.00, Math.min(10.00, Math.round(val * 100) / 100));
    setWeights(prev => ({ ...prev, [key]: clamped }));
  };

  // Copy tuned weights JSON for manual code update
  const handleSaveWeights = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(weights, null, 2));
      alert("Weights JSON copied to the clipboard! Paste it into DEFAULT_FINE_TUNED_WEIGHTS in midiAnalysis.ts to apply it permanently.");
    } catch (e) {
      alert("Copy failed: " + e);
    }
  };

  // Reset to defaults
  const handleResetWeights = () => {
    if (window.confirm("Are you sure you want to restore the default physiological parameters?")) {
      setWeights(DEFAULT_FINE_TUNED_WEIGHTS);
    }
  };

  // Multi-objective Balanced Loss:
  // Combines Mean Absolute Percentage Error (MAPE), Max/Worst-case Outlier Penalty (L_inf),
  // and Variance/Dispersion of errors across all songs to prevent sacrificing one song for another.
  const calculateTotalError = (activeWeights: FineTunedWeights, targetSongs: CalibrationSong[]): number => {
    const songErrors: number[] = [];

    for (const s of targetSongs) {
      if (!s.notesData) continue;
      const res = analyzeMidi(
        s.notesData.notes,
        s.notesData.durationMs,
        undefined,
        s.notesData.durationMs,
        s.instrument_mode as 'piano' | 'drum',
        activeWeights
      );
      if (res && s.targetPS > 0) {
        // Individual percentage error (e.g., 0.05 = 5%)
        const errorPct = (Math.abs(res.performanceScore - s.targetPS) / s.targetPS) * 100;
        songErrors.push(errorPct);
      }
    }

    if (songErrors.length === 0) return 0;

    // 1. Mean Absolute Percentage Error (MAPE)
    const mape = songErrors.reduce((acc, e) => acc + e, 0) / songErrors.length;

    // 2. Max Error (Penalizes isolated songs that get sacrificed or left far from target)
    const maxError = Math.max(...songErrors);

    // 3. Error Standard Deviation / Spread (Ensures error is evenly and uniformly distributed)
    const variance = songErrors.reduce((acc, e) => acc + Math.pow(e - mape, 2), 0) / songErrors.length;
    const stdDev = Math.sqrt(variance);

    // Balanced Composite Loss:
    // - 50% Mean error
    // - 30% Max outlier penalty (forces worst songs closer to target)
    // - 20% Uniformity/Balance penalty (keeps all errors balanced together)
    const compositeBalancedScore = (mape * 0.50) + (maxError * 0.30) + (stdDev * 0.20);
    return compositeBalancedScore;
  };
  // Automatic Tuning Optimizer using Coordinate Descent over weight parameters
  const handleRunCalibration = async () => {
    setCalibrating(true);
    setProgressLog(["Initializing song midi caches..."]);

    try {
      // 1. Ensure all included songs are downloaded & cached in memory
      const activeSet = [...songs];
      const songsToTune: CalibrationSong[] = [];

      for (let i = 0; i < activeSet.length; i++) {
        const s = activeSet[i];
        if (!s.included) continue;

        setProgressLog(prev => [...prev, `Caching MIDI: ${s.title}...`]);
        try {
          if (!s.notesData) {
            s.notesData = await loadSongMidiData(s);
            activeSet[i].notesData = s.notesData;
          }
          songsToTune.push(s);
        } catch (err: any) {
          setProgressLog(prev => [...prev, `⚠️ Error loading ${s.title}: ${err.message}`]);
        }
      }

      setSongs(activeSet);

      if (songsToTune.length === 0) {
        alert("Please include at least one song with valid MIDI to calibrate!");
        setCalibrating(false);
        return;
      }

      setProgressLog(prev => [...prev, `Starting Coordinate Descent calibration on ${songsToTune.length} songs...`]);

      // 2. Setup parameter weight list to optimize based on active tab
      const paramsToTune: (keyof FineTunedWeights)[] = activeTab === 'piano'
        ? [
          'piano_stretch_mult',
          'piano_internal_stretch',
          'piano_leap_strain',
          'piano_double_stop',
          'piano_jackhammer',
          'piano_finger_flow',
          'piano_hand_jump',
          'piano_black_key_awkward',
          'piano_finger_independence',
          'piano_hand_collision',
          'piano_stamina_fatigue',
          'piano_arpeggio_sweep',
          'piano_octave_staccato',
          'piano_unison_discount',
          'piano_chord_buff',
          'piano_global_factor'
        ]
        : [
          'drum_foot_kick',
          'drum_stick_jackhammer',
          'drum_stick_move',
          'drum_crossed_arms',
          'drum_polyrhythm',
          'drum_roll_fatigue',
          'drum_stamina_fatigue',
          'drum_global_factor'
        ];

      let bestWeights = { ...weights };
      const startError = calculateTotalError(bestWeights, songsToTune);
      let bestError = startError;

      setProgressLog(prev => [...prev, `Initial Mean Absolute Error: ${startError.toFixed(2)}%`]);

      // Optimization loop (coordinate descent) with 0.01 precision and 0.00 - 10.00 bounds
      const maxIterations = 12;
      let stepSize = 0.40;

      for (let iter = 1; iter <= maxIterations; iter++) {
        setProgressLog(prev => [...prev, `[Iteration ${iter}/${maxIterations}] Tuning parameters (Step size: ${stepSize.toFixed(2)})...`]);
        let modified = false;

        for (const param of paramsToTune) {
          const currentVal = bestWeights[param];

          // Test perturb up (clamped 0.00 to 10.00, rounded to 0.01)
          const upVal = Math.round(Math.max(0.00, Math.min(10.00, currentVal + stepSize)) * 100) / 100;
          const testUp = { ...bestWeights, [param]: upVal };
          const errUp = calculateTotalError(testUp, songsToTune);

          // Test perturb down (clamped 0.00 to 10.00, rounded to 0.01)
          const downVal = Math.round(Math.max(0.00, Math.min(10.00, currentVal - stepSize)) * 100) / 100;
          const testDown = { ...bestWeights, [param]: downVal };
          const errDown = calculateTotalError(testDown, songsToTune);

          if (errUp < bestError && errUp < errDown) {
            bestError = errUp;
            bestWeights[param] = testUp[param];
            modified = true;
          } else if (errDown < bestError && errDown < errUp) {
            bestError = errDown;
            bestWeights[param] = testDown[param];
            modified = true;
          }
        }

        // Decay search step size for progressive convergence down to 0.01
        stepSize *= 0.65;
        if (stepSize < 0.01 && stepSize > 0.005) {
          stepSize = 0.01;
        }

        setProgressLog(prev => [...prev, ` -> Mean Absolute Error reduced to: ${bestError.toFixed(2)}%`]);
        if (!modified && stepSize <= 0.01) break;
      }

      setWeights(bestWeights);
      setErrorStats({ startError, endError: bestError });
      setProgressLog(prev => [...prev, `🎉 Calibration finished successfully!`]);

      // Calibration finished: keep weights in state for live workbench display
      setProgressLog(prev => [...prev, `💡 Use "Copy Weights JSON" to copy the weights into your code.`]);

      // Recalculate scores for local display list
      const finalSongs = [...activeSet];
      for (const s of finalSongs) {
        if (!s.notesData) continue;
        const res = analyzeMidi(
          s.notesData.notes,
          s.notesData.durationMs,
          undefined,
          s.notesData.durationMs,
          s.instrument_mode as 'piano' | 'drum',
          bestWeights
        );
        if (res) {
          s.currentPS = res.performanceScore;
          s.difficulty_level = res.difficultyLevel;
        }
      }
      setSongs(finalSongs);

    } catch (e: any) {
      setProgressLog(prev => [...prev, `❌ FATAL CALIBRATION ERROR: ${e.message}`]);
    } finally {
      setCalibrating(false);
    }
  };

  // Upload/Apply Calibrated Scores directly to Database
  const handleApplyToDatabase = async () => {
    if (!window.confirm("Write these calibrated scores & levels back to the database for this set? This changes scores globally for players!")) return;

    setIsLoadingSongs(true);
    let successCount = 0;
    try {
      for (const s of songs) {
        if (!s.included) continue;

        const { error } = await supabase
          .from('songs')
          .update({
            performance_score: s.currentPS,
            difficulty_level: s.difficulty_level
          })
          .eq('id', s.id);

        if (error) {
          console.error(`Failed to update DB for ${s.title}`, error);
        } else {
          successCount++;
        }
      }
      alert(`Successfully saved ${successCount} calibrated scores and levels to the database!`);
    } catch (e: any) {
      alert("Error writing to database: " + e.message);
    } finally {
      setIsLoadingSongs(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-y-auto bg-slate-950 p-6 md:p-8 relative z-50">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-yellow-400 flex items-center gap-2 tracking-tight">
            <span>⚙️</span> DIFFICULTY ENGINE WORKBENCH
          </h1>
          <p className="text-sm text-slate-400">
            Tune physiological parameters to balance Chopin etudes, rapid kick drums, limb coordination, and physical exhaustion scores.
          </p>
        </div>
        <button
          onClick={onBack}
          className="mt-4 md:mt-0 bg-slate-800 hover:bg-slate-700 hover:text-white px-5 py-2.5 rounded-lg text-sm font-bold border border-slate-700 transition"
        >
          &larr; Back to Main Menu
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl self-start mb-6 w-full md:w-auto">
        <button
          onClick={() => setActiveTab('piano')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-extrabold text-sm transition-all ${activeTab === 'piano' ? 'bg-yellow-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
        >
          🎹 PIANO CALIBRATION
        </button>
        <button
          onClick={() => setActiveTab('drum')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-extrabold text-sm transition-all ${activeTab === 'drum' ? 'bg-yellow-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
        >
          🥁 DRUM CALIBRATION
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column - Weights sliders */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-1.5">
              <span>🦾</span> Biomechanical Coefficients
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleResetWeights}
                className="text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-5 custom-scrollbar max-h-[60vh] overflow-y-auto pr-2">
            {activeTab === 'piano' ? (
              <>
                {/* Piano Parameters */}
                <CalibrationSliderRow
                  label="Octave/Chord Stretch Multiplier"
                  weightKey="piano_stretch_mult"
                  value={weights.piano_stretch_mult}
                  description="Scale factor for spans exceeding natural comfortable reach of 12 semitones."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Internal Stretch Gap Tension"
                  weightKey="piano_internal_stretch"
                  value={weights.piano_internal_stretch}
                  description="Strain on inner fingers holding wide adjacent chord gaps."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Sequential Leap Strain"
                  weightKey="piano_leap_strain"
                  value={weights.piano_leap_strain}
                  description="Arpeggio leaps and sequential jumps exceeding comfort limits."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Double Stop / Chopin Chord Buff"
                  weightKey="piano_double_stop"
                  value={weights.piano_double_stop}
                  description="Forearm strain on rapid multi-key double notes."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Rapid Jackhammer Re-tap Rate"
                  weightKey="piano_jackhammer"
                  value={weights.piano_jackhammer}
                  description="Repetitive single-key rapid trigger physical limitation."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Linear Stream Flow Tension"
                  weightKey="piano_finger_flow"
                  value={weights.piano_finger_flow}
                  description="Transition drag when sliding linearly through consecutive steps."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Hand Center Jumping Leap"
                  weightKey="piano_hand_jump"
                  value={weights.piano_hand_jump}
                  description="Forearm displacement effort over broad register jumps."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Black Key Awkward Shifts"
                  weightKey="piano_black_key_awkward"
                  value={weights.piano_black_key_awkward}
                  description="Awkward hand position shifts when alternating white and black keys."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Finger Independence Hold"
                  weightKey="piano_finger_independence"
                  value={weights.piano_finger_independence}
                  description="Tension when holding some keys down while others keep triggers active."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Hand Collision Overlap"
                  weightKey="piano_hand_collision"
                  value={weights.piano_hand_collision}
                  description="Awkward coordination constraints when hands are close/overlapping."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Stamina Fatigue Decay"
                  weightKey="piano_stamina_fatigue"
                  value={weights.piano_stamina_fatigue}
                  description="Progressive muscular fatigue accumulation under high continuous notes."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Extreme Arpeggio Sweep (Waterfall)"
                  weightKey="piano_arpeggio_sweep"
                  value={weights.piano_arpeggio_sweep}
                  description="Multi-octave rapid right-hand arpeggio runs (Chopin Op. 10 No. 1)."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Detached Staccato Octaves (Butterfly)"
                  weightKey="piano_octave_staccato"
                  value={weights.piano_octave_staccato}
                  description="Rapid right-hand detached staccato octave bouncing (Chopin Op. 25 No. 9)."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Parallel Octave Unison Discount"
                  weightKey="piano_unison_discount"
                  value={weights.piano_unison_discount}
                  description="Coordination discount for 2-hand parallel octave unison drills."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Static Chord Voicing Buff"
                  weightKey="piano_chord_buff"
                  value={weights.piano_chord_buff}
                  description="Tension buff for sustained static chord positions in practice mode."
                  onChange={handleWeightChange}
                  unit=""
                />

                <CalibrationSliderRow
                  label="Global Scaling Factor (Piano)"
                  weightKey="piano_global_factor"
                  value={weights.piano_global_factor}
                  description="Final scalar determining general level ranges (0.00 - 10.00)."
                  onChange={handleWeightChange}
                  unit=""
                  isGlobal
                />
              </>
            ) : (
              <>
                {/* Drum Parameters */}
                <CalibrationSliderRow
                  label="Foot Pedal Kick Effort"
                  weightKey="drum_foot_kick"
                  value={weights.drum_foot_kick}
                  description="Tension on rapid foot kick repetitions or pedal timing."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Stick Pad Jackhammer Speed"
                  weightKey="drum_stick_jackhammer"
                  value={weights.drum_stick_jackhammer}
                  description="Effort required to hit the same drum pad continuously at high speeds."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Stick Lateral Movement Leap"
                  weightKey="drum_stick_move"
                  value={weights.drum_stick_move}
                  description="Stiffness penalty when jumping sticks laterally between pads."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Crossed-Arm Coordination"
                  weightKey="drum_crossed_arms"
                  value={weights.drum_crossed_arms}
                  description="Bonus difficulty for crossed-arm positions (Snare/Hihat overlap)."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Limb Polyrhythm Independence"
                  weightKey="drum_polyrhythm"
                  value={weights.drum_polyrhythm}
                  description="Effort multiplier when foot kick and stick hits occur simultaneously."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Roll Speed Fatigue"
                  weightKey="drum_roll_fatigue"
                  value={weights.drum_roll_fatigue}
                  description="Exhaustion penalty when executing ultra-fast stick rolls."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Limb Stamina Fatigue"
                  weightKey="drum_stamina_fatigue"
                  value={weights.drum_stamina_fatigue}
                  description="Muscle stamina decay over continuous rapid drumming."
                  onChange={handleWeightChange}
                />

                <CalibrationSliderRow
                  label="Global Scaling Factor (Drum)"
                  weightKey="drum_global_factor"
                  value={weights.drum_global_factor}
                  description="Final scalar determining general level ranges (0.00 - 10.00)."
                  onChange={handleWeightChange}
                  unit=""
                  isGlobal
                />
              </>
            )}
          </div>

          {/* Manual Control Toolbar */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={recalculateScores}
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold text-xs py-3 rounded-lg transition"
            >
              🔄 Recalculate Set
            </button>
            <button
              onClick={handleSaveWeights}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 font-extrabold text-xs py-3 rounded-lg border border-slate-700 transition"
            >
              💾 Save Tuning
            </button>
          </div>
        </div>

        {/* Right Column - Song Calibration Matrix & Optimizer */}
        <div className="lg:col-span-7 space-y-6">

          {/* Automatic Calibration Engine console */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span>🤖</span> Mathematical Optimization Set
              </h2>
              <button
                onClick={handleRunCalibration}
                disabled={calibrating || isLoadingSongs}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm px-6 py-2.5 rounded-lg shadow-lg flex items-center gap-2 transition"
              >
                {calibrating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Optimizing...
                  </>
                ) : "Run Coordinate Descent Calibration"}
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Enter target performance scores for your songs on the list below. The system will run multivariable coordination searches across all parameters to perfectly align actual calculated scores with your desired target levels.
            </p>

            {/* Error reduction graph or card */}
            {errorStats && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl mb-4 flex items-center justify-between text-yellow-300">
                <div className="text-xs">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-yellow-500 mb-1">Error Convergence Statistics</p>
                  <p>Starting Model Discrepancy: <span className="font-bold font-mono text-white text-sm">{errorStats.startError.toFixed(2)}%</span></p>
                  <p>Calibrated Model Discrepancy: <span className="font-bold font-mono text-green-400 text-sm">{errorStats.endError.toFixed(2)}%</span></p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-green-400 font-extrabold text-lg">
                    -{Math.max(0, (errorStats.startError - errorStats.endError)).toFixed(1)}% Error
                  </p>
                  <p className="text-[10px] text-slate-400">Perfectly Converged</p>
                </div>
              </div>
            )}

            {progressLog.length > 0 && (
              <div className="bg-black/50 p-4 rounded-xl border border-slate-850 mb-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Optimization Engine Logs</p>
                <div className="h-28 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1 custom-scrollbar">
                  {progressLog.map((log, idx) => (
                    <div key={idx} className="opacity-85">{log}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Copy & Paste Workbench */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>📋</span> Clipboard & Sync Tools
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const lines = displayedSongs
                      .filter(s => s.included)
                      .map(s => `${s.title}: Target: ${s.targetPS} -> Calibrated: ${s.currentPS} (Level ${s.difficulty_level})`);
                    if (lines.length === 0) {
                      alert("Please check/include some songs in the list to copy their scores!");
                      return;
                    }
                    navigator.clipboard.writeText(lines.join('\n'));
                    alert("Copied calibrated scores of included songs to clipboard!");
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3 rounded-lg border border-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <span>📋</span> Copy Scores List
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(weights, null, 2));
                    alert("Copied active weights JSON to clipboard!");
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3 rounded-lg border border-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <span>⚙️</span> Copy Weights JSON
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block">Import / Paste Weights JSON</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder='Paste weights JSON here e.g. {"piano_stretch_mult": 1.2, ...}'
                    className="flex-grow bg-slate-950 border border-slate-800 text-slate-200 text-xs py-1.5 px-2.5 rounded-lg focus:outline-none focus:border-yellow-500 placeholder-slate-600 font-mono text-[10px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        try {
                          const parsed = JSON.parse(e.currentTarget.value);
                          setWeights(prev => ({ ...prev, ...parsed }));
                          e.currentTarget.value = '';
                          alert("Weights successfully imported and applied!");
                        } catch (err: any) {
                          alert("Invalid JSON format: " + err.message);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = (e.currentTarget.previousSibling as HTMLInputElement);
                      try {
                        const parsed = JSON.parse(input.value);
                        setWeights(prev => ({ ...prev, ...parsed }));
                        input.value = '';
                        alert("Weights successfully imported and applied!");
                      } catch (err: any) {
                        alert("Invalid JSON format: " + err.message);
                      }
                    }}
                    className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-[11px] px-4 rounded-lg transition"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Quick Sync Targets */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400">Sync all targets to match current live scores:</span>
                <button
                  onClick={() => {
                    if (window.confirm("Copy all current calculated scores into your targets? This is useful to lock in the current model's scores as your starting point.")) {
                      setSongs(prev => prev.map(s => ({ ...s, targetPS: s.currentPS || s.targetPS })));
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 text-[10px] font-bold py-1 px-2.5 rounded border border-slate-700 transition"
                >
                  🎯 Set Targets = Current
                </button>
              </div>
            </div>
          </div>

          {/* Songs Calibration Set List */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col min-h-[40vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
                <span>📂</span> Reference Songs List
              </h3>
              <button
                onClick={handleApplyToDatabase}
                disabled={isLoadingSongs || songs.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 px-4 py-2 rounded-lg font-bold text-xs shadow-lg transition"
              >
                Apply Calibrated Scores to DB
              </button>
            </div>

            {/* Filters and Sorting Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Song Type</label>
                <select
                  value={rankedFilter}
                  onChange={(e) => setRankedFilter(e.target.value as 'ranked' | 'all')}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold py-2 px-3 rounded-lg focus:outline-none focus:border-yellow-500 cursor-pointer"
                >
                  <option value="ranked">🏆 Ranked Only</option>
                  <option value="all">🌐 All Songs (Ranked & Custom)</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sort Order</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold py-2 px-3 rounded-lg focus:outline-none focus:border-yellow-500 cursor-pointer"
                >
                  <option value="difficulty_asc">📈 Difficulty: Low to High</option>
                  <option value="difficulty_desc">📉 Difficulty: High to Low</option>
                  <option value="title">🔤 Title (A-Z)</option>
                  <option value="score_desc">⚡ Score (Highest First)</option>
                </select>
              </div>
            </div>

            {isLoadingSongs ? (
              <div className="flex-grow flex items-center justify-center py-12 text-slate-500 text-sm font-semibold animate-pulse">
                <span>🔄 Fetching Reference Songlist...</span>
              </div>
            ) : displayedSongs.length === 0 ? (
              <div className="flex-grow flex items-center justify-center py-12 text-slate-500 text-sm font-semibold text-center">
                <span>No songs match your criteria. Try switching the filter!</span>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar border border-slate-800/60 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-900 shadow-md z-10">
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-2 text-center w-8">Use</th>
                      <th className="py-2.5 px-2">Title / Artist</th>
                      <th className="py-2.5 px-2 text-center">Current Score</th>
                      <th className="py-2.5 px-2 text-center">Calibrated Level</th>
                      <th className="py-2.5 px-2 text-center w-24">Target PS Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedSongs.map((song) => (
                      <tr
                        key={song.id}
                        className={`border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors ${song.included ? 'opacity-100' : 'opacity-40'}`}
                      >
                        <td className="py-3 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={song.included}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updated = songs.map(s => s.id === song.id ? { ...s, included: checked } : s);
                              setSongs(updated);
                              if (checked) {
                                calculateSingleSongScore(song);
                              }
                            }}
                            className="accent-yellow-500 h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-2 font-semibold">
                          <p className="text-slate-100 font-bold text-sm leading-tight flex items-center gap-1.5">
                            {song.title}
                            {song.is_ranked && (
                              <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider">RANKED</span>
                            )}
                          </p>
                          <p className="text-slate-500 text-[10px]">{song.artist}</p>
                        </td>
                        <td className="py-3 px-2 text-center font-bold font-mono text-slate-300">
                          {!song.included ? (
                            <span className="text-slate-500 font-normal">—</span>
                          ) : song.notesData ? (
                            song.currentPS || "0"
                          ) : (
                            <span className="text-slate-500 flex items-center justify-center gap-1.5 text-[10px] animate-pulse">
                              <svg className="animate-spin h-3.5 w-3.5 text-yellow-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Calculating...
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center font-extrabold text-yellow-400">
                          {!song.included ? (
                            <span className="text-slate-500 font-normal">—</span>
                          ) : song.notesData ? (
                            `Level ${song.difficulty_level || "1"}`
                          ) : (
                            "---"
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min="10"
                            max="5000"
                            value={song.targetPS}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const updated = songs.map(s => s.id === song.id ? { ...s, targetPS: val } : s);
                              setSongs(updated);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 text-white font-mono font-bold text-center py-1.5 rounded-lg focus:outline-none focus:border-yellow-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};


import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Midi } from '@tonejs/midi';
import { PIANO_KEYS_CONFIG } from '../constants';
import { TempoEvent, TimeSignatureInfo } from '../types';

// Constants for editing
const TICKS_PER_QUARTER = 480;
const RULER_HEIGHT = 50;
const SIDEBAR_WIDTH = 60; 
const BASE_ROW_HEIGHT = 22;

const RHYTHM_BASES = [
  { label: '1/1', value: 4 },
  { label: '1/2', value: 2 },
  { label: '1/4', value: 1 },
  { label: '1/8', value: 0.5 },
  { label: '1/16', value: 0.25 },
  { label: '1/32', value: 0.125 },
  { label: '1/64', value: 0.0625 },
  { label: '1/128', value: 0.03125 },
];

const NOTE_TYPES = [
    { label: 'Normal', multiplier: 1.0 },
    { label: 'Dotted', multiplier: 1.5 },
    { label: 'Triplet', multiplier: 2/3 },
];

const KEY_SIGNATURES = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m'];
const TIME_SIGNATURES = ['4/4', '3/4', '2/4', '2/2', '6/8', '9/8', '12/8'];

interface EditorNote {
  id: string;
  midi: number;
  ticks: number;
  durationTicks: number;
  velocity: number;
  hand: 'left' | 'right';
  selected: boolean;
}

interface EditorTempo {
  ticks: number;
  bpm: number;
}

interface SignatureEvent {
    ticks: number;
    timeSignature?: [number, number];
    keySignature?: string;
}

interface EditorState {
    notes: EditorNote[];
    tempos: EditorTempo[];
    signatureEvents: SignatureEvent[];
}

interface DragInfo {
  type: 'note' | 'selection' | 'tempo';
  noteId?: string;
  initialNotes?: Map<string, { ticks: number, midi: number }>;
  minOriginalTick?: number;
  startX: number;
  startY: number;
  tempoIndex?: number;
  initialBpm?: number;
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface MidiEditorProps {
  initialMidiFile: File | null;
  onClose: () => void;
}

const useHistory = <T,>(initialState: T) => {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [index, setIndex] = useState(0);

    const setState = useCallback((action: T | ((prevState: T) => T), overwrite = false) => {
        const newState = typeof action === 'function' ? (action as (prevState: T) => T)(history[index]) : action;
        if (overwrite) {
            const newHistory = [...history];
            newHistory[index] = newState;
            setHistory(newHistory);
        } else {
            const newHistory = history.slice(0, index + 1);
            newHistory.push(newState);
            setHistory(newHistory);
            setIndex(newHistory.length - 1);
        }
    }, [history, index]);

    const undo = useCallback(() => {
        if (index > 0) setIndex(index - 1);
    }, [index]);

    const redo = useCallback(() => {
        if (index < history.length - 1) setIndex(index + 1);
    }, [index, history.length]);

    return [history[index], setState, undo, redo, index > 0, index < history.length - 1] as const;
};


const MidiEditor: React.FC<MidiEditorProps> = ({ initialMidiFile, onClose }) => {
  const [editorState, setEditorState, undo, redo, canUndo, canRedo] = useHistory<EditorState>({
      notes: [],
      tempos: [{ ticks: 0, bpm: 120 }],
      signatureEvents: [{ ticks: 0, timeSignature: [4, 4], keySignature: 'C' }],
  });
  const { notes, tempos, signatureEvents } = editorState;
  
  const [zoom, setZoom] = useState(1);
  const [vZoom, setVZoom] = useState(1);
  const [activeHand, setActiveHand] = useState<'right' | 'left'>('right');
  const [activeTool, setActiveTool] = useState<'draw' | 'delete' | 'select'>('draw');
  const [snapBaseIndex, setSnapBaseIndex] = useState(3); // Default 1/8
  const [snapTypeIndex, setSnapTypeIndex] = useState(0); // Default Normal
  const [isPlaying, setIsPlaying] = useState(false);
  const [cursorTick, setCursorTick] = useState(0);
  const [showBpmAutomation, setShowBpmAutomation] = useState(false);
  const [editingTempoIndex, setEditingTempoIndex] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsRendered, setIsSettingsRendered] = useState(false);
  
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const isDraggingRef = useRef(false);

  const [clipboard, setClipboard] = useState<EditorNote[]>([]);

  const [backingTrackUrl, setBackingTrackUrl] = useState<string | null>(null);
  const [backingTrackOffset, setBackingTrackOffset] = useState(0);
  const [backingTrackVolume, setBackingTrackVolume] = useState(0.5);
  const [pianoVolume, setPianoVolume] = useState(0.5);
  const [isEditingOffset, setIsEditingOffset] = useState(false);
  const backingTrackRef = useRef<HTMLAudioElement>(null);
  const mp3InputRef = useRef<HTMLInputElement>(null);
  const audioPlayPromiseRef = useRef<Promise<void> | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const bufferCacheRef = useRef<Map<number, AudioBuffer>>(new Map());
  const activeAudioSources = useRef<Map<string, { source: AudioBufferSourceNode, gain: GainNode }>>(new Map());

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const pianoSidebarRef = useRef<HTMLDivElement>(null);
  const playbackRequestRef = useRef<number | null>(null);
  const isDraggingRulerRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    if (isSettingsOpen) {
        setTimeout(() => setIsSettingsRendered(true), 10);
    } else {
        setIsSettingsRendered(false);
    }
  }, [isSettingsOpen]);

  const pixelsPerTick = 0.2 * zoom;
  const tickToPx = (tick: number) => tick * pixelsPerTick;
  const pxToTick = (px: number) => px / pixelsPerTick;

  const snapTicks = useMemo(() => {
      const base = RHYTHM_BASES[snapBaseIndex].value;
      const mult = NOTE_TYPES[snapTypeIndex].multiplier;
      return Math.round(base * mult * TICKS_PER_QUARTER);
  }, [snapBaseIndex, snapTypeIndex]);

  const handleGridScroll = useCallback(() => {
    if (gridContainerRef.current && pianoSidebarRef.current) {
        pianoSidebarRef.current.scrollTop = gridContainerRef.current.scrollTop;
    }
  }, []);

  const handleCopy = useCallback(() => {
    const selectedNotes = notes.filter(n => n.selected);
    if (selectedNotes.length === 0) return;
    setClipboard(selectedNotes.map(n => ({ ...n, selected: false })));
  }, [notes]);

  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) return;
    const minTick = Math.min(...clipboard.map(n => n.ticks));
    const offset = cursorTick - minTick;
    
    const pastedNotes: EditorNote[] = clipboard.map(n => ({
        ...n,
        id: Math.random().toString(36).substr(2, 9),
        ticks: Math.max(0, n.ticks + offset),
        selected: true
    }));

    setEditorState(prev => ({
        ...prev,
        notes: [
            ...prev.notes.map(n => ({ ...n, selected: false })),
            ...pastedNotes
        ]
    }));
  }, [clipboard, cursorTick, setEditorState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      const isUndo = cmdCtrl && e.key === 'z' && !e.shiftKey;
      const isRedo = (isMac ? (e.metaKey && e.shiftKey && e.key === 'z') : (e.ctrlKey && e.key === 'y'));
      const isCopy = cmdCtrl && e.key === 'c';
      const isPaste = cmdCtrl && e.key === 'v';
      const isDelete = e.key === 'Delete' || e.key === 'Backspace';

      if (isUndo) {
        e.preventDefault();
        undo();
      } else if (isRedo) {
        e.preventDefault();
        redo();
      } else if (isCopy) {
        e.preventDefault();
        handleCopy();
      } else if (isPaste) {
        e.preventDefault();
        handlePaste();
      } else if (isDelete) {
        const hasSelection = notes.some(n => n.selected);
        if (hasSelection) {
            e.preventDefault();
            setEditorState(prev => ({ ...prev, notes: prev.notes.filter(n => !n.selected) }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleCopy, handlePaste, notes, setEditorState]);

  useEffect(() => {
    const initAudio = () => {
        const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current && AudioContextConstructor) {
            audioContextRef.current = new AudioContextConstructor();
            masterGainRef.current = audioContextRef.current.createGain();
            masterGainRef.current.connect(audioContextRef.current.destination);
            masterGainRef.current.gain.value = pianoVolume;
        }
    };
    initAudio();

    const loadMidi = async () => {
      if (!initialMidiFile) return;
      try {
        const buffer = await initialMidiFile.arrayBuffer();
        const midi = new Midi(buffer);
        
        let newTempos: EditorTempo[] = midi.header.tempos.map(t => ({ ticks: t.ticks, bpm: t.bpm }));
        
        // BUG FIX: Ensure BPM at tick 0 is accurate from file
        if (newTempos.length === 0) {
            newTempos.push({ ticks: 0, bpm: 120 });
        } else {
            newTempos.sort((a, b) => a.ticks - b.ticks);
            if (newTempos[0].ticks > 0) {
                const firstBpm = newTempos[0].bpm;
                newTempos.unshift({ ticks: 0, bpm: firstBpm });
            } else {
                newTempos[0].ticks = 0;
            }
        }
        
        const newNotes: EditorNote[] = [];
        midi.tracks.forEach((track, i) => {
            track.notes.forEach(n => {
                let hand: 'left' | 'right' = midi.tracks.length > 1 ? (i % 2 === 0 ? 'right' : 'left') : (n.midi < 60 ? 'left' : 'right');
                newNotes.push({
                    id: Math.random().toString(36).substr(2, 9),
                    midi: n.midi, ticks: n.ticks, durationTicks: n.durationTicks,
                    velocity: n.velocity, hand, selected: false
                });
            });
        });

        const newSignatureEvents: SignatureEvent[] = [];
        midi.header.timeSignatures.forEach(ts => newSignatureEvents.push({ticks: ts.ticks, timeSignature: ts.timeSignature as [number, number]}));
        midi.header.keySignatures.forEach(ks => {
            const existing = newSignatureEvents.find(e => e.ticks === ks.ticks);
            if(existing) existing.keySignature = ks.key;
            else newSignatureEvents.push({ticks: ks.ticks, keySignature: ks.key});
        });
        if(!newSignatureEvents.find(e => e.ticks === 0)) {
            newSignatureEvents.unshift({ticks: 0, timeSignature: [4,4], keySignature: 'C'});
        }
        
        setEditorState({
            notes: newNotes,
            tempos: newTempos.sort((a,b) => a.ticks - b.ticks),
            signatureEvents: newSignatureEvents.sort((a,b) => a.ticks - b.ticks)
        });

      } catch (e) { console.error("Failed to load MIDI", e); alert("Could not load MIDI file."); }
    };
    loadMidi();
    
    return () => { if (backingTrackUrl) URL.revokeObjectURL(backingTrackUrl); }
  }, [initialMidiFile]);

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = pianoVolume;
  }, [pianoVolume]);

  const getActiveTimeSignatureAtTick = useCallback((tick: number) => {
    return signatureEvents.slice().reverse().find(e => e.ticks <= tick && e.timeSignature)?.timeSignature || [4,4];
  }, [signatureEvents]);

  const barStartTicks = useMemo(() => {
    const totalEditorTicks = Math.max(...notes.map(n => n.ticks + n.durationTicks), TICKS_PER_QUARTER * 16);
    const bars = [0];
    let currentTick = 0;
    while(currentTick < totalEditorTicks) {
      const [num, den] = getActiveTimeSignatureAtTick(currentTick);
      const ticksPerBar = (TICKS_PER_QUARTER * num) * (4 / den);
      if(ticksPerBar <= 0) break;
      currentTick += ticksPerBar;
      bars.push(currentTick);
    }
    return bars;
  }, [notes, signatureEvents, getActiveTimeSignatureAtTick]);

  const getCurrentBarStartTick = useCallback(() => {
    let currentBarIndex = -1;
    for (let i = barStartTicks.length - 1; i >= 0; i--) {
        if (barStartTicks[i] <= cursorTick) {
            currentBarIndex = i;
            break;
        }
    }
    return barStartTicks[currentBarIndex] ?? 0;
  }, [barStartTicks, cursorTick]);

  const sortedTempos = useMemo(() => [...tempos].sort((a, b) => a.ticks - b.ticks), [tempos]);

  const ticksToMs = useCallback((targetTicks: number) => {
    let ms = 0; let lastTick = 0;
    for (let i = 0; i < sortedTempos.length; i++) {
        const currentTempoEvent = sortedTempos[i];
        if (targetTicks <= lastTick) break;
        const segmentStartTick = Math.max(lastTick, currentTempoEvent.ticks);
        if (targetTicks <= segmentStartTick) break;
        const nextTempoEvent = sortedTempos[i + 1];
        const segmentEndTick = Math.min(targetTicks, nextTempoEvent ? nextTempoEvent.ticks : Infinity);
        const ticksInSegment = segmentEndTick - segmentStartTick;
        if (ticksInSegment <= 0) { lastTick = segmentEndTick; continue; }
        const bpm = currentTempoEvent.bpm;
        const msPerTick = (60000 / bpm) / TICKS_PER_QUARTER;
        ms += ticksInSegment * msPerTick;
        lastTick = segmentEndTick;
    }
    return ms;
  }, [sortedTempos]);

  const msToTicks = useCallback((targetMs: number) => {
    if (targetMs <= 0) return 0;
    let ticks = 0; let ms = 0;
    for (let i = 0; i < sortedTempos.length; i++) {
        const currentTempo = sortedTempos[i];
        const nextTempo = sortedTempos[i + 1];
        if (ms >= targetMs) break;
        const bpm = currentTempo.bpm;
        const msPerTick = (60000 / bpm) / TICKS_PER_QUARTER;
        if (msPerTick <= 0) continue;
        const ticksInSegment = nextTempo ? nextTempo.ticks - currentTempo.ticks : Infinity;
        const msInSegment = ticksInSegment * msPerTick;
        if (ms + msInSegment >= targetMs) {
            ticks += (targetMs - ms) / msPerTick;
            ms = targetMs;
            break;
        } else {
            ticks += ticksInSegment;
            ms += msInSegment;
        }
    }
    return ticks;
  }, [sortedTempos]);

  const getNoteName = (midi: number) => PIANO_KEYS_CONFIG.find(k => k.midiNote === midi)?.name;

  const playNoteSound = useCallback(async (midi: number, velocity: number, durationSec: number, when: number) => {
      if (!audioContextRef.current || !masterGainRef.current) return;
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      let buffer = bufferCacheRef.current.get(midi);
      if (!buffer) {
          const name = getNoteName(midi); if (!name) return;
          try {
              const resp = await fetch(`/sounds/piano/${name}.mp3`);
              const ab = await resp.arrayBuffer();
              buffer = await audioContextRef.current.decodeAudioData(ab);
              bufferCacheRef.current.set(midi, buffer);
          } catch (e) { console.warn('Could not load sound for', name); return; }
      }
      const source = audioContextRef.current.createBufferSource(); source.buffer = buffer;
      const gainNode = audioContextRef.current.createGain(); 
      gainNode.gain.setValueAtTime(velocity, when); 
      source.connect(gainNode); gainNode.connect(masterGainRef.current); source.start(when);
      const noteEndTime = when + durationSec;
      gainNode.gain.setValueAtTime(velocity, noteEndTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + 0.5);
      source.stop(noteEndTime + 0.51);
      return { source, gain: gainNode };
  }, []);

  const safePauseBackingTrack = useCallback(async () => {
    if (backingTrackRef.current) {
        if (audioPlayPromiseRef.current) {
            try { await audioPlayPromiseRef.current; } catch (e) {}
        }
        backingTrackRef.current.pause();
    }
  }, []);

  const safePlayBackingTrack = useCallback(async () => {
    if (backingTrackRef.current && backingTrackUrl) {
        try {
            audioPlayPromiseRef.current = backingTrackRef.current.play();
            await audioPlayPromiseRef.current;
            audioPlayPromiseRef.current = null;
        } catch (e: any) {
            audioPlayPromiseRef.current = null;
            if (e.name !== 'AbortError') console.error("Backing track play failed:", e);
        }
    }
  }, [backingTrackUrl]);

  const stopPlayback = useCallback(async () => {
    if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current);
    playbackRequestRef.current = null;
    activeAudioSources.current.forEach(({ source, gain }) => {
        try {
            const now = audioContextRef.current!.currentTime;
            gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.1); source.stop(now + 0.1);
        } catch(e) {}
    });
    activeAudioSources.current.clear();
    await safePauseBackingTrack();
    setIsPlaying(false);
  }, [safePauseBackingTrack]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) { await stopPlayback(); return; }
    if (!audioContextRef.current) return;
    const audioCtx = audioContextRef.current;
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const playbackStartAudioTime = audioCtx.currentTime;
    const playbackStartMs = ticksToMs(cursorTick);

    if (backingTrackRef.current && backingTrackUrl) {
        const audio = backingTrackRef.current;
        const offsetSeconds = backingTrackOffset / 1000;
        const midiStartSeconds = ticksToMs(cursorTick) / 1000;
        const audioStartTime = midiStartSeconds + offsetSeconds;
        await safePauseBackingTrack();
        audio.volume = backingTrackVolume;
        if (audioStartTime >= 0) {
            audio.currentTime = audioStartTime; 
            await safePlayBackingTrack();
        } else { 
            setTimeout(async () => { 
                if (isPlayingRef.current) { 
                    audio.currentTime = 0; 
                    await safePlayBackingTrack(); 
                } 
            }, -audioStartTime * 1000); 
        }
    }

    notes.forEach(note => {
        if (note.ticks >= cursorTick) {
            const startTimeMs = ticksToMs(note.ticks) - playbackStartMs;
            const durationMs = ticksToMs(note.ticks + note.durationTicks) - ticksToMs(note.ticks);
            if (startTimeMs < 0 || durationMs <= 0) return;
            const scheduleTimeSec = playbackStartAudioTime + (startTimeMs / 1000);
            playNoteSound(note.midi, note.velocity, durationMs / 1000, scheduleTimeSec).then(res => { if (res) activeAudioSources.current.set(note.id, res); });
        }
    });
    const animationStartTime = performance.now();
    const totalDurationTicks = Math.max(...notes.map(n => n.ticks + n.durationTicks), 0);
    const animate = () => {
        const elapsedMs = performance.now() - animationStartTime;
        const newCursorTick = msToTicks(playbackStartMs + elapsedMs);
        setCursorTick(newCursorTick);
        if(newCursorTick >= totalDurationTicks) {
            stopPlayback(); setCursorTick(totalDurationTicks);
            if (backingTrackRef.current) backingTrackRef.current.currentTime = 0;
        } else { playbackRequestRef.current = requestAnimationFrame(animate); }
    };
    playbackRequestRef.current = requestAnimationFrame(animate);
    setIsPlaying(true);
  }, [isPlaying, stopPlayback, notes, cursorTick, ticksToMs, msToTicks, playNoteSound, backingTrackUrl, backingTrackOffset, backingTrackVolume, safePauseBackingTrack, safePlayBackingTrack]);

  const snapTick = (tick: number) => { const s = snapTicks; return Math.round(tick / s) * s; };
  const effectiveRowHeight = BASE_ROW_HEIGHT * vZoom;
  const totalTicks = useMemo(() => Math.max(...notes.map(n => n.ticks + n.durationTicks), TICKS_PER_QUARTER * 16), [notes]);
  const totalWidth = tickToPx(totalTicks);
  const totalHeight = 88 * effectiveRowHeight;

  const handleMouseDownShared = (action: () => void) => {
    isDraggingRef.current = true;
    action();
  };

  const handleMouseUpShared = () => {
    isDraggingRef.current = false;
    setDragInfo(null);
  };
  
  const handleGridMouseDown = (e: React.MouseEvent) => {
    const gridEl = e.currentTarget as HTMLDivElement;
    const rect = gridEl.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;

    if (activeTool === 'draw') {
        handleMouseDownShared(() => {
            const tick = snapTick(pxToTick(x + gridEl.scrollLeft));
            const row = Math.floor((y + gridEl.scrollTop) / effectiveRowHeight);
            const midi = 108 - row;
            if (midi < 21 || midi > 108) return;
            const newNote: EditorNote = { id: Math.random().toString(36).substr(2, 9), midi, ticks: tick, durationTicks: snapTicks, velocity: 0.8, hand: activeHand, selected: false };
            setEditorState(prev => ({...prev, notes: [...prev.notes.map(n => ({...n, selected: false})), newNote]}));
            playNoteSound(midi, 0.8, 0.25, audioContextRef.current!.currentTime);
        });
    } else if (activeTool === 'select') {
        handleMouseDownShared(() => {
            if (!e.shiftKey) {
                setEditorState(prev => ({...prev, notes: prev.notes.map(n => ({...n, selected: false}))}));
            }
            setSelectionBox({ startX: x + gridEl.scrollLeft, startY: y + gridEl.scrollTop, endX: x + gridEl.scrollLeft, endY: y + gridEl.scrollTop });
        });
    }
  };
  
  const handleNoteMouseDown = (e: React.MouseEvent, note: EditorNote) => {
    e.stopPropagation();
    if (activeTool === 'delete') {
      setEditorState(prev => ({...prev, notes: prev.notes.filter(n => n.id !== note.id)}));
    } else if (activeTool === 'select') {
        handleMouseDownShared(() => {
            let targetNotes: EditorNote[] = [];
            if (note.selected) {
                targetNotes = notes.filter(n => n.selected);
            } else {
                if (e.shiftKey) {
                    targetNotes = notes.filter(n => n.selected || n.id === note.id);
                } else {
                    targetNotes = [note];
                }
            }

            const newSelectedNotesMap = new Map<string, { ticks: number, midi: number }>();
            let minOriginalTick = Infinity;
            setEditorState(prev => {
                const newNotes = prev.notes.map(n => {
                    const isPartOfNewSelection = targetNotes.some(tn => tn.id === n.id);
                    if (isPartOfNewSelection) {
                        newSelectedNotesMap.set(n.id, { ticks: n.ticks, midi: n.midi });
                        if (n.ticks < minOriginalTick) minOriginalTick = n.ticks;
                    }
                    return {...n, selected: isPartOfNewSelection };
                });
                return {...prev, notes: newNotes };
            }, true);

            setDragInfo({ 
                type: 'selection', 
                noteId: note.id, 
                initialNotes: newSelectedNotesMap, 
                minOriginalTick: minOriginalTick === Infinity ? note.ticks : minOriginalTick,
                startX: e.clientX, 
                startY: e.clientY 
            });
        });
    } else {
        playNoteSound(note.midi, note.velocity, ticksToMs(note.durationTicks)/1000, audioContextRef.current!.currentTime);
    }
  };

  const handleBpmMouseDown = (e: React.MouseEvent, index?: number) => {
    if (editingTempoIndex !== null) return;
    e.stopPropagation();
    handleMouseDownShared(() => {
        const laneEl = e.currentTarget as HTMLDivElement;
        const rect = laneEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const tick = pxToTick(x + (gridContainerRef.current?.scrollLeft || 0));
        if (index !== undefined) {
            setDragInfo({ type: 'tempo', tempoIndex: index, initialBpm: tempos[index].bpm, startX: e.clientX, startY: e.clientY });
        } else {
            const y = e.clientY - rect.top;
            const bpm = 500 - (y / laneEl.clientHeight) * 480; 
            setEditorState(prev => ({...prev, tempos: [...prev.tempos, { ticks: snapTick(tick), bpm: Math.round(Math.max(20, bpm)) }].sort((a,b) => a.ticks - b.ticks)}));
        }
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingRulerRef.current && gridContainerRef.current) {
            const rect = gridContainerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            setCursorTick(Math.max(0, pxToTick(x + gridContainerRef.current.scrollLeft)));
        } else if (dragInfo && isDraggingRef.current) {
            if (dragInfo.type === 'selection' && dragInfo.initialNotes && dragInfo.minOriginalTick !== undefined) {
                const dx = e.clientX - dragInfo.startX; const dy = e.clientY - dragInfo.startY;
                const rawTickDelta = pxToTick(dx); 
                const midiDelta = Math.round(dy / effectiveRowHeight);
                
                const proposedMinTick = dragInfo.minOriginalTick + rawTickDelta;
                const snappedMinTick = snapTick(proposedMinTick);
                const snappedTickDelta = snappedMinTick - dragInfo.minOriginalTick;

                setEditorState(prev => ({...prev, notes: prev.notes.map(n => {
                    const initial = dragInfo.initialNotes!.get(n.id);
                    if (initial) return {...n, ticks: Math.max(0, initial.ticks + snappedTickDelta), midi: initial.midi - midiDelta };
                    return n;
                })}), true);
            } else if (dragInfo.type === 'tempo' && dragInfo.tempoIndex !== undefined) {
                const dy = e.clientY - dragInfo.startY;
                const bpmDelta = (dy / (gridContainerRef.current?.clientHeight ?? totalHeight)) * 480;
                setEditorState(prev => {
                    const newTempos = [...prev.tempos];
                    const rawNewBpm = Math.max(20, Math.min(500, dragInfo.initialBpm! - bpmDelta));
                    const newBpm = Math.round(rawNewBpm * 4) / 4;
                    newTempos[dragInfo.tempoIndex!].bpm = newBpm;
                    return {...prev, tempos: newTempos };
                }, true);
            }
        } else if (selectionBox && isDraggingRef.current && gridContainerRef.current) {
            const gridEl = gridContainerRef.current;
            const rect = gridEl.getBoundingClientRect();
            const x = e.clientX - rect.left + gridEl.scrollLeft;
            const y = e.clientY - rect.top - RULER_HEIGHT + gridEl.scrollTop;
            setSelectionBox(prev => prev ? {...prev, endX: x, endY: y} : null);
        }
    };

    const handleMouseUp = async (e: MouseEvent) => {
        if (isDraggingRulerRef.current && backingTrackRef.current && backingTrackUrl) {
            const audio = backingTrackRef.current;
            const offsetSeconds = backingTrackOffset / 1000;
            const midiStartSeconds = ticksToMs(cursorTick) / 1000;
            audio.currentTime = Math.max(0, midiStartSeconds + offsetSeconds);
        }
        isDraggingRulerRef.current = false;
        
        if (selectionBox && gridContainerRef.current) {
            const x1 = Math.min(selectionBox.startX, selectionBox.endX), x2 = Math.max(selectionBox.startX, selectionBox.endX);
            const y1 = Math.min(selectionBox.startY, selectionBox.endY), y2 = Math.max(selectionBox.startY, selectionBox.endY);
            const startTick = pxToTick(x1), endTick = pxToTick(x2);
            const startMidi = 108 - Math.floor(y1 / effectiveRowHeight), endMidi = 108 - Math.floor(y2 / effectiveRowHeight);

            setEditorState(prev => ({...prev, notes: prev.notes.map(n => {
                const noteStartTick = n.ticks, noteEndTick = n.ticks + n.durationTicks, noteMidi = n.midi;
                const isHorizontallyIn = noteStartTick < endTick && noteEndTick > startTick;
                const isVerticallyIn = noteMidi <= startMidi && noteMidi >= endMidi;
                return {...n, selected: (isHorizontallyIn && isVerticallyIn) || (e.shiftKey && n.selected) };
            })}));
            setSelectionBox(null);
        }
        handleMouseUpShared();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo, selectionBox, snapTick, pxToTick, effectiveRowHeight, backingTrackOffset, backingTrackUrl, cursorTick, ticksToMs, setEditorState]);

  const handleRulerInteraction = (e: React.MouseEvent | React.TouchEvent<HTMLDivElement>) => {
      const rulerEl = e.currentTarget as HTMLDivElement;
      const rect = rulerEl.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      if (x < 0) return;
      setCursorTick(Math.max(0, pxToTick(x + (gridContainerRef.current?.scrollLeft || 0))));
  };
  
  const handleSignatureChange = (type: 'key' | 'time', value: string) => {
      const barStartTick = getCurrentBarStartTick();
      setEditorState(prev => {
          const newEvents = [...prev.signatureEvents];
          let eventForBar = newEvents.find(e => e.ticks === barStartTick);
          if (!eventForBar) {
              eventForBar = { ticks: barStartTick };
              newEvents.push(eventForBar);
          }
          if (type === 'key') {
              eventForBar.keySignature = value;
          } else {
              const [num, den] = value.split('/').map(Number);
              eventForBar.timeSignature = [num, den];
          }
          return {...prev, signatureEvents: newEvents.sort((a,b) => a.ticks - b.ticks)};
      });
  };

  const handleExport = () => {
      const midi = new Midi();
      tempos.forEach((t) => midi.header.tempos.push({ ticks: t.ticks, bpm: t.bpm }));
      signatureEvents.forEach(e => {
        if(e.timeSignature) midi.header.timeSignatures.push({ticks: e.ticks, timeSignature: e.timeSignature as [number, number]});
        if(e.keySignature) {
          const isMinor = e.keySignature.endsWith('m');
          const key = isMinor ? e.keySignature.slice(0, -1) : e.keySignature;
          const scale = isMinor ? 'minor' : 'major';
          midi.header.keySignatures.push({ticks: e.ticks, key, scale});
        }
      });
      const rightTrack = midi.addTrack(); rightTrack.name = "Right Hand";
      const leftTrack = midi.addTrack(); leftTrack.name = "Left Hand";
      notes.forEach(note => {
          const track = note.hand === 'right' ? rightTrack : leftTrack;
          track.addNote({ midi: note.midi, ticks: note.ticks, durationTicks: note.durationTicks, velocity: note.velocity });
      });
      const blob = new Blob([midi.toArray()], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `octavia_edit_${Date.now()}.mid`; a.click();
      URL.revokeObjectURL(url);
  };
  
  const handleBackingTrackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { if (backingTrackUrl) URL.revokeObjectURL(backingTrackUrl); setBackingTrackUrl(URL.createObjectURL(file)); }
  };

  const handleOffsetSubmit = (value: string) => {
    const newOffset = parseInt(value, 10);
    if (!isNaN(newOffset)) {
        setBackingTrackOffset(newOffset);
    }
    setIsEditingOffset(false);
  };

  const currentBarSignatures = useMemo(() => {
    const barStart = getCurrentBarStartTick();
    const keyEvent = [...signatureEvents].reverse().find(e => e.ticks <= barStart && e.keySignature);
    const timeEvent = [...signatureEvents].reverse().find(e => e.ticks <= barStart && e.timeSignature);
    return {
        key: keyEvent?.keySignature || 'C',
        time: timeEvent?.timeSignature ? `${timeEvent.timeSignature[0]}/${timeEvent.timeSignature[1]}` : '4/4'
    };
  }, [signatureEvents, getCurrentBarStartTick]);

  const getBpmAtTick = useCallback((tick: number) => {
    const precedingTempo = [...tempos].reverse().find(t => t.ticks <= tick);
    return precedingTempo ? precedingTempo.bpm : 120;
  }, [tempos]);

  const handleAddTempoPoint = useCallback(() => {
    if (tempos.some(t => t.ticks === cursorTick)) return;
    const bpmAtCursor = getBpmAtTick(cursorTick);
    setEditorState(prev => ({
        ...prev,
        tempos: [...prev.tempos, { ticks: snapTick(cursorTick), bpm: Math.max(20, bpmAtCursor) }].sort((a,b) => a.ticks - b.ticks)
    }));
  }, [cursorTick, tempos, setEditorState, getBpmAtTick, snapTick]);

  const nearestTempoPoint = useMemo(() => {
    if (!showBpmAutomation) return null;
    let closestPoint: EditorTempo | null = null;
    let minDistance = Infinity;

    tempos.forEach(t => {
        const distance = Math.abs(tickToPx(t.ticks) - tickToPx(cursorTick));
        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = t;
        }
    });
    if (minDistance < 8) return closestPoint;
    return null;
  }, [cursorTick, tempos, showBpmAutomation, tickToPx]);

  const handleDeleteTempoPoint = useCallback(() => {
    if (!nearestTempoPoint || nearestTempoPoint.ticks === 0) return;
    setEditorState(prev => ({
        ...prev,
        tempos: prev.tempos.filter(t => t.ticks !== nearestTempoPoint.ticks)
    }));
  }, [nearestTempoPoint, setEditorState]);

  const handleTempoLabelSubmit = (index: number, value: string) => {
    const newBpm = Math.max(20, Math.min(500, parseFloat(value) || 120));
    setEditorState(prev => {
        const newTempos = [...prev.tempos];
        if (newTempos[index]) {
            newTempos[index].bpm = Math.round(newBpm * 4) / 4;
        }
        return { ...prev, tempos: newTempos };
    });
    setEditingTempoIndex(null);
  };

  const bpmMarkers = useMemo(() => {
    return [500, 400, 300, 200, 100, 20];
  }, []);

  const renderBpmInput = () => {
    if (editingTempoIndex === null) return null;
    const tempo = tempos[editingTempoIndex];
    if (!tempo) return null;

    const x = tickToPx(tempo.ticks);
    const y = totalHeight - ((tempo.bpm - 20)/480 * totalHeight);
    
    // Logika khusus untuk tick 0 agar tidak tertutup sidebar
    const isFirstTick = tempo.ticks === 0;
    const transformStyle = isFirstTick ? 'translate(10%, -120%)' : 'translate(-50%, -120%)';

    return (
        <div 
          className="absolute z-[100] flex items-center gap-1 bg-slate-900 border border-amber-500 rounded-lg p-1 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
          style={{ 
            left: `${x}px`, 
            top: `${y}px`,
            transform: transformStyle
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <input
            autoFocus
            type="number"
            min="20"
            max="500"
            className="bg-slate-800 text-amber-400 px-2 py-1 text-sm font-mono w-20 outline-none rounded border border-slate-700 focus:border-amber-500"
            defaultValue={tempo.bpm}
            onKeyDown={(e) => { 
              if (e.key === 'Enter') handleTempoLabelSubmit(editingTempoIndex, e.currentTarget.value); 
              if (e.key === 'Escape') setEditingTempoIndex(null);
            }}
          />
          <button 
            onClick={(e) => {
                const input = e.currentTarget.previousSibling as HTMLInputElement;
                handleTempoLabelSubmit(editingTempoIndex, input.value);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black p-1.5 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </button>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col text-slate-200 font-sans select-none overflow-hidden">
      {backingTrackUrl && <audio ref={backingTrackRef} src={backingTrackUrl} />}
      
      {/* HEADER */}
      <div className="h-16 bg-slate-900 border-b border-white/10 flex items-center px-4 justify-between gap-4 shadow-xl z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-cyan-400 mr-2 tracking-tighter italic">MIDI EDITOR</h2>
          <button onClick={togglePlay} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-amber-500 scale-110' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20 shadow-lg'}`}>
              {isPlaying ? <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg> : <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={!canUndo} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30" title="Undo (Ctrl+Z)"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 110 14h-1a1 1 0 110-2h1a5 5 0 100-10H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg></button>
            <button onClick={redo} disabled={!canRedo} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30" title="Redo (Ctrl+Y)"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.293 3.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H9a7 7 0 100 14h1a1 1 0 100-2H9a5 5 0 110-10h5.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg></button>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-800/80 p-1.5 rounded-lg border border-white/10">
          <div className="flex items-center gap-1">
              {(['select', 'draw', 'delete'] as const).map(tool => (
                  <button key={tool} onClick={() => setActiveTool(tool)} className={`px-3 py-1 rounded text-xs font-black ${activeTool === tool ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-500 hover:bg-slate-600'}`}>{tool.charAt(0).toUpperCase() + tool.slice(1)}</button>
              ))}
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex gap-2">
            <div className="flex flex-col">
                <span className="text-[9px] uppercase text-slate-500 font-bold">Rhythm</span>
                <select value={snapBaseIndex} onChange={e => setSnapBaseIndex(Number(e.target.value))} className="bg-transparent text-xs font-black text-white outline-none cursor-pointer">
                    {RHYTHM_BASES.map((opt, i) => (<option key={i} value={i} className="bg-slate-900">{opt.label}</option>))}
                </select>
            </div>
            <div className="flex flex-col">
                <span className="text-[9px] uppercase text-slate-500 font-bold">Type</span>
                <select value={snapTypeIndex} onChange={e => setSnapTypeIndex(Number(e.target.value))} className="bg-transparent text-xs font-black text-white outline-none cursor-pointer">
                    {NOTE_TYPES.map((opt, i) => (<option key={i} value={i} className="bg-slate-900">{opt.label}</option>))}
                </select>
            </div>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          {['Key', 'Time'].map(type => (
            <React.Fragment key={type}>
            <div className="flex flex-col px-2">
                <span className="text-[9px] uppercase text-slate-500 font-bold">{type}</span>
                { type === 'Key' ?
                    <select value={currentBarSignatures.key} onChange={e => handleSignatureChange('key', e.target.value)} className="bg-transparent text-xs font-black text-white outline-none cursor-pointer w-12">{KEY_SIGNATURES.map(k => (<option key={k} value={k} className="bg-slate-900">{k}</option>))}</select> :
                    <select value={currentBarSignatures.time} onChange={e => handleSignatureChange('time', e.target.value)} className="bg-transparent text-xs font-black text-white outline-none cursor-pointer w-12">{TIME_SIGNATURES.map(t => (<option key={t} value={t} className="bg-slate-900">{t}</option>))}</select>
                }
            </div>
            <div className="h-6 w-px bg-white/10"></div>
            </React.Fragment>
          ))}
          <button onClick={() => setShowBpmAutomation(p => !p)} className={`px-3 py-1 rounded text-xs font-black ${showBpmAutomation ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-500'}`}>BPM</button>
          
          <div className="h-6 w-px bg-white/10"></div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 px-2">
              <div className="flex flex-col items-center">
                  <span className="text-[8px] uppercase text-slate-500 font-bold">Pitch</span>
                  <div className="flex items-center gap-1">
                      <button onClick={() => setVZoom(p => Math.max(0.2, p - 0.1))} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-xs flex items-center justify-center">−</button>
                      <button onClick={() => setVZoom(p => Math.min(3, p + 0.1))} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-xs flex items-center justify-center">+</button>
                  </div>
              </div>
              <div className="flex flex-col items-center ml-1">
                  <span className="text-[8px] uppercase text-slate-500 font-bold">Time</span>
                  <div className="flex items-center gap-1">
                      <button onClick={() => setZoom(p => Math.max(0.1, p - 0.1))} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-xs flex items-center justify-center">−</button>
                      <button onClick={() => setZoom(p => Math.min(5, p + 0.1))} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-xs flex items-center justify-center">+</button>
                  </div>
              </div>
          </div>

          <div className="h-6 w-px bg-white/10"></div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300" title="Editor Settings">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-xs font-black shadow-lg transition-transform active:scale-95">EXPORT</button>
          <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-xs font-black transition-colors">EXIT</button>
        </div>
      </div>

      <div className="flex-grow flex flex-row overflow-hidden relative">
        {/* PIANO SIDEBAR / BPM SIDEBAR */}
        <div 
          ref={pianoSidebarRef}
          className="flex-shrink-0 w-[60px] bg-[#121212] border-r border-white/10 overflow-hidden pointer-events-none"
        >
             <div style={{height: RULER_HEIGHT}} className="bg-[#151515] border-b border-white/10"></div>
             <div className="relative" style={{height: totalHeight}}>
              {showBpmAutomation ? (
                  /* BPM SCALE SIDEBAR */
                  bpmMarkers.map((bpm) => {
                      const top = totalHeight - ((bpm - 20) / 480 * totalHeight);
                      return (
                          <div key={bpm} className="absolute left-0 right-0 border-t border-amber-500/20 flex items-start justify-center" style={{ top }}>
                              <span className="text-[10px] font-black text-amber-500/60 bg-[#121212] px-1 translate-y-[-50%]">{bpm}</span>
                          </div>
                      );
                  })
              ) : (
                  /* PIANO KEY SIDEBAR */
                  Array.from({ length: 88 }).map((_, i) => {
                      const midi = 108 - i; 
                      const isBlack = [1, 3, 6, 8, 10].includes(midi % 12); 
                      const isC = midi % 12 === 0;
                      return (
                          <div key={midi} 
                              className={`border-b text-[9px] flex items-center justify-center cursor-default transition-colors ${isBlack ? 'bg-black text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-300'} ${isC ? 'border-b-slate-500' : ''}`}
                              style={{ height: effectiveRowHeight }} >
                              {isC && <span className="font-black">C{Math.floor(midi/12) - 1}</span>}
                          </div>
                      );
                  })
              )}
             </div>
        </div>

        {/* MAIN PIANO ROLL GRID */}
        <div 
          className="flex-grow overflow-auto relative custom-scrollbar bg-[#0a0a0a]" 
          ref={gridContainerRef}
          onScroll={handleGridScroll}
        >
            <div style={{ width: totalWidth, height: totalHeight + RULER_HEIGHT, position: 'relative' }}>
                <div className="sticky top-0 z-30 bg-[#151515] border-b border-white/10 flex text-[10px] text-slate-500 cursor-crosshair" style={{ height: RULER_HEIGHT, width: '100%'}}
                    onMouseDown={e => {isDraggingRulerRef.current = true; handleRulerInteraction(e);}} onMouseMove={e => isDraggingRulerRef.current && handleRulerInteraction(e)}
                    onMouseUp={() => isDraggingRulerRef.current = false} onMouseLeave={() => isDraggingRulerRef.current = false} >
                    {barStartTicks.slice(0, -1).map((tick, i) => {
                        const width = tickToPx(barStartTicks[i+1] - tick);
                        return (<div key={tick} className="border-l border-white/10 pl-1 h-full flex items-center" style={{ width }}>BAR {i + 1}</div>)
                    })}
                </div>

                <div className="absolute" style={{ top: RULER_HEIGHT, left: 0, width: totalWidth, height: totalHeight }}>
                    { showBpmAutomation ? (
                        <div className="relative w-full h-full bg-[#0f0f0f] border-t-2 border-amber-500/50" onMouseDown={(e) => handleBpmMouseDown(e)}>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                <div className="text-center text-slate-700"><h3 className="text-2xl font-bold">BPM Automation</h3><p>Click labels or points to edit values.</p><p>Drag points to change BPM.</p></div>
                            </div>
                            
                            <svg width="100%" height="100%" className="absolute inset-0 z-10 overflow-visible">
                                <defs><linearGradient id="bpmGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(251, 191, 36, 0.2)"/><stop offset="100%" stopColor="rgba(251, 191, 36, 0.0)" /></linearGradient></defs>
                                <path d={`M ${tempos.map(t => `${tickToPx(t.ticks)},${totalHeight - ((t.bpm - 20)/480 * totalHeight)}`).join(' L ')}`} stroke="#fbbf24" strokeWidth="2" fill="none" />
                                <path d={`M ${tickToPx(tempos[0].ticks)},${totalHeight} L ${tempos.map(t => `${tickToPx(t.ticks)},${totalHeight - ((t.bpm - 20)/480 * totalHeight)}`).join(' L ')} L ${tickToPx(tempos[tempos.length-1].ticks)},${totalHeight} Z`} fill="url(#bpmGradient)" />
                                
                                {tempos.map((tempo, i) => {
                                    const x = tickToPx(tempo.ticks);
                                    const y = totalHeight - ((tempo.bpm - 20)/480 * totalHeight);
                                    // Peningkatan offset label horizontal agar tidak tertutup sidebar
                                    const textX = x < 40 ? x + 45 : x;
                                    return (
                                        <g key={`text-${i}`}>
                                            <text 
                                                x={textX} 
                                                y={y - 12} 
                                                fill="#fbbf24" 
                                                fontSize="10" 
                                                textAnchor={x < 40 ? "start" : "middle"}
                                                className="cursor-pointer font-black"
                                                onClick={(e) => { e.stopPropagation(); setEditingTempoIndex(i); }}
                                            >
                                                {tempo.bpm.toFixed(2)}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>

                            {renderBpmInput()}

                            {tempos.map((tempo, i) => (
                                <div key={i} className="absolute w-3 h-3 bg-amber-400 rounded-full border-2 border-black cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-20 hover:scale-150 transition-transform"
                                    style={{ left: tickToPx(tempo.ticks), top: totalHeight - ((tempo.bpm - 20)/480 * totalHeight) }} 
                                    onMouseDown={(e) => handleBpmMouseDown(e, i)}
                                    onClick={(e) => { e.stopPropagation(); setEditingTempoIndex(i); }}
                                />
                            ))}

                             <div className="absolute top-0 bottom-0 z-40" style={{ left: tickToPx(cursorTick), pointerEvents: 'none' }}>
                                <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                                <div className="absolute -top-4 -translate-x-1/2 flex items-center justify-center gap-1.5 p-1 rounded-full bg-slate-900/50" style={{ pointerEvents: 'auto' }}>
                                    <button
                                        onClick={handleDeleteTempoPoint}
                                        disabled={!nearestTempoPoint || nearestTempoPoint.ticks === 0}
                                        className="w-5 h-5 rounded-full bg-slate-700 text-white font-black text-lg flex items-center justify-center leading-none disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-500"
                                        title="Remove nearest tempo point"
                                    >
                                        -
                                    </button>
                                    <div className="w-4 h-4 bg-amber-400 rotate-45 transform" />
                                    <button
                                        onClick={handleAddTempoPoint}
                                        disabled={tempos.some(t => t.ticks === cursorTick)}
                                        className="w-5 h-5 rounded-full bg-slate-700 text-white font-black text-lg flex items-center justify-center leading-none disabled:opacity-30 disabled:cursor-not-allowed hover:bg-green-500"
                                        title="Add tempo point at cursor"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="relative w-full h-full" onMouseDown={handleGridMouseDown}>
                                {Array.from({ length: 88 }).map((_, i) => (
                                    <div key={i} 
                                        className={`w-full border-b ${(108-i) % 12 === 0 ? 'border-slate-500/50' : 'border-slate-800'}`} 
                                        style={{ height: effectiveRowHeight }}
                                    ></div>
                                ))}
                                {barStartTicks.map((tick) => (<div key={tick} className="absolute top-0 bottom-0 border-l border-slate-600" style={{ left: tickToPx(tick) }}></div>))}
                                {notes.map(note => {
                                    const top = (108 - note.midi) * effectiveRowHeight, left = tickToPx(note.ticks), width = Math.max(2, tickToPx(note.durationTicks));
                                    const colorClass = note.hand === 'right' ? 'bg-violet-500 border-violet-300' : 'bg-blue-500 border-blue-300';
                                    const selectedClass = note.selected ? 'ring-2 ring-offset-2 ring-offset-black ring-yellow-400' : '';
                                    return (<div key={note.id} className={`absolute rounded-[2px] border opacity-80 hover:opacity-100 transition-opacity ${colorClass} ${selectedClass}`}
                                            style={{ top, left, width, height: effectiveRowHeight - 1, zIndex: note.selected ? 11 : 10 }} onMouseDown={(e) => handleNoteMouseDown(e, note)} />);
                                })}
                                {selectionBox && (<div className="absolute bg-cyan-500/20 border-2 border-cyan-400 pointer-events-none z-50" style={{ left: Math.min(selectionBox.startX, selectionBox.endX), top: Math.min(selectionBox.startY, selectionBox.endY), width: Math.abs(selectionBox.startX - selectionBox.endX), height: Math.abs(selectionBox.startY - selectionBox.endY) }}></div>)}
                            </div>
                            <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-40 pointer-events-none shadow-[0_0_10px_rgba(34,211,238,0.8)]" style={{ left: tickToPx(cursorTick) }}><div className="w-4 h-4 -ml-2 -mt-2 bg-cyan-400 rotate-45 transform"></div></div>
                        </>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* EDITOR SETTINGS MODAL */}
      {isSettingsOpen && (
          <div className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-[100] p-4 transition-opacity duration-300 ease-in-out ${isSettingsRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`} onClick={() => setIsSettingsOpen(false)}>
              <div className={`bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full ring-1 ring-slate-700 transform transition-all duration-300 ease-in-out ${isSettingsRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-cyan-400">Editor Settings</h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-bold text-slate-300 uppercase">Piano Volume</label>
                            <span className="text-cyan-400 font-mono text-sm">{Math.round(pianoVolume * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.05" value={pianoVolume} onChange={(e) => setPianoVolume(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg space-y-4 border border-slate-700">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-slate-300 uppercase">Backing Track</h4>
                            <input type="file" ref={mp3InputRef} onChange={handleBackingTrackUpload} accept="audio/mpeg" className="hidden" />
                            <button onClick={() => mp3InputRef.current?.click()} className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded font-bold transition-colors">Select File</button>
                        </div>
                        
                        {backingTrackUrl ? (
                            <>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs text-slate-400">Volume</label>
                                        <span className="text-cyan-400 font-mono text-xs">{Math.round(backingTrackVolume * 100)}%</span>
                                    </div>
                                    <input type="range" min="0" max="1" step="0.05" value={backingTrackVolume} onChange={(e) => setBackingTrackVolume(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs text-slate-400">Sync Offset</label>
                                        {isEditingOffset ? (
                                            <input
                                                autoFocus
                                                type="number"
                                                className="bg-slate-900 text-cyan-400 border border-cyan-500 rounded px-1 text-[10px] w-16 font-mono text-right"
                                                defaultValue={backingTrackOffset}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleOffsetSubmit(e.currentTarget.value); }}
                                                onBlur={(e) => handleOffsetSubmit(e.currentTarget.value)}
                                            />
                                        ) : (
                                            <span onClick={() => setIsEditingOffset(true)} className="text-cyan-400 font-mono text-xs cursor-pointer hover:text-white">{backingTrackOffset}ms</span>
                                        )}
                                    </div>
                                    <input type="range" min="-5000" max="5000" step="10" value={backingTrackOffset} onChange={(e) => setBackingTrackOffset(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                                    <p className="text-[10px] text-slate-500 mt-2">Adjust audio start relative to MIDI. Range: -5000ms to +5000ms.</p>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-slate-500 italic">No backing track loaded.</p>
                        )}
                    </div>
                </div>

                <button onClick={() => setIsSettingsOpen(false)} className="w-full mt-8 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg transition-colors">Close</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default MidiEditor;

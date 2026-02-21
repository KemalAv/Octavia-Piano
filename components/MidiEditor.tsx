import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Midi } from '@tonejs/midi';
import { PIANO_KEYS_CONFIG, DRUM_KEYS_CONFIG, DRUM_SOUND_MAP, DRUM_PRIMARY_MIDI_MAP } from '../constants';
import { TempoEvent, TimeSignatureInfo } from '../types';
import { guessKeySignature } from '../midiParser';

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
    { label: 'Triplet', multiplier: 2 / 3 },
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
    instrumentMode: 'piano' | 'drum';
}

const useHistory = <T,>(initialState: T) => {
    const [state, setStateInternal] = useState({
        history: [initialState],
        index: 0,
    });
    const { history, index } = state;

    const setState = useCallback((action: T | ((prevState: T) => T), overwrite = false) => {
        setStateInternal(prevState => {
            const { history: prevHistory, index: prevIndex } = prevState;
            const currentState = prevHistory[prevIndex];

            if (currentState === undefined) {
                console.error("useHistory: Attempted to set state, but current state is undefined. Aborting.");
                return prevState; // Return old state
            }

            const newState = typeof action === 'function' ? (action as (prevState: T) => T)(currentState) : action;

            if (newState === undefined) {
                console.error("useHistory: setState action produced an undefined new state. Aborting.");
                return prevState;
            }

            if (overwrite) {
                const newHistory = [...prevHistory];
                newHistory[prevIndex] = newState;
                return { history: newHistory, index: prevIndex };
            } else {
                const newHistory = prevHistory.slice(0, prevIndex + 1);
                newHistory.push(newState);
                return { history: newHistory, index: newHistory.length - 1 };
            }
        });
    }, []);

    const undo = useCallback(() => {
        setStateInternal(prevState => {
            if (prevState.index > 0) {
                return { ...prevState, index: prevState.index - 1 };
            }
            return prevState;
        });
    }, []);

    const redo = useCallback(() => {
        setStateInternal(prevState => {
            if (prevState.index < prevState.history.length - 1) {
                return { ...prevState, index: prevState.index + 1 };
            }
            return prevState;
        });
    }, []);

    return [history[index], setState, undo, redo, index > 0, index < history.length - 1] as const;
};


const MidiEditor: React.FC<MidiEditorProps> = ({ initialMidiFile, onClose, instrumentMode }) => {
    const [editorState, setEditorState, undo, redo, canUndo, canRedo] = useHistory<EditorState>({
        notes: [],
        tempos: [{ ticks: 0, bpm: 120 }],
        signatureEvents: [{ ticks: 0, timeSignature: [4, 4], keySignature: 'C' }],
    });

    const editorStateRef = useRef<EditorState>(editorState);
    useEffect(() => { editorStateRef.current = editorState; }, [editorState]);

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

    const [backingType, setBackingType] = useState<'none' | 'mp3' | 'online'>('none');
    const [backingTrackUrl, setBackingTrackUrl] = useState<string | null>(null);
    const [backingTrackOffset, setBackingTrackOffset] = useState(0);
    const [backingTrackVolume, setBackingTrackVolume] = useState(0.5);
    const [pianoVolume, setPianoVolume] = useState(0.5);
    const [isEditingOffset, setIsEditingOffset] = useState(false);
    const backingTrackRef = useRef<HTMLAudioElement>(null);
    const mp3InputRef = useRef<HTMLInputElement>(null);
    const audioPlayPromiseRef = useRef<Promise<void> | null>(null);
    const youtubePlayerRef = useRef<any>(null);
    const isYoutubeApiLoadedRef = useRef(false);
    const [backingTrackError, setBackingTrackError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const bufferCacheRef = useRef<Map<number, AudioBuffer>>(new Map());
    const activeAudioSources = useRef<Map<string, { source: AudioBufferSourceNode, gain: GainNode }>>(new Map());

    const gridContainerRef = useRef<HTMLDivElement>(null);
    const pianoSidebarRef = useRef<HTMLDivElement>(null);
    const playbackRequestRef = useRef<number | null>(null);
    const isDraggingRulerRef = useRef(false);
    const isPlayingRef = useRef(isPlaying);

    const nextNoteToScheduleIndexRef = useRef(0);

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
        const selectedNotes = editorState?.notes.filter(n => n.selected) || [];
        if (selectedNotes.length === 0) return;
        setClipboard(selectedNotes.map(n => ({ ...n, selected: false })));
    }, [editorState]);

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

        setEditorState(prev => {
            if (!prev) return prev;
            
            // Create a set of keys for pasted notes to identify overlaps
            const pastedKeys = new Set(pastedNotes.map(n => `${n.ticks}-${n.midi}`));
            
            // Filter out existing notes that would be exactly overlapped by pasted notes
            const existingNotes = prev.notes.filter(n => {
                const key = `${n.ticks}-${n.midi}`;
                return !pastedKeys.has(key);
            }).map(n => ({ ...n, selected: false }));

            const newNotes = [
                ...existingNotes,
                ...pastedNotes
            ];
            newNotes.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);
            return { ...prev, notes: newNotes };
        });
    }, [clipboard, cursorTick, setEditorState]);

    const keysConfig = useMemo(() => instrumentMode === 'drum' ? DRUM_KEYS_CONFIG : PIANO_KEYS_CONFIG, [instrumentMode]);

    const getNoteName = (midi: number) => keysConfig.find(k => k.midiNote === midi)?.name;

    const getAudioBuffer = useCallback(async (midi: number): Promise<AudioBuffer | null> => {
        if (bufferCacheRef.current.has(midi)) return bufferCacheRef.current.get(midi)!;
        if (!audioContextRef.current) return null;
        
        if (instrumentMode === 'drum') {
            const fileName = DRUM_SOUND_MAP[midi];
            if (!fileName) return null;
            try {
                const resp = await fetch(`/sounds/drum/${fileName}`);
                const ab = await resp.arrayBuffer();
                const buffer = await audioContextRef.current.decodeAudioData(ab);
                bufferCacheRef.current.set(midi, buffer);
                return buffer;
            } catch (e) {
                console.warn(`Could not load drum sound for ${fileName}.`);
                return null;
            }
        }

        const name = getNoteName(midi);
        if (!name) return null;
        try {
            const resp = await fetch(`/sounds/piano/${name}.mp3`);
            const ab = await resp.arrayBuffer();
            const buffer = await audioContextRef.current.decodeAudioData(ab);
            bufferCacheRef.current.set(midi, buffer);
            return buffer;
        } catch (e) {
            console.warn(`Could not load piano sound for ${name}.`);
            return null;
        }
    }, [instrumentMode]);

    const playNoteSound = useCallback(async (midi: number, velocity: number, durationSec: number, when: number) => {
        if (!audioContextRef.current || !masterGainRef.current) return;
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

        const buffer = await getAudioBuffer(midi);
        if (!buffer) return;

        const audioCtx = audioContextRef.current;
        const startTime = Math.max(audioCtx.currentTime, when);

        try {
            const source = audioCtx.createBufferSource(); source.buffer = buffer;
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(velocity, startTime);
            source.connect(gainNode); gainNode.connect(masterGainRef.current); source.start(startTime);
            const noteEndTime = startTime + durationSec;
            const releaseTimeSec = 0.3; // Shorter release tail
            gainNode.gain.setValueAtTime(velocity, noteEndTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + releaseTimeSec);
            source.stop(noteEndTime + releaseTimeSec + 0.01);
            return { source, gain: gainNode };
        } catch (e) {
            console.error("Error playing sound:", e);
            return null;
        }
    }, [getAudioBuffer]);

    const safePauseBackingTrack = useCallback(async () => {
        if (backingTrackRef.current) {
            if (audioPlayPromiseRef.current) {
                try { await audioPlayPromiseRef.current; } catch (e) { }
            }
            backingTrackRef.current.pause();
        }
    }, []);

    const stopPlayback = useCallback(async () => {
        if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current);
        playbackRequestRef.current = null;
        nextNoteToScheduleIndexRef.current = 0;
        activeAudioSources.current.forEach(({ source, gain }) => {
            try {
                const now = audioContextRef.current!.currentTime;
                gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(gain.gain.value, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1); source.stop(now + 0.1);
            } catch (e) { }
        });
        activeAudioSources.current.clear();
        await safePauseBackingTrack();
        safePauseYoutube();
        setIsPlaying(false);
    }, [safePauseBackingTrack]);

    useEffect(() => {
        return () => {
            stopPlayback();
        };
    }, [stopPlayback]);

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
                const hasSelection = editorState?.notes.some(n => n.selected);
                if (hasSelection) {
                    e.preventDefault();
                    setEditorState(prev => ({ ...prev, notes: prev.notes.filter(n => !n.selected) }));
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, handleCopy, handlePaste, editorState, setEditorState]);

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
                        let midiNote = n.midi;
                        if (instrumentMode === 'drum') {
                            // In drum mode, only include notes that are in the DRUM_SOUND_MAP
                            if (!DRUM_SOUND_MAP[midiNote]) return;
                            // Normalize to primary MIDI note for editor display
                            midiNote = DRUM_PRIMARY_MIDI_MAP[midiNote] || midiNote;
                        }
                        let hand: 'left' | 'right' = midi.tracks.length > 1 ? (i % 2 === 0 ? 'right' : 'left') : (midiNote < 60 ? 'left' : 'right');
                        newNotes.push({
                            id: Math.random().toString(36).substr(2, 9),
                            midi: midiNote, ticks: n.ticks, durationTicks: n.durationTicks,
                            velocity: n.velocity, hand, selected: false
                        });
                    });
                });

                const newSignatureEvents: SignatureEvent[] = [];
                midi.header.timeSignatures.forEach(ts => newSignatureEvents.push({ ticks: ts.ticks, timeSignature: ts.timeSignature as [number, number] }));
                midi.header.keySignatures.forEach(ks => {
                    const existing = newSignatureEvents.find(e => e.ticks === ks.ticks);
                    if (existing) existing.keySignature = ks.key;
                    else newSignatureEvents.push({ ticks: ks.ticks, keySignature: ks.key });
                });
                if (!newSignatureEvents.find(e => e.ticks === 0)) {
                    const detectedKey = guessKeySignature(newNotes.map(n => ({ midi: n.midi, durationMs: n.durationTicks })));
                    newSignatureEvents.unshift({ ticks: 0, timeSignature: [4, 4], keySignature: detectedKey });
                }

                newNotes.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);

                setEditorState({
                    notes: newNotes,
                    tempos: newTempos.sort((a, b) => a.ticks - b.ticks),
                    signatureEvents: newSignatureEvents.sort((a, b) => a.ticks - b.ticks)
                });

                if (audioContextRef.current) {
                    const uniqueMidiNotes = [...new Set(newNotes.map(n => n.midi))];
                    Promise.all(uniqueMidiNotes.map(midiVal => getAudioBuffer(midiVal)));
                }

            } catch (e) { console.error("Failed to load MIDI", e); alert("Could not load MIDI file."); }
        };
        loadMidi();

        return () => { 
            if (backingTrackUrl && backingTrackUrl.startsWith('blob:')) URL.revokeObjectURL(backingTrackUrl);
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        }
    }, [initialMidiFile, setEditorState, getAudioBuffer]);

    useEffect(() => {
        if (backingTrackRef.current) {
            backingTrackRef.current.volume = backingTrackVolume;
        }
        if (youtubePlayerRef.current && typeof youtubePlayerRef.current.setVolume === 'function') {
            try {
                youtubePlayerRef.current.setVolume(backingTrackVolume * 100);
            } catch (e) { console.warn("Failed to set YouTube volume", e); }
        }
    }, [backingTrackVolume]);

    // --- YouTube API Integration ---
    useEffect(() => {
        if (backingType === 'online' && backingTrackUrl && !youtubePlayerRef.current) {
            if (!(window as any).onYouTubeIframeAPIReady) {
                (window as any).onYouTubeIframeAPIReady = () => {
                    isYoutubeApiLoadedRef.current = true;
                    initializeYoutubePlayer(backingTrackUrl!);
                };
                const tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
            } else if (isYoutubeApiLoadedRef.current) {
                initializeYoutubePlayer(backingTrackUrl!);
            }
        }
        return () => {
            if (youtubePlayerRef.current) {
                try {
                    if (typeof youtubePlayerRef.current.destroy === 'function') {
                        youtubePlayerRef.current.destroy();
                    }
                } catch (e) { console.warn("Failed to destroy YouTube player", e); }
                youtubePlayerRef.current = null;
            }
        };
    }, [backingTrackUrl, backingType]);

    const initializeYoutubePlayer = (url: string) => {
        const videoId = getYoutubeId(url);
        if (!videoId) return;
        youtubePlayerRef.current = new (window as any).YT.Player('editor-youtube-player', {
            height: '0', width: '0', videoId: videoId,
            playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, showinfo: 0 },
            events: {
                onReady: () => { console.log('Editor YouTube Player Ready'); },
                onError: () => { setBackingTrackError("Failed to load YouTube audio."); }
            }
        });
    };

    const getYoutubeId = (url: string) => {
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
        if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
        return null;
    };

    const safePlayYoutube = () => {
        if (youtubePlayerRef.current && typeof youtubePlayerRef.current.playVideo === 'function') {
            youtubePlayerRef.current.playVideo();
        }
    };

    const safePauseYoutube = () => {
        if (youtubePlayerRef.current && typeof youtubePlayerRef.current.pauseVideo === 'function') {
            youtubePlayerRef.current.pauseVideo();
        }
    };
    // --- End YouTube API Integration ---

    useEffect(() => {
        if (masterGainRef.current) masterGainRef.current.gain.value = pianoVolume;
    }, [pianoVolume]);

    const getActiveTimeSignatureAtTick = useCallback((tick: number) => {
        return editorState?.signatureEvents.slice().reverse().find(e => e.ticks <= tick && e.timeSignature)?.timeSignature || [4, 4];
    }, [editorState]);

    const barStartTicks = useMemo(() => {
        const totalEditorTicks = Math.max(...(editorState?.notes.map(n => n.ticks + n.durationTicks) || [0]), TICKS_PER_QUARTER * 16);
        const bars = [0];
        let currentTick = 0;
        while (currentTick < totalEditorTicks) {
            const [num, den] = getActiveTimeSignatureAtTick(currentTick);
            const ticksPerBar = (TICKS_PER_QUARTER * num) * (4 / den);
            if (ticksPerBar <= 0) break;
            currentTick += ticksPerBar;
            bars.push(currentTick);
        }
        return bars;
    }, [editorState, getActiveTimeSignatureAtTick]);

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

    const sortedTempos = useMemo(() => [...(editorState?.tempos || [])].sort((a, b) => a.ticks - b.ticks), [editorState]);

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

    const ticksToMsRef = useRef(ticksToMs);
    useEffect(() => { ticksToMsRef.current = ticksToMs; }, [ticksToMs]);

    const msToTicksRef = useRef(msToTicks);
    useEffect(() => { msToTicksRef.current = msToTicks; }, [msToTicks]);

    const lastProcessedEditorStateRef = useRef<EditorState | null>(null);

    const togglePlay = useCallback(async () => {
        if (isPlaying) {
            await stopPlayback();
            return;
        }
        if (!audioContextRef.current || !editorState) return;
        const audioCtx = audioContextRef.current;
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        let startIndex = 0;
        for (let i = 0; i < editorState.notes.length; i++) {
            if (editorState.notes[i].ticks >= cursorTick) {
                startIndex = i;
                break;
            }
        }
        nextNoteToScheduleIndexRef.current = startIndex;

        const playbackStartAudioTime = audioCtx.currentTime;
        const playbackStartMs = ticksToMs(cursorTick);

        // Sync the last processed state to prevent immediate re-sync in the animation loop
        // which could cause the first few milliseconds of notes to be skipped due to frame delay.
        if (editorState) {
            lastProcessedEditorStateRef.current = editorState;
        }

        if (backingTrackUrl && (backingType === 'mp3' || backingType === 'online')) {
            const offsetSeconds = backingTrackOffset / 1000;
            const midiStartSeconds = ticksToMs(cursorTick) / 1000;
            const audioStartTime = midiStartSeconds + offsetSeconds;

            if (backingType === 'mp3' && backingTrackRef.current) {
                const audio = backingTrackRef.current;
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
            } else if (backingType === 'online' && youtubePlayerRef.current) {
                const videoId = getYoutubeId(backingTrackUrl);
                const isYoutube = !!videoId;
                if (isYoutube) {
                    safePauseYoutube();
                    if (audioStartTime >= 0) {
                        youtubePlayerRef.current.seekTo(audioStartTime, true);
                        safePlayYoutube();
                    } else {
                        setTimeout(() => {
                            if (isPlayingRef.current) {
                                youtubePlayerRef.current.seekTo(0, true);
                                safePlayYoutube();
                            }
                        }, -audioStartTime * 1000);
                    }
                } else {
                    // Fallback for non-youtube online links (using audio element)
                    const audio = backingTrackRef.current;
                    if (audio) {
                        await safePauseBackingTrack();
                        audio.src = backingTrackUrl;
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
                }
            }
        }

        const animationStartTime = performance.now();
        const totalDurationTicks = Math.max(...editorState.notes.map(n => n.ticks + n.durationTicks), 0);

        const animate = () => {
            if (!isPlayingRef.current || !audioContextRef.current || !editorStateRef.current) return;

            const currentEditorState = editorStateRef.current;
            
            // Detect state change and re-sync index if needed
            if (currentEditorState !== lastProcessedEditorStateRef.current) {
                const audioNow = audioContextRef.current.currentTime;
                const currentPlaybackTimeMs = (audioNow - playbackStartAudioTime) * 1000 + playbackStartMs;
                
                // Recalculate index based on current time
                let newIndex = 0;
                // Use the ref's ticksToMs to ensure we use the latest tempo map
                // Note: We need to ensure ticksToMsRef is available and up to date
                // For now, we can approximate or just scan ticks if we assume ticksToMs is monotonic
                
                // Better approach: Find the first note whose time is >= currentPlaybackTimeMs
                // We can use the current ticksToMs function (which should be fresh if togglePlay recreated)
                // But if animate is from old closure, ticksToMs is old.
                // Let's rely on ticksToMsRef.
                
                const safeTicksToMs = ticksToMsRef.current;
                
                while (newIndex < currentEditorState.notes.length) {
                    const noteTime = safeTicksToMs(currentEditorState.notes[newIndex].ticks);
                    if (noteTime >= currentPlaybackTimeMs) break;
                    newIndex++;
                }
                nextNoteToScheduleIndexRef.current = newIndex;
                lastProcessedEditorStateRef.current = currentEditorState;
            }

            const audioNow = audioContextRef.current.currentTime;
            const lookaheadMs = 200.0;
            const scheduleUntilAudioTime = audioNow + (lookaheadMs / 1000);
            const safeTicksToMs = ticksToMsRef.current;

            let currentIndex = nextNoteToScheduleIndexRef.current;
            while (currentIndex < currentEditorState.notes.length) {
                const note = currentEditorState.notes[currentIndex];
                const noteStartMs = safeTicksToMs(note.ticks);
                const noteScheduledStartAudioTime = playbackStartAudioTime + (noteStartMs - playbackStartMs) / 1000;

                if (noteScheduledStartAudioTime < scheduleUntilAudioTime) {
                    // Only play if it's in the future or very recent past (to avoid catch-up bursts)
                    // If it's more than 100ms in the past, skip it (it's a catch-up)
                    if (noteScheduledStartAudioTime > audioNow - 0.1) {
                         const durationMs = safeTicksToMs(note.ticks + note.durationTicks) - noteStartMs;
                        if (durationMs > 0) {
                            playNoteSound(note.midi, note.velocity, durationMs / 1000, noteScheduledStartAudioTime).then(res => {
                                if (res && isPlayingRef.current) {
                                    activeAudioSources.current.set(note.id, res);
                                }
                            });
                        }
                    }
                   
                    nextNoteToScheduleIndexRef.current = currentIndex + 1;
                } else {
                    break;
                }
                currentIndex++;
            }

            const elapsedMs = performance.now() - animationStartTime;
            const newCursorTick = msToTicksRef.current(playbackStartMs + elapsedMs);
            setCursorTick(newCursorTick);

            const totalDurationTicks = Math.max(...currentEditorState.notes.map(n => n.ticks + n.durationTicks), 0);

            if (newCursorTick >= totalDurationTicks) {
                stopPlayback();
                setCursorTick(totalDurationTicks);
                if (backingTrackRef.current) backingTrackRef.current.currentTime = 0;
            } else {
                playbackRequestRef.current = requestAnimationFrame(animate);
            }
        };

        playbackRequestRef.current = requestAnimationFrame(animate);
        setIsPlaying(true);
    }, [isPlaying, stopPlayback, editorState, cursorTick, ticksToMs, msToTicks, playNoteSound, backingTrackUrl, backingTrackOffset, backingTrackVolume, safePauseBackingTrack, safePlayBackingTrack]);

    const snapTick = (tick: number) => { const s = snapTicks; return Math.round(tick / s) * s; };
    const effectiveRowHeight = BASE_ROW_HEIGHT * vZoom;
    const totalTicks = useMemo(() => Math.max(...(editorState?.notes.map(n => n.ticks + n.durationTicks) || [0]), TICKS_PER_QUARTER * 16), [editorState]);
    const totalWidth = tickToPx(totalTicks);
    const totalHeight = keysConfig.length * effectiveRowHeight;

    const pxToMidi = (y: number) => {
        const index = Math.floor(y / effectiveRowHeight);
        const reversedKeys = keysConfig.slice().reverse();
        if (index >= 0 && index < reversedKeys.length) {
            return reversedKeys[index].midiNote;
        }
        return -1;
    };

    const midiToY = (midi: number) => {
        const normalizedMidi = instrumentMode === 'drum' ? (DRUM_PRIMARY_MIDI_MAP[midi] || midi) : midi;
        const reversedKeys = keysConfig.slice().reverse();
        const index = reversedKeys.findIndex(k => k.midiNote === normalizedMidi);
        return index !== -1 ? index * effectiveRowHeight : -1;
    };

    const handleMouseDownShared = (action: () => void) => {
        isDraggingRef.current = true;
        action();
    };

    const handleMouseUpShared = () => {
        isDraggingRef.current = false;
        setDragInfo(null);
    };

    const handleGridMouseDown = (e: React.MouseEvent) => {
        const scrollContainer = gridContainerRef.current;
        if (!scrollContainer || !editorState) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const absoluteX = e.clientX - containerRect.left + scrollContainer.scrollLeft;
        const absoluteY = e.clientY - containerRect.top + scrollContainer.scrollTop;

        // The note grid is offset by the ruler's height inside the scrollable content
        const gridY = absoluteY - RULER_HEIGHT;

        // Check if click was on the ruler part (which has its own handler) and ignore.
        if (gridY < 0) return;

        if (activeTool === 'draw') {
            handleMouseDownShared(() => {
                const tick = snapTick(pxToTick(absoluteX));
                const midi = pxToMidi(gridY);
                if (midi === -1) return;
                const newNote: EditorNote = { id: Math.random().toString(36).substr(2, 9), midi, ticks: tick, durationTicks: snapTicks, velocity: 0.8, hand: activeHand, selected: false };

                setEditorState(prev => {
                    if (!prev) return prev;
                    const newNotes = [...prev.notes.map(n => ({ ...n, selected: false })), newNote];
                    newNotes.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);
                    return { ...prev, notes: newNotes };
                });

                playNoteSound(midi, 0.8, 0.25, audioContextRef.current!.currentTime);
            });
        } else if (activeTool === 'select') {
            handleMouseDownShared(() => {
                if (!e.shiftKey) {
                    setEditorState(prev => {
                        if (!prev) return prev;
                        return { ...prev, notes: prev.notes.map(n => ({ ...n, selected: false })) }
                    }, true); // Use overwrite=true for better performance during selection
                }
                setSelectionBox({ startX: absoluteX, startY: gridY, endX: absoluteX, endY: gridY });
            });
        }
    };

    const handleNoteMouseDown = (e: React.MouseEvent, note: EditorNote) => {
        e.stopPropagation();
        if (!editorState) return;

        if (activeTool === 'delete') {
            setEditorState(prev => {
                if (!prev) return prev;
                return { ...prev, notes: prev.notes.filter(n => n.id !== note.id) }
            });
        } else if (activeTool === 'select') {
            handleMouseDownShared(() => {
                let targetNotes: EditorNote[] = [];
                if (note.selected) {
                    targetNotes = editorState.notes.filter(n => n.selected);
                } else {
                    if (e.shiftKey) {
                        targetNotes = editorState.notes.filter(n => n.selected || n.id === note.id);
                    } else {
                        targetNotes = [note];
                    }
                }

                const newSelectedNotesMap = new Map<string, { ticks: number, midi: number }>();
                let minOriginalTick = Infinity;
                setEditorState(prev => {
                    if (!prev) return prev;
                    const newNotes = prev.notes.map(n => {
                        const isPartOfNewSelection = targetNotes.some(tn => tn.id === n.id);
                        if (isPartOfNewSelection) {
                            newSelectedNotesMap.set(n.id, { ticks: n.ticks, midi: n.midi });
                            if (n.ticks < minOriginalTick) minOriginalTick = n.ticks;
                        }
                        return { ...n, selected: isPartOfNewSelection };
                    });
                    return { ...prev, notes: newNotes };
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
            playNoteSound(note.midi, note.velocity, ticksToMs(note.durationTicks) / 1000, audioContextRef.current!.currentTime);
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
                setDragInfo({ type: 'tempo', tempoIndex: index, initialBpm: editorState?.tempos[index].bpm, startX: e.clientX, startY: e.clientY });
            } else {
                const y = e.clientY - rect.top;
                const bpm = 500 - (y / laneEl.clientHeight) * 480;
                setEditorState(prev => ({ ...prev, tempos: [...prev.tempos, { ticks: snapTick(tick), bpm: Math.round(Math.max(20, bpm)) }].sort((a, b) => a.ticks - b.ticks) }));
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
                    const rowDelta = Math.round(dy / effectiveRowHeight);

                    const proposedMinTick = dragInfo.minOriginalTick + rawTickDelta;
                    const snappedMinTick = snapTick(proposedMinTick);
                    const snappedTickDelta = snappedMinTick - dragInfo.minOriginalTick;

                    setEditorState(prev => ({
                        ...prev, notes: prev.notes.map(n => {
                            const initial = dragInfo.initialNotes!.get(n.id);
                            if (initial) {
                                const reversedKeys = keysConfig.slice().reverse();
                                const initialKeyIndex = reversedKeys.findIndex(k => k.midiNote === initial.midi);
                                if (initialKeyIndex === -1) return n;
                                const newKeyIndex = Math.max(0, Math.min(reversedKeys.length - 1, initialKeyIndex + rowDelta));
                                return { ...n, ticks: Math.max(0, initial.ticks + snappedTickDelta), midi: reversedKeys[newKeyIndex].midiNote };
                            }
                            return n;
                        })
                    }), true);
                } else if (dragInfo.type === 'tempo' && dragInfo.tempoIndex !== undefined) {
                    const dy = e.clientY - dragInfo.startY;
                    const bpmDelta = (dy / (gridContainerRef.current?.clientHeight ?? totalHeight)) * 480;
                    setEditorState(prev => {
                        const newTempos = [...prev.tempos];
                        const rawNewBpm = Math.max(20, Math.min(500, dragInfo.initialBpm! - bpmDelta));
                        const newBpm = Math.round(rawNewBpm * 4) / 4;
                        newTempos[dragInfo.tempoIndex!].bpm = newBpm;
                        return { ...prev, tempos: newTempos };
                    }, true);
                }
            } else if (selectionBox && isDraggingRef.current && gridContainerRef.current) {
                const scrollContainer = gridContainerRef.current;
                const rect = scrollContainer.getBoundingClientRect();
                const x = e.clientX - rect.left + scrollContainer.scrollLeft;
                const y = e.clientY - rect.top + scrollContainer.scrollTop - RULER_HEIGHT;
                setSelectionBox(prev => prev ? { ...prev, endX: x, endY: Math.max(0, y) } : null);
            }
        };

        const handleMouseUp = async (e: MouseEvent) => {
            if (isDraggingRulerRef.current && (backingTrackUrl || backingTrackRef.current)) {
                const offsetSeconds = backingTrackOffset / 1000;
                const midiStartSeconds = ticksToMs(cursorTick) / 1000;
                const audioStartTime = Math.max(0, midiStartSeconds + offsetSeconds);

                if (backingType === 'mp3' && backingTrackRef.current) {
                    backingTrackRef.current.currentTime = audioStartTime;
                } else if (backingType === 'online') {
                    if (youtubePlayerRef.current) {
                        youtubePlayerRef.current.seekTo(audioStartTime, true);
                    } else if (backingTrackRef.current) {
                        backingTrackRef.current.currentTime = audioStartTime;
                    }
                }
            }
            isDraggingRulerRef.current = false;

            if (selectionBox && gridContainerRef.current && editorState) {
                const x1 = Math.min(selectionBox.startX, selectionBox.endX), x2 = Math.max(selectionBox.startX, selectionBox.endX);
                const y1 = Math.min(selectionBox.startY, selectionBox.endY), y2 = Math.max(selectionBox.startY, selectionBox.endY);
                const startTick = pxToTick(x1), endTick = pxToTick(x2);
                
                const startMidi = pxToMidi(y2);
                const endMidi = pxToMidi(y1);

                setEditorState(prev => ({
                    ...prev, notes: prev.notes.map(n => {
                        const noteStartTick = n.ticks, noteEndTick = n.ticks + n.durationTicks, noteMidi = n.midi;
                        const isHorizontallyIn = noteStartTick < endTick && noteEndTick > startTick;
                        
                        // Vertical selection is tricky with non-sequential MIDI notes
                        const reversedKeys = keysConfig.slice().reverse();
                        const noteIndex = reversedKeys.findIndex(k => k.midiNote === noteMidi);
                        const startIndex = reversedKeys.findIndex(k => k.midiNote === startMidi);
                        const endIndex = reversedKeys.findIndex(k => k.midiNote === endMidi);
                        
                        const isVerticallyIn = noteIndex !== -1 && startIndex !== -1 && endIndex !== -1 && 
                                             noteIndex >= endIndex && noteIndex <= startIndex;

                        return { ...n, selected: (isHorizontallyIn && isVerticallyIn) || (e.shiftKey && n.selected) };
                    })
                }));
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
    }, [dragInfo, selectionBox, snapTick, pxToTick, effectiveRowHeight, backingTrackOffset, backingTrackUrl, cursorTick, ticksToMs, setEditorState, editorState]);

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
            if (!prev) return prev;
            const newEvents = [...prev.signatureEvents];
            let eventForBar = newEvents.find(e => e.ticks === barStartTick);
            if (!eventForBar) {
                eventForBar = { ticks: barStartTick };
                newEvents.push(eventForBar);
            }
            if (type === 'key') {
                eventForBar.keySignature = value;
            } else {
                const parts = value.split('/').map(Number);
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
                    eventForBar.timeSignature = [parts[0], parts[1]];
                }
            }
            return { ...prev, signatureEvents: newEvents.sort((a, b) => a.ticks - b.ticks) };
        });
    };

    const handleExport = () => {
        if (!editorState) return;
        const midi = new Midi();
        editorState.tempos.forEach((t) => midi.header.tempos.push({ ticks: t.ticks, bpm: t.bpm }));
        editorState.signatureEvents.forEach(e => {
            if (e.timeSignature) midi.header.timeSignatures.push({ ticks: e.ticks, timeSignature: e.timeSignature as [number, number] });
            if (e.keySignature) {
                const isMinor = e.keySignature.endsWith('m');
                const key = isMinor ? e.keySignature.slice(0, -1) : e.keySignature;
                const scale = isMinor ? 'minor' : 'major';
                midi.header.keySignatures.push({ ticks: e.ticks, key, scale });
            }
        });
        const rightTrack = midi.addTrack(); rightTrack.name = "Right Hand";
        const leftTrack = midi.addTrack(); leftTrack.name = "Left Hand";
        editorState.notes.forEach(note => {
            const track = note.hand === 'right' ? rightTrack : leftTrack;
            track.addNote({ midi: note.midi, ticks: note.ticks, durationTicks: note.durationTicks, velocity: note.velocity });
        });

        const rawArray = midi.toArray();
        // FIX: @tonejs/midi incorrectly adds +7 to the key signature index.
        // The expected value is between -7 and 7. The bug makes it between 0 and 14 for flats to naturals,
        // and 14 to 21 for sharps. We must fix this in the raw array manually.
        for (let i = 0; i < rawArray.length - 4; i++) {
            if (rawArray[i] === 0xFF && rawArray[i + 1] === 0x59 && rawArray[i + 2] === 0x02) {
                const wrongKey = rawArray[i + 3];
                // Check if it's within the likely buggy range (0 to 21 corresponds to -7 to +7 offsets)
                if (wrongKey >= 0 && wrongKey <= 21) {
                    // Correct key: correctByte = wrongKey - 14. Convert to unsigned 8-bit.
                    const correctByte = wrongKey < 14 ? 256 + (wrongKey - 14) : wrongKey - 14;
                    rawArray[i + 3] = correctByte;
                }
            }
        }

        const blob = new Blob([rawArray as any], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `octavia_edit_${Date.now()}.mid`; a.click();
        URL.revokeObjectURL(url);
    };

    const handleBackingTrackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (backingTrackUrl && backingTrackUrl.startsWith('blob:')) URL.revokeObjectURL(backingTrackUrl);
            setBackingTrackUrl(URL.createObjectURL(file));
            setBackingType('mp3');
        }
    };

    const handleOnlineUrlSubmit = (url: string) => {
        if (url) {
            if (backingTrackUrl && backingTrackUrl.startsWith('blob:')) URL.revokeObjectURL(backingTrackUrl);
            setBackingTrackUrl(url);
            setBackingType('online');
        }
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
        const keyEvent = [...(editorState?.signatureEvents || [])].reverse().find(e => e.ticks <= barStart && e.keySignature);
        const timeEvent = [...(editorState?.signatureEvents || [])].reverse().find(e => e.ticks <= barStart && e.timeSignature);
        return {
            key: keyEvent?.keySignature || 'C',
            time: timeEvent?.timeSignature ? `${timeEvent.timeSignature[0]}/${timeEvent.timeSignature[1]}` : '4/4'
        };
    }, [editorState, getCurrentBarStartTick]);

    const getBpmAtTick = useCallback((tick: number) => {
        const precedingTempo = [...(editorState?.tempos || [])].reverse().find(t => t.ticks <= tick);
        return precedingTempo ? precedingTempo.bpm : 120;
    }, [editorState]);

    const handleAddTempoPoint = useCallback(() => {
        if (editorState?.tempos.some(t => t.ticks === cursorTick)) return;
        const bpmAtCursor = getBpmAtTick(cursorTick);
        setEditorState(prev => ({
            ...prev,
            tempos: [...prev.tempos, { ticks: snapTick(cursorTick), bpm: Math.max(20, bpmAtCursor) }].sort((a, b) => a.ticks - b.ticks)
        }));
    }, [cursorTick, editorState, setEditorState, getBpmAtTick, snapTick]);

    const nearestTempoPoint = useMemo(() => {
        if (!showBpmAutomation || !editorState) return null;
        let closestPoint: EditorTempo | null = null;
        let minDistance = Infinity;

        editorState.tempos.forEach(t => {
            const distance = Math.abs(tickToPx(t.ticks) - tickToPx(cursorTick));
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = t;
            }
        });
        if (minDistance < 8) return closestPoint;
        return null;
    }, [cursorTick, editorState, showBpmAutomation, tickToPx]);

    const handleDeleteTempoPoint = useCallback(() => {
        if (!nearestTempoPoint || nearestTempoPoint.ticks === 0) return;
        setEditorState(prev => ({
            ...prev,
            tempos: prev.tempos.filter(t => t.ticks !== nearestTempoPoint.ticks)
        }));
    }, [nearestTempoPoint, setEditorState]);

    const handleTempoLabelSubmit = useCallback((index: number, value: string) => {
        const newBpm = Math.max(20, Math.min(500, parseFloat(value) || 120));
        setEditorState(prev => {
            const newTempos = [...prev.tempos];
            if (newTempos[index]) {
                newTempos[index].bpm = Math.round(newBpm * 4) / 4;
            }
            return { ...prev, tempos: newTempos };
        });
        setEditingTempoIndex(null);
    }, [setEditorState]);

    const bpmMarkers = useMemo(() => {
        return [500, 400, 300, 200, 100, 20];
    }, []);

    const handleFitToScreen = useCallback(() => {
        if (!gridContainerRef.current) return;
        const containerWidth = gridContainerRef.current.clientWidth - 60; // Subtract sidebar width
        const containerHeight = gridContainerRef.current.clientHeight - RULER_HEIGHT;

        // Calculate time zoom (horizontal)
        // totalTicks * 0.2 * zoom = containerWidth
        // zoom = containerWidth / (totalTicks * 0.2)
        const minTicks = TICKS_PER_QUARTER * 16; // Minimum 4 bars
        const effectiveTotalTicks = Math.max(totalTicks, minTicks);
        const newZoom = Math.max(0.1, Math.min(5, containerWidth / (effectiveTotalTicks * 0.2)));
        
        // Calculate pitch zoom (vertical)
        // 88 * BASE_ROW_HEIGHT * vZoom = containerHeight
        // vZoom = containerHeight / (88 * BASE_ROW_HEIGHT)
        const newVZoom = Math.max(0.2, Math.min(3, containerHeight / (88 * BASE_ROW_HEIGHT)));

        setZoom(newZoom);
        setVZoom(newVZoom);
    }, [totalTicks]);

    const hasInitiallyFitRef = useRef(false);

    useEffect(() => {
        if (editorState && !hasInitiallyFitRef.current) {
            // Small delay to ensure DOM is rendered before calculating dimensions
            const timeoutId = setTimeout(() => {
                handleFitToScreen();
                hasInitiallyFitRef.current = true;
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [editorState, handleFitToScreen]);

    if (!editorState) {
        return <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center text-white">Loading Editor...</div>;
    }
    const { notes, tempos, signatureEvents } = editorState;

    const renderBpmInput = () => {
        if (editingTempoIndex === null) return null;
        const tempo = tempos[editingTempoIndex];
        if (!tempo) return null;

        const x = tickToPx(tempo.ticks);
        const y = totalHeight - ((tempo.bpm - 20) / 480 * totalHeight);

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
            {backingType === 'mp3' && backingTrackUrl && <audio ref={backingTrackRef} src={backingTrackUrl} />}
            {backingType === 'online' && <div id="editor-youtube-player" style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} />}
            {backingType === 'online' && backingTrackUrl && !getYoutubeId(backingTrackUrl) && <audio ref={backingTrackRef} src={backingTrackUrl} />}

            {/* HEADER */}
            <div className="h-16 bg-slate-900 border-b border-white/10 flex items-center px-4 justify-between gap-4 shadow-xl z-50 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-cyan-400 mr-2 tracking-tighter italic">MIDI EDITOR</h2>
                    <button onClick={togglePlay} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-amber-500 scale-110' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20 shadow-lg'}`}>
                        {isPlaying ? <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg> : <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
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
                    <div className="flex items-center gap-1">
                        <button onClick={() => setActiveHand('right')} className={`px-2 py-1 rounded text-xs font-bold transition-colors ${activeHand === 'right' ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>Right Hand</button>
                        <button onClick={() => setActiveHand('left')} className={`px-2 py-1 rounded text-xs font-bold transition-colors ${activeHand === 'left' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>Left Hand</button>
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
                                {type === 'Key' ?
                                    <select value={currentBarSignatures.key} onChange={e => handleSignatureChange('key', e.target.value)} className="bg-transparent text-xs font-black text-white outline-none cursor-pointer w-12">{KEY_SIGNATURES.map(k => (<option key={k} value={k} className="bg-slate-900">{k}</option>))}</select> :
                                    <input key={`time-sig-${currentBarSignatures.time}-${getCurrentBarStartTick()}`} type="text" defaultValue={currentBarSignatures.time} onBlur={e => handleSignatureChange('time', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSignatureChange('time', e.currentTarget.value); }} className="bg-transparent text-xs font-black text-white outline-none w-12" placeholder="4/4" />
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
                        <button 
                            onClick={handleFitToScreen} 
                            className="ml-2 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-300 transition-colors"
                            title="Fit to Screen"
                        >
                            FIT
                        </button>
                        <button 
                            onClick={() => { setZoom(1); setVZoom(1); }} 
                            className="ml-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-300 transition-colors"
                            title="Reset to 100%"
                        >
                            100%
                        </button>
                    </div>

                    <div className="h-6 w-px bg-white/10"></div>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300" title="Editor Settings">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </button>
                </div>
            </div>

            <div className="flex-grow flex flex-row overflow-hidden relative">
                {/* PIANO SIDEBAR / BPM SIDEBAR */}
                <div
                    ref={pianoSidebarRef}
                    className="flex-shrink-0 w-[60px] bg-[#121212] border-r border-white/10 overflow-hidden pointer-events-none"
                >
                    <div style={{ height: RULER_HEIGHT }} className="bg-[#151515] border-b border-white/10"></div>
                    <div className="relative" style={{ height: totalHeight }}>
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
                            /* INSTRUMENT KEY SIDEBAR */
                            keysConfig.slice().reverse().map((key) => {
                                const midi = key.midiNote;
                                const isBlack = instrumentMode === 'piano' && [1, 3, 6, 8, 10].includes(midi % 12);
                                const isC = instrumentMode === 'piano' && midi % 12 === 0;
                                return (
                                    <div key={midi}
                                        className={`border-b text-[9px] flex items-center justify-center cursor-default transition-colors ${isBlack ? 'bg-black text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-300'} ${isC ? 'border-b-slate-500' : ''}`}
                                        style={{ height: effectiveRowHeight }} >
                                        {instrumentMode === 'drum' ? (
                                            <span className="font-bold text-[8px] text-center px-1">{key.displayName}</span>
                                        ) : (
                                            isC && <span className="font-black">C{Math.floor(midi / 12) - 1}</span>
                                        )}
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
                        <div className="sticky top-0 z-30 bg-[#151515] border-b border-white/10 flex text-[10px] text-slate-500 cursor-crosshair" style={{ height: RULER_HEIGHT, width: '100%' }}
                            onMouseDown={e => { isDraggingRulerRef.current = true; handleRulerInteraction(e); }} onMouseMove={e => isDraggingRulerRef.current && handleRulerInteraction(e)}
                            onMouseUp={() => isDraggingRulerRef.current = false} onMouseLeave={() => isDraggingRulerRef.current = false} >
                            {barStartTicks.slice(0, -1).map((tick, i) => {
                                const width = tickToPx(barStartTicks[i + 1] - tick);
                                return (<div key={tick} className="border-l border-white/10 pl-1 h-full flex items-center" style={{ width }}>BAR {i + 1}</div>)
                            })}
                        </div>

                        <div className="absolute" style={{ top: RULER_HEIGHT, left: 0, width: totalWidth, height: totalHeight }}>
                            {showBpmAutomation ? (
                                <div className="relative w-full h-full bg-[#0f0f0f] border-t-2 border-amber-500/50" onMouseDown={(e) => handleBpmMouseDown(e)}>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                        <div className="text-center text-slate-700"><h3 className="text-2xl font-bold">BPM Automation</h3><p>Click labels or points to edit values.</p><p>Drag points to change BPM.</p></div>
                                    </div>

                                    <svg width="100%" height="100%" className="absolute inset-0 z-10 overflow-visible">
                                        <defs><linearGradient id="bpmGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(251, 191, 36, 0.2)" /><stop offset="100%" stopColor="rgba(251, 191, 36, 0.0)" /></linearGradient></defs>
                                        <path d={`M ${tempos.map(t => `${tickToPx(t.ticks)},${totalHeight - ((t.bpm - 20) / 480 * totalHeight)}`).join(' L ')}`} stroke="#fbbf24" strokeWidth="2" fill="none" />
                                        <path d={`M ${tickToPx(tempos[0].ticks)},${totalHeight} L ${tempos.map(t => `${tickToPx(t.ticks)},${totalHeight - ((t.bpm - 20) / 480 * totalHeight)}`).join(' L ')} L ${tickToPx(tempos[tempos.length - 1].ticks)},${totalHeight} Z`} fill="url(#bpmGradient)" />

                                        {tempos.map((tempo, i) => {
                                            const x = tickToPx(tempo.ticks);
                                            const y = totalHeight - ((tempo.bpm - 20) / 480 * totalHeight);
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
                                            style={{ left: tickToPx(tempo.ticks), top: totalHeight - ((tempo.bpm - 20) / 480 * totalHeight) }}
                                            onMouseDown={(e) => handleBpmMouseDown(e, i)}
                                            onClick={(e) => { e.stopPropagation(); setEditingTempoIndex(i); }}
                                        />
                                    ))}

                                    <div className="absolute top-0 bottom-0 z-40" style={{ left: tickToPx(cursorTick), pointerEvents: 'none' }}>
                                        <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                                        <div className="absolute -top-4 -translate-x-1/2 flex items-center justify-center gap-1.5 p-1 rounded-full bg-slate-900/50" style={{ pointerEvents: 'auto' }}>
                                            <button
                                                onMouseDown={(e) => { e.stopPropagation(); handleDeleteTempoPoint(); }}
                                                disabled={!nearestTempoPoint || nearestTempoPoint.ticks === 0}
                                                className="w-5 h-5 rounded-full bg-slate-700 text-white font-black text-lg flex items-center justify-center leading-none disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-500"
                                                title="Remove nearest tempo point"
                                            >
                                                -
                                            </button>
                                            <div className="w-4 h-4 bg-amber-400 rotate-45 transform" />
                                            <button
                                                onMouseDown={(e) => { e.stopPropagation(); handleAddTempoPoint(); }}
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
                                        {keysConfig.slice().reverse().map((key) => (
                                            <div key={key.midiNote}
                                                className={`w-full border-b ${instrumentMode === 'piano' && key.midiNote % 12 === 0 ? 'border-slate-500/50' : 'border-slate-800'}`}
                                                style={{ height: effectiveRowHeight }}
                                            ></div>
                                        ))}
                                        {barStartTicks.map((tick) => (<div key={tick} className="absolute top-0 bottom-0 border-l border-slate-600" style={{ left: tickToPx(tick) }}></div>))}
                                        {notes.map(note => {
                                            const top = midiToY(note.midi);
                                            if (top === -1) return null;
                                            const left = tickToPx(note.ticks), width = Math.max(2, tickToPx(note.durationTicks));
                                            const colorClass = note.hand === 'right' ? 'bg-violet-500 border-violet-300' : 'bg-blue-500 border-blue-300';
                                            const selectedClass = note.selected ? 'ring-2 ring-offset-2 ring-offset-black ring-yellow-400' : '';
                                            return (
                                                <div key={note.id} className={`absolute rounded-[2px] border opacity-80 hover:opacity-100 transition-opacity ${colorClass} ${selectedClass} flex items-center justify-center overflow-hidden`}
                                                    style={{ top, left, width, height: effectiveRowHeight - 1, zIndex: note.selected ? 11 : 10 }} onMouseDown={(e) => handleNoteMouseDown(e, note)}>
                                                    <span className="text-[9px] font-black pointer-events-none select-none text-white/90 truncate px-0.5">
                                                        {getNoteName(note.midi)}
                                                    </span>
                                                </div>
                                            );
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

                            <div className="flex justify-between gap-4 mt-6">
                                <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-xs font-black shadow-lg transition-transform active:scale-95 flex-1">EXPORT</button>
                                <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-xs font-black transition-colors flex-1">EXIT</button>
                            </div>

                            <div className="bg-slate-900/50 p-4 rounded-lg space-y-4 border border-slate-700">
                                <div className="flex flex-col gap-3">
                                    <h4 className="text-sm font-bold text-slate-300 uppercase">Backing Track</h4>
                                    <div className="flex gap-2 p-1 bg-slate-800 rounded-lg">
                                        {(['none', 'mp3', 'online'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    setBackingType(type);
                                                    if (type === 'none') {
                                                        if (backingTrackUrl && backingTrackUrl.startsWith('blob:')) URL.revokeObjectURL(backingTrackUrl);
                                                        setBackingTrackUrl(null);
                                                    }
                                                }}
                                                className={`flex-1 py-1.5 text-[10px] font-black rounded uppercase transition ${backingType === type ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {backingType !== 'none' && (
                                    <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded text-[10px] text-amber-200 leading-tight">
                                        <p className="font-bold flex items-center gap-1 mb-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                            IMPORTANT:
                                        </p>
                                        Please refresh the browser if the YouTube/MP3 audio does not appear when switching between the Game and the Editor.
                                    </div>
                                )}

                                {backingType === 'mp3' && (
                                    <div className="flex flex-col gap-2">
                                        <input type="file" ref={mp3InputRef} onChange={handleBackingTrackUpload} accept="audio/mpeg" className="hidden" />
                                        <button onClick={() => mp3InputRef.current?.click()} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded border border-slate-600 transition-colors font-bold">
                                            {backingTrackUrl && backingTrackUrl.startsWith('blob:') ? 'Change MP3 File' : 'Select MP3 File'}
                                        </button>
                                        {backingTrackUrl && backingTrackUrl.startsWith('blob:') && <p className="text-[10px] text-emerald-400 italic">Local MP3 loaded.</p>}
                                    </div>
                                )}

                                {backingType === 'online' && (
                                    <div className="flex flex-col gap-2">
                                        <div className="relative flex gap-1">
                                            <input
                                                type="text"
                                                placeholder="Paste YouTube or MP3 link..."
                                                defaultValue={backingTrackUrl && !backingTrackUrl.startsWith('blob:') ? backingTrackUrl : ''}
                                                onBlur={(e) => handleOnlineUrlSubmit(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleOnlineUrlSubmit(e.currentTarget.value); }}
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-cyan-300 focus:border-cyan-500 outline-none transition-colors pr-10"
                                            />
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        const text = await navigator.clipboard.readText();
                                                        if (text) handleOnlineUrlSubmit(text);
                                                    } catch (err) {
                                                        console.error('Failed to read clipboard', err);
                                                    }
                                                }}
                                                className="px-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded border border-slate-600"
                                                title="Paste from clipboard"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                                            </button>
                                        </div>
                                        {backingTrackUrl && !backingTrackUrl.startsWith('blob:') && (
                                            <div className="p-2 rounded bg-black/20 border border-white/5">
                                                <p className="text-[10px] text-slate-500 truncate">{backingTrackUrl}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {backingType !== 'none' && backingTrackUrl && (
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
                                                        className="bg-slate-900 text-cyan-300 border border-cyan-500 rounded px-1 text-[10px] w-24 font-mono text-right" min="-9999999" max="9999999"
                                                        defaultValue={backingTrackOffset}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleOffsetSubmit(e.currentTarget.value); }}
                                                        onBlur={(e) => handleOffsetSubmit(e.currentTarget.value)}
                                                    />
                                                ) : (
                                                    <span onClick={() => setIsEditingOffset(true)} className="text-sm font-mono text-cyan-300 cursor-pointer hover:text-white">{backingTrackOffset > 0 ? `+${backingTrackOffset}` : backingTrackOffset}ms</span>
                                                )}
                                            </div>
                                            <input type="range" min="-9999999" max="9999999" step="10" value={backingTrackOffset} onChange={(e) => setBackingTrackOffset(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                                            <p className="text-[10px] text-slate-500 mt-2">Adjust audio start relative to MIDI. Range: -9999999ms to +9999999ms.</p>
                                        </div>
                                    </>
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

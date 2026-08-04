import React, { useEffect, useRef, useState } from 'react';
import { ActiveMidiNoteInfo, MidiNotePlaybackItem, ThemeSettings, FreePlayLiveNote, QwertyLayout } from '../types';
import { FULL_KEYBOARD_LAYOUT, FULL_KEYBOARD_MAPPING, QWERTY_MINI_KEYBOARD_MAPPING, MIRP_KEYBOARD_MAPPING, KEY_CODES_TO_DISPLAY, VISUAL_NOTE_CAP_MS } from '../constants';
import { formatKeySignatureForDisplay } from '../utils';

interface QwertyManiaViewProps {
    currentTimeMs: number;
    playbackData: MidiNotePlaybackItem[];
    liveNotes?: FreePlayLiveNote[];
    activePlaybackNotes: Map<string, ActiveMidiNoteInfo>;
    userActiveKeys: Set<number>;
    noteSpeedMultiplier: number;
    themeSettings: ThemeSettings;
    zoomScale?: number;
    zoomDirection?: 'normal' | 'reverse';
    drumTyperPadOpacity?: number;
    isPaused?: boolean;
    onSeek?: (timeMs: number) => void;
    qwertyLayout?: QwertyLayout;
    qwertyCurrentOctaveShift?: number;
    mirpTranspose?: number;
    activeKeySignature?: string;
    activeBpm?: number;
    showOnlyMajorNotes?: boolean;
}

// Helper for drawing rounded rectangle shapes matching keyboard keys
const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) => {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
};

// Binary search helper to find starting note index in O(log N) time
function findNoteStartIndex<T extends { timeMs: number; durationMs?: number }>(
    noteList: T[],
    targetMinTimeMs: number
): number {
    let low = 0;
    let high = noteList.length - 1;
    let result = 0;

    while (low <= high) {
        const mid = (low + high) >> 1;
        const note = noteList[mid];
        const duration = note.durationMs || 0;
        if (note.timeMs + duration >= targetMinTimeMs) {
            result = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return result;
}

export const QwertyManiaView: React.FC<QwertyManiaViewProps> = ({
    currentTimeMs,
    playbackData,
    liveNotes = [],
    activePlaybackNotes,
    userActiveKeys,
    noteSpeedMultiplier,
    themeSettings,
    zoomScale = 1,
    zoomDirection = 'normal',
    drumTyperPadOpacity = 100,
    isPaused = false,
    onSeek,
    qwertyLayout = 'mirp',
    qwertyCurrentOctaveShift = 0,
    mirpTranspose = 0,
    activeKeySignature = 'C',
    activeBpm = 120,
    showOnlyMajorNotes = false,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const noteSpeedMultiplierRef = useRef(noteSpeedMultiplier);
    const zoomScaleRef = useRef(zoomScale);
    const zoomDirectionRef = useRef(zoomDirection);
    const drumTyperPadOpacityRef = useRef(drumTyperPadOpacity);
    const approachDurationMsRef = useRef(1000);

    useEffect(() => {
        noteSpeedMultiplierRef.current = noteSpeedMultiplier;
        zoomScaleRef.current = zoomScale;
        zoomDirectionRef.current = zoomDirection;
        drumTyperPadOpacityRef.current = drumTyperPadOpacity;
        approachDurationMsRef.current = 1000 / (noteSpeedMultiplier * (zoomScale || 1));
    }, [noteSpeedMultiplier, zoomScale, zoomDirection, drumTyperPadOpacity]);

    const currentTimeMsRef = useRef(currentTimeMs);
    const playbackDataRef = useRef(playbackData);
    const activePlaybackNotesRef = useRef(activePlaybackNotes);
    const userActiveKeysRef = useRef(userActiveKeys);
    const qwertyLayoutRef = useRef(qwertyLayout);
    const qwertyCurrentOctaveShiftRef = useRef(qwertyCurrentOctaveShift);
    const mirpTransposeRef = useRef(mirpTranspose);
    const showOnlyMajorNotesRef = useRef(showOnlyMajorNotes);

    useEffect(() => {
        currentTimeMsRef.current = currentTimeMs;
        playbackDataRef.current = playbackData;
        activePlaybackNotesRef.current = activePlaybackNotes;
        userActiveKeysRef.current = userActiveKeys;
        qwertyLayoutRef.current = qwertyLayout;
        qwertyCurrentOctaveShiftRef.current = qwertyCurrentOctaveShift;
        mirpTransposeRef.current = mirpTranspose;
        showOnlyMajorNotesRef.current = showOnlyMajorNotes;
    }, [currentTimeMs, playbackData, activePlaybackNotes, userActiveKeys, qwertyLayout, qwertyCurrentOctaveShift, mirpTranspose, showOnlyMajorNotes]);

    useEffect(() => {
        const updateDimensions = () => {
            if (canvasRef.current && canvasRef.current.parentElement) {
                setDimensions({
                    width: canvasRef.current.parentElement.clientWidth,
                    height: canvasRef.current.parentElement.clientHeight
                });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const getKeyboardLayout = () => {
        const rows = FULL_KEYBOARD_LAYOUT.length;
        const maxCols = Math.max(...FULL_KEYBOARD_LAYOUT.map(r => r.length));
        
        const keyMargin = 4;
        const availableWidth = Math.max(0, dimensions.width - 60);
        const keySize = Math.max(10, Math.min(availableWidth / maxCols - keyMargin, 50));
        
        const totalKeyboardWidth = maxCols * (keySize + keyMargin);
        const totalKeyboardHeight = rows * (keySize + keyMargin);
        
        const startX = (dimensions.width - totalKeyboardWidth) / 2;
        const startY = (dimensions.height - totalKeyboardHeight) / 2;

        const currentLayout = qwertyLayoutRef.current;
        const currentOctaveShift = qwertyCurrentOctaveShiftRef.current;
        const currentMirpTranspose = mirpTransposeRef.current;

        const layout: Array<{
            code: string;
            midis: number[];
            displayLabel: string;
            cx: number;
            cy: number;
            width: number;
            height: number;
        }> = [];

        FULL_KEYBOARD_LAYOUT.forEach((row, rowIndex) => {
            // Row offsets for a more realistic QWERTY look
            const rowOffsets = [0, 10, 20, 30];
            const xOffset = rowOffsets[rowIndex] || 0;

            row.forEach((code, colIndex) => {
                const midis: number[] = [];
                let displayLabel = KEY_CODES_TO_DISPLAY[code.toLowerCase()] || code.replace('Key', '').replace('Digit', '');

                if (currentLayout === 'mirp') {
                    const mirpEntries = MIRP_KEYBOARD_MAPPING.filter(m => m.code === code);
                    if (mirpEntries.length > 0) {
                        mirpEntries.forEach(m => {
                            midis.push(m.midi + currentMirpTranspose);
                        });
                        const nonShift = mirpEntries.find(m => !m.shift);
                        if (nonShift) {
                            displayLabel = nonShift.label;
                        }
                    }
                    // No fallback for MIRP: system control keys (Tab, Backspace, Enter, Shift, etc.) stay empty
                } else {
                    const codeLower = code.toLowerCase();
                    const isControlKey = ['tab', 'backspace', 'enter', 'shiftleft', 'shiftright', 'capslock', 'space', 'delete'].includes(codeLower);
                    if (!isControlKey) {
                        const miniEntry = QWERTY_MINI_KEYBOARD_MAPPING.find(m => m.qwertyKey === codeLower);
                        if (miniEntry) {
                            midis.push(miniEntry.midiBase + currentOctaveShift * 12);
                        } else {
                            const fallback = FULL_KEYBOARD_MAPPING[code];
                            if (fallback !== undefined) {
                                midis.push(fallback + currentOctaveShift * 12);
                            }
                        }
                    }
                }

                const x = startX + xOffset + colIndex * (keySize + keyMargin) + keySize / 2;
                const y = startY + rowIndex * (keySize + keyMargin) + keySize / 2;

                layout.push({
                    code,
                    midis,
                    displayLabel,
                    cx: x,
                    cy: y,
                    width: keySize,
                    height: keySize,
                });
            });
        });

        return layout;
    };

    const dragRef = useRef<{ isDragging: boolean; startX: number; startTime: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (isPaused) {
            dragRef.current = {
                isDragging: true,
                startX: e.clientX,
                startTime: currentTimeMs
            };
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (dragRef.current && dragRef.current.isDragging && onSeek) {
            const canvas = canvasRef.current;
            let scaleX = 1;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                scaleX = rect.width / (canvas as HTMLElement).offsetWidth;
            }
            const deltaX = (e.clientX - dragRef.current.startX) / scaleX;
            const pixelsPerMillisecond = 1000 / approachDurationMsRef.current;
            const deltaTime = -deltaX / (pixelsPerMillisecond || 0.5);
            onSeek(dragRef.current.startTime + deltaTime);
        }
    };

    const handlePointerUp = () => {
        if (dragRef.current) dragRef.current.isDragging = false;
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        if (!isPaused || !onSeek) return;
        const delta = e.deltaX || e.deltaY;
        const pixelsPerMillisecond = 1000 / approachDurationMsRef.current;
        const deltaTime = delta / (pixelsPerMillisecond || 0.5);
        onSeek(currentTimeMs + deltaTime);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        ctx.scale(dpr, dpr);

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, dimensions.width, dimensions.height);

            const currentMs = currentTimeMsRef.current;
            const currentPlaybackData = playbackDataRef.current;
            const currentActiveNotes = activePlaybackNotesRef.current;
            const currentUserKeys = userActiveKeysRef.current;

            const keys = getKeyboardLayout();
            if (keys.length === 0) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            // Determine visible notes and key approaching progress
            const currentSpeed = noteSpeedMultiplierRef.current || 1;
            const currentZoom = zoomScaleRef.current || 1;
            const approachMs = 1000 / (currentSpeed * currentZoom);

            const getNoteKey = (midi: number) => {
                let exactKey = keys.find(k => k.midis.length > 0 && k.midis.includes(midi));
                if (exactKey) return exactKey;

                const notePitch = ((midi % 12) + 12) % 12;
                let bestKey: typeof keys[0] | undefined = undefined;
                let minDistance = Infinity;

                keys.forEach(k => {
                    if (k.midis.length === 0) return;
                    k.midis.forEach(m => {
                        if (((m % 12) + 12) % 12 === notePitch) {
                            const dist = Math.abs(m - midi);
                            if (dist < minDistance) {
                                minDistance = dist;
                                bestKey = k;
                            }
                        }
                    });
                });

                return bestKey;
            };

            // Active keys calculation (100% synced with AR approach arrival)
            const activeKeyCodes = new Set<string>();

            // Physical user input
            keys.forEach(key => {
                if (key.midis.some(m => currentUserKeys.has(m))) {
                    activeKeyCodes.add(key.code);
                }
            });

            // Active playback notes from audio engine
            currentActiveNotes.forEach(activeInfo => {
                const key = getNoteKey(activeInfo.midi);
                if (key) activeKeyCodes.add(key.code);
            });

            const isMajorCap = showOnlyMajorNotesRef.current;

            // Active playback notes in hit window [timeMs, timeMs + duration]
            if (currentPlaybackData.length > 0) {
                const hitStartIdx = findNoteStartIndex(currentPlaybackData, currentMs - 2000);
                for (let i = hitStartIdx; i < currentPlaybackData.length; i++) {
                    const note = currentPlaybackData[i];
                    const rawDuration = note.durationMs || 100;
                    const noteDuration = Math.min(rawDuration, VISUAL_NOTE_CAP_MS);
                    if (note.timeMs > currentMs + 100) break;
                    if (currentMs >= note.timeMs && currentMs < note.timeMs + noteDuration) {
                        const key = getNoteKey(note.midi);
                        if (key) activeKeyCodes.add(key.code);
                    }
                }
            }

            const keyApproachingProgressMap = new Map<string, number>();

            const visibleNotes: MidiNotePlaybackItem[] = [];
            if (currentPlaybackData.length > 0) {
                const approachStartIdx = findNoteStartIndex(currentPlaybackData, currentMs - 200);
                for (let i = approachStartIdx; i < currentPlaybackData.length; i++) {
                    const note = currentPlaybackData[i];
                    if (note.timeMs - currentMs > approachMs + 100) break;
                    const timeUntilHit = note.timeMs - currentMs;
                    const rawDuration = note.durationMs || 0;
                    const noteDuration = Math.min(rawDuration, VISUAL_NOTE_CAP_MS);
                    if (timeUntilHit <= approachMs && currentMs <= note.timeMs + noteDuration + 150) {
                        visibleNotes.push(note);
                    }
                }
            }

            visibleNotes.forEach(note => {
                const key = getNoteKey(note.midi);
                if (key) {
                    const timeUntilHit = note.timeMs - currentMs;
                    const rawDuration = note.durationMs || 0;
                    const noteDuration = Math.min(rawDuration, VISUAL_NOTE_CAP_MS);
                    let progress = 0;
                    if (timeUntilHit > 0) {
                        progress = Math.max(0, Math.min(1, 1 - (timeUntilHit / approachMs)));
                    } else if (currentMs <= note.timeMs + noteDuration) {
                        progress = 1.0;
                    } else {
                        const timeSinceEnd = currentMs - (note.timeMs + noteDuration);
                        progress = Math.max(0, 1 - (timeSinceEnd / 150));
                    }
                    const existing = keyApproachingProgressMap.get(key.code) || 0;
                    keyApproachingProgressMap.set(key.code, Math.max(existing, progress));
                }
            });

            const baseOpacity = (drumTyperPadOpacityRef.current ?? 100) / 100;

            // Draw keys
            keys.forEach(key => {
                const isActive = activeKeyCodes.has(key.code);
                const approachingProgress = keyApproachingProgressMap.get(key.code) || 0;
                const finalKeyOpacity = Math.max(baseOpacity, approachingProgress, isActive ? 1 : 0);

                ctx.save();
                ctx.globalAlpha = finalKeyOpacity;

                const rx = key.cx - key.width / 2;
                const ry = key.cy - key.height / 2;
                const cornerRadius = 6;

                drawRoundedRect(ctx, rx, ry, key.width, key.height, cornerRadius);
                ctx.fillStyle = isActive ? themeSettings.hitNoteColor : '#1e293b';
                ctx.strokeStyle = isActive ? '#f59e0b' : '#475569';
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();

                // Draw label
                ctx.fillStyle = isActive ? '#000' : '#e2e8f0';
                ctx.font = `bold ${key.width * 0.35}px "JetBrains Mono", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(key.displayLabel, key.cx, key.cy);

                ctx.restore();
            });

            // Draw zooming notes (Key-shaped rounded rectangles matching keyboard key shape)
            const currentZoomDir = zoomDirectionRef.current || 'normal';

            visibleNotes.forEach(note => {
                const key = getNoteKey(note.midi);
                if (!key) return;

                const timeUntilHit = note.timeMs - currentMs;
                const rawDuration = note.durationMs || 0;
                const noteDuration = Math.min(rawDuration, VISUAL_NOTE_CAP_MS);

                if (timeUntilHit > 0) {
                    // Approaching phase
                    const progress = Math.max(0, Math.min(1, 1 - (timeUntilHit / approachMs)));
                    
                    let scale: number;
                    if (currentZoomDir === 'reverse') {
                        const minScale = 0.2;
                        scale = minScale + progress * (1.0 - minScale);
                    } else {
                        const initialScale = 2.8;
                        scale = initialScale - progress * (initialScale - 1.0);
                    }

                    if (isNaN(scale)) return;

                    const boxW = key.width * scale;
                    const boxH = key.height * scale;
                    const boxX = key.cx - boxW / 2;
                    const boxY = key.cy - boxH / 2;
                    const cornerR = Math.max(2, 6 * scale);

                    const opacity = Math.min(1, progress * 1.5);
                    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, cornerR);
                    ctx.strokeStyle = `rgba(34,211,238,${opacity})`;
                    ctx.lineWidth = 3;
                    ctx.stroke();

                    // Subtle inner glow as it hits
                    if (progress > 0.7) {
                        const glowOpacity = (progress - 0.7) / 0.3;
                        const keyX = key.cx - key.width / 2;
                        const keyY = key.cy - key.height / 2;
                        drawRoundedRect(ctx, keyX, keyY, key.width, key.height, 6);
                        ctx.strokeStyle = `rgba(251, 191, 36, ${glowOpacity})`;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                } else if (currentMs <= note.timeMs + noteDuration) {
                    // Sustaining phase (stays highlighted with perfect scale and opacity)
                    const boxW = key.width * 1.02;
                    const boxH = key.height * 1.02;
                    const boxX = key.cx - boxW / 2;
                    const boxY = key.cy - boxH / 2;
                    const cornerR = 6;

                    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, cornerR);
                    ctx.strokeStyle = themeSettings.hitNoteColor;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                } else {
                    // Release / Post-hit burst phase (0ms to 150ms after note ends)
                    const timeSinceEnd = currentMs - (note.timeMs + noteDuration);
                    const hitFade = Math.max(0, 1 - (timeSinceEnd / 150));

                    const burstScale = 1.02 + (timeSinceEnd / 150) * 0.23;
                    const boxW = key.width * burstScale;
                    const boxH = key.height * burstScale;
                    const boxX = key.cx - boxW / 2;
                    const boxY = key.cy - boxH / 2;
                    const cornerR = Math.max(2, 6 * burstScale);

                    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, cornerR);
                    ctx.strokeStyle = `rgba(251, 191, 36, ${hitFade})`;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [dimensions, themeSettings]);

    return (
        <div className={`w-full h-full relative overflow-hidden touch-none ${isPaused ? 'cursor-ns-resize' : ''}`}>
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onWheel={handleWheel}
                style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
            />

            {/* FLOATING HUD */}
            <div 
                className="absolute top-4 left-4 text-white px-3 py-2 rounded-xl text-xs font-mono tabular-nums shadow-xl border border-white/10 flex flex-col gap-1.5 transition-all duration-300 pointer-events-none select-none"
                style={{ 
                    background: 'rgba(15, 23, 42, 0.85)', 
                    backdropFilter: 'blur(8px)', 
                    zIndex: 30,
                    minWidth: '150px'
                }}
            >
                {/* Header */}
                <div className="text-[9px] font-sans font-bold tracking-wider text-slate-400 uppercase border-b border-white/10 pb-1 mb-0.5">
                    Live Status
                </div>

                {/* Key Signature */}
                <div className="flex justify-between items-center gap-3">
                    <span className="text-slate-400 text-[10px] font-sans">Key</span>
                    <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                        {formatKeySignatureForDisplay(activeKeySignature)}
                    </span>
                </div>

                {/* BPM */}
                <div className="flex justify-between items-center gap-3">
                    <span className="text-slate-400 text-[10px] font-sans">BPM</span>
                    <span className="text-yellow-400 font-bold drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]">
                        {Math.round(activeBpm)}
                    </span>
                </div>

                {/* Transpose / Octave Shift */}
                <div className="flex justify-between items-center gap-3 border-t border-white/5 pt-1 mt-0.5">
                    <span className="text-slate-400 text-[10px] font-sans">
                        {qwertyLayout === 'mirp' ? 'Transpose' : 'Octave Shift'}
                    </span>
                    <span className="text-amber-400 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                        {qwertyLayout === 'mirp' 
                            ? (mirpTranspose >= 0 ? `+${mirpTranspose}` : mirpTranspose)
                            : (qwertyCurrentOctaveShift >= 0 ? `+${qwertyCurrentOctaveShift}` : qwertyCurrentOctaveShift)
                        }
                    </span>
                </div>

                {/* Layout name */}
                <div className="flex justify-between items-center gap-3 border-t border-white/5 pt-1 text-[9px]">
                    <span className="text-slate-500 font-sans">Layout</span>
                    <span className="text-slate-300 font-medium font-sans">
                        {qwertyLayout === 'mirp' ? 'Roblox' : 'Standard'}
                    </span>
                </div>
            </div>
        </div>
    );
};

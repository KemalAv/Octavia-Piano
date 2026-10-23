import React, { useEffect, useRef, useState } from 'react';
import { ActiveMidiNoteInfo, MidiNotePlaybackItem, DrumPadConfig, ThemeSettings, FreePlayLiveNote } from '../types';
import { DRUM_KEYBOARD_MAP, DRUM_PADS } from '../constants';
import { getDynamicFromVelocity, getVelocityOutlineColor } from '../utils';


// Order from user request
const MANIA_PAD_ORDER = [
    'hihat_foot',
    'hihat',
    'crash',
    'snare',
    'bass',
    'high_tom',
    'low_tom',
    'floor_tom',
    'ride'
];

interface DrumManiaViewProps {
    currentTimeMs: number;
    playbackData: MidiNotePlaybackItem[];
    liveNotes?: FreePlayLiveNote[];
    activePlaybackNotes: Map<string, ActiveMidiNoteInfo>;
    userActiveKeys: Set<number>;
    noteSpeedMultiplier: number;
    drumInputMode?: 'midi' | 'non-midi';
    onPadDown?: (padId: string) => void;
    onPadUp?: (padId: string) => void;
    themeSettings: ThemeSettings;
    zoomScale?: number;
    barLines?: number[];
    pixelsPerMillisecond?: number;
    isPaused?: boolean;
    onSeek?: (timeMs: number) => void;
    showPianoTilesBackground?: boolean;
    pianoTilesOpacity?: number;
    waitMode?: string;
    resolutionScale?: number;
    showDynamics?: boolean;
}

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

export const DrumManiaView: React.FC<DrumManiaViewProps> = React.memo(({
    currentTimeMs,
    playbackData,
    liveNotes = [],
    activePlaybackNotes,
    userActiveKeys,
    noteSpeedMultiplier,
    drumInputMode = 'non-midi',
    onPadDown,
    onPadUp,
    themeSettings,
    zoomScale = 1,
    barLines = [],
    pixelsPerMillisecond = 0.5,
    isPaused = false,
    onSeek,
    showPianoTilesBackground = true,
    pianoTilesOpacity = 50,
    waitMode = 'strict',
    resolutionScale = 1.0,
    showDynamics = false,
}) => {
    const MIDI_TO_PAD_MAP = new Map<number, DrumPadConfig>();
    DRUM_PADS.forEach(pad => {
        pad.midiNotes.forEach(note => {
            MIDI_TO_PAD_MAP.set(note, pad);
        });
    });

    const PAD_TO_KEYS_MAP = new Map<string, string[]>();
    Object.entries(DRUM_KEYBOARD_MAP).forEach(([key, midi]) => {
        const pad = MIDI_TO_PAD_MAP.get(midi);
        if (pad) {
            const existing = PAD_TO_KEYS_MAP.get(pad.id) || [];
            PAD_TO_KEYS_MAP.set(pad.id, [...existing, key.toUpperCase()]);
        }
    });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const approachDurationMsRef = useRef(1000);

    useEffect(() => {
        approachDurationMsRef.current = 1000 / (noteSpeedMultiplier * 2);
    }, [noteSpeedMultiplier]);

    // Removed excessive logging for performance
    // useEffect(() => {
    //     console.log("DrumManiaView rendered", { currentTimeMs, playbackDataLength: playbackData.length, barLinesLength: barLines.length });
    // }, [currentTimeMs, playbackData, barLines]);

    const currentTimeMsRef = useRef(currentTimeMs);
    const playbackDataRef = useRef(playbackData);
    const liveNotesRef = useRef(liveNotes);
    const activePlaybackNotesRef = useRef(activePlaybackNotes);
    const userActiveKeysRef = useRef(userActiveKeys);

    useEffect(() => {
        currentTimeMsRef.current = currentTimeMs;
        playbackDataRef.current = playbackData;
        liveNotesRef.current = liveNotes;
        activePlaybackNotesRef.current = activePlaybackNotes;
        userActiveKeysRef.current = userActiveKeys;
    }, [currentTimeMs, playbackData, liveNotes, activePlaybackNotes, userActiveKeys]);

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

    const activePointersRef = useRef<Map<number, string>>(new Map());
    const dragRef = useRef<{ isDragging: boolean; startY: number; startTime: number } | null>(null);

    const getPadLayout = () => {
        const padCount = MANIA_PAD_ORDER.length;
        const padWidth = dimensions.width / padCount;
        const centerY = dimensions.height - 125; // Adjusted so pads sit lower while remaining clear of offset meter

        return MANIA_PAD_ORDER.map((id, index) => {
            const pad = DRUM_PADS.find(p => p.id === id)!;
            const cx = (index + 0.5) * padWidth;
            const cy = centerY;
            const r = Math.min(padWidth * 0.4, 40);

            return { ...pad, cx, cy, r };
        });
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        // Account for CSS scaling (zoom or transform: scale)
        const scaleX = rect.width / (canvas as HTMLElement).offsetWidth;
        const scaleY = rect.height / (canvas as HTMLElement).offsetHeight;

        const x = (e.clientX - rect.left) / scaleX;
        const y = (e.clientY - rect.top) / scaleY;

        const pads = getPadLayout();
        let hitPad = false;

        for (const pad of pads) {
            const dx = x - pad.cx;
            const dy = y - pad.cy;
            if (Math.sqrt(dx * dx + dy * dy) <= pad.r) {
                if (onPadDown) {
                    activePointersRef.current.set(e.pointerId, pad.id);
                    onPadDown(pad.id);
                }
                hitPad = true;
                break;
            }
        }

        if (!hitPad && isPaused) {
            dragRef.current = {
                isDragging: true,
                startY: e.clientY,
                startTime: currentTimeMs
            };
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (dragRef.current && dragRef.current.isDragging && onSeek) {
            const canvas = canvasRef.current;
            let scaleY = 1;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                scaleY = rect.height / (canvas as HTMLElement).offsetHeight;
            }
            const deltaY = (e.clientY - dragRef.current.startY) / scaleY;
            const deltaTime = deltaY / pixelsPerMillisecond;
            onSeek(dragRef.current.startTime + deltaTime);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const padId = activePointersRef.current.get(e.pointerId);
        if (padId && onPadUp) {
            onPadUp(padId);
            activePointersRef.current.delete(e.pointerId);
        }
        if (dragRef.current) {
            dragRef.current.isDragging = false;
        }
    };

    const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const padId = activePointersRef.current.get(e.pointerId);
        if (padId && onPadUp) {
            onPadUp(padId);
            activePointersRef.current.delete(e.pointerId);
        }
        if (dragRef.current) {
            dragRef.current.isDragging = false;
        }
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        if (!isPaused || !onSeek) return;
        const delta = e.deltaX || e.deltaY;
        const deltaTime = -delta / pixelsPerMillisecond;
        onSeek(currentTimeMs + deltaTime);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = (window.devicePixelRatio || 1) * (resolutionScale || 1.0);
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        ctx.scale(dpr, dpr);

        const drawIcon = (padId: string, cx: number, cy: number, r: number) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#e2e8f0";

            switch (padId) {
                case "bass":
                    const kickR = r * 0.4;
                    ctx.beginPath();
                    ctx.arc(0, 0, kickR, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(0, 0, kickR * 0.8, 0, Math.PI * 2);
                    ctx.setLineDash([2, 2]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.beginPath();
                    ctx.arc(kickR * 0.4, kickR * 0.3, kickR * 0.15, 0, Math.PI * 2);
                    ctx.fillStyle = "#475569";
                    ctx.fill();
                    ctx.beginPath();
                    ctx.rect(-kickR * 0.5, kickR * 0.4, kickR * 0.3, kickR * 0.4);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(-kickR * 0.35, kickR * 0.4);
                    ctx.lineTo(-kickR * 0.35, kickR * 0.1);
                    ctx.stroke();
                    break;
                case "snare":
                    ctx.beginPath();
                    ctx.rect(-r * 0.45, -r * 0.25, r * 0.9, r * 0.5);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(-r * 0.45, 0);
                    ctx.lineTo(r * 0.45, 0);
                    ctx.stroke();
                    ctx.save();
                    ctx.globalAlpha = 0.5;
                    for (let i = -3; i <= 3; i++) {
                        ctx.beginPath();
                        ctx.moveTo(-r * 0.3, i * 2);
                        ctx.lineTo(r * 0.3, i * 2);
                        ctx.stroke();
                    }
                    ctx.restore();
                    break;
                case "high_tom":
                case "low_tom":
                case "floor_tom":
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
                    ctx.stroke();
                    for (let i = 0; i < 6; i++) {
                        const angle = (i / 6) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.rect(Math.cos(angle) * r * 0.47 - 2, Math.sin(angle) * r * 0.47 - 2, 4, 4);
                        ctx.fillStyle = "#e2e8f0";
                        ctx.fill();
                    }
                    break;
                case "hihat":
                    const gap = r * 0.08;
                    const cymbalR = r * 0.42;
                    ctx.beginPath();
                    ctx.arc(0, -gap, cymbalR, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(0, gap, cymbalR, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case "hihat_foot":
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(0, -r * 0.45);
                    ctx.lineTo(0, r * 0.45);
                    ctx.stroke();
                    break;
                case "crash":
                case "ride":
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.05, 0, Math.PI * 2);
                    ctx.stroke();
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.moveTo(Math.cos(angle) * r * 0.1, Math.sin(angle) * r * 0.1);
                        ctx.lineTo(Math.cos(angle) * r * 0.45, Math.sin(angle) * r * 0.45);
                        ctx.save();
                        ctx.globalAlpha = 0.3;
                        ctx.stroke();
                        ctx.restore();
                    }
                    break;
            }
            ctx.restore();
        };

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, dimensions.width, dimensions.height);

            const currentMs = currentTimeMsRef.current;
            const currentPlaybackData = playbackDataRef.current;
            const currentActiveNotes = activePlaybackNotesRef.current;
            const currentUserKeys = userActiveKeysRef.current;

            const pads = getPadLayout();
            // Hitbox and horizontal strike line placed at the bottom edge of the inner concentric circle (pad.cy + pad.r * 0.7)
            const hitLineY = pads.length > 0 ? (pads[0].cy + pads[0].r * 0.7) : (dimensions.height - 97);

            // Draw horizontal strike/hitbox guide line across all lanes
            ctx.save();
            ctx.shadowColor = 'rgba(139, 92, 246, 0.85)';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(0, hitLineY);
            ctx.lineTo(dimensions.width, hitLineY);
            ctx.strokeStyle = 'rgba(167, 139, 250, 0.9)'; // Radiant violet-cyan neon strike line
            ctx.lineWidth = 3;
            ctx.stroke();

            // Crisp inner white laser beam line
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(0, hitLineY);
            ctx.lineTo(dimensions.width, hitLineY);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();

            // Draw lane backgrounds
            if (showPianoTilesBackground) {
                const alpha = pianoTilesOpacity / 100;
                pads.forEach(pad => {
                    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                    ctx.fillRect(pad.cx - pad.r, 0, pad.r * 2, dimensions.height);
                });
            }

            // Draw bar lines
            const bufferMs = 50 / pixelsPerMillisecond;
            const minBarTime = currentMs - bufferMs;
            const maxBarTime = currentMs + (dimensions.height / pixelsPerMillisecond) + bufferMs;

            const defaultNoteRadius = pads.length > 0 ? pads[0].r * 0.6 : 20;

            barLines.forEach((barTime, index) => {
                if (barTime < minBarTime || barTime > maxBarTime) return;
                // Bar line is drawn shifted so note head sits exactly after the bar line while hitting at pad center
                const y = hitLineY - (barTime - currentMs) * pixelsPerMillisecond + defaultNoteRadius;
                if (y >= 0 && y <= dimensions.height) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(dimensions.width, y);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Fainter bar lines
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });

            // Draw pads
            pads.forEach(pad => {
                let isUserActive = false;
                let isPlaybackActive = false;

                for (const note of pad.midiNotes) {
                    if (currentUserKeys.has(note)) {
                        isUserActive = true;
                        break;
                    }
                }

                const isAutoMode = waitMode === 'off';
                if (!isUserActive && isAutoMode) {
                    for (const info of currentActiveNotes.values()) {
                        if (pad.midiNotes.includes(info.midi)) {
                            isPlaybackActive = true;
                            break;
                        }
                    }
                }

                const isActive = isUserActive || isPlaybackActive;

                ctx.beginPath();
                ctx.arc(pad.cx, pad.cy, pad.r, 0, Math.PI * 2);

                if (isActive) {
                    ctx.strokeStyle = themeSettings.hitNoteColor;
                } else {
                    ctx.strokeStyle = '#8b5cf6';
                }

                ctx.lineWidth = isActive ? 6 : 4;
                ctx.stroke();

                if (isActive) {
                    ctx.beginPath();
                    ctx.arc(pad.cx, pad.cy, pad.r, 0, Math.PI * 2);
                    ctx.fillStyle = themeSettings.hitNoteColor;
                    ctx.save();
                    ctx.globalAlpha = (isUserActive ? 0.4 : 0.25);
                    ctx.fill();
                    ctx.restore();
                }

                // Draw inner concentric indicator at pad center
                ctx.beginPath();
                ctx.arc(pad.cx, pad.cy, pad.r * 0.7, 0, Math.PI * 2);
                ctx.strokeStyle = isActive ? themeSettings.hitNoteColor : 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 2;
                ctx.stroke();

                if (isActive) {
                    ctx.beginPath();
                    ctx.arc(pad.cx, pad.cy, pad.r * 0.7, 0, Math.PI * 2);
                    // Match theme hit color
                    const hc = themeSettings.hitNoteColor;
                    ctx.fillStyle = hc.length === 7 ? hc + '4d' : hc;
                    ctx.fill();
                }

                drawIcon(pad.id, pad.cx, pad.cy, pad.r);

                // Draw labels
                ctx.fillStyle = isActive ? '#ffffff' : '#e2e8f0';
                ctx.font = 'bold 9px "Exo 2", sans-serif'; // Slightly smaller font to fit
                ctx.textAlign = 'center';
                ctx.fillText(pad.name, pad.cx, pad.cy + pad.r + 10);

                if (drumInputMode === 'non-midi') {
                    const keys = PAD_TO_KEYS_MAP.get(pad.id);
                    if (keys) {
                        ctx.fillStyle = isActive ? '#34d399' : '#22d3ee'; // Greener for active
                        ctx.font = 'bold 10px "JetBrains Mono", monospace';
                        ctx.fillText(`[${keys.join('/')}]`, pad.cx, pad.cy + pad.r + 22);
                    }
                }
            });

            // Draw falling notes
            // Efficiently find visible notes using binary search with dynamic and precise boundaries
            const minNoteTime = currentMs - (pixelsPerMillisecond > 0 ? 200 / pixelsPerMillisecond : 1000);
            const maxNoteTime = currentMs + (pixelsPerMillisecond > 0 ? (hitLineY + 100) / pixelsPerMillisecond : 2000);

            const startIndex = currentPlaybackData.length > 0 ? findNoteStartIndex(currentPlaybackData, minNoteTime) : 0;

            const visibleNotes: MidiNotePlaybackItem[] = [];
            for (let i = startIndex; i < currentPlaybackData.length; i++) {
                const note = currentPlaybackData[i];
                if (note.timeMs > maxNoteTime) break;
                visibleNotes.push(note);
            }

            // Handle hi-hat connection lines (midi 42 - Closed Hi-Hat)
            const closedHiHatNotes = visibleNotes.filter(n => n.midi === 42);
            closedHiHatNotes.forEach(note => {
                const timeUntilHit = note.timeMs - currentMs;
                const hihatPad = pads.find(p => p.id === 'hihat');
                const footPad = pads.find(p => p.id === 'hihat_foot');

                if (hihatPad && footPad) {
                    const y = hitLineY - (timeUntilHit * pixelsPerMillisecond);

                    if (y >= -50 && y <= dimensions.height + 50) {
                        ctx.beginPath();
                        // Draw connector line between hi-hat lane and hi-hat foot lane
                        ctx.moveTo(footPad.cx, y);
                        ctx.lineTo(hihatPad.cx, y);
                        ctx.strokeStyle = `rgba(139,92,246,1.0)`; // Opacity 1.0 as requested
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                }
            });

            visibleNotes.forEach(note => {
                const pad = pads.find(p => p.midiNotes.includes(note.midi));
                if (!pad) return;

                const timeUntilHit = note.timeMs - currentMs;
                const noteRadius = pad.r * 0.6;
                // Note hits exactly at pad center (hitLineY)
                const y = hitLineY - (timeUntilHit * pixelsPerMillisecond);

                if (y >= -50 && y <= dimensions.height + 50) {
                    ctx.beginPath();
                    ctx.arc(pad.cx, y, noteRadius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(34,211,238,1)`;
                    ctx.fill();
                    ctx.strokeStyle = showDynamics ? getVelocityOutlineColor(note.velocity) : 'rgba(255,255,255,1)';
                    ctx.lineWidth = showDynamics ? 2.5 : 2;
                    ctx.stroke();
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [dimensions, drumInputMode, themeSettings, pixelsPerMillisecond, waitMode, resolutionScale]);

    return (
        <div className={`w-full h-full relative overflow-hidden touch-none ${isPaused ? 'cursor-ns-resize' : ''}`}>
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onPointerCancel={handlePointerLeave}
                onWheel={handleWheel}
                className="relative z-10"
                style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
            />
        </div>
    );
});

import React, { useEffect, useRef, useState } from 'react';
import { ActiveMidiNoteInfo, MidiNotePlaybackItem, DrumPadConfig, ThemeSettings, FreePlayLiveNote } from '../types';
import { DRUM_KEYBOARD_MAP, DRUM_PADS } from '../constants';
import { getDynamicFromVelocity, getVelocityOutlineColor } from '../utils';


interface DrumViewProps {
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
    zoomDirection?: 'normal' | 'reverse';
    zoomScale?: number;
    isPaused?: boolean;
    onSeek?: (timeMs: number) => void;
    drumTyperPadOpacity?: number;
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

export const DrumView: React.FC<DrumViewProps> = React.memo(({
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
    zoomDirection = 'normal',
    zoomScale = 1,
    isPaused = false,
    onSeek,
    drumTyperPadOpacity = 100,
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

    const approachDurationMsRef = useRef(1000 / (noteSpeedMultiplier * 1.8));

    useEffect(() => {
        approachDurationMsRef.current = 1000 / (noteSpeedMultiplier * 1.8);
    }, [noteSpeedMultiplier]);

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
    const dragRef = useRef<{ isDragging: boolean; startX: number; startTime: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        
        // Account for CSS scaling (zoom or transform: scale)
        const scaleX = rect.width / (canvas as HTMLElement).offsetWidth;
        const scaleY = rect.height / (canvas as HTMLElement).offsetHeight;

        const x = (e.clientX - rect.left) / scaleX;
        const y = (e.clientY - rect.top) / scaleY;

        const layoutScale = 0.82;
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;

        let hitPad = false;
        for (const pad of DRUM_PADS) {
            const cx = centerX + (pad.x * dimensions.width - centerX) * layoutScale;
            const cy = centerY + (pad.y * dimensions.height - centerY) * layoutScale;

            const r = 0.11 * dimensions.height; // Uniform size for all pads in Drum Typer
            // Overriding pad.radius to ensure all pads are exactly the same size

            const dx = x - cx;
            const dy = y - cy;

            if (Math.sqrt(dx * dx + dy * dy) <= r) {
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
        const pixelsPerMillisecond = 1000 / approachDurationMsRef.current;
        const deltaTime = delta / (pixelsPerMillisecond || 0.5);
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

        const layoutScale = 0.82;

        const drawIcon = (padId: string, cx: number, cy: number, r: number) => {

    ctx.save();
    ctx.translate(cx, cy);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e2e8f0";

    switch (padId) {

        case "bass":

            const kickR = r * 0.4;

            // bass drum shell
            ctx.beginPath();
            ctx.arc(0, 0, kickR, 0, Math.PI * 2);
            ctx.stroke();

            // bass drum head (inner circle)
            ctx.beginPath();
            ctx.arc(0, 0, kickR * 0.8, 0, Math.PI * 2);
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.setLineDash([]);

            // bass hole
            ctx.beginPath();
            ctx.arc(kickR * 0.4, kickR * 0.3, kickR * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = "#475569";
            ctx.fill();

            // pedal detail (simplified and smaller)
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

            // snare wires
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

            // tom drum shell
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
            ctx.stroke();

            // drum head
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
            ctx.stroke();

            // lugs
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.rect(
                    Math.cos(angle) * r * 0.47 - 2,
                    Math.sin(angle) * r * 0.47 - 2,
                    4,
                    4
                );
                ctx.fillStyle = "#e2e8f0";
                ctx.fill();
            }

            break;

        case "hihat":

    const gap = r * 0.08; // jarak antar cymbal lebih kecil
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

            // center hole
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.05, 0, Math.PI * 2);
            ctx.stroke();

            // shimmer lines
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
            const currentLiveNotes = liveNotesRef.current;
            const currentActiveNotes = activePlaybackNotesRef.current;
            const currentUserKeys = userActiveKeysRef.current;

            const centerX = dimensions.width / 2;
            const centerY = dimensions.height / 2;

            const padApproachingMaxProgress = new Map<string, number>();
            const visibleNotes: MidiNotePlaybackItem[] = [];
            if (currentPlaybackData.length > 0) {
                // Find starting note that could be visible (timeMs is close to currentMs)
                const startIndex = findNoteStartIndex(currentPlaybackData, currentMs);
                const maxNoteTime = currentMs + approachDurationMsRef.current;
                
                for (let i = startIndex; i < currentPlaybackData.length; i++) {
                    const note = currentPlaybackData[i];
                    if (note.timeMs > maxNoteTime) break;
                    
                    const timeUntilHit = note.timeMs - currentMs;
                    if (timeUntilHit > 0 && timeUntilHit <= approachDurationMsRef.current) {
                        const pad = MIDI_TO_PAD_MAP.get(note.midi);
                        if (pad) {
                            const progress = 1 - (timeUntilHit / approachDurationMsRef.current);
                            const currentMax = padApproachingMaxProgress.get(pad.id) || 0;
                            padApproachingMaxProgress.set(pad.id, Math.max(currentMax, progress));
                        }
                        visibleNotes.push(note);
                    }
                }
            }

            DRUM_PADS.forEach(pad => {
                const cx = centerX + (pad.x * dimensions.width - centerX) * layoutScale;
                const cy = centerY + (pad.y * dimensions.height - centerY) * layoutScale;

                const r = 0.11 * dimensions.height; // Uniform size for all pads in Drum Typer
                
                const approachingProgress = padApproachingMaxProgress.get(pad.id) || 0;
                const baseOpacity = drumTyperPadOpacity / 100;
                const finalPadOpacity = Math.max(baseOpacity, approachingProgress);

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

                ctx.save();
                ctx.globalAlpha = finalPadOpacity;

                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                
                if (isActive) {
                    ctx.strokeStyle = themeSettings.hitNoteColor;
                } else {
                    ctx.strokeStyle = '#8b5cf6';
                }
                
                ctx.lineWidth = isActive ? 6 : 4;
                ctx.stroke();

                if (drumInputMode === 'non-midi') {
                    const keys = PAD_TO_KEYS_MAP.get(pad.id);
                    if (keys) {
                        ctx.fillStyle = isActive ? '#ffffff' : '#22d3ee';
                        ctx.font = 'bold 12px "JetBrains Mono", monospace';
                        ctx.fillText(`[${keys.join('/')}]`, cx, cy + r + 26);
                    }
                }

                if (isActive) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fillStyle = themeSettings.hitNoteColor;
                    ctx.save();
                    ctx.globalAlpha = (isUserActive ? 0.4 : 0.25) * finalPadOpacity;
                    ctx.fill();
                    ctx.restore();
                }

                drawIcon(pad.id, cx, cy, r);

                ctx.fillStyle = isActive ? '#ffffff' : '#e2e8f0';
                ctx.font = 'bold 10px "Exo 2", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(pad.name, cx, cy + r + 12);
                
                ctx.restore();
            });

            visibleNotes.forEach(note => {

                const pad = MIDI_TO_PAD_MAP.get(note.midi);

                if (!pad) return;

                const timeUntilHit = note.timeMs - currentMs;

                const progress = 1 - (timeUntilHit / approachDurationMsRef.current);

                if (timeUntilHit <= approachDurationMsRef.current && timeUntilHit > 0) {

                    const cx = centerX + (pad.x * dimensions.width - centerX) * layoutScale;
                    const cy = centerY + (pad.y * dimensions.height - centerY) * layoutScale;

                    // Handle hi-hat connection lines (midi 42 - Closed Hi-Hat)
                    if (note.midi === 42) {
                        const footPad = DRUM_PADS.find(p => p.id === 'hihat_foot');
                        if (footPad) {
                            const fx = centerX + (footPad.x * dimensions.width - centerX) * layoutScale;
                            const fy = centerY + (footPad.y * dimensions.height - centerY) * layoutScale;
                            ctx.beginPath();
                            ctx.moveTo(cx, cy);
                            ctx.lineTo(fx, fy);
                            ctx.strokeStyle = `rgba(139,92,246,1)`;
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        }
                    }

                    // Uniform size for all pads in Drum Typer
                    const maxR = (0.11 * dimensions.height) / zoomScale;

                    let currentR: number;

                    if (zoomDirection === 'reverse') {
                        currentR = Math.max(0.1 * maxR, progress * maxR * zoomScale);
                    } else {
                        currentR = Math.max(maxR * zoomScale, (2 - progress) * maxR * zoomScale);
                    }

                    const opacity = Math.min(1, progress * 2);

                    ctx.beginPath();
                    ctx.arc(cx, cy, currentR, 0, Math.PI * 2);
                    ctx.strokeStyle = showDynamics ? getVelocityOutlineColor(note.velocity, opacity) : `rgba(34,211,238,${opacity})`;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }

            });

            currentLiveNotes.forEach(note => {
                const pad = MIDI_TO_PAD_MAP.get(note.midi);
                if (!pad) return;

                const timeSinceStart = currentMs - note.startTime;
                if (timeSinceStart >= 0 && (note.endTime === null || timeSinceStart <= (note.endTime - note.startTime) + 200)) {
                    const cx = centerX + (pad.x * dimensions.width - centerX) * layoutScale;
                    const cy = centerY + (pad.y * dimensions.height - centerY) * layoutScale;

                    const maxR = 0.11 * dimensions.height; // Uniform size for all pads in Drum Typer

                    ctx.beginPath();
                    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
                    ctx.strokeStyle = themeSettings.hitNoteColor;
                    ctx.lineWidth = 6;
                    ctx.stroke();
                }
            });

            animationFrameId = requestAnimationFrame(render);

        };

        render();

        return () => cancelAnimationFrame(animationFrameId);

    }, [dimensions, drumInputMode, themeSettings, waitMode, resolutionScale]);

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
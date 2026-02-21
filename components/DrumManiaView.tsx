import React, { useEffect, useRef, useState } from 'react';
import { ActiveMidiNoteInfo, MidiNotePlaybackItem, DrumPadConfig, ThemeSettings, FreePlayLiveNote } from '../types';
import { DRUM_KEYBOARD_MAP, DRUM_PADS } from '../constants';

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

// Order from user request
const MANIA_PAD_ORDER = [
    'hihat',
    'hihat_foot',
    'crash',
    'snare',
    'high_tom',
    'bass',
    'low_tom',
    'ride',
    'floor_tom'
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
}

export const DrumManiaView: React.FC<DrumManiaViewProps> = ({
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
    pixelsPerMillisecond = 0.5
}) => {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const approachDurationMsRef = useRef(1000);

    useEffect(() => {
        approachDurationMsRef.current = 1000 / noteSpeedMultiplier;
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

    const getPadLayout = () => {
        const padCount = MANIA_PAD_ORDER.length;
        const padWidth = dimensions.width / padCount;
        const centerY = dimensions.height - 80; // Position pads near bottom

        return MANIA_PAD_ORDER.map((id, index) => {
            const pad = DRUM_PADS.find(p => p.id === id)!;
            const cx = (index + 0.5) * padWidth;
            const cy = centerY;
            let r = Math.min(padWidth * 0.4, 40);
            if (id === 'bass') r *= 1.3; // Bass drum is larger

            return { ...pad, cx, cy, r };
        });
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!onPadDown) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoomScale;
        const y = (e.clientY - rect.top) / zoomScale;

        const pads = getPadLayout();

        for (const pad of pads) {
            const dx = x - pad.cx;
            const dy = y - pad.cy;
            if (Math.sqrt(dx * dx + dy * dy) <= pad.r) {
                activePointersRef.current.set(e.pointerId, pad.id);
                onPadDown(pad.id);
                break;
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const padId = activePointersRef.current.get(e.pointerId);
        if (padId && onPadUp) {
            onPadUp(padId);
            activePointersRef.current.delete(e.pointerId);
        }
    };

    const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const padId = activePointersRef.current.get(e.pointerId);
        if (padId && onPadUp) {
            onPadUp(padId);
            activePointersRef.current.delete(e.pointerId);
        }
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
            const hitLineY = dimensions.height - 80;

            // Draw lane backgrounds
            pads.forEach(pad => {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.fillRect(pad.cx - pad.r, 0, pad.r * 2, dimensions.height);
            });

            // Draw bar lines
            barLines.forEach((barTime, index) => {
                const y = hitLineY - (barTime - currentMs) * pixelsPerMillisecond;
                if (y >= 0 && y <= dimensions.height) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(dimensions.width, y);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.font = '12px monospace';
                    ctx.fillText(`Bar ${index + 1}`, 20, y - 5);
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

                if (!isUserActive) {
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
                
                if (isUserActive) {
                    ctx.strokeStyle = themeSettings.hitNoteColor;
                } else if (isPlaybackActive) {
                    ctx.strokeStyle = '#ffffff';
                } else {
                    ctx.strokeStyle = '#8b5cf6';
                }
                
                ctx.lineWidth = isActive ? 6 : 4;
                ctx.stroke();

                if (isActive) {
                    ctx.beginPath();
                    ctx.arc(pad.cx, pad.cy, pad.r, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,255,255,0.25)';
                    ctx.fill();
                }

                drawIcon(pad.id, pad.cx, pad.cy, pad.r);

                // Draw labels
                ctx.fillStyle = isActive ? '#ffffff' : '#e2e8f0';
                ctx.font = 'bold 10px "Exo 2", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(pad.name, pad.cx, pad.cy + pad.r + 12);

                if (drumInputMode === 'non-midi') {
                    const keys = PAD_TO_KEYS_MAP.get(pad.id);
                    if (keys) {
                        ctx.fillStyle = isActive ? '#ffffff' : '#22d3ee';
                        ctx.font = 'bold 12px "JetBrains Mono", monospace';
                        ctx.fillText(`[${keys.join('/')}]`, pad.cx, pad.cy + pad.r + 26);
                    }
                }
            });

            // Draw falling notes
            const visibleNotes = currentPlaybackData.filter(note => {
                const timeUntilHit = note.timeMs - currentMs;
                const y = hitLineY - (timeUntilHit * pixelsPerMillisecond);
                return y >= -50 && y <= dimensions.height + 50;
            });

            // Handle hi-hat connection lines (midi 42 - Closed Hi-Hat)
            const closedHiHatNotes = visibleNotes.filter(n => n.midi === 42);
            closedHiHatNotes.forEach(note => {
                const timeUntilHit = note.timeMs - currentMs;
                const y = hitLineY - (timeUntilHit * pixelsPerMillisecond);
                const progress = 1 - (timeUntilHit / approachDurationMsRef.current);
                if (y >= -50 && y <= dimensions.height + 50) {
                    const hihatPad = pads.find(p => p.id === 'hihat');
                    const footPad = pads.find(p => p.id === 'hihat_foot');
                    if (hihatPad && footPad) {
                        ctx.beginPath();
                        ctx.moveTo(hihatPad.cx, y);
                        ctx.lineTo(footPad.cx, y);
                        ctx.strokeStyle = `rgba(139,92,246,${Math.min(1, progress * 2)})`;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                }
            });

            visibleNotes.forEach(note => {
                const pad = pads.find(p => p.midiNotes.includes(note.midi));
                if (!pad) return;

                const timeUntilHit = note.timeMs - currentMs;
                const y = hitLineY - (timeUntilHit * pixelsPerMillisecond);
                const progress = 1 - (timeUntilHit / approachDurationMsRef.current);

                if (y >= -50 && y <= dimensions.height + 50) {
                    const opacity = Math.min(1, Math.max(0.2, progress * 2));

                    ctx.beginPath();
                    ctx.arc(pad.cx, y, pad.r * 0.6, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(34,211,238,${opacity})`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [dimensions, drumInputMode, themeSettings, pixelsPerMillisecond]);

    return (
        <div className="w-full h-full relative overflow-hidden touch-none">
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onPointerCancel={handlePointerLeave}
                className="relative z-10"
                style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
            />
        </div>
    );
};

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
    arDirection?: 'normal' | 'reverse';
    zoomScale?: number;
}

export const DrumView: React.FC<DrumViewProps> = ({
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
    arDirection = 'normal',
    zoomScale = 1
}) => {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const approachDurationMsRef = useRef(1000);

    useEffect(() => {
        approachDurationMsRef.current = 1000 / noteSpeedMultiplier;
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

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!onPadDown) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoomScale;
        const y = (e.clientY - rect.top) / zoomScale;

        const layoutScale = 0.82;
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;

        for (const pad of DRUM_PADS) {
            const cx = centerX + (pad.x * dimensions.width - centerX) * layoutScale;
            const cy = centerY + (pad.y * dimensions.height - centerY) * layoutScale;

            let r = pad.radius * dimensions.height;
            if (pad.id === "bass") r *= 1.4;
            if (pad.id === "snare") r *= 1.2;
            if (["high_tom", "low_tom", "floor_tom"].includes(pad.id)) r *= 1.2;
            if (["crash", "ride"].includes(pad.id)) r *= 1.1;
            if (pad.id === "hihat") r *= 0.9;

            const dx = x - cx;
            const dy = y - cy;

            if (Math.sqrt(dx * dx + dy * dy) <= r) {
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

            DRUM_PADS.forEach(pad => {

                const cx = centerX + (pad.x * dimensions.width - centerX) * layoutScale;
                const cy = centerY + (pad.y * dimensions.height - centerY) * layoutScale;

                let r = pad.radius * dimensions.height;

                if (pad.id === "bass") r *= 1.4;
            if (pad.id === "snare") r *= 1.2;
            if (["high_tom", "low_tom", "floor_tom"].includes(pad.id)) r *= 1.2;
            if (["crash", "ride"].includes(pad.id)) r *= 1.1;
            if (pad.id === "hihat") r *= 0.9;

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
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                
                if (isUserActive) {
                    ctx.strokeStyle = themeSettings.hitNoteColor;
                } else if (isPlaybackActive) {
                    ctx.strokeStyle = '#ffffff';
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
                    ctx.fillStyle = isUserActive ? themeSettings.hitNoteColor : 'rgba(255,255,255,0.25)';
                    ctx.globalAlpha = isUserActive ? 0.4 : 1.0;
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }

                drawIcon(pad.id, cx, cy, r);

                ctx.fillStyle = isActive ? '#ffffff' : '#e2e8f0';
                ctx.font = 'bold 10px "Exo 2", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(pad.name, cx, cy + r + 12);

            });

            const visibleNotes = currentPlaybackData.filter(note => {

                const timeUntilHit = note.timeMs - currentMs;

                return timeUntilHit > -200 && timeUntilHit <= approachDurationMsRef.current;

            });
// Handle hi-hat connection lines (midi 42 - Closed Hi-Hat)
const closedHiHatNotes = visibleNotes.filter(n => n.midi === 42);

closedHiHatNotes.forEach(note => {

    const timeUntilHit = note.timeMs - currentMs;
    const progress = 1 - (timeUntilHit / approachDurationMsRef.current);

    if (progress >= 0 && progress <= 1.2) {

        const hihatPad = DRUM_PADS.find(p => p.id === 'hihat');
        const footPad = DRUM_PADS.find(p => p.id === 'hihat_foot');

        if (hihatPad && footPad) {

            const hx = centerX + (hihatPad.x * dimensions.width - centerX) * layoutScale;
            const hy = centerY + (hihatPad.y * dimensions.height - centerY) * layoutScale;

            const fx = centerX + (footPad.x * dimensions.width - centerX) * layoutScale;
            const fy = centerY + (footPad.y * dimensions.height - centerY) * layoutScale;

            ctx.beginPath();

            ctx.moveTo(hx, hy);
            ctx.lineTo(fx, fy);

            ctx.strokeStyle = `rgba(139,92,246,${progress})`;
            ctx.lineWidth = 2;

            ctx.stroke();

        }

    }

});
            visibleNotes.forEach(note => {

                const pad = MIDI_TO_PAD_MAP.get(note.midi);

                if (!pad) return;

                const timeUntilHit = note.timeMs - currentMs;

                const progress = 1 - (timeUntilHit / approachDurationMsRef.current);

                if (progress >= 0 && progress <= 1.2) {

                    const cx = centerX + (pad.x * dimensions.width - centerX) * layoutScale;
                    const cy = centerY + (pad.y * dimensions.height - centerY) * layoutScale;

                    let maxR = pad.radius * dimensions.height;

                    if (pad.id === "bass") maxR *= 1.4;
                    if (pad.id === "snare") maxR *= 1.2;
                    if (["high_tom", "low_tom", "floor_tom"].includes(pad.id)) maxR *= 1.2;
                    if (["crash", "ride"].includes(pad.id)) maxR *= 1.1;
                    if (pad.id === "hihat") maxR *= 0.9;

                    let currentR: number;

                    if (arDirection === 'reverse') {
                        currentR = Math.max(0.1 * maxR, progress * maxR);
                    } else {
                        currentR = Math.max(maxR, (2 - progress) * maxR);
                    }

                    const opacity = Math.min(1, progress * 2);

                    ctx.beginPath();
                    ctx.arc(cx, cy, currentR, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(34,211,238,${opacity})`;
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

                    let maxR = pad.radius * dimensions.height;
                    // Apply same size adjustments as playback notes
                    if (pad.id === "bass") maxR *= 1.4;
                    if (pad.id === "snare") maxR *= 1.2;
                    if (["high_tom", "low_tom", "floor_tom"].includes(pad.id)) maxR *= 1.2;
                    if (["crash", "ride"].includes(pad.id)) maxR *= 1.1;
                    if (pad.id === "hihat") maxR *= 0.9;

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

    }, [dimensions, drumInputMode, themeSettings]);

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
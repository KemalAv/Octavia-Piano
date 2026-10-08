import React, { useCallback, useRef, useEffect, useMemo, memo, useState } from 'react';
import { PianoKeyDefinition, KeyPosition, ActiveMidiNoteInfo, LayoutDimensions, QwertyLayout } from '../types';
import { PIANO_KEYS_CONFIG, QWERTY_MINI_KEYBOARD_MAPPING, MIRP_KEYBOARD_MAPPING, KEY_CODES_TO_DISPLAY } from '../constants';
import { hexToRgba, lightenHex } from '../utils';

interface PianoKeyboardProps {
  keyPositions: KeyPosition[];
  userSustainedKeys: Set<string>; // Keys actively held by UI
  userActiveKeys: Set<string>; // Keys with timed highlight (e.g., MIDI)
  activeMidiNotesInfo: Map<string, ActiveMidiNoteInfo>;
  onUiKeyPress: (keyName: string, midiNote: number) => void;
  onUiKeyRelease: (keyName: string, midiNote: number) => void;
  rightHandColor: string;
  leftHandColor: string;
  hitNoteColor: string;
  showQwertyShortcuts: boolean;
  qwertyCurrentOctaveShift: number;
  width: number;
  layoutConfig: LayoutDimensions; // Prop for dynamic sizing
  qwertyLayout?: QwertyLayout; // Optional prop for layout type
  mirpTranspose?: number; // Optional prop for MIRP transpose
  isInteractive?: boolean;
  lowDetailMode?: boolean;
  gameplayStyle?: 'piano' | 'computer'; // Optional prop to determine gameplay mode
  waitMode?: string;
  resolutionScale?: number;
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = memo(({
  keyPositions,
  userSustainedKeys,
  userActiveKeys,
  activeMidiNotesInfo,
  onUiKeyPress,
  onUiKeyRelease,
  rightHandColor,
  leftHandColor,
  hitNoteColor,
  showQwertyShortcuts,
  qwertyCurrentOctaveShift = 0,
  width,
  layoutConfig,
  qwertyLayout = 'default',
  mirpTranspose = 0,
  isInteractive = true,
  lowDetailMode = false,
  gameplayStyle = 'piano',
  waitMode = 'strict',
  resolutionScale = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [backgroundCanvas, setBackgroundCanvas] = useState<HTMLCanvasElement | null>(null);

  const keyDefMap = useMemo(() => {
    const map = new Map<string, PianoKeyDefinition>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.name, key));
    return map;
  }, []);

  const activePointers = useRef<Map<number, string>>(new Map()); // <pointerId, keyName>
  const isMouseDownRef = useRef(false);
  const activeMouseKeyRef = useRef<string | null>(null);

  const whiteKeysPos = useMemo(() => keyPositions.filter(kp => kp.type === 'white'), [keyPositions]);
  const blackKeysPos = useMemo(() => keyPositions.filter(kp => kp.type === 'black'), [keyPositions]);

  const totalHeight = layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight;

  // Unified helper to compute QWERTY key label for a key, shared across rendering loops
  const getQwertyShortcut = useCallback((keyDef: PianoKeyDefinition): string => {
    const shouldShow = showQwertyShortcuts || gameplayStyle === 'computer';
    if (!shouldShow) return '';
    if (qwertyLayout === 'mirp') {
      const targetBaseMidi = keyDef.midiNote - mirpTranspose;
      const matching = MIRP_KEYBOARD_MAPPING.filter(m => m.midi === targetBaseMidi);
      if (matching.length > 0) {
        return matching.map(m => {
          const physicalKey = KEY_CODES_TO_DISPLAY[m.code.toLowerCase()] || m.code.replace('Key', '').replace('Digit', '');
          return m.shift ? `⇧${physicalKey}` : physicalKey;
        }).join('/');
      }
    } else {
      const shiftVal = typeof qwertyCurrentOctaveShift === 'number' && !isNaN(qwertyCurrentOctaveShift) ? qwertyCurrentOctaveShift : 0;
      const matching = QWERTY_MINI_KEYBOARD_MAPPING.filter(m => {
        const mappedMidi = m.midiBase + (shiftVal * 12);
        return Number(mappedMidi) === Number(keyDef.midiNote);
      });
      if (matching.length > 0) {
        return matching.map(m => {
          const keyLookup = m.qwertyKey.toLowerCase();
          return KEY_CODES_TO_DISPLAY[keyLookup] || keyLookup.replace('key', '').toUpperCase();
        }).join('/');
      }
    }
    return '';
  }, [showQwertyShortcuts, gameplayStyle, qwertyLayout, mirpTranspose, qwertyCurrentOctaveShift]);

  // Background Caching Effect
  useEffect(() => {
    if (width <= 0 || totalHeight <= 0) return;
    
    const dpr = (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1) * (resolutionScale || 1.0);
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = Math.floor(width * dpr);
    bgCanvas.height = Math.floor(totalHeight * dpr);
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;
    
    bgCtx.scale(dpr, dpr);
    
    const { whiteKeyHeight, blackKeyHeight, keyLabelHeight: labelHeight } = layoutConfig;
    const strokeWidth = 1;

    // 1. Draw Static White Keys
    whiteKeysPos.forEach((kp) => {
      const keyDef = keyDefMap.get(kp.name);
      if (!keyDef) return;

      bgCtx.fillStyle = '#ffffff';
      bgCtx.fillRect(kp.x, 0, kp.width, whiteKeyHeight);

      bgCtx.strokeStyle = '#cbd5e1';
      bgCtx.lineWidth = strokeWidth;
      bgCtx.strokeRect(kp.x + 0.5, 0.5, kp.width - 1, whiteKeyHeight - 0.5);

      const qwertyText = getQwertyShortcut(keyDef);
      if (qwertyText) {
        bgCtx.fillStyle = '#64748b';
        bgCtx.font = 'bold 10px sans-serif';
        bgCtx.textAlign = 'center';
        bgCtx.textBaseline = 'bottom';
        bgCtx.fillText(qwertyText, kp.x + kp.width / 2, whiteKeyHeight - 8);
      }
    });

    // 2. Draw Static Black Keys
    blackKeysPos.forEach((kp) => {
      const keyDef = keyDefMap.get(kp.name);
      if (!keyDef) return;

      bgCtx.fillStyle = '#0f172a';
      bgCtx.fillRect(kp.x, 0, kp.width, blackKeyHeight);

      bgCtx.strokeStyle = '#000000';
      bgCtx.lineWidth = strokeWidth;
      bgCtx.strokeRect(kp.x + 0.5, 0.5, kp.width - 1, blackKeyHeight - 0.5);

      const qwertyText = getQwertyShortcut(keyDef);
      if (qwertyText) {
        bgCtx.save();
        bgCtx.beginPath();
        bgCtx.rect(kp.x, 0, kp.width, blackKeyHeight);
        bgCtx.clip();
        bgCtx.fillStyle = '#94a3b8';
        bgCtx.font = 'bold 8px sans-serif';
        bgCtx.textAlign = 'center';
        bgCtx.textBaseline = 'bottom';
        bgCtx.fillText(qwertyText, kp.x + kp.width / 2, blackKeyHeight - 8);
        bgCtx.restore();
      }
    });

    // 3. Draw Key Label Bar at bottom
    bgCtx.fillStyle = '#f1f5f9';
    bgCtx.fillRect(0, whiteKeyHeight, width, labelHeight);

    bgCtx.strokeStyle = '#cbd5e1';
    bgCtx.lineWidth = 1;
    bgCtx.beginPath();
    bgCtx.moveTo(0, whiteKeyHeight + 0.5);
    bgCtx.lineTo(width, whiteKeyHeight + 0.5);
    bgCtx.stroke();

    whiteKeysPos.forEach((kp) => {
      const keyDef = keyDefMap.get(kp.name);
      if (keyDef?.name === 'C4') {
        bgCtx.fillStyle = '#0f172a';
        bgCtx.font = 'bold 11px sans-serif';
        bgCtx.textAlign = 'center';
        bgCtx.textBaseline = 'middle';
        bgCtx.fillText(keyDef.name, kp.x + kp.width / 2, whiteKeyHeight + labelHeight / 2);
      }
    });

    setBackgroundCanvas(bgCanvas);
  }, [width, totalHeight, layoutConfig, keyPositions, whiteKeysPos, blackKeysPos, keyDefMap, getQwertyShortcut, resolutionScale]);

  // Coordinate lookup for keys
  const getKeyFromClientCoords = useCallback((clientX: number, clientY: number): PianoKeyDefinition | null => {
    const canvas = canvasRef.current;
    if (!canvas || !keyPositions.length) return null;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const scaleX = width / rect.width;
    const scaleY = totalHeight / rect.height;

    const relativeX = (clientX - rect.left) * scaleX;
    const relativeY = (clientY - rect.top) * scaleY;

    if (relativeY < 0 || relativeY > layoutConfig.whiteKeyHeight) return null;

    // Check black keys first (they overlap white keys on top)
    for (const kp of blackKeysPos) {
      if (relativeX >= kp.x && relativeX <= kp.x + kp.width && relativeY <= layoutConfig.blackKeyHeight) {
        return keyDefMap.get(kp.name) || null;
      }
    }

    // Check white keys
    for (const kp of whiteKeysPos) {
      if (relativeX >= kp.x && relativeX <= kp.x + kp.width) {
        return keyDefMap.get(kp.name) || null;
      }
    }

    return null;
  }, [keyPositions, blackKeysPos, whiteKeysPos, keyDefMap, width, totalHeight, layoutConfig]);

  // Main Canvas 2D Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || totalHeight <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = (window.devicePixelRatio || 1) * (resolutionScale || 1.0);
    const targetW = Math.floor(width * dpr);
    const targetH = Math.floor(totalHeight * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, totalHeight);

    // Use Cached Background
    if (backgroundCanvas) {
      ctx.drawImage(backgroundCanvas, 0, 0, width, totalHeight);
    }

    const { whiteKeyHeight, blackKeyHeight } = layoutConfig;
    const strokeWidth = 1;

    // 1. Draw ONLY Active White Keys
    whiteKeysPos.forEach((kp) => {
      const keyDef = keyDefMap.get(kp.name);
      if (!keyDef) return;

      const activeSystemNoteInfo = (waitMode === 'off') ? (activeMidiNotesInfo.get(keyDef.name) || null) : null;
      const isUserPlaying = userSustainedKeys.has(keyDef.name) || userActiveKeys.has(keyDef.name);

      if (!isUserPlaying && !activeSystemNoteInfo) return; // Skip static keys

      let fillColor = '#f8fafc';
      let borderColor = '#cbd5e1';
      let hasGlow = false;
      let glowColor = '';

      if (isUserPlaying) {
        fillColor = hitNoteColor;
        borderColor = '#ffffff';
        hasGlow = !lowDetailMode;
        glowColor = hitNoteColor;
      } else if (activeSystemNoteInfo) {
        const { status } = activeSystemNoteInfo;
        const baseColor = hitNoteColor;

        if (status === 'waiting') {
          fillColor = lightenHex(baseColor, 60);
          borderColor = baseColor;
          hasGlow = !lowDetailMode;
          glowColor = hexToRgba(baseColor, 0.8);
        } else if (status === 'playing' || status === 'user_played') {
          fillColor = baseColor;
          borderColor = '#ffffff';
          hasGlow = !lowDetailMode;
          glowColor = baseColor;
        }
      }

      ctx.save();
      if (hasGlow) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 4;
      }

      ctx.fillStyle = fillColor;
      ctx.fillRect(kp.x, 0, kp.width, whiteKeyHeight);

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = strokeWidth;
      ctx.strokeRect(kp.x + 0.5, 0.5, kp.width - 1, whiteKeyHeight - 0.5);

      ctx.restore();

      const qwertyText = getQwertyShortcut(keyDef);
      if (qwertyText) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(qwertyText, kp.x + kp.width / 2, whiteKeyHeight - 8);
      }

      // Redraw C4 label if active
      if (keyDef.name === 'C4') {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(keyDef.name, kp.x + kp.width / 2, whiteKeyHeight + layoutConfig.keyLabelHeight / 2);
      }
    });

    // 2. Draw ALL Black Keys (to ensure they stay on top of active white keys)
    blackKeysPos.forEach((kp) => {
      const keyDef = keyDefMap.get(kp.name);
      if (!keyDef) return;

      const activeSystemNoteInfo = (waitMode === 'off') ? (activeMidiNotesInfo.get(keyDef.name) || null) : null;
      const isUserPlaying = userSustainedKeys.has(keyDef.name) || userActiveKeys.has(keyDef.name);

      let fillColor = '#0f172a';
      let borderColor = '#000000';
      let qwertyColor = '#94a3b8';
      let hasGlow = false;
      let glowColor = '';

      if (isUserPlaying) {
        fillColor = hitNoteColor;
        borderColor = '#ffffff';
        qwertyColor = '#ffffff';
        hasGlow = !lowDetailMode;
        glowColor = hitNoteColor;
      } else if (activeSystemNoteInfo) {
        const { status } = activeSystemNoteInfo;
        const baseColor = hitNoteColor;
        qwertyColor = '#ffffff';

        if (status === 'waiting') {
          fillColor = baseColor;
          borderColor = baseColor;
          hasGlow = !lowDetailMode;
          glowColor = hexToRgba(baseColor, 0.8);
        } else if (status === 'playing' || status === 'user_played') {
          fillColor = baseColor;
          borderColor = '#ffffff';
          hasGlow = !lowDetailMode;
          glowColor = baseColor;
        }
      }

      ctx.save();
      if (hasGlow) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 4;
      }

      ctx.fillStyle = fillColor;
      ctx.fillRect(kp.x, 0, kp.width, blackKeyHeight);

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = strokeWidth;
      ctx.strokeRect(kp.x + 0.5, 0.5, kp.width - 1, blackKeyHeight - 0.5);

      ctx.restore();

      const qwertyText = getQwertyShortcut(keyDef);
      if (qwertyText) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(kp.x, 0, kp.width, blackKeyHeight);
        ctx.clip();
        ctx.fillStyle = qwertyColor;
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(qwertyText, kp.x + kp.width / 2, blackKeyHeight - 8);
        ctx.restore();
      }
    });

    ctx.restore();
  }, [
    keyPositions,
    whiteKeysPos,
    blackKeysPos,
    keyDefMap,
    userSustainedKeys,
    userActiveKeys,
    activeMidiNotesInfo,
    getQwertyShortcut,
    width,
    totalHeight,
    layoutConfig,
    rightHandColor,
    leftHandColor,
    hitNoteColor,
    lowDetailMode,
    backgroundCanvas,
    waitMode
  ]);

  // Pointer Interaction Handlers
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInteractive) return;
    e.preventDefault();
    const keyDef = getKeyFromClientCoords(e.clientX, e.clientY);
    if (keyDef) {
      activePointers.current.set(e.pointerId, keyDef.name);
      onUiKeyPress(keyDef.name, keyDef.midiNote);
    }
  }, [isInteractive, getKeyFromClientCoords, onUiKeyPress]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInteractive) return;
    const oldKeyName = activePointers.current.get(e.pointerId);
    if (!oldKeyName) return;

    e.preventDefault();
    const newKeyDef = getKeyFromClientCoords(e.clientX, e.clientY);
    const newKeyName = newKeyDef ? newKeyDef.name : null;

    if (oldKeyName !== newKeyName) {
      if (oldKeyName) {
        const oldKeyDef = keyDefMap.get(oldKeyName);
        if (oldKeyDef) onUiKeyRelease(oldKeyDef.name, oldKeyDef.midiNote);
      }
      if (newKeyDef) {
        onUiKeyPress(newKeyDef.name, newKeyDef.midiNote);
        activePointers.current.set(e.pointerId, newKeyDef.name);
      } else {
        activePointers.current.delete(e.pointerId);
      }
    }
  }, [isInteractive, getKeyFromClientCoords, keyDefMap, onUiKeyPress, onUiKeyRelease]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInteractive) return;
    e.preventDefault();
    const keyName = activePointers.current.get(e.pointerId);
    if (keyName) {
      const keyDef = keyDefMap.get(keyName);
      if (keyDef) onUiKeyRelease(keyDef.name, keyDef.midiNote);
      activePointers.current.delete(e.pointerId);
    }
  }, [isInteractive, keyDefMap, onUiKeyRelease]);

  if (keyPositions.length === 0 || width === 0) {
    return null;
  }

  return (
    <div
      className="relative shadow-md no-select bg-slate-800"
      style={{
        width: `${width}px`,
        height: `${totalHeight}px`,
      }}
      role="application"
      aria-label="Interactive Piano Keyboard"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          width: `${width}px`,
          height: `${totalHeight}px`,
          display: 'block',
          touchAction: 'none',
        }}
      />
    </div>
  );
});

export default React.memo(PianoKeyboard);

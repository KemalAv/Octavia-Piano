import { PianoKeyDefinition, PianoKeyType, QwertyKeyMapEntry, ViewMode, NoteLabelType, ThemeSettings, DevicePreset, LayoutDimensions, MirpKeyMapEntry } from './types';

// Admin UUID - IMPORTANT: Replace with the actual UUID of your admin user in Supabase
// You can find your user's UUID in the Supabase Auth -> Users table.
export const ADMIN_UUID = '9701e6dc-05de-40f3-81e7-54da7b9d8ba'; 

// --- Dynamic Scaling Ratios ---
export const BLACK_KEY_WIDTH_RATIO = 0.58; // Black key width as a ratio of its associated white key width.
export const BLACK_KEY_OFFSET_RATIO = 0.60; // Offset of black key start from its associated white key start, as a ratio of white key width.
// --- End Dynamic Scaling Ratios ---

// --- Fixed Heights (for now) ---
// These are kept as base/desktop defaults, but application logic will usually prefer the DEVICE_LAYOUTS values.
export const WHITE_KEY_HEIGHT_PX = 130;
export const BLACK_KEY_HEIGHT_PX = 85;
export const KEY_LABEL_AREA_HEIGHT_PX = 25;
export const PROGRESS_BAR_HEIGHT_PX = 8; // Thinner progress bar
export const PLAY_LINE_THICKNESS_PX = 6; // Thickness of the visual play/target line
// --- End Fixed Heights ---

// --- Device Layout Presets ---

/**
 * Calculates the number of white keys for a given total number of keys.
 * Uses hardcoded values for common keyboard sizes for accuracy, as start notes can vary.
 * Falls back to a chromatic scale calculation assuming a 'C' start for non-standard sizes.
 */
const getWhiteKeyCount = (totalKeys: number): number => {
  switch (totalKeys) {
    case 88: return 52; // Standard 88-key (A0-C8)
    case 76: return 45; // Common 76-key (E1-G7)
    case 61: return 36; // Standard 61-key (C2-C7)
    case 49: return 29; // Standard 49-key (C2-C6)
    case 25: return 15; // Standard 25-key (C3-C5)
    default:
      // Fallback for non-standard sizes, assuming a C-start chromatic scale.
      const KEY_TYPES_CHROMATIC: PianoKeyType[] = ['white', 'black', 'white', 'black', 'white', 'white', 'black', 'white', 'black', 'white', 'black', 'white'];
      if (totalKeys <= 0) return 0;
      let count = 0;
      for (let i = 0; i < totalKeys; i++) {
        if (KEY_TYPES_CHROMATIC[i % 12] === 'white') {
          count++;
        }
      }
      return count;
  }
};

/**
 * Calculates the scaled width of a white key based on the total number of keys,
 * maintaining the aspect ratio relative to a standard 88-key piano.
 */
const getScaledWhiteKeyWidth = (totalKeys: number, baseWidth88: number): number => {
  const baseWhiteKeys = 52; // White keys on a standard 88-key piano.
  const currentWhiteKeys = getWhiteKeyCount(totalKeys);
  if (currentWhiteKeys <= 0) return baseWidth88;
  return (baseWidth88 * baseWhiteKeys) / currentWhiteKeys;
};

/**
 * Generates device layout dimensions with a dynamically calculated minWhiteKeyWidth.
 * This ensures the piano keyboard stretches proportionally for any number of keys.
 * @param totalKeys The total number of keys on the keyboard.
 * @returns A record of layout dimensions for each device preset.
 */
export const DEVICE_LAYOUTS = (totalKeys: number): Record<DevicePreset, LayoutDimensions> => {
  const whiteWidthDesktop = getScaledWhiteKeyWidth(totalKeys, 24.5);
  const whiteWidthTablet = getScaledWhiteKeyWidth(totalKeys, 19.5);
  const whiteWidthPhone = getScaledWhiteKeyWidth(totalKeys, 7.5);

  return {
    desktop: {
      whiteKeyHeight: 140,
      blackKeyHeight: 90,
      keyLabelHeight: 25,
      minWhiteKeyWidth: whiteWidthDesktop,
    },
    tablet: {
      whiteKeyHeight: 150,
      blackKeyHeight: 100,
      keyLabelHeight: 100,
      minWhiteKeyWidth: whiteWidthTablet,
    },
    phone: {
      whiteKeyHeight: 90,
      blackKeyHeight: 50,
      keyLabelHeight: 100,
      minWhiteKeyWidth: whiteWidthPhone,
    },
    custom: { // Provide a default calculation for custom, which can be overridden by user state.
      whiteKeyHeight: 130,
      blackKeyHeight: 83,
      keyLabelHeight: 25,
      minWhiteKeyWidth: getScaledWhiteKeyWidth(totalKeys, 22.8),
    },
  };
};


export const INTERACTIVE_NOTE_DURATION_MS = 300;
export const ACTIVE_KEY_HIGHLIGHT_DURATION_MS = 200;

// --- Falling Notes Constants ---
export const BASE_PIXELS_PER_MILLISECOND = 0.15; // Base speed, will be multiplied by zoomLevel
export const VISUAL_NOTE_CAP_MS = 200; // Cap duration for visual "major note" style
// VIEWABLE_DURATION_MS is calculated in FallingNotesArea.tsx based on its actual height & actual PPM
// --- End Falling Notes Constants ---

export const HAND_SPLIT_MIDI_NOTE = 60; // C4

// Glow effect colors (used in inline styles with box-shadow)
// These are rgba strings or theme-compatible strings for Tailwind JIT
export const USER_GLOW_SHADOW = '0 0 16px 5px rgba(250, 204, 21, 0.7)'; // Yellow glow

// NEW: System and User Play Colors for consistent theming
export const SYSTEM_PLAY_COLOR = '#8B5CF6'; // A slightly brighter violet-500 for system playback (matches Tailwind violet-500)
export const USER_PLAY_COLOR = '#F59E0B';   // A richer amber-500 for user playback (matches Tailwind amber-500)


export const CHORD_RECOGNITION_WINDOW_MS = 30; // Milliseconds to wait for subsequent notes in a chord

// Use flat notation for black keys as it's more common and soundfont files exist for them.
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEY_TYPES: PianoKeyType[] = ['white', 'black', 'white', 'black', 'white', 'white', 'black', 'white', 'black', 'white', 'black', 'white'];

const generatePianoKeys = (): PianoKeyDefinition[] => {
  const keys: PianoKeyDefinition[] = [];
  const startMidiNote = 21; // A0
  const endMidiNote = 108;  // C8

  for (let midiNote = startMidiNote; midiNote <= endMidiNote; midiNote++) {
    const noteIndexInOctave = midiNote % 12;
    const octave = Math.floor(midiNote / 12) -1;
    const noteNameInOctave = NOTE_NAMES[noteIndexInOctave];
    const keyType = KEY_TYPES[noteIndexInOctave];
    const keyId = `${noteNameInOctave}${octave}`;

    keys.push({
      id: keyId,
      name: keyId,
      displayName: noteNameInOctave,
      type: keyType,
      midiNote: midiNote,
    });
  }
  return keys;
};

export const PIANO_KEYS_CONFIG: PianoKeyDefinition[] = generatePianoKeys();


// --- QWERTY Mini Keyboard Constants ---
// This mapping uses `event.code.toLowerCase()` to be independent of keyboard language layouts.
// It combines two user-requested mappings into a single functional layout.
export const QWERTY_MINI_KEYBOARD_MAPPING: QwertyKeyMapEntry[] = [
  // --- Mapping 1 (Lower keyboard, C3-G4 range) ---
  { qwertyKey: 'shiftleft', midiBase: 48 },   // C3
  { qwertyKey: 'keya', midiBase: 49 },        // C#3
  { qwertyKey: 'keyz', midiBase: 50 },        // D3
  { qwertyKey: 'keys', midiBase: 51 },        // D#3
  { qwertyKey: 'keyx', midiBase: 52 },        // E3
  { qwertyKey: 'keyc', midiBase: 53 },        // F3
  { qwertyKey: 'keyf', midiBase: 54 },        // F#3
  { qwertyKey: 'keyv', midiBase: 55 },        // G3
  { qwertyKey: 'keyg', midiBase: 56 },        // G#3
  { qwertyKey: 'keyb', midiBase: 57 },        // A3
  { qwertyKey: 'keyh', midiBase: 58 },        // A#3
  { qwertyKey: 'keyn', midiBase: 59 },        // B3
  { qwertyKey: 'keym', midiBase: 60 },        // C4
  { qwertyKey: 'keyk', midiBase: 61 },        // C#4
  { qwertyKey: 'comma', midiBase: 62 },       // D4
  { qwertyKey: 'keyl', midiBase: 63 },        // D#4
  { qwertyKey: 'period', midiBase: 64 },      // E4
  { qwertyKey: 'slash', midiBase: 65 },       // F4
  { qwertyKey: 'quote', midiBase: 66 },       // F#4
  { qwertyKey: 'shiftright', midiBase: 67 },  // G4

  // --- Mapping 2 (Upper keyboard, C4-C6 range) ---
  { qwertyKey: 'tab', midiBase: 60 },         // C4
  { qwertyKey: 'digit1', midiBase: 61 },      // C#4
  { qwertyKey: 'keyq', midiBase: 62 },        // D4
  { qwertyKey: 'digit2', midiBase: 63 },      // D#4
  { qwertyKey: 'keyw', midiBase: 64 },        // E4
  { qwertyKey: 'keye', midiBase: 65 },        // F4
  { qwertyKey: 'digit4', midiBase: 66 },      // F#4
  { qwertyKey: 'keyr', midiBase: 67 },        // G4
  { qwertyKey: 'digit5', midiBase: 68 },      // G#4
  { qwertyKey: 'keyt', midiBase: 69 },        // A4
  { qwertyKey: 'digit6', midiBase: 70 },      // A#4
  { qwertyKey: 'keyy', midiBase: 71 },        // B4
  { qwertyKey: 'keyu', midiBase: 72 },        // C5
  { qwertyKey: 'digit8', midiBase: 73 },      // C#5
  { qwertyKey: 'keyi', midiBase: 74 },        // D5
  { qwertyKey: 'digit9', midiBase: 75 },      // D#5
  { qwertyKey: 'keyo', midiBase: 76 },        // E5
  { qwertyKey: 'keyp', midiBase: 77 },        // F5
  { qwertyKey: 'minus', midiBase: 78 },       // F#5
  { qwertyKey: 'bracketleft', midiBase: 79 }, // G5
  { qwertyKey: 'equal', midiBase: 80 },       // G#5
  { qwertyKey: 'bracketright', midiBase: 81 },// A5
  { qwertyKey: 'backspace', midiBase: 82 },   // A#5
  { qwertyKey: 'backslash', midiBase: 83 },   // B5
  { qwertyKey: 'enter', midiBase: 84 },       // C6
];

// NEW: MIRP QWERTY Layout Mapping (C2 - C7)
// Uses `code` instead of `key` to be layout-independent, but checks `shift` state.
export const MIRP_KEYBOARD_MAPPING: MirpKeyMapEntry[] = [
  // C2 - B2
  { code: 'Digit1', shift: false, midi: 36, label: '1' },
  { code: 'Digit1', shift: true, midi: 37, label: '!' },
  { code: 'Digit2', shift: false, midi: 38, label: '2' },
  { code: 'Digit2', shift: true, midi: 39, label: '@' },
  { code: 'Digit3', shift: false, midi: 40, label: '3' },
  { code: 'Digit4', shift: false, midi: 41, label: '4' },
  { code: 'Digit4', shift: true, midi: 42, label: '$' },
  { code: 'Digit5', shift: false, midi: 43, label: '5' },
  { code: 'Digit5', shift: true, midi: 44, label: '%' },
  { code: 'Digit6', shift: false, midi: 45, label: '6' },
  { code: 'Digit6', shift: true, midi: 46, label: '^' },
  { code: 'Digit7', shift: false, midi: 47, label: '7' },

  // C3 - B3
  { code: 'Digit8', shift: false, midi: 48, label: '8' },
  { code: 'Digit8', shift: true, midi: 49, label: '*' },
  { code: 'Digit9', shift: false, midi: 50, label: '9' },
  { code: 'Digit9', shift: true, midi: 51, label: '(' },
  { code: 'Digit0', shift: false, midi: 52, label: '0' },
  { code: 'KeyQ', shift: false, midi: 53, label: 'q' },
  { code: 'KeyQ', shift: true, midi: 54, label: 'Q' },
  { code: 'KeyW', shift: false, midi: 55, label: 'w' },
  { code: 'KeyW', shift: true, midi: 56, label: 'W' },
  { code: 'KeyE', shift: false, midi: 57, label: 'e' },
  { code: 'KeyE', shift: true, midi: 58, label: 'E' },
  { code: 'KeyR', shift: false, midi: 59, label: 'r' },

  // C4 - B4
  { code: 'KeyT', shift: false, midi: 60, label: 't' },
  { code: 'KeyT', shift: true, midi: 61, label: 'T' },
  { code: 'KeyY', shift: false, midi: 62, label: 'y' },
  { code: 'KeyY', shift: true, midi: 63, label: 'Y' },
  { code: 'KeyU', shift: false, midi: 64, label: 'u' },
  { code: 'KeyI', shift: false, midi: 65, label: 'i' },
  { code: 'KeyI', shift: true, midi: 66, label: 'I' },
  { code: 'KeyO', shift: false, midi: 67, label: 'o' },
  { code: 'KeyO', shift: true, midi: 68, label: 'O' },
  { code: 'KeyP', shift: false, midi: 69, label: 'p' },
  { code: 'KeyP', shift: true, midi: 70, label: 'P' },
  { code: 'KeyA', shift: false, midi: 71, label: 'a' },

  // C5 - B5
  { code: 'KeyS', shift: false, midi: 72, label: 's' },
  { code: 'KeyS', shift: true, midi: 73, label: 'S' },
  { code: 'KeyD', shift: false, midi: 74, label: 'd' },
  { code: 'KeyD', shift: true, midi: 75, label: 'D' },
  { code: 'KeyF', shift: false, midi: 76, label: 'f' },
  { code: 'KeyG', shift: false, midi: 77, label: 'g' },
  { code: 'KeyG', shift: true, midi: 78, label: 'G' },
  { code: 'KeyH', shift: false, midi: 79, label: 'h' },
  { code: 'KeyH', shift: true, midi: 80, label: 'H' },
  { code: 'KeyJ', shift: false, midi: 81, label: 'j' },
  { code: 'KeyJ', shift: true, midi: 82, label: 'J' },
  { code: 'KeyK', shift: false, midi: 83, label: 'k' },

  // C6 - B6
  { code: 'KeyL', shift: false, midi: 84, label: 'l' },
  { code: 'KeyL', shift: true, midi: 85, label: 'L' },
  { code: 'KeyZ', shift: false, midi: 86, label: 'z' },
  { code: 'KeyZ', shift: true, midi: 87, label: 'Z' },
  { code: 'KeyX', shift: false, midi: 88, label: 'x' },
  { code: 'KeyC', shift: false, midi: 89, label: 'c' },
  { code: 'KeyC', shift: true, midi: 90, label: 'C' },
  { code: 'KeyV', shift: false, midi: 91, label: 'v' },
  { code: 'KeyV', shift: true, midi: 92, label: 'V' },
  { code: 'KeyB', shift: false, midi: 93, label: 'b' },
  { code: 'KeyB', shift: true, midi: 94, label: 'B' },
  { code: 'KeyN', shift: false, midi: 95, label: 'n' },

  // C7
  { code: 'KeyM', shift: false, midi: 96, label: 'm' },
];

export const OCTAVE_DOWN_KEYS = ['arrowdown'];
export const OCTAVE_UP_KEYS = ['arrowup'];


// These represent a shift from the *base* octave defined in QWERTY_MINI_KEYBOARD_MAPPING
export const DEFAULT_QWERTY_OCTAVE_SHIFT = 0; 
// MIN_QWERTY_OCTAVE_SHIFT: C4 (MIDI 60) + (-3 * 12) = MIDI 24 (C1), which is within piano range (starts at A0/MIDI 21).
export const MIN_QWERTY_OCTAVE_SHIFT = -3; 
// MAX_QWERTY_OCTAVE_SHIFT: C6 (MIDI 84) + (2 * 12) = MIDI 108 (C8), which is the top of the piano range.
export const MAX_QWERTY_OCTAVE_SHIFT = 2; 
// --- End QWERTY Mini Keyboard Constants ---

// --- Default Settings Constants ---
export const DEFAULT_MASTER_VOLUME = 0.5;
export const DEFAULT_METRONOME_VOLUME = 0.5;
export const DEFAULT_VIEW_MODE: ViewMode = 'falling';
export const DEFAULT_NOTE_LABEL_TYPE: NoteLabelType = 'qwerty'; // Updated to 'qwerty'
export const DEFAULT_SHOW_ONLY_MAJOR_NOTES = false;
export const DEFAULT_SHOW_QWERTY_SHORTCUTS = true;
export const DEFAULT_HIDE_BAR_NAVIGATION_BUTTONS = true;
export const DEFAULT_AUTO_HIDE_TOP_BAR = false;
export const DEFAULT_SHOW_PIANO_TILES_BACKGROUND = false; // New Default
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  rightHandColor: '#A855F7', // purple-500
  leftHandColor: '#3B82F6',  // blue-500
  fallingNotesBackgroundColor: '#000000',
};
// --- End Default Settings Constants ---

// --- Key Code Display Mapping ---
export const KEY_CODES_TO_DISPLAY: { [key: string]: string } = {
  'tab': '⇥', 'digit1': '1', 'keyq': 'Q', 'digit2': '2', 'keyw': 'W', 'keye': 'E', 'digit4': '4', 'keyr': 'R', 'digit5': '5', 'keyt': 'T', 'digit6': '6', 'keyy': 'Y',
  'keyu': 'U', 'digit8': '8', 'keyi': 'I', 'digit9': '9', 'keyo': 'O', 'keyp': 'P', 'minus': '-', 'bracketleft': '[', 'equal': '=', 'bracketright': ']', 'backspace': '⌫', 'backslash': '\\', 'enter': '⏎',
  'shiftleft': 'L ⇧', 'keya': 'A', 'keyz': 'Z', 'keys': 'S', 'keyx': 'X', 'keyc': 'C', 'keyf': 'F', 'keyv': 'V', 'keyg': 'G', 'keyb': 'B', 'keyh': 'H', 'keyn': 'N',
  'keym': 'M', 'keyk': 'K', 'comma': ',', 'keyl': 'L', 'period': '.', 'slash': '/', 'quote': "'", 'shiftright': 'R ⇧',
};

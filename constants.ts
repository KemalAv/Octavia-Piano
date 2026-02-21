
import { PianoKeyDefinition, PianoKeyType, QwertyKeyMapEntry, ViewMode, NoteLabelType, ThemeSettings, DevicePreset, LayoutDimensions, MirpKeyMapEntry, DrumPadConfig } from './types';

// Admin UUID - IMPORTANT: Replace with the actual UUID of your admin user in Supabase
// You can find your user's UUID in the Supabase Auth -> Users table.
// FIX: Corrected typo in UUID.
export const ADMIN_UUID = '9701e6dc-05de-40f3-81e7-54da7b9d8b9a'; 

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
  const whiteWidthTablet = getScaledWhiteKeyWidth(totalKeys, 24.5);

  return {
    desktop: {
      whiteKeyHeight: 140,
      blackKeyHeight: 91,
      keyLabelHeight: 25,
      minWhiteKeyWidth: whiteWidthDesktop,
    },
    tablet: {
      whiteKeyHeight: 240,
      blackKeyHeight: 156,
      keyLabelHeight: 25,
      minWhiteKeyWidth: whiteWidthTablet,
    },
    // @FIX: Add layouts for 'phone' and 'custom' to match the updated DevicePreset type.
    phone: {
      whiteKeyHeight: 160,
      blackKeyHeight: 110,
      keyLabelHeight: 85,
      minWhiteKeyWidth: getScaledWhiteKeyWidth(totalKeys, 16),
    },
    custom: { // Fallback for custom to prevent runtime errors. Custom dimensions are handled in App state.
      whiteKeyHeight: 140,
      blackKeyHeight: 90,
      keyLabelHeight: 25,
      minWhiteKeyWidth: whiteWidthDesktop,
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
export const USER_GLOW_SHADOW = '0 0 16px 5px rgb(245, 158, 11)'; // Yellow glow

// NEW: System and User Play Colors for consistent theming
export const SYSTEM_PLAY_COLOR = '#8B5CF6'; // A slightly brighter violet-500 for system playback (matches Tailwind violet-500)
export const USER_PLAY_COLOR = 'rgb(245, 158, 11)';   // A richer amber-500 for user playback (matches Tailwind amber-500)


export const CHORD_RECOGNITION_WINDOW_MS = 30; // Milliseconds to wait for subsequent notes in a chord
export const FREE_PLAY_ARPEGGIO_WINDOW_MS = 1500; // Window for arpeggio detection in Free Play

// Use flat notation for black keys as it's more common and soundfont files exist for them.
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEY_TYPES: PianoKeyType[] = ['white', 'black', 'white', 'black', 'white', 'white', 'black', 'white', 'black', 'white', 'black', 'white'];

// Fix: Changed function to return PianoKeyDefinition[] instead of PianoKeyDefinition
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

export const DRUM_SOUND_MAP: Record<number, string> = {
  35: 'bass.mp3',
  36: 'bass.mp3',
  37: 'snare drum.mp3',
  38: 'snare drum.mp3',
  39: 'snare drum.mp3', // Hand Clap
  40: 'snare drum.mp3',
  41: 'floor tom.mp3',
  42: 'Hi-hat (closed).mp3',
  43: 'floor tom.mp3',
  44: 'Hi-hat (foot).mp3',
  45: 'low tom-tom.mp3',
  46: 'Hi-hat (open).mp3',
  47: 'low tom-tom.mp3',
  48: 'high tom-tom.mp3',
  49: 'Crash cymbal.mp3',
  50: 'high tom-tom.mp3',
  51: 'Ride cymbal.mp3',
  52: 'Crash cymbal.mp3',
  53: 'Ride cymbal.mp3',
  54: 'Hi-hat (closed).mp3', // Tambourine
  55: 'Crash cymbal.mp3',
  56: 'Hi-hat (closed).mp3', // Cowbell
  57: 'Crash cymbal.mp3',
  58: 'Hi-hat (closed).mp3', // Vibraslap
  59: 'Ride cymbal.mp3',
  60: 'high tom-tom.mp3', // Hi Bongo
  61: 'low tom-tom.mp3', // Low Bongo
  62: 'high tom-tom.mp3', // Mute Hi Conga
  63: 'high tom-tom.mp3', // Open Hi Conga
  64: 'low tom-tom.mp3', // Low Conga
  65: 'high tom-tom.mp3', // High Timbale
  66: 'low tom-tom.mp3', // Low Timbale
  67: 'high tom-tom.mp3', // High Agogo
  68: 'low tom-tom.mp3', // Low Agogo
  69: 'Hi-hat (closed).mp3', // Cabasa
  70: 'Hi-hat (closed).mp3', // Maracas
  71: 'Hi-hat (closed).mp3', // Short Whistle
  72: 'Hi-hat (closed).mp3', // Long Whistle
  73: 'Hi-hat (closed).mp3', // Short Guiro
  74: 'Hi-hat (closed).mp3', // Long Guiro
  75: 'Hi-hat (closed).mp3', // Claves
  76: 'Hi-hat (closed).mp3', // Hi Wood Block
  77: 'Hi-hat (closed).mp3', // Low Wood Block
  78: 'Hi-hat (closed).mp3', // Mute Cuica
  79: 'Hi-hat (closed).mp3', // Open Cuica
  80: 'Hi-hat (closed).mp3', // Mute Triangle
  81: 'Hi-hat (closed).mp3', // Open Triangle
};

export const DRUM_PRIMARY_MIDI_MAP: Record<number, number> = {
  35: 36, // Bass
  36: 36,
  37: 38, // Snare
  38: 38,
  39: 38, // Hand Clap -> Snare
  40: 38,
  41: 41, // Floor Tom
  43: 41,
  42: 42, // Hi-hat closed
  44: 44, // Hi-hat foot
  45: 45, // Low tom
  47: 45,
  61: 45, // Low Bongo -> Low Tom
  64: 45, // Low Conga -> Low Tom
  66: 45, // Low Timbale -> Low Tom
  68: 45, // Low Agogo -> Low Tom
  46: 46, // Hi-hat open
  48: 48, // High tom
  50: 48,
  60: 48, // Hi Bongo -> High Tom
  62: 48, // Mute Hi Conga -> High Tom
  63: 48, // Open Hi Conga -> High Tom
  65: 48, // High Timbale -> High Tom
  67: 48, // High Agogo -> High Tom
  49: 49, // Crash
  52: 49,
  55: 49,
  57: 49,
  51: 51, // Ride
  53: 51,
  59: 51,
  54: 42, // Percussion (Tambourine) -> Hi-hat
  56: 42, // Cowbell -> Hi-hat
  58: 42, // Vibraslap -> Hi-hat
  69: 42, // Cabasa -> Hi-hat
  70: 42, // Maracas -> Hi-hat
  71: 42, // Short Whistle -> Hi-hat
  72: 42, // Long Whistle -> Hi-hat
  73: 42, // Short Guiro -> Hi-hat
  74: 42, // Long Guiro -> Hi-hat
  75: 42, // Claves -> Hi-hat
  76: 42, // Hi Wood Block -> Hi-hat
  77: 42, // Low Wood Block -> Hi-hat
  78: 42, // Mute Cuica -> Hi-hat
  79: 42, // Open Cuica -> Hi-hat
  80: 42, // Mute Triangle -> Hi-hat
  81: 42, // Open Triangle -> Hi-hat
};

export const DRUM_KEYS_CONFIG: PianoKeyDefinition[] = [
  { id: 'crash', name: 'Crash cymbal.mp3', displayName: 'Crash', type: 'white', midiNote: 49 },
  { id: 'ride', name: 'Ride cymbal.mp3', displayName: 'Ride', type: 'white', midiNote: 51 },
  { id: 'high_tom', name: 'high tom-tom.mp3', displayName: 'High Tom', type: 'white', midiNote: 48 },
  { id: 'low_tom', name: 'low tom-tom.mp3', displayName: 'Low Tom', type: 'white', midiNote: 45 },
  { id: 'floor_tom', name: 'floor tom-tom.mp3', displayName: 'Floor Tom', type: 'white', midiNote: 41 },
  { id: 'snare', name: 'snare drum.mp3', displayName: 'Snare', type: 'white', midiNote: 38 },
  { id: 'hihat_open', name: 'Hi-hat (open).mp3', displayName: 'Hi-Hat Open', type: 'white', midiNote: 46 },
  { id: 'hihat_closed', name: 'Hi-hat (closed).mp3', displayName: 'Hi-Hat Closed', type: 'white', midiNote: 42 },
  { id: 'hihat_foot', name: 'Hi-hat (foot).mp3', displayName: 'Hi-Hat Foot', type: 'white', midiNote: 44 },
  { id: 'bass', name: 'bass.mp3', displayName: 'Bass Drum', type: 'white', midiNote: 36 },
];

export const DRUM_KEYBOARD_MAP: Record<string, number> = {
  'b': 36, 'n': 36, // bass
  'f': 38, 'g': 38, // snare
  't': 48, 'y': 48, // high tom
  'u': 45, 'i': 45, // low tom
  'j': 41, 'k': 41, // floor tom
  'c': 44, 'v': 44, // hihat foot
  's': 42, 'd': 42, // hihat
  'e': 49, 'r': 49, // crash
  'o': 51, 'p': 51, // ride
};

export const DRUM_PADS: DrumPadConfig[] = [
    { id: 'bass', name: 'BASS DRUM', midiNotes: [35, 36], x: 0.55, y: 0.75, radius: 0.15 },
    { id: 'snare', name: 'SNARE DRUM', midiNotes: [38, 40, 37, 39], x: 0.35, y: 0.55, radius: 0.1 },
    { id: 'hihat', name: 'HIT HAT', midiNotes: [42, 46, 54, 56, 58, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81], x: 0.15, y: 0.5, radius: 0.12 },
    { id: 'hihat_foot', name: 'HIT HAT FOOT', midiNotes: [44], x: 0.35, y: 0.85, radius: 0.08 },
    { id: 'high_tom', name: 'HIGH TOM', midiNotes: [50, 48, 60, 62, 63, 65, 67], x: 0.45, y: 0.3, radius: 0.1 },
    { id: 'low_tom', name: 'LOW TOM', midiNotes: [47, 45, 61, 64, 66, 68], x: 0.65, y: 0.3, radius: 0.1 },
    { id: 'floor_tom', name: 'FLOOR TOM', midiNotes: [43, 41], x: 0.75, y: 0.55, radius: 0.1 },
    { id: 'crash', name: 'CRASH CYMBAL', midiNotes: [49, 57, 52, 55], x: 0.25, y: 0.2, radius: 0.12 },
    { id: 'ride', name: 'RIDE CYMBAL', midiNotes: [51, 53, 59], x: 0.85, y: 0.2, radius: 0.12 },
];

export const DRUM_MIDI_TO_NAME_MAP: Record<number, string> = {};
DRUM_PADS.forEach(pad => {
  pad.midiNotes.forEach(note => {
    DRUM_MIDI_TO_NAME_MAP[note] = pad.name;
  });
});


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
export const DEFAULT_NOTE_TOLERANCE = 200;
export const DEFAULT_MASTER_VOLUME = 0.5;
export const DEFAULT_METRONOME_VOLUME = 0.5;
export const DEFAULT_MP3_VOLUME = 0.5; // NEW: Default MP3 volume
export const DEFAULT_VIEW_MODE: ViewMode = 'falling';
export const DEFAULT_NOTE_LABEL_TYPE: NoteLabelType = 'none'; // Updated to 'none'
export const DEFAULT_SHOW_ONLY_MAJOR_NOTES = false;
export const DEFAULT_SHOW_QWERTY_SHORTCUTS = false;
export const DEFAULT_HIDE_BAR_NAVIGATION_BUTTONS = false; // CHANGED: Always show bar nav buttons by default
export const DEFAULT_SHOW_PIANO_TILES_BACKGROUND = true; // New Default
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  rightHandColor: '#a000ff',
  leftHandColor: '#007dff',  
  fallingNotesBackgroundColor: '#1c2636',
  hitNoteColor: '#f59e0b', // Amber-500
  backgroundUrl: '/wallpaper.jpg',
  backgroundOpacity: 0.25,
};
// --- End Default Settings Constants ---

// --- Key Code Display Mapping ---
export const KEY_CODES_TO_DISPLAY: { [key: string]: string } = {
  'tab': '⇥', 'digit1': '1', 'keyq': 'Q', 'digit2': '2', 'keyw': 'W', 'keye': 'E', 'digit4': '4', 'keyr': 'R', 'digit5': '5', 'keyt': 'T', 'digit6': '6', 'keyy': 'Y',
  'keyu': 'U', 'digit8': '8', 'keyi': 'I', 'digit9': '9', 'keyo': 'O', 'keyp': 'P', 'minus': '-', 'bracketleft': '[', 'equal': '=', 'bracketright': ']', 'backspace': '⌫', 'backslash': '\\', 'enter': '⏎',
  'shiftleft': 'L ⇧', 'keya': 'A', 'keyz': 'Z', 'keys': 'S', 'keyx': 'X', 'keyc': 'C', 'keyf': 'F', 'keyv': 'V', 'keyg': 'G', 'keyb': 'B', 'keyh': 'H', 'keyn': 'N',
  'keym': 'M', 'keyk': 'K', 'comma': ',', 'keyl': 'L', 'period': '.', 'slash': '/', 'quote': "'", 'shiftright': 'R ⇧',
};

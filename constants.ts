import { PianoKeyDefinition, PianoKeyType, QwertyKeyMapEntry, ViewMode, NoteLabelType, ThemeSettings, DevicePreset, LayoutDimensions } from './types';

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
export const DEVICE_LAYOUTS: Record<DevicePreset, LayoutDimensions> = {
  desktop: {
    whiteKeyHeight: 140,
    blackKeyHeight: 90,
    keyLabelHeight: 25,
    minWhiteKeyWidth: 24.5,
  },
  tablet: {
    whiteKeyHeight: 170,
    blackKeyHeight: 110,
    keyLabelHeight: 75,
    minWhiteKeyWidth: 19.5,
  },
  phone: {
    whiteKeyHeight: 70,
    blackKeyHeight: 35,
    keyLabelHeight: 75,
    minWhiteKeyWidth: 19.5,
  },
  // FIX: Add 'custom' preset to satisfy the Record<DevicePreset, LayoutDimensions> type.
  // Its values will be dynamically set in App.tsx when the user selects 'custom'.
  custom: {
    whiteKeyHeight: 130,
    blackKeyHeight: 85,
    keyLabelHeight: 25,
    minWhiteKeyWidth: 24.5,
  },
};

export const INTERACTIVE_NOTE_DURATION_MS = 300;
export const ACTIVE_KEY_HIGHLIGHT_DURATION_MS = 200;

// --- Falling Notes Constants ---
export const BASE_PIXELS_PER_MILLISECOND = 0.15; // Base speed, will be multiplied by zoomLevel
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
export const NUM_WHITE_KEYS = PIANO_KEYS_CONFIG.filter(key => key.type === 'white').length;


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
export const DEFAULT_NOTE_LABEL_TYPE: NoteLabelType = 'none';
export const DEFAULT_SHOW_ONLY_MAJOR_RESTS = true; // Changed to true
export const DEFAULT_SHOW_ONLY_MAJOR_NOTES = false;
export const DEFAULT_SHOW_QWERTY_SHORTCUTS = true;
export const DEFAULT_HIDE_BAR_NAVIGATION_BUTTONS = false;
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  rightHandColor: '#A855F7', // purple-500
  leftHandColor: '#3B82F6',  // blue-500
  fallingNotesBackgroundColor: '#000000',
};
// --- End Default Settings Constants ---
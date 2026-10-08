import type { FingeringPreferences } from '../fingeringApi';
import React, { useState, useEffect, useRef } from 'react';
import { MidiAccessStatus, MIDIInput, MIDIOutput, NoteLabelType, ViewMode, ThemeSettings, DevicePreset, LayoutDimensions, QwertyLayout, MicThresholds } from '../types';
import { DEVICE_LAYOUTS, DRUM_PADS } from '../constants'; // Import DEVICE_LAYOUTS
import { DrumPadConfig } from '../types';

interface SettingsProps {
  fingeringPreferences: FingeringPreferences;
  onFingeringPreferencesChange: (preferences: FingeringPreferences) => void;
  showHand3D: boolean;
  onShowHand3DChange: (show: boolean) => void;
  onBack: () => void;
  previewStatus: string;
  onRestartPreview: () => void;
  initialScrollTarget?: string;
  midiAccessStatus: MidiAccessStatus;
  midiInputs: Map<string, MIDIInput>;
  selectedMidiInputId: string | null;
  onSelectMidiInput: (id: string | null) => void;
  midiOutputs: Map<string, MIDIOutput>;
  selectedMidiOutputId: string | null;
  onSelectMidiOutput: (id: string | null) => void;
  connectMidi: () => void;
  isAudioInputEnabled: boolean;
  onIsAudioInputEnabledChange: (enabled: boolean) => void;
  audioInputs: MediaDeviceInfo[];
  selectedAudioInputId: string | null;
  onSelectedAudioInputIdChange: (id: string | null) => void;
  audioInputError: string | null;
  micThresholds: MicThresholds;
  onMicThresholdsChange: (thresholds: MicThresholds) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  noteLabelType: NoteLabelType;
  onNoteLabelTypeChange: (type: NoteLabelType) => void;
  showOnlyMajorNotes: boolean; 
  onShowOnlyMajorNotesChange: (value: boolean) => void;
  showQwertyShortcuts: boolean;
  onShowQwertyShortcutsChange: (value: boolean) => void;
  masterVolume: number;
  onMasterVolumeChange: (volume: number) => void;
  metronomeVolume: number;
  onMetronomeVolumeChange: (volume: number) => void;
  metronomeOffsetMs: number; // NOTE: This prop name is kept from App.tsx mapping but effectively controls noteOffsetMs now
  onMetronomeOffsetChange: (offset: number) => void; // NOTE: Controls setNoteOffsetMs
  metronomePianoOffsetMs?: number;
  onMetronomePianoOffsetChange?: (offset: number) => void;
  themeSettings: ThemeSettings;
  onThemeSettingsChange: (settings: ThemeSettings) => void;
  devicePreset: DevicePreset;
  onDevicePresetChange: (preset: DevicePreset) => void;
  // NEW: Props for custom layout dimensions
  customWhiteKeyHeight: number;
  onCustomWhiteKeyHeightChange: (height: number) => void;
  customBlackKeyHeight: number;
  onCustomBlackKeyHeightChange: (height: number) => void;
  customKeyLabelHeight: number;
  onCustomKeyLabelHeightChange: (height: number) => void;
  customMinWhiteKeyWidth: number;
  onCustomMinWhiteKeyWidthChange: (width: number) => void;
  // NEW: Piano Range props
  pianoRangeMode: 'full' | '61-key' | '37-key' | '25-key' | 'custom';
  onPianoRangeModeChange: (mode: 'full' | '61-key' | '37-key' | '25-key' | 'custom') => void;
  customStartNote: string;
  onCustomStartNoteChange: (note: string) => void;
  customEndNote: string;
  onCustomEndNoteChange: (note: string) => void;
  gameplayStyle: 'piano' | 'computer';
  onGameplayStyleChange: (style: 'piano' | 'computer') => void;
  // NEW: Keyboard Layout Props
  qwertyLayout: QwertyLayout;
  onQwertyLayoutChange: (layout: QwertyLayout) => void;
  // NEW: Piano Tiles Background Prop
  showPianoTilesBackground: boolean;
  onShowPianoTilesBackgroundChange: (value: boolean) => void;
  // NEW: UI Zoom Prop
  uiZoom: number;
  onUiZoomChange: (zoom: number) => void;
  uiZoomAuto: boolean;
  onUiZoomAutoChange: (auto: boolean) => void;
  // NEW: MP3 Volume Prop
  mp3Volume: number;
  onMp3VolumeChange: (volume: number) => void;
  // NEW: Drum Input Mode Prop
  drumInputMode: 'midi' | 'non-midi';
  onDrumInputModeChange: (mode: 'midi' | 'non-midi') => void;
  zoomDirection: 'normal' | 'reverse';
  onZoomDirectionChange: (direction: 'normal' | 'reverse') => void;
  drumTyperPadOpacity: number;
  onDrumTyperPadOpacityChange: (opacity: number) => void;
  // NEW: Anti Double Trigger props
  antiDoubleTriggerEnabled: boolean;
  onAntiDoubleTriggerEnabledChange: (enabled: boolean) => void;
  antiDoubleTriggerInterval: number;
  onAntiDoubleTriggerIntervalChange: (interval: number) => void;
  drumMapping: DrumPadConfig[];
  onDrumMappingChange: (mapping: DrumPadConfig[]) => void;
  instrumentMode: 'piano' | 'drum';
  onResetSettings: () => void;
  metronomeBuffers?: { strong?: AudioBuffer | null, weak?: AudioBuffer | null };
  audioContext?: AudioContext | null;
  lowDetailMode?: boolean;
  onLowDetailModeChange?: (lowDetail: boolean) => void;
  resolutionScale?: number;
  onResolutionScaleChange?: (scale: number) => void;
  showPerfectJudgment: boolean;
  onShowPerfectJudgmentChange: (value: boolean) => void;
  onStartCalibration?: () => void;
  userAudioSyncOffset?: number;
  onUserAudioSyncOffsetChange?: (offset: number) => void;
  detectedLatencyMs?: number;
}

const Section: React.FC<{ title: string; children: React.ReactNode; showInfoButton?: boolean; onInfoClick?: () => void }> = ({ title, children, showInfoButton, onInfoClick }) => (
  <section id={`settings-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="scroll-mt-28">
    <h3 className="text-xl font-semibold text-violet-400 mb-4 border-b border-slate-700 pb-2 flex items-center justify-between">
      {title}
      {showInfoButton && (
        <button
          onClick={onInfoClick}
          className="ml-2 px-3 py-1 text-sm rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-opacity-75 bg-slate-700 hover:bg-slate-600 text-slate-100"
          aria-label="Read information about Device & UI settings"
        >
          Read This
        </button>
      )}
    </h3>
    <div className="space-y-4">{children}</div>
  </section>
);

const SettingRow: React.FC<{ label: string; htmlFor?: string; children: React.ReactNode }> = ({ label, htmlFor, children }) => (
  <div className="flex items-center justify-between">
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-300">{label}</label>
    {children}
  </div>
);

const ToggleRow: React.FC<{ label: string; id: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; }> = ({label, id, checked, onChange, disabled}) => {
  const checkboxStyle = `h-5 w-5 text-cyan-500 rounded border-slate-500 focus:ring-cyan-400 ml-3 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
  return (
    <div className={`flex items-center justify-between p-2 rounded-md bg-slate-700/30 ${disabled ? 'opacity-60' : ''}`}>
        <label htmlFor={id} className={`text-sm font-medium text-slate-300 flex-grow ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>{label}</label>
        <input type="checkbox" id={id} checked={checked} onChange={e => !disabled && onChange(e.target.checked)} className={checkboxStyle} disabled={disabled} />
    </div>
  );
};



export const Settings: React.FC<SettingsProps> = (props) => {
  const {
    onBack, midiAccessStatus, midiInputs, selectedMidiInputId, onSelectMidiInput,
    midiOutputs, selectedMidiOutputId, onSelectMidiOutput, connectMidi,
    isAudioInputEnabled, onIsAudioInputEnabledChange, audioInputs, selectedAudioInputId, onSelectedAudioInputIdChange, audioInputError,
    micThresholds, onMicThresholdsChange,
    viewMode, onViewModeChange, noteLabelType, onNoteLabelTypeChange,
    showOnlyMajorNotes, onShowOnlyMajorNotesChange,
    showQwertyShortcuts,
    onShowQwertyShortcutsChange,
    masterVolume, onMasterVolumeChange, metronomeVolume, onMetronomeVolumeChange,
    metronomeOffsetMs, onMetronomeOffsetChange,
    metronomePianoOffsetMs = 0, onMetronomePianoOffsetChange,
    themeSettings, onThemeSettingsChange,
    devicePreset, onDevicePresetChange,
    customWhiteKeyHeight, onCustomWhiteKeyHeightChange,
    customBlackKeyHeight, onCustomBlackKeyHeightChange,
    customKeyLabelHeight, onCustomKeyLabelHeightChange,
    customMinWhiteKeyWidth, onCustomMinWhiteKeyWidthChange,
    pianoRangeMode, onPianoRangeModeChange, customStartNote, onCustomStartNoteChange, customEndNote, onCustomEndNoteChange,
    gameplayStyle, onGameplayStyleChange,
    qwertyLayout, onQwertyLayoutChange,
    showPianoTilesBackground, onShowPianoTilesBackgroundChange,
    uiZoom, onUiZoomChange, uiZoomAuto, onUiZoomAutoChange,
    mp3Volume, onMp3VolumeChange,
    drumInputMode, onDrumInputModeChange,
    zoomDirection, onZoomDirectionChange,
    drumTyperPadOpacity, onDrumTyperPadOpacityChange,
    antiDoubleTriggerEnabled, onAntiDoubleTriggerEnabledChange,
    antiDoubleTriggerInterval, onAntiDoubleTriggerIntervalChange,
    drumMapping, onDrumMappingChange,
    instrumentMode, onResetSettings, initialScrollTarget,
    metronomeBuffers, audioContext,
    lowDetailMode = false, onLowDetailModeChange,
    resolutionScale = 1.0, onResolutionScaleChange,
    showPerfectJudgment, onShowPerfectJudgmentChange,
    onStartCalibration,
    userAudioSyncOffset = 0,
    onUserAudioSyncOffsetChange,
    detectedLatencyMs = 0
  } = props;

  const [isRendered, setIsRendered] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false); // NEW state for info modal
  const [isInfoModalRendered, setIsInfoModalRendered] = useState(false); // For info modal animations
  const [mappingPadId, setMappingPadId] = useState<string | null>(null);
  const [localDrumMapping, setLocalDrumMapping] = useState<DrumPadConfig[]>(drumMapping || DRUM_PADS);

  useEffect(() => {
    if (drumMapping) setLocalDrumMapping(drumMapping);
  }, [drumMapping]);

  useEffect(() => {
    if (!mappingPadId) return;

    const onMidiMessage = (e: any) => {
      const data = e.data;
      if (!data) return;
      const [status, note, velocity] = data;
      // Accept Note On (0x90) with velocity > 0
      if ((status & 0xf0) === 0x90 && velocity > 0) {
        setLocalDrumMapping(prev => {
          const newMapping = [...prev];
          const padIndex = newMapping.findIndex(p => p.id === mappingPadId);
          if (padIndex !== -1) {
            const pad = { ...newMapping[padIndex] };
            if (!pad.midiNotes.includes(note)) {
              pad.midiNotes = [...pad.midiNotes, note];
              newMapping[padIndex] = pad;
              // Trigger auto-save to App state
              setTimeout(() => onDrumMappingChange(newMapping), 0);
            }
          }
          return newMapping;
        });
      }
    };

    midiInputs.forEach(input => {
      input.addEventListener('midimessage', onMidiMessage as any);
    });

    return () => {
      midiInputs.forEach(input => {
        input.removeEventListener('midimessage', onMidiMessage as any);
      });
    };
  }, [mappingPadId, midiInputs]);

  const handleRemoveNote = (padId: string, note: number) => {
    setLocalDrumMapping(prev => {
      const newMapping = [...prev];
      const padIndex = newMapping.findIndex(p => p.id === padId);
      if (padIndex !== -1) {
        const pad = { ...newMapping[padIndex] };
        pad.midiNotes = pad.midiNotes.filter(n => n !== note);
        newMapping[padIndex] = pad;
        // Trigger auto-save to App state
        setTimeout(() => onDrumMappingChange(newMapping), 0);
      }
      return newMapping;
    });
  };

  const handleSaveDrumMapping = () => {
    onDrumMappingChange(localDrumMapping);
    setMappingPadId(null);
  };

  const handleResetDrumMapping = () => {
    const newMapping = DRUM_PADS;
    setLocalDrumMapping(newMapping);
    onDrumMappingChange(newMapping);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);




  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRendered(true);
      if (initialScrollTarget) {
        setTimeout(() => {
          const el = document.getElementById(initialScrollTarget!);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-slate-800', 'rounded-lg', 'transition-all', 'duration-1000');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-slate-800', 'rounded-lg');
            }, 2000);
          }
        }, 300); // wait for modal transition
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [initialScrollTarget]);

  // Effect for info modal rendering
  useEffect(() => {
    if (isInfoModalOpen) {
      const timer = setTimeout(() => setIsInfoModalRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsInfoModalRendered(false);
    }
  }, [isInfoModalOpen]);


  const commonButtonStyles = "px-3 py-1.5 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-opacity-75 flex items-center justify-center shadow-md";
  const secondaryButtonStyles = "bg-slate-600 hover:bg-slate-700 text-slate-100";
  const selectStyles = `bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block w-full p-2.5 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed`;
  const colorInputStyle = `p-1 h-10 w-14 block bg-slate-700 border border-slate-600 cursor-pointer rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out`;
  const rangeSliderStyle = "w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer";
  const numberInputStyle = `w-24 p-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-violet-500 focus:border-violet-500 text-sm`;


  const handleClearBackground = () => {
    onThemeSettingsChange({ ...themeSettings, backgroundUrl: '' });
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        onThemeSettingsChange({ ...themeSettings, backgroundUrl: url });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderMidiConnectButton = () => {
     switch (midiAccessStatus) {
        case 'uninitialized':
            return <button onClick={connectMidi} className={`${commonButtonStyles} ${secondaryButtonStyles}`}>Connect MIDI Devices</button>;
        case 'requesting':
            return <span className="text-sm text-slate-400 animate-pulse">Requesting Access...</span>;
        case 'denied':
            return <button onClick={connectMidi} className={`${commonButtonStyles} bg-red-500 hover:bg-red-600 text-white`}>Access Denied. Retry?</button>;
        case 'unsupported':
            return (
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm text-red-400">Web MIDI not supported in this browser.</span>
                <span className="text-[10px] text-red-400/80 uppercase font-black tracking-tighter">
                  Not supported on iOS/Safari. Use Android, Windows, Chrome/Edge.
                </span>
              </div>
            );
        case 'granted':
             return <button onClick={connectMidi} className={`${commonButtonStyles} bg-green-600 hover:bg-green-700`}>Rescan Devices</button>;
        default:
            return null;
     }
  }

  const handleGameplayStyleChange = (style: 'piano' | 'computer') => {
    onGameplayStyleChange(style);
    if (style === 'piano') {
      onViewModeChange('falling');
      if (noteLabelType === 'qwerty') {
        onNoteLabelTypeChange('none');
      }
      onShowQwertyShortcutsChange(false);
    } else { // computer
      onViewModeChange('sheet-qwerty');
      onNoteLabelTypeChange('qwerty');
      onShowQwertyShortcutsChange(true);
    }
  };

  const gameplayPresetButtonBase = "p-4 rounded-lg border-2 transition-all text-left h-full flex flex-col cursor-pointer";
  const gameplayPresetSelected = "bg-violet-500/80 border-violet-400 shadow-lg scale-105 ring-2 ring-violet-400";
  const gameplayPresetUnselected = "bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500";

  const handleThresholdChange = (key: keyof MicThresholds, value: number) => {
    onMicThresholdsChange({ ...micThresholds, [key]: value });
  };

  return (
    <>
      <div className={`p-6 md:p-8 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar text-slate-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)] ring-1 ring-slate-700 transform transition-all duration-300 ease-in-out bg-slate-800/60 ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-cyan-400">Settings</h2>
            <button onClick={onBack} className="text-slate-400 hover:text-white text-3xl leading-none" style={{ zIndex: 9999 }} aria-label="Close settings">&times;</button>
        </div>
        
        <div className="space-y-8">
          <Section title="Gameplay Style">
            {instrumentMode === 'piano' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => handleGameplayStyleChange('piano')}
                  className={`${gameplayPresetButtonBase} ${gameplayStyle === 'piano' ? gameplayPresetSelected : gameplayPresetUnselected}`}
                >
                  <h4 className="font-bold text-lg text-violet-300">Piano</h4>
                  <p className="text-xs text-slate-300 mt-1">Optimized for MIDI keyboards and visual learning.</p>
                </button>
                <button
                  onClick={() => handleGameplayStyleChange('computer')}
                  className={`${gameplayPresetButtonBase} ${gameplayStyle === 'computer' ? gameplayPresetSelected : gameplayPresetUnselected}`}
                >
                  <h4 className="font-bold text-lg text-violet-300">Keyboard Computer</h4>
                  <p className="text-xs text-slate-300 mt-1">Optimized for playing with your computer keyboard.</p>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => onDrumInputModeChange('non-midi')}
                  className={`${gameplayPresetButtonBase} ${drumInputMode === 'non-midi' ? gameplayPresetSelected : gameplayPresetUnselected}`}
                >
                  <h4 className="font-bold text-lg text-violet-300">Keyboard/Touchscreen</h4>
                  <p className="text-xs text-slate-300 mt-1">Play drums using your computer keyboard or by clicking/touching the drum kit.</p>
                </button>
                <button
                  onClick={() => onDrumInputModeChange('midi')}
                  className={`${gameplayPresetButtonBase} ${drumInputMode === 'midi' ? gameplayPresetSelected : gameplayPresetUnselected}`}
                >
                  <h4 className="font-bold text-lg text-violet-300">Drum MIDI</h4>
                  <p className="text-xs text-slate-300 mt-1">Play drums using a connected MIDI drum kit or controller.</p>
                </button>
              </div>
            )}
          </Section>

          <Section title="Device & UI" showInfoButton={true} onInfoClick={() => setIsInfoModalOpen(true)}>
            <SettingRow label={`UI Zoom (${uiZoom}%)`} htmlFor="ui-zoom">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onUiZoomChange(Math.max(25, uiZoom - 5))}
                    disabled={uiZoomAuto}
                    className="px-3 py-1 rounded-md text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-opacity-75 bg-slate-600 hover:bg-slate-700 text-slate-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Decrease UI zoom"
                  >
                    -
                  </button>
                  <input
                    id="ui-zoom"
                    type="range"
                    min="25"
                    max="200"
                    step="5"
                    value={uiZoom}
                    disabled={uiZoomAuto}
                    onChange={e => onUiZoomChange(parseInt(e.target.value, 10))}
                    className={`${rangeSliderStyle} w-32 md:w-40 disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  <button
                    onClick={() => onUiZoomChange(Math.min(200, uiZoom + 5))}
                    disabled={uiZoomAuto}
                    className="px-3 py-1 rounded-md text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-opacity-75 bg-slate-600 hover:bg-slate-700 text-slate-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Increase UI zoom"
                  >
                    +
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uiZoomAuto}
                    onChange={(e) => onUiZoomAutoChange(e.target.checked)}
                    className="w-4 h-4 text-cyan-600 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500 focus:ring-2"
                  />
                  <span className="text-sm text-slate-300">Auto Fit Screen</span>
                </label>
              </div>
            </SettingRow>
          </Section>

          {instrumentMode === 'piano' && (
            <Section title="Piano Display">
              <SettingRow label="Visible Keys" htmlFor="piano-range-mode">
                <select id="piano-range-mode" value={pianoRangeMode} onChange={e => onPianoRangeModeChange(e.target.value as any)} className={selectStyles}>
                  <option value="full">Full (88 keys)</option>
                  <option value="61-key">Compact (61 keys)</option>
                  <option value="37-key">QWERTY (37 keys)</option>
                  <option value="25-key">Mini (25 keys)</option>
                  <option value="custom">Custom Range</option>
                </select>
              </SettingRow>

              {pianoRangeMode === 'custom' && (
                <div className="bg-slate-900/50 p-4 rounded-lg space-y-3 ring-1 ring-slate-700">
                  <h4 className="text-md font-semibold text-slate-200">Custom Key Range</h4>
                  <SettingRow label="Start Note (e.g., C3)" htmlFor="custom-start-note">
                    <input
                      id="custom-start-note"
                      type="text"
                      value={customStartNote}
                      onChange={e => onCustomStartNoteChange(e.target.value)}
                      className={numberInputStyle}
                      placeholder="e.g., A0"
                    />
                  </SettingRow>
                  <SettingRow label="End Note (e.g., C5)" htmlFor="custom-end-note">
                    <input
                      id="custom-end-note"
                      type="text"
                      value={customEndNote}
                      onChange={e => onCustomEndNoteChange(e.target.value)}
                      className={numberInputStyle}
                      placeholder="e.g., C8"
                    />
                  </SettingRow>
                </div>
              )}
            </Section>
          )}

          {instrumentMode === 'piano' && (
            <Section title="Controls">
              <SettingRow label="QWERTY Keyboard Layout" htmlFor="qwerty-layout">
                <select id="qwerty-layout" value={qwertyLayout} onChange={e => onQwertyLayoutChange(e.target.value as QwertyLayout)} className={selectStyles}>
                  <option value="mirp">Layout 1 (Roblox): Shift = black keys, ↑/↓ = ±1 semitones</option>
                  <option value="default">Layout 2 (Standard): ↑/↓ = ±1 octave</option>
                </select>
              </SettingRow>
            </Section>
          )}

          <Section title="MIDI">
            <SettingRow label="Status">{renderMidiConnectButton()}</SettingRow>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="midi-input" className="block mb-2 text-sm font-medium text-slate-300">Input Device</label>
                <select id="midi-input" value={selectedMidiInputId || ""} onChange={e => onSelectMidiInput(e.target.value || null)} className={selectStyles} disabled={midiAccessStatus !== 'granted'}>
                    <option value="">{midiInputs.size === 0 ? 'No Inputs Found' : 'Disconnect'}</option>
                    {Array.from(midiInputs.values()).map((input: MIDIInput) => <option key={input.id} value={input.id}>{input.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="midi-output" className="block mb-2 text-sm font-medium text-slate-300">Output Device</label>
                <select id="midi-output" value={selectedMidiOutputId || ""} onChange={e => onSelectMidiOutput(e.target.value || null)} className={selectStyles} disabled={midiAccessStatus !== 'granted'}>
                    <option value="">{midiOutputs.size === 0 ? 'Internal Synth (No MIDI Outputs)' : 'Internal Synth (Default)'}</option>
                    {Array.from(midiOutputs.values()).map((output: MIDIOutput) => <option key={output.id} value={output.id}>{output.name}</option>)}
                </select>
              </div>
            </div>
            {midiAccessStatus === 'granted' && midiInputs.size === 0 && midiOutputs.size === 0 && (
              <p className="text-xs text-amber-400 mt-2 text-center">
                No MIDI devices detected. Try clicking "Rescan Devices" or reconnecting your device.
              </p>
            )}
          </Section>
          
          {instrumentMode === 'piano' && (
            <Section title="Acoustic Piano Input (Beta)">
              <ToggleRow id="audio-input-enabled" label="Enable Microphone Input" checked={isAudioInputEnabled} onChange={onIsAudioInputEnabledChange} />
              <SettingRow label="Input Device" htmlFor="audio-input-device">
                  <select 
                      id="audio-input-device" 
                      value={selectedAudioInputId || ""} 
                      onChange={e => onSelectedAudioInputIdChange(e.target.value || null)} 
                      className={selectStyles} 
                      disabled={!isAudioInputEnabled}
                  >
                      {audioInputs.length === 0 ? (
                          <option value="">No microphones found</option>
                      ) : (
                          audioInputs.map(device => (
                              <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${audioInputs.indexOf(device) + 1}`}</option>
                          ))
                      )}
                  </select>
              </SettingRow>
              {audioInputError && <p className="text-xs text-red-400 text-center">{audioInputError}</p>}
              
              {isAudioInputEnabled && (
                  <div className="bg-slate-900/50 p-4 rounded-lg mt-4 space-y-4 ring-1 ring-slate-700">
                      <h4 className="text-md font-semibold text-slate-200 border-b border-slate-700 pb-2">Detection Sensitivity</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Adjust dB thresholds per range (Lower = More Sensitive)</p>
                      
                      {(Object.keys(micThresholds) as Array<keyof MicThresholds>).map(key => (
                          <SettingRow key={key} label={`${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} (${micThresholds[key]} dB)`} htmlFor={`mic-thresh-${key}`}>
                              <input 
                                  id={`mic-thresh-${key}`}
                                  type="range" 
                                  min="-100" 
                                  max="-20" 
                                  step="1" 
                                  value={micThresholds[key]} 
                                  onChange={e => handleThresholdChange(key, parseInt(e.target.value, 10))} 
                                  className={`${rangeSliderStyle} max-w-[150px] md:max-w-[200px]`} 
                              />
                          </SettingRow>
                      ))}
                  </div>
              )}

               <p className="text-xs text-slate-500 text-center mt-2">
                  This feature uses your microphone to detect notes. Adjust the dB thresholds above to filter out background noise or catch quiet notes.
              </p>
            </Section>
          )}

          <Section title="Visuals & Gameplay">
            {(instrumentMode === 'piano' || instrumentMode === 'drum') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <SettingRow label="Game View" htmlFor="view-mode">
                  <select id="view-mode" value={viewMode} onChange={e => onViewModeChange(e.target.value as ViewMode)} className={`${selectStyles} max-w-xs`}>
                    {gameplayStyle === 'computer' ? (
                      <>
                        <option value="qwerty_mania">Qwerty Typer</option>
                        <option value="sheet-qwerty">Sheet Music QWERTY</option>
                      </>
                    ) : (
                      <>
                        <option value="falling">{instrumentMode === 'drum' ? 'Drum Typer' : 'Falling Notes'}</option>
                        {(instrumentMode === 'drum' || drumInputMode === 'midi') && <option value="drum_mania">Drum Mania</option>}
                        <option value="sheet">Sheet Music</option>
                        <option value="sheet-roll">Sheet Music Roll</option>
                      </>
                    )}
                  </select>
                </SettingRow>
                <SettingRow label="Note Labels" htmlFor="note-label">
                  <select id="note-label" value={noteLabelType} onChange={e => onNoteLabelTypeChange(e.target.value as NoteLabelType)} className={`${selectStyles} max-w-xs`} disabled={gameplayStyle === 'computer'}>
                    <option value="none">None</option>
                    <option value="fingering">Fingering (BETA)</option>
                    <option value="noteName">Note Name</option>
                    {gameplayStyle !== 'piano' && <option value="qwerty">QWERTY Keys</option>}
                  </select>
                </SettingRow>
          {instrumentMode === 'piano' && noteLabelType === 'fingering' && <section id="fingering-section" className="rounded-xl border border-cyan-500/20 bg-slate-900/30 p-5">
            <h3 className="text-xl font-semibold text-cyan-300 mb-4">Fingering Settings</h3>
            <div className="flex flex-wrap gap-4 mb-4 text-slate-200">
              <label className="flex flex-col gap-1">Fingering Engine
                <select className="bg-slate-800 rounded p-2 text-cyan-300 font-medium" value={props.fingeringPreferences.engine || 'pianoplayer'}
                  onChange={e=>props.onFingeringPreferencesChange({...props.fingeringPreferences,routing:'auto',engine:e.target.value as FingeringPreferences['engine']})}>
                  <option value="pianoplayer">PianoPlayer Heuristic (Legacy)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Hand size
                <select  className="bg-slate-800 rounded p-2" value={props.fingeringPreferences.handSize}
                  onChange={e=>props.onFingeringPreferencesChange({...props.fingeringPreferences,routing:'auto',handSize:e.target.value as FingeringPreferences['handSize']})}>
                  {[['XXS','Extra extra small'],['XS','Extra small'],['S','Small'],['M','Medium'],['L','Large'],['XL','Extra large'],['XXL','Extra extra large']].map(([size,label])=><option key={size} value={size}>{size} — {label}</option>)}
                </select>
              </label>
            </div>

            <label className="flex items-center gap-3 text-slate-200 mb-4"><input type="checkbox" checked={props.showHand3D} onChange={e=>props.onShowHand3DChange(e.target.checked)}/>Show 3D hands during playback</label>
            <p className="text-xs text-slate-400 mt-2">The 3D hands appear on the lower piano keys and match the left and right note colors. 1 thumb · 2 index · 3 middle · 4 ring · 5 little finger.</p>
          </section>}

              </div>
            )}
            <ToggleRow id="major-notes-only" label="Show Only Major Notes" checked={instrumentMode === 'drum' ? true : showOnlyMajorNotes} onChange={onShowOnlyMajorNotesChange} disabled={instrumentMode === 'drum'}/>
            <p className="-mt-3 mb-4 text-xs text-slate-400">Visual only: notes are drawn as eighth notes, including Fingering labels, while piano audio keeps its original duration. The Difficulty Meter always treats holds as taps for fair scoring.</p>
            <ToggleRow id="show-piano-tiles" label="Show Piano Tiles Background" checked={showPianoTilesBackground} onChange={onShowPianoTilesBackgroundChange} />
            {showPianoTilesBackground && (
                <SettingRow label={`Piano Tiles Opacity (${themeSettings.pianoTilesOpacity || 50}%)`} htmlFor="piano-tiles-opacity">
                    <input 
                        id="piano-tiles-opacity" 
                        type="range" 
                        min="10" 
                        max="100" 
                        step="1" 
                        value={themeSettings.pianoTilesOpacity || 50} 
                        onChange={e => onThemeSettingsChange({ ...themeSettings, pianoTilesOpacity: parseInt(e.target.value, 10) })} 
                        className={`${rangeSliderStyle} max-w-xs`} 
                    />
                </SettingRow>
            )}
            <ToggleRow id="show-perfect-judgment" label="Show PERFECT Rating Text" checked={showPerfectJudgment} onChange={onShowPerfectJudgmentChange} />
            {onResolutionScaleChange && (
              <SettingRow label="In-Game View Resolution" htmlFor="resolution-scale">
                <select
                  id="resolution-scale"
                  value={resolutionScale}
                  onChange={e => onResolutionScaleChange(parseFloat(e.target.value))}
                  className={`${selectStyles} max-w-xs`}
                >
                  <option value={1.0}>100% (Normal)</option>
                  <option value={0.75}>75% (Medium)</option>
                  <option value={0.5}>50% (Low - Half Resolution)</option>
                  <option value={0.25}>25% (Very Low - Quarter Resolution)</option>
                  <option value={0.125}>12.5% (Ultra Low - Eighth Resolution)</option>
                  <option value={0.0625}>6.25% (Extreme Low - Sixteenth Resolution)</option>
                </select>
              </SettingRow>
            )}
            
            {(viewMode === 'qwerty_mania' || (viewMode === 'falling' && instrumentMode === 'drum')) && (
              <div className="bg-slate-900/50 p-4 rounded-lg mt-4 space-y-4 ring-1 ring-slate-700">
                <h4 className="text-md font-semibold text-slate-200 border-b border-slate-700 pb-2">Typer & Circle Visual Settings</h4>
                
                <SettingRow label="Zoom Direction (AR)" htmlFor="zoom-direction">
                  <select 
                    id="zoom-direction" 
                    value={zoomDirection} 
                    onChange={e => onZoomDirectionChange(e.target.value as 'normal' | 'reverse')} 
                    className={selectStyles}
                  >
                    <option value="normal">Normal (Outside to Inside)</option>
                    <option value="reverse">Reverse (Inside to Outside)</option>
                  </select>
                </SettingRow>

                <SettingRow label="Appearing Keys Opacity" htmlFor="drum-typer-opacity">
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-[10px] text-cyan-400 font-mono w-10 text-right">{drumTyperPadOpacity}%</span>
                    <input 
                      type="range" 
                      id="drum-typer-opacity"
                      min="0" 
                      max="100" 
                      step="1" 
                      value={drumTyperPadOpacity} 
                      onChange={e => onDrumTyperPadOpacityChange(parseInt(e.target.value))} 
                      className={`${rangeSliderStyle} flex-grow focus:ring-cyan-500`} 
                    />
                  </div>
                </SettingRow>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Controls the base visibility of keys/pads in Qwerty Typer & Drum Typer. 0% hides keys entirely until notes approach — perfect for that "OSU-style" challenge.
                </p>
              </div>
            )}

            <ToggleRow id="qwerty-shortcuts" label="Show QWERTY Shortcuts on Keys" checked={showQwertyShortcuts} onChange={onShowQwertyShortcutsChange} disabled={true} />
          </Section>
          
          <Section title="Audio">
            <SettingRow label={`Piano Volume (${Math.round(masterVolume*100)}%)`} htmlFor="master-volume">
              <input 
                id="master-volume" 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" // Snap every 5%
                value={masterVolume} 
                onChange={e => onMasterVolumeChange(parseFloat(e.target.value))} 
                className={`${rangeSliderStyle} max-w-xs`} 
              />
            </SettingRow>
            {(isAudioInputEnabled || selectedMidiInputId) && <p className="text-xs text-amber-400 mt-1">Piano volume defaulted to 10% because MIDI/Mic is active. You can still adjust it manually.</p>}
            <SettingRow label={`Metronome Volume (${Math.round(metronomeVolume*100)}%)`} htmlFor="metronome-volume">
              <input 
                id="metronome-volume" 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" // Snap every 5%
                value={metronomeVolume} 
                onChange={e => onMetronomeVolumeChange(parseFloat(e.target.value))} 
                className={`${rangeSliderStyle} max-w-xs`} 
              />
            </SettingRow>
            <SettingRow label={`Backing Track Volume (${Math.round(mp3Volume*100)}%)`} htmlFor="mp3-volume">
              <input 
                id="mp3-volume" 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={mp3Volume} 
                onChange={e => onMp3VolumeChange(parseFloat(e.target.value))} 
                className={`${rangeSliderStyle} max-w-xs`} 
              />
            </SettingRow>
            {/* Note Offset (Judgment lag compensation & Audio Sync) */}
            <div id="note-offset-section" className="bg-slate-900/50 p-4 rounded-lg space-y-4 ring-1 ring-slate-700">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <div>
                  <h4 className="text-md font-semibold text-cyan-400">MIDI & Audio Latency Offset</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Compensate for MIDI input delay and audio timing differences between devices
                  </p>
                </div>
                {detectedLatencyMs > 0 && (
                  <span className="text-[10px] bg-cyan-950/80 text-cyan-300 px-2.5 py-1 rounded border border-cyan-700/50 font-mono">
                    Estimated output latency: ~{detectedLatencyMs}ms
                  </span>
                )}
              </div>

              {/* 1. MIDI Hit Timing Offset */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-500/30">1</span>
                    <label htmlFor="note-offset" className="text-sm font-semibold text-slate-200">
                      MIDI Hit Timing Offset (Hitbox Shift)
                    </label>
                  </div>
                  <span className="font-mono font-bold text-sm text-cyan-400">
                    {metronomeOffsetMs > 0 ? `+${metronomeOffsetMs}` : metronomeOffsetMs}ms
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    id="note-offset" 
                    type="range" 
                    min="-500" 
                    max="500" 
                    step="5" 
                    value={metronomeOffsetMs} 
                    onChange={e => onMetronomeOffsetChange(parseInt(e.target.value, 10))} 
                    className={`${rangeSliderStyle} flex-grow`} 
                  />
                  {onStartCalibration && (
                    <button 
                      onClick={onStartCalibration} 
                      className={`${commonButtonStyles} ${secondaryButtonStyles} whitespace-nowrap text-xs py-1.5`}
                      title="Run automatic latency calibration with test beats"
                    >
                      Calibrate
                    </button>
                  )}
                </div>

                {/* Quick step buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Quick:</span>
                  <button 
                    onClick={() => onMetronomeOffsetChange(Math.max(-500, metronomeOffsetMs - 50))}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                  >
                    -50ms
                  </button>
                  <button 
                    onClick={() => onMetronomeOffsetChange(Math.max(-500, metronomeOffsetMs - 10))}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                  >
                    -10ms
                  </button>
                  <button 
                    onClick={() => onMetronomeOffsetChange(0)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                  >
                    0ms (Reset)
                  </button>
                  <button 
                    onClick={() => onMetronomeOffsetChange(Math.min(500, metronomeOffsetMs + 10))}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                  >
                    +10ms
                  </button>
                  <button 
                    onClick={() => onMetronomeOffsetChange(Math.min(500, metronomeOffsetMs + 50))}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                  >
                    +50ms
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Adjust keyboard or MIDI input timing relative to the notes. Use a negative offset (-) if your hits are consistently late, or a positive offset (+) if they are early.
                </p>
              </div>

              {/* 2. MP3 Audio Offset */}
              {onUserAudioSyncOffsetChange && (
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">2</span>
                      <label htmlFor="audio-sync-offset" className="text-sm font-semibold text-slate-200">
                        MP3 Audio Offset (Backing Track Sync)
                      </label>
                    </div>
                    <span className="font-mono font-bold text-sm text-amber-400">
                      {userAudioSyncOffset > 0 ? `+${userAudioSyncOffset}` : userAudioSyncOffset}ms
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input 
                      id="audio-sync-offset" 
                      type="range" 
                      min="-500" 
                      max="500" 
                      step="5" 
                      value={userAudioSyncOffset} 
                      onChange={e => onUserAudioSyncOffsetChange(parseInt(e.target.value, 10))} 
                      className={`${rangeSliderStyle} flex-grow`} 
                    />
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Quick:</span>
                    <button 
                      onClick={() => onUserAudioSyncOffsetChange(Math.max(-500, userAudioSyncOffset - 50))}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                      -50ms
                    </button>
                    <button 
                      onClick={() => onUserAudioSyncOffsetChange(Math.max(-500, userAudioSyncOffset - 10))}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                      -10ms
                    </button>
                    <button 
                      onClick={() => onUserAudioSyncOffsetChange(0)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                      0ms (Reset)
                    </button>
                    <button 
                      onClick={() => onUserAudioSyncOffsetChange(Math.min(500, userAudioSyncOffset + 10))}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                      +10ms
                    </button>
                    <button 
                      onClick={() => onUserAudioSyncOffsetChange(Math.min(500, userAudioSyncOffset + 50))}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                      +50ms
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Align MP3 or YouTube playback with the falling notes on screen.
                  </p>
                </div>
              )}

              {/* 3. Metronome Offset */}
              {onMetronomePianoOffsetChange && (
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">3</span>
                      <label htmlFor="metro-piano-offset" className="text-sm font-semibold text-slate-200">
                        Metronome Offset
                      </label>
                    </div>
                    <span className="font-mono font-bold text-sm text-emerald-400">
                      {metronomePianoOffsetMs > 0 ? `+${metronomePianoOffsetMs}` : metronomePianoOffsetMs}ms
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input 
                      id="metro-piano-offset" 
                      type="range" 
                      min="-500" 
                      max="500" 
                      step="5" 
                      value={metronomePianoOffsetMs} 
                      onChange={e => onMetronomePianoOffsetChange(parseInt(e.target.value, 10))} 
                      className={`${rangeSliderStyle} flex-grow`} 
                    />
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Quick:</span>
                    <button 
                      onClick={() => onMetronomePianoOffsetChange(Math.max(-500, metronomePianoOffsetMs - 50))}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                      -50ms
                    </button>
                    <button 
                      onClick={() => onMetronomePianoOffsetChange(Math.max(-500, metronomePianoOffsetMs - 10))}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                      -10ms
                    </button>
                    <button 
                      onClick={() => onMetronomePianoOffsetChange(0)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                      0ms (Reset)
                    </button>
                    <button 
                      onClick={() => onMetronomePianoOffsetChange(Math.min(500, metronomePianoOffsetMs + 10))}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                      +10ms
                    </button>
                    <button 
                      onClick={() => onMetronomePianoOffsetChange(Math.min(500, metronomePianoOffsetMs + 50))}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                      +50ms
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Adjust the metronome if its clicks sound earlier or later than the visual hitline.
                  </p>
                </div>
              )}
            </div>

            {/* Anti Double Trigger */}
            {instrumentMode === 'drum' && (
              <div id="anti-double-trigger-section" className="bg-slate-900/50 p-4 rounded-lg mt-4 space-y-4 ring-1 ring-slate-700">
                <ToggleRow 
                  id="anti-double-trigger-enabled" 
                  label="Anti Double Trigger" 
                  checked={antiDoubleTriggerEnabled} 
                  onChange={onAntiDoubleTriggerEnabledChange} 
                />
                {antiDoubleTriggerEnabled && (
                  <div className="space-y-2">
                    <SettingRow label={`Minimum Interval (${antiDoubleTriggerInterval.toFixed(2)}ms)`} htmlFor="anti-double-trigger-interval">
                      <input 
                        id="anti-double-trigger-interval" 
                        type="range" 
                        min="5" 
                        max="200" 
                        step="1" 
                        value={antiDoubleTriggerInterval} 
                        onChange={e => onAntiDoubleTriggerIntervalChange(parseFloat(e.target.value))} 
                        className={`${rangeSliderStyle} max-w-xs focus:ring-cyan-500`} 
                      />
                    </SettingRow>
                    <p className="text-[10px] text-slate-400">
                      Prevents a single hit from triggering multiple inputs due to vibration. Range: 5ms - 200ms.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Drum Input Mapping */}
            {instrumentMode === 'drum' && (
              <div id="drum-mapping-section" className="bg-slate-900/50 p-4 rounded-lg mt-4 space-y-4 ring-1 ring-slate-700 text-left">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                  <h4 className="text-md font-semibold text-cyan-400">Drum MIDI Mapping</h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleResetDrumMapping}
                      className={`${commonButtonStyles} bg-slate-700 hover:bg-slate-600 text-slate-100 ring-1 ring-slate-600`}
                    >
                      Reset
                    </button>
                    {/* Visual indicator that it's auto-saved */}
                    <div className="flex items-center px-4 bg-emerald-900/30 text-emerald-400 rounded ring-1 ring-emerald-500/50 text-[10px] font-bold uppercase tracking-wider">
                       Auto-Saved
                    </div>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Select a drum kit component and hit your MIDI drum to assign it. You can map multiple MIDI notes to one component.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {localDrumMapping.map(pad => (
                    <div key={pad.id} className={`flex flex-col p-3 rounded-lg border transition-all duration-200 ${mappingPadId === pad.id ? 'bg-cyan-900/40 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-100 uppercase tracking-wider">{pad.name}</span>
                          <span className="text-[9px] text-slate-500 italic lowercase">{pad.midiNotes.length} assigned</span>
                        </div>
                        <button 
                          onClick={() => setMappingPadId(mappingPadId === pad.id ? null : pad.id)}
                          className={`h-8 px-4 rounded font-bold text-[10px] transition-all transform active:scale-95 ${mappingPadId === pad.id ? 'bg-amber-500 text-white animate-pulse shadow-lg shadow-amber-900/40' : 'bg-slate-700 hover:bg-slate-600 text-slate-100 shadow-sm border border-slate-600'}`}
                        >
                          {mappingPadId === pad.id ? 'HIT DRUM!' : 'MAP'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {pad.midiNotes.length === 0 ? (
                          <span className="text-[9px] text-slate-600 italic">No notes mapped</span>
                        ) : (
                          pad.midiNotes.sort((a,b) => a-b).map(note => (
                            <div key={note} className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/80 rounded border border-slate-700 text-[10px] text-cyan-300 group">
                              <span>#{note}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveNote(pad.id, note); }}
                                className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white transition-all text-[8px]"
                                title="Remove mapping"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title="Appearance">
            <SettingRow label="Right Hand Color" htmlFor="rh-color">
              <input type="color" id="rh-color" value={themeSettings.rightHandColor} onChange={e => onThemeSettingsChange({...themeSettings, rightHandColor: e.target.value})} className={colorInputStyle} />
            </SettingRow>
            <SettingRow label="Left Hand Color" htmlFor="lh-color">
              <input type="color" id="lh-color" value={themeSettings.leftHandColor} onChange={e => onThemeSettingsChange({...themeSettings, leftHandColor: e.target.value})} className={colorInputStyle} />
            </SettingRow>
            <SettingRow label="Falling Notes Background" htmlFor="bg-color">
              <input type="color" id="bg-color" value={themeSettings.fallingNotesBackgroundColor} onChange={e => onThemeSettingsChange({...themeSettings, fallingNotesBackgroundColor: e.target.value})} className={colorInputStyle} />
            </SettingRow>
            <SettingRow label="Hit Note Color" htmlFor="hit-note-color">
              <input type="color" id="hit-note-color" value={themeSettings.hitNoteColor} onChange={e => onThemeSettingsChange({...themeSettings, hitNoteColor: e.target.value})} className={colorInputStyle} />
            </SettingRow>
            
            <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
              <h4 className="text-md font-semibold text-violet-400">Background Image / Video</h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="URL (Image or MP4)"
                    value={themeSettings.backgroundUrl}
                    onChange={e => onThemeSettingsChange({ ...themeSettings, backgroundUrl: e.target.value })}
                    className={`${numberInputStyle} flex-grow`}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`${commonButtonStyles} ${secondaryButtonStyles}`}
                  >
                    Upload
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/mp4,video/webm"
                    className="hidden"
                  />
                  {themeSettings.backgroundUrl && (
                    <button
                      onClick={handleClearBackground}
                      className={`${commonButtonStyles} bg-red-600/50 hover:bg-red-600 text-white`}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <SettingRow label={`Background Opacity (${Math.round((themeSettings.backgroundOpacity ?? 0.1) * 100)}%)`} htmlFor="bg-opacity">
                  <input
                    id="bg-opacity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={themeSettings.backgroundOpacity ?? 0.1}
                    onChange={e => onThemeSettingsChange({ ...themeSettings, backgroundOpacity: parseFloat(e.target.value) })}
                    className={`${rangeSliderStyle} max-w-xs`}
                  />
                </SettingRow>
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 text-xs text-slate-400"><span role="status" aria-live="polite">{props.previewStatus}</span><button type="button" className="min-h-11 shrink-0 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white" onClick={props.onRestartPreview}>Restart preview</button></div>
        <div className="mt-8 flex justify-center space-x-4">
             <button onClick={onBack} className={`${commonButtonStyles} ${secondaryButtonStyles} w-32`} style={{ zIndex: 9999 }}>Back</button>
             <button onClick={() => { if(confirm('Reset all settings to default?')) onResetSettings(); }} className={`${commonButtonStyles} bg-red-600 hover:bg-red-700 text-white w-40`} style={{ zIndex: 9999 }}>Reset Settings</button>
        </div>

      </div>

      {isInfoModalOpen && (
        <div
          className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-[60] p-4 transition-opacity duration-300 ease-in-out ${isInfoModalRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`}
          onClick={() => setIsInfoModalOpen(false)} // Close on background click
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-modal-title"
        >
          <div
            className={`bg-slate-800/60 p-8 rounded-xl shadow-2xl max-w-md w-full ring-1 ring-slate-700 transform transition-all duration-300 ease-in-out ${isInfoModalRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            role="document"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 id="info-modal-title" className="text-2xl font-bold text-cyan-400">Information</h2>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="text-3xl text-slate-400 hover:text-white leading-none"
                aria-label="Close information modal"
              >&times;</button>
            </div>
            <p className="text-slate-300 text-lg mb-6">
              If you are using a smaller screen, you can adjust the website’s zoom settings for better visibility and user experience.
            </p>
            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg text-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;

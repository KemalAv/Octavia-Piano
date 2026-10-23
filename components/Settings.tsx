import React, { useState, useEffect, useRef } from 'react';
import { MidiAccessStatus, MIDIInput, MIDIOutput, NoteLabelType, ViewMode, ThemeSettings, DevicePreset, LayoutDimensions, QwertyLayout, MicThresholds, FingeringPreferences, AppLanguage } from '../types';
import { DEVICE_LAYOUTS, DRUM_PADS } from '../constants'; // Import DEVICE_LAYOUTS
import { DrumPadConfig } from '../types';
import { translations } from '../translations';

interface SettingsProps {
  appLanguage?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
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
  hidePianoKeyboardNonFalling?: boolean;
  onHidePianoKeyboardNonFallingChange?: (value: boolean) => void;
  showDynamics?: boolean;
  onShowDynamicsChange?: (value: boolean) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode; showInfoButton?: boolean; onInfoClick?: () => void }> = ({ title, children, showInfoButton, onInfoClick }) => (
  <section id={`settings-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="scroll-mt-28">
    <h3 className="text-xl font-semibold text-violet-400 mb-4 border-b border-slate-700 pb-2 flex items-center justify-between">
      {title}
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
    detectedLatencyMs = 0,
    hidePianoKeyboardNonFalling = true,
    onHidePianoKeyboardNonFallingChange,
    showDynamics = false,
    onShowDynamicsChange,
    appLanguage = 'en',
    onLanguageChange
  } = props;

  const t = translations[appLanguage] || translations.en;

  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (instrumentMode === 'drum' && gameplayStyle === 'computer') {
      onGameplayStyleChange('piano');
      if (viewMode === 'qwerty_mania' || viewMode === 'sheet-qwerty') {
        onViewModeChange('drum_mania');
      }
    } else if (instrumentMode === 'piano' && viewMode === 'drum_mania') {
      onViewModeChange(gameplayStyle === 'computer' ? 'qwerty_mania' : 'falling');
    }
  }, [instrumentMode, gameplayStyle, viewMode, onGameplayStyleChange, onViewModeChange]);
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
      onViewModeChange('qwerty_mania');
      onNoteLabelTypeChange('qwerty');
      onShowQwertyShortcutsChange(true);
    }
  };

  const gameplayPresetButtonBase = "p-4 rounded-lg border-2 transition-all text-left h-full flex flex-col cursor-pointer";
  const gameplayPresetSelected = "bg-violet-500/80 border-violet-400 shadow-lg scale-105 ring-2 ring-violet-400";
  const gameplayPresetUnselected = "bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500";

  const [activeSettingsTab, setActiveSettingsTab] = useState<'gameplay' | 'midi' | 'audio' | 'theme' | 'all'>('gameplay');
  const [settingsSearch, setSettingsSearch] = useState('');

  useEffect(() => {
    if (initialScrollTarget) {
      if (initialScrollTarget.includes('offset') || initialScrollTarget.includes('audio') || initialScrollTarget.includes('latency')) {
        setActiveSettingsTab('audio');
      } else {
        setActiveSettingsTab('all');
      }
    }
  }, [initialScrollTarget]);

  const handleThresholdChange = (key: keyof MicThresholds, value: number) => {
    onMicThresholdsChange({ ...micThresholds, [key]: value });
  };

  return (
    <>
      <div className={`p-6 md:p-8 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar text-slate-100 border border-white/10 transform transition-all duration-300 ease-in-out bg-slate-900/95 backdrop-blur-md ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-wide">{t.settingsTitle}</h2>
              <p className="text-xs text-slate-400">{t.settingsSubtitle}</p>
            </div>
          </div>
          <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-lg transition-colors border border-white/5 active:scale-95" 
            style={{ zIndex: 9999 }} 
            aria-label={t.closeSettings}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder={t.settingsSearchPlaceholder}
            value={settingsSearch}
            onChange={e => setSettingsSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-800/80 text-white placeholder-slate-500 border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-xs md:text-sm shadow-inner transition-all"
          />
          {settingsSearch && (
            <button
              onClick={() => setSettingsSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Tabs with SVGs */}
        {!settingsSearch && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-2xl border border-white/5 mb-6 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveSettingsTab('gameplay')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeSettingsTab === 'gameplay'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/></svg>
              <span>{t.tabGameplay}</span>
            </button>

            <button
              onClick={() => setActiveSettingsTab('midi')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeSettingsTab === 'midi'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M6 4v8h2V4M11 4v8h2V4M16 4v8h2V4"/></svg>
              <span>{t.tabMidi}</span>
            </button>

            <button
              onClick={() => setActiveSettingsTab('audio')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeSettingsTab === 'audio'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              <span>{t.tabAudio}</span>
            </button>

            <button
              onClick={() => setActiveSettingsTab('theme')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                activeSettingsTab === 'theme'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
              <span>{t.tabVisuals}</span>
            </button>

            <button
              onClick={() => setActiveSettingsTab('all')}
              className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                activeSettingsTab === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              <span>{t.tabAll}</span>
            </button>
          </div>
        )}

        <div className="space-y-6">
          {(activeSettingsTab === 'all' || activeSettingsTab === 'gameplay' || settingsSearch.trim() !== '') && (
            <>
          <Section title={t.languageSectionTitle}>
            <SettingRow label={t.appLanguageLabel} htmlFor="app-language">
              <select
                id="app-language"
                value={appLanguage}
                onChange={e => onLanguageChange && onLanguageChange(e.target.value as AppLanguage)}
                className={`${selectStyles} max-w-xs`}
              >
                <option value="en">English (US / UK)</option>
                <option value="id">Bahasa Indonesia</option>
                <option value="es">Español</option>
              </select>
            </SettingRow>
          </Section>

          <Section title={t.gameplayStyleSection}>
            {instrumentMode === 'piano' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => handleGameplayStyleChange('piano')}
                  className={`${gameplayPresetButtonBase} ${gameplayStyle === 'piano' ? gameplayPresetSelected : gameplayPresetUnselected}`}
                >
                  <h4 className="font-bold text-lg text-violet-300">{t.pianoStyleTitle}</h4>
                  <p className="text-xs text-slate-300 mt-1">{t.pianoStyleDesc}</p>
                </button>
                <button
                  onClick={() => handleGameplayStyleChange('computer')}
                  className={`${gameplayPresetButtonBase} ${gameplayStyle === 'computer' ? gameplayPresetSelected : gameplayPresetUnselected}`}
                >
                  <h4 className="font-bold text-lg text-violet-300">{t.computerStyleTitle}</h4>
                  <p className="text-xs text-slate-300 mt-1">{t.computerStyleDesc}</p>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => onDrumInputModeChange('non-midi')}
                  className={`${gameplayPresetButtonBase} ${drumInputMode === 'non-midi' ? gameplayPresetSelected : gameplayPresetUnselected}`}
                >
                  <h4 className="font-bold text-lg text-violet-300">{t.drumNonMidiTitle}</h4>
                  <p className="text-xs text-slate-300 mt-1">{t.drumNonMidiDesc}</p>
                </button>
                <button
                  onClick={() => onDrumInputModeChange('midi')}
                  className={`${gameplayPresetButtonBase} ${drumInputMode === 'midi' ? gameplayPresetSelected : gameplayPresetUnselected}`}
                >
                  <h4 className="font-bold text-lg text-violet-300">{t.drumMidiTitle}</h4>
                  <p className="text-xs text-slate-300 mt-1">{t.drumMidiDesc}</p>
                </button>
              </div>
            )}
          </Section>

          <Section title={t.visualsSection}>
            {(instrumentMode === 'piano' || instrumentMode === 'drum') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <SettingRow label={t.gameViewLabel} htmlFor="view-mode">
                  <div id="view-mode" role="radiogroup" className="flex flex-wrap gap-2">
                    {((instrumentMode === 'piano' && gameplayStyle === 'computer')
                      ? [
                          { value: 'qwerty_mania', label: 'Qwerty Typer' },
                          { value: 'sheet-qwerty', label: 'Sheet Music QWERTY' },
                        ]
                      : [
                          { value: 'falling', label: instrumentMode === 'drum' ? 'Drum Typer' : 'Falling Notes' },
                          ...(instrumentMode === 'drum' ? [{ value: 'drum_mania', label: 'Drum Mania' }] : []),
                          { value: 'sheet', label: 'Sheet Music' },
                          { value: 'sheet-roll', label: 'Sheet Music Roll' },
                        ]
                    ).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={viewMode === opt.value}
                        onClick={() => onViewModeChange(opt.value as ViewMode)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${viewMode === opt.value ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow label={t.noteLabelsLabel} htmlFor="note-label">
                  <div id="note-label" role="radiogroup" className="flex flex-wrap gap-2">
                    {[
                      { value: 'none', label: 'None' },
                      { value: 'fingering', label: 'Fingering' },
                      { value: 'noteName', label: 'Note Name' },
                      ...(gameplayStyle !== 'piano' ? [{ value: 'qwerty', label: 'QWERTY Keys' }] : []),
                    ].map(opt => {
                      const locked = instrumentMode === 'piano' && gameplayStyle === 'computer';
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={noteLabelType === opt.value}
                          disabled={locked}
                          onClick={() => onNoteLabelTypeChange(opt.value as NoteLabelType)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${locked ? 'opacity-50 cursor-not-allowed' : ''} ${noteLabelType === opt.value ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </SettingRow>
          {instrumentMode === 'piano' && noteLabelType === 'fingering' && <section id="fingering-section" className="rounded-xl border border-cyan-500/20 bg-slate-900/30 p-5">
            <h3 className="text-xl font-semibold text-cyan-300 mb-4">{t.fingeringSettingsTitle}</h3>


            <label className="flex items-center gap-3 text-slate-200 mb-4"><input type="checkbox" checked={props.showHand3D} onChange={e=>props.onShowHand3DChange(e.target.checked)}/>{t.showHand3DLabel}</label>
            <p className="text-xs text-slate-400 mt-2">{t.showHand3DDesc}</p>
          </section>}

              </div>
            )}
            <ToggleRow id="major-notes-only" label={t.showMajorNotesOnly} checked={instrumentMode === 'drum' ? true : showOnlyMajorNotes} onChange={onShowOnlyMajorNotesChange} disabled={instrumentMode === 'drum'}/>
            <p className="-mt-3 mb-4 text-xs text-slate-400">{t.showMajorNotesOnlyDesc}</p>
            <ToggleRow id="show-piano-tiles" label={t.showPianoTilesBg} checked={showPianoTilesBackground} onChange={onShowPianoTilesBackgroundChange} />
            {showPianoTilesBackground && (
                <SettingRow label={`${t.pianoTilesOpacity} (${themeSettings.pianoTilesOpacity || 50}%)`} htmlFor="piano-tiles-opacity">
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
            <ToggleRow id="show-perfect-judgment" label={t.showPerfectText} checked={showPerfectJudgment} onChange={onShowPerfectJudgmentChange} />
            {onHidePianoKeyboardNonFallingChange && (
              <>
                <ToggleRow
                  id="hide-piano-keyboard-non-falling"
                  label={t.hidePianoKeyboardNonFalling}
                  checked={hidePianoKeyboardNonFalling}
                  onChange={onHidePianoKeyboardNonFallingChange}
                />
                <p className="-mt-3 mb-4 text-xs text-slate-400">
                  {t.hidePianoKeyboardNonFallingDesc}
                </p>
              </>
            )}
            {onShowDynamicsChange && (
              <>
                <ToggleRow
                  id="show-dynamics"
                  label={t.showDynamics}
                  checked={showDynamics}
                  onChange={onShowDynamicsChange}
                />
                <p className="-mt-3 mb-4 text-xs text-slate-400">
                  {t.showDynamicsDesc}
                </p>
              </>
            )}
            {onResolutionScaleChange && (
              <SettingRow label={t.inGameResolution} htmlFor="resolution-scale">
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

                <SettingRow label={t.appearingKeysOpacity} htmlFor="drum-typer-opacity">
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
                  {t.appearingKeysOpacityDesc}
                </p>
              </div>
            )}

            <ToggleRow id="qwerty-shortcuts" label={t.showQwertyShortcuts} checked={showQwertyShortcuts} onChange={onShowQwertyShortcutsChange} disabled={true} />
          </Section>

          <Section title={t.deviceUiSection} showInfoButton={true} onInfoClick={() => setIsInfoModalOpen(true)}>
            <SettingRow label={`${t.uiZoomLabel} (${uiZoom}%)`} htmlFor="ui-zoom">
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
                  <span className="text-sm text-slate-300">{t.autoZoomLabel}</span>
                </label>
              </div>
            </SettingRow>
          </Section>

          {instrumentMode === 'piano' && (
            <Section title={t.pianoDisplaySection}>
              <SettingRow label={t.visibleKeysLabel} htmlFor="piano-range-mode">
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
                  <h4 className="text-md font-semibold text-slate-200">{t.customKeyRangeTitle}</h4>
                  <SettingRow label={t.startNoteLabel} htmlFor="custom-start-note">
                    <input
                      id="custom-start-note"
                      type="text"
                      value={customStartNote}
                      onChange={e => onCustomStartNoteChange(e.target.value)}
                      className={numberInputStyle}
                      placeholder="e.g., A0"
                    />
                  </SettingRow>
                  <SettingRow label={t.endNoteLabel} htmlFor="custom-end-note">
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

            </>
          )}

          {(activeSettingsTab === 'all' || activeSettingsTab === 'midi' || settingsSearch.trim() !== '') && (
            <>
              {instrumentMode === 'piano' && (
                <Section title={t.controlsSection}>
              <SettingRow label={t.qwertyLayoutLabel} htmlFor="qwerty-layout">
                <select id="qwerty-layout" value={qwertyLayout} onChange={e => onQwertyLayoutChange(e.target.value as QwertyLayout)} className={selectStyles}>
                  <option value="mirp">{t.qwertyLayoutRoblox}</option>
                  <option value="default">{t.qwertyLayoutStandard}</option>
                </select>
              </SettingRow>
            </Section>
          )}

          <Section title={t.midiSection}>
            <SettingRow label={t.midiStatusLabel}>{renderMidiConnectButton()}</SettingRow>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="midi-input" className="block mb-2 text-sm font-medium text-slate-300">{t.inputDeviceLabel}</label>
                <select id="midi-input" value={selectedMidiInputId || ""} onChange={e => onSelectMidiInput(e.target.value || null)} className={selectStyles} disabled={midiAccessStatus !== 'granted'}>
                    <option value="">{midiInputs.size === 0 ? 'No Inputs Found' : t.disconnectMidi}</option>
                    {Array.from(midiInputs.values()).map((input: MIDIInput) => <option key={input.id} value={input.id}>{input.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="midi-output" className="block mb-2 text-sm font-medium text-slate-300">{t.outputDeviceLabel}</label>
                <select id="midi-output" value={selectedMidiOutputId || ""} onChange={e => onSelectMidiOutput(e.target.value || null)} className={selectStyles} disabled={midiAccessStatus !== 'granted'}>
                    <option value="">{midiOutputs.size === 0 ? 'Internal Synth (No MIDI Outputs)' : 'Internal Synth (Default)'}</option>
                    {Array.from(midiOutputs.values()).map((output: MIDIOutput) => <option key={output.id} value={output.id}>{output.name}</option>)}
                </select>
              </div>
            </div>
            {midiAccessStatus === 'granted' && midiInputs.size === 0 && midiOutputs.size === 0 && (
              <p className="text-xs text-amber-400 mt-2 text-center">
                {t.noMidiDevices}
              </p>
            )}
          </Section>
          
          {instrumentMode === 'piano' && (
            <Section title={t.acousticSection}>
              {/* 100% Direct In-Browser Audio to MIDI Status Card */}
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-cyan-500/30 mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isAudioInputEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span className="text-xs font-bold text-white tracking-wide">
                      {appLanguage === 'id' ? 'Audio-to-MIDI Langsung di Browser' : appLanguage === 'es' ? 'Audio-a-MIDI Directo en Navegador' : 'Direct In-Browser Audio-to-MIDI'}
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${
                    isAudioInputEnabled 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {isAudioInputEnabled 
                      ? (appLanguage === 'id' ? 'Aktif (Langsung di Browser)' : appLanguage === 'es' ? 'Activo (En Navegador)' : 'Active (In-Browser)') 
                      : (appLanguage === 'id' ? 'Nonaktif' : appLanguage === 'es' ? 'Inactivo' : 'Disabled')}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {appLanguage === 'id'
                    ? 'Ubah nada piano akustik asli Anda langsung menjadi not MIDI secara real-time melalui mikrofon browser. 100% terintegrasi langsung di Octavia tanpa perlu memasang aplikasi, berkas zip, atau server tambahan apa pun.'
                    : appLanguage === 'es'
                    ? 'Convierta notas de piano acústico directamente en notas MIDI en tiempo real a través del micrófono del navegador. 100% integrado directamente en Octavia sin descargas ni servidores externos.'
                    : 'Transcribe your real acoustic piano into live MIDI notes directly in your browser. 100% natively integrated into Octavia with zero downloads or external servers required.'}
                </p>

                {isAudioInputEnabled && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/30 p-2 rounded-xl border border-emerald-500/30">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>{appLanguage === 'id' ? 'Mikrofon aktif mendengarkan nada tuts piano Anda' : appLanguage === 'es' ? 'Micrófono activo escuchando las notas del piano' : 'Microphone actively listening to piano keys'}</span>
                  </div>
                )}
              </div>

              <ToggleRow id="audio-input-enabled" label={t.enableMicInput} checked={isAudioInputEnabled} onChange={onIsAudioInputEnabledChange} />
              <SettingRow label={t.micInputDevice} htmlFor="audio-input-device">
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
              {audioInputError && (
                <div className="bg-red-950/40 p-3 rounded-xl border border-red-500/30 text-xs text-red-200 text-center space-y-2 mt-2">
                  <p>{audioInputError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.mediaDevices?.getUserMedia({ audio: true }).then(() => {
                        onIsAudioInputEnabledChange(true);
                      }).catch(() => {
                        alert("Microphone permission denied. Please allow microphone access in your browser settings.");
                      });
                    }}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    {appLanguage === 'id' ? 'Beri Izin Mikrofon' : appLanguage === 'es' ? 'Permitir Micrófono' : 'Allow Microphone'}
                  </button>
                </div>
              )}
              
              {isAudioInputEnabled && (
                  <div className="bg-slate-900/50 p-4 rounded-lg mt-4 space-y-4 ring-1 ring-slate-700">
                      <h4 className="text-md font-semibold text-slate-200 border-b border-slate-700 pb-2">{t.detectionSensitivity}</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{t.adjustDbThresholds}</p>
                      
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

          </>
          )}

          {(activeSettingsTab === 'all' || activeSettingsTab === 'audio' || settingsSearch.trim() !== '') && (
            <>
          <Section title={t.audioSection}>
            <SettingRow label={`${t.pianoVolume} (${Math.round(masterVolume*100)}%)`} htmlFor="master-volume">
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
            {(isAudioInputEnabled || selectedMidiInputId) && <p className="text-xs text-amber-400 mt-1">{t.pianoVolumeMidiActiveDesc}</p>}
            <SettingRow label={`${t.metronomeVolume} (${Math.round(metronomeVolume*100)}%)`} htmlFor="metronome-volume">
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
            <SettingRow label={`${t.backingTrackVolume} (${Math.round(mp3Volume*100)}%)`} htmlFor="mp3-volume">
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
                  <h4 className="text-md font-semibold text-cyan-400">{t.latencyOffsetTitle}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t.latencyOffsetDesc}
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
                      {t.midiHitTimingOffset}
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
                      {t.calibrateBtn}
                    </button>
                  )}
                </div>

                {/* Quick step buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">{t.quickStep}</span>
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
                  {t.midiHitTimingDesc}
                </p>
              </div>

              {/* 2. MP3 Audio Offset */}
              {onUserAudioSyncOffsetChange && (
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">2</span>
                      <label htmlFor="audio-sync-offset" className="text-sm font-semibold text-slate-200">
                        {t.mp3AudioOffset}
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
                    <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">{t.quickStep}</span>
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
                    {t.mp3AudioOffsetDesc}
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
                        {t.metronomeOffset}
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
                    <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">{t.quickStep}</span>
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
                    {t.metronomeOffsetDesc}
                  </p>
                </div>
              )}
            </div>

            {/* Anti Double Trigger */}
            {instrumentMode === 'drum' && (
              <div id="anti-double-trigger-section" className="bg-slate-900/50 p-4 rounded-lg mt-4 space-y-4 ring-1 ring-slate-700">
                <ToggleRow 
                  id="anti-double-trigger-enabled" 
                  label={t.antiDoubleTrigger} 
                  checked={antiDoubleTriggerEnabled} 
                  onChange={onAntiDoubleTriggerEnabledChange} 
                />
                {antiDoubleTriggerEnabled && (
                  <div className="space-y-2">
                    <SettingRow label={`${t.minimumInterval} (${antiDoubleTriggerInterval.toFixed(2)}ms)`} htmlFor="anti-double-trigger-interval">
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
                      {t.antiDoubleTriggerDesc}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Drum Input Mapping */}
            {instrumentMode === 'drum' && (
              <div id="drum-mapping-section" className="bg-slate-900/50 p-4 rounded-lg mt-4 space-y-4 ring-1 ring-slate-700 text-left">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                  <h4 className="text-md font-semibold text-cyan-400">{t.drumMidiMappingTitle}</h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleResetDrumMapping}
                      className={`${commonButtonStyles} bg-slate-700 hover:bg-slate-600 text-slate-100 ring-1 ring-slate-600`}
                    >
                      {t.resetBtn}
                    </button>
                    {/* Visual indicator that it's auto-saved */}
                    <div className="flex items-center px-4 bg-emerald-900/30 text-emerald-400 rounded ring-1 ring-emerald-500/50 text-[10px] font-bold uppercase tracking-wider">
                       {t.autoSavedBadge}
                    </div>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {t.drumMidiMappingDesc}
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
                          {mappingPadId === pad.id ? t.hitDrumBtn : t.mapBtn}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {pad.midiNotes.length === 0 ? (
                          <span className="text-[9px] text-slate-600 italic">{t.noNotesMapped}</span>
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

          </>
          )}

          {(activeSettingsTab === 'all' || activeSettingsTab === 'theme' || settingsSearch.trim() !== '') && (
            <>
          <Section title={t.appearanceSection}>
            <SettingRow label={t.rightHandColor} htmlFor="rh-color">
              <input type="color" id="rh-color" value={themeSettings.rightHandColor} onChange={e => onThemeSettingsChange({...themeSettings, rightHandColor: e.target.value})} className={colorInputStyle} />
            </SettingRow>
            <SettingRow label={t.leftHandColor} htmlFor="lh-color">
              <input type="color" id="lh-color" value={themeSettings.leftHandColor} onChange={e => onThemeSettingsChange({...themeSettings, leftHandColor: e.target.value})} className={colorInputStyle} />
            </SettingRow>
            <SettingRow label={t.fallingNotesBgColor} htmlFor="bg-color">
              <input type="color" id="bg-color" value={themeSettings.fallingNotesBackgroundColor} onChange={e => onThemeSettingsChange({...themeSettings, fallingNotesBackgroundColor: e.target.value})} className={colorInputStyle} />
            </SettingRow>
            <SettingRow label={t.hitNoteColor} htmlFor="hit-note-color">
              <input type="color" id="hit-note-color" value={themeSettings.hitNoteColor} onChange={e => onThemeSettingsChange({...themeSettings, hitNoteColor: e.target.value})} className={colorInputStyle} />
            </SettingRow>
            
            <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
              <h4 className="text-md font-semibold text-violet-400">{t.bgMediaTitle}</h4>
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
                    {t.uploadBtn}
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
                      {t.clearBtn}
                    </button>
                  )}
                </div>
                <SettingRow label={`${t.bgOpacity} (${Math.round((themeSettings.backgroundOpacity ?? 0.1) * 100)}%)`} htmlFor="bg-opacity">
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
            </>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 text-xs text-slate-400"><span role="status" aria-live="polite">{props.previewStatus}</span><button type="button" className="min-h-11 shrink-0 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white" onClick={props.onRestartPreview}>{t.restartPreviewBtn}</button></div>
        <div className="mt-8 flex justify-center space-x-4">
             <button onClick={onBack} className={`${commonButtonStyles} ${secondaryButtonStyles} w-32`} style={{ zIndex: 9999 }}>{t.backBtn}</button>
             <button onClick={() => { if(confirm(t.resetConfirm)) onResetSettings(); }} className={`${commonButtonStyles} bg-red-600 hover:bg-red-700 text-white w-40`} style={{ zIndex: 9999 }}>{t.resetSettingsBtn}</button>
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

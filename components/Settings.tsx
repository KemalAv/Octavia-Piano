import React, { useState, useEffect } from 'react';
import { MidiAccessStatus, MIDIInput, MIDIOutput, NoteLabelType, ViewMode, ThemeSettings, DevicePreset, LayoutDimensions, QwertyLayout } from '../types';
import { DEVICE_LAYOUTS } from '../constants'; // Import DEVICE_LAYOUTS

interface SettingsProps {
  onBack: () => void;
  midiAccessStatus: MidiAccessStatus;
  midiInputs: Map<string, MIDIInput>;
  selectedMidiInputId: string | null;
  onSelectMidiInput: (id: string | null) => void;
  midiOutputs: Map<string, MIDIOutput>;
  selectedMidiOutputId: string | null;
  onSelectMidiOutput: (id: string | null) => void;
  connectMidi: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  noteLabelType: NoteLabelType;
  onNoteLabelTypeChange: (type: NoteLabelType) => void;
  showOnlyMajorNotes: boolean; 
  onShowOnlyMajorNotesChange: (value: boolean) => void;
  showQwertyShortcuts: boolean;
  onShowQwertyShortcutsChange: (value: boolean) => void;
  hideBarNavigationButtons: boolean;
  onHideBarNavigationButtonsChange: (value: boolean) => void;
  autoHideTopBar: boolean;
  onAutoHideTopBarChange: (value: boolean) => void;
  masterVolume: number;
  onMasterVolumeChange: (volume: number) => void;
  metronomeVolume: number;
  onMetronomeVolumeChange: (volume: number) => void;
  metronomeOffsetMs: number; // NEW: Metronome offset prop
  onMetronomeOffsetChange: (offset: number) => void; // NEW: Metronome offset handler
  themeSettings: ThemeSettings;
  onThemeSettingsChange: (settings: ThemeSettings) => void;
  devicePreset: DevicePreset;
  onDevicePresetChange: (preset: DevicePreset) => void;
  // NEW: Piano Range props
  pianoRangeMode: 'full' | '61-key' | '37-key' | '25-key' | 'custom';
  onPianoRangeModeChange: (mode: 'full' | '61-key' | '37-key' | '25-key' | 'custom') => void;
  customStartNote: string;
  onCustomStartNoteChange: (note: string) => void;
  customEndNote: string;
  onCustomEndNoteChange: (note: string) => void;
  // NEW: Keyboard Layout Props
  qwertyLayout: QwertyLayout;
  onQwertyLayoutChange: (layout: QwertyLayout) => void;
  // NEW: Piano Tiles Background Prop
  showPianoTilesBackground: boolean;
  onShowPianoTilesBackgroundChange: (value: boolean) => void;
  // NEW: UI Zoom Prop
  uiZoom: number;
  onUiZoomChange: (zoom: number) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode; showInfoButton?: boolean; onInfoClick?: () => void }> = ({ title, children, showInfoButton, onInfoClick }) => (
  <div>
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
  </div>
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

const Settings: React.FC<SettingsProps> = (props) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false); // NEW state for info modal
  const [isInfoModalRendered, setIsInfoModalRendered] = useState(false); // For info modal animations
  // NEW: State for Bar Navigation info modal
  const [isBarNavInfoModalOpen, setIsBarNavInfoModalOpen] = useState(false);
  const [isBarNavInfoModalRendered, setIsBarNavInfoModalRendered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsRendered(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Effect for info modal rendering
  useEffect(() => {
    if (isInfoModalOpen) {
      const timer = setTimeout(() => setIsInfoModalRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsInfoModalRendered(false);
    }
  }, [isInfoModalOpen]);

  // NEW: Effect for Bar Navigation info modal rendering
  useEffect(() => {
    if (isBarNavInfoModalOpen) {
      const timer = setTimeout(() => setIsBarNavInfoModalRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsBarNavInfoModalRendered(false);
    }
  }, [isBarNavInfoModalOpen]);


  const {
    onBack, midiAccessStatus, midiInputs, selectedMidiInputId, onSelectMidiInput,
    midiOutputs, selectedMidiOutputId, onSelectMidiOutput, connectMidi,
    viewMode, onViewModeChange, noteLabelType, onNoteLabelTypeChange,
    showOnlyMajorNotes, onShowOnlyMajorNotesChange,
    showQwertyShortcuts,
    onShowQwertyShortcutsChange, hideBarNavigationButtons, onHideBarNavigationButtonsChange,
    autoHideTopBar, onAutoHideTopBarChange,
    masterVolume, onMasterVolumeChange, metronomeVolume, onMetronomeVolumeChange,
    metronomeOffsetMs, onMetronomeOffsetChange, // NEW: Destructure metronome offset props
    themeSettings, onThemeSettingsChange,
    devicePreset, onDevicePresetChange,
    pianoRangeMode, onPianoRangeModeChange, customStartNote, onCustomStartNoteChange, customEndNote, onCustomEndNoteChange,
    qwertyLayout, onQwertyLayoutChange, 
    showPianoTilesBackground, onShowPianoTilesBackgroundChange, // Destructure new props
    uiZoom, onUiZoomChange, // Destructure UI Zoom
  } = props;

  const commonButtonStyles = "px-3 py-1.5 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-opacity-75 flex items-center justify-center shadow-md";
  const secondaryButtonStyles = "bg-slate-600 hover:bg-slate-700 text-slate-100";
  const selectStyles = `bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block w-full p-2.5 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed`;
  const colorInputStyle = `p-1 h-10 w-14 block bg-slate-700 border border-slate-600 cursor-pointer rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out`;
  const rangeSliderStyle = "w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer";
  const numberInputStyle = `w-24 p-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-violet-500 focus:border-violet-500 text-sm`;


  const renderMidiConnectButton = () => {
     switch (midiAccessStatus) {
        case 'uninitialized':
            return <button onClick={connectMidi} className={`${commonButtonStyles} ${secondaryButtonStyles}`}>Connect MIDI Devices</button>;
        case 'requesting':
            return <span className="text-sm text-slate-400 animate-pulse">Requesting Access...</span>;
        case 'denied':
            return <button onClick={connectMidi} className={`${commonButtonStyles} bg-red-500 hover:bg-red-600 text-white`}>Access Denied. Retry?</button>;
        case 'unsupported':
            return <span className="text-sm text-slate-500">Web MIDI Not Supported</span>;
        case 'granted':
             return <button onClick={connectMidi} className={`${commonButtonStyles} bg-green-600 hover:bg-green-700`}>Rescan Devices</button>;
        default:
            return null;
     }
  }

  const gameplayStyle = viewMode === 'sheet-qwerty' ? 'computer' : 'piano';

  const handleGameplayStyleChange = (style: 'piano' | 'computer') => {
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
      onShowOnlyMajorNotesChange(false);
    }
  };

  const gameplayPresetButtonBase = "p-4 rounded-lg border-2 transition-all text-left h-full flex flex-col cursor-pointer";
  const gameplayPresetSelected = "bg-violet-500/80 border-violet-400 shadow-lg scale-105 ring-2 ring-violet-400";
  const gameplayPresetUnselected = "bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500";

  return (
    <>
      <div className={`bg-slate-800/80 backdrop-blur-sm p-6 md:p-8 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar ring-1 ring-slate-700 transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-cyan-400">Settings</h2>
            <button onClick={onBack} className="text-slate-400 hover:text-white text-3xl leading-none" style={{ zIndex: 9999 }} aria-label="Close settings">&times;</button>
        </div>
        
        <div className="space-y-8">
          <Section title="Gameplay Style">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </Section>

          <Section title="Device & UI" showInfoButton={true} onInfoClick={() => setIsInfoModalOpen(true)}>
            <SettingRow label={`UI Zoom (${uiZoom}%)`} htmlFor="ui-zoom">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onUiZoomChange(Math.max(25, uiZoom - 5))}
                  className="px-3 py-1 rounded-md text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-opacity-75 bg-slate-600 hover:bg-slate-700 text-slate-100 active:scale-95"
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
                  onChange={e => onUiZoomChange(parseInt(e.target.value, 10))}
                  className={`${rangeSliderStyle} w-32 md:w-40`}
                />
                <button
                  onClick={() => onUiZoomChange(Math.min(200, uiZoom + 5))}
                  className="px-3 py-1 rounded-md text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-opacity-75 bg-slate-600 hover:bg-slate-700 text-slate-100 active:scale-95"
                  aria-label="Increase UI zoom"
                >
                  +
                </button>
              </div>
            </SettingRow>

            <SettingRow label="Piano Size" htmlFor="device-preset">
              <select id="device-preset" value={devicePreset} onChange={e => onDevicePresetChange(e.target.value as DevicePreset)} className={selectStyles}>
                <option value="desktop">Default</option>
                <option value="tablet">Touch Screen</option>
              </select>
            </SettingRow>

          </Section>

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

          <Section title="Controls">
            <SettingRow label="QWERTY Keyboard Layout" htmlFor="qwerty-layout">
              <select id="qwerty-layout" value={qwertyLayout} onChange={e => onQwertyLayoutChange(e.target.value as QwertyLayout)} className={selectStyles}>
                <option value="mirp">Layout 1 (Roblox): Shift = black keys, ↑/↓ = ±1 semitones</option>
                <option value="default">Layout 2 (Standard): ↑/↓ = ±1 octave</option>
              </select>
            </SettingRow>
          </Section>

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
                    <option value="">{midiOutputs.size === 0 ? 'No Outputs Found' : 'Use Internal Synth'}</option>
                    {Array.from(midiOutputs.values()).map((output: MIDIOutput) => <option key={output.id} value={output.id}>{output.name}</option>)}
                </select>
              </div>
            </div>
          </Section>
          
          <Section title="Visuals & Gameplay">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingRow label="Game View" htmlFor="view-mode">
                <select id="view-mode" value={viewMode} onChange={e => onViewModeChange(e.target.value as ViewMode)} className={`${selectStyles} max-w-xs`} disabled={gameplayStyle === 'computer'}>
                  <option value="falling">Falling Notes</option>
                  <option value="sheet">Sheet Music</option>
                  <option value="sheet-roll">Sheet Music Roll</option>
                  {gameplayStyle !== 'piano' && <option value="sheet-qwerty">Sheet Music QWERTY</option>}
                </select>
              </SettingRow>
              <SettingRow label="Note Labels" htmlFor="note-label">
                <select id="note-label" value={noteLabelType} onChange={e => onNoteLabelTypeChange(e.target.value as NoteLabelType)} className={`${selectStyles} max-w-xs`} disabled={gameplayStyle === 'computer'}>
                  <option value="none">None</option>
                  <option value="fingering">Fingering (Beta)</option>
                  <option value="noteName">Note Name</option>
                  {gameplayStyle !== 'piano' && <option value="qwerty">QWERTY Keys</option>}
                </select>
              </SettingRow>
            </div>
            <ToggleRow id="major-notes-only" label="Show Only Major Notes (Falling Notes)" checked={showOnlyMajorNotes} onChange={onShowOnlyMajorNotesChange} disabled={gameplayStyle === 'computer'}/>
            <ToggleRow id="show-piano-tiles" label="Show Piano Tiles Background" checked={showPianoTilesBackground} onChange={onShowPianoTilesBackgroundChange} />
            <ToggleRow id="qwerty-shortcuts" label="Show QWERTY Shortcuts on Keys" checked={showQwertyShortcuts} onChange={onShowQwertyShortcutsChange} disabled={true} />
            
            {/* Bar Navigation Info - Toggle removed to force visible */}
            <div className="flex items-center justify-between p-2 rounded-md bg-slate-700/30">
              <span className="text-sm font-medium text-slate-300 flex-grow">Bar Navigation Controls</span>
              <button 
                onClick={() => setIsBarNavInfoModalOpen(true)}
                className="ml-2 p-1 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white transition-colors flex items-center justify-center"
                aria-label="Information about Bar Navigation"
                title="Information about Bar Navigation"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
              </button>
            </div>

            <ToggleRow id="auto-hide-top-bar" label="Auto-hide Top Bar" checked={autoHideTopBar} onChange={onAutoHideTopBarChange} />
          </Section>
          
          <Section title="Audio">
            <SettingRow label={`Piano Volume (${Math.round(masterVolume*100)}%)`} htmlFor="master-volume">
              <input 
                id="master-volume" 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={masterVolume} 
                onChange={e => onMasterVolumeChange(parseFloat(e.target.value))} 
                className={`${rangeSliderStyle} max-w-xs`} 
              />
            </SettingRow>
            <SettingRow label={`Metronome Volume (${Math.round(metronomeVolume*100)}%)`} htmlFor="metronome-volume">
              <input 
                id="metronome-volume" 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={metronomeVolume} 
                onChange={e => onMetronomeVolumeChange(parseFloat(e.target.value))} 
                className={`${rangeSliderStyle} max-w-xs`} 
              />
            </SettingRow>
            <SettingRow label={`Metronome Offset (${metronomeOffsetMs}ms)`} htmlFor="metronome-offset">
              <input 
                id="metronome-offset" 
                type="range" 
                min="-100" 
                max="100" 
                step="5" 
                value={metronomeOffsetMs} 
                onChange={e => onMetronomeOffsetChange(parseInt(e.target.value, 10))} 
                className={`${rangeSliderStyle} max-w-xs`} 
              />
            </SettingRow>
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
          </Section>
        </div>

        <div className="mt-8 flex justify-center space-x-4">
             <button onClick={onBack} className={`${commonButtonStyles} ${secondaryButtonStyles} w-32`} style={{ zIndex: 9999 }}>Back</button>
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
            className={`bg-slate-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl max-w-md w-full ring-1 ring-slate-700 transform transition-all duration-300 ease-in-out ${isInfoModalRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
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

      {/* NEW: Bar Navigation Info Modal */}
      {isBarNavInfoModalOpen && (
        <div
          className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-[60] p-4 transition-opacity duration-300 ease-in-out ${isBarNavInfoModalRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`}
          onClick={() => setIsBarNavInfoModalOpen(false)} // Close on background click
          role="dialog"
          aria-modal="true"
          aria-labelledby="bar-nav-info-title"
        >
          <div
            className={`bg-slate-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl max-w-md w-full ring-1 ring-slate-700 transform transition-all duration-300 ease-in-out ${isBarNavInfoModalRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            role="document"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 id="bar-nav-info-title" className="text-2xl font-bold text-cyan-400">Bar Navigation Controls</h2>
              <button
                onClick={() => setIsBarNavInfoModalOpen(false)}
                className="text-3xl text-slate-400 hover:text-white leading-none"
                aria-label="Close information modal"
              >&times;</button>
            </div>
            <div className="text-slate-300 text-lg mb-6 space-y-4">
              <p>These controls allow you to quickly move through the song, jumping to the previous or next beat/bar.</p>
              <div>
                <p className="font-semibold text-white">On PC (Keyboard):</p>
                <p className="text-sm ml-4">Use the <kbd className="bg-slate-700 px-1.5 py-0.5 rounded-md font-mono text-cyan-300">Left Arrow</kbd> (<span className='font-mono'>&larr;</span>) and <kbd className="bg-slate-700 px-1.5 py-0.5 rounded-md font-mono text-cyan-300">Right Arrow</kbd> (<span className='font-mono'>&rarr;</span>) keys.</p>
              </div>
              <div>
                <p className="font-semibold text-white">On Touch Devices (Tablet/Phone):</p>
                <p className="text-sm ml-4">Tap the left or right edges of the music display area.</p>
              </div>
              <p>
                <span className="font-semibold text-white">Prerequisite</span>: Bar navigation works only when the metronome is set to '<span className="font-semibold text-cyan-300">Beat</span>' or '<span className="font-semibold text-cyan-300">Bar</span>' mode.
              </p>
              <p className="text-red-300 font-semibold">
                Note: Bar navigation is disabled in 'Retical Mode'.
              </p>
            </div>
            <button
              onClick={() => setIsBarNavInfoModalOpen(false)}
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
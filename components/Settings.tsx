
import React from 'react';
import { MidiAccessStatus, MIDIInput, MIDIOutput, NoteLabelType, ViewMode, ThemeSettings } from '../types';

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
  showOnlyMajorRests: boolean;
  onShowOnlyMajorRestsChange: (value: boolean) => void;
  showQwertyShortcuts: boolean;
  onShowQwertyShortcutsChange: (value: boolean) => void;
  hideBarNavigationButtons: boolean;
  onHideBarNavigationButtonsChange: (value: boolean) => void;
  masterVolume: number;
  onMasterVolumeChange: (volume: number) => void;
  metronomeVolume: number;
  onMetronomeVolumeChange: (volume: number) => void;
  themeSettings: ThemeSettings;
  onThemeSettingsChange: (settings: ThemeSettings) => void;
  pianoScale: number;
  onPianoScaleChange: (scale: number) => void;
  pianoHorizontalOffset: number;
  onPianoHorizontalOffsetChange: (offset: number) => void;
}

const Settings: React.FC<SettingsProps> = (props) => {
  const {
    onBack, midiAccessStatus, midiInputs, selectedMidiInputId, onSelectMidiInput,
    midiOutputs, selectedMidiOutputId, onSelectMidiOutput, connectMidi,
    viewMode, onViewModeChange, noteLabelType, onNoteLabelTypeChange,
    showOnlyMajorRests, onShowOnlyMajorRestsChange, showQwertyShortcuts,
    onShowQwertyShortcutsChange, hideBarNavigationButtons, onHideBarNavigationButtonsChange,
    masterVolume, onMasterVolumeChange, metronomeVolume, onMetronomeVolumeChange,
    themeSettings, onThemeSettingsChange, pianoScale, onPianoScaleChange,
    pianoHorizontalOffset, onPianoHorizontalOffsetChange
  } = props;

  const commonButtonStyles = "px-3 py-1.5 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-opacity-75 flex items-center justify-center shadow-md";
  const secondaryButtonStyles = "bg-slate-600 hover:bg-slate-700 text-slate-100";
  const selectStyles = `bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block w-full p-2.5 transition-all duration-150 ease-in-out`;
  const colorInputStyle = `p-1 h-10 w-14 block bg-slate-700 border border-slate-600 cursor-pointer rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out`;
  const rangeSliderStyle = "w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer";
  const checkboxStyle = "h-5 w-5 text-cyan-500 rounded border-slate-500 focus:ring-cyan-400 ml-3";

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
  
  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
      <h3 className="text-xl font-semibold text-violet-400 mb-4 border-b border-slate-700 pb-2">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const SettingRow: React.FC<{ label: string; htmlFor?: string; children: React.ReactNode }> = ({ label, htmlFor, children }) => (
    <div className="flex items-center justify-between">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-300">{label}</label>
      {children}
    </div>
  );
  
  const ToggleRow: React.FC<{ label: string; id: string; checked: boolean; onChange: (checked: boolean) => void;}> = ({label, id, checked, onChange}) => (
    <div className="flex items-center justify-between p-2 rounded-md bg-slate-700/30">
        <label htmlFor={id} className="text-sm font-medium text-slate-300 cursor-pointer flex-grow">{label}</label>
        <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} className={checkboxStyle} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950 bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 md:p-8 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar ring-1 ring-slate-700">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-cyan-400">Settings</h2>
            <button onClick={onBack} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        
        <div className="space-y-8">
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
                <select id="view-mode" value={viewMode} onChange={e => onViewModeChange(e.target.value as ViewMode)} className={`${selectStyles} max-w-xs`}>
                  <option value="falling">Falling Notes</option>
                  <option value="sheet">Sheet Music</option>
                </select>
              </SettingRow>
              <SettingRow label="Falling Note Labels" htmlFor="note-label">
                <select id="note-label" value={noteLabelType} onChange={e => onNoteLabelTypeChange(e.target.value as NoteLabelType)} className={`${selectStyles} max-w-xs`}>
                  <option value="none">None</option>
                  <option value="fingering">Fingering</option>
                  <option value="noteName">Note Name</option>
                </select>
              </SettingRow>
            </div>
            <ToggleRow id="major-rests" label="Show only major rests (Sheet Music)" checked={showOnlyMajorRests} onChange={onShowOnlyMajorRestsChange} />
            <ToggleRow id="qwerty-shortcuts" label="Show QWERTY Shortcuts on Keys" checked={showQwertyShortcuts} onChange={onShowQwertyShortcutsChange} />
            <ToggleRow id="hide-bar-nav" label="Hide Bar Navigation Buttons" checked={hideBarNavigationButtons} onChange={onHideBarNavigationButtonsChange} />
          </Section>

          <Section title="Keyboard Layout">
            <SettingRow label={`Keyboard Size (${Math.round(pianoScale * 100)}%)`} htmlFor="piano-scale-slider">
              <input id="piano-scale-slider" type="range" min="50" max="400" step="1" value={Math.round(pianoScale * 100)} onChange={e => onPianoScaleChange(parseInt(e.target.value, 10) / 100)} className={`${rangeSliderStyle} max-w-xs`} />
            </SettingRow>
            <SettingRow label={`Horizontal Offset (${pianoHorizontalOffset}px)`} htmlFor="piano-offset-slider">
              <input id="piano-offset-slider" type="range" min="-500" max="500" step="5" value={pianoHorizontalOffset} onChange={e => onPianoHorizontalOffsetChange(parseInt(e.target.value, 10))} className={`${rangeSliderStyle} max-w-xs`} />
            </SettingRow>
          </Section>
          
          <Section title="Audio">
            <SettingRow label={`Master Volume (${Math.round(masterVolume*100)}%)`} htmlFor="master-volume">
              <input id="master-volume" type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={e => onMasterVolumeChange(parseFloat(e.target.value))} className={`${rangeSliderStyle} max-w-xs`} />
            </SettingRow>
            <SettingRow label={`Metronome Volume (${Math.round(metronomeVolume*100)}%)`} htmlFor="metronome-volume">
              <input id="metronome-volume" type="range" min="0" max="1" step="0.01" value={metronomeVolume} onChange={e => onMetronomeVolumeChange(parseFloat(e.target.value))} className={`${rangeSliderStyle} max-w-xs`} />
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

        <div className="mt-8 text-center">
             <button onClick={onBack} className={`${commonButtonStyles} ${secondaryButtonStyles} w-32`}>Back</button>
        </div>

      </div>
    </div>
  );
};

export default Settings;

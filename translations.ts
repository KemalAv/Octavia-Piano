import { AppLanguage } from './types';

export interface TranslationDictionary {
  // Settings - General & Sections
  settingsTitle: string;
  closeSettings: string;
  languageSectionTitle: string;
  appLanguageLabel: string;
  gameplayStyleSection: string;
  pianoStyleTitle: string;
  pianoStyleDesc: string;
  computerStyleTitle: string;
  computerStyleDesc: string;
  drumNonMidiTitle: string;
  drumNonMidiDesc: string;
  drumMidiTitle: string;
  drumMidiDesc: string;

  // Device & UI
  deviceUiSection: string;
  uiZoomLabel: string;
  autoZoomLabel: string;
  autoZoomDesc: string;
  screenPresetsLabel: string;

  // Piano Display
  pianoDisplaySection: string;
  visibleKeysLabel: string;
  startNoteLabel: string;
  endNoteLabel: string;
  customKeyRangeTitle: string;

  // Controls
  controlsSection: string;
  qwertyLayoutLabel: string;
  qwertyLayoutRoblox: string;
  qwertyLayoutStandard: string;

  // MIDI
  midiSection: string;
  midiStatusLabel: string;
  inputDeviceLabel: string;
  outputDeviceLabel: string;
  noMidiDevices: string;
  rescanDevices: string;
  connectMidi: string;
  disconnectMidi: string;

  // Acoustic Piano
  acousticSection: string;
  enableMicInput: string;
  micInputDevice: string;
  detectionSensitivity: string;
  adjustDbThresholds: string;
  micBetaNoticeTitle: string;
  micBetaNoticeDesc: string;

  // Visuals & Gameplay
  visualsSection: string;
  gameViewLabel: string;
  noteLabelsLabel: string;
  fingeringSettingsTitle: string;
  handSizeLabel: string;
  showHand3DLabel: string;
  showHand3DDesc: string;
  showMajorNotesOnly: string;
  showMajorNotesOnlyDesc: string;
  showPianoTilesBg: string;
  pianoTilesOpacity: string;
  showPerfectText: string;
  showPianoKeyboardNonFalling: string;
  showPianoKeyboardNonFallingDesc: string;
  showDrumPads: string;
  showDrumPadsDesc: string;
  showDynamics: string;
  showDynamicsDesc: string;
  inGameResolution: string;
  appearingKeysOpacity: string;
  appearingKeysOpacityDesc: string;
  showQwertyShortcuts: string;

  // Audio
  audioSection: string;
  pianoVolume: string;
  pianoVolumeMidiActiveDesc: string;
  metronomeVolume: string;
  backingTrackVolume: string;
  latencyOffsetTitle: string;
  latencyOffsetDesc: string;
  midiHitTimingOffset: string;
  calibrateBtn: string;
  quickStep: string;
  midiHitTimingDesc: string;
  mp3AudioOffset: string;
  mp3AudioOffsetDesc: string;
  metronomeOffset: string;
  metronomeOffsetDesc: string;
  antiDoubleTrigger: string;
  antiDoubleTriggerDesc: string;
  minimumInterval: string;

  // Drum Mapping
  drumMidiMappingTitle: string;
  drumMidiMappingDesc: string;
  resetBtn: string;
  autoSavedBadge: string;
  hitDrumBtn: string;
  mapBtn: string;
  noNotesMapped: string;

  // Appearance
  appearanceSection: string;
  rightHandColor: string;
  leftHandColor: string;
  fallingNotesBgColor: string;
  hitNoteColor: string;
  bgMediaTitle: string;
  uploadBtn: string;
  clearBtn: string;
  bgOpacity: string;
  restartPreviewBtn: string;
  backBtn: string;
  resetSettingsBtn: string;
  resetConfirm: string;

  // Main Menu
  playNow: string;
  learnMode: string;
  comingSoon: string;
  social: string;
  settings: string;
  profile: string;
  login: string;
  howToConnect: string;
  about: string;
  contact: string;
  privacy: string;
  disclaimer: string;
  pianoRhythmGame: string;
  drumRhythmGame: string;

  // Song Selection
  communityLibrary: string;
  localImport: string;
  selectTrack: string;
  uploadYourFile: string;
  fetchingTrackData: string;
  preparingAudioEngine: string;
  readyStatus: string;
  startGame: string;
  editMidi: string;
  chooseOnlinePrompt: string;
  chooseLocalPrompt: string;
  selectLocalFile: string;
  fileNotSupported: string;
  cancel: string;
  apply: string;
  title: string;
  artist: string;
  arranger: string;
  description: string;
  audioOffsetMs: string;
  backgroundUrl: string;
  accuracyLevel: string;
  accuracyLevelDesc: string;

  // Mode Selection
  gameMode: string;
  lenientPracticeTitle: string;
  lenientPracticeDesc: string;
  strictPracticeTitle: string;
  strictPracticeDesc: string;
  autoplayTitle: string;
  autoplayDesc: string;
  reticalModeTitle: string;
  reticalModeDesc: string;
  reticalDisabledMic: string;
  backingTrackHeader: string;
  backingNone: string;
  backingMp3: string;
  backingOnline: string;
  backingUrl: string;
  streamingReady: string;
  directAudioReady: string;
  tempo: string;
  rankedTempoNotice: string;
  handSelection: string;
  leftHand: string;
  rightHand: string;
  bothHands: string;
  nonStopMode: string;
  nonStopDesc: string;
  enableHp: string;
  enableHpDesc: string;

  // TopBar & In-Game HUD
  exit: string;
  play: string;
  pause: string;
  stop: string;
  zoom: string;
  accuracy: string;
  combo: string;
  waitTime: string;
  fixSync: string;
  globalMsOffset: string;
  tapTimingAvg: string;
  record: string;
  saveMidi: string;

  // Modals (Game Over & Performance Summary)
  gameOver: string;
  gameOverHpDesc: string;
  loopActive: string;
  loopActiveDesc: string;
  retry: string;
  tryAgain: string;
  close: string;
  performanceSummary: string;
  rank: string;
  gameplayStyle: string;
  perfect: string;
  great: string;
  good: string;
  miss: string;
  maxCombo: string;
  performanceScore: string;
  speedEfficiency: string;
  hits: string;
  error: string;
  continueBtn: string;
  // Enhanced UI & Navigation
  heroBadge: string;
  heroTitle: string;
  heroDescPiano: string;
  heroDescDrum: string;
  playCardDesc: string;
  learnCardDesc: string;
  learnCardDrumDesc: string;
  socialCardDesc: string;
  howToConnectDesc: string;
  featuredBadge: string;
  lessonBadge: string;
  rankedBadge: string;
  setupBadge: string;
  browseSongsBtn: string;
  startLearningBtn: string;
  viewLeaderboardBtn: string;
  openGuideBtn: string;
  systemLoading: string;

  songLibraryTitle: string;
  freePlayTab: string;
  freePlayTitle: string;
  freePlayDesc: string;
  launchFreePlay: string;
  importLocalTitle: string;
  importLocalDesc: string;
  newMidiEditor: string;
  parsingMidiSub: string;
  readyToPlay: string;
  selectAndPlay: string;
  localImportModalTitle: string;
  optionalLabel: string;
  youtubeBackingLabel: string;
  audioOffsetLabel: string;
  backgroundUrlLabel: string;
  accuracyToleranceLabel: string;
  loadThisMidi: string;

  step1Title: string;
  step2Title: string;
  displayAndLabelsHeader: string;
  visualSettingsHeader: string;
  displayPanelDesc: string;
  displayPanelDescDrum: string;
  viewModeDrumTyper: string;
  viewModeDrumMania: string;
  viewModeFallingNotes: string;
  viewModeSheetMusic: string;
  viewModeRollSheet: string;
  viewModeSheetQwerty: string;
  viewModeQwertyTyper: string;
  openDisplaySettingsBtn: string;
  noteLabelNameDisplay: string;
  noteLabelFingeringDisplay: string;
  noteLabelNoneDisplay: string;
  noteLabelQwertyDisplay: string;
  autoSetupTitle: string;
  autoSetupDesc: string;
  openFullSettingsBtn: string;
  quickPresets: string;
  presetStandard: string;
  presetFingering: string;
  presetSheet: string;
  presetQwerty: string;
  changeSongBtn: string;
  activeBadge: string;
  lenientBadgeDesc: string;
  strictBadgeDesc: string;
  rankedBadgeDesc: string;
  autoplayBadgeDesc: string;
  audioSyncTitle: string;
  applyAverageOffset: string;
  modeReadyLabel: string;
  startGameAction: string;

  searchPlaceholder: string;
  uploadMidiBtn: string;
  sortByLabel: string;
  sortNewest: string;
  sortOldest: string;
  sortEasiest: string;
  sortHardest: string;
  sortAZ: string;
  sortZA: string;
  sortMostLiked: string;
  sortLeastLiked: string;
  filterLabel: string;
  filterAll: string;
  filterRanked: string;
  filterNonRanked: string;
  filterLiked: string;
  filterDifficultyLabel: string;
  difficultyAll: string;
  difficultyNovice: string;
  difficultyBeginner: string;
  difficultyIntermediate: string;
  difficultyAdvanced: string;
  difficultyVirtuoso: string;
  difficultyLegendary: string;
  noSongsFoundTitle: string;
  noSongsFoundDesc: string;
  loadMoreSongs: string;
  loadingMore: string;
  copiedBadge: string;
  copyIdTooltip: string;
  personalBestLabel: string;
  uploadedBy: string;
  selectSongBtn: string;

  settingsSubtitle: string;
  settingsSearchPlaceholder: string;
  tabGameplay: string;
  tabMidi: string;
  tabAudio: string;
  tabVisuals: string;
  tabAll: string;
  amtEngineDesc: string;
  downloadAmtBtn: string;
  checkAmtBtn: string;
  amtGuideStep1: string;
  amtGuideStep2: string;
  amtGuideStep3: string;
  // Extended UI, Modals & Controls
  fingering3DTitle: string;
  fingering3DDesc: string;
  streamingLink: string;
  importantNotice: string;
  midiControllerDelayNotice: string;
  backingSyncNotice: string;
  defaultSource: string;
  defaultOffset: string;
  audioToMidiDirectTitle: string;
  activeInBrowser: string;
  disabledStatus: string;
  audioToMidiDesc: string;
  micListeningActive: string;
  allowMicrophoneBtn: string;
  noMicrophonesFound: string;
  micPermissionDeniedAlert: string;
  zoomDirectionLabel: string;
  zoomDirectionNormal: string;
  zoomDirectionReverse: string;
  customRangeOption: string;
  full88Keys: string;
  compact61Keys: string;
  runLatencyCalibrationTitle: string;
  removeMapping: string;
  bgMediaPlaceholder: string;
  exitCalibration: string;
  timeSignatureLabel: string;
  stopRecording: string;
  startRecording: string;
  downloadRecordingAsMidi: string;
  barLabel: string;
  setLoopStartTooltip: string;
  setLoopEndTooltip: string;
  clearLoopTooltip: string;
  showFullMenu: string;
  hideFullMenu: string;
  exitToSongSelection: string;
  stopPlaybackAndReset: string;
  editBtn: string;
  downloadBtn: string;
  deleteBtn: string;
  leaderboardTitle: string;
  uploadMidiModalTitle: string;
  editMidiModalTitle: string;
  midiTitleLabel: string;
  artistLabel: string;
  arrangerOptional: string;
  arrangerPlaceholder: string;
  descOptional: string;
  descPlaceholder: string;
  mp3LinkOptional: string;
  mp3OffsetOptional: string;
  bgUrlOptional: string;
  songFileMidi: string;
  replaceSongFileOptional: string;
  replaceSongFileNotice: string;
  saveChangesBtn: string;
  savingBtn: string;
  uploadingBtn: string;
  rankedTag: string;
  backingTag: string;
  loadingScores: string;
  noScoresYet: string;
  playerHeader: string;
  dateHeader: string;
  scoreHeader: string;
  rankHeader: string;
  songHeader: string;
  myAccount: string;
  tellUsAboutYourself: string;
  noBioYet: string;
  totalPlaytime: string;
  totalNotesHit: string;
  rankedPerformances: string;
  globalRank: string;
  totalScore: string;
  signOut: string;
  loadingProfile: string;
  profileNotFound: string;
  instrumentPiano: string;
  instrumentDrum: string;
  deleteSongConfirm: string;
  provideTitleArtistMidi: string;
  provideTitleArtist: string;
  signInToUpload: string;
  signInToLike: string;
  signInToDelete: string;
  searchByNickname: string;
  searchingText: string;
  myFriendsTab: string;
  allCommunityTab: string;
  topPerformersSubtitle: string;
  addFriendBtn: string;
  removeFriendBtn: string;
  requestSentBtn: string;
  acceptRequestBtn: string;
  noPlayersFound: string;
  noFriendsYet: string;
  detailedAnalysisTitle: string;
  metaStatsTitle: string;
}

export const translations: Record<AppLanguage, TranslationDictionary> = {
  en: {
    settingsTitle: "Settings",
    closeSettings: "Close settings",
    languageSectionTitle: "Language",
    appLanguageLabel: "App Language",
    gameplayStyleSection: "Gameplay Style",
    pianoStyleTitle: "Piano",
    pianoStyleDesc: "Optimized for MIDI keyboard and visual learning.",
    computerStyleTitle: "Computer Keyboard",
    computerStyleDesc: "Optimized for playing with your computer keyboard.",
    drumNonMidiTitle: "Keyboard/Touchscreen",
    drumNonMidiDesc: "Play drums using your computer keyboard or by clicking/touching the drum kit.",
    drumMidiTitle: "Drum MIDI",
    drumMidiDesc: "Play drums using a connected MIDI drum kit or controller.",

    deviceUiSection: "Device & UI",
    uiZoomLabel: "UI Zoom",
    autoZoomLabel: "Auto (Fill Screen)",
    autoZoomDesc: "Automatically scales UI to fit your screen resolution perfectly.",
    screenPresetsLabel: "Screen Presets",

    pianoDisplaySection: "Piano Display",
    visibleKeysLabel: "Visible Keys",
    startNoteLabel: "Start Note (e.g., C3)",
    endNoteLabel: "End Note (e.g., C5)",
    customKeyRangeTitle: "Custom Key Range",

    controlsSection: "Controls",
    qwertyLayoutLabel: "QWERTY Keyboard Layout",
    qwertyLayoutRoblox: "Layout 1 (Roblox): Shift = black keys, ↑/↓ = ±1 semitones",
    qwertyLayoutStandard: "Layout 2 (Standard): ↑/↓ = ±1 octave",

    midiSection: "MIDI",
    midiStatusLabel: "Status",
    inputDeviceLabel: "Input Device",
    outputDeviceLabel: "Output Device",
    noMidiDevices: "No MIDI devices detected. Try clicking 'Rescan Devices' or reconnecting your device.",
    rescanDevices: "Rescan Devices",
    connectMidi: "Connect MIDI",
    disconnectMidi: "Disconnect",

    acousticSection: "Acoustic Piano Input (Direct Audio-to-MIDI)",
    enableMicInput: "Enable Microphone Input",
    micInputDevice: "Input Device",
    detectionSensitivity: "Detection Sensitivity",
    adjustDbThresholds: "Adjust dB thresholds per range (Lower = More Sensitive)",
    micBetaNoticeTitle: "Beta Feature Notice",
    micBetaNoticeDesc: "Real-time acoustic pitch detection via microphone is currently in Beta. Accuracy depends on your microphone hardware, ambient noise, and room acoustics. For optimal accuracy, place the microphone close to the piano or use a direct MIDI cable connection.",

    visualsSection: "Visuals & Gameplay",
    gameViewLabel: "Game View",
    noteLabelsLabel: "Note Labels",
    fingeringSettingsTitle: "Fingering Settings",
    handSizeLabel: "Hand size",
    showHand3DLabel: "Show 3D hands during playback",
    showHand3DDesc: "The 3D hands appear on the lower piano keys and match the left and right note colors. 1 thumb · 2 index · 3 middle · 4 ring · 5 little finger.",
    showMajorNotesOnly: "Tidy Overlong Notes (Clean Note Lengths)",
    showMajorNotesOnlyDesc: "Visual only: tidies up overly long notes so they don't overlap or extend past subsequent notes (in Sheet Music, note lengths follow the beat distance between notes without ties). Piano audio keeps its original duration.",
    showPianoTilesBg: "Show Piano Tiles Background",
    pianoTilesOpacity: "Piano Tiles Opacity",
    showPerfectText: "Show PERFECT Rating Text",
    showPianoKeyboardNonFalling: "Show Piano Keyboard (Outside Falling Notes)",
    showPianoKeyboardNonFallingDesc: "Shows the interactive piano keyboard on Sheet Music & Sheet Music Roll. In Falling Notes mode, the keyboard is always visible. (Default: Off)",
    showDrumPads: "Show Drum Pads (Outside Drum Typer)",
    showDrumPadsDesc: "Shows interactive drum pads on the bottom of the screen in drum modes other than Drum Typer (Drum Mania, Sheet Music) for touch/mobile play. (Default: Off)",
    showDynamics: "Show Dynamics & Velocity",
    showDynamicsDesc: "Show musical dynamic markings (p, mf, f, etc.) on Sheet Music and note velocity outline colors. (Default: Off)",
    inGameResolution: "In-Game View Resolution",
    appearingKeysOpacity: "Appearing Keys Opacity",
    appearingKeysOpacityDesc: "Controls the base visibility of keys/pads in Qwerty Typer & Drum Typer. 0% hides keys entirely until notes approach.",
    showQwertyShortcuts: "Show QWERTY Shortcuts on Keys",

    audioSection: "Audio",
    pianoVolume: "Piano Volume",
    pianoVolumeMidiActiveDesc: "Piano volume defaulted to 10% because MIDI/Mic is active. You can still adjust it manually.",
    metronomeVolume: "Metronome Volume",
    backingTrackVolume: "Backing Track Volume",
    latencyOffsetTitle: "MIDI & Audio Latency Offset",
    latencyOffsetDesc: "Compensate for MIDI input delay and audio timing differences between devices",
    midiHitTimingOffset: "MIDI Hit Timing Offset (Hitbox Shift)",
    calibrateBtn: "Calibrate",
    quickStep: "Quick:",
    midiHitTimingDesc: "Adjust keyboard or MIDI input timing relative to the notes. Use negative (-) if hits are late, positive (+) if early.",
    mp3AudioOffset: "MP3 Audio Offset (Backing Track Sync)",
    mp3AudioOffsetDesc: "Align MP3 or YouTube playback with the falling notes on screen.",
    metronomeOffset: "Metronome Offset",
    metronomeOffsetDesc: "Adjust the metronome if its clicks sound earlier or later than the visual hitline.",
    antiDoubleTrigger: "Anti Double Trigger (Anti-Stutter)",
    antiDoubleTriggerDesc: "Prevents a single hit from triggering multiple inputs due to vibration or stutter. Range: 5ms - 200ms.",
    minimumInterval: "Minimum Interval",

    drumMidiMappingTitle: "Drum MIDI Mapping",
    drumMidiMappingDesc: "Select a drum kit component and hit your MIDI drum to assign it. You can map multiple MIDI notes to one component.",
    resetBtn: "Reset",
    autoSavedBadge: "Auto-Saved",
    hitDrumBtn: "HIT DRUM!",
    mapBtn: "MAP",
    noNotesMapped: "No notes mapped",

    appearanceSection: "Appearance",
    rightHandColor: "Right Hand Color",
    leftHandColor: "Left Hand Color",
    fallingNotesBgColor: "Falling Notes Background",
    hitNoteColor: "Hit Note Color",
    bgMediaTitle: "Background Image / Video",
    uploadBtn: "Upload",
    clearBtn: "Clear",
    bgOpacity: "Background Opacity",
    restartPreviewBtn: "Restart preview",
    backBtn: "Back",
    resetSettingsBtn: "Reset Settings",
    resetConfirm: "Reset all settings to default?",

    playNow: "PLAY NOW",
    learnMode: "LEARN MODE",
    comingSoon: "Coming Soon",
    social: "SOCIAL",
    settings: "SETTINGS",
    profile: "PROFILE",
    login: "LOGIN",
    howToConnect: "How to Connect",
    about: "About",
    contact: "Contact",
    privacy: "Privacy",
    disclaimer: "Disclaimer",
    pianoRhythmGame: "Piano Rhythm Game",
    drumRhythmGame: "Drum Rhythm Game",

    communityLibrary: "Community Library",
    localImport: "Local Import",
    selectTrack: "Select a Track",
    uploadYourFile: "Upload Your File",
    fetchingTrackData: "Fetching Track Data...",
    preparingAudioEngine: "Preparing Audio Engine...",
    readyStatus: "Ready",
    startGame: "START GAME",
    editMidi: "EDIT MIDI",
    chooseOnlinePrompt: "Choose a track from the global database below.",
    chooseLocalPrompt: "Drag & drop a MIDI file or browse your device.",
    selectLocalFile: "Select Local File",
    fileNotSupported: "File not supported. Please upload a MIDI file (.mid, .midi).",
    cancel: "Cancel",
    apply: "Apply",
    title: "Title",
    artist: "Artist",
    arranger: "Arranger",
    description: "Description",
    audioOffsetMs: "Audio Offset (ms)",
    backgroundUrl: "Background URL",
    accuracyLevel: "Accuracy Level",
    accuracyLevelDesc: "3 = Very Lenient, 5 = Normal, 7 = Very Strict",

    gameMode: "Game Mode",
    lenientPracticeTitle: "Lenient Practice",
    lenientPracticeDesc: "The song plays continuously, but will pause if you don't play a key.",
    strictPracticeTitle: "Strict Practice",
    strictPracticeDesc: "The song pauses and waits for you to play the correct notes.",
    autoplayTitle: "Autoplay",
    autoplayDesc: "Sit back and listen. The song will play itself automatically.",
    reticalModeTitle: "Retical Mode",
    reticalModeDesc: "Scores are recorded on the leaderboard only when the MIDI is in Ranked status.",
    reticalDisabledMic: "Disabled when Microphone Input is active.",
    backingTrackHeader: "Backing Track (Audio)",
    backingNone: "None",
    backingMp3: "Upload MP3",
    backingOnline: "Online Link (Auto)",
    backingUrl: "Backing Track URL",
    streamingReady: "Streaming Ready! Track will play directly via the integrated YouTube Player.",
    directAudioReady: "Direct Audio Ready! Track will stream directly.",
    tempo: "Tempo",
    rankedTempoNotice: "Ranked mode only allows 4 tempo presets: 0.75x, 1x, 1.25x, and 1.5x.",
    handSelection: "Hand Selection",
    leftHand: "Left Hand",
    rightHand: "Right Hand",
    bothHands: "Both Hands",
    nonStopMode: "Non-Stop Mode",
    nonStopDesc: "Music continues playing even if you miss notes, like Autoplay.",
    enableHp: "Enable Health Bar (HP)",
    enableHpDesc: "When disabled (No-Fail), your HP stays full and the song continues even if you miss notes.",

    exit: "Exit",
    play: "Play",
    pause: "Pause",
    stop: "Stop",
    zoom: "ZOOM",
    accuracy: "Accuracy",
    combo: "Combo",
    waitTime: "Wait Time",
    fixSync: "Fix Sync",
    globalMsOffset: "GLOBAL MS OFFSET",
    tapTimingAvg: "Your Tap Timing (Avg)",
    record: "Record",
    saveMidi: "Save MIDI",

    gameOver: "Game Over",
    gameOverHpDesc: "Your health has reached zero (0 HP). Retry the song to continue practicing.",
    loopActive: "Loop Mode Active",
    loopActiveDesc: "Playback will automatically return to Point A with full health (HP).",
    retry: "Retry from Point A",
    tryAgain: "Try Again",
    close: "Close",
    performanceSummary: "Performance Summary",
    rank: "Rank",
    gameplayStyle: "Gameplay Style",
    perfect: "Perfect",
    great: "Great",
    good: "Good",
    miss: "Miss",
    maxCombo: "Max Combo",
    performanceScore: "Performance Score",
    speedEfficiency: "Speed Efficiency",
    hits: "Hits",
    error: "Error",
    continueBtn: "Continue",
      heroBadge: "Pick a mode & start playing effortlessly",
    heroTitle: "Piano & Drum Rhythm Game",
    heroDescPiano: "Play songs using MIDI keyboard or computer keyboard with interactive guides.",
    heroDescDrum: "Practice drum rhythms with electronic drum MIDI or computer keyboard.",
    playCardDesc: "Explore the online song library, import your local MIDI files, and jump into action.",
    learnCardDesc: "Master music theory, sheet music sight-reading, chords, and 3D hand fingering.",
    learnCardDrumDesc: "Drum learning syllabus is currently in development.",
    socialCardDesc: "Compete for the highest scores and see top global players across all songs.",
    howToConnectDesc: "Step-by-step guide to connect USB MIDI pianos, Bluetooth, or play with QWERTY.",
    featuredBadge: "Featured",
    lessonBadge: "Interactive Lesson",
    rankedBadge: "Ranked",
    setupBadge: "Setup Help",
    browseSongsBtn: "Browse Songs",
    startLearningBtn: "Start Lessons",
    viewLeaderboardBtn: "View Leaderboard",
    openGuideBtn: "Open Guide",
    systemLoading: "Initializing Octavia Engine...",

    songLibraryTitle: "Song Library",
    freePlayTab: "Free Play",
    freePlayTitle: "Free Play Piano Mode",
    freePlayDesc: "Jam freely on the piano keyboard with no notes to follow. Features real-time visualizer, adjustable metronome BPM, time signatures, and live MIDI recording.",
    launchFreePlay: "Start Free Play",
    importLocalTitle: "Import Local MIDI File",
    importLocalDesc: "Drag & drop your .mid or .midi file here, or click the button below to browse from your device.",
    newMidiEditor: "Create New in Editor",
    parsingMidiSub: "Parsing MIDI notes, finger numbers, and synthesizing soundfonts...",
    readyToPlay: "Ready to Play",
    selectAndPlay: "Select & Continue",
    localImportModalTitle: "Local MIDI Import Settings",
    optionalLabel: "Optional",
    youtubeBackingLabel: "YouTube Backing Video Link",
    audioOffsetLabel: "Audio Offset (ms)",
    backgroundUrlLabel: "Wallpaper Image URL",
    accuracyToleranceLabel: "Accuracy Tolerance Level (3-7)",
    loadThisMidi: "Load MIDI",

    step1Title: "Select Game Mode",
    step2Title: "Customize Session",
    displayAndLabelsHeader: "Display & Game View",
    visualSettingsHeader: "Visual & Display Settings",
    displayPanelDesc: "Configure game view mode (Falling Notes, Sheet Music, Qwerty Typer), note labels, 3D hand models, and visual options in Settings.",
    displayPanelDescDrum: "Configure drum game view (Drum Typer, Drum Mania, Sheet Music), pad opacity, and visual display in Settings.",
    viewModeDrumTyper: "Drum Typer",
    viewModeDrumMania: "Drum Mania",
    viewModeFallingNotes: "Falling Notes",
    viewModeSheetMusic: "Sheet Music",
    viewModeRollSheet: "Sheet Music Roll",
    viewModeSheetQwerty: "Sheet Music QWERTY",
    viewModeQwertyTyper: "Qwerty Typer",
    openDisplaySettingsBtn: "Configure Display & Labels",
    noteLabelNameDisplay: "Note Name (C, D...)",
    noteLabelFingeringDisplay: "Fingering (1-5) (BETA)",
    noteLabelNoneDisplay: "None",
    noteLabelQwertyDisplay: "QWERTY Keys",
    autoSetupTitle: "Auto Setup",
    autoSetupDesc: "Apply recommended view & note labels for this mode",
    openFullSettingsBtn: "Full Settings",
    quickPresets: "Quick Presets",
    presetStandard: "Standard",
    presetFingering: "Fingering (BETA)",
    presetSheet: "Sheet",
    presetQwerty: "QWERTY",
    changeSongBtn: "Change Song",
    activeBadge: "Active",
    lenientBadgeDesc: "Flexible Rhythm • Ideal for Learning",
    strictBadgeDesc: "Beat Precision • Train Muscle Memory",
    rankedBadgeDesc: "Non-Stop • Official Leaderboard",
    autoplayBadgeDesc: "Automatic Play • Watch & Listen",
    audioSyncTitle: "Audio Sync (Offset)",
    applyAverageOffset: "Apply Input Average",
    modeReadyLabel: "Mode Ready:",
    startGameAction: "START GAME",

    searchPlaceholder: "Search MIDI title, artist, or ID...",
    uploadMidiBtn: "Upload MIDI",
    sortByLabel: "Sort By:",
    sortNewest: "Newest",
    sortOldest: "Oldest",
    sortEasiest: "Easiest",
    sortHardest: "Hardest",
    sortAZ: "A → Z",
    sortZA: "Z → A",
    sortMostLiked: "Most Liked",
    sortLeastLiked: "Least Liked",
    filterLabel: "Filter:",
    filterAll: "All",
    filterRanked: "Ranked",
    filterNonRanked: "Casual",
    filterLiked: "Liked",
    filterDifficultyLabel: "Difficulty:",
    difficultyAll: "All Difficulties",
    difficultyNovice: "Novice (Lv. 1-2)",
    difficultyBeginner: "Beginner (Lv. 3)",
    difficultyIntermediate: "Intermediate (Lv. 4-5)",
    difficultyAdvanced: "Advanced (Lv. 6-7)",
    difficultyVirtuoso: "Virtuoso (Lv. 8-9)",
    difficultyLegendary: "Legendary (Lv. 10+)",
    noSongsFoundTitle: "No songs found",
    noSongsFoundDesc: "Try different keywords or clear the filter above.",
    loadMoreSongs: "Load More Songs",
    loadingMore: "Loading More...",
    copiedBadge: "Copied!",
    copyIdTooltip: "Copy Song ID",
    personalBestLabel: "Personal Best:",
    uploadedBy: "Uploaded by",
    selectSongBtn: "Select",

    settingsSubtitle: "Configure devices, audio, visuals, and latency calibration",
    settingsSearchPlaceholder: "Search settings (e.g. offset, volume, theme, fingering)...",
    tabGameplay: "Gameplay & Visuals",
    tabMidi: "MIDI & Inputs",
    tabAudio: "Audio & Sync",
    tabVisuals: "Theme & Colors",
    tabAll: "All",
    amtEngineDesc: "Supports high-accuracy AI neural transcription via online_amt (https://github.com/jdasam/online_amt) running locally at http://127.0.0.1:5000 or via virtual MIDI.",
    downloadAmtBtn: "Download Engine Package (online_amt.zip)",
    checkAmtBtn: "Check Connection",
    amtGuideStep1: "Click 'Download Engine Package' and extract the zip file.",
    amtGuideStep2: "Run run_amt.bat (Windows) or run_amt.sh (Mac/Linux).",
    amtGuideStep3: "Octavia will automatically sync with the AI transcription engine!",
    fingering3DTitle: "3D Hand Fingering",
    fingering3DDesc: "Show finger numbers & 3D hand avatars",
    streamingLink: "Streaming Link:",
    importantNotice: "IMPORTANT:",
    midiControllerDelayNotice: "If your MIDI controller feels delayed, consider adjusting the note offset in settings. Click the icon to go directly to the note offset settings, where you can calibrate it automatically by playing the calibration song.",
    backingSyncNotice: "If the MP3 is still out of sync, try adjusting the USER MS (Audio Sync) by ±10 ms from the original offset; the goal is to match the backing track with the metronome.",
    defaultSource: "Default Source:",
    defaultOffset: "Default Offset:",
    audioToMidiDirectTitle: "Direct Acoustic Piano (Microphone Pitch Detection)",
    activeInBrowser: "Active (Pitch Tuner)",
    disabledStatus: "Disabled",
    audioToMidiDesc: "Real-time acoustic piano note detection powered by high-precision Autocorrelation / YIN Pitch Detection. Zero latency, instant response directly in your browser without external models.",
    micListeningActive: "Microphone actively listening",
    allowMicrophoneBtn: "Allow Microphone",
    noMicrophonesFound: "No microphones found",
    micPermissionDeniedAlert: "Microphone permission denied. Please allow microphone access in your browser settings.",
    zoomDirectionLabel: "Zoom Direction (AR)",
    zoomDirectionNormal: "Normal (Outside to Inside)",
    zoomDirectionReverse: "Reverse (Inside to Outside)",
    customRangeOption: "Custom Range",
    full88Keys: "Full (88 keys)",
    compact61Keys: "Compact (61 keys)",
    runLatencyCalibrationTitle: "Run automatic latency calibration with test beats",
    removeMapping: "Remove mapping",
    bgMediaPlaceholder: "URL (Image or MP4)",
    exitCalibration: "Exit Calibration",
    timeSignatureLabel: "Time Sig",
    stopRecording: "Stop Recording",
    startRecording: "Start MIDI Recording",
    downloadRecordingAsMidi: "Download Recording as MIDI",
    barLabel: "Bar",
    setLoopStartTooltip: "Set Loop Start to Current Bar",
    setLoopEndTooltip: "Set Loop End to Current Bar",
    clearLoopTooltip: "Clear Loop",
    showFullMenu: "Show Full Menu",
    hideFullMenu: "Hide Full Menu",
    exitToSongSelection: "Exit to song selection",
    stopPlaybackAndReset: "Stop playback and reset",
    editBtn: "Edit",
    downloadBtn: "Download",
    deleteBtn: "Delete",
    leaderboardTitle: "Leaderboard",
    uploadMidiModalTitle: "Upload MIDI",
    editMidiModalTitle: "Edit MIDI",
    midiTitleLabel: "MIDI Title",
    artistLabel: "Artist",
    arrangerOptional: "Arrangement by (Optional)",
    arrangerPlaceholder: "Your name or alias",
    descOptional: "Description (Optional)",
    descPlaceholder: "A short description of the MIDI or arrangement.",
    mp3LinkOptional: "MP3 Link (Optional)",
    mp3OffsetOptional: "MP3 Offset (Optional)",
    bgUrlOptional: "Background URL (Optional)",
    songFileMidi: "Song File (MIDI)",
    replaceSongFileOptional: "Replace Song File (Optional, MIDI only)",
    replaceSongFileNotice: "Selecting a file will replace the current MIDI file on the server.",
    saveChangesBtn: "Save Changes",
    savingBtn: "Saving...",
    uploadingBtn: "Uploading...",
    rankedTag: "RANKED",
    backingTag: "BACKING",
    loadingScores: "Loading Scores...",
    noScoresYet: "No scores have been submitted for this MIDI yet.",
    playerHeader: "Player",
    dateHeader: "Date",
    scoreHeader: "Score",
    rankHeader: "Rank",
    songHeader: "Song",
    myAccount: "My Account",
    tellUsAboutYourself: "Tell us about yourself...",
    noBioYet: "No bio yet.",
    totalPlaytime: "Total Playtime",
    totalNotesHit: "Total Notes Hit",
    rankedPerformances: "Ranked Performances",
    globalRank: "Global Rank",
    totalScore: "Total Score",
    signOut: "Sign Out",
    loadingProfile: "Loading profile...",
    profileNotFound: "Profile not found.",
    instrumentPiano: "Piano",
    instrumentDrum: "Drum",
    deleteSongConfirm: "Are you sure you want to delete this song? This action cannot be undone.",
    provideTitleArtistMidi: "Please provide title, artist, and a MIDI file.",
    provideTitleArtist: "Please provide title and artist.",
    signInToUpload: "Please sign in to upload.",
    signInToLike: "Please sign in to like songs.",
    signInToDelete: "Please sign in to delete songs.",
    searchByNickname: "Search by nickname...",
    searchingText: "Searching...",
    myFriendsTab: "My Friends",
    allCommunityTab: "Community",
    topPerformersSubtitle: "Top performers across the globe",
    addFriendBtn: "Add Friend",
    removeFriendBtn: "Remove Friend",
    requestSentBtn: "Request Sent",
    acceptRequestBtn: "Accept Request",
    noPlayersFound: "No players found",
    noFriendsYet: "No friends added yet",
    detailedAnalysisTitle: "Detailed Performance Analysis",
    metaStatsTitle: "Meta Statistics",
  },

  id: {
    settingsTitle: "Pengaturan",
    closeSettings: "Tutup pengaturan",
    languageSectionTitle: "Bahasa",
    appLanguageLabel: "Bahasa Aplikasi",
    gameplayStyleSection: "Gaya Bermain",
    pianoStyleTitle: "Piano",
    pianoStyleDesc: "Dioptimalkan untuk keyboard MIDI dan pembelajaran visual.",
    computerStyleTitle: "Keyboard Komputer",
    computerStyleDesc: "Dioptimalkan untuk bermain dengan keyboard komputer Anda.",
    drumNonMidiTitle: "Keyboard/Layar Sentuh",
    drumNonMidiDesc: "Main drum dengan keyboard komputer atau klik/sentuh drum kit.",
    drumMidiTitle: "Drum MIDI",
    drumMidiDesc: "Main drum menggunakan drum elektrik / controller MIDI yang terhubung.",

    deviceUiSection: "Perangkat & Tampilan UI",
    uiZoomLabel: "Zoom UI",
    autoZoomLabel: "Otomatis (Penuhi Layar)",
    autoZoomDesc: "Menyesuaikan ukuran antarmuka secara presisi dengan resolusi layar Anda.",
    screenPresetsLabel: "Preset Ukuran Layar",

    pianoDisplaySection: "Tampilan Piano",
    visibleKeysLabel: "Jumlah Tuts Terlihat",
    startNoteLabel: "Nada Awal (cth. C3)",
    endNoteLabel: "Nada Akhir (cth. C5)",
    customKeyRangeTitle: "Rentang Nada Kustom",

    controlsSection: "Kontrol",
    qwertyLayoutLabel: "Tata Letak Keyboard QWERTY",
    qwertyLayoutRoblox: "Tata Letak 1 (Roblox): Shift = tuts hitam, ↑/↓ = ±1 semitone",
    qwertyLayoutStandard: "Tata Letak 2 (Standar): ↑/↓ = ±1 oktaf",

    midiSection: "MIDI",
    midiStatusLabel: "Status",
    inputDeviceLabel: "Perangkat Masukan",
    outputDeviceLabel: "Perangkat Keluaran",
    noMidiDevices: "Tidak ada perangkat MIDI terdeteksi. Coba klik 'Pindai Ulang' atau sambungkan kembali kabel perangkat Anda.",
    rescanDevices: "Pindai Ulang Perangkat",
    connectMidi: "Hubungkan MIDI",
    disconnectMidi: "Putuskan Hubungan",

    acousticSection: "Input Piano Akustik (Direct Audio-to-MIDI)",
    enableMicInput: "Aktifkan Input Mikrofon",
    micInputDevice: "Perangkat Mikrofon",
    detectionSensitivity: "Sensitivitas Deteksi",
    adjustDbThresholds: "Atur ambang batas dB per rentang nada (Makin Rendah = Makin Sensitif)",
    micBetaNoticeTitle: "Keterangan Fitur Beta",
    micBetaNoticeDesc: "Deteksi nada piano akustik via mikrofon saat ini masih dalam tahap Beta (eksperimental). Akurasi deteksi dipengaruhi oleh kualitas mikrofon, kebisingan sekitar (noise), dan akustik ruangan. Untuk pengalaman terbaik, letakkan mikrofon sedekat mungkin ke piano atau gunakan koneksi kabel MIDI langsung.",

    visualsSection: "Visual & Gameplay",
    gameViewLabel: "Mode Tampilan Game",
    noteLabelsLabel: "Label Nada",
    fingeringSettingsTitle: "Pengaturan Fingering (Penomoran Jari)",
    handSizeLabel: "Ukuran Tangan",
    showHand3DLabel: "Tampilkan Animasi Tangan 3D",
    showHand3DDesc: "Animasi tangan 3D muncul di tuts piano bawah sesuai warna tangan kiri & kanan. 1 jempol · 2 telunjuk · 3 tengah · 4 manis · 5 kelingking.",
    showMajorNotesOnly: "Rapikan Not Kepanjangan (Durasi Not Rapi)",
    showMajorNotesOnlyDesc: "Hanya visual: merapikan not yang terlalu panjang agar tidak bertumpuk atau melebihi not berikutnya (di Sheet Music, panjang not mengikuti jarak ketukan antar not tanpa garis tie). Durasi suara piano tetap asli.",
    showPianoTilesBg: "Tampilkan Latar Belakang Piano Tiles",
    pianoTilesOpacity: "Opasitas Piano Tiles",
    showPerfectText: "Tampilkan Teks Penilaian PERFECT",
    showPianoKeyboardNonFalling: "Tampilkan Tuts Piano (Di Luar Falling Notes)",
    showPianoKeyboardNonFallingDesc: "Menampilkan tuts piano interaktif pada mode Partitur & Roll. Pada Falling Notes tuts selalu muncul. (Default: Tidak Aktif)",
    showDrumPads: "Tampilkan Pad Drum (Di Luar Drum Typer)",
    showDrumPadsDesc: "Menampilkan pad drum interaktif di bagian bawah layar pada mode selain Drum Typer (Drum Mania, Partitur) untuk permainan sentuh/HP. (Default: Tidak Aktif)",
    showDynamics: "Tampilkan Dinamika & Velocity",
    showDynamicsDesc: "Menampilkan tanda dinamika musik (p, mf, f, dll.) di partitur dan outline warna velocity not. (Default: Mati)",
    inGameResolution: "Resolusi Tampilan Dalam Game",
    appearingKeysOpacity: "Opasitas Tuts/Pad Qwerty Typer",
    appearingKeysOpacityDesc: "Mengatur transparansi dasar tuts/pad pada Qwerty Typer & Drum Typer. 0% menyembunyikan tuts hingga nada mendekat.",
    showQwertyShortcuts: "Tampilkan Pintasan Tombol QWERTY pada Tuts",

    audioSection: "Audio & Suara",
    pianoVolume: "Volume Suara Piano",
    pianoVolumeMidiActiveDesc: "Volume piano diatur ke 10% karena input MIDI/Mic aktif agar tidak bentrok dengan suara piano fisik Anda.",
    metronomeVolume: "Volume Metronom",
    backingTrackVolume: "Volume Musik Pengiring (Backing Track)",
    latencyOffsetTitle: "Kompensasi Latensi MIDI & Audio",
    latencyOffsetDesc: "Kompensasi jeda input MIDI dan perbedaan timing audio antar perangkat Anda.",
    midiHitTimingOffset: "Offset Timing Ketukan MIDI (Pergeseran Hitbox)",
    calibrateBtn: "Kalibrasi",
    quickStep: "Cepat:",
    midiHitTimingDesc: "Atur timing input keyboard/MIDI terhadap nada. Gunakan negatif (-) jika ketukan terlambat, positif (+) jika terlalu cepat.",
    mp3AudioOffset: "Offset Audio MP3 (Sinkronisasi Backing Track)",
    mp3AudioOffsetDesc: "Luruskan timing audio MP3 atau YouTube dengan nada yang jatuh di layar.",
    metronomeOffset: "Offset Metronom",
    metronomeOffsetDesc: "Atur jika suara detak metronom terdengar lebih cepat atau lebih lambat dari garis ketukan visual.",
    antiDoubleTrigger: "Pencegah Pemicu Ganda / Anti-Stutter (Anti Double Trigger)",
    antiDoubleTriggerDesc: "Mencegah satu pukulan memicu input dobel/stutter karena getaran fisik drum. Rentang: 5ms - 200ms.",
    minimumInterval: "Interval Minimum",

    drumMidiMappingTitle: "Pemetaan MIDI Drum",
    drumMidiMappingDesc: "Pilih komponen drum kit lalu pukul drum MIDI Anda untuk memasangkannya. Anda bisa memasangkan beberapa not MIDI ke satu komponen.",
    resetBtn: "Atur Ulang",
    autoSavedBadge: "Tersimpan Otomatis",
    hitDrumBtn: "PUKUL DRUM!",
    mapBtn: "PETAKAN",
    noNotesMapped: "Belum ada nada dipetakan",

    appearanceSection: "Tampilan & Tema",
    rightHandColor: "Warna Tangan Kanan",
    leftHandColor: "Warna Tangan Kiri",
    fallingNotesBgColor: "Latar Belakang Falling Notes",
    hitNoteColor: "Warna Efek Ketukan Nada",
    bgMediaTitle: "Gambar / Video Latar Belakang",
    uploadBtn: "Unggah",
    clearBtn: "Hapus",
    bgOpacity: "Opasitas Latar Belakang",
    restartPreviewBtn: "Ulangi pratinjau",
    backBtn: "Kembali",
    resetSettingsBtn: "Reset Pengaturan",
    resetConfirm: "Kembalikan semua pengaturan ke setelan awal pabrik?",

    playNow: "MAIN SEKARANG",
    learnMode: "MODE BELAJAR",
    comingSoon: "Segera Hadir",
    social: "KOMUNITAS",
    settings: "PENGATURAN",
    profile: "PROFIL",
    login: "MASUK",
    howToConnect: "Cara Menghubungkan",
    about: "Tentang",
    contact: "Kontak",
    privacy: "Privasi",
    disclaimer: "Penyangkalan",
    pianoRhythmGame: "Game Ritme Piano",
    drumRhythmGame: "Game Ritme Drum",

    communityLibrary: "Pustaka Komunitas",
    localImport: "Impor Lokal",
    selectTrack: "Pilih Lagu",
    uploadYourFile: "Unggah File Anda",
    fetchingTrackData: "Mengambil Data Lagu...",
    preparingAudioEngine: "Menyiapkan Mesin Audio...",
    readyStatus: "Siap",
    startGame: "MULAI GAME",
    editMidi: "EDIT MIDI",
    chooseOnlinePrompt: "Pilih lagu dari basis data komunitas global di bawah ini.",
    chooseLocalPrompt: "Seret & lepas file MIDI atau telusuri dari perangkat Anda.",
    selectLocalFile: "Pilih File Lokal",
    fileNotSupported: "Format file tidak didukung. Harap unggah file MIDI (.mid, .midi).",
    cancel: "Batal",
    apply: "Terapkan",
    title: "Judul",
    artist: "Artis",
    arranger: "Pengaransemen",
    description: "Deskripsi",
    audioOffsetMs: "Offset Audio (ms)",
    backgroundUrl: "URL Latar Belakang",
    accuracyLevel: "Tingkat Akurasi",
    accuracyLevelDesc: "3 = Sangat Toleran, 5 = Standar Normal, 7 = Sangat Ketat",

    gameMode: "Mode Permainan",
    lenientPracticeTitle: "Latihan Bebas (Lenient)",
    lenientPracticeDesc: "Lagu terus berjalan, tetapi akan berhenti jika Anda tidak menekan tuts yang tepat.",
    strictPracticeTitle: "Latihan Ketat (Strict)",
    strictPracticeDesc: "Lagu berhenti dan sabar menunggu hingga Anda menekan nada yang benar.",
    autoplayTitle: "Putar Otomatis",
    autoplayDesc: "Duduk santai dan dengarkan. Lagu akan bermain otomatis dengan sendirinya.",
    reticalModeTitle: "Mode Retical (Ranked)",
    reticalModeDesc: "Skor akan tercatat di papan peringkat leaderboard dunia jika MIDI berstatus Ranked.",
    reticalDisabledMic: "Dinonaktifkan saat Input Mikrofon aktif.",
    backingTrackHeader: "Musik Pengiring (Audio Backing Track)",
    backingNone: "Tanpa Audio",
    backingMp3: "Unggah MP3",
    backingOnline: "Tautan Online (Otomatis)",
    backingUrl: "URL Musik Pengiring",
    streamingReady: "Streaming Siap! Trek audio akan diputar langsung via pemutar terintegrasi YouTube.",
    directAudioReady: "Audio Langsung Siap! Trek akan dialirkan langsung.",
    tempo: "Tempo",
    rankedTempoNotice: "Mode Ranked hanya mengizinkan 4 pilihan tempo: 0.75x, 1x, 1.25x, dan 1.5x.",
    handSelection: "Pilihan Tangan",
    leftHand: "Tangan Kiri",
    rightHand: "Tangan Kanan",
    bothHands: "Kedua Tangan",
    nonStopMode: "Mode Non-Stop",
    nonStopDesc: "Musik terus mengalun meski Anda salah memukul nada, seperti Autoplay.",
    enableHp: "Aktifkan Bar Nyawa (HP)",
    enableHpDesc: "Bila dinonaktifkan (No-Fail), HP selalu penuh dan lagu takkan game over walau Anda meleset.",

    exit: "Keluar",
    play: "Main",
    pause: "Jeda",
    stop: "Berhenti",
    zoom: "ZOOM",
    accuracy: "Akurasi",
    combo: "Kombo",
    waitTime: "Waktu Tunggu",
    fixSync: "Perbaiki Sinkron",
    globalMsOffset: "OFFSET GLOBAL MS",
    tapTimingAvg: "Rata-rata Ketukan Anda",
    record: "Rekam",
    saveMidi: "Simpan MIDI",

    gameOver: "Game Over",
    gameOverHpDesc: "Darah Anda telah habis (0 HP). Ulangi lagu untuk terus berlatih.",
    loopActive: "Mode Loop Aktif",
    loopActiveDesc: "Permainan akan otomatis kembali ke Titik A dengan HP penuh.",
    retry: "Ulangi dari Titik A",
    tryAgain: "Coba Lagi",
    close: "Tutup",
    performanceSummary: "Ringkasan Performa",
    rank: "Peringkat",
    gameplayStyle: "Gaya Permainan",
    perfect: "Sempurna (Perfect)",
    great: "Bagus Sekali (Great)",
    good: "Bagus (Good)",
    miss: "Meleset (Miss)",
    maxCombo: "Kombo Maksimal",
    performanceScore: "Skor Performa",
    speedEfficiency: "Efisiensi Kecepatan",
    hits: "Ketukan",
    error: "Kesalahan",
    continueBtn: "Lanjutkan",
      heroBadge: "Pilih mode & mulai bermain dengan mudah",
    heroTitle: "Game Ritme Piano & Drum",
    heroDescPiano: "Mainkan lagu favorit dengan keyboard MIDI atau keyboard komputer secara interaktif.",
    heroDescDrum: "Latih ketukan ritme dengan drum elektrik MIDI atau keyboard komputer.",
    playCardDesc: "Jelajahi pustaka lagu online, impor file MIDI lokal, dan mainkan mode tantangan.",
    learnCardDesc: "Pelajari teori musik, membaca not balok, tangga nada, dan fingering 3D.",
    learnCardDrumDesc: "Modul belajar drum sedang dalam tahap pengembangan.",
    socialCardDesc: "Bandingkan skor tertinggimu dengan musisi lain di papan peringkat global.",
    howToConnectDesc: "Panduan menghubungkan Piano via kabel USB MIDI, Bluetooth, atau main via keyboard QWERTY.",
    featuredBadge: "Paling Populer",
    lessonBadge: "Edukasi & Praktek",
    rankedBadge: "Kompetitif",
    setupBadge: "Tutorial & Alat",
    browseSongsBtn: "Pilih Lagu",
    startLearningBtn: "Mulai Belajar",
    viewLeaderboardBtn: "Lihat Peringkat",
    openGuideBtn: "Buka Panduan",
    systemLoading: "Memuat Octavia Engine...",

    songLibraryTitle: "Pustaka Lagu",
    freePlayTab: "Main Bebas",
    freePlayTitle: "Mode Main Bebas (Free Play)",
    freePlayDesc: "Mainkan tuts piano secara bebas tanpa partitur lagu. Dilengkapi visualizer tuts real-time, metronom dinamis, pengaturan birama/BPM, dan perekam MIDI.",
    launchFreePlay: "Mulai Main Bebas",
    importLocalTitle: "Unggah File MIDI Lokal",
    importLocalDesc: "Tarik dan letakkan file MIDI (.mid, .midi) langsung ke sini, atau klik tombol di bawah untuk memilih dari komputermu.",
    newMidiEditor: "Editor MIDI Baru",
    parsingMidiSub: "Menganalisis partitur nada, fingering, dan menyiapkan audio synthesizer...",
    readyToPlay: "Siap Dimainkan",
    selectAndPlay: "PILIH & LANJUT",
    localImportModalTitle: "Pengaturan Impor MIDI Lokal",
    optionalLabel: "Opsional",
    youtubeBackingLabel: "Link Video Backing YouTube",
    audioOffsetLabel: "Offset Audio (ms)",
    backgroundUrlLabel: "URL Gambar Wallpaper",
    accuracyToleranceLabel: "Tingkat Toleransi Akurasi (3-7)",
    loadThisMidi: "Muat Lagu Ini",

    step1Title: "Pilih Gaya Permainan",
    step2Title: "Kustomisasi Sesi",
    displayAndLabelsHeader: "Tampilan & Label Not",
    visualSettingsHeader: "Pengaturan Visual & Tampilan",
    displayPanelDesc: "Sesuaikan mode tampilan game (Falling Notes, Partitur, Qwerty Typer), label notasi nada, model tangan 3D, dan opsi visual di menu Pengaturan.",
    displayPanelDescDrum: "Sesuaikan mode tampilan drum (Drum Typer, Drum Mania, Partitur), transparansi pad, dan opsi visual di menu Pengaturan.",
    viewModeDrumTyper: "Drum Typer",
    viewModeDrumMania: "Drum Mania",
    viewModeFallingNotes: "Falling Notes",
    viewModeSheetMusic: "Partitur (Sheet Music)",
    viewModeRollSheet: "Sheet Music Roll",
    viewModeSheetQwerty: "Sheet Music QWERTY",
    viewModeQwertyTyper: "Qwerty Typer",
    openDisplaySettingsBtn: "Atur Tampilan & Label Not",
    noteLabelNameDisplay: "Nama Not (C, D...)",
    noteLabelFingeringDisplay: "Jari (1-5) (BETA)",
    noteLabelNoneDisplay: "Tanpa Label",
    noteLabelQwertyDisplay: "Tombol Keyboard",
    autoSetupTitle: "Atur Otomatis",
    autoSetupDesc: "Terapkan tampilan & label rekomendasi untuk mode ini",
    openFullSettingsBtn: "Pengaturan Lengkap",
    quickPresets: "Preset Cepat",
    presetStandard: "Standar",
    presetFingering: "Fingering (BETA)",
    presetSheet: "Partitur",
    presetQwerty: "QWERTY",
    changeSongBtn: "Ganti Lagu",
    activeBadge: "Aktif",
    lenientBadgeDesc: "Ritme Fleksibel • Cocok Belajar",
    strictBadgeDesc: "Presisi Ketukan • Latih Memori",
    rankedBadgeDesc: "Non-Stop • Leaderboard Resmi",
    autoplayBadgeDesc: "Main Otomatis • Tonton & Dengar",
    audioSyncTitle: "Sinkronisasi Audio (Offset)",
    applyAverageOffset: "Terapkan Rata-rata Input",
    modeReadyLabel: "Mode Siap:",
    startGameAction: "MULAI BERMAIN",

    searchPlaceholder: "Cari judul lagu, nama artis, atau ID...",
    uploadMidiBtn: "Unggah MIDI",
    sortByLabel: "Urutkan:",
    sortNewest: "Terbaru",
    sortOldest: "Terlama",
    sortEasiest: "Paling Mudah",
    sortHardest: "Paling Sulit",
    sortAZ: "A → Z",
    sortZA: "Z → A",
    sortMostLiked: "Terpopuler",
    sortLeastLiked: "Kurang Disukai",
    filterLabel: "Filter:",
    filterAll: "Semua",
    filterRanked: "Peringkat",
    filterNonRanked: "Biasa",
    filterLiked: "Disukai",
    filterDifficultyLabel: "Tingkat:",
    difficultyAll: "Semua Kesulitan",
    difficultyNovice: "Novice (Lv. 1-2)",
    difficultyBeginner: "Beginner (Lv. 3)",
    difficultyIntermediate: "Intermediate (Lv. 4-5)",
    difficultyAdvanced: "Advanced (Lv. 6-7)",
    difficultyVirtuoso: "Virtuoso (Lv. 8-9)",
    difficultyLegendary: "Legendary (Lv. 10+)",
    noSongsFoundTitle: "Tidak ada lagu yang ditemukan",
    noSongsFoundDesc: "Coba gunakan kata kunci pencarian yang berbeda atau reset filter di atas.",
    loadMoreSongs: "Muat Lebih Banyak Lagu",
    loadingMore: "Memuat Lebih Banyak...",
    copiedBadge: "Tersalin!",
    copyIdTooltip: "Salin ID",
    personalBestLabel: "Skor Terbaik:",
    uploadedBy: "Diupload oleh",
    selectSongBtn: "Pilih",

    settingsSubtitle: "Atur preferensi alat, audio, visual, dan kalibrasi",
    settingsSearchPlaceholder: "Cari opsi pengaturan (misal: offset, volume, tema, fingering)...",
    tabGameplay: "Gameplay & Visual",
    tabMidi: "MIDI & Input",
    tabAudio: "Audio & Latensi",
    tabVisuals: "Tema & Warna",
    tabAll: "Semua",
    amtEngineDesc: "Mendukung transkripsi AI neural presisi tinggi via online_amt (https://github.com/jdasam/online_amt) yang berjalan secara lokal di http://127.0.0.1:5000 atau via virtual MIDI.",
    downloadAmtBtn: "Unduh Paket Engine (online_amt.zip)",
    checkAmtBtn: "Cek Koneksi",
    amtGuideStep1: "Klik 'Unduh Paket Engine' di atas lalu ekstrak file zip-nya.",
    amtGuideStep2: "Jalankan run_amt.bat (Windows) atau run_amt.sh (Mac/Linux).",
    amtGuideStep3: "Octavia akan otomatis terhubung & menyinkronkan notasi piano akustik Anda!",
    fingering3DTitle: "Fingering & Tangan 3D",
    fingering3DDesc: "Tampilkan panduan jari & animasi avatar tangan 3D",
    streamingLink: "Tautan Streaming:",
    importantNotice: "PENTING:",
    midiControllerDelayNotice: "Jika controller MIDI Anda terasa terlambat, sesuaikan offset nada di pengaturan. Klik ikon untuk langsung menuju ke pengaturan offset, di mana Anda dapat mengkalibrasi secara otomatis dengan memainkan lagu kalibrasi.",
    backingSyncNotice: "Jika MP3 masih belum sinkron, coba sesuaikan USER MS (Audio Sync) sebesar ±10 ms dari offset aslinya; tujuannya agar musik pengiring selaras dengan ketukan metronom.",
    defaultSource: "Sumber Default:",
    defaultOffset: "Offset Default:",
    audioToMidiDirectTitle: "Direct Acoustic Piano (Microphone Pitch Detection)",
    activeInBrowser: "Aktif (Pitch Detector)",
    disabledStatus: "Nonaktif",
    audioToMidiDesc: "Deteksi nada piano akustik real-time berbasis Pitch Detection (Autocorrelation / YIN) berpresisi tinggi. Zero latency, instan langsung di peramban tanpa model eksternal yang membebani.",
    micListeningActive: "Mikrofon siap mendengar aktif",
    allowMicrophoneBtn: "Beri Izin Mikrofon",
    noMicrophonesFound: "Tidak ada mikrofon terdeteksi",
    micPermissionDeniedAlert: "Izin mikrofon ditolak. Silakan izinkan akses mikrofon di pengaturan browser Anda.",
    zoomDirectionLabel: "Arah Zoom (AR)",
    zoomDirectionNormal: "Normal (Luar ke Dalam)",
    zoomDirectionReverse: "Terbalik (Dalam ke Luar)",
    customRangeOption: "Rentang Kustom",
    full88Keys: "Penuh (88 tuts)",
    compact61Keys: "Kompak (61 tuts)",
    runLatencyCalibrationTitle: "Jalankan kalibrasi latensi otomatis dengan ketukan tes",
    removeMapping: "Hapus pemetaan",
    bgMediaPlaceholder: "URL (Gambar atau MP4)",
    exitCalibration: "Keluar Kalibrasi",
    timeSignatureLabel: "Birama",
    stopRecording: "Hentikan Rekaman",
    startRecording: "Mulai Rekam MIDI",
    downloadRecordingAsMidi: "Unduh Rekaman sebagai MIDI",
    barLabel: "Birama",
    setLoopStartTooltip: "Atur Awal Loop ke Bar Saat Ini",
    setLoopEndTooltip: "Atur Akhir Loop ke Bar Saat Ini",
    clearLoopTooltip: "Hapus Loop",
    showFullMenu: "Tampilkan Menu Lengkap",
    hideFullMenu: "Sembunyikan Menu",
    exitToSongSelection: "Kembali ke pemilihan lagu",
    stopPlaybackAndReset: "Hentikan pemutaran dan reset",
    editBtn: "Edit",
    downloadBtn: "Unduh",
    deleteBtn: "Hapus",
    leaderboardTitle: "Papan Peringkat",
    uploadMidiModalTitle: "Unggah MIDI",
    editMidiModalTitle: "Edit MIDI",
    midiTitleLabel: "Judul MIDI",
    artistLabel: "Artis",
    arrangerOptional: "Aransemen oleh (Opsional)",
    arrangerPlaceholder: "Nama atau alias Anda",
    descOptional: "Deskripsi (Opsional)",
    descPlaceholder: "Deskripsi singkat mengenai MIDI atau aransemen ini.",
    mp3LinkOptional: "Tautan MP3 (Opsional)",
    mp3OffsetOptional: "Offset MP3 (Opsional)",
    bgUrlOptional: "URL Latar Belakang (Opsional)",
    songFileMidi: "File Lagu (MIDI)",
    replaceSongFileOptional: "Ganti File Lagu (Opsional, hanya MIDI)",
    replaceSongFileNotice: "Memilih file baru akan menggantikan file MIDI yang ada di server saat ini.",
    saveChangesBtn: "Simpan Perubahan",
    savingBtn: "Menyimpan...",
    uploadingBtn: "Mengunggah...",
    rankedTag: "PERINGKAT",
    backingTag: "PENGIRING",
    loadingScores: "Memuat Skor...",
    noScoresYet: "Belum ada skor yang dikirimkan untuk MIDI ini.",
    playerHeader: "Pemain",
    dateHeader: "Tanggal",
    scoreHeader: "Skor",
    rankHeader: "Peringkat",
    songHeader: "Lagu",
    myAccount: "Akun Saya",
    tellUsAboutYourself: "Ceritakan tentang diri Anda...",
    noBioYet: "Belum ada bio.",
    totalPlaytime: "Total Waktu Bermain",
    totalNotesHit: "Total Nada Berhasil Ditekan",
    rankedPerformances: "Performa Ranked",
    globalRank: "Peringkat Global",
    totalScore: "Total Skor",
    signOut: "Keluar Akun",
    loadingProfile: "Memuat profil...",
    profileNotFound: "Profil tidak ditemukan.",
    instrumentPiano: "Piano",
    instrumentDrum: "Drum",
    deleteSongConfirm: "Apakah Anda yakin ingin menghapus lagu ini? Tindakan ini tidak dapat dibatalkan.",
    provideTitleArtistMidi: "Harap isi judul, artis, dan sertakan file MIDI.",
    provideTitleArtist: "Harap isi judul dan artis.",
    signInToUpload: "Silakan masuk untuk mengunggah.",
    signInToLike: "Silakan masuk untuk menyukai lagu.",
    signInToDelete: "Silakan masuk untuk menghapus lagu.",
    searchByNickname: "Cari berdasarkan nama panggilan...",
    searchingText: "Mencari...",
    myFriendsTab: "Teman Saya",
    allCommunityTab: "Komunitas",
    topPerformersSubtitle: "Pemain terbaik di seluruh dunia",
    addFriendBtn: "Tambah Teman",
    removeFriendBtn: "Hapus Teman",
    requestSentBtn: "Permintaan Terkirim",
    acceptRequestBtn: "Terima Permintaan",
    noPlayersFound: "Tidak ada pemain ditemukan",
    noFriendsYet: "Belum ada teman ditambahkan",
    detailedAnalysisTitle: "Analisis Performa Rinci",
    metaStatsTitle: "Statistik Meta",
  },

  es: {
    settingsTitle: "Ajustes",
    closeSettings: "Cerrar ajustes",
    languageSectionTitle: "Idioma",
    appLanguageLabel: "Idioma de la Aplicación",
    gameplayStyleSection: "Estilo de Juego",
    pianoStyleTitle: "Piano",
    pianoStyleDesc: "Optimizado para teclados MIDI y aprendizaje visual.",
    computerStyleTitle: "Teclado de Computadora",
    computerStyleDesc: "Optimizado para jugar con el teclado de tu computadora.",
    drumNonMidiTitle: "Teclado/Pantalla Táctil",
    drumNonMidiDesc: "Toca la batería usando el teclado de tu PC o haciendo clic en el kit.",
    drumMidiTitle: "Batería MIDI",
    drumMidiDesc: "Toca con una batería electrónica o controlador MIDI conectado.",

    deviceUiSection: "Dispositivo e Interfaz",
    uiZoomLabel: "Zoom de Interfaz",
    autoZoomLabel: "Automático (Pantalla Completa)",
    autoZoomDesc: "Escala la interfaz automáticamente para adaptarse a tu resolución.",
    screenPresetsLabel: "Ajustes Preestablecidos",

    pianoDisplaySection: "Pantalla de Piano",
    visibleKeysLabel: "Teclas Visibles",
    startNoteLabel: "Nota Inicial (ej. C3)",
    endNoteLabel: "Nota Final (ej. C5)",
    customKeyRangeTitle: "Rango de Teclas Personalizado",

    controlsSection: "Controles",
    qwertyLayoutLabel: "Distribución del Teclado QWERTY",
    qwertyLayoutRoblox: "Diseño 1 (Roblox): Shift = teclas negras, ↑/↓ = ±1 semitono",
    qwertyLayoutStandard: "Diseño 2 (Estándar): ↑/↓ = ±1 octava",

    midiSection: "MIDI",
    midiStatusLabel: "Estado",
    inputDeviceLabel: "Dispositivo de Entrada",
    outputDeviceLabel: "Dispositivo de Salida",
    noMidiDevices: "No se detectaron dispositivos MIDI. Haz clic en 'Reescanear' o reconecta tu cable.",
    rescanDevices: "Reescanear Dispositivos",
    connectMidi: "Conectar MIDI",
    disconnectMidi: "Desconectar",

    acousticSection: "Entrada de Piano Acústico (Audio-a-MIDI Directo)",
    enableMicInput: "Activar Entrada de Micrófono",
    micInputDevice: "Dispositivo de Micrófono",
    detectionSensitivity: "Sensibilidad de Detección",
    adjustDbThresholds: "Ajustar umbrales dB por rango (Menor = Más Sensible)",
    micBetaNoticeTitle: "Aviso de Función Beta",
    micBetaNoticeDesc: "La detección acústica de notas mediante micrófono está actualmente en fase Beta (experimental). La precisión depende de la calidad del micrófono, el ruido ambiental y la acústica. Para obtener mejores resultados, coloque el micrófono cerca del piano o utilice una conexión directa por cable MIDI.",

    visualsSection: "Visuales y Juego",
    gameViewLabel: "Vista de Juego",
    noteLabelsLabel: "Etiquetas de Notas",
    fingeringSettingsTitle: "Ajustes de Digitación (Fingering)",
    handSizeLabel: "Tamaño de Mano",
    showHand3DLabel: "Mostrar Manos 3D Durante la Reproducción",
    showHand3DDesc: "Las manos 3D aparecen sobre las teclas inferiores según el color de cada mano. 1 pulgar · 2 índice · 3 medio · 4 anular · 5 meñique.",
    showMajorNotesOnly: "Recortar Notas Largas (Duración Limpia)",
    showMajorNotesOnlyDesc: "Solo visual: ordena las notas demasiado largas para que no se superpongan ni sobrepasen a las siguientes notas (en Partitura, la duración sigue la distancia entre notas sin ligaduras). El audio del piano conserva su duración original.",
    showPianoTilesBg: "Mostrar Fondo de Piano Tiles",
    pianoTilesOpacity: "Opacidad de Piano Tiles",
    showPerfectText: "Mostrar Texto de Calificación PERFECT",
    showPianoKeyboardNonFalling: "Mostrar Teclado de Piano (Fuera de Notas Cayendo)",
    showPianoKeyboardNonFallingDesc: "Muestra el teclado de piano en Partitura y Partitura Continua. En modo Notas Cayendo, el teclado siempre está visible. (Por defecto: Desactivado)",
    showDrumPads: "Mostrar Pads de Batería (Fuera de Drum Typer)",
    showDrumPadsDesc: "Muestra los pads interactivos de batería en modos distintos a Drum Typer (Drum Mania, Partitura) para jugar en pantallas táctiles o móviles. (Por defecto: Desactivado)",
    showDynamics: "Mostrar Dinámica y Velocidad",
    showDynamicsDesc: "Muestra marcas dinámicas musicales (p, mf, f, etc.) en la partitura y contornos según la velocidad de pulsación. (Por defecto: Desactivado)",
    inGameResolution: "Resolución de Vista en Juego",
    appearingKeysOpacity: "Opacidad de Teclas Emergentes",
    appearingKeysOpacityDesc: "Controla la visibilidad base de teclas/pads en Qwerty Typer y Drum Typer. 0% oculta las teclas hasta que las notas se acercan.",
    showQwertyShortcuts: "Mostrar Atajos QWERTY en las Teclas",

    audioSection: "Audio",
    pianoVolume: "Volumen del Piano",
    pianoVolumeMidiActiveDesc: "Volumen del piano fijado en 10% porque MIDI/Micrófono está activo. Puedes ajustarlo manualmente.",
    metronomeVolume: "Volumen del Metrónomo",
    backingTrackVolume: "Volumen de Pista de Acompañamiento",
    latencyOffsetTitle: "Compensación de Latencia MIDI y Audio",
    latencyOffsetDesc: "Compensa el retraso de entrada MIDI y diferencias de tiempo de audio entre dispositivos",
    midiHitTimingOffset: "Desplazamiento de Golpe MIDI (Hitbox Shift)",
    calibrateBtn: "Calibrar",
    quickStep: "Rápido:",
    midiHitTimingDesc: "Ajusta la sincronización del teclado o MIDI respecto a las notas. Usa negativo (-) si tus golpes van tarde, positivo (+) si van pronto.",
    mp3AudioOffset: "Desplazamiento de Audio MP3 (Sincronización)",
    mp3AudioOffsetDesc: "Alinea la reproducción de MP3 o YouTube con las notas cayendo en pantalla.",
    metronomeOffset: "Desplazamiento del Metrónomo",
    metronomeOffsetDesc: "Ajusta el metrónomo si sus clics suenan antes o después de la línea de golpe.",
    antiDoubleTrigger: "Anti Doble Disparo / Anti-Stutter (Anti Double Trigger)",
    antiDoubleTriggerDesc: "Evita que un solo golpe active múltiples entradas o stutter por vibración. Rango: 5ms - 200ms.",
    minimumInterval: "Intervalo Mínimo",

    drumMidiMappingTitle: "Mapeo MIDI de Batería",
    drumMidiMappingDesc: "Selecciona un componente de batería y golpea tu pad MIDI para asignarlo. Puedes asignar varias notas MIDI a un componente.",
    resetBtn: "Restablecer",
    autoSavedBadge: "Guardado Automático",
    hitDrumBtn: "¡GOLPEA BATERÍA!",
    mapBtn: "MAPEAR",
    noNotesMapped: "Sin notas asignadas",

    appearanceSection: "Apariencia",
    rightHandColor: "Color Mano Derecha",
    leftHandColor: "Color Mano Izquierda",
    fallingNotesBgColor: "Fondo de Notas Cayendo",
    hitNoteColor: "Color de Nota al Golpear",
    bgMediaTitle: "Imagen / Video de Fondo",
    uploadBtn: "Subir",
    clearBtn: "Borrar",
    bgOpacity: "Opacidad de Fondo",
    restartPreviewBtn: "Reiniciar vista previa",
    backBtn: "Volver",
    resetSettingsBtn: "Restablecer Ajustes",
    resetConfirm: "¿Restablecer todos los ajustes a los valores predeterminados?",

    playNow: "JUGAR AHORA",
    learnMode: "MODO APRENDER",
    comingSoon: "Próximamente",
    social: "COMUNIDAD",
    settings: "AJUSTES",
    profile: "PERFIL",
    login: "INICIAR SESIÓN",
    howToConnect: "Cómo Conectar",
    about: "Acerca de",
    contact: "Contacto",
    privacy: "Privacidad",
    disclaimer: "Descargo de Responsabilidad",
    pianoRhythmGame: "Juego de Ritmo de Piano",
    drumRhythmGame: "Juego de Ritmo de Batería",

    communityLibrary: "Biblioteca de la Comunidad",
    localImport: "Importar Local",
    selectTrack: "Seleccionar Pista",
    uploadYourFile: "Sube tu Archivo",
    fetchingTrackData: "Obteniendo datos de pista...",
    preparingAudioEngine: "Preparando motor de audio...",
    readyStatus: "Listo",
    startGame: "INICIAR JUEGO",
    editMidi: "EDITAR MIDI",
    chooseOnlinePrompt: "Elige una pista de la base de datos global abajo.",
    chooseLocalPrompt: "Arrastra y suelta un archivo MIDI o busca en tu equipo.",
    selectLocalFile: "Seleccionar Archivo Local",
    fileNotSupported: "Archivo no compatible. Sube un archivo MIDI (.mid, .midi).",
    cancel: "Cancelar",
    apply: "Aplicar",
    title: "Título",
    artist: "Artista",
    arranger: "Arreglista",
    description: "Descripción",
    audioOffsetMs: "Offset de Audio (ms)",
    backgroundUrl: "URL de Fondo",
    accuracyLevel: "Nivel de Precisión",
    accuracyLevelDesc: "3 = Muy permisivo, 5 = Normal, 7 = Muy estricto",

    gameMode: "Modo de Juego",
    lenientPracticeTitle: "Práctica Permisiva",
    lenientPracticeDesc: "La canción sigue sonando, pero pausará si no tocas una tecla.",
    strictPracticeTitle: "Práctica Estricta",
    strictPracticeDesc: "La canción se pausa y espera pacientemente a que toques la nota correcta.",
    autoplayTitle: "Reproducción Automática",
    autoplayDesc: "Siéntate y disfruta. La canción se tocará automáticamente por sí sola.",
    reticalModeTitle: "Modo Retical (Ranked)",
    reticalModeDesc: "Las puntuaciones se registran en la tabla clasificatoria solo si el MIDI es Ranked.",
    reticalDisabledMic: "Desactivado cuando la entrada de micrófono está activa.",
    backingTrackHeader: "Pista de Acompañamiento (Audio)",
    backingNone: "Ninguna",
    backingMp3: "Subir MP3",
    backingOnline: "Enlace en Línea (Automático)",
    backingUrl: "URL de Pista",
    streamingReady: "¡Streaming Listo! La pista se reproducirá directamente desde YouTube.",
    directAudioReady: "¡Audio Listo! La pista sonará directamente.",
    tempo: "Tempo",
    rankedTempoNotice: "El modo Ranked solo permite 4 velocidades: 0.75x, 1x, 1.25x y 1.5x.",
    handSelection: "Selección de Mano",
    leftHand: "Mano Izquierda",
    rightHand: "Mano Derecha",
    bothHands: "Ambas Manos",
    nonStopMode: "Modo Non-Stop",
    nonStopDesc: "La música continúa aunque falles notas, igual que en Autoplay.",
    enableHp: "Activar Barra de Salud (HP)",
    enableHpDesc: "Al desactivar (No-Fail), tu salud permanece llena y la canción no fallará.",

    exit: "Salir",
    play: "Reproducir",
    pause: "Pausar",
    stop: "Detener",
    zoom: "ZOOM",
    accuracy: "Precisión",
    combo: "Combo",
    waitTime: "Tiempo de Espera",
    fixSync: "Corregir Sincronización",
    globalMsOffset: "OFFSET GLOBAL MS",
    tapTimingAvg: "Tu Tiempo Promedio de Toque",
    record: "Grabar",
    saveMidi: "Guardar MIDI",

    gameOver: "Fin de la Partida",
    gameOverHpDesc: "Tu salud ha llegado a cero (0 HP). Reintenta la canción para seguir practicando.",
    loopActive: "Modo Bucle Activo",
    loopActiveDesc: "La reproducción volverá automáticamente al Punto A con salud llena.",
    retry: "Reintentar desde Punto A",
    tryAgain: "Intentar de Nuevo",
    close: "Cerrar",
    performanceSummary: "Resumen de Rendimiento",
    rank: "Rango",
    gameplayStyle: "Estilo de Juego",
    perfect: "Perfecto (Perfect)",
    great: "Excelente (Great)",
    good: "Bueno (Good)",
    miss: "Fallo (Miss)",
    maxCombo: "Combo Máximo",
    performanceScore: "Puntuación de Rendimiento",
    speedEfficiency: "Eficiencia de Velocidad",
    hits: "Aciertos",
    error: "Errores",
    continueBtn: "Continuar",
      heroBadge: "Elige un modo y empieza a tocar fácilmente",
    heroTitle: "Juego de Ritmo de Piano y Batería",
    heroDescPiano: "Toca canciones con teclado MIDI o teclado de computadora de forma interactiva.",
    heroDescDrum: "Practica ritmos con batería electrónica MIDI o teclado de computadora.",
    playCardDesc: "Explora la biblioteca en línea, importa tus archivos MIDI locales y juega.",
    learnCardDesc: "Aprende teoría musical, lectura de partituras, acordes y digitación 3D.",
    learnCardDrumDesc: "El plan de aprendizaje de batería está actualmente en desarrollo.",
    socialCardDesc: "Compite por los puntajes más altos y ve a los mejores jugadores globales.",
    howToConnectDesc: "Guía paso a paso para conectar pianos MIDI USB, Bluetooth o jugar con QWERTY.",
    featuredBadge: "Destacado",
    lessonBadge: "Lección Interactiva",
    rankedBadge: "Clasificatoria",
    setupBadge: "Guía de Conexión",
    browseSongsBtn: "Explorar Canciones",
    startLearningBtn: "Comenzar Lecciones",
    viewLeaderboardBtn: "Ver Clasificación",
    openGuideBtn: "Abrir Guía",
    systemLoading: "Iniciando Motor Octavia...",

    songLibraryTitle: "Biblioteca de Canciones",
    freePlayTab: "Juego Libre",
    freePlayTitle: "Modo de Piano Juego Libre",
    freePlayDesc: "Toca libremente en el piano sin partituras. Cuenta con visualizador en tiempo real, metrónomo con BPM ajustable, compases y grabación MIDI en vivo.",
    launchFreePlay: "Iniciar Juego Libre",
    importLocalTitle: "Importar Archivo MIDI Local",
    importLocalDesc: "Arrastra y suelta tu archivo .mid o .midi aquí, o haz clic en el botón de abajo para buscar en tu dispositivo.",
    newMidiEditor: "Crear Nuevo en Editor",
    parsingMidiSub: "Analizando notas MIDI, digitación y sintetizando sonidos...",
    readyToPlay: "Listo para Tocar",
    selectAndPlay: "SELECCIONAR Y CONTINUAR",
    localImportModalTitle: "Ajustes de Importación MIDI",
    optionalLabel: "Opcional",
    youtubeBackingLabel: "Enlace de Video de YouTube",
    audioOffsetLabel: "Desfase de Audio (ms)",
    backgroundUrlLabel: "URL de Imagen de Fondo",
    accuracyToleranceLabel: "Nivel de Tolerancia de Precisión (3-7)",
    loadThisMidi: "Cargar este MIDI",

    step1Title: "Selecciona el Modo de Juego",
    step2Title: "Personalizar Sesión",
    displayAndLabelsHeader: "Vista y Etiquetas",
    visualSettingsHeader: "Ajustes Visuales y de Pantalla",
    displayPanelDesc: "Configura el modo de vista (Notas que Caen, Partitura, Teclado Typer), etiquetas de notas, manos 3D y opciones visuales en Ajustes.",
    displayPanelDescDrum: "Configura el modo de vista de batería (Drum Typer, Drum Mania, Partitura), opacidad de pads y opciones visuales en Ajustes.",
    viewModeDrumTyper: "Drum Typer",
    viewModeDrumMania: "Drum Mania",
    viewModeFallingNotes: "Notas Cayendo (Falling Notes)",
    viewModeSheetMusic: "Partitura (Sheet Music)",
    viewModeRollSheet: "Sheet Music Roll",
    viewModeSheetQwerty: "Sheet Music QWERTY",
    viewModeQwertyTyper: "Teclado Typer",
    openDisplaySettingsBtn: "Configurar Vista y Etiquetas",
    noteLabelNameDisplay: "Nombre de Nota (C, D...)",
    noteLabelFingeringDisplay: "Digitación (1-5) (BETA)",
    noteLabelNoneDisplay: "Ninguno",
    noteLabelQwertyDisplay: "Teclas QWERTY",
    autoSetupTitle: "Ajuste Automático",
    autoSetupDesc: "Aplica vista y etiquetas recomendadas para este modo",
    openFullSettingsBtn: "Ajustes Completos",
    quickPresets: "Ajustes Rápidos",
    presetStandard: "Estándar",
    presetFingering: "Digitación (BETA)",
    presetSheet: "Partitura",
    presetQwerty: "QWERTY",
    changeSongBtn: "Cambiar Canción",
    activeBadge: "Activo",
    lenientBadgeDesc: "Ritmo Flexible • Ideal para Aprender",
    strictBadgeDesc: "Precisión de Ritmo • Entrena Memoria",
    rankedBadgeDesc: "Sin Pausas • Clasificación Oficial",
    autoplayBadgeDesc: "Automático • Mira y Escucha",
    audioSyncTitle: "Sincronización de Audio (Desfase)",
    applyAverageOffset: "Aplicar Promedio de Entrada",
    modeReadyLabel: "Modo Listo:",
    startGameAction: "COMENZAR JUEGO",

    searchPlaceholder: "Buscar título MIDI, artista o ID...",
    uploadMidiBtn: "Subir MIDI",
    sortByLabel: "Ordenar por:",
    sortNewest: "Más reciente",
    sortOldest: "Más antiguo",
    sortEasiest: "Más fácil",
    sortHardest: "Más difícil",
    sortAZ: "A → Z",
    sortZA: "Z → A",
    sortMostLiked: "Más gustado",
    sortLeastLiked: "Menos gustado",
    filterLabel: "Filtrar:",
    filterAll: "Todos",
    filterRanked: "Clasificatoria",
    filterNonRanked: "Casual",
    filterLiked: "Favoritos",
    filterDifficultyLabel: "Dificultad:",
    difficultyAll: "Todas las Dificultades",
    difficultyNovice: "Novato (Niv. 1-2)",
    difficultyBeginner: "Principiante (Niv. 3)",
    difficultyIntermediate: "Intermedio (Niv. 4-5)",
    difficultyAdvanced: "Avanzado (Niv. 6-7)",
    difficultyVirtuoso: "Virtuoso (Niv. 8-9)",
    difficultyLegendary: "Legendario (Niv. 10+)",
    noSongsFoundTitle: "No se encontraron canciones",
    noSongsFoundDesc: "Prueba con palabras clave diferentes o limpia el filtro.",
    loadMoreSongs: "Cargar Más Canciones",
    loadingMore: "Cargando Más...",
    copiedBadge: "¡Copiado!",
    copyIdTooltip: "Copiar ID",
    personalBestLabel: "Mejor Marca:",
    uploadedBy: "Subido por",
    selectSongBtn: "Elegir",

    settingsSubtitle: "Configura dispositivos, audio, visuales y calibración de latencia",
    settingsSearchPlaceholder: "Buscar ajustes (ej. desfase, volumen, tema, digitación)...",
    tabGameplay: "Jugabilidad y Visuales",
    tabMidi: "MIDI y Entrada",
    tabAudio: "Audio y Sincronización",
    tabVisuals: "Tema y Colores",
    tabAll: "Todos",
    amtEngineDesc: "Admite transcripción neuronal IA de alta precisión a través de online_amt (https://github.com/jdasam/online_amt) ejecutándose localmente en http://127.0.0.1:5000 o mediante MIDI virtual.",
    downloadAmtBtn: "Descargar Paquete del Motor (online_amt.zip)",
    checkAmtBtn: "Probar Conexión",
    amtGuideStep1: "Haz clic en 'Descargar Paquete del Motor' y descomprime el archivo.",
    amtGuideStep2: "Ejecuta run_amt.bat (Windows) o run_amt.sh (Mac/Linux).",
    amtGuideStep3: "¡Octavia se sincronizará automáticamente con el motor de transcripción IA!",
    fingering3DTitle: "Digitación y Manos 3D",
    fingering3DDesc: "Mostrar números de dedos y avatares de manos 3D",
    streamingLink: "Enlace de Transmisión:",
    importantNotice: "IMPORTANTE:",
    midiControllerDelayNotice: "Si notas retraso en tu controlador MIDI, ajusta la compensación de notas en ajustes. Haz clic en el icono para ir directamente a los ajustes de compensación, donde puedes calibrarlo automáticamente tocando la canción de prueba.",
    backingSyncNotice: "Si el MP3 sigue desincronizado, intenta ajustar USER MS (Sincronización de Audio) en ±10 ms respecto al desfase original; el objetivo es que la pista coincida con el metrónomo.",
    defaultSource: "Fuente Predeterminada:",
    defaultOffset: "Desfase Predeterminado:",
    audioToMidiDirectTitle: "Direct Acoustic Piano (Microphone Pitch Detection)",
    activeInBrowser: "Activo (Detector de Tono)",
    disabledStatus: "Inactivo",
    audioToMidiDesc: "Detección de notas de piano acústico en tiempo real impulsada por detección de tono de alta precisión (Autocorrelación / YIN). Latencia cero, respuesta instantánea en el navegador.",
    micListeningActive: "Micrófono escuchando activamente",
    allowMicrophoneBtn: "Permitir Micrófono",
    noMicrophonesFound: "No se encontraron micrófonos",
    micPermissionDeniedAlert: "Permiso de micrófono denegado. Permita el acceso al micrófono en la configuración de su navegador.",
    zoomDirectionLabel: "Dirección de Zoom (AR)",
    zoomDirectionNormal: "Normal (De afuera hacia adentro)",
    zoomDirectionReverse: "Invertido (De adentro hacia afuera)",
    customRangeOption: "Rango Personalizado",
    full88Keys: "Completo (88 teclas)",
    compact61Keys: "Compacto (61 teclas)",
    runLatencyCalibrationTitle: "Ejecutar calibración automática de latencia con ritmos de prueba",
    removeMapping: "Eliminar mapeo",
    bgMediaPlaceholder: "URL (Imagen o MP4)",
    exitCalibration: "Salir de Calibración",
    timeSignatureLabel: "Compás",
    stopRecording: "Detener Grabación",
    startRecording: "Iniciar Grabación MIDI",
    downloadRecordingAsMidi: "Descargar Grabación como MIDI",
    barLabel: "Compás",
    setLoopStartTooltip: "Fijar Inicio de Bucle al Compás Actual",
    setLoopEndTooltip: "Fijar Fin de Bucle al Compás Actual",
    clearLoopTooltip: "Limpiar Bucle",
    showFullMenu: "Mostrar Menú Completo",
    hideFullMenu: "Ocultar Menú",
    exitToSongSelection: "Volver a la selección de canciones",
    stopPlaybackAndReset: "Detener reproducción y reiniciar",
    editBtn: "Editar",
    downloadBtn: "Descargar",
    deleteBtn: "Eliminar",
    leaderboardTitle: "Clasificación",
    uploadMidiModalTitle: "Subir MIDI",
    editMidiModalTitle: "Editar MIDI",
    midiTitleLabel: "Título del MIDI",
    artistLabel: "Artista",
    arrangerOptional: "Arreglado por (Opcional)",
    arrangerPlaceholder: "Tu nombre o alias",
    descOptional: "Descripción (Opcional)",
    descPlaceholder: "Una breve descripción del MIDI o arreglo.",
    mp3LinkOptional: "Enlace MP3 (Opcional)",
    mp3OffsetOptional: "Desfase MP3 (Opcional)",
    bgUrlOptional: "URL de Fondo (Opcional)",
    songFileMidi: "Archivo de Canción (MIDI)",
    replaceSongFileOptional: "Reemplazar Archivo de Canción (Opcional, solo MIDI)",
    replaceSongFileNotice: "Seleccionar un archivo reemplazará el archivo MIDI actual en el servidor.",
    saveChangesBtn: "Guardar Cambios",
    savingBtn: "Guardando...",
    uploadingBtn: "Subiendo...",
    rankedTag: "CLASIFICATORIA",
    backingTag: "ACOMPAÑAMIENTO",
    loadingScores: "Cargando Puntuaciones...",
    noScoresYet: "Aún no se han enviado puntuaciones para este MIDI.",
    playerHeader: "Jugador",
    dateHeader: "Fecha",
    scoreHeader: "Puntuación",
    rankHeader: "Rango",
    songHeader: "Canción",
    myAccount: "Mi Cuenta",
    tellUsAboutYourself: "Cuéntanos sobre ti...",
    noBioYet: "Aún no hay biografía.",
    totalPlaytime: "Tiempo Total de Juego",
    totalNotesHit: "Total de Notas Acertadas",
    rankedPerformances: "Partidas Clasificatorias",
    globalRank: "Rango Global",
    totalScore: "Puntuación Total",
    signOut: "Cerrar Sesión",
    loadingProfile: "Cargando perfil...",
    profileNotFound: "Perfil no encontrado.",
    instrumentPiano: "Piano",
    instrumentDrum: "Batería",
    deleteSongConfirm: "¿Estás seguro de que deseas eliminar esta canción? Esta acción no se puede deshacer.",
    provideTitleArtistMidi: "Por favor proporciona título, artista y un archivo MIDI.",
    provideTitleArtist: "Por favor proporciona título y artista.",
    signInToUpload: "Inicia sesión para subir.",
    signInToLike: "Inicia sesión para indicar que te gusta una canción.",
    signInToDelete: "Inicia sesión para eliminar canciones.",
    searchByNickname: "Buscar por apodo...",
    searchingText: "Buscando...",
    myFriendsTab: "Mis Amigos",
    allCommunityTab: "Comunidad",
    topPerformersSubtitle: "Los mejores jugadores de todo el mundo",
    addFriendBtn: "Agregar Amigo",
    removeFriendBtn: "Eliminar Amigo",
    requestSentBtn: "Solicitud Enviada",
    acceptRequestBtn: "Aceptar Solicitud",
    noPlayersFound: "No se encontraron jugadores",
    noFriendsYet: "Aún no tienes amigos agregados",
    detailedAnalysisTitle: "Análisis Detallado de Rendimiento",
    metaStatsTitle: "Estadísticas Meta",
  }
};

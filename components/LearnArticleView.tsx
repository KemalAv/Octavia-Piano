import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ALL_KEYS, EXERCISE_CATEGORIES } from '../musicTheoryGenerator';
import { AppLanguage } from '../types';
import { getLearnTranslations } from './learnArticleTranslations';

interface LearnArticleViewProps {
  onBackToMainMenu: () => void;
  onLaunchInGamePractice?: (lessonId: string, subMode?: 'sheet' | 'falling' | 'fingering' | 'roblox' | 'theory') => void;
  onLaunchCustomExercise?: (key: string, typeId: string, typeName: string) => void;
  onOpenMidiEditor?: () => void;
  isModal?: boolean;
  onCloseModal?: () => void;
  appLanguage?: AppLanguage;
}

export type ChapterId = 'sheet' | 'falling' | 'fingering' | 'roblox' | 'theory' | 'exercises' | 'perfectpitch' | 'midieditor' | 'videos';

export interface TutorialVideoItem {
  id: string;
  title: string;
  titleId: string;
  titleEs?: string;
  category: string;
  categoryEs?: string;
  categoryId?: string;
  chapterTarget: ChapterId;
  url: string;
  ytId: string;
  description: string;
  descriptionId: string;
  descriptionEs?: string;
  keyTakeaways: string[];
  keyTakeawaysId: string[];
  keyTakeawaysEs?: string[];
  tag: string;
  duration: string;
}

export const TUTORIAL_VIDEOS: TutorialVideoItem[] = [
  {
    id: 'sheet_music',
    title: 'How to Read Sheet Music: Grand Staff & Rhythm Architecture',
    titleId: 'Cara Membaca Not Balok: Arsitektur Grand Staff & Ritme',
    titleEs: 'Cómo Leer Partituras: El Gran Pentagrama y Arquitectura Rítmica',
    category: 'Notation & Sight-Reading',
    categoryEs: 'Notación y Lectura',
    categoryId: 'Notasi & Membaca Cepat',
    chapterTarget: 'sheet',
    url: 'https://youtu.be/yltCkCy1DeM',
    ytId: 'yltCkCy1DeM',
    description: 'Systematic breakdown of staff lines, treble and bass clefs, landmark notes (C4, G4, F3), ledger lines, and rhythmic subdivision from whole notes to sixteenths.',
    descriptionId: 'Pembahasan sistematis garis paranada, kunci G dan kunci F, titik jangkar nada (C4, G4, F3), garis bantu, serta pembagian nilai ketukan dari not penuh hingga seperenambelas.',
    descriptionEs: 'Desglose sistemático de las líneas del pentagrama, claves de Sol y Fa, notas ancla (Do4, Sol4, Fa3), líneas adicionales y subdivisión rítmica.',
    keyTakeaways: [
      'Locate Middle C (C4), Treble G4, and Bass F3 as fixed spatial landmarks',
      'Read intervals (steps vs. skips) rather than spelling isolated note letters',
      'Subdivide quarter-note pulse against dotted notes and ties'
    ],
    keyTakeawaysId: [
      'Gunakan C Tengah (C4), G4 Treble, dan F3 Bass sebagai titik patokan tetap',
      'Baca jarak interval (melangkah vs. melompat) alih-alih mengeja huruf satu per satu',
      'Hitung pembagian ketukan not bertitik dan garis lengkung tie secara presisi'
    ],
    keyTakeawaysEs: [
      'Ubica el Do Central (C4), Sol4 en Clave de Sol y Fa3 en Clave de Fa como referencias fijas',
      'Lee intervalos (grados conjuntos vs. saltos) en lugar de deletrear letras aisladas',
      'Subdivide el pulso de negra frente a notas con puntillo y ligaduras'
    ],
    tag: 'CH.01 Reference',
    duration: 'Core Module',
  },
  {
    id: 'music_theory',
    title: 'Music Theory & Harmonic Intervals from First Principles',
    titleId: 'Fundamental Teori Musik & Interval Harmoni',
    titleEs: 'Teoría Musical e Intervalos Armónicos desde Cero',
    category: 'Harmonic Theory',
    categoryEs: 'Teoría Armónica',
    categoryId: 'Teori Harmoni',
    chapterTarget: 'theory',
    url: 'https://youtu.be/_VvKeiwddPI',
    ytId: '_VvKeiwddPI',
    description: 'Understand the 12-semitone chromatic grid, consonant vs. dissonant intervals, the Circle of Fifths, and diatonic chord functions.',
    descriptionId: 'Memahami kisi kromatik 12-semitone, interval konsonan vs. disonan, Lingkaran Kuint (Circle of Fifths), serta fungsi akor diatonis.',
    descriptionEs: 'Comprende la cuadrícula cromática de 12 semitonos, intervalos consonantes vs. disonantes, el Círculo de Quintas y funciones tonales.',
    keyTakeaways: [
      'Measure every musical distance in exact half-steps (semitones)',
      'Navigate clockwise (+7 semitones / P5) and counter-clockwise (+5 semitones / P4)',
      'Connect Tonic (I), Subdominant (IV), and Dominant (V) harmonic gravity'
    ],
    keyTakeawaysId: [
      'Ukur setiap jarak musik menggunakan satuan semitone (setengah nada) yang pasti',
      'Navigasi searah jarum jam (+7 semitone / Kuint) dan berlawanan (+5 semitone / Kuart)',
      'Hubungkan gravitasi harmoni Tonika (I), Subdominan (IV), dan Dominan (V)'
    ],
    keyTakeawaysEs: [
      'Mide cada distancia musical en semitonos exactos',
      'Navega en sentido horario (+7 semitonos) y antihorario (+5 semitonos)',
      'Conecta la gravedad armónica de Tónica (I), Subdominante (IV) y Dominante (V)'
    ],
    tag: 'CH.05 Reference',
    duration: 'Core Module',
  },
  {
    id: 'scales',
    title: 'Scale Construction Formulas & Thumb-Under Mechanics',
    titleId: 'Rumus Konstruksi Tangga Nada & Mekanika Thumb-Under',
    titleEs: 'Fórmulas de Escalas y Mecánica del Paso de Pulgar',
    category: 'Scales & Technique',
    categoryEs: 'Escalas y Técnica',
    categoryId: 'Tangga Nada & Teknik',
    chapterTarget: 'fingering',
    url: 'https://youtu.be/1OPWJ4WOuLU',
    ytId: '1OPWJ4WOuLU',
    description: 'Master major, natural minor, harmonic minor, and melodic minor scale formulas alongside clean thumb-under crossings across multiple octaves.',
    descriptionId: 'Kuasai rumus tangga nada mayor, minor asli, minor harmonis, dan minor melodis beserta teknik penyelipan ibu jari (thumb-under) lintas oktaf.',
    descriptionEs: 'Domina las fórmulas de escalas mayores, menores y el paso de pulgar fluido a través de varias octavas.',
    keyTakeaways: [
      'Apply W-W-H-W-W-W-H (Major) and W-H-W-W-H-W-W (Natural Minor) in any key',
      'Raise the 7th degree in Harmonic Minor to create a leading-tone cadence',
      'Keep the wrist level and elbows relaxed during thumb-under pivot transitions'
    ],
    keyTakeawaysId: [
      'Terapkan pola W-W-H-W-W-W-H (Mayor) dan W-H-W-W-H-W-W (Minor Asli) di semua kunci',
      'Naikkan derajat ke-7 pada Minor Harmonis untuk menciptakan tegangan leading-tone',
      'Jaga pergelangan tetap datar tanpa mengangkat siku saat transisi jempol'
    ],
    keyTakeawaysEs: [
      'Aplica tono y semitono en cualquier escala mayor o menor',
      'Eleva el 7mo grado en la escala Menor Armónica para crear tensión cadencial',
      'Mantén la muñeca nivelada y relajada durante el paso del pulgar'
    ],
    tag: 'CH.03 / CH.05',
    duration: 'Technical Drill',
  },
  {
    id: 'chords',
    title: 'Triads, Seventh Voicings, Inversions & Voice Leading',
    titleId: 'Triad, Akor Tujuh, Inversi & Voice Leading Halus',
    titleEs: 'Tríadas, Acordes de Séptima, Inversiones y Conducción',
    category: 'Chords & Voicing',
    categoryEs: 'Acordes y Disposición',
    categoryId: 'Akor & Voicing',
    chapterTarget: 'theory',
    url: 'https://youtu.be/EMj0LrMQDKs',
    ytId: 'EMj0LrMQDKs',
    description: 'Construct major, minor, diminished, augmented, and 7th chords, and connect progressions smoothly using 1st and 2nd inversions.',
    descriptionId: 'Menyusun akor mayor, minor, diminished, augmented, dan akor 7th, serta menghubungkan progresi akor secara mulus memakai inversi 1 dan 2.',
    descriptionEs: 'Construye acordes mayores, menores, disminuidos, aumentados y de séptima enlazando con 1ra y 2da inversión.',
    keyTakeaways: [
      'Distinguish Major (4+3 semitones) from Minor (3+4 semitones) triads instantly',
      'Use Root, 1st Inversion (6/3), and 2nd Inversion (6/4) to minimize hand jumps',
      'Anchor common tones between consecutive chords in I–V–vi–IV and ii–V–I'
    ],
    keyTakeawaysId: [
      'Bedakan struktur Triad Mayor (4+3 semitone) dan Minor (3+4 semitone) secara instan',
      'Gunakan Posisi Dasar, Inversi 1 (6/3), dan Inversi 2 (6/4) untuk meminimalkan lompatan tangan',
      'Pertahankan nada sekutu (common tone) antar akor pada progresi I–V–vi–IV dan ii–V–I'
    ],
    keyTakeawaysEs: [
      'Distingue tríadas mayores de menores al instante por semitonos',
      'Usa inversiones para minimizar saltos y desplazamientos de mano',
      'Conserva notas comunes en progresiones para transiciones suaves'
    ],
    tag: 'CH.05 Reference',
    duration: 'Harmony Lab',
  },
  {
    id: 'hand_placement',
    title: 'Biomechanics: Hand Arch, Arm Weight & Injury Prevention',
    titleId: 'Biomekanika Piano: Kubah Tangan, Berat Lengan & Pencegahan Cedera',
    titleEs: 'Biomecánica: Arco de la Mano, Peso del Brazo y Postura',
    category: 'Ergonomics',
    categoryEs: 'Ergonomía',
    categoryId: 'Ergonomi',
    chapterTarget: 'fingering',
    url: 'https://youtu.be/a_kVafB-0C4',
    ytId: 'a_kVafB-0C4',
    description: 'Anatomical analysis of the metacarpal arch, distal phalanx stability, forearm pronation/supination, and wrist alignment.',
    descriptionId: 'Analisis anatomi lengkung metakarpal, stabilitas ruas ujung jari, rotasi lengan bawah (pronasi/supinasi), dan kelurusan pergelangan.',
    descriptionEs: 'Análisis anatómico del arco metacarpiano, peso del brazo y alineación ergonómica de la muñeca.',
    keyTakeaways: [
      'Maintain active structural support across MCP, PIP, and DIP finger joints',
      'Channel gravity and arm weight rather than pressing with isolated finger tension',
      'Use forearm rotation for Alberti bass, tremolos, and wide interval leaps'
    ],
    keyTakeawaysId: [
      'Pertahankan struktur kubah aktif pada sendi jari MCP, PIP, dan DIP agar tidak melipat',
      'Salurkan gravitasi dan bobot lengan alih-alih menekan dengan otot jari yang tegang',
      'Gunakan rotasi lengan bawah untuk pola bass Alberti, tremolo, dan lompatan oktaf'
    ],
    keyTakeawaysEs: [
      'Conserva el arco natural de las articulaciones de los dedos sin colapsar',
      'Aprovecha el peso del brazo y la gravedad en vez de tensión aislada',
      'Emplea la rotación del antebrazo en trémolos y bajos Alberti'
    ],
    tag: 'CH.03 Reference',
    duration: 'Biomechanics',
  },
  {
    id: 'computer_keyboard',
    title: 'Virtual Piano & PC Keyboard Mapping (MIRP / QWERTY Engine)',
    titleId: 'Pemetaan Virtual Piano & Keyboard PC (Mesin MIRP / QWERTY)',
    titleEs: 'Piano Virtual y Mapeo de Teclado PC (Motor MIRP / QWERTY)',
    category: 'PC Keyboard Engine',
    categoryEs: 'Motor de Teclado PC',
    categoryId: 'Mesin Keyboard PC',
    chapterTarget: 'roblox',
    url: 'https://youtu.be/LM-aAcYtKg4',
    ytId: 'LM-aAcYtKg4',
    description: 'Complete guide to playing 61-key virtual piano repertoire on a standard computer keyboard using MIRP and Compact layouts.',
    descriptionId: 'Panduan lengkap memainkan repertoar piano virtual 61-tuts pada keyboard komputer standar menggunakan tata letak MIRP dan Compact.',
    descriptionEs: 'Guía para tocar repertorio de 61 teclas en teclado de ordenador estándar con distribuciones MIRP y Compact.',
    keyTakeaways: [
      'Map the 4 alphanumeric rows to C2–C7 with Middle C anchored at key [t]',
      'Use real-time semitone transposition (Up/Down arrows) to reduce Shift combinations',
      'Understand N-Key Rollover (NKRO) and anti-ghosting for multi-note chords'
    ],
    keyTakeawaysId: [
      'Petakan 4 baris tombol alfanumerik ke C2–C7 dengan C Tengah berjangkar pada tombol [t]',
      'Manfaatkan transposisi semitone real-time (panah Atas/Bawah) untuk mengurangi kombinasi Shift',
      'Pahami N-Key Rollover (NKRO) dan anti-ghosting untuk akor polifonik kompleks'
    ],
    keyTakeawaysEs: [
      'Mapea las 4 filas alfanuméricas con Do Central en la tecla [t]',
      'Usa transposición en tiempo real para evitar pulsar Shift continuamente',
      'Asegura N-Key Rollover (NKRO) para acordes de múltiples notas simultáneas'
    ],
    tag: 'CH.04 Reference',
    duration: 'PC Setup',
  },
  {
    id: 'only_for_nerds',
    title: 'Advanced Harmony: Diatonic Modes, Polyrhythms & Secondary Dominants',
    titleId: 'Harmoni Lanjut: Modus Diatonis, Poliritme & Dominan Sekunder',
    titleEs: 'Armonía Avanzada: Modos Diatónicos, Polirritmos y Dominantes',
    category: 'Advanced Theory',
    categoryEs: 'Teoría Avanzada',
    categoryId: 'Teori Lanjut',
    chapterTarget: 'theory',
    url: 'https://youtu.be/Yv-W4ezHvH0',
    ytId: 'Yv-W4ezHvH0',
    description: 'Deep dive into the 7 church modes (Ionian to Locrian), secondary dominants (V/V), borrowed modal mixture, and cross-rhythms (3:2 and 4:3).',
    descriptionId: 'Pendalaman 7 modus diatonis (Ionian hingga Locrian), dominan sekunder (V/V), modal interchange, serta poliritme silang (3:2 dan 4:3).',
    descriptionEs: 'Los 7 modos eclesiásticos, dominantes secundarios (V/V), intercambio modal y polirritmos complejos.',
    keyTakeaways: [
      'Identify each mode by its single characteristic color interval (e.g. Lydian #4, Dorian #6)',
      'Subdivide 3-against-2 (composite rhythm: Both–Right–Left–Right) on a 6-pulse grid',
      'Use secondary dominants and tritone substitutions to intensify harmonic resolution'
    ],
    keyTakeawaysId: [
      'Kenali setiap modus dari satu interval karakteristik utamanya (mis. Lydian #4, Dorian #6)',
      'Hitung poliritme 3-lawan-2 (ritme gabungan: Bersama–Kanan–Kiri–Kanan) pada kisi 6-detak',
      'Gunakan dominan sekunder dan substitusi tritone untuk memperkuat resolusi harmoni'
    ],
    keyTakeawaysEs: [
      'Identifica cada modo por su intervalo característico principal',
      'Subdivide el polirritmo 3 contra 2 en una métrica de 6 pulsos',
      'Emplea dominantes secundarios para modular y enriquecer progresiones'
    ],
    tag: 'CH.05 Advanced',
    duration: 'Masterclass',
  },
  {
    id: 'perfect_pitch',
    title: 'Perfect Pitch vs. Relative Pitch: Complete Ear Training Guide',
    titleId: 'Perfect Pitch vs. Relative Pitch: Panduan Lengkap Pelatihan Telinga',
    titleEs: 'Oído Absoluto vs. Oído Relativo: Guía Completa de Entrenamiento Auditivo',
    category: 'Ear Training & Auditory Perception',
    categoryEs: 'Entrenamiento Auditivo y Percepción',
    categoryId: 'Pelatihan Telinga & Persepsi Nada',
    chapterTarget: 'perfectpitch',
    url: 'https://youtu.be/yltCkCy1DeM',
    ytId: 'yltCkCy1DeM',
    description: 'Master the methods behind identifying musical pitches without reference, memorizing interval jumps with famous songs, and daily ear drills.',
    descriptionId: 'Kuasai metode mengenali frekuensi nada tanpa alat bantu, menghafal lompatan interval dengan lagu populer, dan latihan telinga harian.',
    descriptionEs: 'Aprende a reconocer notas musicales sin referencias, memorizar intervalos con canciones célebres y estructurar tu rutina auditiva.',
    keyTakeaways: [
      'Understand the science of Absolute Pitch and adult Anchor Pitch methods',
      'Learn the 12 chromatic frequencies (A4 = 440 Hz, C4 = 261.63 Hz)',
      'Use the 12 interval song mnemonics for instant melodic transcription',
      'Practice 10 minutes daily with the Octavia Interactive Pitch Trainer'
    ],
    keyTakeawaysId: [
      'Pahami sains Pitch Absolut dan metode jangkar nada untuk musisi dewasa',
      'Kuasai 12 frekuensi kromatik (A4 = 440 Hz, C4 = 261.63 Hz)',
      'Gunakan jembatan keledai 12 lagu interval untuk transkripsi melodi kilat',
      'Latih 10 menit sehari dengan Konsol Latihan Pitch Interaktif Octavia'
    ],
    keyTakeawaysEs: [
      'Comprende la neurobiología del tono absoluto y el método de anclas tonales',
      'Domina las 12 frecuencias cromáticas (La4 = 440 Hz, Do4 = 261.63 Hz)',
      'Utiliza mnemotecnias de canciones para transcribir intervalos de inmediato',
      'Entrena 10 minutos al día con la Consola Interactiva de Octavia'
    ],
    tag: 'CH.07 Ear Training',
    duration: 'Ear Masterclass',
  },
  {
    id: 'midi_editor',
    title: 'Octavia MIDI Editor & Sequencer: From Notes to Full Arrangement',
    titleId: 'Editor MIDI & Sekuenser Octavia: Dari Not Mentah ke Aransemen Utuh',
    titleEs: 'Editor MIDI y Secuenciador Octavia: De Notas a un Arreglo Completo',
    category: 'MIDI Sequencer & Tools',
    categoryEs: 'Secuenciador MIDI y Herramientas',
    categoryId: 'Sekuenser MIDI & Alat',
    chapterTarget: 'midieditor',
    url: 'https://youtu.be/yltCkCy1DeM',
    ytId: 'yltCkCy1DeM',
    description: 'Complete guide to building custom songs, quantizing loose notes, adjusting velocity curves, and routing left/right hands in the built-in MIDI piano roll.',
    descriptionId: 'Panduan lengkap membuat lagu kustom, merapikan ketukan dengan kuantisasi, mengatur kurva velocity, dan memisahkan partitur tangan kiri/kanan di editor MIDI bawaan.',
    descriptionEs: 'Guía completa para componer canciones, cuantizar notas desalineadas, modular la velocidad dinámica y asignar manos en el piano roll MIDI.',
    keyTakeaways: [
      'Draw and resize notes snapped to 480 PPQ metric grid (1/1 down to 1/64)',
      'Separate Left and Right Hand notes for 3D hand fingering and dual-color cascades',
      'Fine-tune expressive velocity levels from ppp (1–32) to fff (96–127)',
      'Export Standard MIDI (.mid) files directly into Octavia or any DAW'
    ],
    keyTakeawaysId: [
      'Gambar dan ubah durasi not dengan snap kisi 480 PPQ (dari 1/1 hingga 1/64)',
      'Pisahkan jalur not Tangan Kiri dan Kanan untuk panduan jari 3D dan kaskade 2 warna',
      'Atur dinamika ekspresi velocity dari ppp (1–32) hingga fff (96–127)',
      'Ekspor file Standard MIDI (.mid) langsung ke game Octavia atau DAW eksternal'
    ],
    keyTakeawaysEs: [
      'Dibuja y redimensiona notas ajustadas a la cuadrícula de 480 PPQ (1/1 a 1/64)',
      'Separa notas de mano izquierda y derecha para la digitación 3D y cascadas bicolores',
      'Ajusta la velocidad dinámica desde pianissimo (1–32) hasta fortissimo (96–127)',
      'Exporta archivos MIDI estándar (.mid) directamente a Octavia o a tu DAW preferido'
    ],
    tag: 'CH.08 Dedicated',
    duration: 'Sequencer Lab',
  },
];

export interface CircleKeyItem {
  major: string;
  minor: string;
  sharps: number;
  flats: number;
  sigLabel: string;
  accidentals: string;
  majorChords: { tonic: string; subdom: string; dom: string };
  minorChords: { subdom: string; tonicRel: string; domRel: string };
  dimChord: string;
  notes: string[];
}

export const CIRCLE_OF_FIFTHS_DATA: CircleKeyItem[] = [
  {
    major: 'C',
    minor: 'Am',
    sharps: 0,
    flats: 0,
    sigLabel: '0 ♯ / 0 ♭',
    accidentals: 'Natural (No ♯ / ♭)',
    majorChords: { tonic: 'C', subdom: 'F', dom: 'G' },
    minorChords: { subdom: 'Dm', tonicRel: 'Am', domRel: 'Em' },
    dimChord: 'B°',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  },
  {
    major: 'G',
    minor: 'Em',
    sharps: 1,
    flats: 0,
    sigLabel: '1 ♯',
    accidentals: 'F♯',
    majorChords: { tonic: 'G', subdom: 'C', dom: 'D' },
    minorChords: { subdom: 'Am', tonicRel: 'Em', domRel: 'Bm' },
    dimChord: 'F♯°',
    notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F♯'],
  },
  {
    major: 'D',
    minor: 'Bm',
    sharps: 2,
    flats: 0,
    sigLabel: '2 ♯',
    accidentals: 'F♯, C♯',
    majorChords: { tonic: 'D', subdom: 'G', dom: 'A' },
    minorChords: { subdom: 'Em', tonicRel: 'Bm', domRel: 'F♯m' },
    dimChord: 'C♯°',
    notes: ['D', 'E', 'F♯', 'G', 'A', 'B', 'C♯'],
  },
  {
    major: 'A',
    minor: 'F♯m',
    sharps: 3,
    flats: 0,
    sigLabel: '3 ♯',
    accidentals: 'F♯, C♯, G♯',
    majorChords: { tonic: 'A', subdom: 'D', dom: 'E' },
    minorChords: { subdom: 'Bm', tonicRel: 'F♯m', domRel: 'C♯m' },
    dimChord: 'G♯°',
    notes: ['A', 'B', 'C♯', 'D', 'E', 'F♯', 'G♯'],
  },
  {
    major: 'E',
    minor: 'C♯m',
    sharps: 4,
    flats: 0,
    sigLabel: '4 ♯',
    accidentals: 'F♯, C♯, G♯, D♯',
    majorChords: { tonic: 'E', subdom: 'A', dom: 'B' },
    minorChords: { subdom: 'F♯m', tonicRel: 'C♯m', domRel: 'G♯m' },
    dimChord: 'D♯°',
    notes: ['E', 'F♯', 'G♯', 'A', 'B', 'C♯', 'D♯'],
  },
  {
    major: 'B',
    minor: 'G♯m',
    sharps: 5,
    flats: 0,
    sigLabel: '5 ♯',
    accidentals: 'F♯, C♯, G♯, D♯, A♯',
    majorChords: { tonic: 'B', subdom: 'E', dom: 'F♯' },
    minorChords: { subdom: 'C♯m', tonicRel: 'G♯m', domRel: 'D♯m' },
    dimChord: 'A♯°',
    notes: ['B', 'C♯', 'D♯', 'E', 'F♯', 'G♯', 'A♯'],
  },
  {
    major: 'F♯ / G♭',
    minor: 'D♯m / E♭m',
    sharps: 6,
    flats: 6,
    sigLabel: '6 ♯ / 6 ♭',
    accidentals: 'F♯, C♯, G♯, D♯, A♯, E♯ / B♭, E♭, A♭, D♭, G♭, C♭',
    majorChords: { tonic: 'F♯', subdom: 'B', dom: 'C♯' },
    minorChords: { subdom: 'G♯m', tonicRel: 'D♯m', domRel: 'A♯m' },
    dimChord: 'E♯°',
    notes: ['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯'],
  },
  {
    major: 'D♭',
    minor: 'B♭m',
    sharps: 0,
    flats: 5,
    sigLabel: '5 ♭',
    accidentals: 'B♭, E♭, A♭, D♭, G♭',
    majorChords: { tonic: 'D♭', subdom: 'G♭', dom: 'A♭' },
    minorChords: { subdom: 'E♭m', tonicRel: 'B♭m', domRel: 'Fm' },
    dimChord: 'C°',
    notes: ['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C'],
  },
  {
    major: 'A♭',
    minor: 'Fm',
    sharps: 0,
    flats: 4,
    sigLabel: '4 ♭',
    accidentals: 'B♭, E♭, A♭, D♭',
    majorChords: { tonic: 'A♭', subdom: 'D♭', dom: 'E♭' },
    minorChords: { subdom: 'B♭m', tonicRel: 'Fm', domRel: 'Cm' },
    dimChord: 'G°',
    notes: ['A♭', 'B♭', 'C', 'D♭', 'E♭', 'F', 'G'],
  },
  {
    major: 'E♭',
    minor: 'Cm',
    sharps: 0,
    flats: 3,
    sigLabel: '3 ♭',
    accidentals: 'B♭, E♭, A♭',
    majorChords: { tonic: 'E♭', subdom: 'A♭', dom: 'B♭' },
    minorChords: { subdom: 'Fm', tonicRel: 'Cm', domRel: 'Gm' },
    dimChord: 'D°',
    notes: ['E♭', 'F', 'G', 'A♭', 'B♭', 'C', 'D'],
  },
  {
    major: 'B♭',
    minor: 'Gm',
    sharps: 0,
    flats: 2,
    sigLabel: '2 ♭',
    accidentals: 'B♭, E♭',
    majorChords: { tonic: 'B♭', subdom: 'E♭', dom: 'F' },
    minorChords: { subdom: 'Cm', tonicRel: 'Gm', domRel: 'Dm' },
    dimChord: 'A°',
    notes: ['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A'],
  },
  {
    major: 'F',
    minor: 'Dm',
    sharps: 0,
    flats: 1,
    sigLabel: '1 ♭',
    accidentals: 'B♭',
    majorChords: { tonic: 'F', subdom: 'B♭', dom: 'C' },
    minorChords: { subdom: 'Gm', tonicRel: 'Dm', domRel: 'Am' },
    dimChord: 'E°',
    notes: ['F', 'G', 'A', 'B♭', 'C', 'D', 'E'],
  },
];

const ChapterIcon: React.FC<{ id: ChapterId; active: boolean }> = ({ id, active }) => {
  const stroke = active ? '#38bdf8' : '#64748b';
  switch (id) {
    case 'sheet':
      return (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'falling':
      return (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <rect x="4" y="3" width="4" height="10" rx="1" />
          <rect x="10" y="7" width="4" height="11" rx="1" />
          <rect x="16" y="4" width="4" height="8" rx="1" />
          <line x1="2" y1="21" x2="22" y2="21" strokeLinecap="round" />
        </svg>
      );
    case 'fingering':
      return (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" strokeLinecap="round" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" strokeLinecap="round" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" strokeLinecap="round" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'roblox':
      return (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M8 16h8" strokeLinecap="round" />
        </svg>
      );
    case 'theory':
      return (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="3" x2="12" y2="9" />
          <line x1="12" y1="15" x2="12" y2="21" />
          <line x1="3" y1="12" x2="9" y2="12" />
          <line x1="15" y1="12" x2="21" y2="12" />
        </svg>
      );
    case 'exercises':
      return (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'perfectpitch':
      return (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v10" />
          <path d="M7 5v5a5 5 0 0 0 10 0V5" />
          <path d="M12 17v5" />
          <circle cx="12" cy="17" r="1.5" fill={stroke} />
        </svg>
      );
    case 'videos':
      return (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" strokeLinejoin="round" />
        </svg>
      );
    case 'midieditor':
      return (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18" strokeLinecap="round" />
          <rect x="11" y="5" width="4" height="2" rx="0.5" fill={stroke} />
          <rect x="15" y="11" width="4" height="2" rx="0.5" fill={stroke} />
          <rect x="11" y="17" width="5" height="2" rx="0.5" fill={stroke} />
        </svg>
      );
  }
};


const DRILL_TRANSLATIONS: Record<string, { id: { name: string; desc: string }; es: { name: string; desc: string } }> = {
  sight_reading_major: {
    id: { name: 'Mayor (Ionian)', desc: 'Kuasai tangga nada Mayor (1-2-3-4-5-6-7). Pola: W-W-H-W-W-W-H. Fondasi musik barat dengan karakter cerah dan stabil.' },
    es: { name: 'Mayor (Jónico)', desc: 'Domina la escala Mayor (1-2-3-4-5-6-7). Patrón: T-T-S-T-T-T-S. Piedra angular de la música occidental, con carácter brillante y alegre.' },
  },
  sight_reading_natural_minor: {
    id: { name: 'Minor Asli (Aeolian)', desc: 'Latih tangga nada Minor Alami (1-2-♭3-4-5-♭6-♭7). Menghasilkan nuansa syahdu, serius, atau kontemplatif.' },
    es: { name: 'Menor Natural (Eólico)', desc: 'Practica la escala Menor Natural (1-2-♭3-4-5-♭6-♭7). Comparte las notas de su relativo mayor con un matiz melancólico o solemne.' },
  },
  sight_reading_harmonic_minor: {
    id: { name: 'Minor Harmonis', desc: 'Tangga nada minor dengan nada ke-7 dinaikkan (1-2-♭3-4-5-♭6-7). Tarikan kuat ke tonika dan nuansa neo-klasik dramatis.' },
    es: { name: 'Menor Armónica', desc: 'Escala menor con el 7º grado elevado (1-2-♭3-4-5-♭6-7). La sensible crea una fuerte resolución y un color neo-clásico exótico.' },
  },
  sight_reading_melodic_minor: {
    id: { name: 'Minor Melodis (Jazz)', desc: 'Menaikkan nada ke-6 dan ke-7 (1-2-♭3-4-5-6-7). Memperhalus interval, standar dalam improvisasi jazz modern.' },
    es: { name: 'Menor Melódica (Jazz)', desc: 'Eleva el 6º y 7º grado (1-2-♭3-4-5-6-7). Suaviza el salto de la menor armónica, ampliamente utilizada en jazz.' },
  },
  sight_reading_chromatic: {
    id: { name: 'Tangga Nada Kromatik', desc: 'Memainkan seluruh 12 nada dalam oktaf dengan jarak setengah laras. Latihan puncak untuk kemandirian dan kecepatan jari.' },
    es: { name: 'Escala Cromática', desc: 'Utiliza las 12 notas de la octava separadas por semitonos. Ejercicio definitivo para la agilidad y el control del teclado.' },
  },
  sight_reading_whole_tone: {
    id: { name: 'Nada Penuh (Whole Tone)', desc: 'Skala simetris di mana setiap nada berjarak satu laras penuh (1-2-3-♯4-♯5-♭7). Nuansa mengambang khas impresionisme.' },
    es: { name: 'Tonos Enteros (Hexátona)', desc: 'Escala simétrica con intervalos de tono entero (1-2-3-♯4-♯5-♭7). Produce un sonido etéreo y flotante popular en impresionismo.' },
  },
  sight_reading_major_pentatonic: {
    id: { name: 'Pentatonik Mayor', desc: 'Skala 5 nada praktis (1-2-3-5-6) tanpa nada ke-4 dan ke-7. Fondasi melodi musik pop, blues, rock, dan lagu rakyat.' },
    es: { name: 'Pentatónica Mayor', desc: 'Versión de 5 notas (1-2-3-5-6) que omite el 4º y 7º grado. Base melódica sumamente versátil en blues, rock y música popular.' },
  },
  sight_reading_dorian: {
    id: { name: 'Modus Dorian', desc: 'Modus ke-2 dari tangga nada mayor (1-2-♭3-4-5-6-♭7). Karakter minor dengan nada ke-6 yang terang, favorit di jazz & funk.' },
    es: { name: 'Modo Dórico', desc: '2º modo de la escala mayor (1-2-♭3-4-5-6-♭7). Carácter menor con un 6º grado brillante, favorito en jazz, funk y soul.' },
  },
  sight_reading_phrygian: {
    id: { name: 'Modus Phrygian', desc: 'Modus ke-3 dari tangga nada mayor (1-♭2-♭3-4-5-♭6-♭7). Ciri khas nada ♭2 memberikan ketegangan gelap, khas flamenco.' },
    es: { name: 'Modo Frigio', desc: '3º modo de la escala mayor (1-♭2-♭3-4-5-♭6-♭7). Su 2ª bemol aporta tensión oscura y exótica, habitual en flamenco y metal.' },
  },
  sight_reading_lydian: {
    id: { name: 'Modus Lydian', desc: 'Modus ke-4 dari tangga nada mayor (1-2-3-♯4-5-6-7). Nada ♯4 memberikan nuansa melayang, megah, dan sinematik.' },
    es: { name: 'Modo Lidio', desc: '4º modo de la escala mayor (1-2-3-♯4-5-6-7). La 4ª aumentada produce un efecto etéreo y optimista clásico del cine.' },
  },
  sight_reading_mixolydian: {
    id: { name: 'Modus Mixolydian', desc: 'Modus ke-5 dari tangga nada mayor (1-2-3-4-5-6-♭7). Tangga nada mayor dengan nada ♭7 bernuansa blues & rock.' },
    es: { name: 'Modo Mixolidio', desc: '5º modo de la escala mayor (1-2-3-4-5-6-♭7). Escala mayor con 7ª bemol bluesera, motor armónico del rock y blues.' },
  },
  sight_reading_locrian: {
    id: { name: 'Modus Locrian', desc: 'Modus ke-7 dari tangga nada mayor (1-♭2-♭3-4-♭5-♭6-♭7). Modus dengan kuint berkurang (♭5), sangat tegang dan disonan.' },
    es: { name: 'Modo Locrio', desc: '7º modo de la escala mayor (1-♭2-♭3-4-♭5-♭6-♭7). Su quinta disminuida lo hace inestable y disonante, para experimentación.' },
  },
  major: {
    id: { name: 'Tangga Nada Mayor (Ionian)', desc: 'Tangga nada 7 nada dasar (1-2-3-4-5-6-7). Kunci memahami tanda kunci, interval, dan pembentukan harmoni musik.' },
    es: { name: 'Escala Mayor (Jónico)', desc: 'La escala fundamental de 7 notas (1-2-3-4-5-6-7). Crucial para comprender armaduras, intervalos y toda la armonía.' },
  },
  natural_minor: {
    id: { name: 'Tangga Nada Minor Asli (Aeolian)', desc: 'Tangga nada minor 7 nada (1-2-♭3-4-5-♭6-♭7). Fondasi komposisi kunci minor untuk tema dramatis dan emosional.' },
    es: { name: 'Escala Menor Natural (Eólico)', desc: 'Escala básica de 7 notas (1-2-♭3-4-5-♭6-♭7). Base de composiciones en modo menor y gran expresividad dramática.' },
  },
  harmonic_minor: {
    id: { name: 'Tangga Nada Minor Harmonis', desc: 'Skala minor dengan nada ke-7 dinaikkan (1-2-♭3-4-5-♭6-7). Memungkinkan akor Mayor V untuk resolusi klasik yang kuat.' },
    es: { name: 'Escala Menor Armónica', desc: 'Escala menor con el 7º grado elevado (1-2-♭3-4-5-♭6-7). Permite el acorde Mayor V para resoluciones clásicas potentes.' },
  },
  melodic_minor: {
    id: { name: 'Tangga Nada Minor Melodis', desc: 'Menaikkan nada ke-6 dan ke-7 (1-2-♭3-4-5-6-7). Digunakan luas dalam improvisasi modern untuk alur melodi yang elegan.' },
    es: { name: 'Escala Menor Melódica', desc: 'Cuenta con 6º y 7º grados elevados (1-2-♭3-4-5-6-7). Muy utilizada en improvisación para enlazar acordes con fluidez.' },
  },
  chromatic: {
    id: { name: 'Tangga Nada Kromatik Lengkap', desc: 'Urutan seluruh 12 semitone. Sangat penting untuk melatih kelincahan jari, ketepatan fingering, dan peta tuts piano.' },
    es: { name: 'Escala Cromática Completa', desc: 'Secuencia de los 12 semitonos. Vital para desarrollar agilidad, digitación exacta y mapa mental del teclado.' },
  },
  whole_tone: {
    id: { name: 'Tangga Nada Whole Tone', desc: 'Skala 6 nada dari langkah penuh (1-2-3-♯4-♯5-♭7). Tanpa pusat tonika pasti, menciptakan kualitas melayang yang unik.' },
    es: { name: 'Escala de Tonos Enteros', desc: 'Escala de 6 notas compuesta íntegramente por tonos enteros (1-2-3-♯4-♯5-♭7). Sensación de ingravidez armónica.' },
  },
  major_pentatonic: {
    id: { name: 'Tangga Nada Pentatonik Mayor', desc: 'Skala 5 nada sangat melodis (1-2-3-5-6) tanpa interval disonan. Sempurna untuk menyusun melodi yang indah dan mengalir.' },
    es: { name: 'Escala Pentatónica Mayor', desc: 'Escala melódica de 5 notas (1-2-3-5-6). Sin intervalos disonantes, ideal para melodías placenteras al instante.' },
  },
  dorian: {
    id: { name: 'Modus Dorian Lanjutan', desc: 'Skala minor dengan nada ke-6 mayor (1-2-♭3-4-5-6-♭7). Alternatif minor yang lebih cerah, andalan jazz, fusion, dan pop.' },
    es: { name: 'Modo Dórico Avanzado', desc: 'Escala menor con 6ª mayor (1-2-♭3-4-5-6-♭7). Alternativa más luminosa a la menor natural, pilar del jazz y pop.' },
  },
  phrygian: {
    id: { name: 'Modus Phrygian Lanjutan', desc: 'Skala minor dengan interval ♭2 (1-♭2-♭3-4-5-♭6-♭7). Menghasilkan ketegangan eksotis untuk nuansa misterius dan atmosferik.' },
    es: { name: 'Modo Frigio Avanzado', desc: 'Escala menor con 2ª menor (1-♭2-♭3-4-5-♭6-♭7). Tensión exótica y oscura para pasajes intensos y ambientales.' },
  },
  lydian: {
    id: { name: 'Modus Lydian Lanjutan', desc: 'Skala mayor dengan interval ♯4 (1-2-3-♯4-5-6-7). Karakter melayang dan penuh harapan yang sering digunakan dalam musik film.' },
    es: { name: 'Modo Lidio Avanzado', desc: 'Escala mayor con 4ª aumentada (1-2-3-♯4-5-6-7). Brinda optimismo y elevación, sello distintivo de bandas sonoras.' },
  },
  mixolydian: {
    id: { name: 'Modus Mixolydian Lanjutan', desc: 'Skala mayor dengan interval ♭7 (1-2-3-4-5-6-♭7). Motor harmoni di balik lagu rock, blues, dan country populer.' },
    es: { name: 'Modo Mixolidio Avanzado', desc: 'Escala mayor con 7ª menor (1-2-3-4-5-6-♭7). Motor armónico de innumerables temas de rock, blues y country.' },
  },
  locrian: {
    id: { name: 'Modus Locrian Lanjutan', desc: 'Modus paling disonan (1-♭2-♭3-4-♭5-♭6-♭7). Kuint berkurang membuatnya selalu membutuhkan resolusi harmonis.' },
    es: { name: 'Modo Locrio Avanzado', desc: 'El modo más disonante (1-♭2-♭3-4-♭5-♭6-♭7). Su quinta disminuida exige resolución constante en composición experimental.' },
  },
  major_chord: {
    id: { name: 'Akor Mayor', desc: 'Fondasi paling stabil: Akar, Ters Mayor, Kuint Murni (1-3-5). Terdengar cerah, lengkap, dan pilar utama progresi lagu.' },
    es: { name: 'Acorde Mayor', desc: 'El acorde fundamental: Tónica, 3ª Mayor y 5ª Justa (1-3-5). Sonido brillante y base de la mayoría de canciones.' },
  },
  minor_chord: {
    id: { name: 'Akor Minor', desc: 'Akar, Ters Minor, Kuint Murni (1-♭3-5). Jangkar emosional musik, bernuansa syahdu, serius, dan reflektif.' },
    es: { name: 'Acorde Menor', desc: 'Tónica, 3ª Menor y 5ª Justa (1-♭3-5). Ancla emocional con carácter melancólico, solemne y profundo.' },
  },
  aug_chord: {
    id: { name: 'Akor Augmented', desc: 'Trinitas mayor dengan nada ke-5 dinaikkan (1-3-♯5). Menghasilkan ketegangan terbuka untuk transisi dramatis.' },
    es: { name: 'Acorde Aumentado', desc: 'Tríada mayor con 5ª aumentada (1-3-♯5). Tensión expansiva perfecta para transiciones y suspenso.' },
  },
  major7_chord: {
    id: { name: 'Akor Mayor 7th', desc: 'Trinitas mayor dengan nada ke-7 mayor (1-3-5-7). Karakter hangat, mewah, dan menenangkan (jazz & bossa nova).' },
    es: { name: 'Acorde Mayor con 7ª Mayor', desc: 'Tríada mayor con 7ª mayor (1-3-5-7). Color exuberante y sofisticado indispensable en jazz y soul.' },
  },
  '7_chord': {
    id: { name: 'Akor Dominan 7th', desc: 'Trinitas mayor dengan nada ke-7 minor (1-3-5-♭7). Ketegangan alami yang mendorong resolusi ke akor kuint di bawahnya.' },
    es: { name: 'Acorde Dominante 7', desc: 'Tríada mayor con 7ª menor (1-3-5-♭7). Tensión que pide resolver una quinta abajo, sonido típico del blues.' },
  },
  dim_chord: {
    id: { name: 'Akor Diminished', desc: 'Akar, Ters Minor, Kuint Berkurang (1-♭3-♭5). Sangat tidak stabil dan disonan, efektif sebagai akor jembatan.' },
    es: { name: 'Acorde Disminuido', desc: 'Tónica, 3ª Menor y 5ª Disminuida (1-♭3-♭5). Muy inestable y disonante, usado como acorde de paso dramático.' },
  },
  major_arpeggio: {
    id: { name: 'Arpeggio Mayor', desc: 'Nada-nada akor Mayor (1-3-5) dibunyikan satu per satu. Membangun kekuatan, kelenturan, dan bentuk akor di keyboard.' },
    es: { name: 'Arpegio Mayor', desc: 'Notas de la tríada mayor (1-3-5) tocadas sucesivamente. Desarrolla fuerza digital y fluidez a través del piano.' },
  },
  minor_arpeggio: {
    id: { name: 'Arpeggio Minor', desc: 'Nada-nada akor Minor (1-♭3-5) dibunyikan berurutan. Esensial untuk kecepatan melodi saat solo di tangga nada minor.' },
    es: { name: 'Arpegio Menor', desc: 'Notas de la tríada menor (1-♭3-5) en secuencia. Esencial para la velocidad y precisión melódica en modo menor.' },
  },
  aug_arpeggio: {
    id: { name: 'Arpeggio Augmented', desc: 'Nada berurutan akor Augmented (1-3-♯5). Rentang ters mayor simetris melatih bentangan tangan dan kontrol jari.' },
    es: { name: 'Arpegio Aumentado', desc: 'Notas de tríada aumentada (1-3-♯5). Su estructura simétrica desarrolla apertura de mano y control técnico.' },
  },
  major7_arpeggio: {
    id: { name: 'Arpeggio Mayor 7th', desc: 'Nada-nada akor Mayor 7 (1-3-5-7) dimainkan beruntun. Sempurna untuk menguasai lompatan melodi lebar dan frasa jazz.' },
    es: { name: 'Arpegio Mayor 7', desc: 'Notas del acorde Major 7 (1-3-5-7) en secuencia. Ideal para saltos melódicos amplios y fraseo refinado.' },
  },
  '7_arpeggio': {
    id: { name: 'Arpeggio Dominan 7th', desc: 'Nada berurutan dari akor Dominan 7 (1-3-5-♭7). Latihan fundamental untuk gaya blues, rock, dan improvisasi jazz.' },
    es: { name: 'Arpegio Dominante 7', desc: 'Notas sucesivas del acorde de 7ª dominante (1-3-5-♭7). Ejercicio básico para líneas de blues, rock y jazz.' },
  },
  dim_arpeggio: {
    id: { name: 'Arpeggio Diminished', desc: 'Nada-nada akor Diminished (1-♭3-♭5) berurutan. Struktur simetris sangat baik untuk melatih kecepatan dan akurasi tinggi.' },
    es: { name: 'Arpegio Disminuido', desc: 'Notas de tríada disminuida (1-♭3-♭5). Estructura simétrica excelente para velocidad y precisión extrema.' },
  },
};

export interface PitchNoteItem {
  id: string;
  name: string;
  display: string;
  solfege: string;
  midi: number;
  freq: number;
  wavelengthCm: number;
  color: string;
  isBlack: boolean;
  character: { en: string; id: string; es: string };
  famousWork: string;
}

export const PITCH_NOTES_OCTAVE4: PitchNoteItem[] = [
  { id: 'C', name: 'C', display: 'C', solfege: 'Do', midi: 60, freq: 261.63, wavelengthCm: 131.1, color: '#38bdf8', isBlack: false, character: { en: 'Pure, crisp, stable and foundational', id: 'Murni, jernih, stabil dan mendasar', es: 'Puro, nítido, estable y fundamental' }, famousWork: 'C Major: Mozart Sonata K. 545' },
  { id: 'Db', name: 'Db', display: 'C♯ / D♭', solfege: 'Do♯ / Re♭', midi: 61, freq: 277.18, wavelengthCm: 123.7, color: '#a855f7', isBlack: true, character: { en: 'Dreamy, velvet, romantic and warm', id: 'Melankolis hangat, lembut, dan romantis', es: 'Soñador, aterciopelado y romántico' }, famousWork: 'D♭ Major: Chopin Nocturne Op. 27 No. 2' },
  { id: 'D', name: 'D', display: 'D', solfege: 'Re', midi: 62, freq: 293.66, wavelengthCm: 116.8, color: '#f59e0b', isBlack: false, character: { en: 'Triumphant, radiant, bright and joyful', id: 'Megah, berkilau, cerah dan penuh kemenangan', es: 'Triunfal, radiante, brillante y alegre' }, famousWork: 'D Major: Pachelbel Canon in D' },
  { id: 'Eb', name: 'Eb', display: 'D♯ / E♭', solfege: 'Re♯ / Mi♭', midi: 63, freq: 311.13, wavelengthCm: 110.2, color: '#ec4899', isBlack: true, character: { en: 'Heroic, profound, sovereign and noble', id: 'Heroik, agung, berani dan megah', es: 'Heroico, solemne, profundo y noble' }, famousWork: 'E♭ Major: Beethoven Eroica Symphony' },
  { id: 'E', name: 'E', display: 'E', solfege: 'Mi', midi: 64, freq: 329.63, wavelengthCm: 104.1, color: '#10b981', isBlack: false, character: { en: 'Luminous, celestial, spring-like and joyful', id: 'Bercahaya, hangat, musim semi dan bahagia', es: 'Luminoso, celestial, primaveral y alegre' }, famousWork: 'E Major: Vivaldi Spring Concerto' },
  { id: 'F', name: 'F', display: 'F', solfege: 'Fa', midi: 65, freq: 349.23, wavelengthCm: 98.2, color: '#06b6d4', isBlack: false, character: { en: 'Pastoral, calm, open and soothing', id: 'Pastoral, tenang, sejuk dan alami', es: 'Pastoral, sereno, abierto y relajante' }, famousWork: 'F Major: Beethoven Pastoral Symphony' },
  { id: 'Gb', name: 'Gb', display: 'F♯ / G♭', solfege: 'Fa♯ / Sol♭', midi: 66, freq: 369.99, wavelengthCm: 92.7, color: '#8b5cf6', isBlack: true, character: { en: 'Mystical, shimmering, ethereal and brilliant', id: 'Misterius, gemerlap, magis dan berkilau', es: 'Místico, brillante, etéreo y evocador' }, famousWork: 'G♭ Major: Chopin "Black Key" Etude' },
  { id: 'G', name: 'G', display: 'G', solfege: 'Sol', midi: 67, freq: 392.00, wavelengthCm: 87.5, color: '#eab308', isBlack: false, character: { en: 'Sunlit, rural, festive and optimistic', id: 'Cerah bagai mentari, pesta, dan optimis', es: 'Soleado, campestre, festivo y optimista' }, famousWork: 'G Major: Bach Cello Suite No. 1 Prelude' },
  { id: 'Ab', name: 'Ab', display: 'G♯ / A♭', solfege: 'Sol♯ / La♭', midi: 68, freq: 415.30, wavelengthCm: 82.6, color: '#f43f5e', isBlack: true, character: { en: 'Grave, death-bed, noble and elegiac', id: 'Khusyuk, syahdu, puitis dan mendalam', es: 'Grave, solemne, poético y elegíaco' }, famousWork: 'A♭ Major: Chopin "Heroic" Polonaise' },
  { id: 'A', name: 'A', display: 'A', solfege: 'La (440Hz)', midi: 69, freq: 440.00, wavelengthCm: 78.0, color: '#3b82f6', isBlack: false, character: { en: 'Concert pitch, vibrant, youth and crystal', id: 'Patokan tala konser, murni, muda dan jernih', es: 'Tono de concierto, vibrante, juvenil y cristalino' }, famousWork: 'A Major: Mozart Clarinet Concerto' },
  { id: 'Bb', name: 'Bb', display: 'A♯ / B♭', solfege: 'La♯ / Si♭', midi: 70, freq: 466.16, wavelengthCm: 73.6, color: '#6366f1', isBlack: true, character: { en: 'Magnificent, prosperous, joyful brass sound', id: 'Megah, penuh harapan, semarak instrumen tiup', es: 'Magnífico, próspero, alegre y resonante' }, famousWork: 'B♭ Major: Brahms Piano Concerto No. 2' },
  { id: 'B', name: 'B', display: 'B', solfege: 'Si', midi: 71, freq: 493.88, wavelengthCm: 69.4, color: '#14b8a6', isBlack: false, character: { en: 'Piercing, fierce, passionate yearning', id: 'Tajam, penuh hasrat, berenergi tinggi', es: 'Penetrante, apasionado, brillante y fogoso' }, famousWork: 'B Major: Brahms Piano Trio Op. 8' },
];

export interface EarIntervalItem {
  semitones: number;
  shortCode: string;
  name: { en: string; id: string; es: string };
  ratio: string;
  song: { en: string; id: string; es: string };
  feeling: { en: string; id: string; es: string };
}

export const EAR_INTERVALS: EarIntervalItem[] = [
  { semitones: 1, shortCode: 'm2', name: { en: 'Minor 2nd', id: '2nd Minor', es: '2ª Menor' }, ratio: '16:15', song: { en: 'Jaws Theme / Pink Panther', id: 'Lagu Tema Jaws / Suspense', es: 'Tema de Tiburón (Jaws)' }, feeling: { en: 'Ominous, biting clash', id: 'Mencekam, gigitan disonansi tajam', es: 'Tensión inminente y suspenso' } },
  { semitones: 2, shortCode: 'M2', name: { en: 'Major 2nd', id: '2nd Mayor', es: '2ª Mayor' }, ratio: '9:8', song: { en: 'Happy Birthday / Do-Re-Mi', id: 'Selamat Ulang Tahun / Do-Re', es: 'Cumpleaños Feliz / Do-Re' }, feeling: { en: 'Stepwise rise, hopeful', id: 'Langkah mendaki, cerah', es: 'Paso ascendente natural' } },
  { semitones: 3, shortCode: 'm3', name: { en: 'Minor 3rd', id: '3rd Minor', es: '3ª Menor' }, ratio: '6:5', song: { en: 'Greensleeves / Brahms Lullaby', id: 'Nina Bobo / Brahms Lullaby', es: 'Nana de Brahms / Greensleeves' }, feeling: { en: 'Melancholic, tender', id: 'Syahdu, sedih lembut, menenangkan', es: 'Melancólico y tierno' } },
  { semitones: 4, shortCode: 'M3', name: { en: 'Major 3rd', id: '3rd Mayor', es: '3ª Mayor' }, ratio: '5:4', song: { en: 'When the Saints / Kumbaya', id: 'Burung Kakaktua / When the Saints', es: 'La Primavera (Vivaldi) / The Saints' }, feeling: { en: 'Triumphant triad core', id: 'Pondasi Mayor yang ceria', es: 'Luminoso, triunfal y resuelto' } },
  { semitones: 5, shortCode: 'P4', name: { en: 'Perfect 4th', id: 'Kuart Murni (P4)', es: '4ª Justa (P4)' }, ratio: '4:3', song: { en: 'Here Comes the Bride / Amazing Grace', id: 'Indonesia Pusaka / Mars Pengantin', es: 'Marcha Nupcial / Amazing Grace' }, feeling: { en: 'Noble, heraldic announcement', id: 'Megah, lantang, panggilan ksatria', es: 'Solemne, heráldico y ceremonial' } },
  { semitones: 6, shortCode: 'TT', name: { en: 'Tritone (dim5 / aug4)', id: 'Triton (Disonan Ekstrem)', es: 'Tritono (dim5 / aug4)' }, ratio: '45:32 (√2)', song: { en: 'The Simpsons / Maria (West Side Story)', id: 'Lagu Tema The Simpsons / Maria', es: 'Tema de Los Simpson / Maria' }, feeling: { en: 'Demonic suspense, diabolus in musica', id: 'Tegangan maksimal menuntut resolusi', es: 'Inquietante, disonante y misterioso' } },
  { semitones: 7, shortCode: 'P5', name: { en: 'Perfect 5th', id: 'Kuint Murni (P5)', es: '5ª Justa (P5)' }, ratio: '3:2', song: { en: 'Star Wars Theme / Twinkle Twinkle', id: 'Bintang Kecil / Star Wars Main Theme', es: 'Estrellita / Star Wars' }, feeling: { en: 'Hollow, cosmic, crystal stability', id: 'Kuat, stabil, kosmis tanpa ragu', es: 'Poderoso, cósmico y de máxima consonancia' } },
  { semitones: 8, shortCode: 'm6', name: { en: 'Minor 6th', id: '6th Minor', es: '6ª Menor' }, ratio: '8:5', song: { en: 'The Entertainer / Love Story', id: 'Love Story / Melodi Nostalgia', es: 'Historia de Amor / The Entertainer' }, feeling: { en: 'Romantic longing, weeping', id: 'Kerinduan romantis mendalam', es: 'Anhelo apasionado y nostalgia' } },
  { semitones: 9, shortCode: 'M6', name: { en: 'Major 6th', id: '6th Mayor', es: '6ª Mayor' }, ratio: '5:3', song: { en: 'NBC Chimes / My Bonnie', id: 'Jingle Nada NBC / My Bonnie', es: 'Jingle NBC / My Bonnie' }, feeling: { en: 'Warm pastoral embrace', id: 'Hangat, riang, bersahabat', es: 'Cálido, alegre y reconfortante' } },
  { semitones: 10, shortCode: 'm7', name: { en: 'Minor 7th', id: '7th Minor', es: '7ª Menor' }, ratio: '16:9', song: { en: 'Somewhere (West Side Story) / Star Trek', id: 'Somewhere / Tema Star Trek', es: 'Somewhere / Star Trek' }, feeling: { en: 'Blues tension, yearning leap', id: 'Nuansa blues, loncatan rindu', es: 'Tensión de blues y apertura hacia la octava' } },
  { semitones: 11, shortCode: 'M7', name: { en: 'Major 7th', id: '7th Mayor', es: '7ª Mayor' }, ratio: '15:8', song: { en: 'Take On Me / Don\'t Know Why', id: 'Take On Me (A-ha) / Jazz Leading', es: 'Take On Me (A-ha) / Acordes Jazz' }, feeling: { en: 'Intensely romantic leading tone', id: 'Sangat romantis, magnet menuju oktaf', es: 'Sensible, jazzero y ardientemente suspendido' } },
  { semitones: 12, shortCode: 'P8', name: { en: 'Perfect Octave', id: 'Oktaf Murni (P8)', es: 'Octava Justa (P8)' }, ratio: '2:1', song: { en: 'Over the Rainbow / Singin\' in the Rain', id: 'Over the Rainbow / Nada Kembar', es: 'Over the Rainbow' }, feeling: { en: 'Complete harmonic closure, twin resonance', id: 'Resolusi mutlak, nada kembar sempurna', es: 'Identidad tonal perfecta y plenitud' } },
];

const MIDI_TO_SAMPLE_NAME: Record<number, string> = {};
const SAMPLE_BASE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
for (let midi = 21; midi <= 108; midi++) {
  const octave = Math.floor(midi / 12) - 1;
  const noteName = SAMPLE_BASE_NAMES[midi % 12];
  MIDI_TO_SAMPLE_NAME[midi] = `${noteName}${octave}`;
}

export interface EarChordItem {
  id: string;
  symbol: string;
  name: { en: string; id: string; es: string };
  intervals: number[];
  formula: string;
  feeling: { en: string; id: string; es: string };
}

export const EAR_CHORDS: EarChordItem[] = [
  { id: 'major', symbol: 'Maj', name: { en: 'Major Triad', id: 'Triad Mayor', es: 'Tríada Mayor' }, intervals: [0, 4, 7], formula: '1 - 3 - 5', feeling: { en: 'Bright, stable, triumphant', id: 'Cerah, stabil, megah & gembira', es: 'Brillante, alegre y estable' } },
  { id: 'minor', symbol: 'min', name: { en: 'Minor Triad', id: 'Triad Minor', es: 'Tríada Menor' }, intervals: [0, 3, 7], formula: '1 - ♭3 - 5', feeling: { en: 'Melancholic, sad, deep', id: 'Syahdu, sedih, emosional', es: 'Melancólico, triste y profundo' } },
  { id: 'dim', symbol: 'dim', name: { en: 'Diminished', id: 'Akor Diminished', es: 'Disminuido' }, intervals: [0, 3, 6], formula: '1 - ♭3 - ♭5', feeling: { en: 'Tense, suspenseful, horror', id: 'Sangat tegang, misterius & disonan', es: 'Tenso, inestable y dramático' } },
  { id: 'aug', symbol: 'aug', name: { en: 'Augmented', id: 'Akor Augmented', es: 'Aumentado' }, intervals: [0, 4, 8], formula: '1 - 3 - ♯5', feeling: { en: 'Dreamy, surreal, floating', id: 'Mengambang, mimpi, surealis', es: 'Soñador, flotante y etéreo' } },
  { id: 'sus4', symbol: 'sus4', name: { en: 'Suspended 4th', id: 'Akor Sus4', es: 'Suspendido 4' }, intervals: [0, 5, 7], formula: '1 - 4 - 5', feeling: { en: 'Open, unresolved, yearning', id: 'Terbuka, menggantung, rindu', es: 'Abierto, suspendido y expectante' } },
  { id: 'sus2', symbol: 'sus2', name: { en: 'Suspended 2nd', id: 'Akor Sus2', es: 'Suspendido 2' }, intervals: [0, 2, 7], formula: '1 - 2 - 5', feeling: { en: 'Airy, modern, expansive', id: 'Lapang, modern, mengalun', es: 'Etéreo, moderno y abierto' } },
  { id: 'dom7', symbol: '7', name: { en: 'Dominant 7th', id: 'Dominan 7th', es: 'Séptima Dominante' }, intervals: [0, 4, 7, 10], formula: '1 - 3 - 5 - ♭7', feeling: { en: 'Bluesy, energetic cadence', id: 'Blues, funk, tensi jazz', es: 'Bluesero, dinámico y con tensión' } },
  { id: 'maj7', symbol: 'maj7', name: { en: 'Major 7th', id: 'Mayor 7th (maj7)', es: 'Séptima Mayor' }, intervals: [0, 4, 7, 11], formula: '1 - 3 - 5 - 7', feeling: { en: 'Smooth, lush, nostalgic jazz', id: 'Manis, santai, jazzy elegan', es: 'Cálido, elegante y nostálgico' } },
  { id: 'min7', symbol: 'm7', name: { en: 'Minor 7th', id: 'Minor 7th (m7)', es: 'Séptima Menor' }, intervals: [0, 3, 7, 10], formula: '1 - ♭3 - 5 - ♭7', feeling: { en: 'Mellow, neo-soul, lo-fi', id: 'Hangat, lembut, neo-soul', es: 'Suave, intimista y neo-soul' } },
  { id: 'm7b5', symbol: 'ø7 / m7♭5', name: { en: 'Half-Diminished', id: 'Half-Diminished (m7♭5)', es: 'Semidisminuido' }, intervals: [0, 3, 6, 10], formula: '1 - ♭3 - ♭5 - ♭7', feeling: { en: 'Tragic, jazz minor cadence', id: 'Tragis, kadens jazz minor', es: 'Trágico, misterioso y jazzístico' } },
  { id: 'dim7', symbol: '°7 / dim7', name: { en: 'Diminished 7th', id: 'Diminished 7th (°7)', es: 'Séptima Disminuida' }, intervals: [0, 3, 6, 9], formula: '1 - ♭3 - ♭5 - 𝄫7', feeling: { en: 'Dramatic tension, suspense', id: 'Ketegangan klimaks, dramatis', es: 'Tensión dramática y suspenso' } },
  { id: 'maj6', symbol: '6', name: { en: 'Major 6th', id: 'Mayor 6th (Maj6)', es: 'Sexta Mayor' }, intervals: [0, 4, 7, 9], formula: '1 - 3 - 5 - 6', feeling: { en: 'Sweet vintage swing, cozy', id: 'Vintage swing klasik, manis', es: 'Dulce, retro y swing clásico' } },
];

export interface EarScaleOption {
  id: string;
  name: { en: string; id: string; es: string };
  accidentals: string;
  rootPitchClass: number;
  pitchClasses: number[];
}

export const EAR_SCALES: EarScaleOption[] = [
  // 12 Major Scales
  { id: 'c_maj', name: { en: 'C Major', id: 'C Mayor', es: 'Do Mayor' }, accidentals: 'Natural (0♯/0♭)', rootPitchClass: 0, pitchClasses: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'g_maj', name: { en: 'G Major (1♯)', id: 'G Mayor (1♯)', es: 'Sol Mayor (1♯)' }, accidentals: '1♯ (F♯)', rootPitchClass: 7, pitchClasses: [7, 9, 11, 0, 2, 4, 6] },
  { id: 'd_maj', name: { en: 'D Major (2♯)', id: 'D Mayor (2♯)', es: 'Re Mayor (2♯)' }, accidentals: '2♯ (F♯, C♯)', rootPitchClass: 2, pitchClasses: [2, 4, 6, 7, 9, 11, 1] },
  { id: 'a_maj', name: { en: 'A Major (3♯)', id: 'A Mayor (3♯)', es: 'La Mayor (3♯)' }, accidentals: '3♯ (F♯, C♯, G♯)', rootPitchClass: 9, pitchClasses: [9, 11, 1, 2, 4, 6, 8] },
  { id: 'e_maj', name: { en: 'E Major (4♯)', id: 'E Mayor (4♯)', es: 'Mi Mayor (4♯)' }, accidentals: '4♯ (F♯, C♯, G♯, D♯)', rootPitchClass: 4, pitchClasses: [4, 6, 8, 9, 11, 1, 3] },
  { id: 'b_maj', name: { en: 'B Major (5♯)', id: 'B Mayor (5♯)', es: 'Si Mayor (5♯)' }, accidentals: '5♯ (F♯, C♯, G♯, D♯, A♯)', rootPitchClass: 11, pitchClasses: [11, 1, 3, 4, 6, 8, 10] },
  { id: 'fs_maj', name: { en: 'F♯ Major (6♯)', id: 'F♯ Mayor (6♯)', es: 'Fa♯ Mayor (6♯)' }, accidentals: '6♯ (F♯, C♯, G♯, D♯, A♯, E♯)', rootPitchClass: 6, pitchClasses: [6, 8, 10, 11, 1, 3, 5] },
  { id: 'db_maj', name: { en: 'D♭ Major (5♭)', id: 'D♭ Mayor (5♭)', es: 'Re♭ Mayor (5♭)' }, accidentals: '5♭ (B♭, E♭, A♭, D♭, G♭)', rootPitchClass: 1, pitchClasses: [1, 3, 5, 6, 8, 10, 0] },
  { id: 'ab_maj', name: { en: 'A♭ Major (4♭)', id: 'A♭ Mayor (4♭)', es: 'La♭ Mayor (4♭)' }, accidentals: '4♭ (B♭, E♭, A♭, D♭)', rootPitchClass: 8, pitchClasses: [8, 10, 0, 1, 3, 5, 7] },
  { id: 'eb_maj', name: { en: 'E♭ Major (3♭)', id: 'E♭ Mayor (3♭)', es: 'Mi♭ Mayor (3♭)' }, accidentals: '3♭ (B♭, E♭, A♭)', rootPitchClass: 3, pitchClasses: [3, 5, 7, 8, 10, 0, 2] },
  { id: 'bb_maj', name: { en: 'B♭ Major (2♭)', id: 'B♭ Mayor (2♭)', es: 'Si♭ Mayor (2♭)' }, accidentals: '2♭ (B♭, E♭)', rootPitchClass: 10, pitchClasses: [10, 0, 2, 3, 5, 7, 9] },
  { id: 'f_maj', name: { en: 'F Major (1♭)', id: 'F Mayor (1♭)', es: 'Fa Mayor (1♭)' }, accidentals: '1♭ (B♭)', rootPitchClass: 5, pitchClasses: [5, 7, 9, 10, 0, 2, 4] },
  // 12 Minor Scales
  { id: 'a_min', name: { en: 'A Minor', id: 'A Minor', es: 'La Menor' }, accidentals: 'Natural (0♯/0♭)', rootPitchClass: 9, pitchClasses: [9, 11, 0, 2, 4, 5, 7] },
  { id: 'e_min', name: { en: 'E Minor (1♯)', id: 'E Minor (1♯)', es: 'Mi Menor (1♯)' }, accidentals: '1♯ (F♯)', rootPitchClass: 4, pitchClasses: [4, 6, 7, 9, 11, 0, 2] },
  { id: 'b_min', name: { en: 'B Minor (2♯)', id: 'B Minor (2♯)', es: 'Si Menor (2♯)' }, accidentals: '2♯ (F♯, C♯)', rootPitchClass: 11, pitchClasses: [11, 1, 2, 4, 6, 7, 9] },
  { id: 'fs_min', name: { en: 'F♯ Minor (3♯)', id: 'F♯ Minor (3♯)', es: 'Fa♯ Menor (3♯)' }, accidentals: '3♯ (F♯, C♯, G♯)', rootPitchClass: 6, pitchClasses: [6, 8, 9, 11, 1, 2, 4] },
  { id: 'cs_min', name: { en: 'C♯ Minor (4♯)', id: 'C♯ Minor (4♯)', es: 'Do♯ Menor (4♯)' }, accidentals: '4♯ (F♯, C♯, G♯, D♯)', rootPitchClass: 1, pitchClasses: [1, 3, 4, 6, 8, 9, 11] },
  { id: 'gs_min', name: { en: 'G♯ Minor (5♯)', id: 'G♯ Minor (5♯)', es: 'Sol♯ Menor (5♯)' }, accidentals: '5♯ (F♯, C♯, G♯, D♯, A♯)', rootPitchClass: 8, pitchClasses: [8, 10, 11, 1, 3, 4, 6] },
  { id: 'ds_min', name: { en: 'D♯ Minor (6♯)', id: 'D♯ Minor (6♯)', es: 'Re♯ Menor (6♯)' }, accidentals: '6♯ (F♯, C♯, G♯, D♯, A♯, E♯)', rootPitchClass: 3, pitchClasses: [3, 5, 6, 8, 10, 11, 1] },
  { id: 'bb_min', name: { en: 'B♭ Minor (5♭)', id: 'B♭ Minor (5♭)', es: 'Si♭ Menor (5♭)' }, accidentals: '5♭ (B♭, E♭, A♭, D♭, G♭)', rootPitchClass: 10, pitchClasses: [10, 0, 1, 3, 5, 6, 8] },
  { id: 'f_min', name: { en: 'F Minor (4♭)', id: 'F Minor (4♭)', es: 'Fa Menor (4♭)' }, accidentals: '4♭ (B♭, E♭, A♭, D♭)', rootPitchClass: 5, pitchClasses: [5, 7, 8, 10, 0, 1, 3] },
  { id: 'c_min', name: { en: 'C Minor (3♭)', id: 'C Minor (3♭)', es: 'Do Menor (3♭)' }, accidentals: '3♭ (B♭, E♭, A♭)', rootPitchClass: 0, pitchClasses: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'g_min', name: { en: 'G Minor (2♭)', id: 'G Minor (2♭)', es: 'Sol Menor (2♭)' }, accidentals: '2♭ (B♭, E♭)', rootPitchClass: 7, pitchClasses: [7, 9, 10, 0, 2, 3, 5] },
  { id: 'd_min', name: { en: 'D Minor (1♭)', id: 'D Minor (1♭)', es: 'Re Menor (1♭)' }, accidentals: '1♭ (B♭)', rootPitchClass: 2, pitchClasses: [2, 4, 5, 7, 9, 10, 0] },
];

export const ROOT_KEY_CHOICES: { pitchClass: number; display: string }[] = [
  { pitchClass: 0, display: 'C' },
  { pitchClass: 1, display: 'C♯ / D♭' },
  { pitchClass: 2, display: 'D' },
  { pitchClass: 3, display: 'D♯ / E♭' },
  { pitchClass: 4, display: 'E' },
  { pitchClass: 5, display: 'F' },
  { pitchClass: 6, display: 'F♯ / G♭' },
  { pitchClass: 7, display: 'G' },
  { pitchClass: 8, display: 'G♯ / A♭' },
  { pitchClass: 9, display: 'A' },
  { pitchClass: 10, display: 'A♯ / B♭' },
  { pitchClass: 11, display: 'B' },
];

export const getIntervalTargetName = (rootPc: number, semitones: number): string => {
  const targetPc = (rootPc + semitones) % 12;
  const flatNames = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const sharpNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const preferFlats = [1, 3, 6, 8, 10].includes(semitones) || [1, 3, 5, 8, 10].includes(rootPc);
  return preferFlats ? flatNames[targetPc] : sharpNames[targetPc];
};

export const getEarRootName = (rootPc: number): string => {
  const flatRoots: Record<number, string> = { 0: 'C', 1: 'D♭', 2: 'D', 3: 'E♭', 4: 'E', 5: 'F', 6: 'G♭', 7: 'G', 8: 'A♭', 9: 'A', 10: 'B♭', 11: 'B' };
  const sharpRoots: Record<number, string> = { 0: 'C', 1: 'C♯', 2: 'D', 3: 'D♯', 4: 'E', 5: 'F', 6: 'F♯', 7: 'G', 8: 'G♯', 9: 'A', 10: 'A♯', 11: 'B' };
  return [1, 3, 8, 10].includes(rootPc) ? flatRoots[rootPc] : sharpRoots[rootPc];
};

export const getChordNotesSpelling = (rootPc: number, intervals: number[]): string => {
  const flatNames = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const sharpNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return intervals.map(inv => {
    const pc = (rootPc + inv) % 12;
    const isFlat = [1, 3, 6, 8, 10].includes(inv) || [1, 3, 8, 10].includes(rootPc);
    return isFlat ? flatNames[pc] : sharpNames[pc];
  }).join(' • ');
};

export const MiniPianoKeys: React.FC<{
  activePitches: number[];
  highlightColor?: string;
  width?: number;
  height?: number;
  className?: string;
}> = ({
  activePitches,
  highlightColor = '#a855f7',
  width = 68,
  height = 24,
  className = '',
}) => {
  const whiteKeyPitches = [0, 2, 4, 5, 7, 9, 11];
  const kw = width / 7;
  const bw = kw * 0.65;
  const bh = height * 0.6;

  const blackKeys = [
    { pitch: 1, x: 1 * kw - bw / 2 },
    { pitch: 3, x: 2 * kw - bw / 2 },
    { pitch: 6, x: 4 * kw - bw / 2 },
    { pitch: 8, x: 5 * kw - bw / 2 },
    { pitch: 10, x: 6 * kw - bw / 2 },
  ];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`rounded overflow-hidden select-none ${className}`}
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
    >
      <rect x="0" y="0" width={width} height={height} rx="2" fill="#090d16" />
      {whiteKeyPitches.map((pitch, idx) => {
        const isActive = activePitches.includes(pitch);
        const x = idx * kw;
        return (
          <rect
            key={pitch}
            x={x + 0.4}
            y="0.4"
            width={kw - 0.8}
            height={height - 0.8}
            rx="1"
            fill={isActive ? highlightColor : '#e2e8f0'}
            stroke={isActive ? '#ffffff' : '#94a3b8'}
            strokeWidth={isActive ? '1.2' : '0.5'}
          />
        );
      })}
      {blackKeys.map((bk) => {
        const isActive = activePitches.includes(bk.pitch);
        return (
          <rect
            key={bk.pitch}
            x={bk.x}
            y="0.4"
            width={bw}
            height={bh}
            rx="0.8"
            fill={isActive ? highlightColor : '#0f172a'}
            stroke={isActive ? '#ffffff' : '#334155'}
            strokeWidth={isActive ? '1.2' : '0.5'}
          />
        );
      })}
    </svg>
  );
};


export const LearnArticleView: React.FC<LearnArticleViewProps> = ({
  onBackToMainMenu,
  onLaunchInGamePractice,
  onLaunchCustomExercise,
  onOpenMidiEditor,
  isModal = false,
  onCloseModal,
  appLanguage = 'en',
}) => {
  const [activeChapter, setActiveChapter] = useState<ChapterId>('sheet');
  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [activeCircleKeyIndex, setActiveCircleKeyIndex] = useState<number>(0);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const articleScrollRef = useRef<HTMLElement>(null);

  const isId = appLanguage === 'id';
  const isEs = appLanguage === 'es';
  const t = getLearnTranslations(appLanguage);
  const L = (en: string, id: string, es: string) => (isId ? id : isEs ? es : en);
  const wrap2 = (s: string, n: number): [string, string] => {
    if (s.length <= n) return [s, ''];
    const i = s.lastIndexOf(' ', n);
    return [s.slice(0, i), s.slice(i + 1)];
  };
  const FN_ID: Record<string, string> = { Thumb: 'Jempol', Index: 'Telunjuk', Middle: 'Tengah', Ring: 'Manis', Pinky: 'Kelingking' };
  const FN_ES: Record<string, string> = { Thumb: 'Pulgar', Index: 'Índice', Middle: 'Medio', Ring: 'Anular', Pinky: 'Meñique' };
  const fingerName = (n: string) => L(n, FN_ID[n] ?? n, FN_ES[n] ?? n);

  const chapters: { id: ChapterId; num: string; step: number; label: string; sub: string; badge: string }[] = isId ? [
    { id: 'sheet', num: '01', step: 1, label: 'Notasi Balok & Grand Staff', sub: 'Paranada, Kunci, Ritme & Ornamen', badge: 'NOTASI' },
    { id: 'falling', num: '02', step: 2, label: 'Falling Notes & Mode Tunggu', sub: 'Piano Roll, Hit Windows & Kalibrasi', badge: 'ENGINE' },
    { id: 'fingering', num: '03', step: 3, label: 'Biomekanika & Teknik Piano', sub: 'Postur, Teknik 3 Pedal & Tabel Jari', badge: 'TEKNIK' },
    { id: 'roblox', num: '04', step: 4, label: 'Keyboard PC & Virtual Piano', sub: 'Peta 61-Tuts MIRP, Compact & NKRO', badge: 'QWERTY' },
    { id: 'theory', num: '05', step: 5, label: 'Teori Harmoni & Voice Leading', sub: 'Interval, Inversi, Modus & Lingkaran Kuint', badge: 'TEORI' },
    { id: 'exercises', num: '06', step: 6, label: 'Drill Teknis & Kurikulum Latihan', sub: 'Generator Latihan 12 Kunci & Etude', badge: 'PRAKTIK' },
    { id: 'perfectpitch', num: '07', step: 7, label: 'Pelatihan Perfect Pitch & Telinga', sub: 'Pengenalan Nada Absolut, Uji Telinga & Interval', badge: 'EAR' },
    { id: 'midieditor', num: '08', step: 8, label: 'Editor MIDI & Sekuenser', sub: 'Piano Roll, Kuantisasi & Velocity', badge: 'PRODUKSI' },
    { id: 'videos', num: '09', step: 9, label: 'Referensi Video & Studi Kasus', sub: 'Kurasi Masterclass & Intisari Materi', badge: 'VIDEO' },
  ] : isEs ? [
    { id: 'sheet', num: '01', step: 1, label: 'Partituras y Gran Pentagrama', sub: 'Claves, Ritmo, Articulación y Ornamentos', badge: 'NOTACIÓN' },
    { id: 'falling', num: '02', step: 2, label: 'Notas Cayendo y Modo Espera', sub: 'Piano Roll, Ventana de Impacto y Sincronización', badge: 'MOTOR' },
    { id: 'fingering', num: '03', step: 3, label: 'Biomecánica y Técnica', sub: 'Postura, Pedales de Resonancia y Digitación', badge: 'TÉCNICA' },
    { id: 'roblox', num: '04', step: 4, label: 'Teclado PC y Piano Virtual', sub: 'Mapa MIRP de 61 Teclas, Compact y NKRO', badge: 'QWERTY' },
    { id: 'theory', num: '05', step: 5, label: 'Teoría Armónica y Conducción', sub: 'Intervalos, Inversiones, Modos y Quintas', badge: 'TEORÍA' },
    { id: 'exercises', num: '06', step: 6, label: 'Ejercicios Técnicos y Rutina', sub: 'Generador en 12 Tonalidades y Estudios', badge: 'PRÁCTICA' },
    { id: 'perfectpitch', num: '07', step: 7, label: 'Entrenamiento de Oído Absoluto', sub: 'Reconocimiento de Tono, Test Auditivo e Intervalos', badge: 'OÍDO' },
    { id: 'midieditor', num: '08', step: 8, label: 'Editor MIDI y Secuenciador', sub: 'Piano Roll, Cuantización y Velocidad', badge: 'PRODUCCIÓN' },
    { id: 'videos', num: '09', step: 9, label: 'Videoteca y Guía de Estudio', sub: 'Clases Magistrales y Puntos Clave', badge: 'VIDEO' },
  ] : [
    { id: 'sheet', num: '01', step: 1, label: 'Sheet Music & Grand Staff', sub: 'Clefs, Rhythm, Ornaments & Form', badge: 'NOTATION' },
    { id: 'falling', num: '02', step: 2, label: 'Falling Notes & Wait Mode', sub: 'Piano Roll, Hit Windows & Sync Engine', badge: 'ENGINE' },
    { id: 'fingering', num: '03', step: 3, label: 'Biomechanics & Technique', sub: 'Posture, 3-Pedal Dynamics & Finger Tables', badge: 'TECHNIQUE' },
    { id: 'roblox', num: '04', step: 4, label: 'PC Keyboard & Virtual Piano', sub: '61-Key MIRP Map, Compact & NKRO', badge: 'QWERTY' },
    { id: 'theory', num: '05', step: 5, label: 'Harmonic Theory & Voicing', sub: 'Intervals, Inversions, Modes & 5ths', badge: 'THEORY' },
    { id: 'exercises', num: '06', step: 6, label: 'Technical Drills & Etudes', sub: '12-Key Drill Generator & Daily Routine', badge: 'DRILLS' },
    { id: 'perfectpitch', num: '07', step: 7, label: 'Perfect Pitch & Ear Training', sub: 'Absolute Pitch Recognition, Audio Quiz & Intervals', badge: 'EAR' },
    { id: 'midieditor', num: '08', step: 8, label: 'MIDI Editor & Sequencer', sub: 'Piano Roll, Quantization & Velocity', badge: 'PRODUCTION' },
    { id: 'videos', num: '09', step: 9, label: 'Video Reference Library', sub: 'Curated Masterclasses & Study Notes', badge: 'VIDEO' },
  ];

  const currentIndex = chapters.findIndex((c) => c.id === activeChapter);
  const currentChapter = chapters[currentIndex] || chapters[0];
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
  const progressPct = Math.round(((currentIndex + 1) / chapters.length) * 100);

  const handleSelectChapter = (chId: ChapterId) => {
    setActiveChapter(chId);
    if (articleScrollRef.current) {
      articleScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Perfect Pitch Training Engine State
  const earAudioCtxRef = useRef<AudioContext | null>(null);
  const earMasterGainRef = useRef<GainNode | null>(null);
  const earCompressorRef = useRef<DynamicsCompressorNode | null>(null);
  const earSampleCacheRef = useRef<Map<number, AudioBuffer>>(new Map());
  const earPlaybackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [earTrainingMode, setEarTrainingMode] = useState<'pitch' | 'interval' | 'chord'>('pitch');
  const [earPitchDifficulty, setEarPitchDifficulty] = useState<'white' | 'chromatic' | 'wide'>('white');
  const [earScaleSetting, setEarScaleSetting] = useState<'all' | 'random' | string>('all');
  const [earActiveScaleId, setEarActiveScaleId] = useState<string | null>(null);
  const [earRootKeySetting, setEarRootKeySetting] = useState<'random' | number>('random');
  const [currentQuizMidi, setCurrentQuizMidi] = useState<number | null>(null);
  const [currentQuizInterval, setCurrentQuizInterval] = useState<{ rootMidi: number; rootPc: number; rootName: string; semitones: number } | null>(null);
  const [currentQuizChord, setCurrentQuizChord] = useState<{ rootMidi: number; rootPc: number; rootName: string; chord: EarChordItem } | null>(null);
  const [earChoiceRootMode, setEarChoiceRootMode] = useState<'fixed' | 'mixed'>('mixed');
  const [quizIntervalChoices, setQuizIntervalChoices] = useState<{ id: string; rootPc: number; rootName: string; targetName: string; interval: EarIntervalItem; isCorrect: boolean }[]>([]);
  const [quizChordChoices, setQuizChordChoices] = useState<{ id: string; rootPc: number; rootName: string; chord: EarChordItem; isCorrect: boolean }[]>([]);
  const [isAudioTonePlaying, setIsAudioTonePlaying] = useState<boolean>(false);
  const [earQuizAnswered, setEarQuizAnswered] = useState<boolean>(false);
  const [lastGuessedValue, setLastGuessedValue] = useState<string | null>(null);
  const [isLastGuessCorrect, setIsLastGuessCorrect] = useState<boolean | null>(null);
  const [earStreak, setEarStreak] = useState<number>(0);
  const [earBestStreak, setEarBestStreak] = useState<number>(0);
  const [earTotalGuessed, setEarTotalGuessed] = useState<number>(0);
  const [earCorrectGuessed, setEarCorrectGuessed] = useState<number>(0);
  const [earHeatmapStats, setEarHeatmapStats] = useState<Record<string, { total: number; correct: number }>>({});
  const [earAutoAdvance, setEarAutoAdvance] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (earPlaybackTimerRef.current) {
        clearTimeout(earPlaybackTimerRef.current);
        earPlaybackTimerRef.current = null;
      }
      if (earAudioCtxRef.current && earAudioCtxRef.current.state !== 'closed') {
        earAudioCtxRef.current.close().catch(() => {});
        earAudioCtxRef.current = null;
      }
    };
  }, []);

  const getEarAudioContext = useCallback(() => {
    if (!earAudioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        earAudioCtxRef.current = ctx;

        // Limiter/compressor to avoid distortion on high volume
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-8, ctx.currentTime);
        comp.knee.setValueAtTime(6, ctx.currentTime);
        comp.ratio.setValueAtTime(5, ctx.currentTime);
        comp.attack.setValueAtTime(0.002, ctx.currentTime);
        comp.release.setValueAtTime(0.2, ctx.currentTime);

        // Dedicated boosted master gain node (always loud & clear)
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(1.4, ctx.currentTime);

        masterGain.connect(comp);
        comp.connect(ctx.destination);

        earMasterGainRef.current = masterGain;
        earCompressorRef.current = comp;
      }
    }
    return earAudioCtxRef.current;
  }, []);

  const setEarAudioPlayingFor = useCallback((durationSec: number) => {
    setIsAudioTonePlaying(true);
    if (earPlaybackTimerRef.current) {
      clearTimeout(earPlaybackTimerRef.current);
    }
    earPlaybackTimerRef.current = setTimeout(() => {
      setIsAudioTonePlaying(false);
      earPlaybackTimerRef.current = null;
    }, durationSec * 1000);
  }, []);

  // Preload real piano MP3 samples eagerly for instantaneous high-quality acoustic piano playback
  const preloadEarPianoSamples = useCallback(async () => {
    const ctx = getEarAudioContext();
    if (!ctx) return;
    const priorityMidis = [60, 62, 64, 65, 67, 69, 71, 61, 63, 66, 68, 70];
    const otherMidis: number[] = [];
    for (let m = 48; m <= 83; m++) {
      if (!priorityMidis.includes(m)) otherMidis.push(m);
    }

    const loadSample = async (midi: number) => {
      if (earSampleCacheRef.current.has(midi)) return;
      const name = MIDI_TO_SAMPLE_NAME[midi];
      if (!name) return;
      try {
        const resp = await fetch(`/sounds/piano/${name}.mp3`);
        if (resp.ok) {
          const ab = await resp.arrayBuffer();
          const buf = await ctx.decodeAudioData(ab);
          earSampleCacheRef.current.set(midi, buf);
        }
      } catch {
        // ignore
      }
    };

    await Promise.all(priorityMidis.map(loadSample));
    void Promise.all(otherMidis.map(loadSample));
  }, [getEarAudioContext]);

  useEffect(() => {
    if (activeChapter === 'perfectpitch') {
      void preloadEarPianoSamples();
    }
  }, [activeChapter, preloadEarPianoSamples]);

  const playEarNoteSound = useCallback(async (midi: number, durationSec = 2.0, delaySec = 0, shouldManagePlayingState = true) => {
    try {
      const ctx = getEarAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (shouldManagePlayingState) {
        setEarAudioPlayingFor(delaySec + durationSec);
      }
      const startTime = ctx.currentTime + delaySec;
      const masterNode = earMasterGainRef.current || ctx.destination;

      const sampleName = MIDI_TO_SAMPLE_NAME[midi];
      let buffer = earSampleCacheRef.current.get(midi);
      if (!buffer && sampleName) {
        try {
          const resp = await fetch(`/sounds/piano/${sampleName}.mp3`);
          if (resp.ok) {
            const ab = await resp.arrayBuffer();
            buffer = await ctx.decodeAudioData(ab);
            earSampleCacheRef.current.set(midi, buffer);
          }
        } catch (e) {
          // fallback to acoustic synth below
        }
      }

      if (buffer) {
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buffer;
        // Strong, full piano sample playback
        gain.gain.setValueAtTime(1.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
        src.connect(gain);
        gain.connect(masterNode);
        src.start(startTime);
        src.stop(startTime + durationSec + 0.05);
      } else {
        // Multi-harmonic warm acoustic piano simulation fallback
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        const osc4 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, startTime);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, startTime);
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(freq * 3, startTime);
        osc4.type = 'sine';
        osc4.frequency.setValueAtTime(freq * 4, startTime);

        const g1 = ctx.createGain(); g1.gain.value = 0.85;
        const g2 = ctx.createGain(); g2.gain.value = 0.5;
        const g3 = ctx.createGain(); g3.gain.value = 0.25;
        const g4 = ctx.createGain(); g4.gain.value = 0.12;

        osc1.connect(g1); g1.connect(gain);
        osc2.connect(g2); g2.connect(gain);
        osc3.connect(g3); g3.connect(gain);
        osc4.connect(g4); g4.connect(gain);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(1.25, startTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

        gain.connect(masterNode);

        osc1.start(startTime); osc2.start(startTime); osc3.start(startTime); osc4.start(startTime);
        osc1.stop(startTime + durationSec); osc2.stop(startTime + durationSec);
        osc3.stop(startTime + durationSec); osc4.stop(startTime + durationSec);
      }
    } catch (err) {
      console.warn('Ear tone audio error:', err);
      setIsAudioTonePlaying(false);
    }
  }, [getEarAudioContext, setEarAudioPlayingFor]);

  const playEarIntervalSound = useCallback(async (rootMidi: number, semitones: number) => {
    setEarAudioPlayingFor(2.5);
    // Play simultaneously together directly
    void playEarNoteSound(rootMidi, 2.3, 0, false);
    void playEarNoteSound(rootMidi + semitones, 2.3, 0, false);
  }, [playEarNoteSound, setEarAudioPlayingFor]);

  const playEarChordSound = useCallback(async (rootMidi: number, intervals: number[]) => {
    const blockDelay = intervals.length * 0.1 + 0.15;
    const totalDuration = blockDelay + 2.3;
    setEarAudioPlayingFor(totalDuration);
    // Arpeggiate ascending
    intervals.forEach((inv, idx) => {
      void playEarNoteSound(rootMidi + inv, 1.4, idx * 0.1, false);
    });
    // Resonant solid chord block
    intervals.forEach((inv) => {
      void playEarNoteSound(rootMidi + inv, 2.3, blockDelay, false);
    });
  }, [playEarNoteSound, setEarAudioPlayingFor]);

  const playSuccessChime = useCallback(async () => {
    setEarAudioPlayingFor(1.2);
    void playEarNoteSound(72, 0.4, 0, false);
    void playEarNoteSound(76, 0.6, 0.14, false);
    void playEarNoteSound(79, 1.0, 0.28, false);
  }, [playEarNoteSound, setEarAudioPlayingFor]);

  const playFailTone = useCallback(async () => {
    setEarAudioPlayingFor(0.8);
    void playEarNoteSound(58, 0.8, 0, false);
  }, [playEarNoteSound, setEarAudioPlayingFor]);

  const handleGenerateNewEarQuestion = useCallback((overrideMode?: 'pitch' | 'interval' | 'chord') => {
    const activeMode = overrideMode || earTrainingMode;
    setEarQuizAnswered(false);
    setLastGuessedValue(null);
    setIsLastGuessCorrect(null);

    // Resolve active scale / key for all 3 modes
    let chosenScaleId = earScaleSetting;
    if (earScaleSetting === 'random') {
      const randScale = EAR_SCALES[Math.floor(Math.random() * EAR_SCALES.length)];
      chosenScaleId = randScale.id;
      setEarActiveScaleId(randScale.id);
    } else if (earScaleSetting !== 'all') {
      setEarActiveScaleId(earScaleSetting);
    } else {
      setEarActiveScaleId(null);
    }

    const activeScale = EAR_SCALES.find(s => s.id === chosenScaleId);
    const activeRootPc = activeScale
      ? activeScale.rootPitchClass
      : (earScaleSetting === 'all' ? Math.floor(Math.random() * 12) : 0);

    const rootChoice = ROOT_KEY_CHOICES.find(r => r.pitchClass === activeRootPc) || ROOT_KEY_CHOICES[0];
    const rootName = activeScale
      ? (isId ? activeScale.name.id : isEs ? activeScale.name.es : activeScale.name.en)
      : rootChoice.display;

    if (activeMode === 'pitch') {
      let targetMidi: number;
      if (activeScale && chosenScaleId !== 'all') {
        const allowedPcs = activeScale.pitchClasses;
        if (earPitchDifficulty === 'wide') {
          const candidates: number[] = [];
          for (let m = 48; m <= 83; m++) {
            if (allowedPcs.includes(m % 12)) candidates.push(m);
          }
          targetMidi = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
          const candidates = allowedPcs.map(pc => 60 + pc);
          targetMidi = candidates[Math.floor(Math.random() * candidates.length)];
        }
      } else {
        if (earPitchDifficulty === 'wide') {
          targetMidi = 48 + Math.floor(Math.random() * 36);
        } else {
          targetMidi = 60 + Math.floor(Math.random() * 12);
        }
      }
      setCurrentQuizMidi(targetMidi);
      void playEarNoteSound(targetMidi);
    } else if (activeMode === 'interval') {
      let baseMidi: number;
      if (earPitchDifficulty === 'wide') {
        const octaveBases = [36, 48, 60, 72];
        const chosenBase = octaveBases[Math.floor(Math.random() * octaveBases.length)];
        baseMidi = Math.min(84 - 12, chosenBase + activeRootPc);
      } else {
        baseMidi = activeRootPc < 5 ? 60 + activeRootPc : 48 + activeRootPc;
      }
      const semitones = 1 + Math.floor(Math.random() * 12);
      const correctInv = EAR_INTERVALS.find(i => i.semitones === semitones) || EAR_INTERVALS[0];
      setCurrentQuizInterval({ rootMidi: baseMidi, rootPc: activeRootPc, rootName, semitones });

      // Generate 12 choices for Interval (Fixed root vs Mixed roots)
      if (earChoiceRootMode === 'fixed') {
        const choices = EAR_INTERVALS.map(inv => ({
          id: `${activeRootPc}_${inv.semitones}`,
          rootPc: activeRootPc,
          rootName: getEarRootName(activeRootPc),
          targetName: getIntervalTargetName(activeRootPc, inv.semitones),
          interval: inv,
          isCorrect: inv.semitones === semitones,
        }));
        setQuizIntervalChoices(choices);
      } else {
        // Mixed roots mode
        const correctChoice = {
          id: `${activeRootPc}_${semitones}`,
          rootPc: activeRootPc,
          rootName: getEarRootName(activeRootPc),
          targetName: getIntervalTargetName(activeRootPc, semitones),
          interval: correctInv,
          isCorrect: true,
        };

        const pool: { rootPc: number; semitones: number }[] = [];
        for (let r = 0; r < 12; r++) {
          for (let s = 1; s <= 12; s++) {
            if (r !== activeRootPc || s !== semitones) {
              pool.push({ rootPc: r, semitones: s });
            }
          }
        }
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        const sameRoot = pool.filter(p => p.rootPc === activeRootPc);
        const sameInv = pool.filter(p => p.rootPc !== activeRootPc && p.semitones === semitones);
        const other = pool.filter(p => p.rootPc !== activeRootPc && p.semitones !== semitones);

        const picked: { rootPc: number; semitones: number }[] = [];
        if (sameRoot.length > 0) picked.push(sameRoot[0]);
        if (sameRoot.length > 1) picked.push(sameRoot[1]);
        if (sameInv.length > 0) picked.push(sameInv[0]);
        if (sameInv.length > 1) picked.push(sameInv[1]);
        for (const item of other) {
          if (picked.length >= 11) break;
          picked.push(item);
        }

        const distractorChoices = picked.map(d => {
          const invItem = EAR_INTERVALS.find(i => i.semitones === d.semitones) || EAR_INTERVALS[0];
          return {
            id: `${d.rootPc}_${d.semitones}`,
            rootPc: d.rootPc,
            rootName: getEarRootName(d.rootPc),
            targetName: getIntervalTargetName(d.rootPc, d.semitones),
            interval: invItem,
            isCorrect: false,
          };
        });

        const allChoices = [correctChoice, ...distractorChoices];
        for (let i = allChoices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
        }
        setQuizIntervalChoices(allChoices);
      }

      void playEarIntervalSound(baseMidi, semitones);
    } else {
      const randomChord = EAR_CHORDS[Math.floor(Math.random() * EAR_CHORDS.length)];
      let baseMidi: number;
      if (earPitchDifficulty === 'wide') {
        const octaveBases = [36, 48, 60, 72];
        const chosenBase = octaveBases[Math.floor(Math.random() * octaveBases.length)];
        const maxOffset = Math.max(...randomChord.intervals);
        baseMidi = Math.min(84 - maxOffset, chosenBase + activeRootPc);
      } else {
        baseMidi = activeRootPc < 5 ? 60 + activeRootPc : 48 + activeRootPc;
      }
      setCurrentQuizChord({ rootMidi: baseMidi, rootPc: activeRootPc, rootName, chord: randomChord });

      // Generate 12 choices for Chord (Fixed root vs Mixed roots)
      if (earChoiceRootMode === 'fixed') {
        const choices = EAR_CHORDS.map(ch => ({
          id: `${activeRootPc}_${ch.id}`,
          rootPc: activeRootPc,
          rootName: getEarRootName(activeRootPc),
          chord: ch,
          isCorrect: ch.id === randomChord.id,
        }));
        setQuizChordChoices(choices);
      } else {
        // Mixed roots mode
        const correctChoice = {
          id: `${activeRootPc}_${randomChord.id}`,
          rootPc: activeRootPc,
          rootName: getEarRootName(activeRootPc),
          chord: randomChord,
          isCorrect: true,
        };

        const pool: { rootPc: number; chord: EarChordItem }[] = [];
        for (let r = 0; r < 12; r++) {
          for (const ch of EAR_CHORDS) {
            if (r !== activeRootPc || ch.id !== randomChord.id) {
              pool.push({ rootPc: r, chord: ch });
            }
          }
        }
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        const sameRoot = pool.filter(p => p.rootPc === activeRootPc);
        const sameChord = pool.filter(p => p.rootPc !== activeRootPc && p.chord.id === randomChord.id);
        const other = pool.filter(p => p.rootPc !== activeRootPc && p.chord.id !== randomChord.id);

        const picked: { rootPc: number; chord: EarChordItem }[] = [];
        if (sameRoot.length > 0) picked.push(sameRoot[0]);
        if (sameRoot.length > 1) picked.push(sameRoot[1]);
        if (sameChord.length > 0) picked.push(sameChord[0]);
        if (sameChord.length > 1) picked.push(sameChord[1]);
        for (const item of other) {
          if (picked.length >= 11) break;
          picked.push(item);
        }

        const distractorChoices = picked.map(d => ({
          id: `${d.rootPc}_${d.chord.id}`,
          rootPc: d.rootPc,
          rootName: getEarRootName(d.rootPc),
          chord: d.chord,
          isCorrect: false,
        }));

        const allChoices = [correctChoice, ...distractorChoices];
        for (let i = allChoices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
        }
        setQuizChordChoices(allChoices);
      }

      void playEarChordSound(baseMidi, randomChord.intervals);
    }
  }, [earTrainingMode, earPitchDifficulty, earScaleSetting, earChoiceRootMode, isId, isEs, playEarNoteSound, playEarIntervalSound, playEarChordSound]);

  const handlePitchGuess = useCallback((noteId: string) => {
    if (earQuizAnswered || currentQuizMidi === null) return;
    const correctNote = PITCH_NOTES_OCTAVE4.find(n => n.midi % 12 === currentQuizMidi % 12);
    const correctId = correctNote ? correctNote.id : 'C';
    const isCorrect = noteId === correctId;

    setEarQuizAnswered(true);
    setLastGuessedValue(noteId);
    setIsLastGuessCorrect(isCorrect);
    setEarTotalGuessed(prev => prev + 1);

    if (isCorrect) {
      setEarCorrectGuessed(prev => prev + 1);
      setEarStreak(prev => {
        const next = prev + 1;
        setEarBestStreak(best => Math.max(best, next));
        return next;
      });
      void playSuccessChime();
    } else {
      setEarStreak(0);
      void playFailTone();
    }

    setEarHeatmapStats(prev => {
      const existing = prev[correctId] || { total: 0, correct: 0 };
      return {
        ...prev,
        [correctId]: {
          total: existing.total + 1,
          correct: existing.correct + (isCorrect ? 1 : 0),
        },
      };
    });

    if (isCorrect && earAutoAdvance) {
      setTimeout(() => {
        handleGenerateNewEarQuestion('pitch');
      }, 1200);
    }
  }, [earQuizAnswered, currentQuizMidi, playSuccessChime, playFailTone, earAutoAdvance, handleGenerateNewEarQuestion]);

  const handleIntervalGuess = useCallback((choiceId: string, semitones: number, rootPc?: number) => {
    if (earQuizAnswered || !currentQuizInterval) return;
    const isCorrect = semitones === currentQuizInterval.semitones &&
      (earChoiceRootMode === 'fixed' || rootPc === undefined || rootPc === currentQuizInterval.rootPc);

    setEarQuizAnswered(true);
    setLastGuessedValue(choiceId);
    setIsLastGuessCorrect(isCorrect);
    setEarTotalGuessed(prev => prev + 1);

    if (isCorrect) {
      setEarCorrectGuessed(prev => prev + 1);
      setEarStreak(prev => {
        const next = prev + 1;
        setEarBestStreak(best => Math.max(best, next));
        return next;
      });
      void playSuccessChime();
    } else {
      setEarStreak(0);
      void playFailTone();
    }

    if (isCorrect && earAutoAdvance) {
      setTimeout(() => {
        handleGenerateNewEarQuestion('interval');
      }, 1300);
    }
  }, [earQuizAnswered, currentQuizInterval, earChoiceRootMode, playSuccessChime, playFailTone, earAutoAdvance, handleGenerateNewEarQuestion]);

  const handleChordGuess = useCallback((choiceId: string, chordId: string, rootPc?: number) => {
    if (earQuizAnswered || !currentQuizChord) return;
    const isCorrect = chordId === currentQuizChord.chord.id &&
      (earChoiceRootMode === 'fixed' || rootPc === undefined || rootPc === currentQuizChord.rootPc);

    setEarQuizAnswered(true);
    setLastGuessedValue(choiceId);
    setIsLastGuessCorrect(isCorrect);
    setEarTotalGuessed(prev => prev + 1);

    if (isCorrect) {
      setEarCorrectGuessed(prev => prev + 1);
      setEarStreak(prev => {
        const next = prev + 1;
        setEarBestStreak(best => Math.max(best, next));
        return next;
      });
      void playSuccessChime();
    } else {
      setEarStreak(0);
      void playFailTone();
    }

    if (isCorrect && earAutoAdvance) {
      setTimeout(() => {
        handleGenerateNewEarQuestion('chord');
      }, 1400);
    }
  }, [earQuizAnswered, currentQuizChord, earChoiceRootMode, playSuccessChime, playFailTone, earAutoAdvance, handleGenerateNewEarQuestion]);

  const handleResetEarStats = () => {
    setEarStreak(0);
    setEarBestStreak(0);
    setEarTotalGuessed(0);
    setEarCorrectGuessed(0);
    setEarHeatmapStats({});
    setEarQuizAnswered(false);
    setLastGuessedValue(null);
    setIsLastGuessCorrect(null);
    setCurrentQuizMidi(null);
    setCurrentQuizInterval(null);
    setCurrentQuizChord(null);
  };

  return (
    <div
      className={`w-full ${
        isModal
          ? 'h-[92vh] max-w-6xl rounded-xl border border-slate-800 shadow-2xl overflow-hidden'
          : 'h-full relative z-10'
      } text-slate-100 flex flex-col font-sans select-text min-h-0`}
      style={{ backgroundColor: '#070a12' }}
    >
      {/* Top Studio Header */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-3.5">
          {!isModal ? (
            <button
              onClick={onBackToMainMenu}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-bold transition-all flex items-center gap-2 border border-slate-700 shadow-sm active:scale-95"
              title={isId ? 'Kembali ke Menu Utama' : isEs ? 'Volver al Menú Principal' : 'Return to Main Menu'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t.backToMenu}</span>
            </button>
          ) : (
            <button
              onClick={onCloseModal}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-bold transition-all flex items-center gap-2 border border-slate-700 shadow-sm active:scale-95"
              title={isId ? 'Tutup Modal' : isEs ? 'Cerrar Modal' : 'Close modal'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{t.close}</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-900/80 to-blue-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-mono text-xs font-black tracking-tighter shadow-sm shadow-cyan-950">
              OCT
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base md:text-xl font-black tracking-tight text-cyan-400 uppercase">
                  Octavia Conservatory &amp; Technical Manual
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content Area */}
      <div className="flex-grow flex flex-col md:flex-row min-h-0 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Navigation Sidebar */}
        <nav
          className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800/90 p-3.5 pb-6 md:pb-16 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto flex-shrink-0 custom-scrollbar"
          style={{ backgroundColor: '#090d16' }}
        >
          <div className="hidden md:flex items-center justify-between px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 border-b border-slate-800/80 mb-2">
            <span>{isId ? 'MODUL KURIKULUM' : isEs ? 'MÓDULOS DEL CURSO' : 'CURRICULUM MODULES'}</span>
            <span className="text-slate-500">01–08</span>
          </div>
          {chapters.map((ch, idx) => {
            const isActive = activeChapter === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => handleSelectChapter(ch.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2.5 whitespace-nowrap md:whitespace-normal cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-900 text-white border-l-4 border-l-cyan-400 border-y border-r border-cyan-500/30 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex-shrink-0">
                    <ChapterIcon id={ch.id} active={isActive} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono text-xs font-bold ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {ch.num}
                      </span>
                      <span className="text-sm font-bold truncate leading-tight">{ch.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate hidden md:block mt-0.5">
                      {ch.sub}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {ch.badge}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Article Reader Area */}
        <main
          ref={articleScrollRef}
          className="flex-grow overflow-y-auto p-6 md:p-10 pb-28 md:pb-36 custom-scrollbar space-y-10 min-h-0"
          style={{ backgroundColor: '#070a12' }}
        >
          {/* ========================================================================= */}
          {/* CHAPTER 1: Reading Sheet Music & Grand Staff Architecture */}
          {/* ========================================================================= */}
          {activeChapter === 'sheet' && (
            <article className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
              {/* Chapter Header */}
              <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs md:text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 01 • ARSITEKTUR NOTASI MUSIK' : isEs ? 'MÓDULO 01 • ARQUITECTURA DE NOTACIÓN' : 'MODULE 01 • NOTATION ARCHITECTURE'}
                    </span>
                    <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700">
                      {isId ? '5 BAGIAN • 5 DIAGRAM TEKNIS' : isEs ? '5 SECCIONES • 5 DIAGRAMAS TÉCNICOS' : '5 SECTIONS • 5 TECHNICAL DIAGRAMS'}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {isId
                      ? 'Membaca Notasi Balok Piano: Grand Staff, Interval & Subdivisi Ritme'
                      : isEs
                      ? 'Lectura de Partituras: Gran Pentagrama, Intervalos y Subdivisión Rítmica'
                      : 'Reading Piano Sheet Music: Grand Staff, Intervallic Sight-Reading & Rhythm'}
                  </h2>
                  <p className="text-sm md:text-[15px] text-slate-200 mt-3 leading-relaxed max-w-4xl">
                    {isId
                      ? 'Notasi balok adalah sistem koordinat dua dimensi: sumbu vertikal memetakan frekuensi tinggi-rendah nada (pitch) pada 88 tuts piano, sedangkan sumbu horizontal memetakan durasi waktu proporsional terhadap denyut ketukan (pulse).'
                      : isEs
                      ? 'La partitura es un sistema de coordenadas bidimensional: el eje vertical mapea la altura tonal (pitch) en las 88 teclas, mientras que el eje horizontal representa el tiempo proporcional al pulso.'
                      : 'Standard sheet music operates as a two-dimensional coordinate graph: the vertical axis maps exact pitch frequencies across the 88-keybed, while the horizontal axis maps proportional time subdivisions against a steady metric pulse.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectChapter('exercises')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 text-xs md:text-sm font-mono font-bold transition-all flex items-center gap-2 flex-shrink-0 shadow-sm active:scale-95 cursor-pointer"
                  title={isId ? 'Buka Generator Latihan Drill (Bab 06)' : isEs ? 'Abrir Generador de Drills (Cap. 06)' : 'Open Drill Generator (Ch. 06)'}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{t.jumpToDrills}</span>
                  <span>→</span>
                </button>
              </div>

              {/* FIG 1.1: Grand Staff & 5-C Landmark Blueprint */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 1.1 — GRAND STAFF &amp; THE 5-C LANDMARK COORDINATE SYSTEM
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Peta Geometri Paranada Ganda (Treble G4, Middle C4, Bass F3 & Garis Bantu C2–C6)'
                        : 'Grand Staff Geometric Blueprint (Treble G4, Middle C4, Bass F3 & C2–C6 Ledger Anchors)'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    MIDI 36 (C2) — MIDI 84 (C6)
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 320" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <defs>
                      <linearGradient id="staffBgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0c1222" />
                        <stop offset="100%" stopColor="#070a14" />
                      </linearGradient>
                      <linearGradient id="middleCGlow" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fde047" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                      <filter id="neonGold" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <rect width="860" height="320" rx="8" fill="url(#staffBgGrad)" stroke="#334155" strokeWidth="1.2" />

                    {/* Subtle vertical coordinate grid */}
                    {[150, 230, 310, 390, 470, 550, 630, 710, 790].map((x, i) => (
                      <line key={`vg-${i}`} x1={x} y1="20" x2={x} y2="290" stroke="#0f172a" strokeWidth="1" />
                    ))}

                    {/* High C6 Ledger Lines (above Treble) */}
                    <line x1="772" y1="28" x2="808" y2="28" stroke="#38bdf8" strokeWidth="1.5" />
                    <line x1="772" y1="42" x2="808" y2="42" stroke="#38bdf8" strokeWidth="1.5" />

                    {/* Treble Staff (5 Lines: y = 56, 70, 84, 98, 112 -> F5, D5, B4, G4, E4) */}
                    <g stroke="#334155" strokeWidth="1.4">
                      <line x1="68" y1="56" x2="830" y2="56" />
                      <line x1="68" y1="70" x2="830" y2="70" />
                      <line x1="68" y1="84" x2="830" y2="84" />
                      <line x1="68" y1="98" x2="830" y2="98" stroke="#0284c7" strokeDasharray="3 2" />
                      <line x1="68" y1="112" x2="830" y2="112" />
                    </g>

                    {/* Middle C4 Center Zone (y = 148) */}
                    <line x1="68" y1="148" x2="830" y2="148" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.35" />

                    {/* Bass Staff (5 Lines: y = 184, 198, 212, 226, 240 -> A3, F3, D3, B2, G2) */}
                    <g stroke="#334155" strokeWidth="1.4">
                      <line x1="68" y1="184" x2="830" y2="184" />
                      <line x1="68" y1="198" x2="830" y2="198" stroke="#6366f1" strokeDasharray="3 2" />
                      <line x1="68" y1="212" x2="830" y2="212" />
                      <line x1="68" y1="226" x2="830" y2="226" />
                      <line x1="68" y1="240" x2="830" y2="240" />
                    </g>

                    {/* Low C2 Ledger Lines (below Bass: E2 = 254, C2 = 268) */}
                    <line x1="132" y1="254" x2="168" y2="254" stroke="#818cf8" strokeWidth="1.5" />
                    <line x1="132" y1="268" x2="168" y2="268" stroke="#818cf8" strokeWidth="1.5" />

                    {/* System Barline & Classical Brace */}
                    <line x1="68" y1="56" x2="68" y2="240" stroke="#94a3b8" strokeWidth="2.5" />
                    <path d="M 62 56 C 48 92, 44 128, 36 148 C 44 168, 48 204, 62 240" fill="none" stroke="#64748b" strokeWidth="2.2" />

                    {/* Clef Symbols & Target Line Callouts */}
                    <text x="78" y="106" fill="#38bdf8" fontSize="48" fontFamily="serif">𝄞</text>
                    <circle cx="96" cy="98" r="3.5" fill="#38bdf8" />
                    <text x="20" y="82" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                      {isId ? 'TREBLE' : isEs ? 'TREBLE' : 'TREBLE'}
                    </text>
                    <text x="20" y="94" fill="#64748b" fontSize="12" fontFamily="monospace">
                      {isId ? 'TK (G4)' : isEs ? 'MD (Sol4)' : 'RH (G4)'}
                    </text>

                    <text x="78" y="218" fill="#818cf8" fontSize="38" fontFamily="serif">𝄢</text>
                    <circle cx="105" cy="198" r="3.5" fill="#818cf8" />
                    <text x="20" y="206" fill="#818cf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                      {isId ? 'BASS' : isEs ? 'BASS' : 'BASS'}
                    </text>
                    <text x="20" y="218" fill="#64748b" fontSize="12" fontFamily="monospace">
                      {isId ? 'TI (F3)' : isEs ? 'MI (Fa3)' : 'LH (F3)'}
                    </text>

                    {/* LANDMARK 1: Low C2 (2 ledger lines below Bass, y=268) */}
                    <g transform="translate(150, 268)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#818cf8" transform="rotate(-18)" />
                      <line x1="6.5" y1="0" x2="6.5" y2="-36" stroke="#818cf8" strokeWidth="1.5" />
                      <rect x="-34" y="12" width="68" height="18" rx="3" fill="#0f172a" stroke="#6366f1" strokeWidth="1" />
                      <text x="0" y="24" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'C Rendah (C2)' : isEs ? 'Do Grave (Do2)' : 'Low C2'}
                      </text>
                    </g>

                    {/* LANDMARK 2: G2 to E3 Bass Scale Nodes */}
                    <g transform="translate(230, 240)">
                      <ellipse cx="0" cy="0" rx="6.5" ry="5" fill="#475569" transform="rotate(-18)" />
                      <text x="0" y="18" textAnchor="middle" fill="#94a3b8" fontSize="12.5" fontFamily="monospace">
                        {isId ? 'G2 (Garis 1)' : isEs ? 'Sol2 (L1)' : 'G2 (L1)'}
                      </text>
                    </g>

                    {/* LANDMARK 3: Bass C3 (Space 2 of Bass Staff, y=219) */}
                    <g transform="translate(310, 219)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#818cf8" transform="rotate(-18)" />
                      <line x1="6.5" y1="0" x2="6.5" y2="-34" stroke="#818cf8" strokeWidth="1.5" />
                      <rect x="-30" y="16" width="60" height="18" rx="3" fill="#0f172a" stroke="#6366f1" strokeWidth="1" />
                      <text x="0" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'C Bass (C3)' : isEs ? 'Do Fa (Do3)' : 'Bass C3'}
                      </text>
                    </g>

                    {/* LANDMARK 4: Bass Clef F3 Anchor (Line 4 of Bass Staff, y=198) */}
                    <g transform="translate(390, 198)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#a855f7" transform="rotate(-18)" />
                      <line x1="-6.5" y1="0" x2="-6.5" y2="34" stroke="#a855f7" strokeWidth="1.5" />
                      <text x="0" y="-12" textAnchor="middle" fill="#d8b4fe" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'F3 (Garis Kunci)' : isEs ? 'Fa3 (Línea Clave)' : 'F3 (Clef Line)'}
                      </text>
                    </g>

                    {/* LANDMARK 5: Middle C4 (Center Ledger Line, y=148) */}
                    <g transform="translate(470, 148)">
                      <line x1="-18" y1="0" x2="18" y2="0" stroke="#f59e0b" strokeWidth="2.2" />
                      <ellipse cx="0" cy="0" rx="8" ry="6" fill="#f59e0b" transform="rotate(-18)" />
                      <line x1="7" y1="0" x2="7" y2="-34" stroke="#f59e0b" strokeWidth="1.6" />
                      <rect x="-44" y="11" width="88" height="20" rx="4" fill="#451a03" stroke="#f59e0b" strokeWidth="1.2" />
                      <text x="0" y="24" textAnchor="middle" fill="#fde68a" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'C TENGAH (C4)' : isEs ? 'DO CENTRAL (60)' : 'MIDDLE C4 (60)'}
                      </text>
                    </g>

                    {/* LANDMARK 6: Treble Clef G4 Anchor (Line 2 of Treble Staff, y=98) */}
                    <g transform="translate(550, 98)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#06b6d4" transform="rotate(-18)" />
                      <line x1="6.5" y1="0" x2="6.5" y2="-34" stroke="#06b6d4" strokeWidth="1.5" />
                      <text x="0" y="27" textAnchor="middle" fill="#67e8f9" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'G4 (Garis Kunci)' : isEs ? 'Sol4 (Línea Clave)' : 'G4 (Clef Line)'}
                      </text>
                    </g>

                    {/* LANDMARK 7: Treble C5 (Space 3 of Treble Staff, y=77) */}
                    <g transform="translate(630, 77)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#38bdf8" transform="rotate(-18)" />
                      <line x1="-6.5" y1="0" x2="-6.5" y2="34" stroke="#38bdf8" strokeWidth="1.5" />
                      <rect x="-34" y="-30" width="68" height="18" rx="3" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1" />
                      <text x="0" y="-18" textAnchor="middle" fill="#7dd3fc" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'C Treble (C5)' : isEs ? 'Do Sol (Do5)' : 'Treble C5'}
                      </text>
                    </g>

                    {/* LANDMARK 8: Top Line F5 (Line 5 of Treble Staff, y=56) */}
                    <g transform="translate(710, 56)">
                      <ellipse cx="0" cy="0" rx="6.5" ry="5" fill="#475569" transform="rotate(-18)" />
                      <text x="0" y="-12" textAnchor="middle" fill="#94a3b8" fontSize="12.5" fontFamily="monospace">
                        {isId ? 'F5 (Garis 5)' : isEs ? 'Fa5 (L5)' : 'F5 (L5)'}
                      </text>
                    </g>

                    {/* LANDMARK 9: High C6 (2 Ledger Lines above Treble, y=28) */}
                    <g transform="translate(790, 28)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#38bdf8" transform="rotate(-18)" />
                      <line x1="-6.5" y1="0" x2="-6.5" y2="36" stroke="#38bdf8" strokeWidth="1.5" />
                      <rect x="-32" y="-24" width="64" height="16" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                      <text x="0" y="-13" textAnchor="middle" fill="#7dd3fc" fontSize="12" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'C Tinggi (C6)' : isEs ? 'Do Agudo (Do6)' : 'High C6'}
                      </text>
                    </g>

                    {/* Mirror Symmetry Annotation */}
                    <text x="450" y="306" textAnchor="middle" fill="#64748b" fontSize="13" fontFamily="monospace">
                      {isId
                        ? 'ATURAN SIMETRI: C Tengah (C4) persis di tengah • Bass C3 di spasi 2 dari bawah • Treble C5 di spasi 2 dari atas • C2 & C6 pakai 2 garis bantu'
                        : isEs
                        ? 'SIMETRÍA: Do Central (Do4) en el centro • Do3 en espacio 2 desde abajo • Do5 en espacio 2 desde arriba • Do2 y Do6 con 2 líneas adicionales'
                        : 'SYMMETRY RULE: Middle C4 sits at the exact geometric center • Bass C3 is Space 2 from bottom • Treble C5 is Space 2 from top • Low C2 & High C6 each use 2 outer ledger lines'}
                    </text>
                  </svg>
                </div>

                {/* Landmark & Intervallic Reading Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-base text-cyan-400">{isId ? '01. KUNCI G / TREBLE (G4)' : isEs ? '01. CLAVE DE SOL (Sol4)' : '01. TREBLE CLEF (G4)'}</span>
                      <span className="text-xs font-mono font-medium text-slate-400">{isId ? 'TANGAN KANAN' : isEs ? 'MANO DERECHA' : 'RIGHT HAND'}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Spiral dalam Kunci G melingkari Garis ke-2 dari bawah (nada G4 / 392 Hz). Lima garis dari bawah ke atas: E4 – G4 – B4 – D5 – F5. Empat spasi: F4 – A4 – C5 – E5.'
                        : isEs
                        ? 'La espiral interior de la clave de Sol rodea la 2ª línea desde abajo (Sol4 / 392 Hz). Líneas de abajo a arriba: Mi4–Sol4–Si4–Re5–Fa5. Espacios: Fa4–La4–Do5–Mi5.'
                        : 'The inner spiral of the G-clef wraps around Line 2 from the bottom, fixing it as G4 (392 Hz). Lines bottom-to-top: E4–G4–B4–D5–F5. Spaces: F4–A4–C5–E5.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-base text-cyan-400">{isId ? '02. KUNCI F / BASS (F3)' : isEs ? '02. CLAVE DE FA (Fa3)' : '02. BASS CLEF (F3)'}</span>
                      <span className="text-xs font-mono font-medium text-slate-400">{isId ? 'TANGAN KIRI' : isEs ? 'MANO IZQUIERDA' : 'LEFT HAND'}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Dua titik Kunci F mengapit Garis ke-4 dari bawah (nada F3 / 174.6 Hz). Lima garis dari bawah ke atas: G2 – B2 – D3 – F3 – A3. Empat spasi: A2 – C3 – E3 – G3.'
                        : isEs
                        ? 'Los dos puntos de la clave de Fa abrazan la 4ª línea desde abajo (Fa3 / 174.6 Hz). Líneas de abajo a arriba: Sol2–Si2–Re3–Fa3–La3. Espacios: La2–Do3–Mi3–Sol3.'
                        : 'The two dots of the F-clef straddle Line 4 from the bottom, fixing it as F3 (174.6 Hz). Lines bottom-to-top: G2–B2–D3–F3–A3. Spaces: A2–C3–E3–G3.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-base text-cyan-400">{isId ? '03. SIMETRI CERMIN' : isEs ? '03. SIMETRÍA EN ESPEJO' : '03. MIRROR SYMMETRY'}</span>
                      <span className="text-xs font-mono font-medium text-slate-400">{isId ? 'SISTEM 5-C' : isEs ? 'SISTEMA DE 5-DO' : '5-C SYSTEM'}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Jangan menghafal garis secara terpisah: Grand Staff bersifat simetris cermin terhadap Middle C4. C5 berada di spasi ke-2 dari atas Treble; C3 berada di spasi ke-2 dari bawah Bass.'
                        : isEs
                        ? 'No memorices líneas aisladas: el Gran Pentagrama es simétrico respecto al Do4 Central. Do5 está en el 2º espacio superior de Sol; Do3 está en el 2º inferior de Fa.'
                        : 'The Grand Staff is mirror-symmetric around Middle C4: Treble C5 sits in the 2nd space from the top, while Bass C3 sits in the 2nd space from the bottom.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* FIG 1.2: Intervallic Sight-Reading & Staff-to-Keyboard Projection */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 1.2 — INTERVALLIC SIGHT-READING &amp; KEYBED PROJECTION
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Membaca Jarak Interval (Step vs. Skip) & Pemetaan Langsung ke Tuts Fisik'
                        : 'Reading Harmonic & Melodic Intervals (Steps vs. Skips) Mapped to Physical Keys'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-slate-800">
                    PRO SIGHT-READING METHOD
                  </span>
                </div>

                <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                  {isId
                    ? 'Pianis mahir tidak membaca partitur dengan mengeja nama huruf satu per satu ("C - E - G"). Mereka mengenali satu nada jangkar lalu membaca bentuk geometris interval: perpindahan Garis-ke-Spasi adalah langkah 2nd (lewati 0 tuts putih), sedangkan Garis-ke-Garis atau Spasi-ke-Spasi adalah lompatan 3rd (lewati 1 tuts putih).'
                    : 'Fluent sight-readers do not spell every note letter individually. They identify one anchor note and read geometric shapes: a Line-to-Space move is always a 2nd (adjacent white key), while a Line-to-Line or Space-to-Space move is always a 3rd (skip one white key).'}
                </p>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 300" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="300" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Left Panel: Interval Geometry on Staff */}
                    <g transform="translate(20, 18)">
                      <rect width="460" height="264" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {isId
                          ? 'A. BENTUK GEOMETRIS INTERVAL PADA PARANADA'
                          : isEs
                          ? 'A. FORMAS GEOMÉTRICAS DE INTERVALOS EN EL PENTAGRAMA'
                          : 'A. GEOMETRIC INTERVAL SHAPES ON STAFF'}
                      </text>

                      {/* 5 Staff lines */}
                      {[55, 73, 91, 109, 127].map((y, idx) => (
                        <line key={idx} x1="20" y1={y} x2="440" y2={y} stroke="#334155" strokeWidth="1.5" />
                      ))}

                      {/* 2nd: Line to Space (E4 to F4) */}
                      <g transform="translate(55, 0)">
                        <ellipse cx="0" cy="127" rx="7" ry="5.2" fill="#38bdf8" transform="rotate(-15 0 127)" />
                        <ellipse cx="13" cy="118" rx="7" ry="5.2" fill="#38bdf8" transform="rotate(-15 13 118)" />
                        <text x="6" y="155" textAnchor="middle" fill="#38bdf8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                          {isId ? 'Sekonde (Langkah)' : isEs ? 'Segunda (Paso)' : '2nd (Step)'}
                        </text>
                        <text x="6" y="170" textAnchor="middle" fill="#94a3b8" fontSize="12">
                          {isId ? 'Garis → Spasi' : isEs ? 'Línea → Espacio' : 'Line → Space'}
                        </text>
                        <text x="6" y="183" textAnchor="middle" fill="#64748b" fontSize="11.5">
                          {isId ? 'Jari Sebelah (+1)' : isEs ? 'Dedo Siguiente (+1)' : 'Next Finger (+1)'}
                        </text>
                      </g>

                      {/* 3rd: Line to Line (E4 + G4) */}
                      <g transform="translate(145, 0)">
                        <ellipse cx="0" cy="127" rx="7" ry="5.2" fill="#10b981" transform="rotate(-15 0 127)" />
                        <ellipse cx="0" cy="109" rx="7" ry="5.2" fill="#10b981" transform="rotate(-15 0 109)" />
                        <text x="0" y="155" textAnchor="middle" fill="#10b981" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                          {isId ? 'Terts (Lompat 1)' : isEs ? 'Tercera (Salto)' : '3rd (Skip)'}
                        </text>
                        <text x="0" y="170" textAnchor="middle" fill="#94a3b8" fontSize="12">
                          {isId ? 'Garis → Garis' : isEs ? 'Línea → Línea' : 'Line → Line'}
                        </text>
                        <text x="0" y="183" textAnchor="middle" fill="#64748b" fontSize="11.5">
                          {isId ? 'Lompat 1 Jari (1–3)' : isEs ? 'Saltar 1 Dedo (1–3)' : 'Skip 1 Finger (1–3)'}
                        </text>
                      </g>

                      {/* 4th: Line to Space (E4 + A4) */}
                      <g transform="translate(235, 0)">
                        <ellipse cx="0" cy="127" rx="7" ry="5.2" fill="#f59e0b" transform="rotate(-15 0 127)" />
                        <ellipse cx="0" cy="100" rx="7" ry="5.2" fill="#f59e0b" transform="rotate(-15 0 100)" />
                        <text x="0" y="155" textAnchor="middle" fill="#f59e0b" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                          {isId ? 'Kuart (4th)' : isEs ? 'Cuarta (4ª)' : '4th'}
                        </text>
                        <text x="0" y="170" textAnchor="middle" fill="#94a3b8" fontSize="12">
                          {isId ? 'Garis → Spasi' : isEs ? 'Línea → Espacio' : 'Line → Space'}
                        </text>
                        <text x="0" y="183" textAnchor="middle" fill="#64748b" fontSize="11.5">
                          {isId ? 'Rentang Jari 1–4' : isEs ? 'Dedos 1–4' : 'Fingers 1–4'}
                        </text>
                      </g>

                      {/* 5th: Line to Line (E4 + B4) */}
                      <g transform="translate(320, 0)">
                        <ellipse cx="0" cy="127" rx="7" ry="5.2" fill="#a855f7" transform="rotate(-15 0 127)" />
                        <ellipse cx="0" cy="91" rx="7" ry="5.2" fill="#a855f7" transform="rotate(-15 0 91)" />
                        <text x="0" y="155" textAnchor="middle" fill="#a855f7" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                          {isId ? 'Kuint (5th)' : isEs ? 'Quinta (5ª)' : '5th'}
                        </text>
                        <text x="0" y="170" textAnchor="middle" fill="#94a3b8" fontSize="12">
                          {isId ? 'Garis → Garis (+2)' : isEs ? 'Línea → Línea (+2)' : 'Line → Line (+2)'}
                        </text>
                        <text x="0" y="183" textAnchor="middle" fill="#64748b" fontSize="11.5">
                          {isId ? 'Rentang Jari 1–5' : isEs ? 'Dedos 1–5' : 'Fingers 1–5'}
                        </text>
                      </g>

                      {/* Octave: Line to Space (E4 + E5) */}
                      <g transform="translate(405, 0)">
                        <ellipse cx="0" cy="127" rx="7" ry="5.2" fill="#f43f5e" transform="rotate(-15 0 127)" />
                        <ellipse cx="0" cy="64" rx="7" ry="5.2" fill="#f43f5e" transform="rotate(-15 0 64)" />
                        <text x="0" y="155" textAnchor="middle" fill="#f43f5e" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                          {isId ? 'Oktaf (8ve)' : isEs ? 'Octava (8ª)' : '8ve (Octave)'}
                        </text>
                        <text x="0" y="170" textAnchor="middle" fill="#94a3b8" fontSize="12">
                          {isId ? 'Garis → Spasi' : isEs ? 'Línea → Espacio' : 'Line → Space'}
                        </text>
                        <text x="0" y="183" textAnchor="middle" fill="#64748b" fontSize="11.5">
                          {isId ? 'Rentang 1–5 (12 st)' : isEs ? 'Apertura 1–5 (12 st)' : 'Span 1–5 (12 st)'}
                        </text>
                      </g>

                      {/* Bottom Rule Summary Box */}
                      <rect x="16" y="200" width="428" height="50" rx="4" fill="#0f172a" stroke="#1e293b" />
                      <text x="28" y="220" fill="#e2e8f0" fontSize="13" fontWeight="bold">
                        {isId
                          ? 'INTERVAL GANJIL (3rd, 5th, 7th) = Paritas Sama (Garis-ke-Garis / Spasi-ke-Spasi)'
                          : isEs
                          ? 'INTERVALOS IMPARES (3ª, 5ª, 7ª) = Misma Paridad (Línea-a-Línea o Espacio-a-Espacio)'
                          : 'ODD INTERVALS (3rd, 5th, 7th) = Same Parity (Line-to-Line or Space-to-Space)'}
                      </text>
                      <text x="28" y="238" fill="#94a3b8" fontSize="13">
                        {isId
                          ? 'INTERVAL GENAP (2nd, 4th, 6th, Oktaf) = Paritas Campuran (Garis-ke-Spasi)'
                          : isEs
                          ? 'INTERVALOS PARES (2ª, 4ª, 6ª, Octava) = Paridad Mixta (Línea-a-Espacio)'
                          : 'EVEN INTERVALS (2nd, 4th, 6th, Octave) = Mixed Parity (Line-to-Space or Space-to-Line)'}
                      </text>
                    </g>

                    {/* Right Panel: Physical 2-Black & 3-Black Landmark Topography */}
                    <g transform="translate(496, 18)">
                      <rect width="344" height="264" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {isId
                          ? 'B. TOPOGRAFI TAKTIL TUTS PIANO (JANGKAR C & F)'
                          : isEs
                          ? 'B. TOPOGRAFÍA TÁCTIL DEL TECLADO (ANCLAS DE DO Y FA)'
                          : 'B. TACTILE KEYBED TOPOGRAPHY (C & F ANCHORS)'}
                      </text>

                      {/* 8 White Keys C4 to C5 */}
                      <g transform="translate(20, 46)">
                        {['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'].map((n, idx) => {
                          const isC = n.startsWith('C');
                          const isF = n === 'F4';
                          return (
                            <g key={idx} transform={`translate(${idx * 38}, 0)`}>
                              <rect
                                width="36"
                                height="145"
                                rx="3"
                                fill={isC ? '#1e293b' : isF ? '#172554' : '#0f172a'}
                                stroke={isC ? '#f59e0b' : isF ? '#38bdf8' : '#334155'}
                                strokeWidth={isC || isF ? 1.6 : 1}
                              />
                              <text
                                x="18"
                                y="130"
                                textAnchor="middle"
                                fill={isC ? '#fbbf24' : isF ? '#38bdf8' : '#94a3b8'}
                                fontSize="13"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {n}
                              </text>
                            </g>
                          );
                        })}

                        {/* Twin Black Keys (C#4, D#4) */}
                        <rect x="25" y="0" width="24" height="88" rx="2" fill="#020617" stroke="#f59e0b" strokeWidth="1.2" />
                        <rect x="63" y="0" width="24" height="88" rx="2" fill="#020617" stroke="#f59e0b" strokeWidth="1.2" />
                        <rect x="20" y="-14" width="72" height="12" rx="2" fill="#451a03" />
                        <text x="56" y="-5" textAnchor="middle" fill="#fde68a" fontSize="11" fontFamily="monospace" fontWeight="bold">
                          {isId ? '2 TUTS HITAM → C' : isEs ? '2 TECLAS NEGRAS → DO' : '2 BLACK KEYS → C'}
                        </text>

                        {/* Triple Black Keys (F#4, G#4, A#4) */}
                        <rect x="139" y="0" width="24" height="88" rx="2" fill="#020617" stroke="#38bdf8" strokeWidth="1.2" />
                        <rect x="177" y="0" width="24" height="88" rx="2" fill="#020617" stroke="#38bdf8" strokeWidth="1.2" />
                        <rect x="215" y="0" width="24" height="88" rx="2" fill="#020617" stroke="#38bdf8" strokeWidth="1.2" />
                        <rect x="134" y="-14" width="110" height="12" rx="2" fill="#082f49" />
                        <text x="189" y="-5" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontFamily="monospace" fontWeight="bold">
                          {isId ? '3 TUTS HITAM → F' : isEs ? '3 TECLAS NEGRAS → FA' : '3 BLACK KEYS → F'}
                        </text>
                      </g>

                      <rect x="16" y="200" width="312" height="50" rx="4" fill="#0f172a" stroke="#1e293b" />
                      <text x="26" y="219" fill="#fde68a" fontSize="12.5" fontWeight="bold">
                        {isId
                          ? '• Tuts putih tepat di KIRI 2 Tuts Hitam = SELALU NADA C'
                          : isEs
                          ? '• Tecla blanca a la IZQUIERDA de 2 teclas negras = SIEMPRE DO'
                          : '• White key immediately LEFT of 2 Black Keys = ALWAYS C'}
                      </text>
                      <text x="26" y="236" fill="#7dd3fc" fontSize="12.5" fontWeight="bold">
                        {isId
                          ? '• Tuts putih tepat di KIRI 3 Tuts Hitam = SELALU NADA F'
                          : isEs
                          ? '• Tecla blanca a la IZQUIERDA de 3 teclas negras = SIEMPRE FA'
                          : '• White key immediately LEFT of 3 Black Keys = ALWAYS F'}
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 1.3: Complete Rhythm & Rest Subdivision Blueprint + Dotted & Triplet Math */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 1.3 — RHYTHM SUBDIVISION TREE, REST EQUIVALENTS &amp; DOTTED / TUPLET MATH
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Hierarki Nilai Not, Tanda Istirahat (Rest), Rumus Titik (1.5×) & Triplet (3:2)'
                        : 'Binary Note Subdivision, Rest Symbols, Augmentation Dots (1.5×) & Triplet Ratio (3:2)'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    4/4 COMMON TIME REFERENCE
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 650" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="650" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* TOP SECTION: Binary Subdivision Pyramid (Full Width) */}
                    <g transform="translate(20, 16)">
                      <rect width="820" height="284" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        A. BINARY SUBDIVISION PYRAMID (1 BAR IN 4/4 = 4 QUARTER BEATS)
                      </text>

                      {/* Row 1: Whole Note (4 beats) */}
                      <rect x="16" y="34" width="788" height="36" rx="4" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.2" />
                      <ellipse cx="280" cy="52" rx="8" ry="5.5" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
                      <text x="390" y="56" textAnchor="middle" fill="#f8fafc" fontSize="12" fontFamily="monospace" fontWeight="bold">
                        {isId
                          ? 'NOT UTUH (1/1 / Semibreve) = 4 Ketuk'
                          : isEs
                          ? 'REDONDA (1/1 / Semibreve) = 4 Tiempos'
                          : 'WHOLE NOTE (Semibreve) = 4 Beats'}
                      </text>
                      {/* Whole Rest symbol (hangs below line 4) */}
                      <line x1="560" y1="46" x2="600" y2="46" stroke="#64748b" strokeWidth="1.5" />
                      <rect x="572" y="46" width="16" height="6" fill="#38bdf8" />
                      <text x="635" y="55" textAnchor="middle" fill="#64748b" fontSize="12" fontFamily="monospace">
                        {isId ? 'Tanda Istirahat' : isEs ? 'Silencio' : 'Rest'}
                      </text>

                      {/* Row 2: 2 Half Notes (2 beats each) */}
                      {[0, 1].map((i) => (
                        <g key={`hn-${i}`} transform={`translate(${16 + i * 400}, 80)`}>
                          <rect width="388" height="36" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                          <ellipse cx="36" cy="22" rx="6.5" ry="4.5" fill="none" stroke="#38bdf8" strokeWidth="2" transform="rotate(-15 36 22)" />
                          <line x1="42" y1="22" x2="42" y2="6" stroke="#38bdf8" strokeWidth="1.6" />
                          <text x="180" y="22" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontFamily="monospace" fontWeight="bold">
                            {isId
                              ? 'NOT SETENGAH (1/2) = 2 Ketuk'
                              : isEs
                              ? 'BLANCA (1/2) = 2 Tiempos'
                              : 'HALF NOTE = 2 Beats'}
                          </text>
                          {/* Half Rest sits on top of line 3 */}
                          <line x1="310" y1="22" x2="340" y2="22" stroke="#64748b" strokeWidth="1.5" />
                          <rect x="318" y="16" width="14" height="6" fill="#94a3b8" />
                          <text x="362" y="22" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="monospace">
                            {isId ? 'Tanda Istirahat' : isEs ? 'Silencio' : 'Rest'}
                          </text>
                        </g>
                      ))}

                      {/* Row 3: 4 Quarter Notes (1 beat each) */}
                      {[0, 1, 2, 3].map((i) => (
                        <g key={`qn-${i}`} transform={`translate(${16 + i * 199}, 128)`}>
                          <rect width="191" height="38" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                          <ellipse cx="32" cy="24" rx="6" ry="4.2" fill="#818cf8" transform="rotate(-15 32 24)" />
                          <line x1="37.5" y1="24" x2="37.5" y2="7" stroke="#818cf8" strokeWidth="1.6" />
                          <text x="110" y="18" textAnchor="middle" fill="#e2e8f0" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                            {isId ? 'NOT SEPEREMPAT (1/4)' : isEs ? 'NEGRA (1/4)' : 'QUARTER NOTE'}
                          </text>
                          <text x="110" y="30" textAnchor="middle" fill="#818cf8" fontSize="11.5" fontFamily="monospace">
                            {isId ? '1 Ketuk (♩)' : isEs ? '1 Tiempo (♩)' : '1 Beat (♩)'}
                          </text>
                        </g>
                      ))}

                      {/* Row 4: 8 Eighth Notes (1/2 beat each) */}
                      {[0, 1, 2, 3].map((i) => (
                        <g key={`en-${i}`} transform={`translate(${16 + i * 199}, 176)`}>
                          <rect width="191" height="38" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                          {/* Beamed Pair */}
                          <ellipse cx="28" cy="27" rx="5" ry="3.6" fill="#10b981" transform="rotate(-15 28 27)" />
                          <ellipse cx="50" cy="27" rx="5" ry="3.6" fill="#10b981" transform="rotate(-15 50 27)" />
                          <line x1="32.5" y1="27" x2="32.5" y2="10" stroke="#10b981" strokeWidth="1.5" />
                          <line x1="54.5" y1="27" x2="54.5" y2="10" stroke="#10b981" strokeWidth="1.5" />
                          <line x1="32" y1="10" x2="55" y2="10" stroke="#10b981" strokeWidth="3" />
                          <text x="120" y="19" textAnchor="middle" fill="#a7f3d0" fontSize="12" fontFamily="monospace" fontWeight="bold">
                            {isId ? '2 × 1/2 Ketuk' : isEs ? '2 × 1/2 Tiempo' : '2 × 1/2 Beat'}
                          </text>
                          <text x="120" y="31" textAnchor="middle" fill="#64748b" fontSize="11.5" fontFamily="monospace">
                            {isId ? `Ketukan ${i + 1} &` : isEs ? `Pulso ${i + 1} y` : `Beat ${i + 1} &`}
                          </text>
                        </g>
                      ))}

                      {/* Row 5: 16 Sixteenth Notes (1/4 beat each) */}
                      {[0, 1, 2, 3].map((i) => (
                        <g key={`sn-${i}`} transform={`translate(${16 + i * 199}, 224)`}>
                          <rect width="191" height="38" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                          {/* 4 Beamed Sixteenths */}
                          {[0, 1, 2, 3].map((k) => (
                            <g key={k}>
                              <ellipse cx={20 + k * 12} cy="26" rx="3.8" ry="2.8" fill="#f59e0b" />
                              <line x1={23.5 + k * 12} y1="26" x2={23.5 + k * 12} y2="10" stroke="#f59e0b" strokeWidth="1.2" />
                            </g>
                          ))}
                          <line x1="23" y1="10" x2="60" y2="10" stroke="#f59e0b" strokeWidth="2.2" />
                          <line x1="23" y1="14" x2="60" y2="14" stroke="#f59e0b" strokeWidth="2.2" />
                          <text x="124" y="23" textAnchor="middle" fill="#fde68a" fontSize="11.5" fontFamily="monospace" fontWeight="bold">
                            {i + 1} e &amp; a
                          </text>
                        </g>
                      ))}
                    </g>

                    {/* BOTTOM SECTION: Dotted Notes, Ties & Tuplets (Moved Below for Maximum Width & Clean Spacing) */}
                    <g transform="translate(20, 314)">
                      <rect width="820" height="320" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="24" fill="#94a3b8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {isId
                          ? 'B. NOT BERTITIK (1.5×), PERBEDAAN TIE VS. SLUR & TRIPLET (3:2)'
                          : isEs
                          ? 'B. NOTAS CON PUNTILLO (1.5×), LIGADURA DE UNIÓN VS. EXPRESIÓN Y TRESILLOS (3:2)'
                          : 'B. DOTTED NOTES (1.5×), TIE VS. SLUR CURVE & TRIPLETS (3:2)'}
                      </text>

                      {/* Formula 1: Augmentation Dot with Graphical Note Math */}
                      <g transform="translate(16, 36)">
                        <rect width="788" height="84" rx="6" fill="#0c1222" stroke="#f59e0b" strokeWidth="1.2" />
                        
                        {/* Left Text Explanation */}
                        <g transform="translate(16, 0)">
                          <text x="0" y="22" fill="#fbbf24" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                            {isId
                              ? '1. ATURAN TITIK PERPANJANGAN (AUGMENTATION DOT): Nilai × 1.5'
                              : isEs
                              ? '1. REGLA DEL PUNTILLO: Valor × 1.5'
                              : '1. AUGMENTATION DOT RULE: Value × 1.5'}
                          </text>
                          <text x="0" y="44" fill="#e2e8f0" fontSize="12.5">
                            {isId ? (
                              <>Satu titik menambah <tspan fill="#fbbf24" fontWeight="bold">+50%</tspan> durasi dari not: Nilai + (Nilai / 2). Titik ke-2 menambah +25% lagi.</>
                            ) : isEs ? (
                              <>El puntillo añade <tspan fill="#fbbf24" fontWeight="bold">+50%</tspan> de duración a la nota: Valor + (Valor / 2). Un segundo puntillo añade otro +25%.</>
                            ) : (
                              <>A dot adds <tspan fill="#fbbf24" fontWeight="bold">+50%</tspan> of note duration: Value + (Value / 2). A second dot adds +25% more.</>
                            )}
                          </text>
                          <text x="0" y="66" fill="#cbd5e1" fontSize="11.5" fontFamily="monospace">
                            {isId
                              ? '• Not Setengah Bertitik (2+1 = 3 Ketuk)   |   • Not Seperempat Bertitik (1+0.5 = 1.5 Ketuk)'
                              : isEs
                              ? '• Blanca con puntillo (2+1 = 3 Tiempos)   |   • Negra con puntillo (1+0.5 = 1.5 Tiempos)'
                              : '• Dotted Half (2+1 = 3 Beats)   |   • Dotted Quarter (1+0.5 = 1.5 Beats)'}
                          </text>
                        </g>

                        {/* Right Visual Graphical Note Math Box */}
                        <g transform="translate(545, 12)">
                          <rect width="228" height="60" rx="5" fill="#060913" stroke="#f59e0b" strokeOpacity="0.4" strokeWidth="1" />
                          {/* Note 1: Dotted Half */}
                          <ellipse cx="26" cy="38" rx="6.5" ry="4.5" fill="none" stroke="#fde047" strokeWidth="2" transform="rotate(-15 26 38)" />
                          <line x1="32" y1="38" x2="32" y2="18" stroke="#fde047" strokeWidth="1.8" />
                          <circle cx="41" cy="36" r="3.2" fill="#f59e0b" />
                          
                          {/* Equals symbol */}
                          <text x="56" y="36" fill="#94a3b8" fontSize="15" fontFamily="monospace" fontWeight="bold">=</text>
                          
                          {/* Half Note (2 Beats) */}
                          <ellipse cx="80" cy="38" rx="6.5" ry="4.5" fill="none" stroke="#38bdf8" strokeWidth="1.8" transform="rotate(-15 80 38)" />
                          <line x1="86" y1="38" x2="86" y2="18" stroke="#38bdf8" strokeWidth="1.6" />
                          <text x="80" y="52" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="monospace">2b</text>

                          {/* Plus symbol */}
                          <text x="105" y="35" fill="#94a3b8" fontSize="13" fontFamily="monospace" fontWeight="bold">+</text>

                          {/* Quarter Note (1 Beat) */}
                          <ellipse cx="128" cy="38" rx="6" ry="4.2" fill="#fbbf24" transform="rotate(-15 128 38)" />
                          <line x1="133.5" y1="38" x2="133.5" y2="18" stroke="#fbbf24" strokeWidth="1.6" />
                          <text x="128" y="52" textAnchor="middle" fill="#fde68a" fontSize="10" fontFamily="monospace">1b</text>

                          {/* Arrow to total */}
                          <text x="156" y="35" fill="#34d399" fontSize="13" fontFamily="monospace" fontWeight="bold">→</text>
                          
                          {/* Total Badge */}
                          <rect x="174" y="18" width="44" height="24" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
                          <text x="196" y="34" textAnchor="middle" fill="#6ee7b7" fontSize="11" fontFamily="monospace" fontWeight="bold">3.0b</text>
                        </g>
                      </g>

                      {/* Formula 2: Graphical Tie vs Slur Curve Comparison */}
                      <g transform="translate(16, 128)">
                        <rect width="788" height="92" rx="6" fill="#0c1222" stroke="#38bdf8" strokeWidth="1.2" />
                        
                        {/* Left Text Explanation */}
                        <g transform="translate(16, 0)">
                          <text x="0" y="20" fill="#38bdf8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                            {isId
                              ? '2. PERBEDAAN GARIS LENGKUNG TIE VS. SLUR'
                              : isEs
                              ? '2. DIFERENCIA ENTRE LIGADURA DE UNIÓN (TIE) Y EXPRESIÓN (SLUR)'
                              : '2. TIE vs. SLUR CURVE DISTINCTION'}
                          </text>
                          <text x="0" y="42" fill="#e2e8f0" fontSize="12.5">
                            • <tspan fill="#38bdf8" fontWeight="bold">{isId ? 'Tie (Nada Sama):' : isEs ? 'Ligadura de unión (Misma nota):' : 'Tie (Same Pitch):'}</tspan>{' '}
                            {isId
                              ? 'Menghubungkan dua not bernada identik; tahan terus tanpa memukul ulang.'
                              : isEs
                              ? 'Une dos notas de idéntica altura; suma duraciones sin tocar de nuevo.'
                              : 'Connects two notes of identical pitch; hold without restriking.'}
                          </text>
                          <text x="0" y="64" fill="#e2e8f0" fontSize="12.5">
                            • <tspan fill="#c084fc" fontWeight="bold">{isId ? 'Slur (Nada Berbeda):' : isEs ? 'Ligadura de expresión (Notas distintas):' : 'Slur (Different Pitches):'}</tspan>{' '}
                            {isId
                              ? 'Melengkungi nada-nada berbeda; mainkan legato (halus tersambung).'
                              : isEs
                              ? 'Curva sobre notas diferentes; tocar legato (conectado suavemente).'
                              : 'Arcs across differing notes; play legato (smoothly connected).'}
                          </text>
                        </g>

                        {/* Right Visual Drawings: Tie vs Slur */}
                        <g transform="translate(545, 12)">
                          <rect width="228" height="68" rx="5" fill="#060913" stroke="#38bdf8" strokeOpacity="0.4" strokeWidth="1" />
                          
                          {/* Mini Staff 1: Tie (C4 to C4) */}
                          <g transform="translate(8, 6)">
                            <line x1="0" y1="28" x2="98" y2="28" stroke="#1e293b" strokeWidth="1" />
                            {/* Note 1 */}
                            <ellipse cx="24" cy="28" rx="5" ry="3.5" fill="#38bdf8" />
                            <line x1="28.5" y1="28" x2="28.5" y2="12" stroke="#38bdf8" strokeWidth="1.4" />
                            {/* Note 2 */}
                            <ellipse cx="74" cy="28" rx="5" ry="3.5" fill="#38bdf8" />
                            <line x1="78.5" y1="28" x2="78.5" y2="12" stroke="#38bdf8" strokeWidth="1.4" />
                            {/* Curved TIE Arc underneath */}
                            <path d="M 24 33 Q 49 46 74 33" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" />
                            <text x="49" y="54" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">TIE (1 STRIKE)</text>
                          </g>

                          {/* Mini Divider */}
                          <line x1="114" y1="8" x2="114" y2="60" stroke="#1e293b" strokeWidth="1" />

                          {/* Mini Staff 2: Slur (C4 to G4) */}
                          <g transform="translate(122, 6)">
                            <line x1="0" y1="28" x2="98" y2="28" stroke="#1e293b" strokeWidth="1" />
                            {/* Note 1 (Low C4) */}
                            <ellipse cx="22" cy="34" rx="5" ry="3.5" fill="#c084fc" />
                            <line x1="26.5" y1="34" x2="26.5" y2="18" stroke="#c084fc" strokeWidth="1.4" />
                            {/* Note 2 (High G4) */}
                            <ellipse cx="72" cy="18" rx="5" ry="3.5" fill="#c084fc" />
                            <line x1="76.5" y1="18" x2="76.5" y2="4" stroke="#c084fc" strokeWidth="1.4" />
                            {/* Curved SLUR Arc over top */}
                            <path d="M 22 14 Q 47 -2 72 4" fill="none" stroke="#c084fc" strokeWidth="2.4" strokeLinecap="round" />
                            <text x="47" y="54" textAnchor="middle" fill="#c084fc" fontSize="9" fontFamily="monospace" fontWeight="bold">SLUR (LEGATO)</text>
                          </g>
                        </g>
                      </g>

                      {/* Formula 3: Triplet 3:2 Graphical Subdivision */}
                      <g transform="translate(16, 228)">
                        <rect width="788" height="82" rx="6" fill="#0c1222" stroke="#10b981" strokeWidth="1.2" />
                        
                        {/* Left Text Explanation */}
                        <g transform="translate(16, 0)">
                          <text x="0" y="20" fill="#34d399" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                            {isId
                              ? '3. SUBDIVISI TRIPLET (TUPLET 3:2)'
                              : isEs
                              ? '3. SUBDIVISIÓN DE TRESILLO (TUPLET 3:2)'
                              : '3. TRIPLET (TUPLET 3:2) SUBDIVISION'}
                          </text>
                          <text x="0" y="40" fill="#e2e8f0" fontSize="12.5">
                            {isId ? (
                              <>Membagi 1 ketukan menjadi <tspan fill="#34d399" fontWeight="bold">3 denyut setara</tspan> (166.7 ms pada 120 BPM menggantikan 2 not seperdelapan standar).</>
                            ) : isEs ? (
                              <>Divide 1 tiempo regular en <tspan fill="#34d399" fontWeight="bold">3 pulsos iguales</tspan> (166.7 ms a 120 BPM en vez de las 2 corcheas estándar).</>
                            ) : (
                              <>Divides 1 regular beat into <tspan fill="#34d399" fontWeight="bold">3 equal pulses</tspan> (166.7 ms at 120 BPM instead of standard 2 eighths).</>
                            )}
                          </text>
                          <text x="0" y="60" fill="#a7f3d0" fontSize="11.5" fontFamily="monospace">
                            {isId
                              ? 'Hitungan Metronom: "1 - trip - let, 2 - trip - let, 3 - trip - let, 4 - trip - let"'
                              : isEs
                              ? 'Conteo del Metrónomo: "1 - tri - ple, 2 - tri - ple, 3 - tri - ple, 4 - tri - ple"'
                              : 'Metronome count: "1 - trip - let, 2 - trip - let, 3 - trip - let, 4 - trip - let"'}
                          </text>
                        </g>

                        {/* Right Visual Drawing: Triplet Beam with Bracket 3 */}
                        <g transform="translate(545, 10)">
                          <rect width="228" height="62" rx="5" fill="#060913" stroke="#10b981" strokeOpacity="0.4" strokeWidth="1" />
                          
                          {/* 3 Beamed Notes */}
                          {[0, 1, 2].map((ti) => (
                            <g key={ti} transform={`translate(${36 + ti * 40}, 0)`}>
                              <ellipse cx="0" cy="42" rx="5" ry="3.5" fill="#10b981" transform="rotate(-15)" />
                              <line x1="4.5" y1="42" x2="4.5" y2="18" stroke="#10b981" strokeWidth="1.5" />
                              <circle cx="0" cy="52" r="2.2" fill="#34d399" />
                              <text x="0" y="58" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontFamily="monospace">
                                {ti === 0 ? '1' : ti === 1 ? 'trip' : 'let'}
                              </text>
                            </g>
                          ))}
                          {/* Triplet Beam */}
                          <line x1="40.5" y1="18" x2="120.5" y2="18" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                          
                          {/* Bracket with Number 3 */}
                          <path d="M 36 12 L 36 8 L 74 8 M 86 8 L 125 8 L 125 12" fill="none" stroke="#6ee7b7" strokeWidth="1.2" />
                          <text x="80" y="11" textAnchor="middle" fill="#a7f3d0" fontSize="11" fontFamily="monospace" fontWeight="bold">3</text>
                          
                          {/* Ratio Badge */}
                          <rect x="144" y="20" width="72" height="22" rx="3" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                          <text x="180" y="35" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontFamily="monospace" fontWeight="bold">3 IN 1 BEAT</text>
                        </g>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Section: Time Signatures & Metric Pulse Architecture */}
              <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      {isId ? 'BAGIAN 1.4 — ARSITEKTUR KETUKAN & METRUM' : isEs ? 'SECCIÓN 1.4 — ARQUITECTURA DE PULSO Y MÉTRICA' : 'SECTION 1.4 — METRIC PULSE ARCHITECTURE'}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {isId
                        ? 'Tanda Birama (Time Signatures): Metrum Sederhana, Majemuk & Asimetris'
                        : isEs
                        ? 'Armaduras de Compás: Métricas Simples, Compuestas y Asimétricas'
                        : 'Time Signatures: Simple, Compound, Cut-Time & Asymmetric Meters'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    {isId ? 'ATAS = JUMLAH KETUK • BAWAH = SATUAN NOT' : isEs ? 'ARRIBA = PULSOS • ABAJO = UNIDAD DE NOTA' : 'TOP = BEATS • BOTTOM = UNIT VALUE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400 text-sm">4/4 (Common Time 𝄴)</span>
                      <span className="text-xs font-mono font-medium text-slate-400">
                        {isId ? '4 KETUK SEDERHANA' : isEs ? 'CUÁDRUPLE SIMPLE' : 'SIMPLE QUADRUPLE'}
                      </span>
                    </div>
                    <div className="font-mono text-xs md:text-sm text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
                      {isId
                        ? '[1: KUAT] – [2: lemah] – [3: Sedang] – [4: lemah]'
                        : isEs
                        ? '[1: FUERTE] – [2: débil] – [3: Medio] – [4: débil]'
                        : '[1: STRONG] – [2: weak] – [3: Medium] – [4: weak]'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isId
                        ? '4 ketukan not seperempat per bar. Fondasi utama sonata klasik, pop, rock, dan R&B.'
                        : isEs
                        ? '4 pulsos de negra por compás. Base de la mayoría de obras clásicas, pop y rock.'
                        : '4 quarter-note beats per bar. Primary foundation of classical sonatas, pop, rock, and jazz.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-300 text-sm">{isId ? '3/4 (Waltz / Tripel)' : isEs ? '3/4 (Vals / Ternario)' : '3/4 (Waltz / Triple)'}</span>
                      <span className="text-xs font-mono font-medium text-slate-400">{isId ? '3 KETUK SEDERHANA' : isEs ? 'TERNARIO SIMPLE' : 'SIMPLE TRIPLE'}</span>
                    </div>
                    <div className="font-mono text-xs md:text-sm text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
                      {isId ? '[1: KUAT] – [2: lemah] – [3: lemah]' : isEs ? '[1: FUERTE] – [2: débil] – [3: débil]' : '[1: STRONG] – [2: weak] – [3: weak]'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isId
                        ? '3 ketukan not seperempat per bar. Menciptakan ayunan waltz (Chopin, Strauss) dan minuet.'
                        : isEs
                        ? '3 pulsos de negra por compás. Pulso característico del vals (Chopin, Strauss) y minuetos.'
                        : '3 quarter-note beats per bar. Creates the buoyant waltz pulse of Chopin, Strauss, and minuets.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-300 text-sm">{isId ? '6/8 (Duple Majemuk)' : isEs ? '6/8 (Binario Compuesto)' : '6/8 (Compound Duple)'}</span>
                      <span className="text-xs font-mono font-medium text-slate-400">{isId ? '2 KETUK BERTITIK' : isEs ? '2 TIEMPOS CON PUNTILLO' : '2 DOTTED BEATS'}</span>
                    </div>
                    <div className="font-mono text-xs md:text-sm text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
                      [1 - 2 - 3] – [4 - 5 - 6] ({isId ? '2 Denyut Utama × 3' : isEs ? '2 Pulsos Principales × 3' : '2 Macro Beats × 3'})
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isId
                        ? '6 not seperdelapan yang dikelompokkan menjadi 2 ketukan besar (not seperempat bertitik). Berbeda dari 3/4 (3×2 vs 2×3)!'
                        : isEs
                        ? '6 corcheas agrupadas en 2 pulsos mayores de negra con puntillo. ¡Diferente de 3/4 (2×3 vs 3×2)!'
                        : '6 eighth notes grouped into 2 macro beats (dotted quarter notes). Distinct from 3/4 (2 groups of 3 vs. 3 groups of 2).'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-300 text-sm">{isId ? '2/2 (Alla Breve 𝄵)' : isEs ? '2/2 (Alla Breve / Compasillo 𝄵)' : '2/2 (Cut Time / Alla Breve 𝄵)'}</span>
                      <span className="text-xs font-mono font-medium text-slate-400">{isId ? '2 KETUK NOT SETENGAH' : isEs ? '2 TIEMPOS DE BLANCA' : '2 HALF-NOTE BEATS'}</span>
                    </div>
                    <div className="font-mono text-xs md:text-sm text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
                      {isId ? '[1: Not Setengah] – [2: Not Setengah]' : isEs ? '[1: Blanca] – [2: Blanca]' : '[1: Half Note] – [2: Half Note]'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isId
                        ? 'Terlihat seperti 4/4 tetapi dihitung dalam 2 ketukan not setengah yang cepat. Umum pada mars, ragtime, dan finale simfoni.'
                        : isEs
                        ? 'Visualmente como 4/4 pero sentido en 2 pulsos ágiles de blanca. Común en marchas, ragtime y finales sinfónicos.'
                        : 'Looks like 4/4 visually but felt in 2 brisk half-note pulses per measure. Ubiquitous in marches, ragtime, and fast finales.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-300 text-sm">{isId ? '12/8 (Blues Lambat / Balada)' : isEs ? '12/8 (Blues Lento / Balada)' : '12/8 (Slow Blues / Ballad)'}</span>
                      <span className="text-xs font-mono font-medium text-slate-400">{isId ? '4 KETUK MAJEMUK' : isEs ? 'CUÁDRUPLE COMPUESTO' : 'COMPOUND QUADRUPLE'}</span>
                    </div>
                    <div className="font-mono text-xs md:text-sm text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
                      [1-2-3] [4-5-6] [7-8-9] [10-11-12]
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isId
                        ? '4 ketukan besar yang masing-masing terbagi menjadi triplet seperdelapan. Standar lagu blues lambat, gospel, dan R&B.'
                        : isEs
                        ? '4 pulsos principales de negra con puntillo subdivididos en tresillos de corchea. Típico en blues lento y baladas.'
                        : '4 macro dotted-quarter beats each subdivided into 3 eighth notes. Standard meter of slow blues, gospel, and soul ballads.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-300 text-sm">5/4 &amp; 7/8 (Odd / Asymmetric)</span>
                      <span className="text-xs font-mono font-medium text-slate-400">ADDITIVE METER</span>
                    </div>
                    <div className="font-mono text-xs md:text-sm text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
                      5/4 = (3+2) or (2+3) • 7/8 = (2+2+3)
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isId
                        ? 'Birama ganjil yang menggabungkan kelompok 2 dan 3 ketukan (contoh: Take Five dalam 5/4 atau musik progresif 7/8).'
                        : 'Asymmetric meters combining duple (2) and triple (3) sub-groups (e.g., Brubeck\'s Take Five in 5/4 or Balkan/Prog 7/8).'}
                    </p>
                  </div>
                </div>
              </div>

              {/* FIG 1.4 & 1.5: Accidentals, Score Roadmap & Classical Ornaments Execution SVG */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-medium font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 1.4 — ACCIDENTALS, SCORE NAVIGATION ROADMAP &amp; ORNAMENT EXECUTION
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Tanda Kromatik, Navigasi Pengulangan Partitur & Eksekusi Ornamen Klasik (Trill, Mordent, Turn, Grace Note)'
                        : 'Chromatic Accidentals, Score Repeat Roadmaps & Classical Ornament Real-Time Execution'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    CLASSICAL ORNAMENT GUIDE
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 280" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <defs>
                      <linearGradient id="strikeBeam" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
                        <stop offset="15%" stopColor="#fbbf24" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="85%" stopColor="#fbbf24" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </linearGradient>
                      <filter id="neonBeam" x="-10%" y="-40%" width="120%" height="180%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <rect width="860" height="280" rx="8" fill="#080c16" stroke="#1e293b" />

                    {/* Top Band: 5 Accidentals & Barline Cancellation Rule */}
                    <g transform="translate(20, 16)">
                      <rect width="820" height="86" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="20" fill="#94a3b8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {isId
                          ? 'A. 5 TANDA KROMATIK (ACCIDENTALS) & ATURAN PEMBATALAN GARIS BIRAMA'
                          : isEs
                          ? 'A. LAS 5 ALTERACIONES CROMÁTICAS Y REGLA DE CANCELACIÓN POR COMPÁS'
                          : 'A. THE 5 CHROMATIC ACCIDENTALS & BARLINE CANCELLATION RULE'}
                      </text>
                      {[
                        {
                          sym: '♯',
                          name: isId ? 'Kres (Sharp)' : isEs ? 'Sostenido' : 'Sharp (Kruis)',
                          shift: isId ? '+1 Semitone' : isEs ? '+1 Semitono' : '+1 Semitone',
                          desc: isId ? 'Naik 1/2 nada' : isEs ? 'Sube 1/2 tono' : 'Raises pitch 1 half-step',
                          col: '#f59e0b'
                        },
                        {
                          sym: '♭',
                          name: isId ? 'Mol (Flat)' : isEs ? 'Bemol' : 'Flat (Mol)',
                          shift: isId ? '-1 Semitone' : isEs ? '-1 Semitono' : '-1 Semitone',
                          desc: isId ? 'Turun 1/2 nada' : isEs ? 'Baja 1/2 tono' : 'Lowers pitch 1 half-step',
                          col: '#38bdf8'
                        },
                        {
                          sym: '♮',
                          name: isId ? 'Pugar (Natural)' : isEs ? 'Becuadro' : 'Natural (Pugar)',
                          shift: isId ? '0 (Reset)' : isEs ? '0 (Reset)' : '0 (Reset)',
                          desc: isId ? 'Mereset ♯ / ♭' : isEs ? 'Cancela ♯ / ♭' : 'Cancels prior ♯/♭',
                          col: '#10b981'
                        },
                        {
                          sym: '𝄪',
                          name: isId ? 'Kres Ganda' : isEs ? 'Doble Sostenido' : 'Double Sharp',
                          shift: isId ? '+2 Semitone' : isEs ? '+2 Semitonos' : '+2 Semitones',
                          desc: isId ? 'Naik 1 nada utuh' : isEs ? 'Sube 1 tono' : 'Raises 1 whole-step',
                          col: '#f43f5e'
                        },
                        {
                          sym: '𝄫',
                          name: isId ? 'Mol Ganda' : isEs ? 'Doble Bemol' : 'Double Flat',
                          shift: isId ? '-2 Semitone' : isEs ? '-2 Semitonos' : '-2 Semitones',
                          desc: isId ? 'Turun 1 nada utuh' : isEs ? 'Baja 1 tono' : 'Lowers 1 whole-step',
                          col: '#a855f7'
                        },
                      ].map((acc, i) => (
                        <g key={i} transform={`translate(${16 + i * 160}, 30)`}>
                          <rect width="150" height="46" rx="4" fill="#0f172a" stroke="#1e293b" />
                          <text x="20" y="30" textAnchor="middle" fill={acc.col} fontSize="20" fontFamily="serif" fontWeight="bold">{acc.sym}</text>
                          <text x="42" y="18" fill="#f8fafc" fontSize="13" fontWeight="bold">{acc.name}</text>
                          <text x="42" y="30" fill={acc.col} fontSize="12" fontFamily="monospace" fontWeight="bold">{acc.shift}</text>
                          <text x="42" y="41" fill="#64748b" fontSize="11">{acc.desc}</text>
                        </g>
                      ))}
                    </g>

                    {/* Bottom Band: 4 Ornaments Written vs. Played */}
                    <g transform="translate(20, 114)">
                      <rect width="820" height="150" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {isId
                          ? 'B. ORNAMEN KLASIK — SIMBOL NOTASI VS. EKSEKUSI WAKTU NYATA'
                          : isEs
                          ? 'B. ORNAMENTOS CLÁSICOS — SÍMBOLO ESCRITO VS. EJECUCIÓN EN TIEMPO REAL'
                          : 'B. CLASSICAL ORNAMENTS — WRITTEN SYMBOL vs. REAL-TIME PITCH EXECUTION'}
                      </text>

                      {[
                        {
                          title: isId ? '1. TRILL (tr~~~)' : isEs ? '1. TRINO (tr~~~)' : '1. TRILL (tr~~~)',
                          written: isId ? 'Not dengan simbol "tr"' : isEs ? 'Nota con símbolo "tr"' : 'C5 with "tr"',
                          played: 'C5 – D5 – C5 – D5 – C5 – D5',
                          desc: isId ? 'Bergantian sangat cepat antara nada pokok dan nada tetangga atas diatonik.' : isEs ? 'Alterna rápidamente entre la nota principal y su vecina superior.' : 'Rapidly alternate between the principal note and the diatonic upper neighbor.',
                          col: '#38bdf8'
                        },
                        {
                          title: isId ? '2. MORDENT ATAS / BAWAH' : isEs ? '2. MORDENTE SUP. / INF.' : '2. UPPER / LOWER MORDENT',
                          written: isId ? 'Not dengan simbol zigzag' : isEs ? 'Nota con zigzag' : 'C5 with zigzag (dc / dd)',
                          played: isId ? 'Atas: C–D–C | Bawah: C–B–C' : isEs ? 'Sup: Do–Re–Do | Inf: Do–Si–Do' : 'Upper: C–D–C  |  Lower: C–B–C',
                          desc: isId ? 'Hentakan cepat 3-nada pada ketukan lalu langsung kembali ke nada utama.' : isEs ? 'Ataque rápido de 3 notas que vuelve de inmediato a la nota principal.' : 'Single crisp 3-note snap on the beat returning immediately to the main note.',
                          col: '#10b981'
                        },
                        {
                          title: isId ? '3. TURN (Gruppetto)' : isEs ? '3. GRUPETO (Turn)' : '3. TURN (Gruppetto de)',
                          written: isId ? 'Not dengan kurva S (∽)' : isEs ? 'Nota con curva S (∽)' : 'C5 with S-curve (∽)',
                          played: 'D5 → C5 → B4 → C5',
                          desc: isId ? 'Mengitari nada utama: Tetangga Atas → Pokok → Tetangga Bawah → Pokok.' : isEs ? 'Rodea la nota: Vecina Sup. → Principal → Vecina Inf. → Principal.' : 'Coils around the main note: Upper Neighbor → Main → Lower Neighbor → Main.',
                          col: '#f59e0b'
                        },
                        {
                          title: isId ? '4. GRACE NOTE & ARPEGGIO' : isEs ? '4. APOYATURA Y ARPEGIADO' : '4. GRACE NOTE & ARPEGGIANDO',
                          written: isId ? 'Not coret miring | Akor ombak' : isEs ? 'Nota tachada | Acorde ondulado' : 'Slashed 𝅘𝅥𝅮 | Wavy Chord 𝆃',
                          played: isId ? 'Petik kilat | Arpeggio bawah ke atas' : isEs ? 'Golpe instantáneo | Arpegio abajo-arriba' : 'Instant pre-beat flick | Bottom→Top roll',
                          desc: isId ? 'Acciaccatura dipetik kilat sebelum ketukan; garis ombak memainkan akor dari bawah ke atas.' : isEs ? 'Apoyatura se toca rápida antes del pulso; línea ondulada arpegia de grave a agudo.' : 'Acciaccatura is played rapidly just before/on the beat; wavy vertical line rolls chord bottom-to-top.',
                          col: '#a855f7'
                        },
                      ].map((orn, i) => (
                        <g key={i} transform={`translate(${16 + i * 200}, 34)`}>
                          <rect width="190" height="104" rx="5" fill="#0f172a" stroke="#1e293b" />
                          <line x1="0" y1="0" x2="190" y2="0" stroke={orn.col} strokeWidth="2.5" />
                          <text x="10" y="18" fill={orn.col} fontSize="13" fontFamily="monospace" fontWeight="bold">{orn.title}</text>
                          <text x="10" y="34" fill="#94a3b8" fontSize="12" fontFamily="monospace">{isId ? 'Tercatat:' : isEs ? 'Escrito:' : 'Written:'} <tspan fill="#e2e8f0">{orn.written}</tspan></text>
                          <rect x="10" y="42" width="170" height="20" rx="3" fill="#0a0f1d" stroke="#334155" />
                          <text x="95" y="55" textAnchor="middle" fill="#fde68a" fontSize="12" fontFamily="monospace" fontWeight="bold">{orn.played}</text>
                          <text x="10" y="76" fill="#cbd5e1" fontSize="11.5">{orn.desc.slice(0, 44)}</text>
                          <text x="10" y="88" fill="#cbd5e1" fontSize="11.5">{orn.desc.slice(44, 90)}</text>
                          <text x="10" y="99" fill="#cbd5e1" fontSize="11.5">{orn.desc.slice(90)}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                </div>

                {/* Score Navigation & Dynamics Reference Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="font-mono font-bold text-cyan-400 uppercase">
                      {isId ? 'PETA NAVIGASI & PENANDA PARTITUR' : isEs ? 'SIGNOS DE NAVEGACIÓN Y REPETICIÓN' : 'SCORE NAVIGATION ROADMAP MARKS'}
                    </div>
                    <ul className="space-y-1.5 text-slate-300">
                      <li>• <b>{isId ? 'Titik Ulang' : isEs ? 'Barras de Repetición' : 'Repeat Dots'} (<code className="text-cyan-300 font-mono">|:  :|</code>):</b> {isId ? 'Ulangi bagian di antara dua tanda titik dua; jika hanya ada :|, ulangi dari awal lagu.' : isEs ? 'Repite la sección encerrada entre las barras con dos puntos; si solo hay :|, repite desde el inicio.' : 'Loop the section enclosed between the double-dotted barlines.'}</li>
                      <li>• <b>{isId ? 'Rumah 1 & 2' : isEs ? 'Casillas 1ª y 2ª' : '1st & 2nd Endings'} (<code className="text-cyan-300 font-mono">1. / 2. Volta</code>):</b> {isId ? 'Mainkan kurung [1.] pada putaran pertama, lalu lompati [1.] langsung ke [2.] pada putaran kedua.' : isEs ? 'Toca la casilla [1.] en la primera vuelta; en la repetición, salta directamente a la casilla [2.].' : 'Play bracket [1.] on the first pass; on repeat, skip [1.] and jump directly into bracket [2.].'}</li>
                      <li>• <b>D.C. al Fine / D.S. al Coda:</b> {isId ? 'Da Capo = kembali ke bar 1 sampai kata Fine; Dal Segno = kembali ke simbol 𝄋 lalu lompat ke Coda 𝄌.' : isEs ? 'Da Capo = vuelve al compás 1 hasta Fine; Dal Segno = vuelve al símbolo 𝄋 y salta a la Coda 𝄌.' : 'Da Capo = return to Measure 1 until Fine; Dal Segno = jump back to symbol 𝄋 then leap to Coda 𝄌.'}</li>
                      <li>• <b>8va / 8vb / Loco:</b> {isId ? 'Mainkan 1 oktaf lebih tinggi (8va) atau 1 oktaf lebih rendah (8vb) agar terhindar dari tumpukan garis bantu ekstrem.' : isEs ? 'Toca 1 octava más alta (8va) o más baja (8vb); loco restaura el registro normal.' : 'Play 1 octave higher (8va) or lower (8vb) than written; loco restores normal register.'}</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="font-mono font-bold text-cyan-400 uppercase">
                      {isId ? 'GRADASI DINAMIKA & PEMETAAN VELOCITY MIDI' : isEs ? 'GRADIENTE DINÁMICO Y VELOCIDAD MIDI' : 'Dynamic Gradient & MIDI Velocity Mapping'}
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-xs md:text-sm text-center">
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-cyan-400 font-bold block">pp / p</span>
                        <span className="text-slate-400 text-xs">Vel: 25–55</span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-slate-200 font-bold block">mp / mf</span>
                        <span className="text-slate-400 text-xs">Vel: 60–88</span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-slate-200 font-bold block">f / ff</span>
                        <span className="text-slate-400 text-xs">Vel: 95–127</span>
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Pada piano akustik dan MIDI, keras-lembutnya suara (динамика / velocity) dikendalikan oleh kecepatan turunnya tuts (key descent speed), ditambah tanda perubahan bertahap Crescendo (<) dan Diminuendo (>).'
                        : 'On acoustic and MIDI pianos, volume (velocity 1–127) is governed by key descent speed, shaped over time by hairpin Crescendo (<) and Diminuendo (>) markings.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* FIG 1.5: Key Signature Placement on Staff (7 Sharps & 7 Flats) */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 1.5 — KEY SIGNATURE STAFF GEOMETRY (ORDER OF 7 SHARPS &amp; 7 FLATS)
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Urutan Baku Penempatan 7 Kruis (F-C-G-D-A-E-B) & 7 Mol (B-E-A-D-G-C-F) pada Paranada'
                        : 'Canonical Staff Placement of the 7 Sharps (F-C-G-D-A-E-B) & 7 Flats (B-E-A-D-G-C-F)'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    INSTANT KEY IDENTIFICATION
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 190" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="190" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Left Panel: 7 Sharps Zig-Zag Pattern */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="158" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#f59e0b" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        A. ORDER OF 7 SHARPS: F♯ – C♯ – G♯ – D♯ – A♯ – E♯ – B♯
                      </text>
                      {[42, 56, 70, 84, 98].map((y, i) => (
                        <line key={i} x1="20" y1={y} x2="380" y2={y} stroke="#334155" strokeWidth="1.3" />
                      ))}
                      <text x="28" y="88" fill="#38bdf8" fontSize="36" fontFamily="serif">𝄞</text>
                      {[
                        { s: 'F♯', x: 85, y: 42, k: 'G Maj' },
                        { s: 'C♯', x: 125, y: 63, k: 'D Maj' },
                        { s: 'G♯', x: 165, y: 35, k: 'A Maj' },
                        { s: 'D♯', x: 205, y: 56, k: 'E Maj' },
                        { s: 'A♯', x: 245, y: 77, k: 'B Maj' },
                        { s: 'E♯', x: 285, y: 49, k: 'F♯ Maj' },
                        { s: 'B♯', x: 325, y: 70, k: 'C♯ Maj' },
                      ].map((sh, i) => (
                        <g key={i}>
                          <text x={sh.x} y={sh.y + 6} textAnchor="middle" fill="#f59e0b" fontSize="16" fontFamily="serif" fontWeight="bold">♯</text>
                          <text x={sh.x} y="118" textAnchor="middle" fill="#fde68a" fontSize="12.5" fontFamily="monospace" fontWeight="bold">{sh.s}</text>
                          <text x={sh.x} y="132" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">{sh.k}</text>
                        </g>
                      ))}
                      <text x="200" y="149" textAnchor="middle" fill="#34d399" fontSize="12" fontFamily="monospace" fontWeight="bold">
                        RULE: Last Sharp + 1 Semitone UP = Major Key Tonic
                      </text>
                    </g>

                    {/* Right Panel: 7 Flats Zig-Zag Pattern */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="158" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        B. ORDER OF 7 FLATS: B♭ – E♭ – A♭ – D♭ – G♭ – C♭ – F♭
                      </text>
                      {[42, 56, 70, 84, 98].map((y, i) => (
                        <line key={i} x1="20" y1={y} x2="380" y2={y} stroke="#334155" strokeWidth="1.3" />
                      ))}
                      <text x="28" y="88" fill="#38bdf8" fontSize="36" fontFamily="serif">𝄞</text>
                      {[
                        { s: 'B♭', x: 85, y: 70, k: 'F Maj' },
                        { s: 'E♭', x: 125, y: 49, k: 'B♭ Maj' },
                        { s: 'A♭', x: 165, y: 77, k: 'E♭ Maj' },
                        { s: 'D♭', x: 205, y: 56, k: 'A♭ Maj' },
                        { s: 'G♭', x: 245, y: 84, k: 'D♭ Maj' },
                        { s: 'C♭', x: 285, y: 63, k: 'G♭ Maj' },
                        { s: 'F♭', x: 325, y: 91, k: 'C♭ Maj' },
                      ].map((fl, i) => (
                        <g key={i}>
                          <text x={fl.x} y={fl.y + 5} textAnchor="middle" fill="#38bdf8" fontSize="16" fontFamily="serif" fontWeight="bold">♭</text>
                          <text x={fl.x} y="118" textAnchor="middle" fill="#7dd3fc" fontSize="12.5" fontFamily="monospace" fontWeight="bold">{fl.s}</text>
                          <text x={fl.x} y="132" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">{fl.k}</text>
                        </g>
                      ))}
                      <text x="200" y="149" textAnchor="middle" fill="#7dd3fc" fontSize="12" fontFamily="monospace" fontWeight="bold">
                        RULE: Second-to-Last Flat = Major Key Tonic (1♭ = F Maj)
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 1.6: Musical Form & Score Navigation Flow Diagram */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 1.6 — SCORE NAVIGATION ROADMAP: REPEAT SIGNS, VOLTA BRACKETS (1. / 2.) &amp; D.S. AL CODA
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Ilustrasi Alur Pembacaan Bar Pengulangan (Repeat Barlines), Kurung Volta 1 & 2, serta Lompatan D.S. al Coda'
                        : 'Visual Execution Flow for Repeat Barlines, 1st/2nd Ending Brackets (Volta), and D.S. al Coda Jumps'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    SCORE ROADMAP FLOW
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 185" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="185" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Left Box: 1st & 2nd Ending Volta Flow */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="152" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        A. 1st &amp; 2nd ENDING BRACKETS (PRIMA &amp; SECONDA VOLTA)
                      </text>

                      {/* 4 Measure Boxes: Bar 1 -> Bar 2 -> [1. Bar 3 :|] -> [2. Bar 4] */}
                      <g transform="translate(18, 52)">
                        {/* Start Repeat Barline */}
                        <line x1="0" y1="6" x2="0" y2="54" stroke="#f59e0b" strokeWidth="3.5" />
                        <line x1="5" y1="6" x2="5" y2="54" stroke="#f59e0b" strokeWidth="1.2" />
                        <circle cx="11" cy="24" r="2.2" fill="#f59e0b" />
                        <circle cx="11" cy="36" r="2.2" fill="#f59e0b" />

                        <rect x="18" y="10" width="76" height="40" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="56" y="34" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontFamily="monospace" fontWeight="bold">{L("BAR 1", "BIRAMA 1", "COMPÁS 1")}</text>

                        <rect x="102" y="10" width="76" height="40" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="140" y="34" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontFamily="monospace" fontWeight="bold">{L("BAR 2", "BIRAMA 2", "COMPÁS 2")}</text>

                        {/* 1st Ending Bracket */}
                        <path d="M 186 4 L 186 -8 L 268 -8 L 268 4" fill="none" stroke="#10b981" strokeWidth="1.8" />
                        <text x="192" y="2" fill="#34d399" fontSize="12" fontFamily="monospace" fontWeight="bold">1.</text>
                        <rect x="186" y="10" width="76" height="40" rx="4" fill="#064e3b" stroke="#10b981" />
                        <text x="224" y="34" textAnchor="middle" fill="#a7f3d0" fontSize="13" fontFamily="monospace" fontWeight="bold">{L("BAR 3", "BIRAMA 3", "COMPÁS 3")}</text>

                        {/* End Repeat Barline */}
                        <circle cx="267" cy="24" r="2.2" fill="#f59e0b" />
                        <circle cx="267" cy="36" r="2.2" fill="#f59e0b" />
                        <line x1="273" y1="6" x2="273" y2="54" stroke="#f59e0b" strokeWidth="1.2" />
                        <line x1="278" y1="6" x2="278" y2="54" stroke="#f59e0b" strokeWidth="3.5" />

                        {/* 2nd Ending Bracket */}
                        <path d="M 288 4 L 288 -8 L 364 -8" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
                        <text x="294" y="2" fill="#38bdf8" fontSize="12" fontFamily="monospace" fontWeight="bold">2.</text>
                        <rect x="288" y="10" width="76" height="40" rx="4" fill="#083344" stroke="#38bdf8" />
                        <text x="326" y="34" textAnchor="middle" fill="#7dd3fc" fontSize="13" fontFamily="monospace" fontWeight="bold">{L("BAR 4", "BIRAMA 4", "COMPÁS 4")}</text>

                        {/* Loopback Arrow & Skip Arrow */}
                        <path d="M 224 52 Q 120 76 18 52" fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="3 2" />
                        <path d="M 140 10 Q 230 -24 326 10" fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="3 2" />
                      </g>

                      <text x="200" y="140" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="monospace">
                        EXECUTION ORDER: Bar 1 → Bar 2 → [1. Bar 3] → Bar 1 → Bar 2 → [2. Bar 4]
                      </text>
                    </g>

                    {/* Right Box: D.S. al Coda Flow */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="152" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#a855f7" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        B. DAL SEGNO AL CODA (𝄋 → TO CODA 𝄌 → CODA 𝄌)
                      </text>

                      <g transform="translate(18, 48)">
                        <rect x="0" y="12" width="66" height="38" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="33" y="35" textAnchor="middle" fill="#94a3b8" fontSize="12.5" fontFamily="monospace">Intro</text>

                        <rect x="74" y="12" width="84" height="38" rx="4" fill="#2e1065" stroke="#a855f7" />
                        <text x="116" y="28" textAnchor="middle" fill="#e9d5ff" fontSize="12" fontFamily="monospace" fontWeight="bold">𝄋 SEGNO</text>
                        <text x="116" y="41" textAnchor="middle" fill="#c084fc" fontSize="11.5" fontFamily="monospace">{L("To Coda 𝄌", "Ke Coda 𝄌", "A Coda 𝄌")}</text>

                        <rect x="166" y="12" width="92" height="38" rx="4" fill="#0f172a" stroke="#f59e0b" />
                        <text x="212" y="28" textAnchor="middle" fill="#fde68a" fontSize="12" fontFamily="monospace" fontWeight="bold">{L("Verse / Bridge", "Bait / Bridge", "Estrofa / Puente")}</text>
                        <text x="212" y="41" textAnchor="middle" fill="#f59e0b" fontSize="11.5" fontFamily="monospace">D.S. al Coda</text>

                        <rect x="272" y="12" width="92" height="38" rx="4" fill="#064e3b" stroke="#10b981" />
                        <text x="318" y="28" textAnchor="middle" fill="#a7f3d0" fontSize="12.5" fontFamily="monospace" fontWeight="bold">𝄌 CODA</text>
                        <text x="318" y="41" textAnchor="middle" fill="#34d399" fontSize="11.5" fontFamily="monospace">{L("Final Ending", "Akhiran Lagu", "Final Definitivo")}</text>

                        {/* Jump back to Segno arrow */}
                        <path d="M 212 52 Q 164 74 116 52" fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="3 2" />
                        {/* Jump from To Coda to Coda */}
                        <path d="M 140 12 Q 230 -16 318 12" fill="none" stroke="#10b981" strokeWidth="1.8" strokeDasharray="3 2" />
                      </g>

                      <text x="200" y="140" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="monospace">
                        At &quot;D.S. al Coda&quot;, jump back to 𝄋, play until &quot;To Coda 𝄌&quot;, then leap to 𝄌 Coda.
                      </text>
                    </g>
                  </svg>
                </div>
              </div>
            </article>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 2: Falling Notes, Wait Mode, Sync Calibration & Pedaling */}
          {/* ========================================================================= */}
          {activeChapter === 'falling' && (
            <article className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
              <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs md:text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 02 • VISUALISASI PIANO ROLL & REKAYASA LATIHAN' : isEs ? 'MÓDULO 02 • PIANO ROLL Y PRÁCTICA' : 'MODULE 02 • PIANO ROLL & PRACTICE ENGINEERING'}
                    </span>
                    <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700">
                      3 TECHNICAL DIAGRAMS • HIT WINDOWS &amp; LATENCY
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {isId
                      ? 'Falling Notes, Mekanika Wait Mode & Kalibrasi Latensi Audio-MIDI'
                      : isEs
                      ? 'Notas Cayendo, Mecánica de Modo Espera y Calibración de Latencia'
                      : 'Falling Notes Geometry, Wait Mode Engines & Audio-MIDI Latency Calibration'}
                  </h2>
                  <p className="text-sm md:text-[15px] text-slate-200 mt-3 leading-relaxed max-w-4xl">
                    {isId
                      ? 'Mode Falling Notes (Piano Roll vertikal) memproyeksikan aliran waktu musik langsung di atas geometri fisik 88 tuts piano. Memahami anatomi balok not, jendela toleransi milidetik hit window, serta sinkronisasi audio-MIDI akan menyempurnakan presisi dan akurasi permainan Anda secara real-time.'
                      : isEs
                      ? 'El modo Falling Notes proyecta el flujo temporal directamente sobre la geometría de las 88 teclas. Comprender la anatomía de las barras, las ventanas de precisión en milisegundos y la sincronización audio-MIDI optimiza la precisión en tiempo real.'
                      : 'Vertical Piano Roll visualization projects musical time directly onto the physical geometry of the 88-keybed. Mastering note-bar anatomy, millisecond hit windows, and audio-MIDI sync calibration maximizes your timing accuracy in real-time.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectChapter('exercises')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 text-xs md:text-sm font-mono font-bold transition-all flex items-center gap-2 flex-shrink-0 shadow-sm active:scale-95 cursor-pointer"
                  title={isId ? 'Buka Generator Latihan Drill (Bab 06)' : isEs ? 'Abrir Generador de Drills (Cap. 06)' : 'Open Drill Generator (Ch. 06)'}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{t.jumpToDrills}</span>
                  <span>→</span>
                </button>
              </div>

              {/* FIG 2.1: Piano Roll Time-Pitch Coordinate Schematic */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 2.1 — PIANO ROLL TIME-PITCH COORDINATE &amp; STRIKE-LINE SCHEMATIC
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Anatomi Balok Not (Attack Edge, Sustain Body, Release Tail) & Garis Pukul (Strike Line t₀)'
                        : 'Note Bar Anatomy (Leading Attack Edge, Sustain Body, Release Tail) & Strike Line (t₀)'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    X = PITCH (88 KEYS) • Y = LOOKAHEAD TIME
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 280" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="280" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Horizontal Beat / Bar Grid Lines */}
                    <line x1="40" y1="45" x2="560" y2="45" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="48" y="40" fill="#64748b" fontSize="12" fontFamily="monospace">
                      {isId ? 't + 1000 ms (2 Ketuk di Depan)' : isEs ? 't + 1000 ms (2 Tiempos Adelante)' : 't + 1000 ms (2 Beats Ahead)'}
                    </text>
                    <line x1="40" y1="115" x2="560" y2="115" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="48" y="110" fill="#64748b" fontSize="12" fontFamily="monospace">
                      {isId ? 't + 500 ms (1 Ketuk di Depan)' : isEs ? 't + 500 ms (1 Tiempo Adelante)' : 't + 500 ms (1 Beat Ahead)'}
                    </text>

                    {/* Vertical Key Lanes */}
                    {[120, 170, 220, 270, 320, 370, 420, 470, 520].map((x, i) => (
                      <line key={i} x1={x} y1="20" x2={x} y2="195" stroke="#0f172a" strokeWidth="1" />
                    ))}

                    {/* Left Hand Bass Note (Sustained 2-beat bar on C3, Purple) */}
                    <g transform="translate(124, 55)">
                      <rect width="42" height="140" rx="4" fill="#3b0764" stroke="#a855f7" strokeWidth="1.5" />
                      <line x1="0" y1="138" x2="42" y2="138" stroke="#facc15" strokeWidth="3" />
                      <text x="21" y="75" textAnchor="middle" fill="#e9d5ff" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'TI: C3' : isEs ? 'MI: Do3' : 'LH: C3'}
                      </text>
                      <text x="21" y="90" textAnchor="middle" fill="#c084fc" fontSize="11.5" fontFamily="monospace">
                        {isId ? 'Jari: 5' : isEs ? 'Dedo: 5' : 'Fing: 5'}
                      </text>
                      <text x="21" y="128" textAnchor="middle" fill="#fde68a" fontSize="11.5" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'PUKUL' : isEs ? 'GOLPE' : 'ONSET'}
                      </text>
                    </g>

                    {/* Right Hand Chord / Melody Notes (Cyan) */}
                    {/* E4 Quarter Note */}
                    <g transform="translate(274, 125)">
                      <rect width="42" height="70" rx="4" fill="#083344" stroke="#06b6d4" strokeWidth="1.5" />
                      <line x1="0" y1="68" x2="42" y2="68" stroke="#facc15" strokeWidth="3" />
                      <text x="21" y="34" textAnchor="middle" fill="#cffafe" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'TK: E4' : isEs ? 'MD: Mi4' : 'RH: E4'}
                      </text>
                      <text x="21" y="48" textAnchor="middle" fill="#67e8f9" fontSize="11.5" fontFamily="monospace">
                        {isId ? 'Jari: 1' : isEs ? 'Dedo: 1' : 'Fing: 1'}
                      </text>
                    </g>

                    {/* G4 Staccato Note (approaching) */}
                    <g transform="translate(374, 82)">
                      <rect width="42" height="28" rx="4" fill="#083344" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="21" y="18" textAnchor="middle" fill="#cffafe" fontSize="12" fontFamily="monospace" fontWeight="bold">G4 (2)</text>
                    </g>

                    {/* C5 Long Note */}
                    <g transform="translate(474, 30)">
                      <rect width="42" height="80" rx="4" fill="#083344" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="21" y="45" textAnchor="middle" fill="#cffafe" fontSize="12.5" fontFamily="monospace" fontWeight="bold">C5 (5)</text>
                      <text x="21" y="12" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">
                        {isId ? 'EKOR LEPAS' : isEs ? 'COLA FINAL' : 'RELEASE TAIL'}
                      </text>
                    </g>

                    {/* Strike Line t = 0 (Luminous Laser Beam) */}
                    <line x1="40" y1="195" x2="560" y2="195" stroke="url(#strikeBeam)" strokeWidth="4" filter="url(#neonBeam)" />
                    <line x1="40" y1="195" x2="560" y2="195" stroke="#ffffff" strokeWidth="1.5" />
                    <rect x="44" y="176" width="166" height="16" rx="3" fill="#451a03" stroke="#f59e0b" strokeWidth="1.2" />
                    <text x="127" y="188" textAnchor="middle" fill="#fef08a" fontSize="11.5" fontFamily="monospace" fontWeight="bold">
                      {isId ? 'GARIS PUKUL (t = 0 ms)' : isEs ? 'LÍNEA DE GOLPE (t = 0 ms)' : 'STRIKE LINE (t = 0 ms)'}
                    </text>

                    {/* Bottom Keybed */}
                    <g transform="translate(120, 196)">
                      {['C3', 'D3', 'E3', 'E4', 'F4', 'G4', 'A4', 'C5'].map((k, i) => {
                        const active = k === 'C3' || k === 'E4';
                        return (
                          <g key={i} transform={`translate(${i * 50}, 0)`}>
                            <rect
                              width="48"
                              height="66"
                              rx="3"
                              fill={active ? '#1e293b' : '#0f172a'}
                              stroke={active ? '#f59e0b' : '#334155'}
                              strokeWidth={active ? 2 : 1}
                            />
                            <text x="24" y="54" textAnchor="middle" fill={active ? '#fde68a' : '#94a3b8'} fontSize="13" fontFamily="monospace" fontWeight="bold">
                              {k}
                            </text>
                          </g>
                        );
                      })}
                    </g>

                    {/* Right Side Technical Specification Legend */}
                    <g transform="translate(578, 20)">
                      <rect width="262" height="242" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="22" fill="#38bdf8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'ANATOMI BALOK NOT JATUH' : isEs ? 'ANATOMÍA DE NOTAS QUE CAEN' : 'ANATOMY OF A FALLING NOTE BAR'}
                      </text>
                      <text x="14" y="46" fill="#fde68a" fontSize="12.5" fontWeight="bold">
                        {isId ? '1. Ujung Bawah (Titik Serang Awal)' : isEs ? '1. Borde Inferior (Ataque Inicial)' : '1. Bottom Edge (Attack Transient)'}
                      </text>
                      <text x="14" y="61" fill="#94a3b8" fontSize="11.5">
                        {isId ? 'Tekan tuts fisik tepat milidetik' : isEs ? 'Pulsa la tecla física en el milisegundo' : 'Press the physical key the exact millisecond'}
                      </text>
                      <text x="14" y="73" fill="#94a3b8" fontSize="11.5">
                        {isId ? 'ujung bawah menyentuh Garis Pukul.' : isEs ? 'que el borde toca la Línea de Golpe.' : 'the bottom edge touches the Strike Line.'}
                      </text>

                      <text x="14" y="98" fill="#67e8f9" fontSize="12.5" fontWeight="bold">
                        {isId ? '2. Panjang Vertikal (Durasi Tahan)' : isEs ? '2. Longitud Vertical (Sostenido)' : '2. Vertical Height (Sustain Duration)'}
                      </text>
                      <text x="14" y="113" fill="#94a3b8" fontSize="11.5">
                        {isId ? 'Tahan tuts tertekan sepanjang balok' : isEs ? 'Mantén la tecla pulsada toda la barra' : 'Keep the key depressed for the entire vertical'}
                      </text>
                      <text x="14" y="125" fill="#94a3b8" fontSize="11.5">
                        {isId ? 'untuk menjaga resonansi akustik.' : isEs ? 'para sostener la resonancia completa.' : 'length of the bar to sustain full acoustic resonance.'}
                      </text>

                      <text x="14" y="150" fill="#a78bfa" fontSize="12.5" fontWeight="bold">
                        {isId ? '3. Ujung Atas (Titik Lepas Tuts)' : isEs ? '3. Borde Superior (Liberación)' : '3. Top Edge (Key Release Point)'}
                      </text>
                      <text x="14" y="165" fill="#94a3b8" fontSize="11.5">
                        {isId ? 'Angkat jari bersih saat ekor lewat' : isEs ? 'Levanta el dedo al pasar la cola' : 'Lift your finger cleanly as the top tail crosses'}
                      </text>
                      <text x="14" y="177" fill="#94a3b8" fontSize="11.5">
                        {isId ? 'agar harmoni tidak bertabrakan.' : isEs ? 'para que las notas no se emborronen.' : 'the Strike Line so consecutive harmonies don&apos;t blur.'}
                      </text>

                      <rect x="14" y="192" width="234" height="38" rx="4" fill="#0f172a" stroke="#334155" />
                      <text x="24" y="208" fill="#e2e8f0" fontSize="11.5" fontFamily="monospace">
                        {isId ? '• Sian/Biru = Tangan Kanan (Treble)' : isEs ? '• Cian/Azul = Mano Derecha (Sol)' : '• Cyan/Blue = Right Hand (Treble)'}
                      </text>
                      <text x="24" y="222" fill="#e2e8f0" fontSize="11.5" fontFamily="monospace">
                        {isId ? '• Ungu/Indigo = Tangan Kiri (Bass)' : isEs ? '• Púrpura = Mano Izquierda (Fa)' : '• Purple/Indigo = Left Hand (Bass)'}
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Section 2.2: Wait Mode Engines Comparison */}
              <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      {isId ? 'BAGIAN 2.2 — SUB-ENGINE MODE TUNGGU & EVALUASI' : isEs ? 'SECCIÓN 2.2 — SUBMOTORES DE MODO ESPERA' : 'SECTION 2.2 — OCTAVIA PLAYBACK & WAIT MODE SUB-ENGINES'}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {isId
                        ? 'Perbandingan 4 Mode Latihan & Evaluasi Input di Octavia'
                        : isEs
                        ? 'Comparación de los 4 Modos de Práctica y Evaluación en Octavia'
                        : 'Comparison of the 4 Practice & Evaluation Modes in Octavia'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    {isId ? 'ARSITEKTUR SELEKSI MODE' : isEs ? 'ARQUITECTURA DE MODOS' : 'MODE SELECTION ARCHITECTURE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-200 text-sm">
                        {isId ? '01. Mode Tunggu Ketat (Strict Wait)' : isEs ? '01. Práctica Estricta (Modo Espera)' : '01. Strict Practice (Wait Mode: Strict)'}
                      </span>
                      <span className="text-xs font-mono font-medium bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {isId ? 'AKURASI NADA' : isEs ? 'PRECISIÓN TONAL' : 'PITCH ACCURACY'}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Waktu lagu membeku tepat di garis pukul setiap kali ada nada baru. Lagu hanya akan kembali berjalan setelah Anda menekan seluruh nada yang diminta (baik nada tunggal maupun akor polifonik). Sangat ideal untuk menghafal bacaan not baru dan posisi jari tanpa kepanikan tempo.'
                        : isEs
                        ? 'La reproducción se congela en la línea de golpe ante cada nueva nota. Solo continúa cuando tocas todas las teclas requeridas. Ideal para memorizar posiciones sin ansiedad de tiempo.'
                        : 'Playhead freezes at the exact onset timestamp of every required note or chord. Playback resumes only when all required MIDI pitches at that timestamp are depressed. Ideal for initial sight-reading and finger-mapping.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400 text-sm">
                        {isId ? '02. Mode Tunggu Fleksibel (Lenient)' : isEs ? '02. Práctica Flexible (Modo Continuo)' : '02. Lenient Practice (Wait / Non-Stop)'}
                      </span>
                      <span className="text-xs font-mono font-medium bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {isId ? 'ALIRAN & FRASERING' : isEs ? 'FLUIDEZ Y FRASEO' : 'FLOW & PHRASING'}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Memberikan jendela toleransi yang lebih longgar agar alur kalimat musik tidak mudah tersendat. Dapat dikombinasikan dengan opsi Non-Stop atau pemilihan tangan terpisah (Left Hand / Right Hand / Both Hands).'
                        : isEs
                        ? 'Ofrece una ventana de tolerancia más amplia para mantener el flujo musical. Permite aislar mano izquierda, derecha o ambas sin perder impulso.'
                        : 'Provides a wider pre-satisfaction window and optional Non-Stop flow, allowing you to isolate Left Hand, Right Hand, or Both Hands while maintaining musical momentum.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-200 text-sm">
                        {isId ? '03. Mode Pertunjukan Peringkat (Retical)' : isEs ? '03. Modo Competitivo (Ranked)' : '03. Retical Mode (Ranked Performance)'}
                      </span>
                      <span className="text-xs font-mono font-medium bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {isId ? 'KOMPETITIF' : isEs ? 'COMPETITIVO' : 'COMPETITIVE'}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Lagu berjalan tanpa henti pada tempo penuh dengan penguncian Accuracy Level 5 (jendela PERFECT ±100 ms). Setiap ketukan dinilai secara real-time untuk menghitung Performance Score (PS) di Leaderboard.'
                        : isEs
                        ? 'Ejecución ininterrumpida a tempo real con nivel 5 de precisión bloqueado (±100 ms para PERFECT), barra de vida y sin rebobinado para puntuación oficial.'
                        : 'Uninterrupted real-time performance with locked Accuracy Level 5 (±100 ms PERFECT window), HP bar, and seeking disabled for verified leaderboard scoring.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400 text-sm">
                        {isId ? '04. Autoplay & Looping Birama A–B' : isEs ? '04. Reproducción Automática y Bucle A–B' : '04. Autoplay & A–B Bar Looping'}
                      </span>
                      <span className="text-xs font-mono font-medium bg-cyan-950/60 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                        {isId ? 'ANALISIS' : isEs ? 'ANÁLISIS' : 'ANALYSIS'}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Dengarkan referensi artikulasi, dinamika, dan animasi tangan 3D secara otomatis. Gunakan fitur Loop (Titik A ke Titik B) di TopBar untuk mengulang bagian sulit secara terus-menerus.'
                        : isEs
                        ? 'Observa fraseo de referencia, dinámicas y animación de manos 3D. Usa los puntos de bucle A-B en la barra superior para repetir pasajes difíciles.'
                        : 'Observe reference phrasing, dynamics, and 3D hand choreography automatically, or set A–B measure loop points in the TopBar to drill difficult passages.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* FIG 2.2: Hit Judgment Timing Window & Latency Calibration Diagram */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      {isId
                        ? 'FIG 2.2 — JENDELA MILIDETIK PENILAIAN HIT & DUA KALIBRASI LATENSI'
                        : isEs
                        ? 'FIG 2.2 — VENTANAS DE PRECISIÓN EN MILISEGUNDOS Y DOBLE CALIBRACIÓN'
                        : 'FIG 2.2 — MILLISECOND HIT JUDGMENT WINDOWS & DUAL LATENCY CALIBRATION'}
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Kurva Penilaian Ketukan (Perfect / Great / Good) & Perbedaan Hitbox Shift vs. Audio Sync Offset'
                        : isEs
                        ? 'Ventanas de Juicio Temporal (Perfect / Great / Good) y Ajuste de Hitbox vs Audio Sync'
                        : 'Timing Judgment Windows (Perfect / Great / Good) & Hitbox Shift vs. Audio Sync Calibration'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    {isId ? 'STANDAR AKURASI LEVEL 5' : isEs ? 'ESTÁNDAR NIVEL 5' : 'ACCURACY LEVEL 5 STANDARD'}
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 220" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="220" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Horizontal Timing Axis (-250ms to +250ms) */}
                    <g transform="translate(50, 25)">
                      {/* Miss Left */}
                      <rect x="0" y="35" width="90" height="52" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
                      <text x="45" y="58" textAnchor="middle" fill="#fca5a5" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'MISS AWAL' : isEs ? 'FALLO TEMPRANO' : 'EARLY MISS'}
                      </text>
                      <text x="45" y="74" textAnchor="middle" fill="#f87171" fontSize="12" fontFamily="monospace">&lt; -200 ms</text>

                      {/* Good Early */}
                      <rect x="94" y="35" width="76" height="52" rx="4" fill="#422006" stroke="#eab308" strokeWidth="1" />
                      <text x="132" y="58" textAnchor="middle" fill="#fde047" fontSize="13.5" fontFamily="monospace" fontWeight="bold">GOOD</text>
                      <text x="132" y="74" textAnchor="middle" fill="#facc15" fontSize="12" fontFamily="monospace">-200..-150ms</text>

                      {/* Great Early */}
                      <rect x="174" y="35" width="82" height="52" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                      <text x="215" y="58" textAnchor="middle" fill="#6ee7b7" fontSize="13.5" fontFamily="monospace" fontWeight="bold">GREAT</text>
                      <text x="215" y="74" textAnchor="middle" fill="#34d399" fontSize="12" fontFamily="monospace">-150..-100ms</text>

                      {/* PERFECT CENTER */}
                      <rect x="260" y="25" width="240" height="72" rx="6" fill="#083344" stroke="#38bdf8" strokeWidth="2" />
                      <line x1="380" y1="15" x2="380" y2="108" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" />
                      <text x="380" y="11" textAnchor="middle" fill="#fbbf24" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'KETUKAN TEPAT (0 ms)' : isEs ? 'PULSO EXACTO (0 ms)' : 'EXACT BEAT (0 ms)'}
                      </text>
                      <text x="380" y="56" textAnchor="middle" fill="#ffffff" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'JENDELA PERFECT' : isEs ? 'VENTANA PERFECT' : 'PERFECT WINDOW'}
                      </text>
                      <text x="380" y="76" textAnchor="middle" fill="#7dd3fc" fontSize="13.5" fontFamily="monospace" fontWeight="bold">-100 ms  to  +100 ms</text>

                      {/* Great Late */}
                      <rect x="504" y="35" width="82" height="52" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                      <text x="545" y="58" textAnchor="middle" fill="#6ee7b7" fontSize="13.5" fontFamily="monospace" fontWeight="bold">GREAT</text>
                      <text x="545" y="74" textAnchor="middle" fill="#34d399" fontSize="12" fontFamily="monospace">+100..+150ms</text>

                      {/* Good Late */}
                      <rect x="590" y="35" width="76" height="52" rx="4" fill="#422006" stroke="#eab308" strokeWidth="1" />
                      <text x="628" y="58" textAnchor="middle" fill="#fde047" fontSize="13.5" fontFamily="monospace" fontWeight="bold">GOOD</text>
                      <text x="628" y="74" textAnchor="middle" fill="#facc15" fontSize="12" fontFamily="monospace">+150..+200ms</text>

                      {/* Miss Late */}
                      <rect x="670" y="35" width="90" height="52" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
                      <text x="715" y="58" textAnchor="middle" fill="#fca5a5" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'MISS TERLAMBAT' : isEs ? 'FALLO TARDÍO' : 'LATE MISS'}
                      </text>
                      <text x="715" y="74" textAnchor="middle" fill="#f87171" fontSize="12" fontFamily="monospace">&gt; +200 ms</text>

                      {/* Dual Offset Explanation Cards */}
                      <rect x="0" y="122" width="372" height="58" rx="5" fill="#0f172a" stroke="#1e293b" />
                      <text x="12" y="140" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        {isId ? '1. OFFSET HIT MIDI (Hitbox Shift)' : isEs ? '1. AJUSTE DE IMPACTO MIDI (Hitbox)' : '1. MIDI HIT TIMING OFFSET (Hitbox Shift)'}
                      </text>
                      <text x="12" y="156" fill="#cbd5e1" fontSize="11.5">
                        {isId ? 'Kompensasi latensi driver audio/USB-MIDI. Jika dinilai LATE' : isEs ? 'Compensa la latencia USB-MIDI/audio. Si marca LATE (+ms),' : 'Compensates for USB-MIDI / audio driver buffer delay. If your hits register'}
                      </text>
                      <text x="12" y="169" fill="#cbd5e1" fontSize="11.5">
                        {isId ? '(+ms), geser Hitbox negatif (-) atau pakai Kalibrasi Otomatis.' : isEs ? 'ajusta el Hitbox a negativo (-) o usa la calibración automática.' : 'LATE (+ms), shift Hitbox negative (-) or run the Auto-Calibration Song.'}
                      </text>

                      <rect x="388" y="122" width="372" height="58" rx="5" fill="#0f172a" stroke="#1e293b" />
                      <text x="400" y="140" fill="#a855f7" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        {isId ? '2. SINKRONISASI AUDIO (Offset Backing MP3/YouTube)' : isEs ? '2. SINCRONIZACIÓN DE AUDIO (Pista de Fondo / YouTube)' : '2. USER MS AUDIO SYNC (Backing Track / YouTube Offset)'}
                      </text>
                      <text x="400" y="156" fill="#cbd5e1" fontSize="11.5">
                        {isId ? 'Menyelaraskan lagu MP3/YouTube dengan jam MIDI internal' : isEs ? 'Alinea pistas externas MP3/YouTube con el reloj MIDI interno' : 'Aligns external MP3 or YouTube backing audio with the internal MIDI clock'}
                      </text>
                      <text x="400" y="169" fill="#cbd5e1" fontSize="11.5">
                        {isId ? 'dan metronom. Atur langsung di TopBar atau Sync Tuner.' : isEs ? 'y el metrónomo. Ajusta en tiempo real desde la TopBar.' : 'and metronome click. Adjust in real-time via TopBar or Sync Tuner (STU).'}
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 2.3: Loop Chunking & 4-Stage Tempo Progression Architecture */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      {isId
                        ? 'FIG 2.3 — ISOLASI LOOP MIKRO & TANGGA TEMPO 4 TAHAP'
                        : isEs
                        ? 'FIG 2.3 — AISLAMIENTO DE MICRO-BUCLES Y ESCALERA DE TEMPO EN 4 ETAPAS'
                        : 'FIG 2.3 — MICRO-LOOP CHUNKING & THE 4-STAGE TEMPO MASTERY LADDER'}
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Strategi Latihan Konservatori: Isolasi Loop 2–4 Bar & Tangga Tempo Bertahap (50% → 100%)'
                        : isEs
                        ? 'Protocolo de Práctica: Aislamiento de Bucles de 2–4 Compases y Aumento de Tempo (50% → 100%)'
                        : 'Conservatory Practice Protocol: 2–4 Bar Loop Isolation & Progressive Tempo Ramp (50% → 100%)'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    {isId ? 'METODOLOGI LATIHAN' : isEs ? 'METODOLOGÍA DE PRÁCTICA' : 'PRACTICE METHODOLOGY'}
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 190" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="190" rx="8" fill="#0a0f1d" stroke="#334155" />
                    {[
                      {
                        step: isId ? 'TAHAP 01 • 50% TEMPO' : isEs ? 'ETAPA 01 • 50% TEMPO' : 'STAGE 01 • 50% TEMPO',
                        title: isId ? 'Tangan Terpisah + Mode Tunggu' : isEs ? 'Manos Separadas + Espera' : 'Hands Separate (HS) + Strict Wait',
                        desc1: isId ? 'Isolasi 2–4 birama (Loop A → B).' : isEs ? 'Aísla 2–4 compases (Bucle A → B).' : 'Isolate 2–4 bars (Set Loop A → B).',
                        desc2: isId ? 'Pastikan nomor jari (1–5) tepat' : isEs ? 'Asigna los dedos exactos (1–5)' : 'Map exact finger numbers (1–5)',
                        desc3: isId ? 'tanpa ada keraguan sedikit pun.' : isEs ? 'sin titubeos ni tropiezos.' : 'with zero hesitation glitches.',
                        col: '#38bdf8'
                      },
                      {
                        step: isId ? 'TAHAP 02 • 65% TEMPO' : isEs ? 'ETAPA 02 • 65% TEMPO' : 'STAGE 02 • 65% TEMPO',
                        title: isId ? 'Kedua Tangan + Mode Tunggu' : isEs ? 'Ambas Manos + Espera' : 'Hands Together (HT) + Wait Mode',
                        desc1: isId ? 'Gabungkan tangan kiri & kanan.' : isEs ? 'Combina ambas manos verticalmente.' : 'Combine LH + RH vertically.',
                        desc2: isId ? 'Pastikan akor sejajar vertikal' : isEs ? 'Verifica la alineación de acordes' : 'Verify vertical chord alignment',
                        desc3: isId ? 'sebelum menaikkan kecepatan.' : isEs ? 'antes de introducir velocidad.' : 'before speed is introduced.',
                        col: '#818cf8'
                      },
                      {
                        step: isId ? 'TAHAP 03 • 80% TEMPO' : isEs ? 'ETAPA 03 • 80% TEMPO' : 'STAGE 03 • 80% TEMPO',
                        title: isId ? 'Ketukan Metronom + Non-Stop' : isEs ? 'Metrónomo + Continuo' : 'Metronome Beat + Non-Stop',
                        desc1: isId ? 'Matikan Mode Tunggu; nyalakan' : isEs ? 'Desactiva Modo Espera; activa' : 'Disable Wait Mode; turn Metronome',
                        desc2: isId ? 'metronom. Mainkan 3x beruntun' : isEs ? 'metrónomo. Toca 3x seguidas' : 'ON. Play 3x in a row with >=95%',
                        desc3: isId ? 'dengan akurasi >=95%.' : isEs ? 'con >=95% de precisión.' : 'accuracy before advancing.',
                        col: '#10b981'
                      },
                      {
                        step: isId ? 'TAHAP 04 • 100% TEMPO' : isEs ? 'ETAPA 04 • 100% TEMPO' : 'STAGE 04 • 100% TEMPO',
                        title: isId ? 'Performa Penuh + Dinamika' : isEs ? 'Interpretación + Dinámica' : 'Full Performance + Dynamics',
                        desc1: isId ? 'Tambahkan backing track, napas' : isEs ? 'Añade pista de fondo, respiración' : 'Add backing track, phrasing breath,',
                        desc2: isId ? 'frasering, dan pedal sustain' : isEs ? 'de fraseo y pedal de resonancia' : 'and damper pedaling at target',
                        desc3: isId ? 'pada kecepatan konser penuh.' : isEs ? 'al tempo final de concierto.' : 'concert tempo.',
                        col: '#f59e0b'
                      },
                    ].map((st, i) => (
                      <g key={i} transform={`translate(${18 + i * 208}, 18)`}>
                        <rect width="196" height="154" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                        <line x1="0" y1="0" x2="196" y2="0" stroke={st.col} strokeWidth="3" />
                        <text x="12" y="24" fill={st.col} fontSize="12" fontFamily="monospace" fontWeight="bold">{st.step}</text>
                        <text x="12" y="44" fill="#f8fafc" fontSize="13" fontWeight="bold">{st.title}</text>
                        <line x1="12" y1="54" x2="184" y2="54" stroke="#1e293b" />
                        <text x="12" y="74" fill="#cbd5e1" fontSize="11.5">{st.desc1}</text>
                        <text x="12" y="90" fill="#cbd5e1" fontSize="11.5">{st.desc2}</text>
                        <text x="12" y="106" fill="#cbd5e1" fontSize="11.5">{st.desc3}</text>
                        <rect x="12" y="122" width="172" height="20" rx="3" fill="#0f172a" />
                        <text x="98" y="135" textAnchor="middle" fill={st.col} fontSize="11.5" fontFamily="monospace" fontWeight="bold">
                          {isId ? 'SYARAT: 3× Repetisi Bersih' : isEs ? 'REGLA: 3× Repeticiones Limpias' : 'PASS RULE: 3× Clean Repetitions'}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* FIG 2.4: Polyrhythm 3:2 & 4:3 Time-Grid Subdivisions */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      {isId
                        ? 'FIG 2.4 — KOORDINASI POLIRITME: 3-LAWAN-2 (3:2) & PROTOKOL GERAK MATA'
                        : isEs
                        ? 'FIG 2.4 — COORDINACIÓN POLIRRÍTMICA: 3 CONTRA 2 (3:2) Y SEGUIMIENTO VISUAL'
                        : 'FIG 2.4 — POLYRHYTHMIC COORDINATION: 3-AGAINST-2 (3:2) & SIGHT-READING EYE TRACKING'}
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Matriks KPK Poliritme 3-Lawan-2 (6 Sub-Denyut) & Protokol Pergerakan Mata Sight-Reading'
                        : isEs
                        ? 'Cuadrícula MCM para Polirritmos 3:2 y Protocolo Visual de Lectura a Primera Vista'
                        : 'Least Common Multiple (LCM) Grid for 3:2 Polyrhythms & Sight-Reading Eye-Tracking Protocol'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    CHOPIN / DEBUSSY RHYTHM LAB
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 185" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="185" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Left Box: 3 against 2 (6-pulse grid) */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="152" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'A. POLIRITME 3-LAWAN-2 (KPK = 6 SUB-DENYUT)' : isEs ? 'A. POLIRRITMO 3 CONTRA 2 (MCM = 6 SUBPULSOS)' : 'A. 3-AGAINST-2 POLYRHYTHM (LCM = 6 SUB-PULSES)'}
                      </text>
                      {[0, 1, 2, 3, 4, 5].map((p) => {
                        const x = 18 + p * 61;
                        const rhHit = p % 2 === 0;
                        const lhHit = p % 3 === 0;
                        return (
                          <g key={p} transform={`translate(${x}, 32)`}>
                            <rect width="55" height="22" rx="3" fill="#0f172a" stroke="#1e293b" />
                            <text x="27.5" y="15" textAnchor="middle" fill="#94a3b8" fontSize="12.5" fontFamily="monospace">Sub {p + 1}</text>
                            <rect y="28" width="55" height="28" rx="3" fill={rhHit ? '#083344' : '#070a12'} stroke={rhHit ? '#38bdf8' : '#1e293b'} />
                            <text x="27.5" y="46" textAnchor="middle" fill={rhHit ? '#7dd3fc' : '#334155'} fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                              {rhHit ? (isId ? 'TK ●' : isEs ? 'MD ●' : 'RH ●') : '—'}
                            </text>
                            <rect y="62" width="55" height="28" rx="3" fill={lhHit ? '#2e1065' : '#070a12'} stroke={lhHit ? '#a855f7' : '#1e293b'} />
                            <text x="27.5" y="80" textAnchor="middle" fill={lhHit ? '#d8b4fe' : '#334155'} fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                              {lhHit ? (isId ? 'TI ●' : isEs ? 'MI ●' : 'LH ●') : '—'}
                            </text>
                          </g>
                        );
                      })}
                      <text x="200" y="140" textAnchor="middle" fill="#fde68a" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'POLA GABUNGAN: [BERSAMA] — (jeda) — [TK] — [TI] — [TK] — (jeda)' : isEs ? 'PATRÓN COMPUESTO: [AMBAS] — (espera) — [MD] — [MI] — [MD] — (espera)' : 'COMPOSITE PATTERN: [BOTH] — (wait) — [RH] — [LH] — [RH] — (wait)'}
                      </text>
                    </g>

                    {/* Right Box: Sight-Reading Eye-Tracking Protocol */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="152" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#10b981" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        {isId ? 'B. PROTOKOL GERAK MATA & BUFFER PANDANG DEPAN' : isEs ? 'B. PROTOCOLO VISUAL Y BÚFER DE ANTICIPACIÓN' : 'B. SIGHT-READING EYE-TRACKING & LOOKAHEAD PROTOCOL'}
                      </text>
                      <g transform="translate(14, 32)">
                        <rect width="372" height="34" rx="4" fill="#0f172a" stroke="#1e293b" />
                        <text x="10" y="15" fill="#34d399" fontSize="12" fontFamily="monospace" fontWeight="bold">
                          {isId ? '1. BACA AKOR DARI BAWAH KE ATAS (BASS → TREBLE)' : isEs ? '1. LEE ACORDES DE ABAJO HACIA ARRIBA' : '1. READ BOTTOM-UP FOR CHORDS (BASS → TREBLE)'}
                        </text>
                        <text x="10" y="28" fill="#cbd5e1" fontSize="11">
                          {isId ? 'Pindai nada dasar Tangan Kiri dulu, baru susun melodi Tangan Kanan.' : isEs ? 'Escanea primero el bajo izquierdo, luego apila notas derechas.' : 'Scan the Left Hand bass anchor first, then stack Right Hand upper voices.'}
                        </text>

                        <rect y="40" width="372" height="34" rx="4" fill="#0f172a" stroke="#1e293b" />
                        <text x="10" y="55" fill="#38bdf8" fontSize="12" fontFamily="monospace" fontWeight="bold">
                          {isId ? '2. BUFFER PANDANG 1–2 KETUK DI DEPAN JARI' : isEs ? '2. ANTICIPACIÓN VISUAL DE 1–2 PULSOS' : '2. 1-BEAT SACCADE LOOKAHEAD BUFFER'}
                        </text>
                        <text x="10" y="68" fill="#cbd5e1" fontSize="11">
                          {isId ? 'Arahkan mata 1–2 ketuk mendahului tuts yang sedang ditekan jari Anda.' : isEs ? 'Mantén los ojos 1–2 tiempos por delante de lo que pulsan tus dedos.' : 'Keep your eyes 1–2 beats ahead of what your fingers are currently striking.'}
                        </text>

                        <rect y="80" width="372" height="34" rx="4" fill="#0f172a" stroke="#1e293b" />
                        <text x="10" y="95" fill="#f59e0b" fontSize="12" fontFamily="monospace" fontWeight="bold">
                          {isId ? '3. MEMORI SENTUHAN TAKTIL (DILARANG MENUNDUK)' : isEs ? '3. MEMORIA PROPIOCEPTIVA (NO MIRES LAS TECLAS)' : '3. PROPRIOCEPTIVE KEYBED MEMORY (NO LOOKING DOWN)'}
                        </text>
                        <text x="10" y="108" fill="#cbd5e1" fontSize="11">
                          {isId ? 'Gunakan tuts hitam 2 & 3 sebagai patokan rabaan agar mata tetap di layar.' : isEs ? 'Usa las teclas negras agrupadas como guía táctil para no mirar abajo.' : 'Use the 2-black and 3-black raised key clusters by touch to stay on the screen.'}
                        </text>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
            </article>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 3: Ergonomics, Biomechanics & Deterministic Fingering */}
          {/* ========================================================================= */}
          {activeChapter === 'fingering' && (
            <article className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
              <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs md:text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 03 • BIOMEKANIKA TANGAN & TEKNIK FISIK PIANO' : isEs ? 'MÓDULO 03 • BIOMECÁNICA Y TÉCNICA' : 'MODULE 03 • PIANO ERGONOMICS, POSTURE, PEDALS & FINGERING'}
                    </span>
                    <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700">
                      5 TECHNICAL DIAGRAMS • 6 MASTER TABLES
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {isId
                      ? 'Anatomi Jari (1–5), Geometri Duduk, Teknik 3 Pedal, Thumb-Under & Tabel Fingering 12 Kunci'
                      : isEs
                      ? 'Anatomía de Dedos (1–5), Postura, Técnica de 3 Pedales, Paso de Pulgar y Tablas en 12 Tonalidades'
                      : 'Anatomical Fingering (1–5), Seating Geometry, 3-Pedal Mechanics, Thumb-Under & 12-Key Master Tables'}
                  </h2>
                  <p className="text-sm md:text-[15px] text-slate-200 mt-3 leading-relaxed max-w-4xl">
                    {isId
                      ? 'Penomoran jari (fingering) adalah rekayasa biomekanika untuk mendistribusikan beban lengan secara merata, mencegah cedera tendon, dan memungkinkan perpindahan posisi lintas oktaf tanpa terputus.'
                      : isEs
                      ? 'La digitación es ingeniería biomecánica diseñada para distribuir el peso del brazo, prevenir lesiones tendinosas y permitir desplazamientos fluidos a través del teclado.'
                      : 'Piano fingering is applied biomechanical engineering: aligning skeletal arches, transferring forearm weight without muscular co-contraction, and executing seamless thumb pivots across all 12 keys.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectChapter('exercises')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 text-xs md:text-sm font-mono font-bold transition-all flex items-center gap-2 flex-shrink-0 shadow-sm active:scale-95 cursor-pointer"
                  title={isId ? 'Buka Generator Latihan Drill (Bab 06)' : isEs ? 'Abrir Generador de Drills (Cap. 06)' : 'Open Drill Generator (Ch. 06)'}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{t.jumpToDrills}</span>
                  <span>→</span>
                </button>
              </div>

              {/* FIG 3.1: Dorsal & Lateral Skeletal Hand Arch Blueprint */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 3.1 — ANATOMICAL 1–5 SYMMETRY &amp; LATERAL SKELETAL KNUCKLE ARCH (MCP / PIP / DIP)
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Simetri Penomoran Jari 1–5 (Kiri & Kanan) serta Profil Samping Lengkung Sendi Jari'
                        : isEs
                        ? 'Simetría Bilateral de Dedos 1–5 (MI y MD) y Arco Articular Esquelético Lateral'
                        : 'Bilateral 1–5 Finger Symmetry (LH & RH) and Side-Profile Skeletal Joint Arch'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    {L("RADIAL SYMMETRY: THUMB = 1 • PINKY = 5", "SIMETRI RADIAL: JEMPOL = 1 • KELINGKING = 5", "SIMETRÍA RADIAL: PULGAR = 1 • MEÑIQUE = 5")}
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 310" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="310" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* PANEL A: Left & Right Hand 5-Finger Keyboard Mapping */}
                    <g transform="translate(18, 16)">
                      <rect width="500" height="278" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {L("A. BILATERAL 1–5 FINGER NUMBERING ON C-POSITION KEYBED", "A. PENOMORAN JARI 1–5 KIRI & KANAN (POSISI C)", "A. NUMERACIÓN DE DEDOS 1–5 (POSICIÓN DE DO)")}
                      </text>

                      {/* Left Hand (C3–G3: 5-4-3-2-1) */}
                      <g transform="translate(20, 38)">
                        <text x="102" y="12" textAnchor="middle" fill="#818cf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                          {L("LEFT HAND (C3–G3) • 5→1 INWARD", "TANGAN KIRI (C3–G3) • 5→1 KE DALAM", "MANO IZQUIERDA (C3–G3) • 5→1")}
                        </text>
                        {[
                          { k: 'C3', f: '5', name: 'Pinky', len: 56 },
                          { k: 'D3', f: '4', name: 'Ring', len: 70 },
                          { k: 'E3', f: '3', name: 'Middle', len: 78 },
                          { k: 'F3', f: '2', name: 'Index', len: 68 },
                          { k: 'G3', f: '1', name: 'Thumb', len: 46 },
                        ].map((item, i) => (
                          <g key={i} transform={`translate(${i * 41}, 22)`}>
                            <rect width="39" height="92" rx="3" fill="#0f172a" stroke="#4f46e5" strokeWidth="1.2" />
                            <text x="19.5" y="82" textAnchor="middle" fill="#cbd5e1" fontSize="12.5" fontFamily="monospace" fontWeight="bold">{item.k}</text>
                            {/* Finger Vector Column */}
                            {(() => { const t = 140 - item.len; return (<g><rect x="-1" y="148" width="41" height="46" fill="#27246b" /><path d={`M 5 150 L 6 ${t+14} Q 6 ${t} 19.5 ${t} Q 33 ${t} 33 ${t+14} L 34 150 Z`} fill="#312e81" stroke="#818cf8" strokeWidth="1.5" strokeLinejoin="round" /><rect x="13" y={t+5} width="13" height="9" rx="4" fill="#ffffff" fillOpacity="0.22" /><line x1="8" y1={t+46} x2="31" y2={t+46} stroke="#818cf8" strokeOpacity="0.55" strokeWidth="1" /><line x1="8" y1={t+68} x2="31" y2={t+68} stroke="#818cf8" strokeOpacity="0.55" strokeWidth="1" /></g>); })()}
                            <circle cx="19.5" cy="50" r="11" fill="#312e81" stroke="#818cf8" strokeWidth="1.5" />
                            <text x="19.5" y="54" textAnchor="middle" fill="#ffffff" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{item.f}</text>
                            <text x="19.5" y="176" textAnchor="middle" fill="#cbd5e1" fontSize="10.5" fontFamily="monospace">{fingerName(item.name)}</text>
                          </g>
                        ))}
                        {/* Black keys */}
                        <rect x="29" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                        <rect x="70" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                        <rect x="152" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                      </g>

                      {/* Right Hand (C4–G4: 1-2-3-4-5) */}
                      <g transform="translate(272, 38)">
                        <text x="102" y="12" textAnchor="middle" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                          {L("RIGHT HAND (C4–G4) • 1→5 OUTWARD", "TANGAN KANAN (C4–G4) • 1→5 KE LUAR", "MANO DERECHA (C4–G4) • 1→5")}
                        </text>
                        {[
                          { k: 'C4', f: '1', name: 'Thumb', len: 46 },
                          { k: 'D4', f: '2', name: 'Index', len: 68 },
                          { k: 'E4', f: '3', name: 'Middle', len: 78 },
                          { k: 'F4', f: '4', name: 'Ring', len: 70 },
                          { k: 'G4', f: '5', name: 'Pinky', len: 56 },
                        ].map((item, i) => (
                          <g key={i} transform={`translate(${i * 41}, 22)`}>
                            <rect width="39" height="92" rx="3" fill="#0f172a" stroke="#0284c7" strokeWidth="1.2" />
                            <text x="19.5" y="82" textAnchor="middle" fill="#cbd5e1" fontSize="12.5" fontFamily="monospace" fontWeight="bold">{item.k}</text>
                            {/* Finger Vector Column */}
                            {(() => { const t = 140 - item.len; return (<g><rect x="-1" y="148" width="41" height="46" fill="#0a3a58" /><path d={`M 5 150 L 6 ${t+14} Q 6 ${t} 19.5 ${t} Q 33 ${t} 33 ${t+14} L 34 150 Z`} fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" /><rect x="13" y={t+5} width="13" height="9" rx="4" fill="#ffffff" fillOpacity="0.22" /><line x1="8" y1={t+46} x2="31" y2={t+46} stroke="#38bdf8" strokeOpacity="0.55" strokeWidth="1" /><line x1="8" y1={t+68} x2="31" y2={t+68} stroke="#38bdf8" strokeOpacity="0.55" strokeWidth="1" /></g>); })()}
                            <circle cx="19.5" cy="50" r="11" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.5" />
                            <text x="19.5" y="54" textAnchor="middle" fill="#ffffff" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{item.f}</text>
                            <text x="19.5" y="176" textAnchor="middle" fill="#cbd5e1" fontSize="10.5" fontFamily="monospace">{fingerName(item.name)}</text>
                          </g>
                        ))}
                        {/* Black keys */}
                        <rect x="29" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                        <rect x="70" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                        <rect x="152" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                      </g>

                      <text x="250" y="264" textAnchor="middle" fill="#64748b" fontSize="12" fontFamily="monospace">
                        {L("Mirror: going UP = 5→1 (Left Hand), 1→5 (Right Hand).", "Cermin: naik nada = 5→1 (Tangan Kiri), 1→5 (Tangan Kanan).", "Espejo: subir = 5→1 (Mano Izq.), 1→5 (Mano Der.).")}
                      </text>
                    </g>

                    {/* PANEL B: Side-Profile Skeletal Arch Comparison (Correct Dome vs Collapsed DIP) */}
                    <g transform="translate(534, 16)">
                      <rect width="308" height="278" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {L("B. LATERAL JOINT PROFILE (SIDE VIEW)", "B. PROFIL SENDI (TAMPAK SAMPING)", "B. PERFIL ARTICULAR (VISTA LATERAL)")}
                      </text>

                      {/* Top Box: Correct Curved Bridge Arch */}
                      <g transform="translate(16, 36)">
                        <rect width="276" height="110" rx="5" fill="#0f172a" stroke="#10b981" strokeWidth="1.2" />
                        <text x="12" y="18" fill="#34d399" fontSize="13" fontFamily="monospace" fontWeight="bold">
                          {L("CORRECT: ACTIVE DOME ARCH", "BENAR: LENGKUNG KUBAH AKTIF", "CORRECTO: ARCO DE CÚPULA")}
                        </text>
                        {/* Piano Keybed horizontal bar */}
                        <rect x="20" y="84" width="140" height="14" rx="2" fill="#e2e8f0" />
                        <text x="85" y="94" textAnchor="middle" fill="#0f172a" fontSize="11.5" fontFamily="monospace" fontWeight="bold">{L("PIANO KEY SURFACE", "PERMUKAAN TUTS", "SUPERFICIE DE TECLAS")}</text>
                        {/* Skeletal Bone Segments: Wrist -> MCP -> PIP -> DIP -> Pad */}
                        <path d="M 235 64 L 180 42 L 122 44 L 84 60 L 68 83" fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Joint Nodes */}
                        <circle cx="235" cy="64" r="4.5" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
                        <circle cx="180" cy="42" r="4.5" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
                        <circle cx="122" cy="44" r="4.5" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
                        <circle cx="84" cy="60" r="4.5" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
                        <circle cx="68" cy="83" r="4" fill="#fbbf24" />
                        <text x="235" y="80" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">{L("Wrist", "Pergelangan", "Muñeca")}</text>
                        <text x="180" y="33" textAnchor="middle" fill="#6ee7b7" fontSize="11" fontFamily="monospace">MCP</text>
                        <text x="122" y="35" textAnchor="middle" fill="#6ee7b7" fontSize="11" fontFamily="monospace">PIP</text>
                        <text x="72" y="54" textAnchor="middle" fill="#6ee7b7" fontSize="11" fontFamily="monospace">DIP</text>
                      </g>

                      {/* Bottom Box: Incorrect Collapsed Distal Joint */}
                      <g transform="translate(16, 156)">
                        <rect width="276" height="108" rx="5" fill="#0f172a" stroke="#ef4444" strokeWidth="1.2" />
                        <text x="12" y="18" fill="#f87171" fontSize="13" fontFamily="monospace" fontWeight="bold">
                          {L("INCORRECT: COLLAPSED DIP", "SALAH: DIP RUNTUH, WRIST TURUN", "INCORRECTO: DIP COLAPSADO")}
                        </text>
                        <rect x="20" y="84" width="140" height="14" rx="2" fill="#e2e8f0" />
                        {/* Collapsed Bone Path */}
                        <path d="M 235 88 L 180 56 L 122 52 L 88 78 L 62 83" fill="none" stroke="#f87171" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="235" cy="88" r="4.5" fill="#0f172a" stroke="#f87171" strokeWidth="2" />
                        <circle cx="88" cy="78" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                        <text x="88" y="68" textAnchor="middle" fill="#fca5a5" fontSize="11" fontFamily="monospace" fontWeight="bold">{L("Buckled DIP!", "DIP menekuk!", "¡DIP doblado!")}</text>
                        <text x="225" y="102" textAnchor="middle" fill="#fca5a5" fontSize="11" fontFamily="monospace">{L("Dropped Wrist", "Wrist turun", "Muñeca caída")}</text>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 3.2: Full-Body Bench & Keybed Ergonomic Geometry */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 3.2 — FULL-BODY SEATING GEOMETRY, FOREARM LEVEL &amp; PEDAL PIVOT AXIS
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Standar Geometri Kursi Piano: Sudut Siku 95°, Lengan Sejajar Tuts & Tumpuan Kaki'
                        : isEs
                        ? 'Geometría del Banco, Codo a 95°, Antebrazo Nivelado y Apoyo de Pies'
                        : 'Biomechanical Bench Height, 95° Elbow Angle, Parallel Forearm Vector & Foot Grounding'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    ERGONOMIC POSTURE GUIDE
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 920 240" className="w-full min-w-[840px] h-auto select-none font-sans">
                    <defs>
                      <linearGradient id="ergBackGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#070c18" />
                        <stop offset="100%" stopColor="#0b1329" />
                      </linearGradient>
                      <linearGradient id="pianoCabinetGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1e293b" />
                        <stop offset="70%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#020617" />
                      </linearGradient>
                      <linearGradient id="benchLeatherGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#334155" />
                        <stop offset="35%" stopColor="#1e293b" />
                        <stop offset="100%" stopColor="#090d16" />
                      </linearGradient>
                      <linearGradient id="cardGradDark" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0e172a" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#0a0f1d" stopOpacity="0.95" />
                      </linearGradient>
                      <filter id="softGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="softGlowEmerald" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      {/* Subtle Technical Grid Background Pattern */}
                      <pattern id="ergGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.6" strokeOpacity="0.4" />
                      </pattern>
                    </defs>

                    {/* Outer Frame */}
                    <rect width="920" height="240" rx="10" fill="url(#ergBackGrad)" stroke="#334155" strokeWidth="1.2" />

                    {/* ========================================================================= */}
                    {/* LEFT SCHEMATIC: BIOMECHANICAL KINEMATIC CHAIN & PIANO GEOMETRY */}
                    {/* ========================================================================= */}
                    <g transform="translate(14, 14)">
                      {/* Sub-Card Background with Blueprint Grid */}
                      <rect width="444" height="212" rx="8" fill="#080d1a" stroke="#1e293b" strokeWidth="1" />
                      <rect width="444" height="212" rx="8" fill="url(#ergGrid)" />

                      {/* Header Badge */}
                      <g transform="translate(16, 18)">
                        <circle cx="4" cy="4" r="3" fill="#38bdf8" filter="url(#softGlowCyan)" />
                        <text x="14" y="7" fill="#cbd5e1" fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="0.08em">
                          {L("SIDE-PROFILE KINEMATIC CHAIN", "RANTAI KINEMATIK TAMPAK SAMPING", "CADENA CINEMÁTICA LATERAL")}
                        </text>
                      </g>

                      {/* Floor Reference Line */}
                      <line x1="24" y1="188" x2="420" y2="188" stroke="#334155" strokeWidth="2" strokeDasharray="6 3" />
                      <text x="416" y="184" textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">FLOOR / LANTAI</text>

                      {/* ------------------------------------------------------------- */}
                      {/* UPRIGHT PIANO & KEYBED PROFILE */}
                      {/* ------------------------------------------------------------- */}
                      {/* Piano Main Body (Realistic Silhouette with Fallboard & Toe Block) */}
                      <path
                        d="M 32 36 L 86 36 L 86 100 L 132 100 L 132 114 L 98 114 L 98 184 L 28 184 L 28 188 L 102 188 L 102 184 L 32 184 Z"
                        fill="url(#pianoCabinetGrad)"
                        stroke="#475569"
                        strokeWidth="1.4"
                      />
                      {/* Piano Side Panel Inner Trim */}
                      <line x1="38" y1="44" x2="38" y2="178" stroke="#1e293b" strokeWidth="1.2" />
                      {/* Piano Logo Label */}
                      <text x="60" y="66" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="0.1em">
                        OCTAVIA
                      </text>
                      <text x="60" y="78" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace">
                        PIANO
                      </text>

                      {/* Keybed Deck & Keys Profile */}
                      <rect x="88" y="100" width="44" height="13" rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                      {/* White Key Tops */}
                      <rect x="92" y="99" width="38" height="4.5" rx="1" fill="#f8fafc" />
                      {/* Red Felt Strip */}
                      <line x1="92" y1="99" x2="128" y2="99" stroke="#ef4444" strokeWidth="1" />
                      {/* Black Key Tops */}
                      <rect x="96" y="96" width="16" height="4" rx="1" fill="#020617" stroke="#334155" strokeWidth="0.6" />

                      {/* Brass Pedals & Lyre */}
                      <rect x="86" y="180" width="14" height="8" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                      {/* Sustaining Damper Pedal Lever (Depressed position) */}
                      <path d="M 88 185 L 114 179" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
                      <circle cx="112" cy="179.5" r="2" fill="#f59e0b" />

                      {/* Horizontal Forearm Keybed Level Guideline */}
                      <line x1="92" y1="102" x2="220" y2="102" stroke="#10b981" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.65" />

                      {/* ------------------------------------------------------------- */}
                      {/* ADJUSTABLE PIANO BENCH (PROPER ERGONOMIC DISTANCE) */}
                      {/* ------------------------------------------------------------- */}
                      {/* Padded Seat Cushion */}
                      <rect x="208" y="132" width="86" height="14" rx="3.5" fill="url(#benchLeatherGrad)" stroke="#475569" strokeWidth="1.2" />
                      {/* Front-Half Zone Accent (Highlighting where sit-bones belong) */}
                      <rect x="208" y="132" width="43" height="14" rx="3" fill="#f59e0b" fillOpacity="0.12" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
                      {/* Leather Top Sheen Line */}
                      <line x1="212" y1="135" x2="290" y2="135" stroke="#64748b" strokeWidth="1" opacity="0.8" />
                      {/* Wood Apron Frame */}
                      <rect x="212" y="146" width="78" height="5.5" fill="#090d16" stroke="#334155" strokeWidth="0.8" />
                      {/* Spindle Adjustment Knob on Bench Side */}
                      <circle cx="300" cy="148" r="4" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                      <line x1="298" y1="148" x2="302" y2="148" stroke="#f8fafc" strokeWidth="0.8" />
                      {/* Sturdy Tapered Bench Legs */}
                      <rect x="216" y="151.5" width="6" height="36.5" rx="1" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
                      <rect x="278" y="151.5" width="6" height="36.5" rx="1" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
                      <line x1="216" y1="172" x2="284" y2="172" stroke="#0f172a" strokeWidth="2.5" />

                      {/* ------------------------------------------------------------- */}
                      {/* PIANIST BIOMECHANICAL POSTURE & KINEMATIC SKELETON */}
                      {/* ------------------------------------------------------------- */}
                      {/* Soft Anatomical Silhouette Backdrop */}
                      <g fill="#1e293b" fillOpacity="0.45">
                        {/* Torso Silhouette */}
                        <path d="M 206 48 C 206 60, 214 75, 216 98 C 218 116, 226 130, 228 134 L 212 134 C 206 120, 200 88, 198 60 Z" />
                        {/* Thigh Silhouette (Natural forward reach toward keybed) */}
                        <path d="M 228 130 C 206 130, 184 134, 164 136 L 162 146 C 186 146, 214 144, 228 138 Z" />
                        {/* Calf Silhouette */}
                        <path d="M 164 138 L 160 148 L 128 188 L 122 188 Z" />
                      </g>

                      {/* Sightline Ray to Keyboard */}
                      <line x1="200" y1="36" x2="124" y2="100" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />

                      {/* Head & Neck */}
                      <circle cx="208" cy="32" r="11" fill="#0b1329" stroke="#38bdf8" strokeWidth="2.4" filter="url(#softGlowCyan)" />
                      {/* Nose Profile Hint toward Piano */}
                      <path d="M 199 31 L 195 34 L 199 36" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Neck */}
                      <line x1="208" y1="43" x2="208" y2="52" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

                      {/* Neutral Spine Vector (Slight forward poise from hips) */}
                      <path
                        d="M 208 54 C 211 76, 215 106, 224 132"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        filter="url(#softGlowCyan)"
                      />

                      {/* Pelvis / Sit-Bones Node (Positioned on Front Half of Bench) */}
                      <circle cx="224" cy="132" r="4.5" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.2" />

                      {/* Thigh Kinematic Vector (Slight gentle decline from hip to knee) */}
                      <line x1="224" y1="132" x2="164" y2="138" stroke="#818cf8" strokeWidth="3.6" strokeLinecap="round" />
                      {/* Knee Joint Node (Comfortably positioned near keybed edge) */}
                      <circle cx="164" cy="138" r="4.5" fill="#818cf8" stroke="#e0e7ff" strokeWidth="1" />

                      {/* Lower Leg Vector (Calf angling to grounded heel) */}
                      <line x1="164" y1="138" x2="126" y2="187" stroke="#818cf8" strokeWidth="3.6" strokeLinecap="round" />

                      {/* Foot Kinematic Vector (Heel Planted + Ball of Foot on Pedal) */}
                      <line x1="126" y1="187" x2="106" y2="179" stroke="#a855f7" strokeWidth="3.8" strokeLinecap="round" />

                      {/* Planted Heel Anchor Ring & Core Node */}
                      <circle cx="126" cy="187" r="7.5" fill="none" stroke="#c084fc" strokeWidth="1.4" strokeDasharray="2 2" />
                      <circle cx="126" cy="187" r="3.5" fill="#a855f7" stroke="#faf5ff" strokeWidth="1" />

                      {/* Relaxed Shoulder Joint Node */}
                      <circle cx="208" cy="54" r="5" fill="#10b981" stroke="#ecfdf5" strokeWidth="1.2" />

                      {/* Upper Arm Vector (Hanging naturally forward-down) */}
                      <line x1="208" y1="54" x2="196" y2="102" stroke="#10b981" strokeWidth="3.8" strokeLinecap="round" filter="url(#softGlowEmerald)" />

                      {/* Elbow Joint (At keybed level) */}
                      <circle cx="196" cy="102" r="5" fill="#10b981" stroke="#a7f3d0" strokeWidth="1.5" />

                      {/* Forearm Vector (Level & Parallel to Keybed) */}
                      <line x1="196" y1="102" x2="142" y2="101" stroke="#10b981" strokeWidth="3.8" strokeLinecap="round" filter="url(#softGlowEmerald)" />

                      {/* Wrist Node (Supple neutral arch) */}
                      <circle cx="142" cy="101" r="3.8" fill="#34d399" stroke="#ecfdf5" strokeWidth="1" />

                      {/* Hand Dome & Curved Fingers Resting on Keys */}
                      <path
                        d="M 142 101 C 135 96, 128 97, 124 101"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.6"
                        strokeLinecap="round"
                      />

                      {/* Elbow 95°–105° Arc Indicator */}
                      <path
                        d="M 190 84 A 20 20 0 0 0 176 102"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="1.8"
                        strokeDasharray="2.5 2"
                      />

                      {/* ------------------------------------------------------------- */}
                      {/* ERGONOMIC CALLOUT BADGES & LABELS */}
                      {/* ------------------------------------------------------------- */}
                      {/* 01. Elbow Angle Callout Badge */}
                      <g transform="translate(114, 72)">
                        <rect width="88" height="20" rx="5" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                        <text x="44" y="14" textAnchor="middle" fill="#a7f3d0" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          95°–105° {L("SIKU", "SIKU", "CODO")}
                        </text>
                      </g>

                      {/* 02. Forearm Parallel Callout Tag */}
                      <g transform="translate(114, 110)">
                        <rect width="98" height="17" rx="4" fill="#090f1d" stroke="#334155" strokeWidth="0.8" />
                        <text x="49" y="12" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                          {L("FOREARM LEVEL", "LENGAN SEJAJAR", "ANTEBRAZO NIVEL")}
                        </text>
                      </g>

                      {/* 03. Vertical Neutral Spine Callout Badge */}
                      <g transform="translate(236, 76)">
                        <rect width="126" height="20" rx="5" fill="#082f49" stroke="#0284c7" strokeWidth="1" />
                        <text x="63" y="14" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          {L("NEUTRAL SPINE", "TULANG TEGAK", "COLUMNA NEUTRA")}
                        </text>
                      </g>

                      {/* 04. Front 1/2 Bench Callout Badge */}
                      <g transform="translate(244, 148)">
                        <rect width="124" height="20" rx="5" fill="#451a03" stroke="#d97706" strokeWidth="1" />
                        <text x="62" y="14" textAnchor="middle" fill="#fde68a" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          {L("FRONT 1/2 BENCH", "PARUH DEPAN KURSI", "MITAD DELANTERA")}
                        </text>
                      </g>

                      {/* 05. Heel Planted Fulcrum Tag */}
                      <g transform="translate(86, 194)">
                        <rect width="108" height="16" rx="3.5" fill="#3b0764" stroke="#a855f7" strokeWidth="0.8" />
                        <text x="54" y="11.5" textAnchor="middle" fill="#f3e8ff" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                          {L("HEEL ANCHOR", "TUMIT MENAPAK", "TALÓN APOYADO")}
                        </text>
                      </g>
                    </g>

                    {/* ========================================================================= */}
                    {/* RIGHT 4 CALIBRATION SPECIFICATION CARDS */}
                    {/* ========================================================================= */}
                    <g transform="translate(470, 14)">
                      {[
                        {
                          num: "01",
                          title: L("BENCH HEIGHT (FOREARM PARALLEL)", "TINGGI KURSI (LENGAN SEJAJAR)", "ALTURA DEL BANCO (ANTEBRAZO PARALELO)"),
                          desc: L("Seat height so your forearm is level with keybed. Never play with elbows far below keys.", "Atur tinggi kursi agar lengan bawah sejajar tuts. Jangan main dengan siku jauh di bawah tuts.", "Ajusta la altura para que el antebrazo quede paralelo al teclado. Nunca con los codos muy bajos."),
                          col: '#10b981',
                          icon: (
                            <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          )
                        },
                        {
                          num: "02",
                          title: L("BENCH DISTANCE (95°–105° ELBOW)", "JARAK KURSI (SIKU 95°–105°)", "DISTANCIA AL BANCO (CODO 95°–105°)"),
                          desc: L("Sit far enough back that elbows hang slightly in front of torso and move with full freedom.", "Duduk cukup jauh agar siku menggantung sedikit di depan badan dan bebas bergerak tanpa kaku.", "Siéntate lo bastante lejos para que los codos cuelguen delante del torso y se muevan libres."),
                          col: '#38bdf8',
                          icon: (
                            <path d="M4 16l8-8 8 8M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          )
                        },
                        {
                          num: "03",
                          title: L("FRONT-HALF SIT-BONE GROUNDING", "DUDUK DI PARUH DEPAN KURSI", "SENTARSE EN LA MITAD DELANTERA"),
                          desc: L("Sit on front half of the bench, never slouching against a backrest or sinking deep.", "Duduk di paruh depan kursi dengan tumpuan tulang duduk, jangan bersandar atau membungkuk.", "Siéntate en la mitad delantera del banco sobre los isquiones, sin recostarte ni hundirte."),
                          col: '#f59e0b',
                          icon: (
                            <path d="M5 19h14M12 5v14M8 9l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          )
                        },
                        {
                          num: "04",
                          title: L("HEEL-ANCHORED PEDAL FULCRUM", "TUMIT SEBAGAI TUMPUAN PEDAL", "TALÓN COMO PUNTO DE APOYO"),
                          desc: L("Keep right heel planted on floor as a fulcrum; depress pedal with the ball of your foot.", "Tumit kanan tetap kokoh menapak lantai; tekan pedal hanya dengan bagian depan telapak kaki.", "Mantén el talón derecho apoyado en el suelo; pisa el pedal solo con la punta del pie."),
                          col: '#a855f7',
                          icon: (
                            <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                          )
                        },
                      ].map((spec, idx) => {
                        const [line1, line2] = wrap2(spec.desc, 64);
                        return (
                          <g key={idx} transform={`translate(0, ${idx * 53})`}>
                            {/* Card Container */}
                            <rect width="436" height="48" rx="6" fill="url(#cardGradDark)" stroke="#1e293b" strokeWidth="1" />
                            {/* Left Glowing Accent Stripe */}
                            <rect width="4" height="48" rx="2" fill={spec.col} />

                            {/* Step Badge */}
                            <rect x="12" y="8" width="24" height="15" rx="3" fill="#020617" stroke={spec.col} strokeWidth="0.8" />
                            <text x="24" y="19" textAnchor="middle" fill={spec.col} fontSize="9" fontFamily="monospace" fontWeight="bold">
                              {spec.num}
                            </text>

                            {/* Card Title */}
                            <text x="42" y="19" fill="#f8fafc" fontSize="11" fontFamily="monospace" fontWeight="bold">
                              {spec.title}
                            </text>

                            {/* Card Description Lines */}
                            <text x="14" y="32" fill="#cbd5e1" fontSize="10.5">
                              {line1}
                            </text>
                            {line2 && (
                              <text x="14" y="43" fill="#94a3b8" fontSize="10">
                                {line2}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 3.3: Acoustic Piano Pedals & Syncopated Damper Pedaling Waveform */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 3.3 — THE 3 PIANO PEDALS &amp; SYNCOPATED LEGATO PEDALING TIMING WAVEFORM
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Mekanika 3 Pedal Piano & Teknik Syncopated Pedaling ("Tekan Nada → Angkat & Injak Pedal")'
                        : 'Three-Pedal Mechanics & Syncopated Legato Pedaling ("Strike Key → Lift & Re-depress Pedal")'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    FOOT TECHNIQUE • MIDI CC64
                  </span>
                </div>

                <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                  {isId
                    ? 'Kesalahan paling umum pemula saat memakai Sustain Pedal (pedal kanan) adalah mengangkat dan menginjak pedal bersamaan dengan turunnya jari, sehingga terdapat celah kosong atau tabrakan harmoni kotor. Pianis profesional menggunakan Syncopated Pedaling (Legato Pedaling): tekan akor baru terlebih dahulu, lalu sepersekian detik kemudian angkat dan injak kembali pedal untuk membersihkan harmoni lama!'
                    : 'The most common beginner pedaling mistake is lifting and pressing the damper pedal simultaneously with the fingers, which either leaves a dry gap or blurs two chords together. Concert pianists use Syncopated (Legato) Pedaling: strike the new chord first, then immediately lift and re-depress the pedal just after the key strike.'}
                </p>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 230" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="230" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Beat Markers (Beat 1, Beat 2, Beat 3, Beat 4) */}
                    {[150, 340, 530, 720].map((x, idx) => (
                      <g key={idx}>
                        <line x1={x} y1="20" x2={x} y2="195" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 3" />
                        <text x={x} y="16" textAnchor="middle" fill="#94a3b8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                          {L("BEAT", "KETUKAN", "TIEMPO")} {idx + 1} ({L("Chord", "Akor", "Acorde")} {['C', 'G', 'Am', 'F'][idx]})
                        </text>
                      </g>
                    ))}

                    {/* Track 1: Hand / Key Depression */}
                    <text x="20" y="58" fill="#38bdf8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{L("HAND KEYS", "TUTS TANGAN", "TECLAS MANO")}</text>
                    <text x="20" y="72" fill="#64748b" fontSize="12" fontFamily="monospace">{L("Finger Strike", "Tekanan Jari", "Pulsación Dedo")}</text>
                    {[
                      { x: 150, w: 170, label: L('Strike C Maj', 'Tekan C Maj', 'Tocar Do May') },
                      { x: 340, w: 170, label: L('Strike G Maj', 'Tekan G Maj', 'Tocar Sol May') },
                      { x: 530, w: 170, label: L('Strike A Min', 'Tekan A Min', 'Tocar La Men') },
                      { x: 720, w: 110, label: L('Strike F Maj', 'Tekan F Maj', 'Tocar Fa May') },
                    ].map((b, i) => (
                      <g key={i} transform={`translate(${b.x}, 42)`}>
                        <rect width={b.w} height="34" rx="4" fill="#083344" stroke="#38bdf8" strokeWidth="1.5" />
                        <text x={b.w / 2} y="21" textAnchor="middle" fill="#e0f2fe" fontSize="13" fontFamily="monospace" fontWeight="bold">
                          {b.label}
                        </text>
                      </g>
                    ))}

                    {/* Track 2: Damper Pedal Position Curve (Down = Held, Up = Clear Dampers) */}
                    <text x="20" y="135" fill="#f59e0b" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{L("DAMPER PEDAL", "PEDAL DAMPER", "PEDAL DE SOSTÉN")}</text>
                    <text x="20" y="149" fill="#64748b" fontSize="12" fontFamily="monospace">{L("Up = Clear", "Atas = Redam", "Arriba = Limpiar")}</text>
                    <text x="20" y="162" fill="#64748b" fontSize="12" fontFamily="monospace">{L("Down = Sustain", "Bawah = Gaung", "Abajo = Sostén")}</text>

                    {/* Pedal Waveform Path */}
                    <path
                      d="M 150 120 L 168 158 L 340 158 L 355 112 L 372 158 L 530 158 L 545 112 L 562 158 L 720 158 L 735 112 L 752 158 L 830 158"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.8"
                      strokeLinejoin="round"
                    />

                    {/* Pedal Change Callouts (After the beat!) */}
                    {[355, 545, 735].map((px, idx) => (
                      <g key={idx}>
                        <circle cx={px} cy="112" r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.2" />
                        <text x={px + 8} y="106" fill="#fca5a5" fontSize="11.5" fontFamily="monospace" fontWeight="bold">
                          {L("↑ LIFT & RE-PRESS (+80ms AFTER note strike!)", "↑ ANGKAT & INJAK KEMBALI (+80ms SETELAH tuts ditekan!)", "↑ LEVANTAR Y VOLVER A PISAR (+80ms TRAS la pulsación!)")}
                        </text>
                      </g>
                    ))}

                    <text x="440" y="212" textAnchor="middle" fill="#94a3b8" fontSize="13" fontFamily="monospace">
                      {L(
                        "Listen with your ears: The foot lifts on the exact chord strike to damp the old harmony, and catches the new chord before the fingers release.",
                        "Dengarkan dengan telinga: Kaki terangkat tepat saat tuts akor baru ditekan untuk meredam harmoni lama, lalu segera menginjak sebelum jari terlepas.",
                        "Escucha atentamente: El pie se levanta justo al pulsar el nuevo acorde para silenciar la armonía anterior, y vuelve a pisar antes de que los dedos suelten."
                      )}
                    </text>
                  </svg>
                </div>

                {/* 3 Pedals Reference Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="p-4 md:p-5 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2">
                    <div className="font-mono font-bold text-base text-cyan-400">
                      {isId ? '1. Pedal Kiri: Una Corda (Soft Pedal)' : isEs ? '1. Pedal Izquierdo: Una Corda (Pedal Suave)' : '1. Left Pedal: Una Corda (Soft Pedal)'}
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Pada grand piano, menggeser mekanisme palu sedikit ke kanan sehingga palu hanya memukul 2 dari 3 senar (una corda), menghasilkan warna suara yang lembut, hangat, dan intim.'
                        : isEs
                        ? 'En un piano de cola, desplaza los macillos ligeramente a la derecha para golpear solo 2 de 3 cuerdas (una corda), logrando un timbre velado e íntimo.'
                        : 'On a grand piano, shifts the entire action slightly right so hammers strike fewer strings, creating a veiled, intimate timbre (marked una corda; release at tre corde).'}
                    </p>
                  </div>
                  <div className="p-4 md:p-5 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2">
                    <div className="font-mono font-bold text-base text-cyan-400">
                      {isId ? '2. Pedal Tengah: Sostenuto Pedal' : isEs ? '2. Pedal Central: Pedal Tonal (Sostenuto)' : '2. Middle Pedal: Sostenuto Pedal'}
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Menahan hanya nada/akor yang sedang ditekan tepat saat pedal tengah diinjak, sementara nada-nada berikutnya tetap kering (tidak ikut bergema). Umum pada karya Debussy dan Ravel.'
                        : isEs
                        ? 'Sostiene selectivamente solo los apagadores levantados en el instante de pisarlo, manteniendo secos los pasajes staccato posteriores (frecuente en Debussy y Ravel).'
                        : 'Selectively sustains only the dampers that are already raised at the moment the middle pedal is depressed, leaving subsequent staccato passages completely dry.'}
                    </p>
                  </div>
                  <div className="p-4 md:p-5 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2">
                    <div className="font-mono font-bold text-base text-cyan-400">
                      {isId ? '3. Pedal Kanan: Damper (Sustain) Pedal' : isEs ? '3. Pedal Derecho: Pedal de Resonancia (Sustain)' : '3. Right Pedal: Damper (Sustain) Pedal'}
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Mengangkat seluruh peredam (damper) dari senar sehingga semua senar beresonansi simpatik. Letakkan tumit tetap menapak di lantai dan gerakkan ujung kaki sebagai poros engsel.'
                        : isEs
                        ? 'Levanta todos los apagadores de las cuerdas despertando ricos armónicos simpáticos. Mantén el talón anclado al suelo y pivota suavemente con el antepié.'
                        : 'Lifts all dampers off the strings, awakening rich sympathetic overtones. Keep your heel anchored on the floor and pivot smoothly with the ball of your right foot.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* FIG 3.4: Thumb-Under (Passaggio del Pollice) & Forearm Rotation Blueprint */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 3.4 — THUMB-UNDER (PASSAGGIO DEL POLLICE), CROSSOVER &amp; FOREARM ROTATION
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Mekanika 3 Fase Thumb-Under (1-2-3 → 1-2-3-4-5) & Rotasi Lengan Bawah (Pronasi / Supinasi)'
                        : isEs
                        ? 'Mecánica de 3 Fases del Paso de Pulgar (1-2-3 → 1-2-3-4-5) y Rotación del Antebrazo'
                        : '3-Phase Thumb-Under Trajectory (1-2-3 → 1-2-3-4-5) & Axial Forearm Rotation'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    SCALAR &amp; ROTATIONAL MECHANICS
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 245" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="245" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Phase 1: 1-2-3 on C4-D4-E4 */}
                    <g transform="translate(18, 16)">
                      <rect width="262" height="212" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        {L("PHASE 01 • PREPARATION (C4–E4)", "FASE 01 • PERSIAPAN (C4–E4)", "FASE 01 • PREPARACIÓN (C4–E4)")}
                      </text>
                      <g transform="translate(22, 34)">
                        {['C4 (1)', 'D4 (2)', 'E4 (3)', 'F4', 'G4'].map((k, i) => (
                          <g key={i} transform={`translate(${i * 43}, 0)`}>
                            <rect width="41" height="86" rx="3" fill={i < 3 ? '#083344' : '#0f172a'} stroke={i < 3 ? '#38bdf8' : '#334155'} strokeWidth="1.2" />
                            <text x="20.5" y="76" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="monospace" fontWeight="bold">{k.split(' ')[0]}</text>
                            {i < 3 && (
                              <>
                                <circle cx="20.5" cy="42" r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="1.2" />
                                <text x="20.5" y="46" textAnchor="middle" fill="#ffffff" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{i + 1}</text>
                              </>
                            )}
                          </g>
                        ))}
                        {/* Early thumb flexion arrow starting on D4 */}
                        <path d="M 22 56 Q 55 96 98 56" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" />
                      </g>
                      <text x="14" y="142" fill="#e2e8f0" fontSize="12.5" fontWeight="bold">{L("Early Thumb Preparation Rule:", "Aturan Persiapan Jempol Dini:", "Regla de Preparación Temprana:")}</text>
                      <text x="14" y="158" fill="#94a3b8" fontSize="12">{L("As soon as Finger 2 strikes D4, Thumb (1)", "Begitu jari 2 menekan D4, jempol (1)", "Al tocar el dedo 2 en D4, el pulgar (1)")}</text>
                      <text x="14" y="172" fill="#94a3b8" fontSize="12">{L("already releases C4 and glides horizontally", "sudah lepas dari C4 dan meluncur datar", "ya suelta C4 y se desliza horizontal")}</text>
                      <text x="14" y="186" fill="#94a3b8" fontSize="12">{L("beneath the palm toward F4.", "di bawah telapak menuju F4.", "bajo la palma hacia F4.")}</text>
                      <text x="14" y="204" fill="#38bdf8" fontSize="10.5" fontFamily="monospace" fontWeight="bold">{L("RIGHT HAND (RH) • ascending →", "TANGAN KANAN (RH) • naik →", "MANO DERECHA (MD) • ascendente →")}</text>
                    </g>

                    {/* Phase 2: Thumb Tuck on F4 */}
                    <g transform="translate(298, 16)">
                      <rect width="264" height="212" rx="6" fill="#0a0f1a" stroke="#10b981" strokeWidth="1.2" />
                      <text x="14" y="20" fill="#34d399" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        {L("PHASE 02 • THUMB-UNDER (E4→F4)", "FASE 02 • JEMPOL-BAWAH (E4→F4)", "FASE 02 • PULGAR (E4→F4)")}
                      </text>
                      <g transform="translate(22, 34)">
                        {['C4', 'D4', 'E4 (3)', 'F4 (1)', 'G4'].map((k, i) => {
                          const isE = i === 2;
                          const isF = i === 3;
                          return (
                            <g key={i} transform={`translate(${i * 43}, 0)`}>
                              <rect
                                width="41"
                                height="86"
                                rx="3"
                                fill={isF ? '#064e3b' : isE ? '#0f172a' : '#0f172a'}
                                stroke={isF ? '#10b981' : isE ? '#38bdf8' : '#334155'}
                                strokeWidth={isF ? 2 : 1}
                              />
                              <text x="20.5" y="76" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="monospace" fontWeight="bold">{k.split(' ')[0]}</text>
                              {isE && (
                                <>
                                  <circle cx="20.5" cy="36" r="9.5" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.2" />
                                  <text x="20.5" y="40" textAnchor="middle" fill="#ffffff" fontSize="13" fontFamily="monospace" fontWeight="bold">3</text>
                                </>
                              )}
                              {isF && (
                                <>
                                  <circle cx="20.5" cy="46" r="11" fill="#059669" stroke="#fde047" strokeWidth="1.8" />
                                  <text x="20.5" y="50" textAnchor="middle" fill="#ffffff" fontSize="14" fontFamily="monospace" fontWeight="bold">1</text>
                                </>
                              )}
                            </g>
                          );
                        })}
                        <path d="M 106 46 Q 128 72 150 48" fill="none" stroke="#fde047" strokeWidth="2.5" />
                      </g>
                      <text x="14" y="142" fill="#6ee7b7" fontSize="12.5" fontWeight="bold">{L("Zero-Elbow-Flap Constraint:", "Aturan Siku Tidak Mengayun:", "Regla: Codo sin Balanceo:")}</text>
                      <text x="14" y="158" fill="#cbd5e1" fontSize="12">{L("Finger 3 acts as a quiet pivot post on E4 while", "Jari 3 jadi tumpuan diam di E4 sementara", "El dedo 3 es pivote quieto en E4 mientras")}</text>
                      <text x="14" y="172" fill="#cbd5e1" fontSize="12">{L("Thumb (1) flexes at the CMC joint to play F4.", "jempol (1) menekuk di sendi CMC ke F4.", "el pulgar (1) flexiona en la CMC hacia F4.")}</text>
                      <text x="14" y="186" fill="#fde68a" fontSize="12">{L("Keep wrist level; do not kick your elbow out!", "Jaga pergelangan datar; siku jangan keluar!", "Muñeca nivelada; ¡no abras el codo!")}</text>
                      <text x="14" y="204" fill="#34d399" fontSize="10.5" fontFamily="monospace" fontWeight="bold">{L("RIGHT HAND (RH) • ascending →", "TANGAN KANAN (RH) • naik →", "MANO DERECHA (MD) • ascendente →")}</text>
                    </g>

                    {/* Phase 3: Unfold 2-3-4-5 & Forearm Rotation */}
                    <g transform="translate(580, 16)">
                      <rect width="262" height="212" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#a855f7" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        {L("PHASE 03 • UNFOLD & ROTATION", "FASE 03 • BUKA & ROTASI", "FASE 03 • ABRIR Y ROTACIÓN")}
                      </text>
                      <g transform="translate(18, 34)">
                        {['F4 (1)', 'G4 (2)', 'A4 (3)', 'B4 (4)', 'C5 (5)'].map((k, i) => (
                          <g key={i} transform={`translate(${i * 44}, 0)`}>
                            <rect width="42" height="86" rx="3" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.2" />
                            <text x="21" y="76" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="monospace" fontWeight="bold">{k.split(' ')[0]}</text>
                            <circle cx="21" cy="42" r="10" fill="#4338ca" stroke="#ffffff" strokeWidth="1.2" />
                            <text x="21" y="46" textAnchor="middle" fill="#ffffff" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{i + 1}</text>
                          </g>
                        ))}
                      </g>
                      <text x="14" y="142" fill="#d8b4fe" fontSize="12.5" fontWeight="bold">{L("Lateral Glide & Axial Rotation:", "Luncur Lateral & Rotasi Lengan:", "Deslizamiento y Rotación Axial:")}</text>
                      <text x="14" y="158" fill="#94a3b8" fontSize="12">{L("Once Thumb (1) lands on F4, the entire hand", "Setelah jempol (1) mendarat di F4, seluruh", "Al caer el pulgar (1) en F4, toda la mano")}</text>
                      <text x="14" y="172" fill="#94a3b8" fontSize="12">{L("glides laterally over G4–C5. When descending,", "tangan meluncur ke G4–C5. Saat turun,", "se desliza sobre G4–C5. Al descender,")}</text>
                      <text x="14" y="186" fill="#94a3b8" fontSize="12">{L("cross Finger 3 (or 4) smoothly OVER Thumb (1).", "silangkan jari 3 (atau 4) DI ATAS jempol (1).", "cruza el dedo 3 (o 4) POR ENCIMA del pulgar.")}</text>
                      <text x="14" y="204" fill="#a855f7" fontSize="10.5" fontFamily="monospace" fontWeight="bold">{L("RIGHT HAND (RH) • LH mirrors it", "TANGAN KANAN (RH) • kiri kebalikan", "MANO DERECHA (MD) • izq. en espejo")}</text>
                    </g>
                  </svg>
                </div>

                {/* 3 Biomechanical Vectors Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="p-4 md:p-5 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2">
                    <div className="font-mono font-bold text-base text-cyan-400">
                      {isId ? '1. Transfer Beban Lengan Vertikal' : isEs ? '1. Transferencia Vertical de Peso del Brazo' : '1. Vertical Arm Weight Transfer'}
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Jangan memukul tuts hanya dengan otot jari yang kaku. Biarkan gravitasi dan beban lengan jatuh secara elastis ke dasar tuts (keybed), lalu rilekskan pergelangan segera setelah bunyi tercipta.'
                        : isEs
                        ? 'Canaliza la gravedad desde el hombro y antebrazo hacia el fondo de las teclas a través del puente elástico de los nudillos, liberando la tensión al instante.'
                        : 'Channel gravity from the shoulder and forearm into the keybed through a resilient knuckle bridge, releasing muscular tension the instant after sound production.'}
                    </p>
                  </div>
                  <div className="p-4 md:p-5 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2">
                    <div className="font-mono font-bold text-cyan-400">
                      {isId ? '2. Rotasi Lengan Bawah (Pronasi / Supinasi)' : isEs ? '2. Rotación del Antebrazo (Pronación / Supinación)' : '2. Forearm Rotation (Pronation / Supination)'}
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Putar poros tulang hasta-pengumpil (seperti memutar gagang pintu) untuk memindahkan berat antara Jari 1 (dalam) dan Jari 5 (luar). Kunci utama memainkan Alberti Bass (C-G-E-G) dan broken octaves tanpa lelah.'
                        : isEs
                        ? 'Gira el eje del antebrazo (como al girar el pomo de una puerta) para balancear el peso rápidamente entre el Pulgar (1) y el Meñique (5) en bajos Alberti y octavas rotas.'
                        : 'Rotate the radius-ulna forearm axis (like turning a doorknob) to rock weight rapidly between Thumb (1) and Pinky (5) during Alberti bass, tremolos, and broken octaves.'}
                    </p>
                  </div>
                  <div className="p-4 md:p-5 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2">
                    <div className="font-mono font-bold text-base text-cyan-400">
                      {isId ? '3. Kedalaman Tuts Hitam & Posisi Jempol' : isEs ? '3. Profundidad de Teclas Negras y Posición del Pulgar' : '3. Black-Key Depth & Thumb Avoidance'}
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Karena jempol berukuran pendek, hindari menempatkan Jari 1 di tuts hitam pada jalur tangga nada. Saat banyak tuts hitam dimainkan, majukan posisi tangan sedikit lebih dalam ke arah fallboard.'
                        : isEs
                        ? 'Por ser más corto, evita colocar el pulgar (1) en teclas negras durante escalas (evitando torceduras) e introduce la mano un poco más hacia la tapa del piano.'
                        : 'Because the thumb is shorter than fingers 2–4, avoid placing Finger 1 on black keys during scalar runs (preventing awkward wrist twists), and move the hand slightly deeper into the keybed.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* TABLE B2: 12-KEY MAJOR SCALE MASTER FINGERING TABLE */}
              <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      {isId ? 'BAGIAN 3.4 • TABEL FINGERING TANGGA NADA MAYOR 12 KUNCI (1 OKTAF STANDAR)' : isEs ? 'SECCIÓN 3.4 • TABLA DE DIGITACIÓN DE ESCALAS MAYORES EN 12 TONALIDADES' : 'SECTION 3.4 • 12-KEY MAJOR SCALE FINGERING CHART (1-OCTAVE STANDARD)'}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {isId
                        ? 'Tabel Master Fingering Tangga Nada Mayor 12 Kunci (Tangan Kanan & Kiri)'
                        : isEs
                        ? 'Tabla Maestra de Digitación de Escalas Mayores en 12 Tonalidades (MD y MI)'
                        : '12-Key Major Scale Master Fingering Table (Right Hand & Left Hand)'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-medium text-cyan-300 bg-cyan-950/50 px-2.5 py-1 rounded border border-cyan-500/30">
                    HANON / CZERNY / ABRSM VERIFIED
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-mono font-medium uppercase text-slate-400 bg-slate-900/80">
                        <th className="py-2.5 px-3">{L("Key", "Kunci", "Tonalidad")}</th>
                        <th className="py-2.5 px-3">{L("Scale Degrees (1 – 8)", "Tingkat Tangga Nada (1 – 8)", "Grados de la Escala (1 – 8)")}</th>
                        <th className="py-2.5 px-3 text-cyan-400">{L("RH Ascending", "RH Naik", "MD Ascendente")}</th>
                        <th className="py-2.5 px-3 text-cyan-300">{L("RH Descending", "RH Turun", "MD Descendente")}</th>
                        <th className="py-2.5 px-3 text-slate-300">{L("LH Ascending", "LH Naik", "MI Ascendente")}</th>
                        <th className="py-2.5 px-3 text-slate-300">{L("LH Descending", "LH Turun", "MI Descendente")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs md:text-sm text-slate-200">
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">{L("C Major", "C Mayor", "Do Mayor")}</td><td className="py-2 px-3 text-slate-400">C D E F G A B C</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">{L("G Major", "G Mayor", "Sol Mayor")}</td><td className="py-2 px-3 text-slate-400">G A B C D E F♯ G</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">{L("D Major", "D Mayor", "Re Mayor")}</td><td className="py-2 px-3 text-slate-400">D E F♯ G A B C♯ D</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">{L("A Major", "A Mayor", "La Mayor")}</td><td className="py-2 px-3 text-slate-400">A B C♯ D E F♯ G♯ A</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">{L("E Major", "E Mayor", "Mi Mayor")}</td><td className="py-2 px-3 text-slate-400">E F♯ G♯ A B C♯ D♯ E</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{L("B Major", "B Mayor", "Si Mayor")}</td><td className="py-2 px-3 text-slate-400">B C♯ D♯ E F♯ G♯ A♯ B</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">4-3-2-1-4-3-2-1</td><td className="py-2 px-3">1-2-3-4-1-2-3-4</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{L("F♯ Major", "F♯ Mayor", "Fa♯ Mayor")}</td><td className="py-2 px-3 text-slate-400">F♯ G♯ A♯ B C♯ D♯ E♯ F♯</td><td className="py-2 px-3 text-slate-200 font-bold">2-3-4-1-2-3-1-2</td><td className="py-2 px-3">2-1-3-2-1-4-3-2</td><td className="py-2 px-3 text-slate-200 font-bold">4-3-2-1-3-2-1-4</td><td className="py-2 px-3">4-1-2-3-1-2-3-4</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{L("D♭ Major", "D♭ Mayor", "Re♭ Mayor")}</td><td className="py-2 px-3 text-slate-400">D♭ E♭ F G♭ A♭ B♭ C D♭</td><td className="py-2 px-3 text-slate-200 font-bold">2-3-1-2-3-4-1-2</td><td className="py-2 px-3">2-1-4-3-2-1-3-2</td><td className="py-2 px-3 text-slate-200 font-bold">3-2-1-4-3-2-1-3</td><td className="py-2 px-3">3-1-2-3-4-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{L("A♭ Major", "A♭ Mayor", "La♭ Mayor")}</td><td className="py-2 px-3 text-slate-400">A♭ B♭ C D♭ E♭ F G A♭</td><td className="py-2 px-3 text-slate-200 font-bold">3-4-1-2-3-1-2-3</td><td className="py-2 px-3">3-2-1-3-2-1-4-3</td><td className="py-2 px-3 text-slate-200 font-bold">3-2-1-4-3-2-1-3</td><td className="py-2 px-3">3-1-2-3-4-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{L("E♭ Major", "E♭ Mayor", "Mi♭ Mayor")}</td><td className="py-2 px-3 text-slate-400">E♭ F G A♭ B♭ C D E♭</td><td className="py-2 px-3 text-slate-200 font-bold">3-1-2-3-4-1-2-3</td><td className="py-2 px-3">3-2-1-4-3-2-1-3</td><td className="py-2 px-3 text-slate-200 font-bold">3-2-1-4-3-2-1-3</td><td className="py-2 px-3">3-1-2-3-4-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{L("B♭ Major", "B♭ Mayor", "Si♭ Mayor")}</td><td className="py-2 px-3 text-slate-400">B♭ C D E♭ F G A B♭</td><td className="py-2 px-3 text-slate-200 font-bold">4-1-2-3-1-2-3-4</td><td className="py-2 px-3">4-3-2-1-3-2-1-4</td><td className="py-2 px-3 text-slate-200 font-bold">3-2-1-4-3-2-1-3</td><td className="py-2 px-3">3-1-2-3-4-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{L("F Major", "F Mayor", "Fa Mayor")}</td><td className="py-2 px-3 text-slate-400">F G A B♭ C D E F</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-4-1-2-3-4</td><td className="py-2 px-3">4-3-2-1-4-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLE C2: 12-KEY NATURAL MINOR SCALE MASTER FINGERING TABLE */}
              <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      {isId ? 'BAGIAN 3.5 • FINGERING MINOR ASLI, HARMONIS & MELODIS 12 KUNCI' : isEs ? 'SECCIÓN 3.5 • DIGITACIÓN DE ESCALAS MENORES (12 TONALIDADES)' : 'SECTION 3.5 • 12-KEY NATURAL, HARMONIC & MELODIC MINOR FINGERING'}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {isId
                        ? 'Tabel Master Fingering Tangga Nada Minor Asli (12 Kunci)'
                        : isEs
                        ? 'Tabla Maestra de Digitación de Escalas Menores Naturales (12 Tonalidades)'
                        : '12-Key Natural Minor Scale Master Fingering Table'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-300 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                    BLACK-KEY TONIC ADJUSTED
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-mono font-medium uppercase text-slate-400 bg-slate-900/80">
                        <th className="py-2.5 px-3">{L("Minor Key", "Kunci Minor", "Tonalidad Menor")}</th>
                        <th className="py-2.5 px-3">{L("Rel. Major", "Relatif Mayor", "Mayor Relativo")}</th>
                        <th className="py-2.5 px-3 text-cyan-400">{L("RH Ascending", "RH Naik", "MD Ascendente")}</th>
                        <th className="py-2.5 px-3 text-cyan-300">{L("RH Descending", "RH Turun", "MD Descendente")}</th>
                        <th className="py-2.5 px-3 text-slate-300">{L("LH Ascending", "LH Naik", "MI Ascendente")}</th>
                        <th className="py-2.5 px-3 text-slate-300">{L("LH Descending", "LH Turun", "MI Descendente")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs md:text-sm text-slate-200">
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">{L("A Minor", "A Minor", "La Menor")}</td><td className="py-2 px-3 text-slate-400">C (0)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">{L("E Minor", "E Minor", "Mi Menor")}</td><td className="py-2 px-3 text-slate-400">G (1♯)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">{L("D Minor", "D Minor", "Re Menor")}</td><td className="py-2 px-3 text-slate-400">F (1♭)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">{L("G Minor", "G Minor", "Sol Menor")}</td><td className="py-2 px-3 text-slate-400">B♭ (2♭)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">{L("C Minor", "C Minor", "Do Menor")}</td><td className="py-2 px-3 text-slate-400">E♭ (3♭)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">B Minor</td><td className="py-2 px-3 text-slate-400">D (2♯)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">4-3-2-1-4-3-2-1</td><td className="py-2 px-3">1-2-3-4-1-2-3-4</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">F♯ Minor</td><td className="py-2 px-3 text-slate-400">A (3♯)</td><td className="py-2 px-3 text-slate-200 font-bold">2-3-1-2-3-1-2-3</td><td className="py-2 px-3">3-2-1-3-2-1-3-2</td><td className="py-2 px-3 text-slate-200 font-bold">4-3-2-1-3-2-1-4</td><td className="py-2 px-3">4-1-2-3-1-2-3-4</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">C♯ Minor</td><td className="py-2 px-3 text-slate-400">E (4♯)</td><td className="py-2 px-3 text-slate-200 font-bold">2-3-1-2-3-1-2-3</td><td className="py-2 px-3">3-2-1-3-2-1-3-2</td><td className="py-2 px-3 text-slate-200 font-bold">3-2-1-4-3-2-1-3</td><td className="py-2 px-3">3-1-2-3-4-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">G♯ Minor</td><td className="py-2 px-3 text-slate-400">B (5♯)</td><td className="py-2 px-3 text-slate-200 font-bold">2-3-1-2-3-1-2-3</td><td className="py-2 px-3">3-2-1-3-2-1-3-2</td><td className="py-2 px-3 text-slate-200 font-bold">3-2-1-3-2-1-4-3</td><td className="py-2 px-3">3-4-1-2-3-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">D♯ / E♭ Min</td><td className="py-2 px-3 text-slate-400">F♯ / G♭</td><td className="py-2 px-3 text-slate-200 font-bold">2-1-2-3-4-1-2-3</td><td className="py-2 px-3">3-2-1-4-3-2-1-2</td><td className="py-2 px-3 text-slate-200 font-bold">2-1-4-3-2-1-3-2</td><td className="py-2 px-3">2-3-1-2-3-4-1-2</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">B♭ Minor</td><td className="py-2 px-3 text-slate-400">D♭ (5♭)</td><td className="py-2 px-3 text-slate-200 font-bold">4-1-2-3-1-2-3-4</td><td className="py-2 px-3">4-3-2-1-3-2-1-4</td><td className="py-2 px-3 text-slate-200 font-bold">2-1-3-2-1-4-3-2</td><td className="py-2 px-3">2-3-4-1-2-3-1-2</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">F Minor</td><td className="py-2 px-3 text-slate-400">A♭ (4♭)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-4-1-2-3-4</td><td className="py-2 px-3">4-3-2-1-4-3-2-1</td><td className="py-2 px-3 text-slate-200 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLES D2, E2, F2, G2, H2: Chromatic, Arpeggios, Intervals & Chords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-mono font-bold text-base text-cyan-400">{L("CHROMATIC SCALE & 1-OCTAVE ARPEGGIO FINGERING", "FINGERING TANGGA NADA KROMATIK & ARPEGGIO 1-OKTAF", "DIGITACIÓN DE ESCALA CROMÁTICA Y ARPEGIOS")}</span>
                    <span className="text-xs font-mono font-medium text-slate-400">{L("PATTERN ENGINE", "POLA JARI", "PATRÓN GUÍA")}</span>
                  </div>
                  <div className="space-y-2.5 text-slate-300">
                    <div className="p-3 bg-slate-900/70 rounded-lg border border-slate-800">
                      <div className="font-mono font-bold text-cyan-300 mb-1">{L("Chromatic Scale (≥4 Semitones):", "Tangga Nada Kromatik (≥4 Semitone):", "Escala Cromática (≥4 Semitonos):")}</div>
                      <p className="text-xs md:text-sm leading-relaxed">
                        {isId ? (
                          <>
                            • Tuts Hitam: Selalu <b>Jari 3 (Tengah)</b> pada kedua tangan.<br />
                            • Tuts Putih: <b>Jari 1 (Jempol)</b>, kecuali pasangan tuts putih berdampingan <b>E–F</b> dan <b>B–C</b> yang memakai <b>1–2</b> (RH Naik / LH Turun) dan <b>2–1</b> (RH Turun / LH Naik).
                          </>
                        ) : isEs ? (
                          <>
                            • Teclas Negras: Siempre <b>Dedo 3 (Medio)</b> en ambas manos.<br />
                            • Teclas Blancas: <b>Dedo 1 (Pulgar)</b>, salvo parejas blancas adyacentes <b>Mi–Fa</b> y <b>Si–Do</b> que usan <b>1–2</b> (MD Asc / MI Desc) y <b>2–1</b> (MD Desc / MI Asc).
                          </>
                        ) : (
                          <>
                            • Black Keys: Always <b>Finger 3 (Middle)</b> in both hands.<br />
                            • White Keys: <b>Finger 1 (Thumb)</b>, except adjacent white pairs <b>E–F</b> and <b>B–C</b> which use <b>1–2</b> (RH Asc / LH Desc) and <b>2–1</b> (RH Desc / LH Asc).
                          </>
                        )}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-900/70 rounded-lg border border-slate-800">
                      <div className="font-mono font-bold text-cyan-300 mb-1">{L("1-Octave Arpeggio Triads & Dom7:", "Arpeggio Trinitas 1-Oktaf & Dom7:", "Arpegios de Tríada y Dom7 (1 Octava):")}</div>
                      <p className="text-xs md:text-sm font-mono leading-relaxed">
                        • {L("White Root", "Akar Putih", "Tónica Blanca")} (C–E–G–C): RH <b>1-2-3-5</b> | LH <b>5-4-2-1</b> ({L("or", "atau", "o")} 5-3-2-1)<br />
                        • {L("Black Root", "Akar Hitam", "Tónica Negra")} (D♭–F–A♭–D♭): RH <b>2-1-2-4</b> | LH <b>2-1-4-2</b><br />
                        • {L("Dom7 Arpeggio (4 notes + 8ve)", "Arpeggio Dom7 (4 nada + oktaf)", "Arpegio Dom7 (4 notas + 8ª)")}: RH <b>1-2-3-4-5</b> | LH <b>5-4-3-2-1</b>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-mono font-bold text-base text-cyan-400">{L("HARMONIC INTERVALS & CHORD INVERSION FINGERING", "FINGERING INTERVAL HARMONIS & INVERSI AKOR", "DIGITACIÓN DE INTERVALOS ARMÓNICOS E INVERSIONES")}</span>
                    <span className="text-xs font-mono font-medium text-slate-400">{L("POLYPHONIC VOICING", "SUARA POLIFONIK", "DISPOSICIÓN POLIFÓNICA")}</span>
                  </div>
                  <table className="w-full text-left font-mono text-xs md:text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="py-1.5">{L("Structure / Span", "Struktur / Bentangan", "Estructura / Intervalo")}</th>
                        <th className="py-1.5 text-cyan-400">{L("Right Hand (RH)", "Tangan Kanan (RH)", "Mano Derecha (MD)")}</th>
                        <th className="py-1.5 text-slate-300">{L("Left Hand (LH)", "Tangan Kiri (LH)", "Mano Izquierda (MI)")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      <tr><td className="py-1.5">{L("Dyad 2nd / 3rd / 4th", "Dwi-nada 2nd / 3rd / 4th", "Díada 2ª / 3ª / 4ª")}</td><td className="text-cyan-300">1–2 / 1–3 / 1–4</td><td className="text-slate-400">2–1 / 3–1 / 4–1</td></tr>
                      <tr><td className="py-1.5">{L("Dyad 5th / 6th / 8ve", "Dwi-nada 5th / 6th / Oktaf", "Díada 5ª / 6ª / 8ª")}</td><td className="text-cyan-300">1–5</td><td className="text-slate-400">5–1</td></tr>
                      <tr><td className="py-1.5">{L("Triad Root Position (5/3)", "Trinitas Root (5/3)", "Tríada Fundamental (5/3)")}</td><td className="text-cyan-300 font-bold">1 – 3 – 5</td><td className="text-slate-200 font-bold">5 – 3 – 1</td></tr>
                      <tr><td className="py-1.5">{L("Triad 1st Inversion (6/3)", "Trinitas Inversi 1 (6/3)", "Tríada 1ª Inversión (6/3)")}</td><td className="text-cyan-300 font-bold">1 – 2 – 5</td><td className="text-slate-200 font-bold">5 – 3 – 1</td></tr>
                      <tr><td className="py-1.5">{L("Triad 2nd Inversion (6/4)", "Trinitas Inversi 2 (6/4)", "Tríada 2ª Inversión (6/4)")}</td><td className="text-cyan-300 font-bold">1 – 3 – 5</td><td className="text-slate-200 font-bold">5 – 2 – 1</td></tr>
                      <tr><td className="py-1.5">{L("4-Note 7th / Triad+8ve", "Akor 4-Nada 7th / Trinitas+Oktaf", "Acorde 4 Notas Séptima / Tríada+8ª")}</td><td className="text-cyan-300 font-bold">1 – 2 – 3 – 5</td><td className="text-slate-200 font-bold">5 – 3 – 2 – 1</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3.6: 6 Common Biomechanical Faults & Diagnostic Remediation Matrix */}
              <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono font-medium font-bold text-cyan-400 uppercase tracking-widest block">
                      {isId ? 'BAGIAN 3.6 — DIAGNOSIS BIOMEKANIKA & PENCEGAHAN CEDERA' : isEs ? 'SECCIÓN 3.6 — DIAGNÓSTICO BIOMECÁNICO Y PREVENCIÓN DE LESIONES' : 'SECTION 3.6 — BIOMECHANICAL DIAGNOSTICS & INJURY PREVENTION'}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {isId
                        ? '6 Kesalahan Postur Umum Pemula & Koreksi Anatomisnya'
                        : isEs
                        ? '6 Errores Biomecánicos Comunes y Solución Anatómica'
                        : '6 Common Biomechanical Faults & Anatomical Remediation'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    {isId ? 'KEAMANAN TENDON' : isEs ? 'SEGURIDAD DE TENDONES' : 'TENDON SAFETY'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                  {[
                    {
                      fault: '01. Collapsed Distal Joint (DIP)',
                      symptom: isId ? 'Ruas ujung jari melipat ke dalam saat menekan tuts.' : isEs ? 'La última falange del dedo se dobla hacia adentro al presionar.' : 'Fingertip joint buckles backward under key resistance.',
                      fix: isId ? 'Aktifkan fleksor profundus; bayangkan memegang bola tenis dengan ujung bantalan jari.' : isEs ? 'Activa el flexor profundo; imagina sostener una pelota de tenis con la yema del dedo.' : 'Engage the deep flexor tendon; strike on the fleshy pad just below the nail.'
                    },
                    {
                      fault: isId ? '02. Deviasi Ulnar Pergelangan Tangan' : isEs ? '02. Desviación Ulnar de Muñeca' : '02. Ulnar Wrist Deviation',
                      symptom: isId ? 'Pergelangan tangan membengkok miring ke samping luar menuju kelingking.' : isEs ? 'La muñeca se desvía bruscamente hacia el lado del meñique.' : 'Wrist twists sharply outward toward the pinky side.',
                      fix: isId ? 'Geser seluruh lengan bawah secara horizontal (lateral tracking) agar garis jari ke siku tetap lurus.' : isEs ? 'Desplaza todo el antebrazo lateralmente para mantener la alineación recta con el codo.' : 'Shift the entire forearm laterally so the middle finger aligns straight down the radius/ulna.'
                    },
                    {
                      fault: isId ? '03. Kelingking Tegang Terangkat (Flying 5th)' : isEs ? '03. Tensión del Meñique en Vuelo (Flying 5th)' : '03. Extensor Pinky Tension (Flying 5th)',
                      symptom: isId ? 'Jari kelingking (5) terangkat kaku ke udara saat jari 1–3 bermain.' : isEs ? 'El meñique (5) se levanta rígido al tocar con los dedos 1 a 3.' : 'Finger 5 curls or sticks straight up in the air involuntarily.',
                      fix: isId ? 'Lepaskan ketegangan tendon ekstensor; biarkan jari 5 menyentuh permukaan tuts dengan rileks.' : isEs ? 'Libera la tensión del extensor; deja que el dedo 5 repose relajado sobre las teclas.' : 'Consciously release extensor co-contraction; let Finger 5 rest lightly on key surfaces.'
                    },
                    {
                      fault: isId ? '04. Pergelangan Tangan Jatuh / Turun' : isEs ? '04. Muñeca Caída por Debajo del Teclado' : '04. Dropped / Sagging Carpal Tunnel',
                      symptom: isId ? 'Pergelangan jatuh di bawah bibir kayu piano, menekan saraf median.' : isEs ? 'La muñeca cae por debajo del nivel de las teclas, comprimiendo tendones.' : 'Wrist hangs below the keybed lip, compressing carpal tendons.',
                      fix: isId ? 'Naikkan tinggi kursi dan jaga jembatan pergelangan mengapung sejajar permukaan tuts putih.' : isEs ? 'Eleva el banquillo y mantén el puente de la muñeca flotando nivelado.' : 'Raise bench height and maintain a buoyant, level carpal bridge.'
                    },
                    {
                      fault: isId ? '05. Jepitan Pangkal Jempol Kaku' : isEs ? '05. Bloqueo por Aducción del Pulgar' : '05. Thumb Abduction Clamping',
                      symptom: isId ? 'Jempol menekan erat ke telunjuk saat memainkan oktaf atau akor lebar.' : isEs ? 'El pulgar se aprieta contra el índice al tocar octavas o acordes anchos.' : 'Thumb squeezes inward against the index finger during octaves.',
                      fix: isId ? 'Buka sendi pangkal jempol (CMC) secara longgar; sangga rentangan oktaf dengan struktur kubah telapak.' : isEs ? 'Abre la articulación basal del pulgar relajadamente; apoya el alcance con el arco de la palma.' : 'Release the adductor pollicis muscle; support wide spans from the metacarpal arch.'
                    },
                    {
                      fault: isId ? '06. Bahu Terangkat / Menegang' : isEs ? '06. Elevación Rígida de Hombros' : '06. Trapezius / Shoulder Elevation',
                      symptom: isId ? 'Bahu terangkat naik ke arah telinga saat menghadapi bagian tempo cepat.' : isEs ? 'Los hombros se encogen hacia las orejas en pasajes rápidos.' : 'Shoulders hike up toward the ears during fast scalar passages.',
                      fix: isId ? 'Hembuskan napas saat frase sulit; jatuhkan tulang belikat ke bawah agar beban lengan mengalir bebas.' : isEs ? 'Exhala en pasajes difíciles y relaja los omóplatos hacia abajo para fluir con el peso del brazo.' : 'Exhale into fast passages and drop the scapulae down so arm weight flows freely.'
                    },
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                      <div className="font-mono font-bold text-rose-400">{item.fault}</div>
                      <p className="text-slate-400 text-xs md:text-sm leading-relaxed">{item.symptom}</p>
                      <div className="pt-1.5 border-t border-slate-800/80 text-emerald-300 text-xs md:text-sm leading-relaxed">
                        <strong className="font-mono text-xs uppercase">{L("FIX: ", "SOLUSI: ", "SOLUCIÓN: ")}</strong>{item.fix}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 4: PC Computer Keyboard Gaming (QWERTY & Virtual Piano) */}
          {/* ========================================================================= */}
          {activeChapter === 'roblox' && (
            <article className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
              <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs md:text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 04 • MESIN KEYBOARD KOMPUTER & PIANO VIRTUAL 61-TUTS' : isEs ? 'MÓDULO 04 • TECLADO DE PC Y PIANO VIRTUAL' : 'MODULE 04 • PC KEYBOARD ENGINE & 61-KEY VIRTUAL PIANO'}
                    </span>
                    <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700">
                      3 TECHNICAL DIAGRAMS • FULL 61-KEY MATRIX
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {isId
                      ? 'Masterclass Keyboard PC: Qwerty Typer, Sheet Music QWERTY & Peta 61-Tuts Roblox (MIRP)'
                      : isEs
                      ? 'Teclado de PC: Qwerty Typer, Partituras QWERTY y Mapa Completo de 61 Teclas (MIRP)'
                      : 'PC Keyboard Architecture: Qwerty Typer, Sheet Music QWERTY & Full 61-Key MIRP Matrix'}
                  </h2>
                  <p className="text-sm md:text-[15px] text-slate-200 mt-3 leading-relaxed max-w-4xl">
                    {isId
                      ? 'Octavia mengubah keyboard laptop atau mechanical keyboard PC Anda menjadi instrumen polifonik 5-oktaf (C2 hingga C7) dengan dua mode tampilan interaktif real-time dan dua skema pemetaan tombol (Roblox MIRP & Standard Compact).'
                      : isEs
                      ? 'Octavia convierte el teclado de tu ordenador en un instrumento polifónico de 5 octavas (C2 a C7) con dos vistas interactivas en tiempo real y dos esquemas de mapeo.'
                      : 'Octavia transforms any laptop or mechanical PC keyboard into a 5-octave polyphonic instrument (C2 to C7) featuring two real-time interactive visual engines and two configurable key-mapping topologies.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectChapter('exercises')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 text-xs md:text-sm font-mono font-bold transition-all flex items-center gap-2 flex-shrink-0 shadow-sm active:scale-95 cursor-pointer"
                  title={isId ? 'Buka Generator Latihan Drill (Bab 06)' : isEs ? 'Abrir Generador de Drills (Cap. 06)' : 'Open Drill Generator (Ch. 06)'}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{t.jumpToDrills}</span>
                  <span>→</span>
                </button>
              </div>

              {/* FIG 4.1: Dual PC Game Views Viewport Comparison */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 4.1 — DUAL PC KEYBOARD VIEWPORT ARCHITECTURE (QWERTY TYPER vs. SHEET MUSIC QWERTY)
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Perbandingan Visualisasi Qwerty Typer (Kotak Target Mengecil & Indikator Merah Tuts Hitam) vs. Partitur QWERTY'
                        : 'Viewport Comparison: Spatial Qwerty Typer Reticles vs. Grand Staff QWERTY Notehead Badges'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    SETTINGS &gt; GAME VIEW
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 285" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="285" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Left Viewport: Qwerty Typer */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="252" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#f59e0b" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        VIEWPORT 01 • QWERTY TYPER (SPATIAL KEYGRID OVERLAY)
                      </text>

                      {/* 4 Key Rows Mock */}
                      <g transform="translate(20, 36)">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((k, i) => (
                          <g key={`r1-${i}`} transform={`translate(${i * 36}, 0)`}>
                            <rect width="32" height="30" rx="4" fill={k === '8' ? '#451a03' : '#0f172a'} stroke={k === '8' ? '#f59e0b' : '#334155'} strokeWidth={k === '8' ? 1.8 : 1} />
                            <text x="16" y="19" textAnchor="middle" fill={k === '8' ? '#fde68a' : '#94a3b8'} fontSize="13.5" fontFamily="monospace" fontWeight="bold">{k}</text>
                          </g>
                        ))}
                        {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map((k, i) => (
                          <g key={`r2-${i}`} transform={`translate(${8 + i * 35}, 38)`}>
                            <rect width="32" height="30" rx="4" fill={k === 't' ? '#083344' : '#0f172a'} stroke={k === 't' ? '#38bdf8' : '#334155'} strokeWidth={k === 't' ? 1.8 : 1} />
                            <text x="16" y="19" textAnchor="middle" fill={k === 't' ? '#7dd3fc' : '#cbd5e1'} fontSize="13.5" fontFamily="monospace" fontWeight="bold">{k}</text>
                          </g>
                        ))}
                        {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map((k, i) => (
                          <g key={`r3-${i}`} transform={`translate(${18 + i * 35}, 76)`}>
                            <rect width="32" height="30" rx="4" fill="#0f172a" stroke="#334155" />
                            <text x="16" y="19" textAnchor="middle" fill="#cbd5e1" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{k}</text>
                          </g>
                        ))}
                        {['z', 'x', 'c', 'v', 'b', 'n', 'm'].map((k, i) => (
                          <g key={`r4-${i}`} transform={`translate(${48 + i * 35}, 114)`}>
                            <rect width="32" height="30" rx="4" fill="#0f172a" stroke="#334155" />
                            <text x="16" y="19" textAnchor="middle" fill="#cbd5e1" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{k}</text>
                          </g>
                        ))}

                        {/* Approaching Cyan Target Box on [t] */}
                        <rect x="142" y="32" width="44" height="42" rx="6" fill="none" stroke="#38bdf8" strokeWidth="2" />
                        {/* Approaching Red Sharp Target Box on [y] */}
                        <rect x="176" y="31" width="46" height="44" rx="6" fill="none" stroke="#f43f5e" strokeWidth="2.2" />
                      </g>

                      <rect x="16" y="192" width="368" height="48" rx="4" fill="#0f172a" stroke="#1e293b" />
                      <text x="26" y="210" fill="#7dd3fc" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                        • Cyan/Amber Reticle = Natural White Key (Press when box matches key)
                      </text>
                      <text x="26" y="227" fill="#fda4af" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                        • Red Reticle (#f43f5e) = Sharp / Black Key on that physical keycap
                      </text>
                    </g>

                    {/* Right Viewport: Sheet Music QWERTY (Identical to In-Game: No Staff Lines, Only Bar Lines & Playhead) */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="252" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#38bdf8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        VIEWPORT 02 • SHEET MUSIC QWERTY (IN-GAME FORMAT)
                      </text>

                      {/* In-Game Sidebar Panel Replica */}
                      <rect x="16" y="34" width="60" height="148" rx="4" fill="#f7f5ed" stroke="#cbd5e1" strokeWidth="1" />
                      <text x="46" y="50" fill="#64748b" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">KEY</text>
                      <text x="46" y="65" fill="#0f172a" fontSize="10.5" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">C Major</text>
                      <text x="46" y="90" fill="#64748b" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">BPM</text>
                      <text x="46" y="106" fill="#0f172a" fontSize="15" fontFamily="monospace" fontWeight="bold" textAnchor="middle">120</text>
                      <text x="46" y="130" fill="#64748b" fontSize="7.5" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">LAYOUT</text>
                      <text x="46" y="144" fill="#0f172a" fontSize="10" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">Roblox</text>

                      {/* Scrolling Area: NO Staff Lines, ONLY Vertical Bar Lines & Playhead */}
                      {/* Measure Bar Line 1 */}
                      <line x1="95" y1="36" x2="95" y2="180" stroke="#334155" strokeWidth="1.2" />
                      <text x="99" y="47" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">1</text>

                      {/* Measure Bar Line 2 */}
                      <line x1="235" y1="36" x2="235" y2="180" stroke="#334155" strokeWidth="1.2" />
                      <text x="239" y="47" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">2</text>

                      {/* Measure Bar Line 3 */}
                      <line x1="375" y1="36" x2="375" y2="180" stroke="#334155" strokeWidth="1.2" />
                      <text x="379" y="47" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">3</text>

                      {/* Vertical Red Playhead / Hit Line */}
                      <line x1="145" y1="34" x2="145" y2="182" stroke="#ef4444" strokeWidth="1.8" />

                      {/* Notes: Stamped QWERTY Keycap Boxes Stacked in 1 Single Lane */}
                      {/* Note 1 (Melody, Active on Playhead): [t] (C4, RH) */}
                      <g transform="translate(145, 82)">
                        <rect x="-12" y="-10" width="24" height="20" rx="4" fill="#f59e0b" stroke="#020617" strokeWidth="1" />
                        <text x="0" y="4" textAnchor="middle" fill="#020617" fontSize="12" fontFamily="monospace" fontWeight="bold">t</text>
                      </g>

                      {/* Note 2 (Bass, Stacked on Same Beat at Playhead): [8] (C3, LH) */}
                      <g transform="translate(145, 118)">
                        <rect x="-12" y="-10" width="24" height="20" rx="4" fill="#818cf8" stroke="#020617" strokeWidth="1" />
                        <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontFamily="monospace" fontWeight="bold">8</text>
                      </g>

                      {/* Upcoming Melody Notes */}
                      <g transform="translate(205, 82)">
                        <rect x="-12" y="-10" width="24" height="20" rx="4" fill="#38bdf8" stroke="#020617" strokeWidth="1" />
                        <text x="0" y="4" textAnchor="middle" fill="#020617" fontSize="12" fontFamily="monospace" fontWeight="bold">u</text>
                      </g>

                      <g transform="translate(265, 82)">
                        <rect x="-12" y="-10" width="24" height="20" rx="4" fill="#38bdf8" stroke="#020617" strokeWidth="1" />
                        <text x="0" y="4" textAnchor="middle" fill="#020617" fontSize="12" fontFamily="monospace" fontWeight="bold">o</text>
                      </g>

                      <g transform="translate(325, 82)">
                        <rect x="-12" y="-10" width="24" height="20" rx="4" fill="#38bdf8" stroke="#020617" strokeWidth="1" />
                        <text x="0" y="4" textAnchor="middle" fill="#020617" fontSize="12" fontFamily="monospace" fontWeight="bold">s</text>
                      </g>

                      <rect x="16" y="192" width="368" height="48" rx="4" fill="#0f172a" stroke="#1e293b" />
                      <text x="26" y="210" fill="#e2e8f0" fontSize="12" fontFamily="monospace" fontWeight="bold">
                        {isId ? '• Format In-Game: Key Signature di panel kiri (C Major / A Minor)' : isEs ? '• Formato In-Game: Armadura en panel izquierdo (C Major / A Minor)' : '• In-Game Format: Key Signature on left panel (C Major / A Minor)'}
                      </text>
                      <text x="26" y="227" fill="#94a3b8" fontSize="12" fontFamily="monospace">
                        {isId ? '• Sheet bersih tanpa paranada/clef, hanya garis bar dan tuts bertumpuk' : isEs ? '• Partitura limpia sin pentagrama/claves, solo compases y teclas apiladas' : '• Clean sheet without staves/clefs, only bar lines and stacked keys'}
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 4.2: Complete 61-Key Roblox (MIRP) Master Keyboard Pitch Map */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 4.2 — COMPLETE 61-KEY ROBLOX (MIRP) VIRTUAL PIANO MASTER KEYBOARD MAP (C2 — C7)
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Peta Lengkap 61-Tuts Roblox / Virtual Piano (MIRP): Baris Angka, QWERTY, ASDF, ZXCV & Kombinasi Shift'
                        : 'Complete 61-Key Roblox / Virtual Piano (MIRP) Pitch Matrix: White Keys & Shift Black Keys'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-300 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                    KEY [t] = MIDDLE C4 (MIDI 60)
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 320" className="w-full min-w-[780px] h-auto select-none font-sans">
                    <rect width="860" height="320" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* ROW 1: 1 2 3 4 5 6 7 8 9 0 (C2 to E3) */}
                    <text x="20" y="26" fill="#94a3b8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                      ROW 1 (NUMBERS) • BASS OCTAVES C2 — E3
                    </text>
                    {[
                      { k: '1', sh: '! C♯2', p: 'C2', oct: 2 },
                      { k: '2', sh: '@ D♯2', p: 'D2', oct: 2 },
                      { k: '3', sh: '—', p: 'E2', oct: 2 },
                      { k: '4', sh: '$ F♯2', p: 'F2', oct: 2 },
                      { k: '5', sh: '% G♯2', p: 'G2', oct: 2 },
                      { k: '6', sh: '^ A♯2', p: 'A2', oct: 2 },
                      { k: '7', sh: '—', p: 'B2', oct: 2 },
                      { k: '8', sh: '* C♯3', p: 'C3', oct: 3 },
                      { k: '9', sh: '( D♯3', p: 'D3', oct: 3 },
                      { k: '0', sh: '—', p: 'E3', oct: 3 },
                    ].map((item, i) => (
                      <g key={`m1-${i}`} transform={`translate(${20 + i * 82}, 34)`}>
                        <rect width="76" height="46" rx="4" fill="#0f172a" stroke={item.p === 'C2' || item.p === 'C3' ? '#818cf8' : '#334155'} strokeWidth="1.2" />
                        <text x="12" y="18" fill="#f8fafc" fontSize="12" fontFamily="monospace" fontWeight="bold">{item.k}</text>
                        <text x="66" y="18" textAnchor="end" fill="#818cf8" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{item.p}</text>
                        <text x="38" y="37" textAnchor="middle" fill={item.sh === '—' ? '#475569' : '#f59e0b'} fontSize="12" fontFamily="monospace">
                          {item.sh === '—' ? 'No Black Key' : `⇧ ${item.sh}`}
                        </text>
                      </g>
                    ))}

                    {/* ROW 2: q w e r t y u i o p (F3 to A4) */}
                    <text x="20" y="100" fill="#94a3b8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                      ROW 2 (TOP LETTERS) • MID REGISTER F3 — A4 (KEY [t] = MIDDLE C4)
                    </text>
                    {[
                      { k: 'q', sh: 'Q F♯3', p: 'F3', mid: false },
                      { k: 'w', sh: 'W G♯3', p: 'G3', mid: false },
                      { k: 'e', sh: 'E A♯3', p: 'A3', mid: false },
                      { k: 'r', sh: '—', p: 'B3', mid: false },
                      { k: 't', sh: 'T C♯4', p: 'C4 (Anchor)', mid: true },
                      { k: 'y', sh: 'Y D♯4', p: 'D4', mid: false },
                      { k: 'u', sh: '—', p: 'E4', mid: false },
                      { k: 'i', sh: 'I F♯4', p: 'F4', mid: false },
                      { k: 'o', sh: 'O G♯4', p: 'G4', mid: false },
                      { k: 'p', sh: 'P A♯4', p: 'A4', mid: false },
                    ].map((item, i) => (
                      <g key={`m2-${i}`} transform={`translate(${20 + i * 82}, 108)`}>
                        <rect
                          width="76"
                          height="46"
                          rx="4"
                          fill={item.mid ? '#451a03' : '#0f172a'}
                          stroke={item.mid ? '#f59e0b' : '#0284c7'}
                          strokeWidth={item.mid ? 2 : 1.2}
                        />
                        <text x="12" y="18" fill="#ffffff" fontSize="12" fontFamily="monospace" fontWeight="bold">{item.k}</text>
                        <text x="66" y="18" textAnchor="end" fill={item.mid ? '#fde68a' : '#38bdf8'} fontSize="13.5" fontFamily="monospace" fontWeight="bold">{item.p}</text>
                        <text x="38" y="37" textAnchor="middle" fill={item.sh === '—' ? '#475569' : '#f59e0b'} fontSize="12" fontFamily="monospace">
                          {item.sh === '—' ? 'No Black Key' : `⇧ ${item.sh}`}
                        </text>
                      </g>
                    ))}

                    {/* ROW 3: a s d f g h j k l (B4 to C6) */}
                    <text x="20" y="174" fill="#94a3b8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                      ROW 3 (HOME ROW) • TREBLE REGISTER B4 — C6
                    </text>
                    {[
                      { k: 'a', sh: '—', p: 'B4' },
                      { k: 's', sh: 'S C♯5', p: 'C5' },
                      { k: 'd', sh: 'D D♯5', p: 'D5' },
                      { k: 'f', sh: '—', p: 'E5' },
                      { k: 'g', sh: 'G F♯5', p: 'F5' },
                      { k: 'h', sh: 'H G♯5', p: 'G5' },
                      { k: 'j', sh: 'J A♯5', p: 'A5' },
                      { k: 'k', sh: '—', p: 'B5' },
                      { k: 'l', sh: 'L C♯6', p: 'C6' },
                    ].map((item, i) => (
                      <g key={`m3-${i}`} transform={`translate(${20 + i * 91}, 182)`}>
                        <rect width="84" height="46" rx="4" fill="#0f172a" stroke={item.p === 'C5' || item.p === 'C6' ? '#10b981' : '#334155'} strokeWidth="1.2" />
                        <text x="12" y="18" fill="#ffffff" fontSize="12" fontFamily="monospace" fontWeight="bold">{item.k}</text>
                        <text x="74" y="18" textAnchor="end" fill="#34d399" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{item.p}</text>
                        <text x="42" y="37" textAnchor="middle" fill={item.sh === '—' ? '#475569' : '#f59e0b'} fontSize="12" fontFamily="monospace">
                          {item.sh === '—' ? 'No Black Key' : `⇧ ${item.sh}`}
                        </text>
                      </g>
                    ))}

                    {/* ROW 4: z x c v b n m (D6 to C7) */}
                    <text x="20" y="248" fill="#94a3b8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                      ROW 4 (BOTTOM ROW) • HIGH OCTAVE D6 — C7
                    </text>
                    {[
                      { k: 'z', sh: 'Z D♯6', p: 'D6' },
                      { k: 'x', sh: '—', p: 'E6' },
                      { k: 'c', sh: 'C F♯6', p: 'F6' },
                      { k: 'v', sh: 'V G♯6', p: 'G6' },
                      { k: 'b', sh: 'B A♯6', p: 'A6' },
                      { k: 'n', sh: '—', p: 'B6' },
                      { k: 'm', sh: 'High C7', p: 'C7' },
                    ].map((item, i) => (
                      <g key={`m4-${i}`} transform={`translate(${20 + i * 117}, 256)`}>
                        <rect width="108" height="46" rx="4" fill="#0f172a" stroke={item.p === 'C7' ? '#f59e0b' : '#334155'} strokeWidth="1.2" />
                        <text x="14" y="18" fill="#ffffff" fontSize="12" fontFamily="monospace" fontWeight="bold">{item.k}</text>
                        <text x="96" y="18" textAnchor="end" fill="#fbbf24" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{item.p}</text>
                        <text x="54" y="37" textAnchor="middle" fill={item.sh === '—' ? '#475569' : '#f59e0b'} fontSize="12" fontFamily="monospace">
                          {item.sh === '—' ? 'No Black Key' : item.k === 'm' ? 'Top Key (MIDI 96)' : `⇧ ${item.sh}`}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* FIG 4.3: Standard Compact 2-Octave Layout & Virtual Piano Syntax Decoder */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 4.3 — STANDARD COMPACT 2-TIER CHROMATIC LAYOUT &amp; SHEET SYNTAX DECODER
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Tata Letak Compact (Tanpa Shift untuk Tuts Hitam) & Cara Membaca Sintaks Virtual Piano'
                        : 'Standard Compact Layout (Zero-Shift Black Keys) & Virtual Piano Sheet Syntax'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    DAW / TRACKER STYLE
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 195" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="195" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Left Box: Upper Octave Q-P + 2 3 5 6 7 */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="162" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        UPPER OCTAVE TIER • WHITE [Q–P] + BLACK [2 3 5 6 7]
                      </text>
                      {/* White Keys Q W E R T Y U I O P */}
                      {['Q:C4', 'W:D4', 'E:E4', 'R:F4', 'T:G4', 'Y:A4', 'U:B4', 'I:C5', 'O:D5', 'P:E5'].map((item, i) => (
                        <g key={i} transform={`translate(${16 + i * 37}, 82)`}>
                          <rect width="34" height="62" rx="3" fill="#0f172a" stroke="#0284c7" strokeWidth="1.2" />
                          <text x="17" y="26" textAnchor="middle" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="bold">{item.split(':')[0]}</text>
                          <text x="17" y="50" textAnchor="middle" fill="#38bdf8" fontSize="12" fontFamily="monospace">{item.split(':')[1]}</text>
                        </g>
                      ))}
                      {/* Staggered Black Keys 2 3 _ 5 6 7 _ 9 0 */}
                      {[
                        { k: '2', p: 'C♯4', x: 35 },
                        { k: '3', p: 'D♯4', x: 72 },
                        { k: '5', p: 'F♯4', x: 146 },
                        { k: '6', p: 'G♯4', x: 183 },
                        { k: '7', p: 'A♯4', x: 220 },
                        { k: '9', p: 'C♯5', x: 294 },
                        { k: '0', p: 'D♯5', x: 331 },
                      ].map((bk, idx) => (
                        <g key={idx} transform={`translate(${bk.x}, 32)`}>
                          <rect width="30" height="44" rx="3" fill="#020617" stroke="#f59e0b" strokeWidth="1.3" />
                          <text x="15" y="18" textAnchor="middle" fill="#fde68a" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{bk.k}</text>
                          <text x="15" y="34" textAnchor="middle" fill="#f59e0b" fontSize="11" fontFamily="monospace">{bk.p}</text>
                        </g>
                      ))}
                    </g>

                    {/* Right Box: Lower Octave Z-M + S D G H J */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="162" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#818cf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                        LOWER OCTAVE TIER • WHITE [Z–M] + BLACK [S D G H J]
                      </text>
                      {['Z:C3', 'X:D3', 'C:E3', 'V:F3', 'B:G3', 'N:A3', 'M:B3'].map((item, i) => (
                        <g key={i} transform={`translate(${24 + i * 48}, 82)`}>
                          <rect width="44" height="62" rx="3" fill="#0f172a" stroke="#6366f1" strokeWidth="1.2" />
                          <text x="22" y="26" textAnchor="middle" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="bold">{item.split(':')[0]}</text>
                          <text x="22" y="50" textAnchor="middle" fill="#a5b4fc" fontSize="12" fontFamily="monospace">{item.split(':')[1]}</text>
                        </g>
                      ))}
                      {[
                        { k: 'S', p: 'C♯3', x: 50 },
                        { k: 'D', p: 'D♯3', x: 98 },
                        { k: 'G', p: 'F♯3', x: 194 },
                        { k: 'H', p: 'G♯3', x: 242 },
                        { k: 'J', p: 'A♯3', x: 290 },
                      ].map((bk, idx) => (
                        <g key={idx} transform={`translate(${bk.x}, 32)`}>
                          <rect width="34" height="44" rx="3" fill="#020617" stroke="#f59e0b" strokeWidth="1.3" />
                          <text x="17" y="18" textAnchor="middle" fill="#fde68a" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{bk.k}</text>
                          <text x="17" y="34" textAnchor="middle" fill="#f59e0b" fontSize="11" fontFamily="monospace">{bk.p}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                </div>

                {/* Syntax & Hardware Engineering Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="font-mono font-bold text-base text-cyan-400">
                      {isId ? '1. Sintaks Tanda Kurung Virtual Piano' : isEs ? '1. Sintaxis de Corchetes en Virtual Piano' : '1. Virtual Piano Bracket Syntax'}
                    </div>
                    <p className="text-slate-300 leading-relaxed font-mono text-xs md:text-sm">
                      {isId ? (
                        <>
                          • <b>[tuo]</b> = Tekan t, u, o bersamaan (Trinitas C Mayor)<br />
                          • <b>[t-u-o]</b> = Gulir / arpeggio cepat dari kiri ke kanan<br />
                          • <b>T Y I</b> = Huruf kapital / simbol memerlukan tombol Shift
                        </>
                      ) : isEs ? (
                        <>
                          • <b>[tuo]</b> = Presiona t, u, o simultáneamente (Tríada Do Mayor)<br />
                          • <b>[t-u-o]</b> = Arpegia rápidamente de izquierda a derecha<br />
                          • <b>T Y I</b> = Letras mayúsculas / símbolos requieren Shift
                        </>
                      ) : (
                        <>
                          • <b>[tuo]</b> = Press t, u, o simultaneously (C Major Triad)<br />
                          • <b>[t-u-o]</b> = Roll/arpeggiate rapidly from left to right<br />
                          • <b>T Y I</b> = Capital letters / symbols require Shift
                        </>
                      )}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="font-mono font-bold text-base text-cyan-400">
                      {isId ? '2. Strategi Transposisi Langsung (↑ / ↓)' : isEs ? '2. Estrategia de Transposición en Vivo (↑ / ↓)' : '2. Live Transposition Strategy (↑ / ↓)'}
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Dalam permainan keyboard PC, akor yang mencampurkan huruf kecil dan huruf kapital (Shift + non-Shift sekaligus) sulit dieksekusi. Gunakan tombol panah Atas/Bawah untuk menggeser semitone lagu ke kunci C Mayor / A Minor.'
                        : isEs
                        ? 'Tocar acordes que combinan teclas naturales con sostenidos que requieren Shift es incómodo en PC. Usa las flechas Arriba/Abajo para transponer la canción a Do Mayor / La Menor y tocar sin Shift.'
                        : 'Mixed chords containing both unshifted naturals and shifted accidentals are awkward on a PC keyboard. Use the Up/Down arrow keys to transpose the key signature toward C Major / A Minor.'}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="font-mono font-bold text-cyan-400">
                      {isId ? '3. NKRO vs. Ghosting Matriks Membran' : isEs ? '3. NKRO vs. Efecto Fantasma de Matriz de Membrana' : '3. NKRO vs. Membrane Matrix Ghosting'}
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Keyboard membran kantor umumnya membatasi 2–3 tombol bersamaan (2KRO/6KRO). Untuk memainkan akor 4–6 nada tanpa input yang hilang, gunakan keyboard mekanikal dengan fitur N-Key Rollover (NKRO).'
                        : isEs
                        ? 'Los teclados de membrana estándar sufren de bloqueo cuando se presionan 3+ teclas en la misma fila de circuito. Los teclados mecánicos con NKRO registran acordes simultáneos ilimitados.'
                        : 'Standard office membrane keyboards suffer from matrix blocking when 3+ keys share a circuit row. Mechanical keyboards with diode-isolated N-Key Rollover (NKRO) register unlimited simultaneous chord tones.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4.4: Complete PC Keyboard Transposition Masterclass & Controls */}
              <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      {isId ? 'BAGIAN 4.4 — MESIN TRANSPOSISI LANGSUNG, STRATEGI BEBAS-SHIFT & KONTROL PC' : isEs ? 'SECCIÓN 4.4 — MOTOR DE TRANSPOSICIÓN EN VIVO, ESTRATEGIA SIN SHIFT Y CONTROLES PC' : 'SECTION 4.4 — LIVE TRANSPOSITION ENGINE, ZERO-SHIFT STRATEGY & PC CONTROLS'}
                    </span>
                    <h3 className="text-sm md:text-[15px] font-bold text-white mt-0.5">
                      {isId
                        ? 'Panduan Lengkap Transposisi Nada Real-Time di Keyboard PC & Strategi Bebas-Shift'
                        : isEs
                        ? 'Guía Completa de Transposición en Tiempo Real para Teclado PC y Estrategia Sin Shift'
                        : 'Complete PC Keyboard Real-Time Transposition Guide & Zero-Shift Strategy'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    {isId ? 'PANAH ATAS (↑) / PANAH BAWAH (↓)' : isEs ? 'FLECHA ARRIBA (↑) / FLECHA ABAJO (↓)' : 'ARROW UP (↑) / ARROW DOWN (↓)'}
                  </span>
                </div>

                {/* 3 Pillar Cards for Transposition */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#070a12] border border-cyan-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono font-bold text-sm">
                        ↑/↓
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {isId ? 'Kontrol Transposisi Semitone' : isEs ? 'Control de Transposición' : 'Semitone Transpose Controls'}
                      </h4>
                    </div>
                    <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                      {isId
                        ? 'Tekan tombol Panah Atas (↑) untuk menaikkan nada +1 semitone, atau Panah Bawah (↓) untuk menurunkan -1 semitone. Nilai transpose aktif ditampilkan langsung di bilah kontrol layar (misalnya Transpose: +2).'
                        : isEs
                        ? 'Presiona la flecha Arriba (↑) para subir +1 semitono, o Abajo (↓) para bajar -1 semitono. El valor activo se muestra en el panel de control (ej. Transpose: +2).'
                        : 'Press Arrow Up (↑) to shift pitch up +1 semitone, or Arrow Down (↓) to shift down -1 semitone. The active transpose offset is displayed on the HUD (e.g. Transpose: +2).'}
                    </p>
                    <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 font-mono text-xs md:text-sm text-cyan-300">
                      <code>midiNote = mirpKey.midi + mirpTranspose</code>
                    </div>
                  </div>

                  <div className="bg-[#070a12] border border-slate-700 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 flex items-center justify-center font-mono font-bold text-sm">
                        0-⇧
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {isId ? 'Strategi Pro "Zero-Shift"' : isEs ? 'Estrategia "Zero-Shift"' : 'The "Zero-Shift" Pro Hack'}
                      </h4>
                    </div>
                    <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                      {isId
                        ? 'Tuts putih tidak membutuhkan Shift (1-0, q-p, a-l, z-m), sedangkan tuts hitam (kres/mol) mengharuskan menahan tombol Shift. Transpose lagu bertuts hitam rumit (seperti F♯ / D♭) ke tangga nada C Mayor agar seluruh lagu bisa dimainkan hanya dengan tuts putih tanpa Shift!'
                        : isEs
                        ? 'Las teclas blancas no requieren Shift, mientras que las negras obligan a mantener pulsado Shift. Transpón canciones difíciles con muchos sostenidos/bemoles (como Fa♯ o Re♭) a Do Mayor para tocar sin usar Shift.'
                        : 'Naturals require no Shift, while accidentals demand holding Shift. Transpose black-key heavy songs (like F♯ or D♭) toward C Major to play the entire piece purely on natural keys with zero Shift gymnastics!'}
                    </p>
                    <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 font-mono text-xs md:text-sm text-cyan-300">
                      <span>F♯ Major (6♯) + Transpose (-6) = C Major (0♯)</span>
                    </div>
                  </div>

                  <div className="bg-[#070a12] border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 flex items-center justify-center font-mono font-bold text-sm">
                        8va
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {isId ? 'Auto-Transpose & Oktaf Compact' : isEs ? 'Auto-Transposición y Octavas' : 'Auto-Transpose & Octave Shift'}
                      </h4>
                    </div>
                    <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                      {isId
                        ? 'Octavia menyediakan tombol saran transposisi otomatis yang mendeteksi Key Signature lagu. Pada tata letak Compact 2-oktaf, tombol panah berfungsi sebagai Octave Shift (-3 hingga +2 oktaf) untuk menjelajahi C1 hingga C8.'
                        : isEs
                        ? 'Octavia incluye un botón de transposición automática según la armadura. En el modo Compact de 2 octavas, las flechas cambian octavas (-3 a +2) para recorrer de Do1 a Do8.'
                        : 'Octavia offers a 1-click Auto-Transpose button calculated from the song Key Signature. In the 2-octave Compact layout, arrows act as an Octave Shift (-3 to +2 octaves) spanning C1 to C8.'}
                    </p>
                    <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 font-mono text-xs md:text-sm text-cyan-300">
                      <span>Reticle visual otomatis bergeser ke tuts baru</span>
                    </div>
                  </div>
                </div>

                {/* 12-Key Transposition Matrix Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'TABEL REKOMENDASI TRANSPOSISI 12 NADA DASAR (ZERO-SHIFT MATRIX)' : isEs ? 'MATRIZ DE TRANSPOSICIÓN EN 12 TONALIDADES (ZERO-SHIFT)' : '12-KEY ZERO-SHIFT TRANSPOSITION MATRIX'}
                    </h4>
                    <span className="text-xs font-mono font-medium text-slate-400">
                      {isId ? 'Target: Minimalkan Tombol Shift' : isEs ? 'Meta: Minimizar tecla Shift' : 'Goal: Eliminate Shift Modifiers'}
                    </span>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-xl bg-[#070a12]">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-900/90">
                          <th className="py-2.5 px-3">{isId ? 'Tonalitas Asli' : isEs ? 'Tonalidad Original' : 'Original Key'}</th>
                          <th className="py-2.5 px-3">{isId ? 'Jumlah Kres / Mol' : isEs ? 'Cantidad de ♯ / ♭' : 'Sharps / Flats'}</th>
                          <th className="py-2.5 px-3 text-slate-300">{isId ? 'Nilai Transpose Disarankan' : isEs ? 'Transposición Sugerida' : 'Recommended Transposition'}</th>
                          <th className="py-2.5 px-3 text-cyan-400">{isId ? 'Tonalitas Hasil Transpose' : isEs ? 'Tonalidad Resultante' : 'Resulting Key'}</th>
                          <th className="py-2.5 px-3">{isId ? 'Keuntungan Bermain di PC' : isEs ? 'Ventaja en Teclado PC' : 'PC Gaming Advantage'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs md:text-sm">
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">C Major / A Minor</td>
                          <td className="py-2 px-3">0 ♯ / 0 ♭</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">{isId ? '0 (Tanpa Ubah)' : isEs ? '0 (Sin Cambios)' : '0 (No Change)'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major / A Minor</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? '100% tuts putih alami, tanpa kombinasi Shift sama sekali.' : isEs ? '100% teclas naturales sin Shift.' : '100% natural keys, zero Shift key combinations.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">G Major / E Minor</td>
                          <td className="py-2 px-3">1 ♯ (F♯)</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">{isId ? '-1 semitone (Panah ↓)' : isEs ? '-1 semitono (Flecha ↓)' : '-1 semitone (Arrow ↓)'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">F Major (1 ♭) / C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Hanya 1 tuts hitam tersisa; mudah dimainkan.' : isEs ? 'Casi sin teclas negras.' : 'Nearly all naturals; smooth scalar runs.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">D Major / B Minor</td>
                          <td className="py-2 px-3">2 ♯ (F♯, C♯)</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">{isId ? '-2 semitone (Panah ↓ 2×)' : isEs ? '-2 semitonos (Flecha ↓ 2×)' : '-2 semitones (Arrow ↓ 2×)'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menghilangkan 2 nada kres menjadi tangga nada C natural.' : isEs ? 'Elimina los 2 sostenidos.' : 'Converts 2 sharps into 100% natural C Major white keys.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">A Major / F♯ Minor</td>
                          <td className="py-2 px-3">3 ♯ (F♯, C♯, G♯)</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">{isId ? '-3 semitone (Panah ↓ 3×)' : isEs ? '-3 semitonos (Flecha ↓ 3×)' : '-3 semitones (Arrow ↓ 3×)'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">F Major / C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Mengurangi drastis lompatan Shift pada tangan kanan.' : isEs ? 'Reduce drásticamente combinaciones Shift.' : 'Dramatically reduces right-hand Shift combinations.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">E Major / C♯ Minor</td>
                          <td className="py-2 px-3">4 ♯ (F♯, C♯, G♯, D♯)</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">{isId ? '-4 semitone (Panah ↓ 4×)' : isEs ? '-4 semitonos (Flecha ↓ 4×)' : '-4 semitones (Arrow ↓ 4×)'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menghilangkan 4 tuts hitam yang rawan misinput.' : isEs ? 'Elimina 4 teclas negras propensas a error.' : 'Eliminates 4 tricky black keys prone to missed inputs.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">B Major / G♯ Minor</td>
                          <td className="py-2 px-3">5 ♯ (F♯, C♯, G♯, D♯, A♯)</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">{isId ? '+1 semitone (Panah ↑ 1×)' : isEs ? '+1 semitono (Flecha ↑ 1×)' : '+1 semitone (Arrow ↑ 1×)'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Hanya geser 1 semitone ke atas, 5 kres hilang seketika!' : isEs ? 'Sube 1 semitono y desaparecen 5 sostenidos.' : 'Shift up 1 semitone: all 5 sharps disappear instantly!'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">F♯ / G♭ Major</td>
                          <td className="py-2 px-3">{isId ? '6 ♯ / 6 ♭ (Maksimal Kres/Mol)' : isEs ? '6 ♯ / 6 ♭ (Máximo ♯/♭)' : '6 ♯ / 6 ♭ (Max Sharps/Flats)'}</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">{isId ? '+6 atau -6 semitone' : isEs ? '+6 o -6 semitonos' : '+6 or -6 semitones'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Lagu tersulit menjadi lagu paling mudah dimainkan di PC.' : isEs ? 'Convierte la tonalidad más difícil en la más fácil.' : 'Turns the hardest keyboard piece into pure natural white keys.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">D♭ Major / B♭ Minor</td>
                          <td className="py-2 px-3">5 ♭ (B♭, E♭, A♭, D♭, G♭)</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">{isId ? '-1 semitone (Panah ↓ 1×)' : isEs ? '-1 semitono (Flecha ↓ 1×)' : '-1 semitone (Arrow ↓ 1×)'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Turunkan 1 semitone: 5 mol hilang menjadi C Mayor murni!' : isEs ? 'Baja 1 semitono y desaparecen 5 bemoles.' : 'Shift down 1 semitone: 5 flats resolve into clean C Major.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">A♭ Major / F Minor</td>
                          <td className="py-2 px-3">4 ♭ (B♭, E♭, A♭, D♭)</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">{isId ? '+4 semitone (Panah ↑ 4×)' : isEs ? '+4 semitonos (Flecha ↑ 4×)' : '+4 semitones (Arrow ↑ 4×)'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Sangat direkomendasikan untuk repertoar pop/anime ber-flat.' : isEs ? 'Ideal para repertorio anime/pop con bemoles.' : 'Perfect for pop and anime ballads composed in flat keys.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">E♭ Major / C Minor</td>
                          <td className="py-2 px-3">3 ♭ (B♭, E♭, A♭)</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">-3 semitone (Panah ↓ 3×)</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Mengubah akor Eb-Ab-Bb menjadi C-F-G tanpa Shift.' : isEs ? 'Toca Eb-Ab-Bb como C-F-G sin Shift.' : 'Play Eb-Ab-Bb progression as effortless C-F-G chords.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">B♭ Major / G Minor</td>
                          <td className="py-2 px-3">2 ♭ (B♭, E♭)</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">{isId ? '+2 semitone (Panah ↑ 2×)' : isEs ? '+2 semitonos (Flecha ↑ 2×)' : '+2 semitones (Arrow ↑ 2×)'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Mengoptimalkan kombo kecepatan tinggi pada lagu cepat.' : isEs ? 'Optimiza combos a alta velocidad.' : 'Optimizes high-speed combo execution without misclicks.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">F Major / D Minor</td>
                          <td className="py-2 px-3">1 ♭ (B♭)</td>
                          <td className="py-2 px-3 text-slate-200 font-mono font-bold">{isId ? '-5 atau +1 semitone' : isEs ? '-5 o +1 semitono' : '-5 or +1 semitone'}</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major / G Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Hanya 1 tuts hitam; dapat dimainkan dengan atau tanpa transpose.' : isEs ? 'Apenas 1 bemol; muy accesible.' : 'Only 1 flat; easily playable with or without transposition.'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PC Keyboard Shortcuts Reference Table */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'TABEL PINTASAN KONTROL & NAVIGASI KEYBOARD PC' : isEs ? 'ATAJOS Y CONTROLES DEL TECLADO PC' : 'PC KEYBOARD CONTROLS & SHORTCUT REFERENCE'}
                    </h4>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-xl bg-[#070a12]">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">{isId ? 'Tombol Keyboard' : isEs ? 'Tecla de Teclado' : 'Keyboard Key'}</th>
                          <th className="py-2 px-3">{isId ? 'Mode Layout' : isEs ? 'Modo de Distribución' : 'Layout Mode'}</th>
                          <th className="py-2 px-3">{isId ? 'Fungsi Utama' : isEs ? 'Función Principal' : 'Primary Function'}</th>
                          <th className="py-2 px-3">{isId ? 'Deskripsi Operasional' : isEs ? 'Descripción Operativa' : 'Operational Description'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs md:text-sm">
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-slate-200 font-mono"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">{isId ? 'Panah Atas (↑)' : isEs ? 'Flecha Arriba (↑)' : 'Arrow Up (↑)'}</kbd></td>
                          <td className="py-2 px-3 text-cyan-400">Roblox (MIRP)</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">{isId ? 'Transpose Semitone (+1)' : isEs ? 'Transponer Semitono (+1)' : 'Transpose Semitone (+1)'}</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menaikkan nada seluruh tombol keyboard sebesar 1 semitone.' : isEs ? 'Sube el tono de todas las teclas 1 semitono.' : 'Raises pitch of all mapped keys by +1 semitone.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-slate-200 font-mono"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">{isId ? 'Panah Bawah (↓)' : isEs ? 'Flecha Abajo (↓)' : 'Arrow Down (↓)'}</kbd></td>
                          <td className="py-2 px-3 text-cyan-400">Roblox (MIRP)</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">{isId ? 'Transpose Semitone (-1)' : isEs ? 'Transponer Semitono (-1)' : 'Transpose Semitone (-1)'}</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menurunkan nada seluruh tombol keyboard sebesar 1 semitone.' : isEs ? 'Baja el tono de todas las teclas 1 semitono.' : 'Lowers pitch of all mapped keys by -1 semitone.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-slate-200 font-mono"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">{isId ? 'Panah Atas (↑)' : isEs ? 'Flecha Arriba (↑)' : 'Arrow Up (↑)'}</kbd></td>
                          <td className="py-2 px-3 text-slate-300">Compact Standard</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">{isId ? 'Geser Oktaf Naik (+12)' : isEs ? 'Subir Octava (+12)' : 'Octave Shift Up (+12)'}</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menggeser register tuts 1 oktaf ke atas (hingga maksimal +2 oktaf).' : isEs ? 'Desplaza el registro 1 octava arriba (hasta +2).' : 'Shifts register up 1 octave (+12 semitones, up to +2 octaves).'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-slate-200 font-mono"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">{isId ? 'Panah Bawah (↓)' : isEs ? 'Flecha Abajo (↓)' : 'Arrow Down (↓)'}</kbd></td>
                          <td className="py-2 px-3 text-slate-300">Compact Standard</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">{isId ? 'Geser Oktaf Turun (-12)' : isEs ? 'Bajar Octava (-12)' : 'Octave Shift Down (-12)'}</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menggeser register tuts 1 oktaf ke bawah (hingga minimal -3 oktaf).' : isEs ? 'Desplaza el registro 1 octava abajo (hasta -3).' : 'Shifts register down 1 octave (-12 semitones, down to -3 octaves).'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-white"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Shift</kbd> + {isId ? 'Tombol' : isEs ? 'Tecla' : 'Key'}</td>
                          <td className="py-2 px-3 text-cyan-400">Roblox (MIRP)</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">{isId ? 'Tuts Hitam (Kres/Mol)' : isEs ? 'Teclas Negras (♯/♭)' : 'Black Keys (Sharps/Flats)'}</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Memainkan tuts hitam pada tuts fisik yang bersangkutan.' : isEs ? 'Toca la tecla negra del botón físico.' : 'Strikes the accidental black key variant of that physical key.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-white"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Space</kbd></td>
                          <td className="py-2 px-3 text-slate-400">{isId ? 'Semua Mode' : isEs ? 'Todos los Modos' : 'All Modes'}</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">Play / Pause</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menjeda atau melanjutkan aliran lagu.' : isEs ? 'Pausa o reanuda la canción.' : 'Pauses or resumes musical playback flow.'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Common Chord Shapes Reference */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'KAMUS BENTUK AKOR DASAR (CHORD DICTIONARY)' : isEs ? 'DICCIONARIO DE ACORDES BÁSICOS' : 'BASIC CHORD DICTIONARY (MIRP vs. COMPACT)'}
                    </h4>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-xl bg-[#070a12]">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-900/90">
                          <th className="py-2.5 px-3">{isId ? 'Akor' : isEs ? 'Acorde' : 'Chord'}</th>
                          <th className="py-2.5 px-3">{isId ? 'Not Musik' : isEs ? 'Notas Musicales' : 'Notes'}</th>
                          <th className="py-2.5 px-3 text-slate-300">{isId ? 'Tombol Roblox (MIRP)' : isEs ? 'Teclas Roblox (MIRP)' : 'Roblox Keys (MIRP)'}</th>
                          <th className="py-2.5 px-3 text-cyan-400">{isId ? 'Tombol Compact (Atas)' : isEs ? 'Teclas Compact (Arriba)' : 'Compact Keys (Upper)'}</th>
                          <th className="py-2.5 px-3 text-slate-300">{isId ? 'Tombol Compact (Bawah)' : isEs ? 'Teclas Compact (Abajo)' : 'Compact Keys (Lower)'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200 text-xs md:text-sm">
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{isId ? 'C Mayor (I)' : isEs ? 'Do Mayor (I)' : 'C Major (I)'}</td><td className="py-2 px-3 text-slate-400">C4 – E4 – G4</td><td className="py-2 px-3 text-slate-200 font-bold">[tuo]</td><td className="py-2 px-3 text-cyan-300">[qet]</td><td className="py-2 px-3 text-slate-400">[zcb]</td></tr>
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{isId ? 'G Mayor (V)' : isEs ? 'Sol Mayor (V)' : 'G Major (V)'}</td><td className="py-2 px-3 text-slate-400">G3 – B3 – D4</td><td className="py-2 px-3 text-slate-200 font-bold">[ywp]</td><td className="py-2 px-3 text-cyan-300">[tuo]</td><td className="py-2 px-3 text-slate-400">[bnx]</td></tr>
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{isId ? 'A Minor (vi)' : isEs ? 'La Menor (vi)' : 'A Minor (vi)'}</td><td className="py-2 px-3 text-slate-400">A3 – C4 – E4</td><td className="py-2 px-3 text-slate-200 font-bold">[wtu]</td><td className="py-2 px-3 text-cyan-300">[yqe]</td><td className="py-2 px-3 text-slate-400">[nzc]</td></tr>
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{isId ? 'F Mayor (IV)' : isEs ? 'Fa Mayor (IV)' : 'F Major (IV)'}</td><td className="py-2 px-3 text-slate-400">F3 – A3 – C4</td><td className="py-2 px-3 text-slate-200 font-bold">[qet]</td><td className="py-2 px-3 text-cyan-300">[ryq]</td><td className="py-2 px-3 text-slate-400">[vnz]</td></tr>
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{isId ? 'D Minor (ii)' : isEs ? 'Re Menor (ii)' : 'D Minor (ii)'}</td><td className="py-2 px-3 text-slate-400">D4 – F4 – A4</td><td className="py-2 px-3 text-slate-200 font-bold">[ryi]</td><td className="py-2 px-3 text-cyan-300">[wry]</td><td className="py-2 px-3 text-slate-400">[xvn]</td></tr>
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">{isId ? 'E Minor (iii)' : isEs ? 'Mi Menor (iii)' : 'E Minor (iii)'}</td><td className="py-2 px-3 text-slate-400">E4 – G4 – B4</td><td className="py-2 px-3 text-slate-200 font-bold">[tuo]</td><td className="py-2 px-3 text-cyan-300">[etu]</td><td className="py-2 px-3 text-slate-400">[cbm]</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 5: Music Theory, Harmony, Voice Leading & Circle of Fifths */}
          {/* ========================================================================= */}
          {activeChapter === 'theory' && (
            <article className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
              <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs md:text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 05 • LABORATORIUM TEORI HARMONI & VOICE LEADING' : isEs ? 'MÓDULO 05 • TEORÍA ARMÓNICA Y CONDUCCIÓN' : 'MODULE 05 • HARMONIC THEORY & VOICE LEADING LAB'}
                    </span>
                    <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700">
                      5 TECHNICAL DIAGRAMS • INTERACTIVE COMPASS
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {isId
                      ? 'Interval 12-Semitone, Konstruksi Akor, Voice Leading Inversi, 7 Modus & Lingkaran Kuint'
                      : isEs
                      ? 'Intervalos de 12 Semitonos, Acordes, Conducción de Voces, 7 Modos y Círculo de Quintas'
                      : '12-Semitone Intervals, Chord Voicings, Inversion Voice Leading, 7 Modes & Circle of Fifths'}
                  </h2>
                  <p className="text-sm md:text-[15px] text-slate-200 mt-3 leading-relaxed max-w-4xl">
                    {isId
                      ? 'Seluruh bangunan harmoni musik Barat bertumpu pada rasio jarak semitone (setengah nada). Dengan menguasai formula interval, inversi akor, pola iringan tangan kiri, dan kompas Circle of Fifths, Anda dapat menganalisis maupun mengimprovisasi lagu di 12 kunci.'
                      : isEs
                      ? 'Toda la armonía occidental se basa en proporciones de semitonos. Dominar las fórmulas de intervalos, inversiones, patrones de mano izquierda y el Círculo de Quintas permite tocar en las 12 tonalidades.'
                      : 'Western harmony is governed by exact semitone intervals. Mastering interval formulas, parsimonious voice leading, left-hand accompaniment patterns, and the Circle of Fifths unlocks fluency across all 12 keys.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectChapter('exercises')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 text-xs md:text-sm font-mono font-bold transition-all flex items-center gap-2 flex-shrink-0 shadow-sm active:scale-95 cursor-pointer"
                  title={isId ? 'Buka Generator Latihan Drill (Bab 06)' : isEs ? 'Abrir Generador de Drills (Cap. 06)' : 'Open Drill Generator (Ch. 06)'}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{t.jumpToDrills}</span>
                  <span>→</span>
                </button>
              </div>

              {/* FIG 5.1: 12-Semitone Chromatic Interval Ruler & Acoustic Consonance Blueprint */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 5.1 — THE 12-SEMITONE CHROMATIC INTERVAL RULER &amp; HARMONIC FUNCTION
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Penggaris Interval 0–12 Semitone: Fondasi Pembentukan Akor & Tangga Nada'
                        : '0–12 Semitone Chromatic Ruler: Interval Abbreviations, Ratios & Chord Degrees'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    INVERSION LAW: (12 - n) SEMITONES
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 195" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="195" rx="8" fill="#0a0f1d" stroke="#334155" />

                    <line x1="42" y1="62" x2="818" y2="62" stroke="#334155" strokeWidth="2" />
                    {[
                      { st: '0', note: 'C', abbr: 'P1', name: 'Root', col: '#f59e0b', role: 'Tonic' },
                      { st: '+1', note: 'C♯/D♭', abbr: 'm2', name: 'Min 2nd', col: '#64748b', role: 'Tension' },
                      { st: '+2', note: 'D', abbr: 'M2', name: 'Maj 2nd', col: '#94a3b8', role: 'Sus2 / 9th' },
                      { st: '+3', note: 'D♯/E♭', abbr: 'm3', name: 'Min 3rd', col: '#38bdf8', role: 'Minor 3rd' },
                      { st: '+4', note: 'E', abbr: 'M3', name: 'Maj 3rd', col: '#10b981', role: 'Major 3rd' },
                      { st: '+5', note: 'F', abbr: 'P4', name: 'Perf 4th', col: '#94a3b8', role: 'Sus4' },
                      { st: '+6', note: 'F♯/G♭', abbr: 'TT', name: 'Tritone', col: '#ef4444', role: 'Dim5 / Blue' },
                      { st: '+7', note: 'G', abbr: 'P5', name: 'Perf 5th', col: '#a855f7', role: '5th Pillar' },
                      { st: '+8', note: 'G♯/A♭', abbr: 'm6', name: 'Min 6th', col: '#64748b', role: 'Aug5 / ♭13' },
                      { st: '+9', note: 'A', abbr: 'M6', name: 'Maj 6th', col: '#94a3b8', role: '6th / Dim7' },
                      { st: '+10', note: 'A♯/B♭', abbr: 'm7', name: 'Min 7th', col: '#ec4899', role: 'Dom7 / m7' },
                      { st: '+11', note: 'B', abbr: 'M7', name: 'Maj 7th', col: '#f43f5e', role: 'Maj7 Lead' },
                      { st: '+12', note: 'C', abbr: 'P8', name: 'Octave', col: '#f59e0b', role: '2:1 Ratio' },
                    ].map((it, i) => {
                      const x = 42 + i * 64.6;
                      const isKey = ['0', '+3', '+4', '+7', '+10', '+11', '+12'].includes(it.st);
                      return (
                        <g key={i} transform={`translate(${x}, 0)`}>
                          <line x1="0" y1="52" x2="0" y2="72" stroke={it.col} strokeWidth="2" />
                          <circle cx="0" cy="62" r={isKey ? 6.5 : 4} fill="#070a12" stroke={it.col} strokeWidth="2.2" />
                          <text x="0" y="30" textAnchor="middle" fill={it.col} fontSize="13.5" fontFamily="monospace" fontWeight="bold">{it.st}</text>
                          <text x="0" y="44" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontFamily="monospace">{it.abbr}</text>
                          <text x="0" y="90" textAnchor="middle" fill="#f8fafc" fontSize="12.5" fontFamily="monospace" fontWeight="bold">{it.note}</text>
                          <text x="0" y="104" textAnchor="middle" fill="#94a3b8" fontSize="11.5">{it.name}</text>
                          <rect x="-28" y="114" width="56" height="16" rx="3" fill="#0f172a" stroke="#1e293b" />
                          <text x="0" y="125" textAnchor="middle" fill={it.col} fontSize="11" fontFamily="monospace" fontWeight="bold">{it.role}</text>
                        </g>
                      );
                    })}

                    {/* Bottom Formula Strip */}
                    <rect x="24" y="144" width="812" height="36" rx="4" fill="#0a0f1a" stroke="#1e293b" />
                    <text x="430" y="166" textAnchor="middle" fill="#cbd5e1" fontSize="13" fontFamily="monospace">
                      Major Triad = [0, 4, 7] • Minor Triad = [0, 3, 7] • Diminished = [0, 3, 6] • Augmented = [0, 4, 8] • Dom7 = [0, 4, 7, 10] • Maj7 = [0, 4, 7, 11]
                    </text>
                  </svg>
                </div>
              </div>


              {/* FIG 5.1B: 6 Core Triad & 7th Chord Keyboard Voicing Blueprints */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 5.1B — PHYSICAL KEYBOARD VOICING BLUEPRINT: TRIADS &amp; SEVENTH CHORDS ON ROOT C
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Perbandingan Visual 6 Struktur Akor Utama pada Tuts Piano (C Mayor, C Minor, C dim, C aug, C7, Cmaj7)'
                        : 'Visual Keyboard Anatomy of 6 Essential Chord Qualities (C Major, C Minor, C dim, C aug, C7, Cmaj7)'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    SEMITONE STACKING
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 245" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="245" rx="8" fill="#0a0f1d" stroke="#334155" />
                    {[
                      { name: 'C MAJOR (1–3–5)', formula: '[0, 4, 7] • 4st + 3st', notes: 'C – E – G', whites: [0, 2, 4], blacks: [], col: '#10b981', x: 18, y: 14 },
                      { name: 'C MINOR (1–♭3–5)', formula: '[0, 3, 7] • 3st + 4st', notes: 'C – E♭ – G', whites: [0, 4], blacks: [1], col: '#38bdf8', x: 298, y: 14 },
                      { name: 'C DIMINISHED (1–♭3–♭5)', formula: '[0, 3, 6] • 3st + 3st', notes: 'C – E♭ – G♭', whites: [0], blacks: [1, 3], col: '#f43f5e', x: 578, y: 14 },
                      { name: 'C AUGMENTED (1–3–♯5)', formula: '[0, 4, 8] • 4st + 4st', notes: 'C – E – G♯', whites: [0, 2], blacks: [4], col: '#f59e0b', x: 18, y: 128 },
                      { name: 'C DOMINANT 7 (1–3–5–♭7)', formula: '[0, 4, 7, 10] • Triad + m7', notes: 'C – E – G – B♭', whites: [0, 2, 4], blacks: [5], col: '#a855f7', x: 298, y: 128 },
                      { name: 'C MAJOR 7 (1–3–5–7)', formula: '[0, 4, 7, 11] • Triad + M7', notes: 'C – E – G – B', whites: [0, 2, 4, 6], blacks: [], col: '#ec4899', x: 578, y: 128 },
                    ].map((ch, idx) => (
                      <g key={idx} transform={`translate(${ch.x}, ${ch.y})`}>
                        <rect width="264" height="102" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                        <text x="12" y="17" fill={ch.col} fontSize="12.5" fontFamily="monospace" fontWeight="bold">{ch.name}</text>
                        <text x="252" y="17" textAnchor="end" fill="#94a3b8" fontSize="11.5" fontFamily="monospace">{ch.notes}</text>
                        <g transform="translate(14, 24)">
                          {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((wk, wi) => {
                            const hit = ch.whites.includes(wi);
                            return (
                              <g key={wi} transform={`translate(${wi * 33}, 0)`}>
                                <rect
                                  width="31"
                                  height="56"
                                  rx="2.5"
                                  fill={hit ? '#1e293b' : '#0f172a'}
                                  stroke={hit ? ch.col : '#334155'}
                                  strokeWidth={hit ? 1.8 : 1}
                                />
                                {hit && <circle cx="15.5" cy="43" r="5" fill={ch.col} />}
                              </g>
                            );
                          })}
                          {[
                            { bi: 0, bx: 21 },
                            { bi: 1, bx: 54 },
                            { bi: 3, bx: 120 },
                            { bi: 4, bx: 153 },
                            { bi: 5, bx: 186 },
                          ].map((bk) => {
                            const bHit = ch.blacks.includes(bk.bi);
                            return (
                              <g key={bk.bi} transform={`translate(${bk.bx}, 0)`}>
                                <rect
                                  width="20"
                                  height="34"
                                  rx="2"
                                  fill={bHit ? ch.col : '#020617'}
                                  stroke={bHit ? '#ffffff' : '#334155'}
                                  strokeWidth={bHit ? 1.4 : 1}
                                />
                              </g>
                            );
                          })}
                        </g>
                        <text x="132" y="94" textAnchor="middle" fill="#64748b" fontSize="11.5" fontFamily="monospace">{ch.formula}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* FIG 5.2 & 5.3: Chord Inversions & Smooth Parsimonious Voice Leading */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 5.2 — CHORD INVERSIONS (5/3, 6/3, 6/4) &amp; PARSIMONIOUS VOICE LEADING
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Geometri Inversi Akor & Rahasia Voice Leading Halus (Progresi I – IV – V – I Tanpa Melompat)'
                        : 'Triad Inversion Geometry & Smooth Voice Leading (Playing I – IV – V – I Without Hand Jumps)'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-slate-800">
                    COMMON-TONE RETENTION
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 480" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="480" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Top Panel: Amateur Jumping Root Positions (Full Width) */}
                    <g transform="translate(20, 16)">
                      <rect width="820" height="216" rx="6" fill="#0a0f1a" stroke="#ef4444" strokeWidth="1" />
                      <text x="16" y="24" fill="#f87171" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {L(
                          'INEFFICIENT: JUMPING ROOT POSITIONS (LARGE HAND LEAPS)',
                          'TIDAK EFISIEN: POSISI ROOT MELOMPAT-LOMPAT (TANGAN LOMPAT JAUH)',
                          'INEFICIENTE: POSICIONES FUNDAMENTALES CON GRANDES SALTOS'
                        )}
                      </text>
                      {[
                        {
                          chord: 'I: C Maj (Root)',
                          notes: 'C4 – E4 – G4',
                          move: L('Start Position (Finger 1-3-5)', 'Posisi Awal (Jari 1-3-5)', 'Posición Inicial (1-3-5)'),
                          y: 40
                        },
                        {
                          chord: 'IV: F Maj (Root)',
                          notes: 'F4 – A4 – C5',
                          move: L('Jump UP +5 semitones! Hand completely lifts off keybed', 'Lompat NAIK +5 semitone! Tangan terangkat dari tuts', '¡Salto ARRIBA +5 semitonos! La mano despega del teclado'),
                          y: 82
                        },
                        {
                          chord: 'V: G Maj (Root)',
                          notes: 'G4 – B4 – D5',
                          move: L('Jump UP +2 semitones! Further away from center C4', 'Lompat NAIK +2 semitone! Makin menjauh dari tengah', '¡Salto ARRIBA +2 semitonos! Más lejos del centro'),
                          y: 124
                        },
                        {
                          chord: 'I: C Maj (Root)',
                          notes: 'C4 – E4 – G4',
                          move: L('Jump DOWN -7 semitones! High risk of hitting wrong keys', 'Lompat TURUN -7 semitone! Risiko tinggi salah pencet', '¡Salto ABAJO -7 semitonos! Alto riesgo de notas falsas'),
                          y: 166
                        },
                      ].map((row, idx) => (
                        <g key={idx} transform={`translate(16, ${row.y})`}>
                          <rect width="788" height="34" rx="4" fill="#0f172a" stroke="#1e293b" />
                          <text x="16" y="22" fill="#f8fafc" fontSize="13" fontFamily="monospace" fontWeight="bold">{row.chord}</text>
                          <text x="220" y="22" fill="#fca5a5" fontSize="13" fontFamily="monospace" fontWeight="bold">{row.notes}</text>
                          <text x="772" y="22" textAnchor="end" fill="#94a3b8" fontSize="12" fontFamily="monospace">{row.move}</text>
                        </g>
                      ))}
                    </g>

                    {/* Bottom Panel: Pro Voice Leading with Inversions (Full Width) */}
                    <g transform="translate(20, 248)">
                      <rect width="820" height="216" rx="6" fill="#0a0f1a" stroke="#10b981" strokeWidth="1.2" />
                      <text x="16" y="24" fill="#34d399" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                        {L(
                          'PRO VOICE LEADING: INVERSIONS (ZERO HAND JUMPS!)',
                          'VOICE LEADING PRO: INVERSI AKOR (TANGAN TETAP DI TEMPAT, NOL LOMPATAN!)',
                          'CONDUCCIÓN DE VOCES PRO: INVERSIONES (¡CERO SALTOS DE MANO!)'
                        )}
                      </text>
                      {[
                        {
                          chord: 'I: C Maj (Root 5/3)',
                          notes: 'C4 – E4 – G4',
                          move: L('Anchor note: C4 kept under thumb (Fingers 1-3-5)', 'Jangkar: Nada C4 di bawah jempol (Jari 1-3-5)', 'Nota ancla: C4 bajo el pulgar (Dedos 1-3-5)'),
                          y: 40
                        },
                        {
                          chord: 'IV: F Maj (2nd Inv 6/4)',
                          notes: 'C4 – F4 – A4',
                          move: L('Keep C4! Just step E→F (+1) & G→A (+2) (Fingers 1-3-5)', 'Tahan C4! Geser halus E→F (+1) & G→A (+2) (Jari 1-3-5)', '¡Mantén C4! Mueve E→F (+1) y G→A (+2) (1-3-5)'),
                          y: 82
                        },
                        {
                          chord: 'V: G Maj (1st Inv 6/3)',
                          notes: 'B3 – D4 – G4',
                          move: L('Keep G4! Move bottom voices down: C→B, E→D (Fingers 1-2-5)', 'Tahan G4! Turunkan nada bawah: C→B, E→D (Jari 1-2-5)', '¡Mantén G4! Baja voces: C→B, E→D (Dedos 1-2-5)'),
                          y: 124
                        },
                        {
                          chord: 'I: C Maj (Root 5/3)',
                          notes: 'C4 – E4 – G4',
                          move: L('Keep G4! Smooth resolution return: B→C, D→E (Fingers 1-3-5)', 'Tahan G4! Resolusi kembali halus: B→C, D→E (Jari 1-3-5)', '¡Mantén G4! Resolución suave: B→C, D→E (Dedos 1-3-5)'),
                          y: 166
                        },
                      ].map((row, idx) => (
                        <g key={idx} transform={`translate(16, ${row.y})`}>
                          <rect width="788" height="34" rx="4" fill="#0f172a" stroke="#064e3b" />
                          <text x="16" y="22" fill="#f8fafc" fontSize="13" fontFamily="monospace" fontWeight="bold">{row.chord}</text>
                          <text x="240" y="22" fill="#6ee7b7" fontSize="13" fontFamily="monospace" fontWeight="bold">{row.notes}</text>
                          <text x="772" y="22" textAnchor="end" fill="#a7f3d0" fontSize="12" fontFamily="monospace">{row.move}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 5.4: Left-Hand Accompaniment Patterns & Functional Cadences */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 5.3 — LEFT-HAND ACCOMPANIMENT PATTERNS, CADENCES &amp; THE 7 DIATONIC MODES
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? '4 Pola Iringan Tangan Kiri, 4 Kadensa Harmoni & Tabel 7 Modus Diatonis (Ionian–Locrian)'
                        : '4 Left-Hand Accompaniment Patterns, 4 Harmonic Cadences & The 7 Diatonic Modes'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    ARRANGEMENT TOOLKIT
                  </span>
                </div>

                {/* 4 Left-Hand Accompaniment SVG Cards */}
                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 175" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="175" rx="8" fill="#0a0f1d" stroke="#334155" />
                    {[
                      {
                        title: '1. ALBERTI BASS (Classical)',
                        pattern: 'Bottom – Top – Middle – Top',
                        notes: 'C3 (5) → G3 (1) → E3 (3) → G3 (1)',
                        desc: 'Mozart & Beethoven staple; uses smooth forearm rotation.',
                        col: '#38bdf8'
                      },
                      {
                        title: '2. POP ARPEGGIO (1–5–8)',
                        pattern: 'Root – Fifth – Octave – Fifth',
                        notes: 'C3 (5) → G3 (2) → C4 (1) → G3 (2)',
                        desc: 'Open, consonant foundation for modern ballads & anime OSTs.',
                        col: '#10b981'
                      },
                      {
                        title: '3. OPEN 10th VOICING (1–5–10)',
                        pattern: 'Root – Fifth – Octave – Major 10th',
                        notes: 'C3 (5) → G3 (2) → C4 (1) → E4 (3)',
                        desc: 'Spreads the 3rd above the octave for lush cinematic warmth.',
                        col: '#f59e0b'
                      },
                      {
                        title: '4. WALTZ / RAGTIME STRIDE',
                        pattern: 'Low Bass Root → Upper Chord Hit',
                        notes: 'Beat 1: C2 (5)  |  Beats 2–3: [E3+G3+C4]',
                        desc: 'Alternates deep bass downbeats with rhythmic upper-register chords.',
                        col: '#a855f7'
                      },
                    ].map((pat, i) => (
                      <g key={i} transform={`translate(${16 + i * 209}, 16)`}>
                        <rect width="199" height="143" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                        <line x1="0" y1="0" x2="199" y2="0" stroke={pat.col} strokeWidth="2.5" />
                        <text x="12" y="20" fill={pat.col} fontSize="13" fontFamily="monospace" fontWeight="bold">{pat.title}</text>
                        <text x="12" y="38" fill="#e2e8f0" fontSize="12" fontWeight="bold">{pat.pattern}</text>
                        <rect x="10" y="48" width="179" height="22" rx="3" fill="#0f172a" stroke="#1e293b" />
                        <text x="99.5" y="62" textAnchor="middle" fill="#fde68a" fontSize="12" fontFamily="monospace" fontWeight="bold">{pat.notes}</text>
                        <text x="12" y="90" fill="#94a3b8" fontSize="11.5">{pat.desc.slice(0, 34)}</text>
                        <text x="12" y="104" fill="#94a3b8" fontSize="11.5">{pat.desc.slice(34)}</text>
                      </g>
                    ))}
                  </svg>
                </div>

                {/* The 7 Modes & Harmonic Cadences Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="font-mono font-bold text-cyan-400 uppercase">{isId ? '7 Modus Diatonis (Rotasi Tuts Putih)' : isEs ? 'Los 7 Modos Diatónicos (Rotaciones de Teclas Blancas)' : 'The 7 Diatonic Modes (White-Key Rotations)'}</div>
                    <table className="w-full text-left font-mono text-xs md:text-sm">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800">
                          <th className="py-1">{isId ? 'Modus' : isEs ? 'Modo' : 'Mode'}</th>
                          <th className="py-1">{isId ? 'Formula' : isEs ? 'Fórmula' : 'Formula'}</th>
                          <th className="py-1">{isId ? 'Karakter Warna' : isEs ? 'Nota Característica' : 'Color Note'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        <tr><td className="py-1 font-bold text-white">I. Ionian (C–C)</td><td>1 2 3 4 5 6 7</td><td className="text-cyan-400">{isId ? 'Mayor Terang' : isEs ? 'Mayor Brillante' : 'Bright Major'}</td></tr>
                        <tr><td className="py-1 font-bold text-white">II. Dorian (D–D)</td><td>1 2 ♭3 4 5 6 ♭7</td><td className="text-slate-300">{isId ? 'Nada 6 Alami (Jazz/Funk)' : isEs ? '6ª Natural (Jazz/Funk)' : 'Natural 6 (Jazz/Funk)'}</td></tr>
                        <tr><td className="py-1 font-bold text-white">III. Phrygian (E–E)</td><td>1 ♭2 ♭3 4 5 ♭6 ♭7</td><td className="text-slate-300">{isId ? 'Nada ♭2 Rendah (Flamenco)' : isEs ? '2ª Bemol ♭2 (Flamenco)' : 'Flat ♭2 (Flamenco)'}</td></tr>
                        <tr><td className="py-1 font-bold text-white">IV. Lydian (F–F)</td><td>1 2 3 ♯4 5 6 7</td><td className="text-slate-300">{isId ? 'Nada ♯4 Naik (Sinematik)' : isEs ? '4ª Aumentada ♯4 (Cinemático)' : 'Raised ♯4 (Cinematic)'}</td></tr>
                        <tr><td className="py-1 font-bold text-white">V. Mixolydian (G–G)</td><td>1 2 3 4 5 6 ♭7</td><td className="text-slate-300">{isId ? 'Nada ♭7 Rendah (Blues/Rock)' : isEs ? '7ª Menor ♭7 (Blues/Rock)' : 'Flat ♭7 (Blues/Rock)'}</td></tr>
                        <tr><td className="py-1 font-bold text-white">VI. Aeolian (A–A)</td><td>1 2 ♭3 4 5 ♭6 ♭7</td><td className="text-slate-300">{isId ? 'Minor Alami' : isEs ? 'Menor Natural' : 'Natural Minor'}</td></tr>
                        <tr><td className="py-1 font-bold text-white">VII. Locrian (B–B)</td><td>1 ♭2 ♭3 4 ♭5 ♭6 ♭7</td><td className="text-slate-400">{isId ? 'Kuint Berkurang ♭5' : isEs ? 'Quinta Disminuida ♭5' : 'Diminished ♭5'}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="font-mono font-bold text-cyan-400 uppercase">{isId ? '4 Kadensa Inti & Progresi Populer' : isEs ? '4 Cadencias Clave y Progresiones de Éxito' : '4 Core Cadences & Hit Progressions'}</div>
                    <ul className="space-y-1.5 text-slate-300">
                      <li>• <b>{isId ? 'Kadensa Autentik' : isEs ? 'Cadencia Auténtica' : 'Authentic Cadence'} (<code className="text-cyan-300">V7 → I</code>):</b> {isId ? 'Resolusi paling kuat (G7 → C); tritone B–F menyelesaikan ke C–E.' : isEs ? 'Resolución armónica más fuerte (Sol7 → Do); el tritono Si–Fa resuelve hacia Do–Mi.' : 'Strongest harmonic resolution (G7 → C); the B–F tritone resolves inward to C–E.'}</li>
                      <li>• <b>{isId ? 'Kadensa Plagal' : isEs ? 'Cadencia Plagal' : 'Plagal Cadence'} (<code className="text-cyan-300 font-mono">IV → I</code>):</b> {isId ? 'Kadensa "Amen" (F → C); hangat dan tenang tanpa ketegangan leading-tone.' : isEs ? 'Cadencia "Amén" (Fa → Do); resolución cálida y suave sin la tensión de la sensible.' : 'The "Amen" cadence (F → C); warm subdominant resolution.'}</li>
                      <li>• <b>{isId ? 'Kadensa Tipuan (Deceptive)' : isEs ? 'Cadencia Rota (Engañosa)' : 'Deceptive Cadence'} (<code className="text-cyan-300 font-mono">V → vi</code>):</b> {isId ? 'G → Am; mengecoh telinga ke relatif minor untuk memperpanjang emosi lagu.' : isEs ? 'Sol → Lam; resuelve la tensión dominante en el relativo menor para prolongar la emoción.' : 'G → Am; resolves dominant tension into the relative minor.'}</li>
                      <li>• <b>{isId ? 'Putaran Jazz (Turnaround)' : isEs ? 'Turnaround de Jazz' : 'Jazz Turnaround'} (<code className="text-cyan-300 font-mono">ii7 – V7 – Imaj7</code>):</b> <code className="font-mono">Dm7 → G7 → Cmaj7</code>.</li>
                      <li>• <b>{isId ? 'Jalan Kerajaan (Royal Road / J-Pop):' : isEs ? 'Camino Real (Royal Road / J-Pop):' : 'Royal Road (J-Pop / Anime):'}</b> <code className="font-mono text-cyan-300">IVmaj7 – V7 – iii7 – vi</code> (<code className="font-mono">Fmaj7 → G7 → Em7 → Am</code>).</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* FIG 5.5: Interactive Circle of Fifths Compass & Key Signature Inspector */}
              <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 p-6 rounded-xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 5.4 — INTERACTIVE CIRCLE OF FIFTHS &amp; DIATONIC CHORD NEIGHBORHOOD INSPECTOR
                    </span>
                    <h3 className="text-sm md:text-[15px] font-bold text-white mt-0.5">
                      {isId
                        ? 'Kompas Interaktif Lingkaran Kuint (Klik Kunci Mana Saja untuk Memeriksa Tanda Kunci & Keluarga 7 Akor Diatonis)'
                        : 'Interactive Circle of Fifths Compass (Click Any Key Slice to Inspect Key Signature & Diatonic 7-Chord Family)'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-medium bg-slate-900 px-2.5 py-1 rounded text-cyan-300 border border-slate-800">
                    {isId ? 'LUAR: MAYOR • DALAM: RELATIF MINOR' : isEs ? 'EXTERIOR: MAYOR • INTERIOR: MENOR RELATIVO' : 'OUTER: MAJOR • INNER: RELATIVE MINOR'}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Interactive Wheel (Enlarged Circles & Bold Readable Typography) */}
                  <div className="lg:col-span-7 xl:col-span-8 bg-[#070a12] rounded-xl p-3 sm:p-6 border border-slate-800 flex flex-col items-center">
                    <div className="w-full max-w-[580px] sm:max-w-[620px] aspect-square select-none">
                      <svg viewBox="0 0 640 640" className="w-full h-full font-sans">
                        <circle cx="320" cy="320" r="310" fill="#0a0f1d" stroke="#334155" strokeWidth="2" />
                        <circle cx="320" cy="320" r="222" fill="none" stroke="#1e293b" strokeWidth="1.8" strokeDasharray="5 5" />
                        <circle cx="320" cy="320" r="146" fill="none" stroke="#1e293b" strokeWidth="1.8" strokeDasharray="4 4" />

                        {/* Center Hub */}
                        <circle cx="320" cy="320" r="88" fill="#0b101b" stroke="#0284c7" strokeWidth="2.5" />
                        <text x="320" y="296" textAnchor="middle" fill="#94a3b8" fontSize="14" fontFamily="monospace" fontWeight="bold" letterSpacing="0.08em">
                          {L("SELECTED KEY", "KUNCI TERPILIH", "TONALIDAD")}
                        </text>
                        <text x="320" y="328" textAnchor="middle" fill="#38bdf8" fontSize="30" fontFamily="monospace" fontWeight="bold">
                          {CIRCLE_OF_FIFTHS_DATA[activeCircleKeyIndex].major}
                        </text>
                        <text x="320" y="352" textAnchor="middle" fill="#c084fc" fontSize="15" fontFamily="monospace" fontWeight="bold">
                          rel. {CIRCLE_OF_FIFTHS_DATA[activeCircleKeyIndex].minor}
                        </text>

                        {CIRCLE_OF_FIFTHS_DATA.map((item, idx) => {
                          const angle = (idx * 30 - 90) * (Math.PI / 180);
                          const cos = Math.cos(angle);
                          const sin = Math.sin(angle);
                          const xMaj = 320 + 222 * cos;
                          const yMaj = 320 + 222 * sin;
                          const xMin = 320 + 146 * cos;
                          const yMin = 320 + 146 * sin;
                          const xSig = 320 + 286 * cos;
                          const ySig = 320 + 286 * sin;

                          const isSelected = activeCircleKeyIndex === idx;
                          const isSubdom = (activeCircleKeyIndex + 11) % 12 === idx;
                          const isDom = (activeCircleKeyIndex + 1) % 12 === idx;

                          const majColor = isSelected ? '#f59e0b' : isSubdom ? '#10b981' : isDom ? '#38bdf8' : '#e2e8f0';
                          const minColor = isSelected ? '#fbbf24' : isSubdom ? '#6ee7b7' : isDom ? '#7dd3fc' : '#a5b4fc';

                          return (
                            <g
                              key={idx}
                              onClick={() => setActiveCircleKeyIndex(idx)}
                              className="cursor-pointer group"
                            >
                              {/* Radial Spoke Guide */}
                              <line
                                x1={320 + 90 * cos}
                                y1={320 + 90 * sin}
                                x2={320 + 258 * cos}
                                y2={320 + 258 * sin}
                                stroke={isSelected ? '#f59e0b' : '#334155'}
                                strokeWidth={isSelected ? '2.5' : '1.2'}
                                strokeDasharray={isSelected ? 'none' : '3 3'}
                              />

                              {/* Outer Key Signature Label */}
                              <text
                                x={xSig}
                                y={ySig + 5}
                                textAnchor="middle"
                                fill={isSelected ? '#f59e0b' : '#94a3b8'}
                                fontSize={isSelected ? '14' : '12'}
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {item.sigLabel}
                              </text>

                              {/* Outer Major Circle Node (Enlarged) */}
                              <circle
                                cx={xMaj}
                                cy={yMaj}
                                r={isSelected ? '32' : '26'}
                                fill={isSelected ? '#451a03' : isSubdom ? '#064e3b' : isDom ? '#083344' : '#0f172a'}
                                stroke={majColor}
                                strokeWidth={isSelected ? '3.5' : '2.2'}
                                className="transition-all duration-150 group-hover:stroke-white"
                              />
                              <text
                                x={xMaj}
                                y={yMaj + (item.major.length > 4 ? 4 : 5)}
                                textAnchor="middle"
                                fill={majColor}
                                fontSize={item.major.length > 4 ? '11' : isSelected ? '16' : '14'}
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {item.major}
                              </text>

                              {/* Inner Relative Minor Circle Node (Enlarged) */}
                              <circle
                                cx={xMin}
                                cy={yMin}
                                r={isSelected ? '24' : '19'}
                                fill={isSelected ? '#2e1065' : isSubdom ? '#022c22' : isDom ? '#0c2340' : '#070a12'}
                                stroke={minColor}
                                strokeWidth={isSelected ? '2.5' : '1.6'}
                                className="transition-all duration-150 group-hover:stroke-white"
                              />
                              <text
                                x={xMin}
                                y={yMin + (item.minor.length > 4 ? 3.5 : 4)}
                                textAnchor="middle"
                                fill={minColor}
                                fontSize={item.minor.length > 4 ? '9' : isSelected ? '13' : '11.5'}
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {item.minor}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Inspector Details */}
                  <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                    {(() => {
                      const sel = CIRCLE_OF_FIFTHS_DATA[activeCircleKeyIndex];
                      return (
                        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-4">
                          <div className="border-b border-slate-800 pb-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-medium text-cyan-400 uppercase font-bold">{isId ? 'TANDA KUNCI AKTIF' : isEs ? 'ARMADURA ACTIVA' : 'ACTIVE KEY SIGNATURE'}</span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">
                                {sel.sigLabel}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-white mt-1">
                              {sel.major} Major <span className="text-slate-500 font-normal">/</span> <span className="text-slate-400">{sel.minor} Relative Minor</span>
                            </h4>
                            <p className="text-xs text-slate-400 font-mono mt-1">
                              {isId ? 'Kres / Mol:' : isEs ? 'Alteraciones:' : 'Accidentals:'} <strong className="text-cyan-300 font-mono">{sel.accidentals}</strong>
                            </p>
                          </div>

                          <div>
                            <div className="text-xs font-mono font-medium text-slate-400 uppercase font-bold mb-2">
                              {isId ? `7 Tingkat Nada Diatonis (${sel.major} Mayor)` : isEs ? `7 Grados de la Escala Diatónica (${sel.major} Mayor)` : `7 Diatonic Scale Degrees (${sel.major} Major)`}
                            </div>
                            <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-xs">
                              {sel.notes.map((n, i) => (
                                <div key={i} className="bg-slate-950 py-1.5 rounded border border-slate-800">
                                  <span className="text-[9px] text-slate-500 block">{i + 1}</span>
                                  <span className="text-cyan-300 font-bold">{n}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-mono font-medium text-slate-400 uppercase font-bold mb-2">
                              {isId ? 'Keluarga 7 Akor Diatonis (Angka Romawi)' : isEs ? 'Familia de 7 Acordes Diatónicos (Números Romanos)' : 'Diatonic 7-Chord Family (Roman Numerals)'}
                            </div>
                            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between">
                                <span className="text-cyan-300 font-bold">{isId ? 'I (Tonika)' : isEs ? 'I (Tónica)' : 'I (Tonic)'}</span>
                                <span className="text-white font-bold">{sel.majorChords.tonic}</span>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between">
                                <span className="text-cyan-300 font-bold">{isId ? 'IV (Subdominan)' : isEs ? 'IV (Subdominante)' : 'IV (Subdom)'}</span>
                                <span className="text-white font-bold">{sel.majorChords.subdom}</span>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded border border-cyan-500/40 flex justify-between">
                                <span className="text-cyan-400 font-bold">{isId ? 'V (Dominan)' : isEs ? 'V (Dominante)' : 'V (Dominant)'}</span>
                                <span className="text-white font-bold">{sel.majorChords.dom}</span>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between">
                                <span className="text-cyan-300 font-bold">{isId ? 'vi (Relatif Min)' : isEs ? 'vi (Menor Rel)' : 'vi (Rel Min)'}</span>
                                <span className="text-white font-bold">{sel.minorChords.tonicRel}</span>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between">
                                <span className="text-slate-400">{isId ? 'ii (Supertonika)' : isEs ? 'ii (Supertónica)' : 'ii (Supertonic)'}</span>
                                <span className="text-slate-200">{sel.minorChords.subdom}</span>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between">
                                <span className="text-slate-400">iii / vii°</span>
                                <span className="text-slate-200">{sel.minorChords.domRel} / {sel.dimChord}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 6: Practice Drills, Etudes & Structured Daily Routine */}
          {/* ========================================================================= */}
          {activeChapter === 'exercises' && (
            <article className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
              <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs md:text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 06 • GENERATOR LATIHAN TEKNIS 12 KUNCI & RUTINITAS HARIAN' : isEs ? 'MÓDULO 06 • EJERCICIOS TÉCNICOS EN 12 TONALIDADES' : 'MODULE 06 • 12-KEY TECHNICAL DRILL GENERATOR & DAILY ROUTINE'}
                    </span>
                    <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700">
                      {isId ? 'MESIN TRANSPOSISI REAL-TIME' : isEs ? 'MOTOR DE TRANSPOSICIÓN EN TIEMPO REAL' : 'REAL-TIME TRANSPOSITION ENGINE'}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {t.ch6Title}
                  </h2>
                  <p className="text-sm md:text-[15px] text-slate-200 mt-3 leading-relaxed max-w-4xl">
                    {t.ch6Desc}
                  </p>
                </div>
                <div className="bg-slate-900 px-4 py-2.5 rounded-lg border border-slate-800 flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-slate-400">{isId ? 'KUNCI AKTIF:' : isEs ? 'TONALIDAD ACTIVA:' : 'ACTIVE ROOT:'}</span>
                  <strong className="text-sm font-mono font-bold text-cyan-400">{selectedKey}</strong>
                </div>
              </div>

              {/* FIG 6.1: Structured 30-Minute Daily Practice Routine Blueprint SVG */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 6.1 — CONSERVATORY 30-MINUTE DAILY PRACTICE ARCHITECTURE
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {isId
                        ? 'Struktur Sesi Latihan Efektif 30 Menit: Pemanasan Hanon, Tangga Nada, Sight-Reading & Repertoar'
                        : isEs
                        ? 'Estructura de Práctica Diaria de 30 Minutos: Calentamiento Hanon, Escalas, Lectura y Repertorio'
                        : 'High-Yield 30-Minute Practice Allocation: Technical Warmup, Scale Voicing, Sight-Reading & Repertoire'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    {isId ? 'RENCANA 4 BLOK' : isEs ? 'PLAN DE 4 BLOQUES' : '4-BLOCK SESSION PLAN'}
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 130" className="w-full min-w-[740px] h-auto select-none font-sans">
                    <rect width="860" height="130" rx="8" fill="#0a0f1d" stroke="#334155" />
                    {[
                      { min: 'MIN 00–05 (5m)', title: '1. Finger Independence & Scales', sub: 'Hanon #1 + Major/Minor Scale in 1 Key', col: '#38bdf8', w: 185, x: 18 },
                      { min: 'MIN 05–12 (7m)', title: '2. Chords, Inversions & Arpeggios', sub: 'Root / 1st / 2nd Inv + I–V–vi–IV / ii–V–I', col: '#10b981', w: 205, x: 213 },
                      { min: 'MIN 12–18 (6m)', title: '3. Sight-Reading Drill', sub: 'Read new patterns in Wait Mode (Strict)', col: '#f59e0b', w: 185, x: 428 },
                      { min: 'MIN 18–30 (12m)', title: '4. Repertoire Chunking (A–B Loop)', sub: 'Isolate 4-bar loops from 60% → 100% BPM', col: '#a855f7', w: 219, x: 623 },
                    ].map((blk, i) => (
                      <g key={i} transform={`translate(${blk.x}, 16)`}>
                        <rect width={blk.w} height="98" rx="5" fill="#0a0f1a" stroke="#1e293b" />
                        <line x1="0" y1="0" x2={blk.w} y2="0" stroke={blk.col} strokeWidth="3" />
                        <text x="12" y="22" fill={blk.col} fontSize="12.5" fontFamily="monospace" fontWeight="bold">{blk.min}</text>
                        <text x="12" y="44" fill="#f8fafc" fontSize="13.5" fontWeight="bold">{blk.title}</text>
                        <text x="12" y="66" fill="#94a3b8" fontSize="12">{blk.sub}</text>
                      </g>
                    ))}
                  </svg>
                </div>

              </div>


              {/* Key Selector */}
              <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl rounded-xl p-5 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm md:text-base font-mono font-bold uppercase tracking-wider text-slate-100">
                    {t.ch6RootKey}
                  </h3>
                  <span className="text-xs md:text-sm text-slate-400">
                    {t.ch6RootKeyDesc}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
                  {ALL_KEYS.map((k) => {
                    const isSelected = selectedKey === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSelectedKey(k)}
                        className={`py-3 px-2 rounded-xl text-sm md:text-base font-mono font-bold transition-all shadow-sm active:scale-95 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border border-cyan-400'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {k}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {[
                  { id: 'all', label: isId ? 'Semua Latihan' : isEs ? 'Todos los Ejercicios' : 'All Drills' },
                  { id: 'sight_reading_cat', label: isId ? 'Membaca Not (Sight Reading)' : isEs ? 'Lectura a Primera Vista' : 'Sight Reading' },
                  { id: 'scales', label: isId ? 'Tangga Nada & Modus' : isEs ? 'Escalas y Modos' : 'Scales & Modes' },
                  { id: 'chords', label: isId ? 'Akor & Progresi' : isEs ? 'Acordes y Progresiones' : 'Chords & Progressions' },
                  { id: 'arpeggios', label: 'Arpeggios' },
                ].map((tab) => {
                  const isActive = selectedCategoryTab === tab.id || (tab.id === 'sight_reading_cat' && selectedCategoryTab === 'sight_reading');
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedCategoryTab(tab.id)}
                      className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all shadow-sm ${
                        isActive
                          ? 'bg-cyan-600 text-white border border-cyan-400/40'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Drills Grid */}
              <div className="space-y-6">
                {EXERCISE_CATEGORIES.filter((cat) => {
                  if (selectedCategoryTab === 'all') return true;
                  if (selectedCategoryTab === 'sight_reading' || selectedCategoryTab === 'sight_reading_cat') {
                    return cat.id === 'sight_reading_cat';
                  }
                  return cat.id === selectedCategoryTab;
                }).map((category) => (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                      <h4 className="text-sm font-mono font-bold text-cyan-400 uppercase tracking-wide">
                        {category.id === 'sight_reading_cat'
                          ? (isId ? 'Membaca Not (Sight Reading)' : isEs ? 'Lectura a Primera Vista' : 'Sight Reading')
                          : category.id === 'scales'
                          ? (isId ? 'Tangga Nada & Modus' : isEs ? 'Escalas y Modos' : 'Scales & Modes')
                          : category.id === 'chords'
                          ? (isId ? 'Akor & Harmoni' : isEs ? 'Acordes' : 'Chords')
                          : category.id === 'arpeggios'
                          ? (isId ? 'Arpeggio' : isEs ? 'Arpegios' : 'Arpeggios')
                          : category.name}
                      </h4>
                      <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700">
                        {category.types.length} {isId ? 'modul' : isEs ? 'módulos' : 'modules'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {category.types.map((drill) => (
                        <div
                          key={drill.id}
                          className="bg-slate-900/90 border border-slate-800/80 shadow-xl hover:bg-slate-900/90 rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h5 className="text-sm md:text-[15px] font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {isId && DRILL_TRANSLATIONS[drill.id]?.id
                                  ? DRILL_TRANSLATIONS[drill.id].id.name
                                  : isEs && DRILL_TRANSLATIONS[drill.id]?.es
                                  ? DRILL_TRANSLATIONS[drill.id].es.name
                                  : drill.name}
                              </h5>
                              <span className="text-xs font-mono font-medium font-semibold px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-800 whitespace-nowrap">
                                {isId ? 'Kunci' : isEs ? 'Tonalidad' : 'Key'}: {selectedKey}
                              </span>
                            </div>
                            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                              {isId && DRILL_TRANSLATIONS[drill.id]?.id
                                ? DRILL_TRANSLATIONS[drill.id].id.desc
                                : isEs && DRILL_TRANSLATIONS[drill.id]?.es
                                ? DRILL_TRANSLATIONS[drill.id].es.desc
                                : drill.description}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                onLaunchCustomExercise?.(selectedKey, drill.id, drill.name);
                              }}
                              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
                            >
                              <span>{t.ch6PlayDrill}</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Transition Banner to Chapter 7 */}
              <div className="p-6 rounded-2xl bg-gradient-to-r bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 shadow-xl">
                <div>
                  <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    {isId ? 'MODUL SELANJUTNYA • BAB 07' : isEs ? 'SIGUIENTE MÓDULO • CAP. 07' : 'NEXT MODULE • CH. 07'}
                  </div>
                  <h4 className="text-base md:text-lg font-black text-white mt-0.5">
                    {t.chPPTitle}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    {isId
                      ? 'Setelah mengasah ketangkasan jari, uji dan latih ketajaman pendengaran telinga Anda dengan kuis pengenalan pitch absolut dan interval.'
                      : isEs
                      ? 'Tras perfeccionar la destreza de los dedos, pon a prueba tu oído musical con pruebas auditivas de notas absolutas e intervalos.'
                      : 'After sharpening your finger dexterity, train your musical ear with absolute pitch identification tests and interval quizzes.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectChapter('perfectpitch')}
                  className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs md:text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-950 active:scale-95 flex-shrink-0 border border-cyan-400/30 cursor-pointer"
                >
                  <span>{isId ? 'Buka Pelatihan Perfect Pitch' : isEs ? 'Ir a Oído Absoluto' : 'Open Perfect Pitch Trainer'}</span>
                  <span>→</span>
                </button>
              </div>
            </article>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 7: Perfect Pitch Training & Active Ear Mastery Masterclass */}
          {/* ========================================================================= */}
          {activeChapter === 'perfectpitch' && (
            <article data-no-ui-sound="true" className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
              {/* Chapter Header */}
              <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs md:text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 07 • PELATIHAN PERFECT PITCH & TELINGA' : isEs ? 'MÓDULO 07 • ENTRENAMIENTO DE OÍDO ABSOLUTO' : 'MODULE 07 • PERFECT PITCH TRAINING & ACTIVE EAR MASTERY'}
                    </span>
                    <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700">
                      440 HZ CONCERT PITCH • 12 CHROMATIC FREQUENCIES
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {t.chPPTitle}
                  </h2>
                  <p className="text-sm md:text-[15px] text-slate-200 mt-3 leading-relaxed max-w-4xl">
                    {t.chPPDesc}
                  </p>
                </div>
                <div className="bg-slate-900 px-4 py-2.5 rounded-lg border border-slate-800 flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-slate-400">{isId ? 'MODE PELATIHAN:' : isEs ? 'MODO ENTRENAMIENTO:' : 'TRAINER ENGINE:'}</span>
                  <span className="text-sm font-bold text-cyan-400 font-mono">OCTAVIA PITCH AI</span>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* INTERACTIVE PERFECT PITCH CONSOLE */}
              {/* ========================================================================= */}
              <div data-no-ui-sound="true" className="p-6 md:p-8 rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-950/90 to-slate-900/95 border border-slate-800 shadow-2xl space-y-6">
                {/* Console Top Controls */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-wide">
                          {t.chPPTrainerHeading}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {t.chPPTrainerSubtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mode & Auto-Advance Selectors */}
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Training Mode Pills */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setEarTrainingMode('pitch');
                          handleGenerateNewEarQuestion('pitch');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          earTrainingMode === 'pitch'
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t.chPPModePitch}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEarTrainingMode('interval');
                          handleGenerateNewEarQuestion('interval');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          earTrainingMode === 'interval'
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t.chPPModeInterval}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEarTrainingMode('chord');
                          handleGenerateNewEarQuestion('chord');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          earTrainingMode === 'chord'
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t.chPPModeChord}
                      </button>
                    </div>

                    {/* Unified Scale / Key Selector for ALL Modes */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 uppercase px-1.5 font-bold hidden sm:inline">
                        {t.chPPScaleLabel}
                      </span>
                      <select
                        value={earScaleSetting}
                        onChange={(e) => {
                          setEarScaleSetting(e.target.value);
                          setCurrentQuizMidi(null);
                          setCurrentQuizInterval(null);
                          setCurrentQuizChord(null);
                          setEarQuizAnswered(false);
                        }}
                        className="bg-slate-900 text-xs font-mono text-cyan-300 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      >
                        <option value="all">{t.chPPScaleAll12}</option>
                        <option value="random">{t.chPPScaleRandom}</option>
                        <optgroup label={isId ? 'Tangga Nada Mayor (12 Key)' : isEs ? 'Escalas Mayores (12 Tonos)' : 'Major Keys (All 12)'}>
                          {EAR_SCALES.filter(s => !s.id.includes('_min')).map(s => (
                            <option key={s.id} value={s.id}>
                              {isId ? s.name.id : isEs ? s.name.es : s.name.en} ({s.accidentals})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={isId ? 'Tangga Nada Minor (12 Key)' : isEs ? 'Escalas Menores (12 Tonos)' : 'Minor Keys (All 12)'}>
                          {EAR_SCALES.filter(s => s.id.includes('_min')).map(s => (
                            <option key={s.id} value={s.id}>
                              {isId ? s.name.id : isEs ? s.name.es : s.name.en} ({s.accidentals})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Octave Range Pills for All Modes */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setEarPitchDifficulty('chromatic');
                          setCurrentQuizMidi(null);
                          setCurrentQuizInterval(null);
                          setCurrentQuizChord(null);
                          setEarQuizAnswered(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          earPitchDifficulty === 'chromatic' || earPitchDifficulty === 'white'
                            ? 'bg-slate-800 text-cyan-300 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title={isId ? 'Oktaf Standar (Oktaf 4)' : isEs ? 'Octava Estándar' : 'Standard (Octave 4)'}
                      >
                        {earTrainingMode === 'pitch' ? t.chPPDiffAll12 : (isId ? 'Oktaf 4' : isEs ? 'Octava 4' : 'Octave 4')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEarPitchDifficulty('wide');
                          setCurrentQuizMidi(null);
                          setCurrentQuizInterval(null);
                          setCurrentQuizChord(null);
                          setEarQuizAnswered(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          earPitchDifficulty === 'wide'
                            ? 'bg-slate-800 text-slate-200 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title={isId ? 'Rentang Luas (Oktaf 2-5)' : isEs ? 'Rango Amplio (Octavas 2-5)' : 'Wide Range (Octaves 2-5)'}
                      >
                        {t.chPPDiffWide}
                      </button>
                    </div>

                    {/* Root Variation Mode (Fixed vs Mixed) for Interval & Chord */}
                    {(earTrainingMode === 'interval' || earTrainingMode === 'chord') && (
                      <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setEarChoiceRootMode('fixed');
                            setCurrentQuizInterval(null);
                            setCurrentQuizChord(null);
                            setEarQuizAnswered(false);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            earChoiceRootMode === 'fixed'
                              ? 'bg-slate-800 text-cyan-300 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title={isId ? 'Semua pilihan jawaban menggunakan Root yang sama' : 'All choices share the same root'}
                        >
                          {t.chPPRootModeFixed}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEarChoiceRootMode('mixed');
                            setCurrentQuizInterval(null);
                            setCurrentQuizChord(null);
                            setEarQuizAnswered(false);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            earChoiceRootMode === 'mixed'
                              ? 'bg-slate-800 text-cyan-300 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title={isId ? 'Pilihan jawaban divariasikan dengan berbagai Root acak' : 'Choices vary with mixed root keys'}
                        >
                          {t.chPPRootModeMixed}
                        </button>
                      </div>
                    )}

                    {/* Auto-advance toggle */}
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 select-none">
                      <input
                        type="checkbox"
                        checked={earAutoAdvance}
                        onChange={(e) => setEarAutoAdvance(e.target.checked)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-900"
                      />
                      <span>{isId ? 'Auto Maju' : isEs ? 'Auto Avanzar' : 'Auto-Advance'}</span>
                    </label>
                  </div>
                </div>

                {/* Active Scale & Root Context Pills */}
                {(earActiveScaleId || (earScaleSetting !== 'all' && earScaleSetting !== 'random') || currentQuizChord || currentQuizInterval) && (
                  <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-mono">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">
                      <span className="text-cyan-400 font-bold">{t.chPPActiveScaleBadge}</span>
                      <span className="font-bold text-white">
                        {(() => {
                          const scaleId = earActiveScaleId || (earScaleSetting !== 'all' && earScaleSetting !== 'random' ? earScaleSetting : null);
                          const found = scaleId ? EAR_SCALES.find(s => s.id === scaleId) : null;
                          return found ? (isId ? found.name.id : isEs ? found.name.es : found.name.en) : (isId ? '12 Kromatik Bebas' : isEs ? '12 Cromáticas' : '12 Chromatics Free');
                        })()}
                      </span>
                      {(() => {
                        const scaleId = earActiveScaleId || (earScaleSetting !== 'all' && earScaleSetting !== 'random' ? earScaleSetting : null);
                        const found = scaleId ? EAR_SCALES.find(s => s.id === scaleId) : null;
                        return found ? (
                          <span className="text-slate-400 text-[11px]">
                            ({found.accidentals})
                          </span>
                        ) : null;
                      })()}
                      {earScaleSetting === 'random' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold uppercase">
                          {isId ? 'Acak' : isEs ? 'Aleatorio' : 'Random Key'}
                        </span>
                      )}
                    </div>

                    {(earTrainingMode === 'chord' || earTrainingMode === 'interval') && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
                        <span className="text-slate-300 font-bold">
                          {earTrainingMode === 'chord' ? t.chPPChordInRoot : (isId ? 'Tala Dasar:' : isEs ? 'Tónica:' : 'Root:')}
                        </span>
                        <span className="font-black text-emerald-300 text-sm">
                          {earTrainingMode === 'chord' ? currentQuizChord?.rootName : currentQuizInterval?.rootName}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* HUD / Scoreboard */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{t.chPPStreak}</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-cyan-400 font-mono flex items-center gap-1.5">
                        {earStreak > 0 && (
                          <svg className="w-5 h-5 text-cyan-400 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.527.82-1.127 2.18-1.503 3.61a15.86 15.86 0 00-.472 2.766 8.358 8.358 0 01-.84-1.228 1 1 0 00-1.708.97c.504 1.48 1.41 2.87 2.456 3.923A8.005 8.005 0 0010 18a8 8 0 008-8c0-2.483-1.144-4.838-2.906-6.425a1 1 0 00-1.385.083c-.342.368-.696.757-1.053 1.168-.45.52-.89 1.052-1.309 1.597a15.228 15.228 0 011.048-3.87zM8.88 12.003c.09-.16.195-.323.313-.487a9.387 9.387 0 011.458-1.53c-.027.604.093 1.22.373 1.776a3.992 3.992 0 003.58 2.234 4 4 0 11-5.724-2z" clipRule="evenodd" />
                          </svg>
                        )}
                        {earStreak}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{t.chPPBestStreak}</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-yellow-300 font-mono flex items-center gap-1.5">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2 0h4m5-18v2m0 14v4m-3 0h6m4-18v4m-2-2h4m-7 5a4 4 0 00-4 4v3h8v-3a4 4 0 00-4-4z" />
                        </svg>
                        {earBestStreak}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{t.chPPAccuracy}</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-cyan-400 font-mono">
                        {earTotalGuessed > 0 ? Math.round((earCorrectGuessed / earTotalGuessed) * 100) : 0}%
                      </span>
                      <span className="text-xs text-slate-400 font-mono">({earCorrectGuessed}/{earTotalGuessed})</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{t.chPPTotalTested}</span>
                      <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
                        {earTotalGuessed}
                      </div>
                    </div>
                    {earTotalGuessed > 0 && (
                      <button
                        type="button"
                        onClick={handleResetEarStats}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-[10px] text-slate-300 hover:text-rose-300 transition-all font-mono"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Audio Trigger & Reference Center */}
                <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Primary Play Button */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      type="button"
                      disabled={isAudioTonePlaying}
                      onClick={() => {
                        if (earTrainingMode === 'pitch') {
                          if (currentQuizMidi === null || earQuizAnswered) {
                            handleGenerateNewEarQuestion('pitch');
                          } else {
                            void playEarNoteSound(currentQuizMidi);
                          }
                        } else if (earTrainingMode === 'interval') {
                          if (currentQuizInterval === null || earQuizAnswered) {
                            handleGenerateNewEarQuestion('interval');
                          } else {
                            void playEarIntervalSound(currentQuizInterval.rootMidi, currentQuizInterval.semitones);
                          }
                        } else {
                          if (currentQuizChord === null || earQuizAnswered) {
                            handleGenerateNewEarQuestion('chord');
                          } else {
                            void playEarChordSound(currentQuizChord.rootMidi, currentQuizChord.chord.intervals);
                          }
                        }
                      }}
                      className={`w-full md:w-auto px-6 py-3.5 rounded-xl font-black text-base shadow-lg flex items-center justify-center gap-3 transition-all border ${
                        isAudioTonePlaying
                          ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed opacity-80 scale-[0.99]'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950 active:scale-95 border-cyan-400/30 cursor-pointer'
                      }`}
                    >
                      {/* Animated Soundwave bars */}
                      <div className="flex items-end gap-1 h-5 w-5">
                        <span className={`w-1 bg-white rounded-full transition-all ${isAudioTonePlaying ? 'h-5 animate-pulse' : 'h-2'}`} />
                        <span className={`w-1 bg-white rounded-full transition-all ${isAudioTonePlaying ? 'h-3 animate-pulse delay-75' : 'h-4'}`} />
                        <span className={`w-1 bg-white rounded-full transition-all ${isAudioTonePlaying ? 'h-5 animate-pulse delay-150' : 'h-3'}`} />
                      </div>
                      <span>
                        {isAudioTonePlaying
                          ? (isId ? 'Sedang Membunyikan...' : isEs ? 'Reproduciendo...' : 'Playing Audio...')
                          : (earTrainingMode === 'pitch' ? currentQuizMidi === null : earTrainingMode === 'interval' ? currentQuizInterval === null : currentQuizChord === null)
                          ? t.chPPPlayQuestion
                          : earQuizAnswered
                          ? t.chPPNextBtn
                          : t.chPPReplay}
                      </span>
                    </button>

                    {(earTrainingMode === 'pitch' ? currentQuizMidi !== null : earTrainingMode === 'interval' ? currentQuizInterval !== null : currentQuizChord !== null) && !earQuizAnswered && (
                      <button
                        type="button"
                        disabled={isAudioTonePlaying}
                        onClick={() => {
                          if (earTrainingMode === 'pitch' && currentQuizMidi !== null) {
                            void playEarNoteSound(currentQuizMidi);
                          } else if (earTrainingMode === 'interval' && currentQuizInterval !== null) {
                            void playEarIntervalSound(currentQuizInterval.rootMidi, currentQuizInterval.semitones);
                          } else if (earTrainingMode === 'chord' && currentQuizChord !== null) {
                            void playEarChordSound(currentQuizChord.rootMidi, currentQuizChord.chord.intervals);
                          }
                        }}
                        className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                          isAudioTonePlaying
                            ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95 cursor-pointer'
                        }`}
                        title={t.chPPReplay}
                      >
                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        <span>{t.chPPReplay}</span>
                      </button>
                    )}
                  </div>

                  {/* Reference Pitch Buttons */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <span className="text-xs font-mono text-slate-400 hidden sm:inline">{isId ? 'Tala Referensi:' : isEs ? 'Tono Referencia:' : 'Reference:'}</span>
                    <button
                      type="button"
                      disabled={isAudioTonePlaying}
                      onClick={() => void playEarNoteSound(69, 1.2)}
                      className={`px-3 py-2 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 ${
                        isAudioTonePlaying
                          ? 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-400 hover:text-cyan-300 active:scale-95 cursor-pointer'
                      }`}
                      title="Play A4 (440.00 Hz)"
                    >
                      <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth="2" />
                        <circle cx="12" cy="12" r="3" strokeWidth="2" />
                        <path strokeLinecap="round" strokeWidth="2" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                      </svg>
                      <span>A4 (440Hz)</span>
                    </button>
                    <button
                      type="button"
                      disabled={isAudioTonePlaying}
                      onClick={() => void playEarNoteSound(60, 1.2)}
                      className={`px-3 py-2 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 ${
                        isAudioTonePlaying
                          ? 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-400 hover:text-cyan-300 active:scale-95 cursor-pointer'
                      }`}
                      title="Play C4 (261.63 Hz)"
                    >
                      <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4a3 3 0 100 6 3 3 0 000-6zm0 6v10m-6-4a6 6 0 0012 0" />
                      </svg>
                      <span>C4 (261Hz)</span>
                    </button>
                  </div>
                </div>

                {/* Hint Bar */}
                {(earTrainingMode === 'pitch' ? currentQuizMidi === null : earTrainingMode === 'interval' ? currentQuizInterval === null : currentQuizChord === null) && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-sm text-slate-200 font-medium animate-pulse flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 text-cyan-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    <span>{t.chPPWaitingFirstNote}</span>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* CHOICE GRID: SINGLE PITCH MODE */}
                {/* ========================================================================= */}
                {earTrainingMode === 'pitch' && (
                  <div className="space-y-4">
                    <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
                      <span>{isId ? 'PILIH NADA YANG ANDA DENGAR:' : isEs ? 'ELIGE LA NOTA QUE ESCUCHAS:' : 'SELECT THE NOTE YOU HEAR:'}</span>
                      <span className="text-[11px] text-slate-500 italic">
                        {earScaleSetting !== 'all' ? (
                          (() => {
                            const found = EAR_SCALES.find(s => s.id === (earActiveScaleId || earScaleSetting));
                            return found ? `${isId ? found.name.id : isEs ? found.name.es : found.name.en} • 12 ${isId ? 'Pilihan' : isEs ? 'Opciones' : 'Choices'}` : '12 Chromatic Choices';
                          })()
                        ) : (
                          '12 Chromatic Choices'
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                      {PITCH_NOTES_OCTAVE4.map((note) => {
                        const isCorrectNote = currentQuizMidi !== null && (note.midi % 12 === currentQuizMidi % 12);
                        const isGuessedNote = lastGuessedValue === note.id;

                        let btnStyle = 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200';
                        if (note.isBlack) {
                          btnStyle = 'bg-slate-950/90 hover:bg-slate-900 border-slate-800/90 text-slate-300';
                        }

                        if (earQuizAnswered) {
                          if (isCorrectNote) {
                            btnStyle = 'bg-emerald-600/90 border-cyan-400 text-white shadow-lg shadow-emerald-900/50 scale-[1.02] ring-2 ring-emerald-400';
                          } else if (isGuessedNote && !isCorrectNote) {
                            btnStyle = 'bg-rose-700/90 border-rose-400 text-white shadow-lg shadow-rose-900/50 animate-shake';
                          } else {
                            btnStyle = 'opacity-40 bg-slate-950 border-slate-900 text-slate-500 cursor-not-allowed';
                          }
                        }

                        return (
                          <button
                            key={note.id}
                            type="button"
                            disabled={earQuizAnswered || currentQuizMidi === null || isAudioTonePlaying}
                            onClick={() => handlePitchGuess(note.id)}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all relative group ${btnStyle} ${
                              isAudioTonePlaying ? 'cursor-wait opacity-70' : 'cursor-pointer active:scale-95'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className="w-2.5 h-2.5 rounded-full shadow-sm"
                                style={{ backgroundColor: note.color }}
                              />
                              <span className="text-base font-black tracking-tight">
                                {note.display}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 group-hover:text-slate-200">
                              {note.solfege} • {note.freq.toFixed(1)}Hz
                            </span>

                            {/* Miniature Piano Keys Illustration */}
                            <MiniPianoKeys
                              activePitches={[note.midi % 12]}
                              highlightColor={note.color}
                              width={58}
                              height={20}
                              className="my-1.5 opacity-90 group-hover:opacity-100"
                            />

                            {earQuizAnswered && isCorrectNote && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                            {earQuizAnswered && isGuessedNote && !isCorrectNote && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* CHOICE GRID: INTERVAL MODE */}
                {/* ========================================================================= */}
                {earTrainingMode === 'interval' && (
                  <div className="space-y-4">
                    <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
                      <span>{isId ? 'PILIH INTERVAL YANG ANDA DENGAR:' : isEs ? 'ELIGE EL INTERVALO QUE ESCUCHAS:' : 'SELECT THE INTERVAL YOU HEAR:'}</span>
                      <span className="text-[11px] text-slate-500 italic">
                        {currentQuizInterval
                          ? `${earChoiceRootMode === 'mixed' ? (isId ? 'Pilihan Root Acak Campur' : 'Mixed Roots') : currentQuizInterval.rootName} • 12 ${isId ? 'Interval' : isEs ? 'Intervalos' : 'Intervals'}`
                          : `12 ${isId ? 'Interval' : isEs ? 'Intervalos' : 'Intervals'}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {(quizIntervalChoices.length > 0 ? quizIntervalChoices : EAR_INTERVALS.map(inv => {
                        const activeRootPc = currentQuizInterval ? currentQuizInterval.rootPc : 0;
                        return {
                          id: `${activeRootPc}_${inv.semitones}`,
                          rootPc: activeRootPc,
                          rootName: getEarRootName(activeRootPc),
                          targetName: getIntervalTargetName(activeRootPc, inv.semitones),
                          interval: inv,
                          isCorrect: currentQuizInterval !== null && currentQuizInterval.semitones === inv.semitones,
                        };
                      })).map((choice) => {
                        const inv = choice.interval;
                        const isCorrectChoice = earQuizAnswered && choice.isCorrect;
                        const isGuessedChoice = lastGuessedValue === choice.id;

                        let btnStyle = 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200';
                        if (earQuizAnswered) {
                          if (isCorrectChoice) {
                            btnStyle = 'bg-emerald-600/90 border-cyan-400 text-white shadow-lg shadow-emerald-900/50 scale-[1.02] ring-2 ring-emerald-400';
                          } else if (isGuessedChoice && !isCorrectChoice) {
                            btnStyle = 'bg-rose-700/90 border-rose-400 text-white shadow-lg shadow-rose-900/50';
                          } else {
                            btnStyle = 'opacity-40 bg-slate-950 border-slate-900 text-slate-500 cursor-not-allowed';
                          }
                        }

                        return (
                          <button
                            key={choice.id}
                            type="button"
                            disabled={earQuizAnswered || currentQuizInterval === null || isAudioTonePlaying}
                            onClick={() => handleIntervalGuess(choice.id, inv.semitones, choice.rootPc)}
                            className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all relative ${btnStyle} ${
                              isAudioTonePlaying ? 'cursor-wait opacity-70' : 'cursor-pointer active:scale-95'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-white flex items-center gap-1.5">
                                  <span className="text-cyan-300 font-mono font-bold">{choice.rootName}</span>
                                  <span className="text-slate-500 font-mono">→</span>
                                  <span className="text-cyan-300 font-mono font-extrabold">{choice.targetName}</span>
                                </span>
                                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-950 font-bold text-cyan-400 border border-slate-800">
                                  {inv.shortCode}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[11px]">
                                <span className="font-semibold text-slate-300 truncate mr-1.5">
                                  {isId ? inv.name.id : isEs ? inv.name.es : inv.name.en}
                                </span>
                                <span className="font-mono text-slate-400 flex-shrink-0">
                                  {inv.semitones} {isId ? 'semiton' : isEs ? 'semitonos' : 'st'}
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-slate-400">
                                  {choice.rootName} + {inv.semitones}st
                                </span>
                                {/* Miniature Piano Keys Illustration showing root + interval */}
                                <MiniPianoKeys
                                  activePitches={[choice.rootPc, (choice.rootPc + inv.semitones) % 12]}
                                  highlightColor="#38bdf8"
                                  width={56}
                                  height={18}
                                  className="opacity-90"
                                />
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                              <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                              </svg>
                              <span className="truncate">{isId ? inv.song.id : isEs ? inv.song.es : inv.song.en}</span>
                            </div>

                            {earQuizAnswered && isCorrectChoice && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                            {earQuizAnswered && isGuessedChoice && !isCorrectChoice && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* CHOICE GRID: CHORD MODE */}
                {/* ========================================================================= */}
                {earTrainingMode === 'chord' && (
                  <div className="space-y-4">
                    <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
                      <span>{t.chPPSelectChord}</span>
                      <span className="text-[11px] text-slate-500 italic">
                        {currentQuizChord
                          ? `${earChoiceRootMode === 'mixed' ? (isId ? 'Pilihan Root Acak Campur' : 'Mixed Roots') : currentQuizChord.rootName} • 12 ${isId ? 'Kualitas Akor' : isEs ? 'Cualidades' : 'Chord Qualities'}`
                          : `12 ${isId ? 'Kualitas Akor' : isEs ? 'Cualidades' : 'Chord Qualities'}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {(quizChordChoices.length > 0 ? quizChordChoices : EAR_CHORDS.map(ch => {
                        const activeRootPc = currentQuizChord ? currentQuizChord.rootPc : 0;
                        return {
                          id: `${activeRootPc}_${ch.id}`,
                          rootPc: activeRootPc,
                          rootName: getEarRootName(activeRootPc),
                          chord: ch,
                          isCorrect: currentQuizChord !== null && currentQuizChord.chord.id === ch.id,
                        };
                      })).map((choice) => {
                        const chord = choice.chord;
                        const isCorrectChoice = earQuizAnswered && choice.isCorrect;
                        const isGuessedChoice = lastGuessedValue === choice.id;
                        const chordKeys = chord.intervals.map(inv => (choice.rootPc + inv) % 12);
                        const chordNotes = getChordNotesSpelling(choice.rootPc, chord.intervals);

                        let btnStyle = 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200';
                        if (earQuizAnswered) {
                          if (isCorrectChoice) {
                            btnStyle = 'bg-emerald-600/90 border-cyan-400 text-white shadow-lg shadow-emerald-900/50 scale-[1.02] ring-2 ring-emerald-400';
                          } else if (isGuessedChoice && !isCorrectChoice) {
                            btnStyle = 'bg-rose-700/90 border-rose-400 text-white shadow-lg shadow-rose-900/50';
                          } else {
                            btnStyle = 'opacity-40 bg-slate-950 border-slate-900 text-slate-500 cursor-not-allowed';
                          }
                        }

                        return (
                          <button
                            key={choice.id}
                            type="button"
                            disabled={earQuizAnswered || currentQuizChord === null || isAudioTonePlaying}
                            onClick={() => handleChordGuess(choice.id, chord.id, choice.rootPc)}
                            className={`p-3.5 rounded-xl border flex flex-col justify-between text-left transition-all relative ${btnStyle} ${
                              isAudioTonePlaying ? 'cursor-wait opacity-70' : 'cursor-pointer active:scale-95'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-white flex items-center gap-1.5 truncate mr-1">
                                  <span className="text-slate-200 font-mono font-black">{choice.rootName}</span>
                                  <span className="truncate">{isId ? chord.name.id : isEs ? chord.name.es : chord.name.en}</span>
                                </span>
                                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 font-bold text-cyan-300 border border-slate-700 flex-shrink-0">
                                  {choice.rootName}{chord.symbol}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[11px] font-mono text-slate-200 font-bold truncate mr-2">
                                  {chordNotes}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                                  {chord.formula}
                                </span>
                              </div>
                              <div className="mt-2 flex justify-end">
                                {/* Miniature Piano Keys Illustration showing the chord voicing on choice's root */}
                                <MiniPianoKeys
                                  activePitches={chordKeys}
                                  highlightColor="#c084fc"
                                  width={62}
                                  height={20}
                                  className="opacity-95"
                                />
                              </div>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5 leading-snug">
                              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                              </svg>
                              <span>{isId ? chord.feeling.id : isEs ? chord.feeling.es : chord.feeling.en}</span>
                            </div>

                            {earQuizAnswered && isCorrectChoice && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                            {earQuizAnswered && isGuessedChoice && !isCorrectChoice && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* POST-GUESS FEEDBACK & COMPARISON BAR */}
                {/* ========================================================================= */}
                {earQuizAnswered && (
                  <div className={`p-4 md:p-5 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn ${
                    isLastGuessCorrect
                      ? 'bg-emerald-950/40 border-slate-800 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      {isLastGuessCorrect ? (
                        <svg className="w-8 h-8 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      <div>
                        <div className="font-black text-base md:text-lg">
                          {isLastGuessCorrect ? t.chPPCorrectBadge : t.chPPIncorrectBadge}
                        </div>
                        <div className="text-xs md:text-sm text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
                          {earTrainingMode === 'pitch' ? (
                            <>
                              <span>{t.chPPActualPitch}</span>
                              <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono">
                                {currentQuizMidi !== null
                                  ? (PITCH_NOTES_OCTAVE4.find(n => n.midi % 12 === currentQuizMidi % 12)?.display || '—')
                                  : '—'}
                              </span>
                              {!isLastGuessCorrect && lastGuessedValue && (
                                <>
                                  <span className="text-slate-400">|</span>
                                  <span>{t.chPPYouGuessed}</span>
                                  <span className="font-bold text-rose-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono">
                                    {PITCH_NOTES_OCTAVE4.find(n => n.id === lastGuessedValue)?.display || lastGuessedValue}
                                  </span>
                                </>
                              )}
                            </>
                          ) : earTrainingMode === 'interval' ? (
                            <>
                              <span>{t.chPPActualPitch}</span>
                              <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono">
                                {(() => {
                                  if (!currentQuizInterval) return '—';
                                  const found = EAR_INTERVALS.find(i => i.semitones === currentQuizInterval.semitones);
                                  if (!found) return '—';
                                  const rName = getEarRootName(currentQuizInterval.rootPc);
                                  const tName = getIntervalTargetName(currentQuizInterval.rootPc, currentQuizInterval.semitones);
                                  return `${rName} → ${tName} (${isId ? found.name.id : isEs ? found.name.es : found.name.en})`;
                                })()}
                              </span>
                              {!isLastGuessCorrect && lastGuessedValue && (
                                <>
                                  <span className="text-slate-400">|</span>
                                  <span>{t.chPPYouGuessed}</span>
                                  <span className="font-bold text-rose-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono">
                                    {(() => {
                                      const foundChoice = quizIntervalChoices.find(c => c.id === lastGuessedValue);
                                      if (foundChoice) {
                                        return `${foundChoice.rootName} → ${foundChoice.targetName} (${isId ? foundChoice.interval.name.id : isEs ? foundChoice.interval.name.es : foundChoice.interval.name.en})`;
                                      }
                                      const foundInv = EAR_INTERVALS.find(i => String(i.semitones) === lastGuessedValue);
                                      if (!foundInv || !currentQuizInterval) return `${lastGuessedValue} semitones`;
                                      const rName = getEarRootName(currentQuizInterval.rootPc);
                                      const tName = getIntervalTargetName(currentQuizInterval.rootPc, foundInv.semitones);
                                      return `${rName} → ${tName} (${isId ? foundInv.name.id : isEs ? foundInv.name.es : foundInv.name.en})`;
                                    })()}
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <span>{t.chPPActualPitch}</span>
                              <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono">
                                {(() => {
                                  if (!currentQuizChord) return '—';
                                  const rName = getEarRootName(currentQuizChord.rootPc);
                                  const cNotes = getChordNotesSpelling(currentQuizChord.rootPc, currentQuizChord.chord.intervals);
                                  return `${rName} ${isId ? currentQuizChord.chord.name.id : isEs ? currentQuizChord.chord.name.es : currentQuizChord.chord.name.en} [${cNotes}]`;
                                })()}
                              </span>
                              {!isLastGuessCorrect && lastGuessedValue && (
                                <>
                                  <span className="text-slate-400">|</span>
                                  <span>{t.chPPYouGuessed}</span>
                                  <span className="font-bold text-rose-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono">
                                    {(() => {
                                      const foundChoice = quizChordChoices.find(c => c.id === lastGuessedValue);
                                      if (foundChoice) {
                                        return `${foundChoice.rootName} ${isId ? foundChoice.chord.name.id : isEs ? foundChoice.chord.name.es : foundChoice.chord.name.en} (${foundChoice.rootName}${foundChoice.chord.symbol})`;
                                      }
                                      const foundChord = EAR_CHORDS.find(c => c.id === lastGuessedValue);
                                      if (!foundChord || !currentQuizChord) return lastGuessedValue;
                                      const rName = getEarRootName(currentQuizChord.rootPc);
                                      return `${rName} ${isId ? foundChord.name.id : isEs ? foundChord.name.es : foundChord.name.en} (${rName}${foundChord.symbol})`;
                                    })()}
                                  </span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Audio Comparison & Next Question Actions */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                      {!isLastGuessCorrect && lastGuessedValue && (
                        <button
                          type="button"
                          disabled={isAudioTonePlaying}
                          onClick={() => {
                            if (earTrainingMode === 'pitch') {
                              const guessedNote = PITCH_NOTES_OCTAVE4.find(n => n.id === lastGuessedValue);
                              if (guessedNote) void playEarNoteSound(guessedNote.midi);
                            } else if (earTrainingMode === 'interval') {
                              const foundChoice = quizIntervalChoices.find(c => c.id === lastGuessedValue);
                              if (foundChoice) {
                                const baseMidi = currentQuizInterval ? (currentQuizInterval.rootMidi - (currentQuizInterval.rootPc) + foundChoice.rootPc) : (60 + foundChoice.rootPc);
                                void playEarIntervalSound(baseMidi, foundChoice.interval.semitones);
                              } else {
                                const semitones = Number(lastGuessedValue);
                                if (!isNaN(semitones) && currentQuizInterval) void playEarIntervalSound(currentQuizInterval.rootMidi, semitones);
                              }
                            } else if (earTrainingMode === 'chord') {
                              const foundChoice = quizChordChoices.find(c => c.id === lastGuessedValue);
                              if (foundChoice) {
                                const baseMidi = currentQuizChord ? (currentQuizChord.rootMidi - (currentQuizChord.rootPc) + foundChoice.rootPc) : (60 + foundChoice.rootPc);
                                void playEarChordSound(baseMidi, foundChoice.chord.intervals);
                              } else {
                                const found = EAR_CHORDS.find(c => c.id === lastGuessedValue);
                                if (found && currentQuizChord) void playEarChordSound(currentQuizChord.rootMidi, found.intervals);
                              }
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all flex items-center gap-1.5 ${
                            isAudioTonePlaying
                              ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer active:scale-95'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                          <span>{t.chPPPlayGuess}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isAudioTonePlaying}
                        onClick={() => {
                          if (earTrainingMode === 'pitch' && currentQuizMidi !== null) {
                            void playEarNoteSound(currentQuizMidi);
                          } else if (earTrainingMode === 'interval' && currentQuizInterval !== null) {
                            void playEarIntervalSound(currentQuizInterval.rootMidi, currentQuizInterval.semitones);
                          } else if (earTrainingMode === 'chord' && currentQuizChord !== null) {
                            void playEarChordSound(currentQuizChord.rootMidi, currentQuizChord.chord.intervals);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all flex items-center gap-1.5 ${
                          isAudioTonePlaying
                            ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                            : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700 cursor-pointer active:scale-95'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        <span>{t.chPPPlayCorrect}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGenerateNewEarQuestion()}
                        className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs md:text-sm transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                      >
                        <span>{t.chPPNextBtn}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* 12-PITCH MEMORY HEATMAP & STATS MATRIX */}
                {/* ========================================================================= */}
                <div className="pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">
                      {t.chPPHeatmapTitle}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {isId ? 'Tingkat Keberhasilan per Nada' : isEs ? 'Precisión por Tono' : 'Per-Pitch Accuracy'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                    {PITCH_NOTES_OCTAVE4.map((note) => {
                      const stat = earHeatmapStats[note.id];
                      const total = stat?.total || 0;
                      const correct = stat?.correct || 0;
                      const pct = total > 0 ? Math.round((correct / total) * 100) : null;

                      let badgeBg = 'bg-slate-950/80 border-slate-800 text-slate-500';
                      if (pct !== null) {
                        if (pct >= 80) badgeBg = 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300';
                        else if (pct >= 50) badgeBg = 'bg-slate-800 border-slate-700 text-slate-200';
                        else badgeBg = 'bg-rose-950/80 border-rose-600/50 text-rose-300';
                      }

                      return (
                        <div
                          key={note.id}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${badgeBg}`}
                        >
                          <span className="text-xs font-black font-mono">{note.display}</span>
                          <span className="text-[10px] font-mono font-bold mt-0.5">
                            {pct !== null ? `${pct}%` : '—'}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">
                            {correct}/{total}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* EDUCATIONAL MASTERCLASS CONTENT */}
              {/* ========================================================================= */}

              {/* SECTION 1: THE SCIENCE OF ABSOLUTE VS RELATIVE PITCH */}
              <div className="p-6 md:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    {isId ? 'BAGIAN 7.1 • DASAR NEUROLOGIS' : isEs ? 'SECCIÓN 7.1 • BASE NEUROLÓGICA' : 'SECTION 7.1 • NEUROLOGICAL FOUNDATIONS'}
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-white mt-1">
                    {t.chPPTheorySec1Title}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300 leading-relaxed">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold">
                      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>{isId ? 'Perfect Pitch (Pitch Absolut)' : isEs ? 'Oído Absoluto (Perfect Pitch)' : 'Absolute Pitch (AP)'}</span>
                    </div>
                    <p>
                      {isId
                        ? 'Kemampuan mengenali frekuensi suara musik secara instan tanpa bantuan nada referensi eksternal, mirip dengan cara mata mengenali warna merah atau biru. Pada anak usia 3–7 tahun, tonotopi otak dapat memetakan nada secara permanen jika terpapar nada piano secara konsisten.'
                        : isEs
                        ? 'La capacidad de identificar la frecuencia de una nota al instante sin un tono de referencia externo, similar a cómo los ojos reconocen el color rojo o azul. Entre los 3 y 7 años, la corteza auditiva puede mapear tonos de forma permanente con práctica temprana.'
                        : 'The rare ability to identify and recreate any musical pitch without an external reference tone, analogous to identifying colors like red or blue. In early childhood (ages 3–7), the brain\'s tonotopic auditory cortex can hard-code pitch memory with consistent musical exposure.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold">
                      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>{isId ? 'Relative Pitch (Pitch Relatif)' : isEs ? 'Oído Relativo (Relative Pitch)' : 'Relative Pitch (RP)'}</span>
                    </div>
                    <p>
                      {isId
                        ? 'Kemampuan mengidentifikasi nada melalui perbandingan jarak (interval) dengan nada lain yang telah diketahui. Keterampilan ini dapat dilatih dan dikuasai 100% oleh musisi dewasa kapan saja, dan seringkali jauh lebih berharga untuk aransemen, harmoni, dan improvisasi.'
                        : isEs
                        ? 'La capacidad de identificar notas comparando la distancia interválica con respecto a un tono conocido. Esta habilidad puede entrenarse y dominarse al 100% a cualquier edad, siendo sumamente valiosa para arreglos, armonía e improvisación.'
                        : 'The ability to identify pitches by calculating the interval distance from a known anchor note. Unlike absolute pitch, relative pitch can be mastered to 100% proficiency by any adult musician through consistent training, and is vital for harmony and transcribing.'}
                    </p>
                  </div>
                </div>

                {/* Mathematical Equation Callout */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs md:text-sm text-slate-200 space-y-2">
                  <div className="font-mono font-bold text-cyan-300 flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    <span>{isId ? 'PERSAMAAN MATEMATIS FREKUENSI TEMPERAMEN SAMA (EQUAL TEMPERAMENT):' : isEs ? 'FÓRMULA MATEMÁTICA DE FRECUENCIA EN TEMPERAMENTO IGUAL:' : 'EQUAL TEMPERAMENT PITCH FREQUENCY FORMULA:'}</span>
                  </div>
                  <div className="font-mono text-center py-2 text-base md:text-lg text-slate-200 font-bold bg-slate-950/70 rounded-lg border border-slate-800">
                    f(n) = 440 × 2^((n - 69) / 12) Hz
                  </div>
                  <p className="text-xs text-slate-400">
                    {isId
                      ? 'Di mana n adalah nomor not MIDI (A4 = 69 = 440 Hz). Setiap semiton memiliki rasio frekuensi tepat 2^(1/12) ≈ 1.059463. Jarak 1 oktaf melipatgandakan frekuensi tepat 2 kali lipat.'
                      : isEs
                      ? 'Donde n es el número de nota MIDI (La4 = 69 = 440 Hz). Cada semitono representa una razón exacta de 2^(1/12) ≈ 1.059463. Una octava completa duplica la frecuencia exactamente por 2.'
                      : 'Where n is the MIDI note number (A4 = 69 = 440 Hz). Each ascending semitone multiplies frequency by 2^(1/12) ≈ 1.059463. A full octave represents exactly double the acoustic frequency.'}
                  </p>
                </div>

                {/* Frequency & Wavelength Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-800">
                    <thead>
                      <tr className="bg-slate-950 text-slate-300 font-mono uppercase tracking-wider">
                        <th className="p-2.5 border border-slate-800">Note</th>
                        <th className="p-2.5 border border-slate-800">Solfege</th>
                        <th className="p-2.5 border border-slate-800">MIDI</th>
                        <th className="p-2.5 border border-slate-800">Freq (Hz)</th>
                        <th className="p-2.5 border border-slate-800">{isId ? 'Panjang Gelombang' : isEs ? 'Longitud de Onda' : 'Wavelength'} (λ)</th>
                        <th className="p-2.5 border border-slate-800">{isId ? 'Karakter Tonal' : isEs ? 'Carácter Tonal' : 'Tonal Character'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                      {PITCH_NOTES_OCTAVE4.map((n) => (
                        <tr key={n.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5 font-bold flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: n.color }} />
                            <span className="text-white">{n.display}</span>
                          </td>
                          <td className="p-2.5 text-slate-300">{n.solfege}</td>
                          <td className="p-2.5 text-slate-400">{n.midi}</td>
                          <td className="p-2.5 font-bold text-slate-200 font-mono">{n.freq.toFixed(2)} Hz</td>
                          <td className="p-2.5 text-slate-400">{n.wavelengthCm.toFixed(1)} cm</td>
                          <td className="p-2.5 text-slate-300 font-sans">{isId ? n.character.id : isEs ? n.character.es : n.character.en}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 2: SYNESTHESIA & COLOR SPECTRUM MAPPING */}
              <div className="p-6 md:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    {isId ? 'BAGIAN 7.2 • ASOSIASI KOGNITIF & WARNA' : isEs ? 'SECCIÓN 7.2 • ASOCIACIÓN COGNITIVA Y COLOR' : 'SECTION 7.2 • SYNESTHETIC COLOR MAPPING'}
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-white mt-1">
                    {t.chPPTheorySec2Title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
                    {isId
                      ? 'Banyak komponis legendaris seperti Franz Liszt, Alexander Scriabin, dan Olivier Messiaen memiliki sinestesia—kemampuan otak menghubungkan getaran suara dengan warna cahaya. Anda dapat mengadopsi teknik jangkar mental ini untuk mengingat karakter masing-masing nada.'
                      : isEs
                      ? 'Compositores ilustres como Franz Liszt, Alexander Scriabin y Olivier Messiaen experimentaban sinestesia: la conexión espontánea entre tonos sonoros y colores visuales. Puedes usar estas asociaciones cromáticas como anclas mentales para identificar notas.'
                      : 'Legendary composers including Liszt, Scriabin, and Messiaen experienced auditory-visual synesthesia—perceiving specific frequencies as luminous colors. Adult musicians can leverage these mnemonic anchors to develop near-instant pitch recognition.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {PITCH_NOTES_OCTAVE4.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between hover:border-slate-700 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full shadow-md" style={{ backgroundColor: note.color }} />
                            <span className="text-base font-black text-white">{note.display}</span>
                          </div>
                          <span className="text-xs font-mono text-slate-400">{note.solfege}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {isId ? note.character.id : isEs ? note.character.es : note.character.en}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center gap-1.5 truncate">
                        <svg className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="truncate">{note.famousWork}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: INTERVAL MNEMONIC CHEAT SHEET */}
              <div data-no-ui-sound="true" className="p-6 md:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
                <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'BAGIAN 7.3 • JEMBATAN KELEDAI INTERVAL' : isEs ? 'SECCIÓN 7.3 • MNEMOTECNIAS DE INTERVALOS' : 'SECTION 7.3 • INTERVAL MNEMONICS'}
                    </span>
                    <h3 className="text-lg md:text-xl font-black text-white mt-1">
                      {t.chPPTheorySec3Title}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {isId ? 'Klik tombol Putar (Play) untuk mendengarkan' : isEs ? 'Haz clic en Reproducir para escuchar' : 'Click Play button to audition'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-800">
                    <thead>
                      <tr className="bg-slate-950 text-slate-300 font-mono uppercase tracking-wider">
                        <th className="p-2.5 border border-slate-800">{isId ? 'Interval' : isEs ? 'Intervalo' : 'Interval'}</th>
                        <th className="p-2.5 border border-slate-800">Semitones</th>
                        <th className="p-2.5 border border-slate-800">Ratio</th>
                        <th className="p-2.5 border border-slate-800">{isId ? 'Lagu Referensi Populer' : isEs ? 'Canción de Referencia' : 'Famous Song Anchor'}</th>
                        <th className="p-2.5 border border-slate-800">{isId ? 'Kesan Rasa' : isEs ? 'Sensación Tonal' : 'Emotional Feeling'}</th>
                        <th className="p-2.5 border border-slate-800 text-center">Audio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {EAR_INTERVALS.map((inv) => (
                        <tr key={inv.semitones} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5 font-bold font-mono text-white">
                            {isId ? inv.name.id : isEs ? inv.name.es : inv.name.en} ({inv.shortCode})
                          </td>
                          <td className="p-2.5 font-mono text-slate-400">{inv.semitones}</td>
                          <td className="p-2.5 font-mono text-cyan-400">{inv.ratio}</td>
                          <td className="p-2.5 text-slate-300 font-medium">
                            <span className="inline-flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                              </svg>
                              <span>{isId ? inv.song.id : isEs ? inv.song.es : inv.song.en}</span>
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-300">{isId ? inv.feeling.id : isEs ? inv.feeling.es : inv.feeling.en}</td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              disabled={isAudioTonePlaying}
                              onClick={() => void playEarIntervalSound(60, inv.semitones)}
                              className={`px-2.5 py-1 rounded text-white font-mono text-xs transition-all inline-flex items-center justify-center ${
                                isAudioTonePlaying
                                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                                  : 'bg-slate-800 hover:bg-cyan-600 active:scale-95 cursor-pointer'
                              }`}
                              title={`Play ${inv.shortCode}`}
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 4: 10-MINUTE DAILY EAR ROUTINE */}
              <div className="p-6 md:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    {isId ? 'BAGIAN 7.4 • RUTINITAS HARIAN' : isEs ? 'SECCIÓN 7.4 • RUTINA DIARIA' : 'SECTION 7.4 • DAILY PROTOCOL'}
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-white mt-1">
                    {t.chPPTheorySec4Title}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-xs">
                      <span>01.</span>
                      <span>{isId ? 'UJI JANGKAR PAGI (2 MENIT)' : isEs ? 'TEST DE ANCLA MATUTINO (2 MIN)' : 'MORNING ANCHOR TEST (2 MIN)'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isId
                        ? 'Sebelum memainkan instrumen, nyanyikan nada C4 atau A4 langsung dari ingatan Anda. Kemudian tekan tuts piano untuk memeriksa apakah frekuensi vokal Anda tepat sasaran.'
                        : isEs
                        ? 'Antes de tocar cualquier nota, intenta cantar un Do4 o La4 solo de memoria. Luego presiona la tecla en el piano para verificar si tu memoria interna acertó.'
                        : 'Before touching any instrument, sing Middle C (C4) or Concert A (A4) purely from internal memory. Then hit the piano key to verify your acoustic recall accuracy.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-xs">
                      <span>02.</span>
                      <span>{isId ? '20 KUIS BUTA DI OCTAVIA (5 MENIT)' : isEs ? '20 PRUEBAS A CIEGAS (5 MIN)' : '20 BLIND TESTS IN OCTAVIA (5 MIN)'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isId
                        ? 'Jalankan konsol kuis interaktif di atas selama 20 soal setiap hari. Mulai dari Tuts Putih C Major hingga 12 Kromatik lengkap, pertahankan streak setinggi mungkin!'
                        : isEs
                        ? 'Completa 20 preguntas en la consola interactiva de arriba cada día. Comienza con teclas blancas y avanza a las 12 cromáticas buscando rachas perfectas.'
                        : 'Run 20 daily rounds on the Octavia Trainer console above. Progress from C Major naturals to all 12 chromatic tones, tracking your daily streak and heatmap mastery.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold font-mono text-xs">
                      <span>03.</span>
                      <span>{isId ? 'TRANSKRIPSI INTERVAL MALAM (3 MENIT)' : isEs ? 'TRANSCRIPCIÓN NOCTURNA (3 MIN)' : 'EVENING TRANSCRIPTION (3 MIN)'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isId
                        ? 'Dengarkan lagu favorit Anda di radio atau streaming, dan gunakan tabel lagu referensi interval untuk menebak lompatan 2 nada pertama melodi vokalnya.'
                        : isEs
                        ? 'Escucha tu canción favorita e intenta identificar los dos primeros tonos de la melodía usando las canciones mnemotécnicas de la tabla de intervalos.'
                        : 'Listen to any vocal melody on the radio and identify the opening 2-note interval leap using your mental song reference catalog.'}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 8: MIDI Editor, Sequencer & Audio Calibration Masterclass */}
          {/* ========================================================================= */}
          {activeChapter === 'midieditor' && (
            <article className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
              {/* Chapter Header */}
              <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs md:text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 08 • EDITOR MIDI & SEKUENSER' : isEs ? 'MÓDULO 08 • EDITOR MIDI Y SECUENCIADOR' : 'MODULE 08 • MIDI EDITOR & SEQUENCER'}
                    </span>
                    <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700">
                      480 PPQ RESOLUTION • DUAL HAND SEQUENCER
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {t.ch8Title}
                  </h2>
                  <p className="text-sm md:text-[15px] text-slate-200 mt-3 leading-relaxed max-w-4xl">
                    {t.ch8Desc}
                  </p>
                </div>
                {onOpenMidiEditor && (
                  <button
                    type="button"
                    onClick={onOpenMidiEditor}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold transition-all flex items-center gap-2 flex-shrink-0 shadow-lg shadow-cyan-900/30 border border-cyan-400/30 active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>{t.ch8LaunchEditor}</span>
                  </button>
                )}
              </div>

              {/* FIG 7.1: Full Architectural Piano Roll Visual Diagram */}
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 7.1 — OCTAVIA PIANO ROLL &amp; TICK SEQUENCER BLUEPRINT
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-1">
                      {t.ch8VisualTitle}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                    480 TICKS / QUARTER • DUAL CHANNELS
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 880 390" className="w-full min-w-[780px] h-auto select-none font-sans">
                    <rect width="880" height="390" rx="8" fill="#0a0f1d" stroke="#334155" />

                    {/* Top Mock Toolbar */}
                    <g transform="translate(16, 14)">
                      <rect width="848" height="36" rx="5" fill="#0a0f1d" stroke="#1e293b" />
                      
                      {/* Transport Controls Mock */}
                      <g transform="translate(12, 8)">
                        <circle cx="10" cy="10" r="10" fill="#0284c7" />
                        <polygon points="8,5 15,10 8,15" fill="#ffffff" />
                        <rect x="28" y="2" width="16" height="16" rx="3" fill="#1e293b" />
                        <rect x="33" y="6" width="6" height="8" fill="#94a3b8" />
                      </g>

                      {/* Info Display Badges */}
                      <g transform="translate(70, 8)">
                        <rect width="70" height="20" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="35" y="14" fill="#38bdf8" textAnchor="middle" fontSize="13.5" fontFamily="monospace" fontWeight="bold">120 BPM</text>
                      </g>
                      <g transform="translate(148, 8)">
                        <rect width="48" height="20" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="24" y="14" fill="#a5b4fc" textAnchor="middle" fontSize="13.5" fontFamily="monospace" fontWeight="bold">4/4</text>
                      </g>
                      <g transform="translate(204, 8)">
                        <rect width="60" height="20" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="30" y="14" fill="#fde047" textAnchor="middle" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{L("KEY: C", "KUNCI: C", "TONALIDAD: DO")}</text>
                      </g>
                      <g transform="translate(272, 8)">
                        <rect width="75" height="20" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="37" y="14" fill="#34d399" textAnchor="middle" fontSize="13.5" fontFamily="monospace" fontWeight="bold">SNAP: 1/16</text>
                      </g>

                      {/* Hand Mode Toggle Mock */}
                      <g transform="translate(680, 8)">
                        <rect width="72" height="20" rx="4" fill="#083344" stroke="#06b6d4" />
                        <text x="36" y="14" fill="#22d3ee" textAnchor="middle" fontSize="13" fontFamily="monospace" fontWeight="bold">{L("RIGHT (RH)", "RH (KANAN)", "MD (DERECHA)")}</text>
                      </g>
                      <g transform="translate(760, 8)">
                        <rect width="72" height="20" rx="4" fill="#1e1b4b" stroke="#6366f1" />
                        <text x="36" y="14" fill="#a5b4fc" textAnchor="middle" fontSize="13" fontFamily="monospace" fontWeight="bold">{L("LEFT (LH)", "LH (KIRI)", "MI (IZQUIERDA)")}</text>
                      </g>
                    </g>

                    {/* Timeline Ruler */}
                    <g transform="translate(70, 58)">
                      <rect width="794" height="26" fill="#090d16" stroke="#1e293b" />
                      {/* Measure Marks: 4 Bars across 794px */}
                      {[
                        { bar: 'BAR 1', x: 0, sub: ['1.1', '1.2', '1.3', '1.4'] },
                        { bar: 'BAR 2', x: 198, sub: ['2.1', '2.2', '2.3', '2.4'] },
                        { bar: 'BAR 3', x: 396, sub: ['3.1', '3.2', '3.3', '3.4'] },
                        { bar: 'BAR 4', x: 594, sub: ['4.1', '4.2', '4.3', '4.4'] },
                      ].map((m, bi) => (
                        <g key={`m-${bi}`} transform={`translate(${m.x}, 0)`}>
                          <line x1="0" y1="0" x2="0" y2="26" stroke="#64748b" strokeWidth="1.8" />
                          <text x="6" y="17" fill="#f8fafc" fontSize="13.5" fontFamily="monospace" fontWeight="bold">{m.bar}</text>
                          {m.sub.map((s, si) => (
                            <g key={`sub-${si}`} transform={`translate(${si * 49.5}, 0)`}>
                              {si > 0 && <line x1="0" y1="14" x2="0" y2="26" stroke="#334155" strokeWidth="1" />}
                              {si > 0 && <text x="4" y="22" fill="#64748b" fontSize="11.5" fontFamily="monospace">{s}</text>}
                            </g>
                          ))}
                        </g>
                      ))}
                    </g>

                    {/* Left Vertical Piano Keys Axis (C5 down to C3) */}
                    <g transform="translate(16, 84)">
                      {[
                        { k: 'C5', isBlack: false, midi: 72 },
                        { k: 'B4', isBlack: false, midi: 71 },
                        { k: 'A#4', isBlack: true, midi: 70 },
                        { k: 'A4', isBlack: false, midi: 69 },
                        { k: 'G#4', isBlack: true, midi: 68 },
                        { k: 'G4', isBlack: false, midi: 67 },
                        { k: 'F#4', isBlack: true, midi: 66 },
                        { k: 'F4', isBlack: false, midi: 65 },
                        { k: 'E4', isBlack: false, midi: 64 },
                        { k: 'D#4', isBlack: true, midi: 63 },
                        { k: 'D4', isBlack: false, midi: 62 },
                        { k: 'C#4', isBlack: true, midi: 61 },
                        { k: 'C4', isBlack: false, midi: 60, isMid: true },
                        { k: 'B3', isBlack: false, midi: 59 },
                        { k: 'A3', isBlack: false, midi: 57 },
                        { k: 'G3', isBlack: false, midi: 55 },
                        { k: 'E3', isBlack: false, midi: 52 },
                        { k: 'C3', isBlack: false, midi: 48 },
                      ].map((keyItem, ki) => {
                        const y = ki * 13;
                        return (
                          <g key={`pk-${ki}`} transform={`translate(0, ${y})`}>
                            <rect
                              width="54"
                              height="12"
                              fill={keyItem.isMid ? '#451a03' : keyItem.isBlack ? '#020617' : '#0f172a'}
                              stroke={keyItem.isMid ? '#f59e0b' : '#334155'}
                              strokeWidth={keyItem.isMid ? 1.5 : 1}
                              rx="1.5"
                            />
                            <text
                              x="46"
                              y="9.5"
                              textAnchor="end"
                              fill={keyItem.isMid ? '#fde68a' : keyItem.isBlack ? '#64748b' : '#cbd5e1'}
                              fontSize="11.5"
                              fontFamily="monospace"
                              fontWeight={keyItem.isMid ? 'bold' : 'normal'}
                            >
                              {keyItem.k}
                            </text>
                          </g>
                        );
                      })}
                    </g>

                    {/* Piano Roll Grid Canvas */}
                    <g transform="translate(70, 84)">
                      <rect width="794" height="234" fill="#040711" stroke="#1e293b" />

                      {/* Row Grid Lines */}
                      {Array.from({ length: 18 }).map((_, r) => (
                        <line key={`rg-${r}`} x1="0" y1={r * 13} x2="794" y2={r * 13} stroke="#0f172a" strokeWidth="1" />
                      ))}

                      {/* Highlight Middle C row (row 12) */}
                      <rect x="0" y={12 * 13} width="794" height="13" fill="#f59e0b" fillOpacity="0.08" />

                      {/* Column Vertical Grid Lines (Beat subdivisions) */}
                      {Array.from({ length: 16 }).map((_, c) => (
                        <line
                          key={`cg-${c}`}
                          x1={c * 49.5}
                          y1="0"
                          x2={c * 49.5}
                          y2="234"
                          stroke={c % 4 === 0 ? '#334155' : '#0f172a'}
                          strokeWidth={c % 4 === 0 ? 1.5 : 0.8}
                          strokeDasharray={c % 4 === 0 ? 'none' : '2,2'}
                        />
                      ))}

                      {/* Left Hand Notes (Indigo / Purple) */}
                      {/* Bar 1: C3 (Whole note, Row 17) */}
                      <rect x="0" y={17 * 13 + 1} width="194" height="11" rx="2" fill="#4f46e5" stroke="#818cf8" strokeWidth="1.2" />
                      <text x="6" y={17 * 13 + 9} fill="#e0e7ff" fontSize="11.5" fontFamily="monospace" fontWeight="bold">{L("LH: C3 (Root)", "LH: C3 (Akar)", "MI: Do3 (Fund.)")}</text>

                      {/* Bar 2: G3 (Row 15) */}
                      <rect x="198" y={15 * 13 + 1} width="194" height="11" rx="2" fill="#4f46e5" stroke="#818cf8" strokeWidth="1.2" />
                      <text x="204" y={15 * 13 + 9} fill="#e0e7ff" fontSize="11.5" fontFamily="monospace" fontWeight="bold">{L("LH: G3 (5th)", "LH: G3 (Kuint)", "MI: Sol3 (5ª)")}</text>

                      {/* Bar 3: A3 (Row 14) */}
                      <rect x="396" y={14 * 13 + 1} width="194" height="11" rx="2" fill="#4f46e5" stroke="#818cf8" strokeWidth="1.2" />
                      <text x="402" y={14 * 13 + 9} fill="#e0e7ff" fontSize="11.5" fontFamily="monospace" fontWeight="bold">{L("LH: A3 (vi)", "LH: A3 (vi)", "MI: La3 (vi)")}</text>

                      {/* Bar 4: F3 (Row 16 / E3) */}
                      <rect x="594" y={16 * 13 + 1} width="194" height="11" rx="2" fill="#4f46e5" stroke="#818cf8" strokeWidth="1.2" />
                      <text x="600" y={16 * 13 + 9} fill="#e0e7ff" fontSize="11.5" fontFamily="monospace" fontWeight="bold">{L("LH: F3 (IV)", "LH: F3 (IV)", "MI: Fa3 (IV)")}</text>

                      {/* Right Hand Notes (Cyan / Sky) */}
                      {/* Bar 1 Arpeggio / Triad: C4, E4, G4 */}
                      <rect x="2" y={12 * 13 + 1} width="46" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="6" y={12 * 13 + 9} fill="#ecfeff" fontSize="11" fontFamily="monospace">C4</text>

                      <rect x="51.5" y={8 * 13 + 1} width="46" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="55.5" y={8 * 13 + 9} fill="#ecfeff" fontSize="11" fontFamily="monospace">E4</text>

                      <rect x="101" y={5 * 13 + 1} width="46" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="105" y={5 * 13 + 9} fill="#ecfeff" fontSize="11" fontFamily="monospace">G4</text>

                      <rect x="150.5" y={0 * 13 + 1} width="46" height="11" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
                      <text x="154.5" y={0 * 13 + 9} fill="#ecfeff" fontSize="11" fontFamily="monospace">C5</text>

                      {/* Bar 2 Melody: B4, G4, D4 */}
                      <rect x="200" y={1 * 13 + 1} width="96" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="204" y={1 * 13 + 9} fill="#ecfeff" fontSize="11" fontFamily="monospace">{L("B4 (Half)", "B4 (Setengah)", "Si4 (Blanca)")}</text>

                      <rect x="298" y={5 * 13 + 1} width="46" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="302" y={5 * 13 + 9} fill="#ecfeff" fontSize="11" fontFamily="monospace">G4</text>

                      <rect x="347" y={10 * 13 + 1} width="46" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="351" y={10 * 13 + 9} fill="#ecfeff" fontSize="11" fontFamily="monospace">D4</text>

                      {/* Bar 3: Am Chord melody */}
                      <rect x="398" y={3 * 13 + 1} width="96" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="402" y={3 * 13 + 9} fill="#ecfeff" fontSize="11" fontFamily="monospace">A4</text>
                      <rect x="496" y={8 * 13 + 1} width="96" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="500" y={8 * 13 + 9} fill="#ecfeff" fontSize="11" fontFamily="monospace">E4</text>

                      {/* Bar 4: F Chord melody */}
                      <rect x="596" y={3 * 13 + 1} width="96" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="600" y={3 * 13 + 9} fill="#ecfeff" fontSize="11" fontFamily="monospace">A4</text>
                      <rect x="694" y={5 * 13 + 1} width="96" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="698" y={5 * 13 + 9} fill="#ecfeff" fontSize="11" fontFamily="monospace">{L("C5 (End)", "C5 (Akhir)", "Do5 (Fin)")}</text>

                      {/* Vertical Amber Playhead Marker */}
                      <line x1="260" y1="0" x2="260" y2="234" stroke="#f59e0b" strokeWidth="2" strokeDasharray="none" />
                      <polygon points="255,-6 265,-6 260,0" fill="#f59e0b" />
                    </g>

                    {/* Bottom Velocity Lane (Height: 52px) */}
                    <g transform="translate(16, 324)">
                      <rect width="848" height="52" rx="4" fill="#090d16" stroke="#1e293b" />
                      <text x="12" y="16" fill="#64748b" fontSize="12" fontFamily="monospace" fontWeight="bold">{L("VELOCITY (0–127)", "VELOCITY DINAMIKA (0–127)", "VELOCIDAD DINÁMICA (0–127)")}</text>
                      
                      {/* Grid Line for mf (80) */}
                      <line x1="54" y1="24" x2="840" y2="24" stroke="#1e293b" strokeDasharray="3,3" />
                      <text x="46" y="27" textAnchor="end" fill="#475569" fontSize="11" fontFamily="monospace">80</text>

                      {/* Stems matching the notes above */}
                      {/* Bar 1 Right hand stems */}
                      <line x1="94" y1="50" x2="94" y2="18" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="94" cy="18" r="2.5" fill="#38bdf8" />

                      <line x1="143" y1="50" x2="143" y2="22" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="143" cy="22" r="2.5" fill="#38bdf8" />

                      <line x1="193" y1="50" x2="193" y2="19" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="193" cy="19" r="2.5" fill="#38bdf8" />

                      <line x1="242" y1="50" x2="242" y2="14" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="242" cy="14" r="2.5" fill="#f43f5e" />

                      {/* Left hand stem (Bar 1) */}
                      <line x1="100" y1="50" x2="100" y2="26" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="100" cy="26" r="2" fill="#818cf8" />

                      {/* Bar 2 Stems */}
                      <line x1="292" y1="50" x2="292" y2="15" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="292" cy="15" r="2.5" fill="#f43f5e" />

                      <line x1="390" y1="50" x2="390" y2="24" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="390" cy="24" r="2.5" fill="#38bdf8" />

                      <line x1="439" y1="50" x2="439" y2="28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="439" cy="28" r="2.5" fill="#38bdf8" />

                      {/* Bar 3 Stems */}
                      <line x1="490" y1="50" x2="490" y2="16" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="490" cy="16" r="2.5" fill="#f59e0b" />

                      <line x1="588" y1="50" x2="588" y2="22" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="588" cy="22" r="2.5" fill="#38bdf8" />

                      {/* Bar 4 Stems */}
                      <line x1="688" y1="50" x2="688" y2="18" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="688" cy="18" r="2.5" fill="#38bdf8" />

                      <line x1="786" y1="50" x2="786" y2="12" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="786" cy="12" r="2.5" fill="#f43f5e" />
                    </g>
                  </svg>
                </div>

                {/* 6 Feature Callout Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-800/80 text-xs md:text-sm font-mono">
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-cyan-400 font-bold block">{L("01. RULER", "01. PENGGARIS", "01. REGLA")}</span>
                    <span>{isId ? 'Birama 1–4 & Ketukan' : isEs ? 'Compases 1–4' : 'Bars 1–4 & Beats'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-cyan-400 font-bold block">{isId ? '02. RESOLUSI' : isEs ? '02. RESOLUCIÓN' : '02. RESOLUTION'}</span>
                    <span>{L("480 PPQ Metric Grid", "Grid Metrik 480 PPQ", "Rejilla Métrica de 480 PPQ")}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-cyan-400 font-bold block">{isId ? '03. TANGAN KANAN' : isEs ? '03. MANO DERECHA' : '03. RIGHT HAND'}</span>
                    <span className="text-cyan-300">{isId ? 'Sian / Melodi Treble' : isEs ? 'Cian / Melodía' : 'Cyan / Lead Mel'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-slate-300 font-bold block">{isId ? '04. TANGAN KIRI' : isEs ? '04. MANO IZQUIERDA' : '04. LEFT HAND'}</span>
                    <span className="text-slate-400">{isId ? 'Ungu / Bass & Akor' : isEs ? 'Índigo / Bajos' : 'Indigo / Bass Root'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-slate-200 font-bold block">{L("05. PLAYHEAD", "05. INDIKATOR PUTAR", "05. CABEZAL")}</span>
                    <span>{isId ? 'Scrubber Posisi Audio' : isEs ? 'Línea de Reproducción' : 'Live Timeline Play'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-slate-200 font-bold block">{L("06. VELOCITY", "06. VELOCITY DINAMIKA", "06. VELOCIDAD")}</span>
                    <span>{L("0–127 Dyn Dynamics", "0–127 Dinamika Bunyi", "0–127 Dinámica")}</span>
                  </div>
                </div>
              </div>

              {/* CORE CONCEPT 1: Coordinate Architecture & 480 PPQ Metric System */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">
                    1
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {t.ch8ArchTitle}
                  </h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {t.ch8ArchDesc}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <polyline points="12 6 12 12 16 14" strokeWidth="2" />
                      </svg>
                      <span>{isId ? 'Sumbu Horizontal (Ticks)' : isEs ? 'Eje Horizontal (Ticks)' : 'Horizontal Time Axis'}</span>
                    </div>
                    <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                      {isId
                        ? '1 Ketukan Not Seperempat (Quarter Beat) = 480 Ticks. Pada birama 4/4 standar, 1 Bar utuh bernilai persis 1,920 Ticks. Setiap not menyimpan stempel waktu mulai (ticks) dan durasi (durationTicks).'
                        : isEs
                        ? '1 Negra (Quarter Beat) = 480 Ticks. En compás de 4/4, un compás completo mide 1,920 Ticks. Cada nota guarda su posición exacta en ticks y su duración.'
                        : '1 Quarter Note Beat = 480 Ticks. In standard 4/4 meter, 1 full measure is exactly 1,920 Ticks. Every note stores its start timestamp and duration in exact integer ticks.'}
                    </p>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span>{isId ? 'Sumbu Vertikal (Midi Note)' : isEs ? 'Eje Vertical (Notas MIDI)' : 'Vertical Pitch Axis'}</span>
                    </div>
                    <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                      {isId
                        ? 'Angka MIDI 0 hingga 127. Pada piano standar 88-tuts, rentang nada membentang dari A0 (MIDI 21) hingga C8 (MIDI 108). Tuts tengah C4 (Middle C) berada pada MIDI 60.'
                        : isEs
                        ? 'Rango MIDI de 0 a 127. En un piano de 88 teclas, va desde La0 (MIDI 21) hasta Do8 (MIDI 108). El Do Central (C4) es la nota MIDI 60.'
                        : 'MIDI note numbers from 0 to 127. On a standard 88-key piano, the range spans from A0 (MIDI 21) to C8 (MIDI 108), with Middle C (C4) anchored at MIDI 60.'}
                    </p>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                      <span>{isId ? 'Mode Drum vs Mode Piano' : isEs ? 'Modo Batería vs Piano' : 'Drum vs Piano Modes'}</span>
                    </div>
                    <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                      {isId
                        ? 'Dalam mode Drum, sumbu vertikal otomatis beralih memetakan instrumen perkusi: Bass Drum (Kick), Snare, Closed Hi-Hat, Open Hi-Hat, Tom Rendah/Tinggi, dan Crash Cymbal.'
                        : isEs
                        ? 'En modo Batería, el eje vertical se mapea automáticamente a piezas percusivas: Bombo (Kick), Caja (Snare), Hi-Hat cerrado/abierto, Toms y Platos.'
                        : 'In Drum Mode, the vertical axis automatically maps percussion lanes: Bass Drum (Kick), Snare, Closed/Open Hi-Hats, Toms, Ride, and Crash Cymbals.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CORE CONCEPT 2: Toolbar & Rhythmic Multipliers */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {t.ch8ToolbarTitle}
                  </h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {t.ch8ToolbarDesc}
                </p>

                {/* Rhythm Bases Table */}
                <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-xs border-b border-slate-800">
                        <tr>
                          <th className="p-3">{isId ? 'Simbol' : isEs ? 'Símbolo' : 'Symbol'}</th>
                          <th className="p-3">{isId ? 'Nama Not' : isEs ? 'Nombre de Nota' : 'Note Name'}</th>
                          <th className="p-3">{isId ? 'Nilai Ketukan' : isEs ? 'Valor de Tiempo' : 'Beat Value'}</th>
                          <th className="p-3">{isId ? 'Durasi Ticks (480 PPQ)' : isEs ? 'Duración en Ticks (480 PPQ)' : 'Duration Ticks (480 PPQ)'}</th>
                          <th className="p-3">{isId ? 'Penggunaan Utama' : isEs ? 'Uso Principal' : 'Primary Musical Role'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-400 font-bold text-sm">1/1</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Not Penuh (Whole Note)' : isEs ? 'Redonda' : 'Whole Note'}</td>
                          <td className="p-3 text-slate-200">{L("4.0 Beats", "4.0 Ketukan", "4.0 Tiempos")}</td>
                          <td className="p-3 text-slate-200 font-bold">1,920 Ticks</td>
                          <td className="p-3.5 font-sans text-sm text-slate-300">{isId ? 'Akor pad latar & pedal bass panjang' : isEs ? 'Acordes de fondo y bajos largos' : 'Long sustained background pads and bass drones'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-400 font-bold text-sm">1/2</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Not Setengah (Half Note)' : isEs ? 'Blanca' : 'Half Note'}</td>
                          <td className="p-3 text-slate-200">{L("2.0 Beats", "2.0 Ketukan", "2.0 Tiempos")}</td>
                          <td className="p-3 text-slate-200 font-bold">960 Ticks</td>
                          <td className="p-3.5 font-sans text-sm text-slate-300">{isId ? 'Pola iringan tangan kiri lambat' : isEs ? 'Acompañamiento pausado de mano izquierda' : 'Slow left-hand chord changes'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-400 font-bold text-sm">1/4</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Not Seperempat (Quarter Note)' : isEs ? 'Negra' : 'Quarter Note'}</td>
                          <td className="p-3 text-slate-200">{L("1.0 Beat", "1.0 Ketukan", "1.0 Tiempo")}</td>
                          <td className="p-3 text-slate-200 font-bold">480 Ticks</td>
                          <td className="p-3.5 font-sans text-sm text-slate-300">{isId ? 'Detak denyut utama lagu pop & klasik' : isEs ? 'Pulso rítmico principal' : 'Standard pulse of pop, rock, and classical pieces'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-400 font-bold text-sm">1/8</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Not Seperdelapan (Eighth Note)' : isEs ? 'Corchea' : 'Eighth Note'}</td>
                          <td className="p-3 text-slate-200">{L("0.5 Beat", "0.5 Ketukan", "0.5 Tiempo")}</td>
                          <td className="p-3 text-slate-200 font-bold">240 Ticks</td>
                          <td className="p-3.5 font-sans text-sm text-slate-300">{isId ? 'Melodi lagu berjalan & arpeggio Alberti' : isEs ? 'Melodías fluidas y arpegios' : 'Walking melodies and Alberti bass arpeggios'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-400 font-bold text-sm">1/16</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Not Seperenambelas (Sixteenth Note)' : isEs ? 'Semicorchea' : 'Sixteenth Note'}</td>
                          <td className="p-3 text-slate-200">{L("0.25 Beat", "0.25 Ketukan", "0.25 Tiempo")}</td>
                          <td className="p-3 text-slate-200 font-bold">120 Ticks</td>
                          <td className="p-3.5 font-sans text-sm text-slate-300">{isId ? 'Lari tangga nada cepat & melodi virtuoso' : isEs ? 'Escalas rápidas y adornos' : 'Fast scalar runs and virtuoso passages'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modifiers Pill Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-lg p-3">
                    <span className="text-xs font-mono font-bold text-cyan-300 uppercase block mb-1">
                      NORMAL (1.0×)
                    </span>
                    <p className="text-xs md:text-sm text-slate-400">
                      {isId ? 'Durasi not standar tanpa modifikasi metrik.' : isEs ? 'Duración estándar sin modificación.' : 'Standard duration without metric alteration.'}
                    </p>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-lg p-3">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase block mb-1">
                      DOTTED (1.5×)
                    </span>
                    <p className="text-xs md:text-sm text-slate-400">
                      {isId ? 'Menambahkan 50% durasi (mis. 1/4 bertitik = 720 Ticks).' : isEs ? 'Añade 50% de duración (ej. negra con puntillo = 720 Ticks).' : 'Adds 50% duration (e.g. dotted quarter = 720 Ticks).'}
                    </p>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-lg p-3">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase block mb-1">
                      TRIPLET (2/3×)
                    </span>
                    <p className="text-xs md:text-sm text-slate-400">
                      {isId ? 'Memasukkan 3 not ke dalam ruang 2 not (mis. triplet 1/8 = 160 Ticks).' : isEs ? 'Introduce 3 notas en el espacio de 2 (ej. tresillo de corchea = 160 Ticks).' : 'Packs 3 notes into the space of 2 (e.g. eighth triplet = 160 Ticks).'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CORE CONCEPT 3: Editing Tools & Note Manipulation Operations */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">
                    3
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {isId ? 'Operasi Manipulasi Not di Piano Roll' : isEs ? 'Operaciones de Edición en el Piano Roll' : 'Piano Roll Note Manipulation Operations'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-4 flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{t.ch8ToolSelect}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {t.ch8ToolSelectDesc}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-4 flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{t.ch8ToolDraw}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {t.ch8ToolDrawDesc}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-4 flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{t.ch8ToolResize}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {t.ch8ToolResizeDesc}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-4 flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{t.ch8ToolErase}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {t.ch8ToolEraseDesc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CORE CONCEPT 4: Velocity & Expressive Dynamics */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">
                    4
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {t.ch8VelocityTitle}
                  </h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {t.ch8VelocityDesc}
                </p>

                <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-5 space-y-3">
                  <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    {isId ? 'SKALA DINAMIKA AKUSTIK VELOCITY (0–127)' : isEs ? 'ESCALA DINÁMICA DE VELOCIDAD (0–127)' : 'ACOUSTIC VELOCITY DYNAMIC SPECTRUM (0–127)'}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center justify-between text-cyan-400 font-mono text-xs font-bold">
                        <span>PIANISSIMO</span>
                        <span>1–32</span>
                      </div>
                      <p className="text-xs md:text-sm text-slate-400 mt-1">
                        {isId ? 'Bisikan sangat lembut, ghost notes, harmoni senyap.' : isEs ? 'Muy suave, notas fantasma y fondos tenues.' : 'Very soft, whisper tones and subtle ghost notes.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-cyan-500/30">
                      <div className="flex items-center justify-between text-cyan-400 font-mono text-xs font-bold">
                        <span>PIANO / MP</span>
                        <span>33–64</span>
                      </div>
                      <p className="text-xs md:text-sm text-slate-400 mt-1">
                        {isId ? 'Suara lembut dan terkendali, tekstur iringan tangan kiri.' : isEs ? 'Suave y controlado, acompañamientos de mano izquierda.' : 'Soft and controlled, typical left-hand accompaniment.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-700">
                      <div className="flex items-center justify-between text-cyan-400 font-mono text-xs font-bold">
                        <span>MEZZO-FORTE</span>
                        <span>65–95</span>
                      </div>
                      <p className="text-xs md:text-sm text-slate-400 mt-1">
                        {isId ? 'Tingkat suara melodi bernyanyi standar piano.' : isEs ? 'Nivel melódico estándar, claro y expresivo.' : 'Standard singing melody line and balanced chords.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center justify-between text-slate-300 font-mono text-xs font-bold">
                        <span>FORTE / FF</span>
                        <span>96–127</span>
                      </div>
                      <p className="text-xs md:text-sm text-slate-400 mt-1">
                        {isId ? 'Aksen ketukan birama pertama, pukulan klimaks bertenaga.' : isEs ? 'Acentos de primer tiempo y clímax contundentes.' : 'Downbeat accents, climactic stabs, and heavy strikes.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CORE CONCEPT 5: Left Hand vs Right Hand Separation */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">
                    5
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {t.ch8HandsTitle}
                  </h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {t.ch8HandsDesc}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-cyan-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                        {isId ? 'TANGAN KANAN (RIGHT HAND)' : isEs ? 'MANO DERECHA (RIGHT HAND)' : 'RIGHT HAND (RH)'}
                      </span>
                      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        CYAN / #22D3EE
                      </span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      <li>{isId ? 'Ditempatkan di paranada Treble (Kunci G)' : isEs ? 'Asignada al pentagrama de Clave de Sol' : 'Assigned to the Treble Staff (G Clef)'}</li>
                      <li>{isId ? 'Membimbing model tangan 3D Tangan Kanan' : isEs ? 'Guía la mano 3D derecha en tiempo real' : 'Drives the 3D Right Hand avatar fingering'}</li>
                      <li>{isId ? 'Warna balok jatuh sian pada falling notes' : isEs ? 'Color celeste en notas cayendo' : 'Cyan waterfall bars in falling notes engine'}</li>
                    </ul>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-700 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                        {isId ? 'TANGAN KIRI (LEFT HAND)' : isEs ? 'MANO IZQUIERDA (LEFT HAND)' : 'LEFT HAND (LH)'}
                      </span>
                      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        INDIGO / #818CF8
                      </span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      <li>{isId ? 'Ditempatkan di paranada Bass (Kunci F)' : isEs ? 'Asignada al pentagrama de Clave de Fa' : 'Assigned to the Bass Staff (F Clef)'}</li>
                      <li>{isId ? 'Membimbing model tangan 3D Tangan Kiri' : isEs ? 'Guía la mano 3D izquierda en tiempo real' : 'Drives the 3D Left Hand avatar fingering'}</li>
                      <li>{isId ? 'Warna balok jatuh ungu indigo pada falling notes' : isEs ? 'Color morado índigo en notas cayendo' : 'Indigo waterfall bars in falling notes engine'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* CORE CONCEPT 6: Step-by-Step Practical Tutorials */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">
                    6
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {t.ch8TutorialsTitle}
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Tutorial 1 */}
                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">{isId ? 'TUTORIAL 01' : isEs ? 'TUTORIAL 01' : 'TUTORIAL 01'}</span>
                        <span>{t.ch8Tutorial1Title}</span>
                      </h4>
                      <span className="text-xs font-mono font-medium text-slate-400">{isId ? 'KOMPOSER PEMULA' : isEs ? 'COMPOSITOR PRINCIPIANTE' : 'BEGINNER COMPOSER'}</span>
                    </div>
                    <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                      {t.ch8Tutorial1Desc}
                    </p>
                    <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
                      <li><b>{isId ? 'Langkah 1:' : isEs ? 'Paso 1:' : 'Step 1:'}</b> {isId ? 'Buka Editor MIDI, pilih BPM 128 pada bilah toolbar atas.' : isEs ? 'Abre el editor MIDI y fija el tempo en 128 BPM.' : 'Open the MIDI Editor, set BPM to 128 on the top transport bar.'}</li>
                      <li><b>{isId ? 'Langkah 2:' : isEs ? 'Paso 2:' : 'Step 2:'}</b> {isId ? 'Pilih tombol durasi not utuh [1/1] dan pastikan tangan aktif adalah Tangan Kiri (LH).' : isEs ? 'Selecciona redonda [1/1] y asegúrate de que la mano activa sea la Izquierda (LH).' : 'Select the whole note duration [1/1] and set active hand to Left Hand (LH).'}</li>
                      <li><b>{isId ? 'Langkah 3:' : isEs ? 'Paso 3:' : 'Step 3:'}</b> {isId ? 'Klik di Bar 1 pada nada C3, Bar 2 pada G2, Bar 3 pada A2, dan Bar 4 pada F2. Ini menciptakan fondasi bass lagu!' : isEs ? 'Haz clic en el compás 1 en Do3, compás 2 en Sol2, compás 3 en La2 y compás 4 en Fa2 para crear la base de bajos.' : 'Click Bar 1 on C3, Bar 2 on G2, Bar 3 on A2, and Bar 4 on F2 to establish your root bassline.'}</li>
                      <li><b>{isId ? 'Langkah 4:' : isEs ? 'Paso 4:' : 'Step 4:'}</b> {isId ? 'Ubah tangan aktif ke Tangan Kanan (RH), ganti durasi ke [1/4] (Seperempat).' : isEs ? 'Cambia la mano activa a Derecha (RH) y la duración a [1/4] (Negra).' : 'Switch active hand to Right Hand (RH), change duration to [1/4] (Quarter note).'}</li>
                      <li><b>{isId ? 'Langkah 5:' : isEs ? 'Paso 5:' : 'Step 5:'}</b> {isId ? 'Di Bar 1, klik C4, E4, G4. Di Bar 2, klik G3, B3, D4. Di Bar 3, klik A3, C4, E4. Di Bar 4, klik F3, A3, C4.' : isEs ? 'Introduce las tríadas correspondientes en la mano derecha.' : 'Inscribe the corresponding right-hand triads on each measure.'}</li>
                      <li><b>{isId ? 'Langkah 6:' : isEs ? 'Paso 6:' : 'Step 6:'}</b> {isId ? 'Tekan [Spasi] untuk memutar progresi akor Anda dan nikmati harmoni piano yang hidup!' : isEs ? 'Presiona [Espacio] para reproducir y escuchar tu progresión armónica.' : 'Press [Spacebar] to play back your progression and listen to your newly sequenced composition!'}</li>
                    </ol>
                  </div>

                  {/* Tutorial 2 */}
                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs font-bold">{isId ? 'TUTORIAL 02' : isEs ? 'TUTORIAL 02' : 'TUTORIAL 02'}</span>
                        <span>{t.ch8Tutorial2Title}</span>
                      </h4>
                      <span className="text-xs font-mono font-medium text-slate-400">{isId ? 'PENYEMPURNAAN AUDIO' : isEs ? 'PULIDO DE AUDIO' : 'AUDIO POLISH'}</span>
                    </div>
                    <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                      {t.ch8Tutorial2Desc}
                    </p>
                    <div className="text-xs text-slate-300 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-2">
                      <p>
                        {isId
                          ? 'Kuantisasi (Quantization) adalah proses menyelaraskan not yang dimainkan manusia agar tepat menempel pada garis birama atau pembagian ketukan terdekat.'
                          : isEs
                          ? 'La cuantización alinea las notas tocadas en vivo con la división métrica más cercana para eliminar imprecisiones temporales.'
                          : 'Quantization snaps human note timings to the nearest rhythmic subdivision line, eliminating human timing drift and flams.'}
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-400">
                        <li>{isId ? 'Seret kotak seleksi untuk menandai semua not yang ingin dirapikan.' : isEs ? 'Arrastra una caja de selección para englobar las notas desalineadas.' : 'Box-drag over the drifted notes to select them.'}</li>
                        <li>{isId ? 'Atur pembagian SNAP ke 1/16 atau 1/8 sesuai tempo lagu.' : isEs ? 'Fija el SNAP en 1/16 o 1/8 según el tempo de la canción.' : 'Set SNAP to 1/16 or 1/8 depending on the song rhythm.'}</li>
                        <li>{isId ? 'Geser sedikit not ke kiri atau kanan hingga menempel pas pada garis vertikal kisi.' : isEs ? 'Mueve ligeramente las notas para que encajen en las líneas verticales de la cuadrícula.' : 'Nudge the notes until their heads lock onto the vertical grid lines.'}</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tutorial 3 */}
                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs font-bold">{isId ? 'TUTORIAL 03' : isEs ? 'TUTORIAL 03' : 'TUTORIAL 03'}</span>
                        <span>{t.ch8Tutorial3Title}</span>
                      </h4>
                      <span className="text-xs font-mono font-medium text-slate-400">{isId ? 'KALIBRASI SINKRONISASI' : isEs ? 'CALIBRACIÓN DE SINCRONÍA' : 'SYNC CALIBRATION'}</span>
                    </div>
                    <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                      {t.ch8Tutorial3Desc}
                    </p>
                    <div className="text-xs text-slate-300 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-1">
                      <p>
                        {isId
                          ? 'Gunakan pengaturan Backing Track Offset (ms) jika Anda menggabungkan instrumen piano MIDI dengan file vokal audio MP3/WAV. Jika vokal terdengar terlambat mendahului piano, naikkan offset positif (+50ms hingga +150ms) sampai ketukan drum dan not piano menyatu secara presisi!'
                          : isEs
                          ? 'Ajusta el parámetro Backing Track Offset (ms) si reproduces un MP3 de fondo. Aumenta o disminuye el desfase hasta que las notas MIDI coincidan exactamente con la pista de audio.'
                          : 'Adjust the Backing Track Offset (ms) parameter when pairing MIDI notes with an external MP3 vocal track. Nudge by ±20ms increments until the downbeats align with 100% precision.'}
                      </p>
                    </div>
                  </div>

                  {/* Tutorial 4 */}
                  <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs font-bold">{isId ? 'TUTORIAL 04' : isEs ? 'TUTORIAL 04' : 'TUTORIAL 04'}</span>
                        <span>{t.ch8Tutorial4Title}</span>
                      </h4>
                      <span className="text-xs font-mono font-medium text-slate-400">{isId ? 'EKSPOR & BAGIKAN' : isEs ? 'EXPORTAR Y COMPARTIR' : 'EXPORT & SHARE'}</span>
                    </div>
                    <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                      {t.ch8Tutorial4Desc}
                    </p>
                    <div className="text-xs text-slate-300 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-1">
                      <p>
                        {isId
                          ? 'Klik tombol Ekspor MIDI untuk mengunduh file .mid murni ke komputer Anda. File ini kompatibel secara universal dengan Octavia (cukup drag-and-drop ke menu Lagu Lokal), Synthesia, MuseScore, FL Studio, Ableton Live, dan Logic Pro.'
                          : isEs
                          ? 'Haz clic en Exportar MIDI para guardar el archivo .mid en tu dispositivo. Es 100% compatible con Octavia (en la pestaña de canciones locales), DAWs profesionales y reproductores MIDI.'
                          : 'Click Export MIDI to download a standard .mid file. The file is universally compatible with Octavia (drag-and-drop into the Local Songs tab), Synthesia, MuseScore, Ableton Live, and FL Studio.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CORE CONCEPT 7: Keyboard Shortcuts Cheat Sheet */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">
                    7
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {t.ch8ShortcutsTitle}
                  </h3>
                </div>

                <div className="bg-slate-900/90 border border-slate-800/80 shadow-xl border border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-xs border-b border-slate-800">
                        <tr>
                          <th className="p-3">{isId ? 'Kombinasi Tombol' : isEs ? 'Combinación de Teclas' : 'Key Combination'}</th>
                          <th className="p-3">{isId ? 'Fungsi Pintasan' : isEs ? 'Función del Atajo' : 'Shortcut Function'}</th>
                          <th className="p-3">{isId ? 'Konteks / Efek' : isEs ? 'Contexto / Efecto' : 'Context / Effect'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Space</kbd></td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Play / Pause Timeline' : isEs ? 'Reproducir / Pausar' : 'Play / Pause Timeline'}</td>
                          <td className="p-3.5 font-sans text-sm text-slate-300">{isId ? 'Memulai atau menghentikan pemutaran lagu dari posisi playhead' : isEs ? 'Inicia o detiene la reproducción' : 'Starts or pauses playback from current playhead position'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Delete</kbd> / <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Backspace</kbd></td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Hapus Not Terpilih' : isEs ? 'Eliminar Selección' : 'Delete Selected Notes'}</td>
                          <td className="p-3.5 font-sans text-sm text-slate-300">{isId ? 'Menghapus semua not yang sedang aktif terseleksi' : isEs ? 'Borra todas las notas seleccionadas' : 'Deletes all currently selected note events'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Ctrl</kbd> + <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Z</kbd></td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Batalkan (Undo)' : isEs ? 'Deshacer (Undo)' : 'Undo'}</td>
                          <td className="p-3.5 font-sans text-sm text-slate-300">{isId ? 'Mengembalikan keadaan kanvas sebelum tindakan terakhir' : isEs ? 'Deshace la última acción' : 'Reverts the last note, tempo, or duration edit'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Ctrl</kbd> + <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Y</kbd></td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Ulangi (Redo)' : isEs ? 'Rehacer (Redo)' : 'Redo'}</td>
                          <td className="p-3.5 font-sans text-sm text-slate-300">{isId ? 'Mengulangi tindakan yang sebelumnya di-undo' : isEs ? 'Rehace la acción deshecha' : 'Re-applies the previously undone action'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Shift</kbd> + {isId ? 'Klik / Seret' : isEs ? 'Clic / Arrastrar' : 'Click / Drag'}</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Multi-Seleksi Not' : isEs ? 'Selección Múltiple' : 'Multi-Select Notes'}</td>
                          <td className="p-3.5 font-sans text-sm text-slate-300">{isId ? 'Menambah not baru ke kelompok seleksi tanpa membatalkan seleksi lama' : isEs ? 'Añade notas a la selección' : 'Adds additional notes to current selection group'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">{isId ? 'Panah ↑ / ↓' : isEs ? 'Flechas ↑ / ↓' : 'Arrows ↑ / ↓'}</kbd></td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Transposisi Semitone' : isEs ? 'Transponer Semitono' : 'Pitch Transposition'}</td>
                          <td className="p-3.5 font-sans text-sm text-slate-300">{isId ? 'Menaikkan atau menurunkan nada not terpilih sebesar 1 semitone' : isEs ? 'Sube o baja el tono un semitono' : 'Shifts selected notes up or down by 1 semitone'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* INTERACTIVE CALL-TO-ACTION CARD */}
              <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/40 rounded-xl p-6 text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mx-auto flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                    <path d="M3 9h18M3 15h18M9 3v18" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="14" cy="6" r="1" fill="currentColor" />
                    <circle cx="18" cy="12" r="1" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-white tracking-tight">
                    {isId ? 'Siap Mencoba Menyusun Lagu Pertama Anda?' : isEs ? '¿Listo para Crear tu Primera Canción?' : 'Ready to Sequence Your First Song?'}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 max-w-xl mx-auto mt-1 leading-relaxed">
                    {isId
                      ? 'Buka editor MIDI Octavia sekarang untuk mengaplikasikan ilmu piano roll, menyusun progresi akor, dan mengekspor file MIDI Anda sendiri!'
                      : isEs
                      ? 'Abre el editor MIDI de Octavia ahora para aplicar lo aprendido sobre piano roll, componer progresiones y exportar tus canciones.'
                      : 'Launch the Octavia MIDI Editor right now to put your piano roll skills into practice, build chord progressions, and export your custom creations!'}
                  </p>
                </div>
                {onOpenMidiEditor && (
                  <button
                    type="button"
                    onClick={onOpenMidiEditor}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-900/40 border border-cyan-300/40 active:scale-95 inline-flex items-center gap-2.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>{t.ch8LaunchEditor}</span>
                  </button>
                )}
              </div>
            </article>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 9: Video Masterclasses & Study Guide (Last Chapter) */}
          {/* ========================================================================= */}
          {activeChapter === 'videos' && (
            <article className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
              <div className="border-b border-slate-800 pb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs md:text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    {isId ? 'MODUL 09 • REFERENSI VIDEO MASTERCLASS & INTISARI STUDI' : isEs ? 'MÓDULO 09 • VIDEOTECA Y GUÍA DE ESTUDIO' : 'MODULE 09 • VIDEO REFERENCE LIBRARY & STUDY NOTES'}
                  </span>
                  <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700">
                    {TUTORIAL_VIDEOS.length} CURATED LECTURES
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  {t.ch7Title}
                </h2>
                <p className="text-sm md:text-[15px] text-slate-200 mt-3 leading-relaxed max-w-4xl">
                  {t.ch7Desc}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {TUTORIAL_VIDEOS.map((video) => {
                  const takeaways = isId ? video.keyTakeawaysId : isEs ? (video.keyTakeawaysEs || video.keyTakeaways) : video.keyTakeaways;
                  return (
                    <div
                      key={video.id}
                      className="bg-slate-900/90 border border-slate-800/80 shadow-xl rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors flex flex-col justify-between group"
                    >
                      <div>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block aspect-video overflow-hidden bg-slate-950"
                        >
                          <img
                            src={`https://img.youtube.com/vi/${video.ytId}/mqdefault.jpg`}
                            alt={isId ? video.titleId : isEs ? (video.titleEs || video.title) : video.title}
                            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-9 rounded-lg bg-slate-950/90 border border-slate-700 group-hover:border-cyan-400 flex items-center justify-center text-white text-sm transition-colors">
                              <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                            </div>
                          </div>
                          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs font-mono font-medium font-semibold text-slate-200">
                            <span className="px-2 py-0.5 rounded bg-slate-950/90 border border-slate-800">
                              {video.tag}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-900/90 text-cyan-300 border border-slate-800">
                              {video.duration}
                            </span>
                          </div>
                        </a>

                        <div className="p-5 space-y-3">
                          <div className="text-xs font-mono font-medium font-bold text-cyan-400 uppercase tracking-widest">
                            {isId ? (video.categoryId || video.category) : isEs ? (video.categoryEs || video.category) : video.category}
                          </div>
                          <h3 className="text-base font-bold text-white leading-snug">
                            {isId ? video.titleId : isEs ? (video.titleEs || video.title) : video.title}
                          </h3>
                          <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed">
                            {isId ? video.descriptionId : isEs ? (video.descriptionEs || video.description) : video.description}
                          </p>
                          <div className="pt-2 border-t border-slate-800/80 space-y-1">
                            <div className="text-xs font-mono font-medium text-slate-400 uppercase font-bold">
                              {isId ? 'Intisari Materi:' : isEs ? 'Puntos Clave del Estudio:' : 'Key Study Takeaways:'}
                            </div>
                            <ul className="text-xs md:text-sm text-slate-400 space-y-1">
                              {takeaways.map((tk, i) => (
                                <li key={i}>• {tk}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveChapter(video.chapterTarget)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors flex items-center gap-1.5"
                        >
                          <span>{t.ch7ReadChapter}</span>
                          <span>→</span>
                        </button>

                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <span>{t.ch7WatchYoutube}</span>
                          <span>↗</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          )}

          {/* Universal Sequential Curriculum Footer ("Navigasi Beruntun") */}
          <div className="max-w-5xl mx-auto mt-12 pt-8 border-t border-slate-800/90">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 p-5 md:p-6 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {prevChapter ? (
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(prevChapter.id)}
                    className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs md:text-sm transition-all border border-slate-700 flex items-center gap-3 shadow-md active:scale-95 group cursor-pointer"
                  >
                    <span className="text-cyan-400 group-hover:-translate-x-1 transition-transform text-base">←</span>
                    <div className="text-left">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">{t.prevChapter}</div>
                      <div className="text-xs md:text-sm font-semibold truncate max-w-[150px] md:max-w-[200px]">{prevChapter.label}</div>
                    </div>
                  </button>
                ) : (
                  <div className="px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] font-mono text-slate-500 italic">
                    {isId ? '• Awal Kurikulum •' : isEs ? '• Inicio del Curso •' : '• Curriculum Beginning •'}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center text-center py-2 md:py-0">
                <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                  <span>{t.stepIndicator(currentIndex + 1, chapters.length)}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                    {progressPct}%
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-medium mt-1">
                  {currentChapter.label}
                </div>
                {/* Stepper Dots */}
                <div className="flex items-center gap-1.5 mt-2.5">
                  {chapters.map((ch, idx) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleSelectChapter(ch.id)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentIndex
                          ? 'w-7 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                          : idx < currentIndex
                          ? 'w-2 bg-cyan-400 hover:bg-cyan-300'
                          : 'w-2 bg-slate-700 hover:bg-slate-600'
                      }`}
                      title={`${ch.num}: ${ch.label}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end">
                {nextChapter ? (
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(nextChapter.id)}
                    className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold text-xs md:text-sm transition-all shadow-lg shadow-cyan-900/30 flex items-center justify-between md:justify-start gap-3 active:scale-95 group border border-cyan-400/30 cursor-pointer"
                  >
                    <div className="text-left md:text-right">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-cyan-100">{t.nextChapter}</div>
                      <div className="text-xs md:text-sm font-semibold truncate max-w-[150px] md:max-w-[200px]">{nextChapter.label}</div>
                    </div>
                    <span className="text-white group-hover:translate-x-1 transition-transform text-base">→</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={isModal ? onCloseModal : onBackToMainMenu}
                    className="w-full md:w-auto px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs md:text-sm transition-all shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 active:scale-95 border border-cyan-400/30 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t.finishCurriculum}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
export default LearnArticleView;

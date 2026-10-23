import React, { useState, useEffect } from 'react';
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

export type ChapterId = 'sheet' | 'falling' | 'fingering' | 'roblox' | 'theory' | 'exercises' | 'videos' | 'midieditor';

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

  const isId = appLanguage === 'id';
  const isEs = appLanguage === 'es';
  const t = getLearnTranslations(appLanguage);

  const chapters: { id: ChapterId; num: string; label: string; sub: string; badge: string }[] = isId ? [
    { id: 'sheet', num: '01', label: 'Notasi Balok & Grand Staff', sub: 'Paranada, Kunci, Ritme & Ornamen', badge: 'NOTASI' },
    { id: 'falling', num: '02', label: 'Falling Notes & Mode Tunggu', sub: 'Piano Roll, Kalibrasi & Pedaling', badge: 'ENGINE' },
    { id: 'fingering', num: '03', label: 'Biomekanika & Penomoran Jari', sub: 'Postur, Thumb-Under & Tabel 12 Kunci', badge: 'TEKNIK' },
    { id: 'roblox', num: '04', label: 'Keyboard PC & Virtual Piano', sub: 'Peta 61-Tuts MIRP, Compact & NKRO', badge: 'QWERTY' },
    { id: 'theory', num: '05', label: 'Teori Harmoni & Voice Leading', sub: 'Interval, Inversi, Modus & Lingkaran Kuint', badge: 'TEORI' },
    { id: 'exercises', num: '06', label: 'Drill Teknis & Kurikulum Latihan', sub: 'Generator Latihan 12 Kunci & Etude', badge: 'PRAKTIK' },
    { id: 'videos', num: '07', label: 'Referensi Video & Studi Kasus', sub: 'Kurasi Masterclass & Intisari Materi', badge: 'VIDEO' },
    { id: 'midieditor', num: '08', label: 'Editor MIDI & Sekuenser', sub: 'Piano Roll, Kuantisasi & Velocity', badge: 'PRODUKSI' },
  ] : isEs ? [
    { id: 'sheet', num: '01', label: 'Partituras y Gran Pentagrama', sub: 'Claves, Ritmo, Articulación y Ornamentos', badge: 'NOTACIÓN' },
    { id: 'falling', num: '02', label: 'Notas Cayendo y Modo Espera', sub: 'Piano Roll, Sincronización y Pedal', badge: 'MOTOR' },
    { id: 'fingering', num: '03', label: 'Biomecánica y Digitación', sub: 'Postura, Paso de Pulgar y 12 Tonalidades', badge: 'TÉCNICA' },
    { id: 'roblox', num: '04', label: 'Teclado PC y Piano Virtual', sub: 'Mapa MIRP de 61 Teclas, Compact y NKRO', badge: 'QWERTY' },
    { id: 'theory', num: '05', label: 'Teoría Armónica y Conducción', sub: 'Intervalos, Inversiones, Modos y Quintas', badge: 'TEORÍA' },
    { id: 'exercises', num: '06', label: 'Ejercicios Técnicos y Rutina', sub: 'Generador en 12 Tonalidades y Estudios', badge: 'PRÁCTICA' },
    { id: 'videos', num: '07', label: 'Videoteca y Guía de Estudio', sub: 'Clases Magistrales y Puntos Clave', badge: 'VIDEO' },
    { id: 'midieditor', num: '08', label: 'Editor MIDI y Secuenciador', sub: 'Piano Roll, Cuantización y Velocidad', badge: 'PRODUCCIÓN' },
  ] : [
    { id: 'sheet', num: '01', label: 'Sheet Music & Grand Staff', sub: 'Clefs, Rhythm, Ornaments & Form', badge: 'NOTATION' },
    { id: 'falling', num: '02', label: 'Falling Notes & Wait Mode', sub: 'Piano Roll, Sync Calibration & Pedaling', badge: 'ENGINE' },
    { id: 'fingering', num: '03', label: 'Biomechanics & Fingering', sub: 'Posture, Thumb-Under & 12-Key Tables', badge: 'TECHNIQUE' },
    { id: 'roblox', num: '04', label: 'PC Keyboard & Virtual Piano', sub: '61-Key MIRP Map, Compact & NKRO', badge: 'QWERTY' },
    { id: 'theory', num: '05', label: 'Harmonic Theory & Voicing', sub: 'Intervals, Inversions, Modes & 5ths', badge: 'THEORY' },
    { id: 'exercises', num: '06', label: 'Technical Drills & Etudes', sub: '12-Key Drill Generator & Daily Routine', badge: 'DRILLS' },
    { id: 'videos', num: '07', label: 'Video Reference Library', sub: 'Curated Masterclasses & Study Notes', badge: 'VIDEO' },
    { id: 'midieditor', num: '08', label: 'MIDI Editor & Sequencer', sub: 'Piano Roll, Quantization & Velocity', badge: 'PRODUCTION' },
  ];

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
      <header className="px-5 py-3 border-b border-slate-800/90 bg-[#090d16] flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3.5">
          {!isModal ? (
            <button
              onClick={onBackToMainMenu}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-2 border border-slate-800"
              title="Return to Main Menu"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t.backToMenu}</span>
            </button>
          ) : (
            <button
              onClick={onCloseModal}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-800"
              title="Close modal"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{t.close}</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold tracking-tighter">
              OCT
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-sm md:text-base font-bold tracking-tight text-slate-100 uppercase">
                  Octavia Conservatory &amp; Technical Manual
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {isId
                  ? 'Referensi komprehensif notasi balok, biomekanika jari deterministik, pemetaan QWERTY 61-tuts, dan teori harmoni.'
                  : isEs
                  ? 'Referencia técnica de notación musical, biomecánica determinista, mapeo QWERTY de 61 teclas y armonía.'
                  : 'Comprehensive technical reference for staff notation, deterministic finger biomechanics, 61-key QWERTY mapping, and harmony.'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content Area */}
      <div className="flex-grow flex flex-col md:flex-row min-h-0 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Navigation Sidebar */}
        <nav
          className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800/90 p-3 pb-4 md:pb-12 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto flex-shrink-0 custom-scrollbar"
          style={{ backgroundColor: '#090d16' }}
        >
          <div className="hidden md:flex items-center justify-between px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800/60 mb-1">
            <span>{isId ? 'MODUL KURIKULUM' : isEs ? 'MÓDULOS DEL CURSO' : 'CURRICULUM MODULES'}</span>
            <span>01–08</span>
          </div>
          {chapters.map((ch) => {
            const isActive = activeChapter === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start justify-between gap-2.5 whitespace-nowrap md:whitespace-normal ${
                  isActive
                    ? 'bg-slate-900 text-white border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5">
                    <ChapterIcon id={ch.id} active={isActive} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono text-[10px] font-bold ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {ch.num}
                      </span>
                      <span className="text-xs font-semibold truncate">{ch.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate hidden md:block mt-0.5">
                      {ch.sub}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
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
          className="flex-grow overflow-y-auto p-5 md:p-8 pb-20 md:pb-28 custom-scrollbar space-y-8 min-h-0"
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
                    <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 01 • ARSITEKTUR NOTASI MUSIK' : isEs ? 'MÓDULO 01 • ARQUITECTURA DE NOTACIÓN' : 'MODULE 01 • NOTATION ARCHITECTURE'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      5 SECTIONS • 5 TECHNICAL DIAGRAMS
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {isId
                      ? 'Membaca Notasi Balok Piano: Grand Staff, Interval &Subdivisi Ritme'
                      : isEs
                      ? 'Lectura de Partituras: Gran Pentagrama, Intervalos y Subdivisión Rítmica'
                      : 'Reading Piano Sheet Music: Grand Staff, Intervallic Sight-Reading & Rhythm'}
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-3xl">
                    {isId
                      ? 'Notasi balok adalah sistem koordinat dua dimensi: sumbu vertikal memetakan frekuensi tinggi-rendah nada (pitch) pada 88 tuts piano, sedangkan sumbu horizontal memetakan durasi waktu proporsional terhadap denyut ketukan (pulse).'
                      : isEs
                      ? 'La partitura es un sistema de coordenadas bidimensional: el eje vertical mapea la altura tonal (pitch) en las 88 teclas, mientras que el eje horizontal representa el tiempo proporcional al pulso.'
                      : 'Standard sheet music operates as a two-dimensional coordinate graph: the vertical axis maps exact pitch frequencies across the 88-keybed, while the horizontal axis maps proportional time subdivisions against a steady metric pulse.'}
                  </p>
                </div>
                {onLaunchInGamePractice && (
                  <button
                    type="button"
                    onClick={() => onLaunchInGamePractice('scale_c', 'sheet')}
                    className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center gap-2 flex-shrink-0 shadow-sm"
                  >
                    <span>{isId ? 'Praktik Langsung di Partitur' : isEs ? 'Practicar en Partitura' : 'Launch Sheet Music Practice'}</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              {/* FIG 1.1: Grand Staff & 5-C Landmark Blueprint */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 1.1 — GRAND STAFF &amp; THE 5-C LANDMARK COORDINATE SYSTEM
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Peta Geometri Paranada Ganda (Treble G4, Middle C4, Bass F3 & Garis Bantu C2–C6)'
                        : 'Grand Staff Geometric Blueprint (Treble G4, Middle C4, Bass F3 & C2–C6 Ledger Anchors)'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    MIDI 36 (C2) — MIDI 84 (C6)
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 320" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="320" rx="8" fill="#070a12" stroke="#1e293b" strokeWidth="1" />

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
                    <text x="20" y="82" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">TREBLE</text>
                    <text x="20" y="94" fill="#64748b" fontSize="8.5" fontFamily="monospace">RH (G4)</text>

                    <text x="78" y="218" fill="#818cf8" fontSize="38" fontFamily="serif">𝄢</text>
                    <circle cx="105" cy="198" r="3.5" fill="#818cf8" />
                    <text x="20" y="206" fill="#818cf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">BASS</text>
                    <text x="20" y="218" fill="#64748b" fontSize="8.5" fontFamily="monospace">LH (F3)</text>

                    {/* LANDMARK 1: Low C2 (2 ledger lines below Bass, y=268) */}
                    <g transform="translate(150, 268)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#818cf8" transform="rotate(-18)" />
                      <line x1="6.5" y1="0" x2="6.5" y2="-36" stroke="#818cf8" strokeWidth="1.5" />
                      <rect x="-28" y="12" width="56" height="18" rx="3" fill="#0f172a" stroke="#6366f1" strokeWidth="1" />
                      <text x="0" y="24" textAnchor="middle" fill="#a5b4fc" fontSize="9.5" fontFamily="monospace" fontWeight="bold">Low C2</text>
                    </g>

                    {/* LANDMARK 2: G2 to E3 Bass Scale Nodes */}
                    <g transform="translate(230, 240)">
                      <ellipse cx="0" cy="0" rx="6.5" ry="5" fill="#475569" transform="rotate(-18)" />
                      <text x="0" y="18" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">G2 (L1)</text>
                    </g>

                    {/* LANDMARK 3: Bass C3 (Space 2 of Bass Staff, y=219) */}
                    <g transform="translate(310, 219)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#818cf8" transform="rotate(-18)" />
                      <line x1="6.5" y1="0" x2="6.5" y2="-34" stroke="#818cf8" strokeWidth="1.5" />
                      <rect x="-28" y="16" width="56" height="18" rx="3" fill="#0f172a" stroke="#6366f1" strokeWidth="1" />
                      <text x="0" y="28" textAnchor="middle" fill="#a5b4fc" fontSize="9.5" fontFamily="monospace" fontWeight="bold">Bass C3</text>
                    </g>

                    {/* LANDMARK 4: Bass Clef F3 Anchor (Line 4 of Bass Staff, y=198) */}
                    <g transform="translate(390, 198)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#a855f7" transform="rotate(-18)" />
                      <line x1="-6.5" y1="0" x2="-6.5" y2="34" stroke="#a855f7" strokeWidth="1.5" />
                      <text x="0" y="-12" textAnchor="middle" fill="#d8b4fe" fontSize="9.5" fontFamily="monospace" fontWeight="bold">F3 (Clef Line)</text>
                    </g>

                    {/* LANDMARK 5: Middle C4 (Center Ledger Line, y=148) */}
                    <g transform="translate(470, 148)">
                      <line x1="-18" y1="0" x2="18" y2="0" stroke="#f59e0b" strokeWidth="2.2" />
                      <ellipse cx="0" cy="0" rx="8" ry="6" fill="#f59e0b" transform="rotate(-18)" />
                      <line x1="7" y1="0" x2="7" y2="-34" stroke="#f59e0b" strokeWidth="1.6" />
                      <rect x="-42" y="11" width="84" height="20" rx="4" fill="#451a03" stroke="#f59e0b" strokeWidth="1.2" />
                      <text x="0" y="24" textAnchor="middle" fill="#fde68a" fontSize="10" fontFamily="monospace" fontWeight="bold">MIDDLE C4 (60)</text>
                    </g>

                    {/* LANDMARK 6: Treble Clef G4 Anchor (Line 2 of Treble Staff, y=98) */}
                    <g transform="translate(550, 98)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#06b6d4" transform="rotate(-18)" />
                      <line x1="6.5" y1="0" x2="6.5" y2="-34" stroke="#06b6d4" strokeWidth="1.5" />
                      <text x="0" y="27" textAnchor="middle" fill="#67e8f9" fontSize="9.5" fontFamily="monospace" fontWeight="bold">G4 (Clef Line)</text>
                    </g>

                    {/* LANDMARK 7: Treble C5 (Space 3 of Treble Staff, y=77) */}
                    <g transform="translate(630, 77)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#38bdf8" transform="rotate(-18)" />
                      <line x1="-6.5" y1="0" x2="-6.5" y2="34" stroke="#38bdf8" strokeWidth="1.5" />
                      <rect x="-32" y="-30" width="64" height="18" rx="3" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1" />
                      <text x="0" y="-18" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontFamily="monospace" fontWeight="bold">Treble C5</text>
                    </g>

                    {/* LANDMARK 8: Top Line F5 (Line 5 of Treble Staff, y=56) */}
                    <g transform="translate(710, 56)">
                      <ellipse cx="0" cy="0" rx="6.5" ry="5" fill="#475569" transform="rotate(-18)" />
                      <text x="0" y="-12" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">F5 (L5)</text>
                    </g>

                    {/* LANDMARK 9: High C6 (2 Ledger Lines above Treble, y=28) */}
                    <g transform="translate(790, 28)">
                      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill="#38bdf8" transform="rotate(-18)" />
                      <line x1="-6.5" y1="0" x2="-6.5" y2="36" stroke="#38bdf8" strokeWidth="1.5" />
                      <rect x="-28" y="-24" width="56" height="16" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                      <text x="0" y="-13" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontFamily="monospace" fontWeight="bold">High C6</text>
                    </g>

                    {/* Mirror Symmetry Annotation */}
                    <text x="450" y="306" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">
                      SYMMETRY RULE: Middle C4 sits at the exact geometric center • Bass C3 is Space 2 from bottom • Treble C5 is Space 2 from top • Low C2 &amp; High C6 each use 2 outer ledger lines
                    </text>
                  </svg>
                </div>

                {/* Landmark & Intervallic Reading Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400">01. TREBLE CLEF (G4)</span>
                      <span className="text-[10px] font-mono text-slate-400">RIGHT HAND</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Spiral dalam Kunci G melingkari Garis ke-2 dari bawah (nada G4 / 392 Hz). Lima garis dari bawah ke atas: E4 – G4 – B4 – D5 – F5. Empat spasi: F4 – A4 – C5 – E5.'
                        : 'The inner spiral of the G-clef wraps around Line 2 from the bottom, fixing it as G4 (392 Hz). Lines bottom-to-top: E4–G4–B4–D5–F5. Spaces: F4–A4–C5–E5.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400">02. BASS CLEF (F3)</span>
                      <span className="text-[10px] font-mono text-slate-400">LEFT HAND</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Dua titik Kunci F mengapit Garis ke-4 dari bawah (nada F3 / 174.6 Hz). Lima garis dari bawah ke atas: G2 – B2 – D3 – F3 – A3. Empat spasi: A2 – C3 – E3 – G3.'
                        : 'The two dots of the F-clef straddle Line 4 from the bottom, fixing it as F3 (174.6 Hz). Lines bottom-to-top: G2–B2–D3–F3–A3. Spaces: A2–C3–E3–G3.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400">03. MIRROR SYMMETRY</span>
                      <span className="text-[10px] font-mono text-slate-400">5-C SYSTEM</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Jangan menghafal garis secara terpisah: Grand Staff bersifat simetris cermin terhadap Middle C4. C5 berada di spasi ke-2 dari atas Treble; C3 berada di spasi ke-2 dari bawah Bass.'
                        : 'The Grand Staff is mirror-symmetric around Middle C4: Treble C5 sits in the 2nd space from the top, while Bass C3 sits in the 2nd space from the bottom.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* FIG 1.2: Intervallic Sight-Reading & Staff-to-Keyboard Projection */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                      FIG 1.2 — INTERVALLIC SIGHT-READING &amp; KEYBED PROJECTION
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Membaca Jarak Interval (Step vs. Skip) & Pemetaan Langsung ke Tuts Fisik'
                        : 'Reading Harmonic & Melodic Intervals (Steps vs. Skips) Mapped to Physical Keys'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-500/30">
                    PRO SIGHT-READING METHOD
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {isId
                    ? 'Pianis mahir tidak membaca partitur dengan mengeja nama huruf satu per satu ("C - E - G"). Mereka mengenali satu nada jangkar lalu membaca bentuk geometris interval: perpindahan Garis-ke-Spasi adalah langkah 2nd (lewati 0 tuts putih), sedangkan Garis-ke-Garis atau Spasi-ke-Spasi adalah lompatan 3rd (lewati 1 tuts putih).'
                    : 'Fluent sight-readers do not spell every note letter individually. They identify one anchor note and read geometric shapes: a Line-to-Space move is always a 2nd (adjacent white key), while a Line-to-Line or Space-to-Space move is always a 3rd (skip one white key).'}
                </p>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 300" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="300" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Left Panel: Interval Geometry on Staff */}
                    <g transform="translate(20, 18)">
                      <rect width="460" height="264" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        A. GEOMETRIC INTERVAL SHAPES ON STAFF
                      </text>

                      {/* 5 Staff lines */}
                      {[55, 73, 91, 109, 127].map((y, idx) => (
                        <line key={idx} x1="20" y1={y} x2="440" y2={y} stroke="#334155" strokeWidth="1.5" />
                      ))}

                      {/* 2nd: Line to Space (E4 to F4) */}
                      <g transform="translate(55, 0)">
                        <ellipse cx="0" cy="127" rx="7" ry="5.2" fill="#38bdf8" transform="rotate(-15 0 127)" />
                        <ellipse cx="13" cy="118" rx="7" ry="5.2" fill="#38bdf8" transform="rotate(-15 13 118)" />
                        <text x="6" y="155" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">2nd (Step)</text>
                        <text x="6" y="170" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Line → Space</text>
                        <text x="6" y="183" textAnchor="middle" fill="#64748b" fontSize="8">Next Finger (+1)</text>
                      </g>

                      {/* 3rd: Line to Line (E4 + G4) */}
                      <g transform="translate(145, 0)">
                        <ellipse cx="0" cy="127" rx="7" ry="5.2" fill="#10b981" transform="rotate(-15 0 127)" />
                        <ellipse cx="0" cy="109" rx="7" ry="5.2" fill="#10b981" transform="rotate(-15 0 109)" />
                        <text x="0" y="155" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">3rd (Skip)</text>
                        <text x="0" y="170" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Line → Line</text>
                        <text x="0" y="183" textAnchor="middle" fill="#64748b" fontSize="8">Skip 1 Finger (1–3)</text>
                      </g>

                      {/* 4th: Line to Space (E4 + A4) */}
                      <g transform="translate(235, 0)">
                        <ellipse cx="0" cy="127" rx="7" ry="5.2" fill="#f59e0b" transform="rotate(-15 0 127)" />
                        <ellipse cx="0" cy="100" rx="7" ry="5.2" fill="#f59e0b" transform="rotate(-15 0 100)" />
                        <text x="0" y="155" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">4th</text>
                        <text x="0" y="170" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Line → Space</text>
                        <text x="0" y="183" textAnchor="middle" fill="#64748b" fontSize="8">Fingers 1–4</text>
                      </g>

                      {/* 5th: Line to Line (E4 + B4) */}
                      <g transform="translate(320, 0)">
                        <ellipse cx="0" cy="127" rx="7" ry="5.2" fill="#a855f7" transform="rotate(-15 0 127)" />
                        <ellipse cx="0" cy="91" rx="7" ry="5.2" fill="#a855f7" transform="rotate(-15 0 91)" />
                        <text x="0" y="155" textAnchor="middle" fill="#a855f7" fontSize="10" fontFamily="monospace" fontWeight="bold">5th</text>
                        <text x="0" y="170" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Line → Line (+2)</text>
                        <text x="0" y="183" textAnchor="middle" fill="#64748b" fontSize="8">Fingers 1–5</text>
                      </g>

                      {/* Octave: Line to Space (E4 + E5) */}
                      <g transform="translate(405, 0)">
                        <ellipse cx="0" cy="127" rx="7" ry="5.2" fill="#f43f5e" transform="rotate(-15 0 127)" />
                        <ellipse cx="0" cy="64" rx="7" ry="5.2" fill="#f43f5e" transform="rotate(-15 0 64)" />
                        <text x="0" y="155" textAnchor="middle" fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold">8ve (Octave)</text>
                        <text x="0" y="170" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Line → Space</text>
                        <text x="0" y="183" textAnchor="middle" fill="#64748b" fontSize="8">Span 1–5 (12 st)</text>
                      </g>

                      {/* Bottom Rule Summary Box */}
                      <rect x="16" y="200" width="428" height="50" rx="4" fill="#0f172a" stroke="#1e293b" />
                      <text x="28" y="220" fill="#e2e8f0" fontSize="9.5" fontWeight="bold">
                        ODD INTERVALS (3rd, 5th, 7th) = Same Parity (Line-to-Line or Space-to-Space)
                      </text>
                      <text x="28" y="238" fill="#94a3b8" fontSize="9.5">
                        EVEN INTERVALS (2nd, 4th, 6th, Octave) = Mixed Parity (Line-to-Space or Space-to-Line)
                      </text>
                    </g>

                    {/* Right Panel: Physical 2-Black & 3-Black Landmark Topography */}
                    <g transform="translate(496, 18)">
                      <rect width="344" height="264" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        B. TACTILE KEYBED TOPOGRAPHY (C &amp; F ANCHORS)
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
                                fontSize="9.5"
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
                        <text x="56" y="-5" textAnchor="middle" fill="#fde68a" fontSize="7.5" fontFamily="monospace" fontWeight="bold">2 BLACK KEYS → C</text>

                        {/* Triple Black Keys (F#4, G#4, A#4) */}
                        <rect x="139" y="0" width="24" height="88" rx="2" fill="#020617" stroke="#38bdf8" strokeWidth="1.2" />
                        <rect x="177" y="0" width="24" height="88" rx="2" fill="#020617" stroke="#38bdf8" strokeWidth="1.2" />
                        <rect x="215" y="0" width="24" height="88" rx="2" fill="#020617" stroke="#38bdf8" strokeWidth="1.2" />
                        <rect x="134" y="-14" width="110" height="12" rx="2" fill="#082f49" />
                        <text x="189" y="-5" textAnchor="middle" fill="#7dd3fc" fontSize="7.5" fontFamily="monospace" fontWeight="bold">3 BLACK KEYS → F</text>
                      </g>

                      <rect x="16" y="200" width="312" height="50" rx="4" fill="#0f172a" stroke="#1e293b" />
                      <text x="26" y="219" fill="#fde68a" fontSize="9" fontWeight="bold">
                        • White key immediately LEFT of 2 Black Keys = ALWAYS C
                      </text>
                      <text x="26" y="236" fill="#7dd3fc" fontSize="9" fontWeight="bold">
                        • White key immediately LEFT of 3 Black Keys = ALWAYS F
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 1.3: Complete Rhythm & Rest Subdivision Blueprint + Dotted & Triplet Math */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                      FIG 1.3 — RHYTHM SUBDIVISION TREE, REST EQUIVALENTS &amp; DOTTED / TUPLET MATH
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Hierarki Nilai Not, Tanda Istirahat (Rest), Rumus Titik (1.5×) & Triplet (3:2)'
                        : 'Binary Note Subdivision, Rest Symbols, Augmentation Dots (1.5×) & Triplet Ratio (3:2)'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    4/4 COMMON TIME REFERENCE
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 310" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="310" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* LEFT SIDE: Binary Subdivision Pyramid (x: 20..520) */}
                    <g transform="translate(20, 16)">
                      <rect width="500" height="278" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        A. BINARY SUBDIVISION PYRAMID (1 BAR IN 4/4 = 4 QUARTER BEATS)
                      </text>

                      {/* Row 1: Whole Note (4 beats) */}
                      <rect x="20" y="34" width="460" height="36" rx="4" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.2" />
                      <ellipse cx="165" cy="52" rx="8" ry="5.5" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
                      <text x="255" y="56" textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="monospace" fontWeight="bold">
                        WHOLE NOTE (Semibreve) = 4 Beats
                      </text>
                      {/* Whole Rest symbol (hangs below line 4) */}
                      <line x1="395" y1="46" x2="435" y2="46" stroke="#64748b" strokeWidth="1.5" />
                      <rect x="407" y="46" width="16" height="6" fill="#38bdf8" />
                      <text x="455" y="55" textAnchor="middle" fill="#64748b" fontSize="8.5" fontFamily="monospace">Rest</text>

                      {/* Row 2: 2 Half Notes (2 beats each) */}
                      {[0, 1].map((i) => (
                        <g key={`hn-${i}`} transform={`translate(${20 + i * 234}, 82)`}>
                          <rect width="226" height="36" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                          <ellipse cx="28" cy="22" rx="6.5" ry="4.5" fill="none" stroke="#38bdf8" strokeWidth="2" transform="rotate(-15 28 22)" />
                          <line x1="34" y1="22" x2="34" y2="6" stroke="#38bdf8" strokeWidth="1.6" />
                          <text x="108" y="22" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            HALF NOTE = 2 Beats
                          </text>
                          {/* Half Rest sits on top of line 3 */}
                          <line x1="184" y1="22" x2="214" y2="22" stroke="#64748b" strokeWidth="1.5" />
                          <rect x="192" y="16" width="14" height="6" fill="#94a3b8" />
                        </g>
                      ))}

                      {/* Row 3: 4 Quarter Notes (1 beat each) */}
                      {[0, 1, 2, 3].map((i) => (
                        <g key={`qn-${i}`} transform={`translate(${20 + i * 117}, 130)`}>
                          <rect width="109" height="38" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                          <ellipse cx="20" cy="24" rx="6" ry="4.2" fill="#818cf8" transform="rotate(-15 20 24)" />
                          <line x1="25.5" y1="24" x2="25.5" y2="7" stroke="#818cf8" strokeWidth="1.6" />
                          <text x="66" y="19" textAnchor="middle" fill="#e2e8f0" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                            QUARTER
                          </text>
                          <text x="66" y="31" textAnchor="middle" fill="#818cf8" fontSize="8.5" fontFamily="monospace">
                            1 Beat (♩)
                          </text>
                        </g>
                      ))}

                      {/* Row 4: 8 Eighth Notes (1/2 beat each) */}
                      {[0, 1, 2, 3].map((i) => (
                        <g key={`en-${i}`} transform={`translate(${20 + i * 117}, 180)`}>
                          <rect width="109" height="38" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                          {/* Beamed Pair */}
                          <ellipse cx="22" cy="27" rx="5" ry="3.6" fill="#10b981" transform="rotate(-15 22 27)" />
                          <ellipse cx="44" cy="27" rx="5" ry="3.6" fill="#10b981" transform="rotate(-15 44 27)" />
                          <line x1="26.5" y1="27" x2="26.5" y2="10" stroke="#10b981" strokeWidth="1.5" />
                          <line x1="48.5" y1="27" x2="48.5" y2="10" stroke="#10b981" strokeWidth="1.5" />
                          <line x1="26" y1="10" x2="49" y2="10" stroke="#10b981" strokeWidth="3" />
                          <text x="80" y="20" textAnchor="middle" fill="#a7f3d0" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                            2 × 1/2
                          </text>
                          <text x="80" y="31" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">
                            {i + 1} &amp;
                          </text>
                        </g>
                      ))}

                      {/* Row 5: 16 Sixteenth Notes (1/4 beat each) */}
                      {[0, 1, 2, 3].map((i) => (
                        <g key={`sn-${i}`} transform={`translate(${20 + i * 117}, 230)`}>
                          <rect width="109" height="36" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                          {/* 4 Beamed Sixteenths */}
                          {[0, 1, 2, 3].map((k) => (
                            <g key={k}>
                              <ellipse cx={14 + k * 11} cy="26" rx="3.8" ry="2.8" fill="#f59e0b" />
                              <line x1={17.5 + k * 11} y1="26" x2={17.5 + k * 11} y2="10" stroke="#f59e0b" strokeWidth="1.2" />
                            </g>
                          ))}
                          <line x1="17" y1="10" x2="51" y2="10" stroke="#f59e0b" strokeWidth="2.2" />
                          <line x1="17" y1="14" x2="51" y2="14" stroke="#f59e0b" strokeWidth="2.2" />
                          <text x="81" y="22" textAnchor="middle" fill="#fde68a" fontSize="8" fontFamily="monospace" fontWeight="bold">
                            {i + 1} e &amp; a
                          </text>
                        </g>
                      ))}
                    </g>

                    {/* RIGHT SIDE: Dotted Notes, Ties & Tuplets (x: 536..840) */}
                    <g transform="translate(536, 16)">
                      <rect width="304" height="278" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        B. DOTTED NOTES (1.5×) &amp; TRIPLETS (3:2)
                      </text>

                      {/* Formula 1: Augmentation Dot */}
                      <g transform="translate(16, 36)">
                        <rect width="272" height="72" rx="5" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
                        <text x="12" y="18" fill="#fbbf24" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          1. AUGMENTATION DOT RULE: Value × 1.5
                        </text>
                        <text x="12" y="36" fill="#e2e8f0" fontSize="9.5">
                          A dot adds <tspan fill="#fbbf24" fontWeight="bold">+50%</tspan> of the note&apos;s own duration:
                        </text>
                        <text x="12" y="52" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                          • Dotted Half (𝅗𝅥.)   = 2 + 1   = 3.0 Beats
                        </text>
                        <text x="12" y="65" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                          • Dotted Quarter (𝅘𝅥.) = 1 + 0.5 = 1.5 Beats
                        </text>
                      </g>

                      {/* Formula 2: Double Dotted & Tie */}
                      <g transform="translate(16, 118)">
                        <rect width="272" height="70" rx="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                        <text x="12" y="18" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          2. TIE vs. SLUR CURVE DISTINCTION
                        </text>
                        <text x="12" y="36" fill="#e2e8f0" fontSize="9">
                          • <tspan fill="#38bdf8" fontWeight="bold">Tie (Same Pitch):</tspan> Sums durations across barlines without restriking the key.
                        </text>
                        <text x="12" y="54" fill="#e2e8f0" fontSize="9">
                          • <tspan fill="#a78bfa" fontWeight="bold">Slur (Different Pitches):</tspan> Play <tspan fontStyle="italic">legato</tspan> (connect notes seamlessly with zero gap).
                        </text>
                      </g>

                      {/* Formula 3: Triplet 3:2 Subdivision */}
                      <g transform="translate(16, 198)">
                        <rect width="272" height="66" rx="5" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                        <text x="12" y="18" fill="#34d399" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          3. TRIPLET (TUPLET 3:2) SUBDIVISION
                        </text>
                        <text x="12" y="35" fill="#e2e8f0" fontSize="9">
                          Divides 1 beat into <tspan fill="#34d399" fontWeight="bold">3 equal pulses</tspan> (1/3 beat each = 166.7 ms at 120 BPM).
                        </text>
                        <text x="12" y="52" fill="#a7f3d0" fontSize="9" fontFamily="monospace">
                          Count: &quot;1 - trip - let, 2 - trip - let&quot;
                        </text>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Section: Time Signatures & Metric Pulse Architecture */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      SECTION 1.4 — METRIC PULSE ARCHITECTURE
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {isId
                        ? 'Tanda Birama (Time Signatures): Metrum Sederhana, Majemuk & Asimetris'
                        : 'Time Signatures: Simple, Compound, Cut-Time & Asymmetric Meters'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    TOP = BEATS • BOTTOM = UNIT VALUE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400 text-sm">4/4 (Common Time 𝄴)</span>
                      <span className="text-[10px] font-mono text-slate-400">SIMPLE QUADRUPLE</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
                      [1: STRONG] – [2: weak] – [3: Medium] – [4: weak]
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isId
                        ? '4 ketukan not seperempat per bar. Fondasi utama sonata klasik, pop, rock, dan R&B.'
                        : '4 quarter-note beats per bar. Primary foundation of classical sonatas, pop, rock, and jazz.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400 text-sm">3/4 (Waltz / Triple)</span>
                      <span className="text-[10px] font-mono text-slate-400">SIMPLE TRIPLE</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
                      [1: STRONG] – [2: weak] – [3: weak] (1 &amp; 2 &amp; 3 &amp;)
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isId
                        ? '3 ketukan not seperempat per bar. Menciptakan ayunan waltz (Chopin, Strauss) dan minuet.'
                        : '3 quarter-note beats per bar. Creates the buoyant waltz pulse of Chopin, Strauss, and minuets.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-400 text-sm">6/8 (Compound Duple)</span>
                      <span className="text-[10px] font-mono text-slate-400">2 DOTTED BEATS</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
                      [1 - 2 - 3] – [4 - 5 - 6] (2 Macro Beats × 3)
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isId
                        ? '6 not seperdelapan yang dikelompokkan menjadi 2 ketukan besar (not seperempat bertitik). Berbeda dari 3/4 (3×2 vs 2×3)!'
                        : '6 eighth notes grouped into 2 macro beats (dotted quarter notes). Distinct from 3/4 (2 groups of 3 vs. 3 groups of 2).'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400 text-sm">2/2 (Cut Time / Alla Breve 𝄵)</span>
                      <span className="text-[10px] font-mono text-slate-400">2 HALF-NOTE BEATS</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
                      [1: Half Note] – [2: Half Note]
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isId
                        ? 'Terlihat seperti 4/4 tetapi dihitung dalam 2 ketukan not setengah yang cepat. Umum pada mars, ragtime, dan finale simfoni.'
                        : 'Looks like 4/4 visually but felt in 2 brisk half-note pulses per measure. Ubiquitous in marches, ragtime, and fast finales.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-purple-400 text-sm">12/8 (Slow Blues / Ballad)</span>
                      <span className="text-[10px] font-mono text-slate-400">COMPOUND QUADRUPLE</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
                      [1-2-3] [4-5-6] [7-8-9] [10-11-12]
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isId
                        ? '4 ketukan besar yang masing-masing terbagi menjadi triplet seperdelapan. Standar lagu blues lambat, gospel, dan R&B.'
                        : '4 macro dotted-quarter beats each subdivided into 3 eighth notes. Standard meter of slow blues, gospel, and soul ballads.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-400 text-sm">5/4 &amp; 7/8 (Odd / Asymmetric)</span>
                      <span className="text-[10px] font-mono text-slate-400">ADDITIVE METER</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80">
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
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest block">
                      FIG 1.4 — ACCIDENTALS, SCORE NAVIGATION ROADMAP &amp; ORNAMENT EXECUTION
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Tanda Kromatik, Navigasi Pengulangan Partitur & Eksekusi Ornamen Klasik (Trill, Mordent, Turn, Grace Note)'
                        : 'Chromatic Accidentals, Score Repeat Roadmaps & Classical Ornament Real-Time Execution'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    CLASSICAL ORNAMENT GUIDE
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 280" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="280" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Top Band: 5 Accidentals & Barline Cancellation Rule */}
                    <g transform="translate(20, 16)">
                      <rect width="820" height="86" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="20" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        A. THE 5 CHROMATIC ACCIDENTALS &amp; BARLINE CANCELLATION RULE
                      </text>
                      {[
                        { sym: '♯', name: 'Sharp (Kruis)', shift: '+1 Semitone', desc: 'Raises pitch 1 half-step', col: '#f59e0b' },
                        { sym: '♭', name: 'Flat (Mol)', shift: '-1 Semitone', desc: 'Lowers pitch 1 half-step', col: '#38bdf8' },
                        { sym: '♮', name: 'Natural (Pugar)', shift: '0 (Reset)', desc: 'Cancels prior ♯/♭ or Key Sig', col: '#10b981' },
                        { sym: '𝄪', name: 'Double Sharp', shift: '+2 Semitones', desc: 'Raises pitch 1 whole-step', col: '#f43f5e' },
                        { sym: '𝄫', name: 'Double Flat', shift: '-2 Semitones', desc: 'Lowers pitch 1 whole-step', col: '#a855f7' },
                      ].map((acc, i) => (
                        <g key={i} transform={`translate(${16 + i * 160}, 30)`}>
                          <rect width="150" height="46" rx="4" fill="#0f172a" stroke="#1e293b" />
                          <text x="20" y="30" textAnchor="middle" fill={acc.col} fontSize="20" fontFamily="serif" fontWeight="bold">{acc.sym}</text>
                          <text x="42" y="18" fill="#f8fafc" fontSize="9.5" fontWeight="bold">{acc.name}</text>
                          <text x="42" y="30" fill={acc.col} fontSize="8.5" fontFamily="monospace" fontWeight="bold">{acc.shift}</text>
                          <text x="42" y="41" fill="#64748b" fontSize="7.5">{acc.desc}</text>
                        </g>
                      ))}
                    </g>

                    {/* Bottom Band: 4 Ornaments Written vs. Played */}
                    <g transform="translate(20, 114)">
                      <rect width="820" height="150" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        B. CLASSICAL ORNAMENTS — WRITTEN SYMBOL vs. REAL-TIME PITCH EXECUTION
                      </text>

                      {[
                        {
                          title: '1. TRILL (tr~~~)',
                          written: 'C5 with "tr"',
                          played: 'C5 – D5 – C5 – D5 – C5 – D5',
                          desc: 'Rapidly alternate between the principal note and the diatonic upper neighbor.',
                          col: '#38bdf8'
                        },
                        {
                          title: '2. UPPER / LOWER MORDENT',
                          written: 'C5 with zigzag (dc / dd)',
                          played: 'Upper: C–D–C  |  Lower: C–B–C',
                          desc: 'Single crisp 3-note snap on the beat returning immediately to the main note.',
                          col: '#10b981'
                        },
                        {
                          title: '3. TURN (Gruppetto de)',
                          written: 'C5 with S-curve (∽)',
                          played: 'D5 → C5 → B4 → C5',
                          desc: 'Coils around the main note: Upper Neighbor → Main → Lower Neighbor → Main.',
                          col: '#f59e0b'
                        },
                        {
                          title: '4. GRACE NOTE & ARPEGGIANDO',
                          written: 'Slashed 𝅘𝅥𝅮 | Wavy Chord 𝆃',
                          played: 'Instant pre-beat flick | Bottom→Top roll',
                          desc: 'Acciaccatura is played rapidly just before/on the beat; wavy vertical line rolls chord bottom-to-top.',
                          col: '#a855f7'
                        },
                      ].map((orn, i) => (
                        <g key={i} transform={`translate(${16 + i * 200}, 34)`}>
                          <rect width="190" height="104" rx="5" fill="#0f172a" stroke="#1e293b" />
                          <line x1="0" y1="0" x2="190" y2="0" stroke={orn.col} strokeWidth="2.5" />
                          <text x="10" y="18" fill={orn.col} fontSize="9.5" fontFamily="monospace" fontWeight="bold">{orn.title}</text>
                          <text x="10" y="34" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">Written: <tspan fill="#e2e8f0">{orn.written}</tspan></text>
                          <rect x="10" y="42" width="170" height="20" rx="3" fill="#070a12" stroke="#1e293b" />
                          <text x="95" y="55" textAnchor="middle" fill="#fde68a" fontSize="8.5" fontFamily="monospace" fontWeight="bold">{orn.played}</text>
                          <text x="10" y="76" fill="#cbd5e1" fontSize="8">{orn.desc.slice(0, 44)}</text>
                          <text x="10" y="88" fill="#cbd5e1" fontSize="8">{orn.desc.slice(44, 90)}</text>
                          <text x="10" y="99" fill="#cbd5e1" fontSize="8">{orn.desc.slice(90)}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                </div>

                {/* Score Navigation & Dynamics Reference Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="font-mono font-bold text-cyan-400 uppercase">Score Navigation Roadmap Marks</div>
                    <ul className="space-y-1.5 text-slate-300">
                      <li>• <b>Repeat Dots (<code className="text-amber-300">|:  :|</code>):</b> {isId ? 'Ulangi bagian di antara dua tanda titik dua; jika hanya ada :|, ulangi dari awal lagu.' : isEs ? 'Repite la sección encerrada entre las barras con dos puntos; si solo hay :|, repite desde el inicio.' : 'Loop the section enclosed between the double-dotted barlines.'}</li>
                      <li>• <b>1st &amp; 2nd Endings (<code className="text-amber-300">1. / 2. Volta</code>):</b> {isId ? 'Mainkan kurung [1.] pada putaran pertama, lalu lompati [1.] langsung ke [2.] pada putaran kedua.' : isEs ? 'Toca la casilla [1.] en la primera vuelta; en la repetición, salta directamente a la casilla [2.].' : 'Play bracket [1.] on the first pass; on repeat, skip [1.] and jump directly into bracket [2.].'}</li>
                      <li>• <b>D.C. al Fine / D.S. al Coda:</b> {isId ? 'Da Capo = kembali ke bar 1 sampai kata Fine; Dal Segno = kembali ke simbol 𝄋 lalu lompat ke Coda 𝄌.' : isEs ? 'Da Capo = vuelve al compás 1 hasta Fine; Dal Segno = vuelve al símbolo 𝄋 y salta a la Coda 𝄌.' : 'Da Capo = return to Measure 1 until Fine; Dal Segno = jump back to symbol 𝄋 then leap to Coda 𝄌.'}</li>
                      <li>• <b>8va / 8vb / Loco:</b> {isId ? 'Mainkan 1 oktaf lebih tinggi (8va) atau 1 oktaf lebih rendah (8vb) agar terhindar dari tumpukan garis bantu ekstrem.' : isEs ? 'Toca 1 octava más alta (8va) o más baja (8vb); loco restaura el registro normal.' : 'Play 1 octave higher (8va) or lower (8vb) than written; loco restores normal register.'}</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="font-mono font-bold text-emerald-400 uppercase">Dynamic Gradient &amp; MIDI Velocity Mapping</div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-center">
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-cyan-400 font-bold block">pp / p</span>
                        <span className="text-slate-400 text-[10px]">Vel: 25–55</span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-emerald-400 font-bold block">mp / mf</span>
                        <span className="text-slate-400 text-[10px]">Vel: 60–88</span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-amber-400 font-bold block">f / ff</span>
                        <span className="text-slate-400 text-[10px]">Vel: 95–127</span>
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
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                      FIG 1.5 — KEY SIGNATURE STAFF GEOMETRY (ORDER OF 7 SHARPS &amp; 7 FLATS)
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Urutan Baku Penempatan 7 Kruis (F-C-G-D-A-E-B) & 7 Mol (B-E-A-D-G-C-F) pada Paranada'
                        : 'Canonical Staff Placement of the 7 Sharps (F-C-G-D-A-E-B) & 7 Flats (B-E-A-D-G-C-F)'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    INSTANT KEY IDENTIFICATION
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 190" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="190" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Left Panel: 7 Sharps Zig-Zag Pattern */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="158" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#f59e0b" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
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
                          <text x={sh.x} y="118" textAnchor="middle" fill="#fde68a" fontSize="9" fontFamily="monospace" fontWeight="bold">{sh.s}</text>
                          <text x={sh.x} y="132" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">{sh.k}</text>
                        </g>
                      ))}
                      <text x="200" y="149" textAnchor="middle" fill="#34d399" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                        RULE: Last Sharp + 1 Semitone UP = Major Key Tonic
                      </text>
                    </g>

                    {/* Right Panel: 7 Flats Zig-Zag Pattern */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="158" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
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
                          <text x={fl.x} y="118" textAnchor="middle" fill="#7dd3fc" fontSize="9" fontFamily="monospace" fontWeight="bold">{fl.s}</text>
                          <text x={fl.x} y="132" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">{fl.k}</text>
                        </g>
                      ))}
                      <text x="200" y="149" textAnchor="middle" fill="#7dd3fc" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                        RULE: Second-to-Last Flat = Major Key Tonic (1♭ = F Maj)
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 1.6: Musical Form & Score Navigation Flow Diagram */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 1.6 — SCORE NAVIGATION ROADMAP: REPEAT SIGNS, VOLTA BRACKETS (1. / 2.) &amp; D.S. AL CODA
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Ilustrasi Alur Pembacaan Bar Pengulangan (Repeat Barlines), Kurung Volta 1 & 2, serta Lompatan D.S. al Coda'
                        : 'Visual Execution Flow for Repeat Barlines, 1st/2nd Ending Brackets (Volta), and D.S. al Coda Jumps'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    SCORE ROADMAP FLOW
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 185" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="185" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Left Box: 1st & 2nd Ending Volta Flow */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="152" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
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
                        <text x="56" y="34" textAnchor="middle" fill="#e2e8f0" fontSize="9.5" fontFamily="monospace" fontWeight="bold">BAR 1</text>

                        <rect x="102" y="10" width="76" height="40" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="140" y="34" textAnchor="middle" fill="#e2e8f0" fontSize="9.5" fontFamily="monospace" fontWeight="bold">BAR 2</text>

                        {/* 1st Ending Bracket */}
                        <path d="M 186 4 L 186 -8 L 268 -8 L 268 4" fill="none" stroke="#10b981" strokeWidth="1.8" />
                        <text x="192" y="2" fill="#34d399" fontSize="8.5" fontFamily="monospace" fontWeight="bold">1.</text>
                        <rect x="186" y="10" width="76" height="40" rx="4" fill="#064e3b" stroke="#10b981" />
                        <text x="224" y="34" textAnchor="middle" fill="#a7f3d0" fontSize="9.5" fontFamily="monospace" fontWeight="bold">BAR 3</text>

                        {/* End Repeat Barline */}
                        <circle cx="267" cy="24" r="2.2" fill="#f59e0b" />
                        <circle cx="267" cy="36" r="2.2" fill="#f59e0b" />
                        <line x1="273" y1="6" x2="273" y2="54" stroke="#f59e0b" strokeWidth="1.2" />
                        <line x1="278" y1="6" x2="278" y2="54" stroke="#f59e0b" strokeWidth="3.5" />

                        {/* 2nd Ending Bracket */}
                        <path d="M 288 4 L 288 -8 L 364 -8" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
                        <text x="294" y="2" fill="#38bdf8" fontSize="8.5" fontFamily="monospace" fontWeight="bold">2.</text>
                        <rect x="288" y="10" width="76" height="40" rx="4" fill="#083344" stroke="#38bdf8" />
                        <text x="326" y="34" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontFamily="monospace" fontWeight="bold">BAR 4</text>

                        {/* Loopback Arrow & Skip Arrow */}
                        <path d="M 224 52 Q 120 76 18 52" fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="3 2" />
                        <path d="M 140 10 Q 230 -24 326 10" fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="3 2" />
                      </g>

                      <text x="200" y="140" textAnchor="middle" fill="#cbd5e1" fontSize="8.5" fontFamily="monospace">
                        EXECUTION ORDER: Bar 1 → Bar 2 → [1. Bar 3] → Bar 1 → Bar 2 → [2. Bar 4]
                      </text>
                    </g>

                    {/* Right Box: D.S. al Coda Flow */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="152" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#a855f7" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        B. DAL SEGNO AL CODA (𝄋 → TO CODA 𝄌 → CODA 𝄌)
                      </text>

                      <g transform="translate(18, 48)">
                        <rect x="0" y="12" width="66" height="38" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="33" y="35" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">Intro</text>

                        <rect x="74" y="12" width="84" height="38" rx="4" fill="#2e1065" stroke="#a855f7" />
                        <text x="116" y="28" textAnchor="middle" fill="#e9d5ff" fontSize="8.5" fontFamily="monospace" fontWeight="bold">𝄋 SEGNO</text>
                        <text x="116" y="41" textAnchor="middle" fill="#c084fc" fontSize="8" fontFamily="monospace">To Coda 𝄌</text>

                        <rect x="166" y="12" width="92" height="38" rx="4" fill="#0f172a" stroke="#f59e0b" />
                        <text x="212" y="28" textAnchor="middle" fill="#fde68a" fontSize="8.5" fontFamily="monospace" fontWeight="bold">Verse / Bridge</text>
                        <text x="212" y="41" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="monospace">D.S. al Coda</text>

                        <rect x="272" y="12" width="92" height="38" rx="4" fill="#064e3b" stroke="#10b981" />
                        <text x="318" y="28" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontFamily="monospace" fontWeight="bold">𝄌 CODA</text>
                        <text x="318" y="41" textAnchor="middle" fill="#34d399" fontSize="8" fontFamily="monospace">Final Ending</text>

                        {/* Jump back to Segno arrow */}
                        <path d="M 212 52 Q 164 74 116 52" fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="3 2" />
                        {/* Jump from To Coda to Coda */}
                        <path d="M 140 12 Q 230 -16 318 12" fill="none" stroke="#10b981" strokeWidth="1.8" strokeDasharray="3 2" />
                      </g>

                      <text x="200" y="140" textAnchor="middle" fill="#cbd5e1" fontSize="8.5" fontFamily="monospace">
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
                    <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 02 • VISUALISASI PIANO ROLL & REKAYASA LATIHAN' : isEs ? 'MÓDULO 02 • PIANO ROLL Y PRÁCTICA' : 'MODULE 02 • PIANO ROLL & PRACTICE ENGINEERING'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      4 TECHNICAL DIAGRAMS • LATENCY &amp; PEDALING
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {isId
                      ? 'Falling Notes, Mekanika Wait Mode, Kalibrasi Latensi & Teknik Pedal Sustain'
                      : isEs
                      ? 'Notas Cayendo, Mecánica de Modo Espera, Calibración de Latencia y Pedal'
                      : 'Falling Notes Geometry, Wait Mode Engines, Latency Calibration & Damper Pedaling'}
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-3xl">
                    {isId
                      ? 'Mode Falling Notes (Piano Roll vertikal) memproyeksikan aliran waktu musik langsung di atas geometri fisik 88 tuts piano. Memahami anatomi balok not, jendela toleransi milidetik, serta sinkronisasi pedal sustain akan mengubah permainan mekanis menjadi musik yang ekspresif.'
                      : isEs
                      ? 'El modo Falling Notes proyecta el flujo temporal directamente sobre la geometría de las 88 teclas. Comprender la anatomía de las barras, las ventanas de precisión en milisegundos y el pedal de resonancia transforma la ejecución.'
                      : 'Vertical Piano Roll visualization projects musical time directly onto the physical geometry of the 88-keybed. Mastering note-bar anatomy, millisecond hit windows, and syncopated damper pedaling transforms mechanical note-hitting into expressive performance.'}
                  </p>
                </div>
                {onLaunchInGamePractice && (
                  <button
                    type="button"
                    onClick={() => onLaunchInGamePractice('chords_pop', 'falling')}
                    className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center gap-2 flex-shrink-0 shadow-sm"
                  >
                    <span>{isId ? 'Coba Wait Mode Interaktif' : isEs ? 'Probar Modo Espera' : 'Launch Wait Mode Practice'}</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              {/* FIG 2.1: Piano Roll Time-Pitch Coordinate Schematic */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 2.1 — PIANO ROLL TIME-PITCH COORDINATE &amp; STRIKE-LINE SCHEMATIC
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Anatomi Balok Not (Attack Edge, Sustain Body, Release Tail) & Garis Pukul (Strike Line t₀)'
                        : 'Note Bar Anatomy (Leading Attack Edge, Sustain Body, Release Tail) & Strike Line (t₀)'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    X = PITCH (88 KEYS) • Y = LOOKAHEAD TIME
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 280" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="280" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Horizontal Beat / Bar Grid Lines */}
                    <line x1="40" y1="45" x2="560" y2="45" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="48" y="40" fill="#64748b" fontSize="8.5" fontFamily="monospace">t + 1000 ms (2 Beats Ahead)</text>
                    <line x1="40" y1="115" x2="560" y2="115" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="48" y="110" fill="#64748b" fontSize="8.5" fontFamily="monospace">t + 500 ms (1 Beat Ahead)</text>

                    {/* Vertical Key Lanes */}
                    {[120, 170, 220, 270, 320, 370, 420, 470, 520].map((x, i) => (
                      <line key={i} x1={x} y1="20" x2={x} y2="195" stroke="#0f172a" strokeWidth="1" />
                    ))}

                    {/* Left Hand Bass Note (Sustained 2-beat bar on C3, Purple) */}
                    <g transform="translate(124, 55)">
                      <rect width="42" height="140" rx="4" fill="#3b0764" stroke="#a855f7" strokeWidth="1.5" />
                      <line x1="0" y1="138" x2="42" y2="138" stroke="#facc15" strokeWidth="3" />
                      <text x="21" y="75" textAnchor="middle" fill="#e9d5ff" fontSize="9.5" fontFamily="monospace" fontWeight="bold">LH: C3</text>
                      <text x="21" y="90" textAnchor="middle" fill="#c084fc" fontSize="8" fontFamily="monospace">Fing: 5</text>
                      <text x="21" y="128" textAnchor="middle" fill="#fde68a" fontSize="8" fontFamily="monospace" fontWeight="bold">ONSET</text>
                    </g>

                    {/* Right Hand Chord / Melody Notes (Cyan) */}
                    {/* E4 Quarter Note */}
                    <g transform="translate(274, 125)">
                      <rect width="42" height="70" rx="4" fill="#083344" stroke="#06b6d4" strokeWidth="1.5" />
                      <line x1="0" y1="68" x2="42" y2="68" stroke="#facc15" strokeWidth="3" />
                      <text x="21" y="34" textAnchor="middle" fill="#cffafe" fontSize="9.5" fontFamily="monospace" fontWeight="bold">RH: E4</text>
                      <text x="21" y="48" textAnchor="middle" fill="#67e8f9" fontSize="8" fontFamily="monospace">Fing: 1</text>
                    </g>

                    {/* G4 Staccato Note (approaching) */}
                    <g transform="translate(374, 82)">
                      <rect width="42" height="28" rx="4" fill="#083344" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="21" y="18" textAnchor="middle" fill="#cffafe" fontSize="8.5" fontFamily="monospace" fontWeight="bold">G4 (2)</text>
                    </g>

                    {/* C5 Long Note */}
                    <g transform="translate(474, 30)">
                      <rect width="42" height="80" rx="4" fill="#083344" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="21" y="45" textAnchor="middle" fill="#cffafe" fontSize="9" fontFamily="monospace" fontWeight="bold">C5 (5)</text>
                      <text x="21" y="12" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">RELEASE TAIL</text>
                    </g>

                    {/* Strike Line t = 0 */}
                    <line x1="40" y1="195" x2="560" y2="195" stroke="#f59e0b" strokeWidth="2.5" />
                    <rect x="44" y="180" width="138" height="15" rx="2" fill="#451a03" />
                    <text x="113" y="191" textAnchor="middle" fill="#fde68a" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                      STRIKE LINE (t = 0 ms)
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
                            <text x="24" y="54" textAnchor="middle" fill={active ? '#fde68a' : '#94a3b8'} fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                              {k}
                            </text>
                          </g>
                        );
                      })}
                    </g>

                    {/* Right Side Technical Specification Legend */}
                    <g transform="translate(578, 20)">
                      <rect width="262" height="242" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="22" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        ANATOMY OF A FALLING NOTE BAR
                      </text>
                      <text x="14" y="46" fill="#fde68a" fontSize="9.5" fontWeight="bold">1. Bottom Edge (Attack Transient)</text>
                      <text x="14" y="61" fill="#94a3b8" fontSize="8.5">Press the physical key the exact millisecond</text>
                      <text x="14" y="73" fill="#94a3b8" fontSize="8.5">the bottom edge touches the Strike Line.</text>

                      <text x="14" y="98" fill="#67e8f9" fontSize="9.5" fontWeight="bold">2. Vertical Height (Sustain Duration)</text>
                      <text x="14" y="113" fill="#94a3b8" fontSize="8.5">Keep the key depressed for the entire vertical</text>
                      <text x="14" y="125" fill="#94a3b8" fontSize="8.5">length of the bar to sustain full acoustic resonance.</text>

                      <text x="14" y="150" fill="#a78bfa" fontSize="9.5" fontWeight="bold">3. Top Edge (Key Release Point)</text>
                      <text x="14" y="165" fill="#94a3b8" fontSize="8.5">Lift your finger cleanly as the top tail crosses</text>
                      <text x="14" y="177" fill="#94a3b8" fontSize="8.5">the Strike Line so consecutive harmonies don&apos;t blur.</text>

                      <rect x="14" y="192" width="234" height="38" rx="4" fill="#0f172a" stroke="#334155" />
                      <text x="24" y="208" fill="#e2e8f0" fontSize="8.5" fontFamily="monospace">• Cyan/Blue = Right Hand (Treble)</text>
                      <text x="24" y="222" fill="#e2e8f0" fontSize="8.5" fontFamily="monospace">• Purple/Indigo = Left Hand (Bass)</text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Section 2.2: Wait Mode Engines Comparison */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                      SECTION 2.2 — OCTAVIA PLAYBACK &amp; WAIT MODE SUB-ENGINES
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {isId
                        ? 'Perbandingan 4 Mode Latihan & Evaluasi Input di Octavia'
                        : 'Comparison of the 4 Practice & Evaluation Modes in Octavia'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    MODE SELECTION ARCHITECTURE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-400 text-sm">01. Strict Practice (Wait Mode: Strict)</span>
                      <span className="text-[10px] font-mono bg-rose-950/60 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">PITCH ACCURACY</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Waktu lagu membeku tepat di garis pukul setiap kali ada nada baru. Lagu hanya akan kembali berjalan setelah Anda menekan seluruh nada yang diminta (baik nada tunggal maupun akor polifonik). Sangat ideal untuk menghafal bacaan not baru dan posisi jari tanpa kepanikan tempo.'
                        : 'Playhead freezes at the exact onset timestamp of every required note or chord. Playback resumes only when all required MIDI pitches at that timestamp are depressed. Ideal for initial sight-reading and finger-mapping.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-400 text-sm">02. Lenient Practice (Wait / Non-Stop)</span>
                      <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">FLOW &amp; PHRASING</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Memberikan jendela toleransi yang lebih longgar agar alur kalimat musik tidak mudah tersendat. Dapat dikombinasikan dengan opsi Non-Stop atau pemilihan tangan terpisah (Left Hand / Right Hand / Both Hands).'
                        : 'Provides a wider pre-satisfaction window and optional Non-Stop flow, allowing you to isolate Left Hand, Right Hand, or Both Hands while maintaining musical momentum.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400 text-sm">03. Retical Mode (Ranked Performance)</span>
                      <span className="text-[10px] font-mono bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">COMPETITIVE</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Lagu berjalan tanpa henti pada tempo penuh dengan penguncian Accuracy Level 5 (jendela PERFECT ±100 ms). Setiap ketukan dinilai secara real-time untuk menghitung Performance Score (PS) di Leaderboard.'
                        : 'Uninterrupted real-time performance with locked Accuracy Level 5 (±100 ms PERFECT window), HP bar, and seeking disabled for verified leaderboard scoring.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400 text-sm">04. Autoplay &amp; A–B Bar Looping</span>
                      <span className="text-[10px] font-mono bg-cyan-950/60 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">ANALYSIS</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Dengarkan referensi artikulasi, dinamika, dan animasi tangan 3D secara otomatis. Gunakan fitur Loop (Titik A ke Titik B) di TopBar untuk mengulang bagian sulit secara terus-menerus.'
                        : 'Observe reference phrasing, dynamics, and 3D hand choreography automatically, or set A–B measure loop points in the TopBar to drill difficult passages.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* FIG 2.2: Hit Judgment Timing Window & Latency Calibration Diagram */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                      FIG 2.2 — MILLISECOND HIT JUDGMENT WINDOWS &amp; DUAL LATENCY CALIBRATION
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Kurva Penilaian Ketukan (Perfect / Great / Good) & Perbedaan Hitbox Shift vs. Audio Sync Offset'
                        : 'Timing Judgment Windows (Perfect / Great / Good) & Hitbox Shift vs. Audio Sync Calibration'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    ACCURACY LEVEL 5 STANDARD
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 220" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="220" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Horizontal Timing Axis (-250ms to +250ms) */}
                    <g transform="translate(50, 25)">
                      {/* Miss Left */}
                      <rect x="0" y="35" width="90" height="52" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
                      <text x="45" y="58" textAnchor="middle" fill="#fca5a5" fontSize="10" fontFamily="monospace" fontWeight="bold">EARLY MISS</text>
                      <text x="45" y="74" textAnchor="middle" fill="#f87171" fontSize="8.5" fontFamily="monospace">&lt; -200 ms</text>

                      {/* Good Early */}
                      <rect x="94" y="35" width="76" height="52" rx="4" fill="#422006" stroke="#eab308" strokeWidth="1" />
                      <text x="132" y="58" textAnchor="middle" fill="#fde047" fontSize="10" fontFamily="monospace" fontWeight="bold">GOOD</text>
                      <text x="132" y="74" textAnchor="middle" fill="#facc15" fontSize="8.5" fontFamily="monospace">-200..-150ms</text>

                      {/* Great Early */}
                      <rect x="174" y="35" width="82" height="52" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                      <text x="215" y="58" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontFamily="monospace" fontWeight="bold">GREAT</text>
                      <text x="215" y="74" textAnchor="middle" fill="#34d399" fontSize="8.5" fontFamily="monospace">-150..-100ms</text>

                      {/* PERFECT CENTER */}
                      <rect x="260" y="25" width="240" height="72" rx="6" fill="#083344" stroke="#38bdf8" strokeWidth="2" />
                      <line x1="380" y1="15" x2="380" y2="108" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" />
                      <text x="380" y="11" textAnchor="middle" fill="#fbbf24" fontSize="9.5" fontFamily="monospace" fontWeight="bold">EXACT BEAT (0 ms)</text>
                      <text x="380" y="56" textAnchor="middle" fill="#ffffff" fontSize="13" fontFamily="monospace" fontWeight="bold">PERFECT WINDOW</text>
                      <text x="380" y="76" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="monospace" fontWeight="bold">-100 ms  to  +100 ms</text>

                      {/* Great Late */}
                      <rect x="504" y="35" width="82" height="52" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                      <text x="545" y="58" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontFamily="monospace" fontWeight="bold">GREAT</text>
                      <text x="545" y="74" textAnchor="middle" fill="#34d399" fontSize="8.5" fontFamily="monospace">+100..+150ms</text>

                      {/* Good Late */}
                      <rect x="590" y="35" width="76" height="52" rx="4" fill="#422006" stroke="#eab308" strokeWidth="1" />
                      <text x="628" y="58" textAnchor="middle" fill="#fde047" fontSize="10" fontFamily="monospace" fontWeight="bold">GOOD</text>
                      <text x="628" y="74" textAnchor="middle" fill="#facc15" fontSize="8.5" fontFamily="monospace">+150..+200ms</text>

                      {/* Miss Late */}
                      <rect x="670" y="35" width="90" height="52" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
                      <text x="715" y="58" textAnchor="middle" fill="#fca5a5" fontSize="10" fontFamily="monospace" fontWeight="bold">LATE MISS</text>
                      <text x="715" y="74" textAnchor="middle" fill="#f87171" fontSize="8.5" fontFamily="monospace">&gt; +200 ms</text>

                      {/* Dual Offset Explanation Cards */}
                      <rect x="0" y="122" width="372" height="58" rx="5" fill="#0f172a" stroke="#1e293b" />
                      <text x="12" y="140" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        1. MIDI HIT TIMING OFFSET (Hitbox Shift)
                      </text>
                      <text x="12" y="156" fill="#cbd5e1" fontSize="8.5">
                        Compensates for USB-MIDI / audio driver buffer delay. If your hits register
                      </text>
                      <text x="12" y="169" fill="#cbd5e1" fontSize="8.5">
                        LATE (+ms), shift Hitbox negative (-) or run the Auto-Calibration Song.
                      </text>

                      <rect x="388" y="122" width="372" height="58" rx="5" fill="#0f172a" stroke="#1e293b" />
                      <text x="400" y="140" fill="#a855f7" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        2. USER MS AUDIO SYNC (Backing Track / YouTube Offset)
                      </text>
                      <text x="400" y="156" fill="#cbd5e1" fontSize="8.5">
                        Aligns external MP3 or YouTube backing audio with the internal MIDI clock
                      </text>
                      <text x="400" y="169" fill="#cbd5e1" fontSize="8.5">
                        and metronome click. Adjust in real-time via TopBar or Sync Tuner (STU).
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 2.3: Acoustic Piano Pedals & Syncopated Damper Pedaling Waveform */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                      FIG 2.3 — THE 3 PIANO PEDALS &amp; SYNCOPATED LEGATO PEDALING TIMING WAVEFORM
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Mekanika 3 Pedal Piano & Teknik Syncopated Pedaling ("Tekan Nada → Angkat & Injak Pedal")'
                        : 'Three-Pedal Mechanics & Syncopated Legato Pedaling ("Strike Key → Lift & Re-depress Pedal")'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    MIDI CC64 SUSTAIN
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {isId
                    ? 'Kesalahan paling umum pemula saat memakai Sustain Pedal (pedal kanan) adalah mengangkat dan menginjak pedal bersamaan dengan turunnya jari, sehingga terdapat celah kosong atau tabrakan harmoni kotor. Pianis profesional menggunakan Syncopated Pedaling (Legato Pedaling): tekan akor baru terlebih dahulu, lalu sepersekian detik kemudian angkat dan injak kembali pedal untuk membersihkan harmoni lama!'
                    : 'The most common beginner pedaling mistake is lifting and pressing the damper pedal simultaneously with the fingers, which either leaves a dry gap or blurs two chords together. Concert pianists use Syncopated (Legato) Pedaling: strike the new chord first, then immediately lift and re-depress the pedal just after the key strike.'}
                </p>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 230" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="230" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Beat Markers (Beat 1, Beat 2, Beat 3, Beat 4) */}
                    {[150, 340, 530, 720].map((x, idx) => (
                      <g key={idx}>
                        <line x1={x} y1="20" x2={x} y2="195" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 3" />
                        <text x={x} y="16" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          BEAT {idx + 1} (Chord {['C', 'G', 'Am', 'F'][idx]})
                        </text>
                      </g>
                    ))}

                    {/* Track 1: Hand / Key Depression */}
                    <text x="20" y="58" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">HAND KEYS</text>
                    <text x="20" y="72" fill="#64748b" fontSize="8.5" fontFamily="monospace">Finger Strike</text>
                    {[
                      { x: 150, w: 170, label: 'Strike C Maj' },
                      { x: 340, w: 170, label: 'Strike G Maj' },
                      { x: 530, w: 170, label: 'Strike A Min' },
                      { x: 720, w: 110, label: 'Strike F Maj' },
                    ].map((b, i) => (
                      <g key={i} transform={`translate(${b.x}, 42)`}>
                        <rect width={b.w} height="34" rx="4" fill="#083344" stroke="#38bdf8" strokeWidth="1.5" />
                        <text x={b.w / 2} y="21" textAnchor="middle" fill="#e0f2fe" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          {b.label}
                        </text>
                      </g>
                    ))}

                    {/* Track 2: Damper Pedal Position Curve (Down = Held, Up = Clear Dampers) */}
                    <text x="20" y="135" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">DAMPER PEDAL</text>
                    <text x="20" y="149" fill="#64748b" fontSize="8.5" fontFamily="monospace">Up = Clear</text>
                    <text x="20" y="162" fill="#64748b" fontSize="8.5" fontFamily="monospace">Down = Sustain</text>

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
                        <text x={px + 8} y="106" fill="#fca5a5" fontSize="8" fontFamily="monospace" fontWeight="bold">
                          ↑ LIFT &amp; RE-PRESS (+80ms AFTER note strike!)
                        </text>
                      </g>
                    ))}

                    <text x="440" y="212" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">
                      Listen with your ears: The foot lifts on the exact chord strike to damp the old harmony, and catches the new chord before the fingers release.
                    </text>
                  </svg>
                </div>

                {/* 3 Pedals Reference Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-mono font-bold text-cyan-400">1. Left Pedal: Una Corda (Soft Pedal)</div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Pada grand piano, menggeser mekanisme palu sedikit ke kanan sehingga palu hanya memukul 2 dari 3 senar (una corda), menghasilkan warna suara yang lembut, hangat, dan intim.'
                        : 'On a grand piano, shifts the entire action slightly right so hammers strike fewer strings, creating a veiled, intimate timbre (marked una corda; release at tre corde).'}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-mono font-bold text-indigo-400">2. Middle Pedal: Sostenuto Pedal</div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Menahan hanya nada/akor yang sedang ditekan tepat saat pedal tengah diinjak, sementara nada-nada berikutnya tetap kering (tidak ikut bergema). Umum pada karya Debussy dan Ravel.'
                        : 'Selectively sustains only the dampers that are already raised at the moment the middle pedal is depressed, leaving subsequent staccato passages completely dry.'}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-mono font-bold text-amber-400">3. Right Pedal: Damper (Sustain) Pedal</div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Mengangkat seluruh peredam (damper) dari senar sehingga semua senar beresonansi simpatik. Letakkan tumit tetap menapak di lantai dan gerakkan ujung kaki sebagai poros engsel.'
                        : 'Lifts all dampers off the strings, awakening rich sympathetic overtones. Keep your heel anchored on the floor and pivot smoothly with the ball of your right foot.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* FIG 2.4: Loop Chunking & 4-Stage Tempo Progression Architecture */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 2.4 — MICRO-LOOP CHUNKING &amp; THE 4-STAGE TEMPO MASTERY LADDER
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Strategi Latihan Konservatori: Isolasi Loop 2–4 Bar & Tangga Tempo Bertahap (50% → 100%)'
                        : 'Conservatory Practice Protocol: 2–4 Bar Loop Isolation & Progressive Tempo Ramp (50% → 100%)'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    PRACTICE METHODOLOGY
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 190" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="190" rx="8" fill="#070a12" stroke="#1e293b" />
                    {[
                      {
                        step: 'STAGE 01 • 50% TEMPO',
                        title: 'Hands Separate (HS) + Strict Wait',
                        desc1: 'Isolate 2–4 bars (Set Loop A → B).',
                        desc2: 'Map exact finger numbers (1–5)',
                        desc3: 'with zero hesitation glitches.',
                        col: '#38bdf8'
                      },
                      {
                        step: 'STAGE 02 • 65% TEMPO',
                        title: 'Hands Together (HT) + Wait Mode',
                        desc1: 'Combine LH + RH vertically.',
                        desc2: 'Verify vertical chord alignment',
                        desc3: 'before speed is introduced.',
                        col: '#818cf8'
                      },
                      {
                        step: 'STAGE 03 • 80% TEMPO',
                        title: 'Metronome Beat + Non-Stop',
                        desc1: 'Disable Wait Mode; turn Metronome',
                        desc2: 'ON. Play 3x in a row with >=95%',
                        desc3: 'accuracy before advancing.',
                        col: '#10b981'
                      },
                      {
                        step: 'STAGE 04 • 100% TEMPO',
                        title: 'Full Performance + Dynamics',
                        desc1: 'Add backing track, phrasing breath,',
                        desc2: 'and damper pedaling at target',
                        desc3: 'concert tempo.',
                        col: '#f59e0b'
                      },
                    ].map((st, i) => (
                      <g key={i} transform={`translate(${18 + i * 208}, 18)`}>
                        <rect width="196" height="154" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                        <line x1="0" y1="0" x2="196" y2="0" stroke={st.col} strokeWidth="3" />
                        <text x="12" y="24" fill={st.col} fontSize="9.5" fontFamily="monospace" fontWeight="bold">{st.step}</text>
                        <text x="12" y="44" fill="#f8fafc" fontSize="10" fontWeight="bold">{st.title}</text>
                        <line x1="12" y1="54" x2="184" y2="54" stroke="#1e293b" />
                        <text x="12" y="74" fill="#cbd5e1" fontSize="8.5">{st.desc1}</text>
                        <text x="12" y="90" fill="#cbd5e1" fontSize="8.5">{st.desc2}</text>
                        <text x="12" y="106" fill="#cbd5e1" fontSize="8.5">{st.desc3}</text>
                        <rect x="12" y="122" width="172" height="20" rx="3" fill="#0f172a" />
                        <text x="98" y="135" textAnchor="middle" fill={st.col} fontSize="8" fontFamily="monospace" fontWeight="bold">
                          PASS RULE: 3× Clean Repetitions
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* FIG 2.5: Polyrhythm 3:2 & 4:3 Time-Grid Subdivisions */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest block">
                      FIG 2.5 — POLYRHYTHMIC COORDINATION: 3-AGAINST-2 (3:2) &amp; SIGHT-READING EYE TRACKING
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Matriks KPK Poliritme 3-Lawan-2 (6 Sub-Denyut) & Protokol Pergerakan Mata Sight-Reading'
                        : 'Least Common Multiple (LCM) Grid for 3:2 Polyrhythms & Sight-Reading Eye-Tracking Protocol'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    CHOPIN / DEBUSSY RHYTHM LAB
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 185" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="185" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Left Box: 3 against 2 (6-pulse grid) */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="152" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        A. 3-AGAINST-2 POLYRHYTHM (LCM = 6 SUB-PULSES)
                      </text>
                      {[0, 1, 2, 3, 4, 5].map((p) => {
                        const x = 18 + p * 61;
                        const rhHit = p % 2 === 0;
                        const lhHit = p % 3 === 0;
                        return (
                          <g key={p} transform={`translate(${x}, 32)`}>
                            <rect width="55" height="22" rx="3" fill="#0f172a" stroke="#1e293b" />
                            <text x="27.5" y="15" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">Sub {p + 1}</text>
                            <rect y="28" width="55" height="28" rx="3" fill={rhHit ? '#083344' : '#070a12'} stroke={rhHit ? '#38bdf8' : '#1e293b'} />
                            <text x="27.5" y="46" textAnchor="middle" fill={rhHit ? '#7dd3fc' : '#334155'} fontSize="9" fontFamily="monospace" fontWeight="bold">
                              {rhHit ? 'RH ●' : '—'}
                            </text>
                            <rect y="62" width="55" height="28" rx="3" fill={lhHit ? '#2e1065' : '#070a12'} stroke={lhHit ? '#a855f7' : '#1e293b'} />
                            <text x="27.5" y="80" textAnchor="middle" fill={lhHit ? '#d8b4fe' : '#334155'} fontSize="9" fontFamily="monospace" fontWeight="bold">
                              {lhHit ? 'LH ●' : '—'}
                            </text>
                          </g>
                        );
                      })}
                      <text x="200" y="140" textAnchor="middle" fill="#fde68a" fontSize="9" fontFamily="monospace" fontWeight="bold">
                        COMPOSITE PATTERN: [BOTH] — (wait) — [RH] — [LH] — [RH] — (wait)
                      </text>
                    </g>

                    {/* Right Box: Sight-Reading Eye-Tracking Protocol */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="152" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#10b981" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        B. SIGHT-READING EYE-TRACKING &amp; LOOKAHEAD PROTOCOL
                      </text>
                      <g transform="translate(14, 32)">
                        <rect width="372" height="34" rx="4" fill="#0f172a" stroke="#1e293b" />
                        <text x="10" y="15" fill="#34d399" fontSize="9" fontFamily="monospace" fontWeight="bold">1. READ BOTTOM-UP FOR CHORDS (BASS → TREBLE)</text>
                        <text x="10" y="28" fill="#cbd5e1" fontSize="8">Scan the Left Hand bass anchor first, then stack Right Hand upper voices.</text>

                        <rect y="40" width="372" height="34" rx="4" fill="#0f172a" stroke="#1e293b" />
                        <text x="10" y="55" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">2. 1-BEAT SACCADE LOOKAHEAD BUFFER</text>
                        <text x="10" y="68" fill="#cbd5e1" fontSize="8">Keep your eyes 1–2 beats ahead of what your fingers are currently striking.</text>

                        <rect y="80" width="372" height="34" rx="4" fill="#0f172a" stroke="#1e293b" />
                        <text x="10" y="95" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">3. PROPRIOCEPTIVE KEYBED MEMORY (NO LOOKING DOWN)</text>
                        <text x="10" y="108" fill="#cbd5e1" fontSize="8">Use the 2-black and 3-black raised key clusters by touch to stay on the screen.</text>
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
                    <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 03 • BIOMEKANIKA TANGAN & ALGORITMA PENOMORAN JARI' : isEs ? 'MÓDULO 03 • BIOMECÁNICA Y DIGITACIÓN' : 'MODULE 03 • PIANO ERGONOMICS, POSTURE & FINGERING'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      4 TECHNICAL DIAGRAMS • 6 MASTER TABLES
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {isId
                      ? 'Anatomi Jari (1–5), Geometri Duduk, Rotasi Lengan, Thumb-Under & Tabel Fingering 12 Kunci'
                      : isEs
                      ? 'Anatomía de Dedos (1–5), Postura, Rotación del Antebrazo, Paso de Pulgar y Tablas en 12 Tonalidades'
                      : 'Anatomical Fingering (1–5), Seating Geometry, Forearm Rotation, Thumb-Under & 12-Key Master Tables'}
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-3xl">
                    {isId
                      ? 'Penomoran jari (fingering) adalah rekayasa biomekanika untuk mendistribusikan beban lengan secara merata, mencegah cedera tendon, dan memungkinkan perpindahan posisi lintas oktaf tanpa terputus.'
                      : isEs
                      ? 'La digitación es ingeniería biomecánica diseñada para distribuir el peso del brazo, prevenir lesiones tendinosas y permitir desplazamientos fluidos a través del teclado.'
                      : 'Piano fingering is applied biomechanical engineering: aligning skeletal arches, transferring forearm weight without muscular co-contraction, and executing seamless thumb pivots across all 12 keys.'}
                  </p>
                </div>
                {onLaunchInGamePractice && (
                  <button
                    type="button"
                    onClick={() => onLaunchInGamePractice('scale_c', 'fingering')}
                    className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center gap-2 flex-shrink-0 shadow-sm"
                  >
                    <span>{isId ? 'Latih Fingering & Tangan 3D' : isEs ? 'Practicar Digitación 3D' : 'Launch 3D Fingering Practice'}</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              {/* FIG 3.1: Dorsal & Lateral Skeletal Hand Arch Blueprint */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 3.1 — ANATOMICAL 1–5 SYMMETRY &amp; LATERAL SKELETAL KNUCKLE ARCH (MCP / PIP / DIP)
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Simetri Penomoran Jari 1–5 (Kiri & Kanan) serta Profil Samping Lengkung Sendi Jari'
                        : 'Bilateral 1–5 Finger Symmetry (LH & RH) and Side-Profile Skeletal Joint Arch'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    RADIAL SYMMETRY: THUMB = 1 • PINKY = 5
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 310" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="310" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* PANEL A: Left & Right Hand 5-Finger Keyboard Mapping */}
                    <g transform="translate(18, 16)">
                      <rect width="500" height="278" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        A. BILATERAL 1–5 FINGER NUMBERING ON C-POSITION KEYBED
                      </text>

                      {/* Left Hand (C3–G3: 5-4-3-2-1) */}
                      <g transform="translate(20, 38)">
                        <text x="102" y="12" textAnchor="middle" fill="#818cf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          LEFT HAND (C3–G3) • 5→1 INWARD
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
                            <text x="19.5" y="82" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace" fontWeight="bold">{item.k}</text>
                            {/* Finger Vector Column */}
                            <rect x="9.5" y={100} width="20" height={item.len} rx="10" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                            <circle cx="19.5" cy="50" r="11" fill="#312e81" stroke="#818cf8" strokeWidth="1.5" />
                            <text x="19.5" y="54" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">{item.f}</text>
                            <text x="19.5" y={114 + item.len} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">{item.name}</text>
                          </g>
                        ))}
                        {/* Black keys */}
                        <rect x="29" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                        <rect x="70" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                        <rect x="152" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                      </g>

                      {/* Right Hand (C4–G4: 1-2-3-4-5) */}
                      <g transform="translate(272, 38)">
                        <text x="102" y="12" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          RIGHT HAND (C4–G4) • 1→5 OUTWARD
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
                            <text x="19.5" y="82" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace" fontWeight="bold">{item.k}</text>
                            {/* Finger Vector Column */}
                            <rect x="9.5" y={100} width="20" height={item.len} rx="10" fill="#083344" stroke="#38bdf8" strokeWidth="1.5" />
                            <circle cx="19.5" cy="50" r="11" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.5" />
                            <text x="19.5" y="54" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">{item.f}</text>
                            <text x="19.5" y={114 + item.len} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">{item.name}</text>
                          </g>
                        ))}
                        {/* Black keys */}
                        <rect x="29" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                        <rect x="70" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                        <rect x="152" y="22" width="24" height="52" rx="2" fill="#020617" stroke="#334155" />
                      </g>

                      <text x="250" y="264" textAnchor="middle" fill="#64748b" fontSize="8.5" fontFamily="monospace">
                        Anatomical Mirror: Moving UP in pitch uses 5→1 in Left Hand, but 1→5 in Right Hand.
                      </text>
                    </g>

                    {/* PANEL B: Side-Profile Skeletal Arch Comparison (Correct Dome vs Collapsed DIP) */}
                    <g transform="translate(534, 16)">
                      <rect width="308" height="278" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        B. LATERAL JOINT PROFILE (SIDE VIEW)
                      </text>

                      {/* Top Box: Correct Curved Bridge Arch */}
                      <g transform="translate(16, 36)">
                        <rect width="276" height="110" rx="5" fill="#0f172a" stroke="#10b981" strokeWidth="1.2" />
                        <text x="12" y="18" fill="#34d399" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          CORRECT: ACTIVE DOME ARCH (MCP–PIP–DIP)
                        </text>
                        {/* Piano Keybed horizontal bar */}
                        <rect x="20" y="84" width="140" height="14" rx="2" fill="#e2e8f0" />
                        <text x="85" y="94" textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="bold">PIANO KEY SURFACE</text>
                        {/* Skeletal Bone Segments: Wrist -> MCP -> PIP -> DIP -> Pad */}
                        <path d="M 235 64 L 180 42 L 122 44 L 84 60 L 68 83" fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Joint Nodes */}
                        <circle cx="235" cy="64" r="4.5" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
                        <circle cx="180" cy="42" r="4.5" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
                        <circle cx="122" cy="44" r="4.5" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
                        <circle cx="84" cy="60" r="4.5" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
                        <circle cx="68" cy="83" r="4" fill="#fbbf24" />
                        <text x="235" y="80" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">Wrist</text>
                        <text x="180" y="33" textAnchor="middle" fill="#6ee7b7" fontSize="7.5" fontFamily="monospace">MCP</text>
                        <text x="122" y="35" textAnchor="middle" fill="#6ee7b7" fontSize="7.5" fontFamily="monospace">PIP</text>
                        <text x="72" y="54" textAnchor="middle" fill="#6ee7b7" fontSize="7.5" fontFamily="monospace">DIP</text>
                      </g>

                      {/* Bottom Box: Incorrect Collapsed Distal Joint */}
                      <g transform="translate(16, 156)">
                        <rect width="276" height="108" rx="5" fill="#0f172a" stroke="#ef4444" strokeWidth="1.2" />
                        <text x="12" y="18" fill="#f87171" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          INCORRECT: COLLAPSED DIP &amp; SAGGING WRIST
                        </text>
                        <rect x="20" y="84" width="140" height="14" rx="2" fill="#e2e8f0" />
                        {/* Collapsed Bone Path */}
                        <path d="M 235 88 L 180 56 L 122 52 L 88 78 L 62 83" fill="none" stroke="#f87171" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="235" cy="88" r="4.5" fill="#0f172a" stroke="#f87171" strokeWidth="2" />
                        <circle cx="88" cy="78" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                        <text x="88" y="68" textAnchor="middle" fill="#fca5a5" fontSize="7.5" fontFamily="monospace" fontWeight="bold">Buckled DIP!</text>
                        <text x="225" y="102" textAnchor="middle" fill="#fca5a5" fontSize="7.5" fontFamily="monospace">Dropped Wrist</text>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 3.2: Full-Body Bench & Keybed Ergonomic Geometry */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                      FIG 3.2 — FULL-BODY SEATING GEOMETRY, FOREARM LEVEL &amp; PEDAL PIVOT AXIS
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Standar Geometri Kursi Piano: Sudut Siku 95°, Lengan Sejajar Tuts & Tumpuan Kaki'
                        : 'Biomechanical Bench Height, 95° Elbow Angle, Parallel Forearm Vector & Foot Grounding'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    ERGONOMIC POSTURE GUIDE
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 220" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="220" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Left Schematic: Side-view Geometric Vectors */}
                    <g transform="translate(25, 16)">
                      <rect width="380" height="188" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#94a3b8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        SIDE-PROFILE KINEMATIC CHAIN
                      </text>

                      {/* Floor Line */}
                      <line x1="20" y1="170" x2="360" y2="170" stroke="#334155" strokeWidth="2" />

                      {/* Piano Body & Keybed */}
                      <rect x="35" y="40" width="65" height="130" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      <rect x="90" y="88" width="52" height="12" rx="2" fill="#e2e8f0" />
                      <text x="67" y="65" textAnchor="middle" fill="#64748b" fontSize="8.5" fontFamily="monospace">PIANO</text>
                      {/* Damper Pedal */}
                      <path d="M 100 164 L 122 156" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />

                      {/* Bench */}
                      <rect x="235" y="122" width="75" height="10" rx="2" fill="#334155" />
                      <line x1="245" y1="132" x2="245" y2="170" stroke="#334155" strokeWidth="3" />
                      <line x1="300" y1="132" x2="300" y2="170" stroke="#334155" strokeWidth="3" />

                      {/* Kinematic Skeleton: Pelvis (255,118) -> Shoulder (250,48) -> Elbow (195,90) -> Wrist (142,88) */}
                      <line x1="255" y1="118" x2="250" y2="48" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
                      <circle cx="248" cy="32" r="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                      {/* Upper Arm & Forearm */}
                      <path d="M 250 52 L 198 90 L 142 88" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Thigh & Lower Leg to Pedal */}
                      <path d="M 255 118 L 182 124 L 124 162" fill="none" stroke="#818cf8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Joint Callouts */}
                      <circle cx="198" cy="90" r="4" fill="#10b981" />
                      <text x="198" y="106" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontFamily="monospace" fontWeight="bold">95°–105° Elbow</text>
                      <text x="295" y="75" fill="#7dd3fc" fontSize="8" fontFamily="monospace">Vertical Spine</text>
                      <text x="295" y="114" fill="#fde68a" fontSize="8" fontFamily="monospace">Front 1/2 Bench</text>
                    </g>

                    {/* Right 4 Calibration Specs */}
                    <g transform="translate(422, 16)">
                      {[
                        {
                          title: '01. BENCH HEIGHT (FOREARM PARALLEL)',
                          desc: 'Adjust seat height so the bottom of your forearm and wrist form a horizontal line level with the keybed. Never play with elbows far below the keys.',
                          col: '#10b981'
                        },
                        {
                          title: '02. BENCH DISTANCE (95°–105° ELBOW OPENNESS)',
                          desc: 'Sit far enough back that your elbows hang slightly in front of your torso and can cross freely in front of your stomach when reaching the opposite end of the keyboard.',
                          col: '#38bdf8'
                        },
                        {
                          title: '03. FRONT-HALF SIT-BONE GROUNDING',
                          desc: 'Sit on the front half of the bench—never slouch against a backrest. Your pelvis acts as a dynamic fulcrum that leans slightly left or right for extreme registers.',
                          col: '#f59e0b'
                        },
                        {
                          title: '04. HEEL-ANCHORED PEDAL FULCRUM',
                          desc: 'Keep your right heel firmly planted on the floor directly in front of the damper pedal; depress the brass pedal with the ball of your foot.',
                          col: '#a855f7'
                        },
                      ].map((spec, idx) => (
                        <g key={idx} transform={`translate(0, ${idx * 48})`}>
                          <rect width="415" height="43" rx="4" fill="#0a0f1a" stroke="#1e293b" />
                          <line x1="0" y1="0" x2="0" y2="43" stroke={spec.col} strokeWidth="3" />
                          <text x="12" y="15" fill={spec.col} fontSize="9" fontFamily="monospace" fontWeight="bold">{spec.title}</text>
                          <text x="12" y="28" fill="#cbd5e1" fontSize="8">{spec.desc.slice(0, 78)}</text>
                          <text x="12" y="38" fill="#94a3b8" fontSize="8">{spec.desc.slice(78)}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 3.3 & 3.4: Thumb-Under (Passaggio del Pollice) & Forearm Rotation Blueprint */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                      FIG 3.3 — THUMB-UNDER (PASSAGGIO DEL POLLICE), CROSSOVER &amp; FOREARM ROTATION
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Mekanika 3 Fase Thumb-Under (1-2-3 → 1-2-3-4-5) & Rotasi Lengan Bawah (Pronasi / Supinasi)'
                        : '3-Phase Thumb-Under Trajectory (1-2-3 → 1-2-3-4-5) & Axial Forearm Rotation'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    SCALAR &amp; ROTATIONAL MECHANICS
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 245" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="245" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Phase 1: 1-2-3 on C4-D4-E4 */}
                    <g transform="translate(18, 16)">
                      <rect width="262" height="212" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        PHASE 01 • PREPARATION (C4–D4–E4)
                      </text>
                      <g transform="translate(22, 34)">
                        {['C4 (1)', 'D4 (2)', 'E4 (3)', 'F4', 'G4'].map((k, i) => (
                          <g key={i} transform={`translate(${i * 43}, 0)`}>
                            <rect width="41" height="86" rx="3" fill={i < 3 ? '#083344' : '#0f172a'} stroke={i < 3 ? '#38bdf8' : '#334155'} strokeWidth="1.2" />
                            <text x="20.5" y="76" textAnchor="middle" fill="#cbd5e1" fontSize="8.5" fontFamily="monospace" fontWeight="bold">{k.split(' ')[0]}</text>
                            {i < 3 && (
                              <>
                                <circle cx="20.5" cy="42" r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="1.2" />
                                <text x="20.5" y="46" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">{i + 1}</text>
                              </>
                            )}
                          </g>
                        ))}
                        {/* Early thumb flexion arrow starting on D4 */}
                        <path d="M 22 56 Q 55 96 98 56" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" />
                      </g>
                      <text x="14" y="142" fill="#e2e8f0" fontSize="9" fontWeight="bold">Early Thumb Preparation Rule:</text>
                      <text x="14" y="158" fill="#94a3b8" fontSize="8.5">As soon as Finger 2 strikes D4, Thumb (1)</text>
                      <text x="14" y="172" fill="#94a3b8" fontSize="8.5">already releases C4 and glides horizontally</text>
                      <text x="14" y="186" fill="#94a3b8" fontSize="8.5">beneath the palm toward F4.</text>
                    </g>

                    {/* Phase 2: Thumb Tuck on F4 */}
                    <g transform="translate(298, 16)">
                      <rect width="264" height="212" rx="6" fill="#0a0f1a" stroke="#10b981" strokeWidth="1.2" />
                      <text x="14" y="20" fill="#34d399" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        PHASE 02 • THUMB-UNDER PIVOT (E4 → F4)
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
                              <text x="20.5" y="76" textAnchor="middle" fill="#cbd5e1" fontSize="8.5" fontFamily="monospace" fontWeight="bold">{k.split(' ')[0]}</text>
                              {isE && (
                                <>
                                  <circle cx="20.5" cy="36" r="9.5" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.2" />
                                  <text x="20.5" y="40" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontFamily="monospace" fontWeight="bold">3</text>
                                </>
                              )}
                              {isF && (
                                <>
                                  <circle cx="20.5" cy="46" r="11" fill="#059669" stroke="#fde047" strokeWidth="1.8" />
                                  <text x="20.5" y="50" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontFamily="monospace" fontWeight="bold">1</text>
                                </>
                              )}
                            </g>
                          );
                        })}
                        <path d="M 106 46 Q 128 72 150 48" fill="none" stroke="#fde047" strokeWidth="2.5" />
                      </g>
                      <text x="14" y="142" fill="#6ee7b7" fontSize="9" fontWeight="bold">Zero-Elbow-Flap Constraint:</text>
                      <text x="14" y="158" fill="#cbd5e1" fontSize="8.5">Finger 3 acts as a quiet pivot post on E4 while</text>
                      <text x="14" y="172" fill="#cbd5e1" fontSize="8.5">Thumb (1) flexes at the CMC joint to play F4.</text>
                      <text x="14" y="186" fill="#fde68a" fontSize="8.5">Keep wrist level; do not kick your elbow out!</text>
                    </g>

                    {/* Phase 3: Unfold 2-3-4-5 & Forearm Rotation */}
                    <g transform="translate(580, 16)">
                      <rect width="262" height="212" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#a855f7" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        PHASE 03 • UNFOLD &amp; FOREARM ROTATION
                      </text>
                      <g transform="translate(18, 34)">
                        {['F4 (1)', 'G4 (2)', 'A4 (3)', 'B4 (4)', 'C5 (5)'].map((k, i) => (
                          <g key={i} transform={`translate(${i * 44}, 0)`}>
                            <rect width="42" height="86" rx="3" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.2" />
                            <text x="21" y="76" textAnchor="middle" fill="#cbd5e1" fontSize="8.5" fontFamily="monospace" fontWeight="bold">{k.split(' ')[0]}</text>
                            <circle cx="21" cy="42" r="10" fill="#4338ca" stroke="#ffffff" strokeWidth="1.2" />
                            <text x="21" y="46" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">{i + 1}</text>
                          </g>
                        ))}
                      </g>
                      <text x="14" y="142" fill="#d8b4fe" fontSize="9" fontWeight="bold">Lateral Glide &amp; Axial Rotation:</text>
                      <text x="14" y="158" fill="#94a3b8" fontSize="8.5">Once Thumb (1) lands on F4, the entire hand</text>
                      <text x="14" y="172" fill="#94a3b8" fontSize="8.5">glides laterally over G4–C5. When descending,</text>
                      <text x="14" y="186" fill="#94a3b8" fontSize="8.5">cross Finger 3 (or 4) smoothly OVER Thumb (1).</text>
                    </g>
                  </svg>
                </div>

                {/* 3 Biomechanical Vectors Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-mono font-bold text-cyan-400">1. Vertical Arm Weight Transfer</div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Jangan memukul tuts hanya dengan otot jari yang kaku. Biarkan gravitasi dan beban lengan jatuh secara elastis ke dasar tuts (keybed), lalu rilekskan pergelangan segera setelah bunyi tercipta.'
                        : 'Channel gravity from the shoulder and forearm into the keybed through a resilient knuckle bridge, releasing muscular tension the instant after sound production.'}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-mono font-bold text-emerald-400">2. Forearm Rotation (Pronation / Supination)</div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Putar poros tulang hasta-pengumpil (seperti memutar gagang pintu) untuk memindahkan berat antara Jari 1 (dalam) dan Jari 5 (luar). Kunci utama memainkan Alberti Bass (C-G-E-G) dan broken octaves tanpa lelah.'
                        : 'Rotate the radius-ulna forearm axis (like turning a doorknob) to rock weight rapidly between Thumb (1) and Pinky (5) during Alberti bass, tremolos, and broken octaves.'}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-mono font-bold text-amber-400">3. Black-Key Depth &amp; Thumb Avoidance</div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Karena jempol berukuran pendek, hindari menempatkan Jari 1 di tuts hitam pada jalur tangga nada. Saat banyak tuts hitam dimainkan, majukan posisi tangan sedikit lebih dalam ke arah fallboard.'
                        : 'Because the thumb is shorter than fingers 2–4, avoid placing Finger 1 on black keys during scalar runs (preventing awkward wrist twists), and move the hand slightly deeper into the keybed.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* TABLE B2: 12-KEY MAJOR SCALE MASTER FINGERING TABLE */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      SECTION 3.4 • 12-KEY MAJOR SCALE FINGERING CHART (1-OCTAVE STANDARD)
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {isId
                        ? 'Tabel Master Fingering Tangga Nada Mayor 12 Kunci (Tangan Kanan & Kiri)'
                        : '12-Key Major Scale Master Fingering Table (Right Hand & Left Hand)'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/50 px-2.5 py-1 rounded border border-cyan-500/30">
                    HANON / CZERNY / ABRSM VERIFIED
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400 bg-slate-900/80">
                        <th className="py-2.5 px-3">Key</th>
                        <th className="py-2.5 px-3">Scale Degrees (1 – 8)</th>
                        <th className="py-2.5 px-3 text-cyan-400">RH Ascending</th>
                        <th className="py-2.5 px-3 text-cyan-300">RH Descending</th>
                        <th className="py-2.5 px-3 text-indigo-400">LH Ascending</th>
                        <th className="py-2.5 px-3 text-indigo-300">LH Descending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-200">
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">C Major</td><td className="py-2 px-3 text-slate-400">C D E F G A B C</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">G Major</td><td className="py-2 px-3 text-slate-400">G A B C D E F♯ G</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">D Major</td><td className="py-2 px-3 text-slate-400">D E F♯ G A B C♯ D</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">A Major</td><td className="py-2 px-3 text-slate-400">A B C♯ D E F♯ G♯ A</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">E Major</td><td className="py-2 px-3 text-slate-400">E F♯ G♯ A B C♯ D♯ E</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">B Major</td><td className="py-2 px-3 text-slate-400">B C♯ D♯ E F♯ G♯ A♯ B</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-amber-300 font-bold">4-3-2-1-4-3-2-1</td><td className="py-2 px-3">1-2-3-4-1-2-3-4</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">F♯ Major</td><td className="py-2 px-3 text-slate-400">F♯ G♯ A♯ B C♯ D♯ E♯ F♯</td><td className="py-2 px-3 text-amber-300 font-bold">2-3-4-1-2-3-1-2</td><td className="py-2 px-3">2-1-3-2-1-4-3-2</td><td className="py-2 px-3 text-amber-300 font-bold">4-3-2-1-3-2-1-4</td><td className="py-2 px-3">4-1-2-3-1-2-3-4</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">D♭ Major</td><td className="py-2 px-3 text-slate-400">D♭ E♭ F G♭ A♭ B♭ C D♭</td><td className="py-2 px-3 text-amber-300 font-bold">2-3-1-2-3-4-1-2</td><td className="py-2 px-3">2-1-4-3-2-1-3-2</td><td className="py-2 px-3 text-amber-300 font-bold">3-2-1-4-3-2-1-3</td><td className="py-2 px-3">3-1-2-3-4-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">A♭ Major</td><td className="py-2 px-3 text-slate-400">A♭ B♭ C D♭ E♭ F G A♭</td><td className="py-2 px-3 text-amber-300 font-bold">3-4-1-2-3-1-2-3</td><td className="py-2 px-3">3-2-1-3-2-1-4-3</td><td className="py-2 px-3 text-amber-300 font-bold">3-2-1-4-3-2-1-3</td><td className="py-2 px-3">3-1-2-3-4-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">E♭ Major</td><td className="py-2 px-3 text-slate-400">E♭ F G A♭ B♭ C D E♭</td><td className="py-2 px-3 text-amber-300 font-bold">3-1-2-3-4-1-2-3</td><td className="py-2 px-3">3-2-1-4-3-2-1-3</td><td className="py-2 px-3 text-amber-300 font-bold">3-2-1-4-3-2-1-3</td><td className="py-2 px-3">3-1-2-3-4-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">B♭ Major</td><td className="py-2 px-3 text-slate-400">B♭ C D E♭ F G A B♭</td><td className="py-2 px-3 text-amber-300 font-bold">4-1-2-3-1-2-3-4</td><td className="py-2 px-3">4-3-2-1-3-2-1-4</td><td className="py-2 px-3 text-amber-300 font-bold">3-2-1-4-3-2-1-3</td><td className="py-2 px-3">3-1-2-3-4-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-emerald-300">F Major</td><td className="py-2 px-3 text-slate-400">F G A B♭ C D E F</td><td className="py-2 px-3 text-emerald-300 font-bold">1-2-3-4-1-2-3-4</td><td className="py-2 px-3">4-3-2-1-4-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLE C2: 12-KEY NATURAL MINOR SCALE MASTER FINGERING TABLE */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                      SECTION 3.5 • 12-KEY NATURAL, HARMONIC & MELODIC MINOR FINGERING
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {isId
                        ? 'Tabel Master Fingering Tangga Nada Minor Asli (12 Kunci)'
                        : '12-Key Natural Minor Scale Master Fingering Table'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/50 px-2.5 py-1 rounded border border-indigo-500/30">
                    BLACK-KEY TONIC ADJUSTED
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400 bg-slate-900/80">
                        <th className="py-2.5 px-3">Minor Key</th>
                        <th className="py-2.5 px-3">Rel. Major</th>
                        <th className="py-2.5 px-3 text-cyan-400">RH Ascending</th>
                        <th className="py-2.5 px-3 text-cyan-300">RH Descending</th>
                        <th className="py-2.5 px-3 text-indigo-400">LH Ascending</th>
                        <th className="py-2.5 px-3 text-indigo-300">LH Descending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-200">
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">A Minor</td><td className="py-2 px-3 text-slate-400">C (0)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">E Minor</td><td className="py-2 px-3 text-slate-400">G (1♯)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">D Minor</td><td className="py-2 px-3 text-slate-400">F (1♭)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">G Minor</td><td className="py-2 px-3 text-slate-400">B♭ (2♭)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr><td className="py-2 px-3 font-sans font-bold text-white">C Minor</td><td className="py-2 px-3 text-slate-400">E♭ (3♭)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">B Minor</td><td className="py-2 px-3 text-slate-400">D (2♯)</td><td className="py-2 px-3 text-cyan-300 font-bold">1-2-3-1-2-3-4-5</td><td className="py-2 px-3">5-4-3-2-1-3-2-1</td><td className="py-2 px-3 text-amber-300 font-bold">4-3-2-1-4-3-2-1</td><td className="py-2 px-3">1-2-3-4-1-2-3-4</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">F♯ Minor</td><td className="py-2 px-3 text-slate-400">A (3♯)</td><td className="py-2 px-3 text-amber-300 font-bold">2-3-1-2-3-1-2-3</td><td className="py-2 px-3">3-2-1-3-2-1-3-2</td><td className="py-2 px-3 text-amber-300 font-bold">4-3-2-1-3-2-1-4</td><td className="py-2 px-3">4-1-2-3-1-2-3-4</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">C♯ Minor</td><td className="py-2 px-3 text-slate-400">E (4♯)</td><td className="py-2 px-3 text-amber-300 font-bold">2-3-1-2-3-1-2-3</td><td className="py-2 px-3">3-2-1-3-2-1-3-2</td><td className="py-2 px-3 text-amber-300 font-bold">3-2-1-4-3-2-1-3</td><td className="py-2 px-3">3-1-2-3-4-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">G♯ Minor</td><td className="py-2 px-3 text-slate-400">B (5♯)</td><td className="py-2 px-3 text-amber-300 font-bold">2-3-1-2-3-1-2-3</td><td className="py-2 px-3">3-2-1-3-2-1-3-2</td><td className="py-2 px-3 text-amber-300 font-bold">3-2-1-3-2-1-4-3</td><td className="py-2 px-3">3-4-1-2-3-1-2-3</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">D♯ / E♭ Min</td><td className="py-2 px-3 text-slate-400">F♯ / G♭</td><td className="py-2 px-3 text-amber-300 font-bold">2-1-2-3-4-1-2-3</td><td className="py-2 px-3">3-2-1-4-3-2-1-2</td><td className="py-2 px-3 text-amber-300 font-bold">2-1-4-3-2-1-3-2</td><td className="py-2 px-3">2-3-1-2-3-4-1-2</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-amber-300">B♭ Minor</td><td className="py-2 px-3 text-slate-400">D♭ (5♭)</td><td className="py-2 px-3 text-amber-300 font-bold">4-1-2-3-1-2-3-4</td><td className="py-2 px-3">4-3-2-1-3-2-1-4</td><td className="py-2 px-3 text-amber-300 font-bold">2-1-3-2-1-4-3-2</td><td className="py-2 px-3">2-3-4-1-2-3-1-2</td></tr>
                      <tr className="bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-emerald-300">F Minor</td><td className="py-2 px-3 text-slate-400">A♭ (4♭)</td><td className="py-2 px-3 text-emerald-300 font-bold">1-2-3-4-1-2-3-4</td><td className="py-2 px-3">4-3-2-1-4-3-2-1</td><td className="py-2 px-3 text-indigo-300 font-bold">5-4-3-2-1-3-2-1</td><td className="py-2 px-3">1-2-3-1-2-3-4-5</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLES D2, E2, F2, G2, H2: Chromatic, Arpeggios, Intervals & Chords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-mono font-bold text-amber-400">CHROMATIC SCALE &amp; 1-OCTAVE ARPEGGIO FINGERING</span>
                    <span className="text-[10px] font-mono text-slate-400">PATTERN ENGINE</span>
                  </div>
                  <div className="space-y-2.5 text-slate-300">
                    <div className="p-3 bg-slate-900/70 rounded-lg border border-slate-800">
                      <div className="font-mono font-bold text-amber-300 mb-1">Chromatic Scale (≥4 Semitones):</div>
                      <p className="text-[11px] leading-relaxed">
                        • Black Keys: Always <b>Finger 3 (Middle)</b> in both hands.<br />
                        • White Keys: <b>Finger 1 (Thumb)</b>, except adjacent white pairs <b>E–F</b> and <b>B–C</b> which use <b>1–2</b> (RH Asc / LH Desc) and <b>2–1</b> (RH Desc / LH Asc).
                      </p>
                    </div>
                    <div className="p-3 bg-slate-900/70 rounded-lg border border-slate-800">
                      <div className="font-mono font-bold text-emerald-300 mb-1">1-Octave Arpeggio Triads &amp; Dom7:</div>
                      <p className="text-[11px] font-mono leading-relaxed">
                        • White Root (C–E–G–C): RH <b>1-2-3-5</b> | LH <b>5-4-2-1</b> (or 5-3-2-1)<br />
                        • Black Root (D♭–F–A♭–D♭): RH <b>2-1-2-4</b> | LH <b>2-1-4-2</b><br />
                        • Dom7 Arpeggio (4 notes + 8ve): RH <b>1-2-3-4-5</b> | LH <b>5-4-3-2-1</b>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-mono font-bold text-cyan-400">HARMONIC INTERVALS &amp; CHORD INVERSION FINGERING</span>
                    <span className="text-[10px] font-mono text-slate-400">POLYPHONIC VOICING</span>
                  </div>
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="py-1.5">Structure / Span</th>
                        <th className="py-1.5 text-cyan-400">Right Hand (RH)</th>
                        <th className="py-1.5 text-indigo-400">Left Hand (LH)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      <tr><td className="py-1.5">Dyad 2nd / 3rd / 4th</td><td className="text-cyan-300">1–2 / 1–3 / 1–4</td><td className="text-indigo-300">2–1 / 3–1 / 4–1</td></tr>
                      <tr><td className="py-1.5">Dyad 5th / 6th / 8ve</td><td className="text-cyan-300">1–5</td><td className="text-indigo-300">5–1</td></tr>
                      <tr><td className="py-1.5">Triad Root Position (5/3)</td><td className="text-cyan-300 font-bold">1 – 3 – 5</td><td className="text-indigo-300 font-bold">5 – 3 – 1</td></tr>
                      <tr><td className="py-1.5">Triad 1st Inversion (6/3)</td><td className="text-cyan-300 font-bold">1 – 2 – 5</td><td className="text-indigo-300 font-bold">5 – 3 – 1</td></tr>
                      <tr><td className="py-1.5">Triad 2nd Inversion (6/4)</td><td className="text-cyan-300 font-bold">1 – 3 – 5</td><td className="text-indigo-300 font-bold">5 – 2 – 1</td></tr>
                      <tr><td className="py-1.5">4-Note 7th / Triad+8ve</td><td className="text-cyan-300 font-bold">1 – 2 – 3 – 5</td><td className="text-indigo-300 font-bold">5 – 3 – 2 – 1</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3.6: 6 Common Biomechanical Faults & Diagnostic Remediation Matrix */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest block">
                      SECTION 3.6 — BIOMECHANICAL DIAGNOSTICS &amp; INJURY PREVENTION
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {isId
                        ? '6 Kesalahan Postur Umum Pemula & Koreksi Anatomisnya'
                        : '6 Common Biomechanical Faults & Anatomical Remediation'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    TENDON SAFETY
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
                      fault: '02. Ulnar Wrist Deviation',
                      symptom: isId ? 'Pergelangan tangan membengkok miring ke samping luar menuju kelingking.' : isEs ? 'La muñeca se desvía bruscamente hacia el lado del meñique.' : 'Wrist twists sharply outward toward the pinky side.',
                      fix: isId ? 'Geser seluruh lengan bawah secara horizontal (lateral tracking) agar garis jari ke siku tetap lurus.' : isEs ? 'Desplaza todo el antebrazo lateralmente para mantener la alineación recta con el codo.' : 'Shift the entire forearm laterally so the middle finger aligns straight down the radius/ulna.'
                    },
                    {
                      fault: '03. Extensor Pinky Tension (Flying 5th)',
                      symptom: isId ? 'Jari kelingking (5) terangkat kaku ke udara saat jari 1–3 bermain.' : isEs ? 'El meñique (5) se levanta rígido al tocar con los dedos 1 a 3.' : 'Finger 5 curls or sticks straight up in the air involuntarily.',
                      fix: isId ? 'Lepaskan ketegangan tendon ekstensor; biarkan jari 5 menyentuh permukaan tuts dengan rileks.' : isEs ? 'Libera la tensión del extensor; deja que el dedo 5 repose relajado sobre las teclas.' : 'Consciously release extensor co-contraction; let Finger 5 rest lightly on key surfaces.'
                    },
                    {
                      fault: '04. Dropped / Sagging Carpal Tunnel',
                      symptom: isId ? 'Pergelangan jatuh di bawah bibir kayu piano, menekan saraf median.' : isEs ? 'La muñeca cae por debajo del nivel de las teclas, comprimiendo tendones.' : 'Wrist hangs below the keybed lip, compressing carpal tendons.',
                      fix: isId ? 'Naikkan tinggi kursi dan jaga jembatan pergelangan mengapung sejajar permukaan tuts putih.' : isEs ? 'Eleva el banquillo y mantén el puente de la muñeca flotando nivelado.' : 'Raise bench height and maintain a buoyant, level carpal bridge.'
                    },
                    {
                      fault: '05. Thumb Abduction Clamping',
                      symptom: isId ? 'Jempol menekan erat ke telunjuk saat memainkan oktaf atau akor lebar.' : isEs ? 'El pulgar se aprieta contra el índice al tocar octavas o acordes anchos.' : 'Thumb squeezes inward against the index finger during octaves.',
                      fix: isId ? 'Buka sendi pangkal jempol (CMC) secara longgar; sangga rentangan oktaf dengan struktur kubah telapak.' : isEs ? 'Abre la articulación basal del pulgar relajadamente; apoya el alcance con el arco de la palma.' : 'Release the adductor pollicis muscle; support wide spans from the metacarpal arch.'
                    },
                    {
                      fault: '06. Trapezius / Shoulder Elevation',
                      symptom: isId ? 'Bahu terangkat naik ke arah telinga saat menghadapi bagian tempo cepat.' : isEs ? 'Los hombros se encogen hacia las orejas en pasajes rápidos.' : 'Shoulders hike up toward the ears during fast scalar passages.',
                      fix: isId ? 'Hembuskan napas saat frase sulit; jatuhkan tulang belikat ke bawah agar beban lengan mengalir bebas.' : isEs ? 'Exhala en pasajes difíciles y relaja los omóplatos hacia abajo para fluir con el peso del brazo.' : 'Exhale into fast passages and drop the scapulae down so arm weight flows freely.'
                    },
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                      <div className="font-mono font-bold text-rose-400">{item.fault}</div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{item.symptom}</p>
                      <div className="pt-1.5 border-t border-slate-800/80 text-emerald-300 text-[11px] leading-relaxed">
                        <strong className="font-mono text-[10px] uppercase">FIX: </strong>{item.fix}
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
                    <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 04 • MESIN KEYBOARD KOMPUTER & PIANO VIRTUAL 61-TUTS' : isEs ? 'MÓDULO 04 • TECLADO DE PC Y PIANO VIRTUAL' : 'MODULE 04 • PC KEYBOARD ENGINE & 61-KEY VIRTUAL PIANO'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      3 TECHNICAL DIAGRAMS • FULL 61-KEY MATRIX
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {isId
                      ? 'Masterclass Keyboard PC: Qwerty Typer, Sheet Music QWERTY & Peta 61-Tuts Roblox (MIRP)'
                      : isEs
                      ? 'Teclado de PC: Qwerty Typer, Partituras QWERTY y Mapa Completo de 61 Teclas (MIRP)'
                      : 'PC Keyboard Architecture: Qwerty Typer, Sheet Music QWERTY & Full 61-Key MIRP Matrix'}
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-3xl">
                    {isId
                      ? 'Octavia mengubah keyboard laptop atau mechanical keyboard PC Anda menjadi instrumen polifonik 5-oktaf (C2 hingga C7) dengan dua mode tampilan interaktif real-time dan dua skema pemetaan tombol (Roblox MIRP & Standard Compact).'
                      : isEs
                      ? 'Octavia convierte el teclado de tu ordenador en un instrumento polifónico de 5 octavas (C2 a C7) con dos vistas interactivas en tiempo real y dos esquemas de mapeo.'
                      : 'Octavia transforms any laptop or mechanical PC keyboard into a 5-octave polyphonic instrument (C2 to C7) featuring two real-time interactive visual engines and two configurable key-mapping topologies.'}
                  </p>
                </div>
                {onLaunchInGamePractice && (
                  <button
                    type="button"
                    onClick={() => onLaunchInGamePractice('fur_elise', 'roblox')}
                    className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center gap-2 flex-shrink-0 shadow-sm"
                  >
                    <span>{isId ? 'Coba Mode QWERTY Sekarang' : isEs ? 'Probar Modo QWERTY' : 'Launch QWERTY Practice'}</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              {/* FIG 4.1: Dual PC Game Views Viewport Comparison */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 4.1 — DUAL PC KEYBOARD VIEWPORT ARCHITECTURE (QWERTY TYPER vs. SHEET MUSIC QWERTY)
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Perbandingan Visualisasi Qwerty Typer (Kotak Target Mengecil & Indikator Merah Tuts Hitam) vs. Partitur QWERTY'
                        : 'Viewport Comparison: Spatial Qwerty Typer Reticles vs. Grand Staff QWERTY Notehead Badges'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    SETTINGS &gt; GAME VIEW
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 285" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="285" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Left Viewport: Qwerty Typer */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="252" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        VIEWPORT 01 • QWERTY TYPER (SPATIAL KEYGRID OVERLAY)
                      </text>

                      {/* 4 Key Rows Mock */}
                      <g transform="translate(20, 36)">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((k, i) => (
                          <g key={`r1-${i}`} transform={`translate(${i * 36}, 0)`}>
                            <rect width="32" height="30" rx="4" fill={k === '8' ? '#451a03' : '#0f172a'} stroke={k === '8' ? '#f59e0b' : '#334155'} strokeWidth={k === '8' ? 1.8 : 1} />
                            <text x="16" y="19" textAnchor="middle" fill={k === '8' ? '#fde68a' : '#94a3b8'} fontSize="10" fontFamily="monospace" fontWeight="bold">{k}</text>
                          </g>
                        ))}
                        {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map((k, i) => (
                          <g key={`r2-${i}`} transform={`translate(${8 + i * 35}, 38)`}>
                            <rect width="32" height="30" rx="4" fill={k === 't' ? '#083344' : '#0f172a'} stroke={k === 't' ? '#38bdf8' : '#334155'} strokeWidth={k === 't' ? 1.8 : 1} />
                            <text x="16" y="19" textAnchor="middle" fill={k === 't' ? '#7dd3fc' : '#cbd5e1'} fontSize="10" fontFamily="monospace" fontWeight="bold">{k}</text>
                          </g>
                        ))}
                        {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map((k, i) => (
                          <g key={`r3-${i}`} transform={`translate(${18 + i * 35}, 76)`}>
                            <rect width="32" height="30" rx="4" fill="#0f172a" stroke="#334155" />
                            <text x="16" y="19" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace" fontWeight="bold">{k}</text>
                          </g>
                        ))}
                        {['z', 'x', 'c', 'v', 'b', 'n', 'm'].map((k, i) => (
                          <g key={`r4-${i}`} transform={`translate(${48 + i * 35}, 114)`}>
                            <rect width="32" height="30" rx="4" fill="#0f172a" stroke="#334155" />
                            <text x="16" y="19" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace" fontWeight="bold">{k}</text>
                          </g>
                        ))}

                        {/* Approaching Cyan Target Box on [t] */}
                        <rect x="142" y="32" width="44" height="42" rx="6" fill="none" stroke="#38bdf8" strokeWidth="2" />
                        {/* Approaching Red Sharp Target Box on [y] */}
                        <rect x="176" y="31" width="46" height="44" rx="6" fill="none" stroke="#f43f5e" strokeWidth="2.2" />
                      </g>

                      <rect x="16" y="192" width="368" height="48" rx="4" fill="#0f172a" stroke="#1e293b" />
                      <text x="26" y="210" fill="#7dd3fc" fontSize="9" fontFamily="monospace" fontWeight="bold">
                        • Cyan/Amber Reticle = Natural White Key (Press when box matches key)
                      </text>
                      <text x="26" y="227" fill="#fda4af" fontSize="9" fontFamily="monospace" fontWeight="bold">
                        • Red Reticle (#f43f5e) = Sharp / Black Key on that physical keycap
                      </text>
                    </g>

                    {/* Right Viewport: Sheet Music QWERTY */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="252" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="16" y="22" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        VIEWPORT 02 • SHEET MUSIC QWERTY (GRAND STAFF + KEY BADGES)
                      </text>

                      <g transform="translate(20, 42)">
                        {/* Staff Lines */}
                        {[0, 12, 24, 36, 48].map((y, i) => (
                          <line key={`st1-${i}`} x1="65" y1={10 + y} x2="355" y2={10 + y} stroke="#334155" strokeWidth="1.3" />
                        ))}
                        {[0, 12, 24, 36, 48].map((y, i) => (
                          <line key={`st2-${i}`} x1="65" y1={84 + y} x2="355" y2={84 + y} stroke="#334155" strokeWidth="1.3" />
                        ))}
                        <text x="72" y="48" fill="#38bdf8" fontSize="30" fontFamily="serif">𝄞</text>
                        <text x="72" y="118" fill="#818cf8" fontSize="26" fontFamily="serif">𝄢</text>

                        {/* Playhead */}
                        <line x1="140" y1="2" x2="140" y2="140" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />

                        {/* Notes with stamped QWERTY letters */}
                        {[
                          { x: 140, y: 70, key: 't', pitch: 'C4', col: '#f59e0b', ledger: true },
                          { x: 195, y: 58, key: 'u', pitch: 'E4', col: '#38bdf8', ledger: false },
                          { x: 250, y: 46, key: 'o', pitch: 'G4', col: '#38bdf8', ledger: false },
                          { x: 305, y: 28, key: 's', pitch: 'C5', col: '#38bdf8', ledger: false },
                          { x: 140, y: 114, key: '8', pitch: 'C3', col: '#818cf8', ledger: false },
                        ].map((n, idx) => (
                          <g key={idx} transform={`translate(${n.x}, ${n.y})`}>
                            {n.ledger && <line x1="-14" y1="0" x2="14" y2="0" stroke="#f59e0b" strokeWidth="1.8" />}
                            <ellipse cx="0" cy="0" rx="9.5" ry="7" fill={n.col} />
                            <text x="0" y="3.5" textAnchor="middle" fill="#020617" fontSize="9.5" fontFamily="monospace" fontWeight="bold">{n.key}</text>
                          </g>
                        ))}
                      </g>

                      <rect x="16" y="192" width="368" height="48" rx="4" fill="#0f172a" stroke="#1e293b" />
                      <text x="26" y="210" fill="#e2e8f0" fontSize="9" fontFamily="monospace" fontWeight="bold">
                        • Stamped Key Badges: [t]=C4, [u]=E4, [o]=G4, [8]=C3 directly on noteheads
                      </text>
                      <text x="26" y="227" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                        • Builds real Grand Staff sight-reading while playing on a PC keyboard
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 4.2: Complete 61-Key Roblox (MIRP) Master Keyboard Pitch Map */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                      FIG 4.2 — COMPLETE 61-KEY ROBLOX (MIRP) VIRTUAL PIANO MASTER KEYBOARD MAP (C2 — C7)
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Peta Lengkap 61-Tuts Roblox / Virtual Piano (MIRP): Baris Angka, QWERTY, ASDF, ZXCV & Kombinasi Shift'
                        : 'Complete 61-Key Roblox / Virtual Piano (MIRP) Pitch Matrix: White Keys & Shift Black Keys'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-950/50 px-2.5 py-1 rounded border border-amber-500/30">
                    KEY [t] = MIDDLE C4 (MIDI 60)
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 320" className="w-full min-w-[780px] h-auto select-none font-sans">
                    <rect width="860" height="320" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* ROW 1: 1 2 3 4 5 6 7 8 9 0 (C2 to E3) */}
                    <text x="20" y="26" fill="#94a3b8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
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
                        <text x="66" y="18" textAnchor="end" fill="#818cf8" fontSize="10" fontFamily="monospace" fontWeight="bold">{item.p}</text>
                        <text x="38" y="37" textAnchor="middle" fill={item.sh === '—' ? '#475569' : '#f59e0b'} fontSize="8.5" fontFamily="monospace">
                          {item.sh === '—' ? 'No Black Key' : `⇧ ${item.sh}`}
                        </text>
                      </g>
                    ))}

                    {/* ROW 2: q w e r t y u i o p (F3 to A4) */}
                    <text x="20" y="100" fill="#94a3b8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
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
                        <text x="66" y="18" textAnchor="end" fill={item.mid ? '#fde68a' : '#38bdf8'} fontSize="10" fontFamily="monospace" fontWeight="bold">{item.p}</text>
                        <text x="38" y="37" textAnchor="middle" fill={item.sh === '—' ? '#475569' : '#f59e0b'} fontSize="8.5" fontFamily="monospace">
                          {item.sh === '—' ? 'No Black Key' : `⇧ ${item.sh}`}
                        </text>
                      </g>
                    ))}

                    {/* ROW 3: a s d f g h j k l (B4 to C6) */}
                    <text x="20" y="174" fill="#94a3b8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
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
                        <text x="74" y="18" textAnchor="end" fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold">{item.p}</text>
                        <text x="42" y="37" textAnchor="middle" fill={item.sh === '—' ? '#475569' : '#f59e0b'} fontSize="8.5" fontFamily="monospace">
                          {item.sh === '—' ? 'No Black Key' : `⇧ ${item.sh}`}
                        </text>
                      </g>
                    ))}

                    {/* ROW 4: z x c v b n m (D6 to C7) */}
                    <text x="20" y="248" fill="#94a3b8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
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
                        <text x="96" y="18" textAnchor="end" fill="#fbbf24" fontSize="10" fontFamily="monospace" fontWeight="bold">{item.p}</text>
                        <text x="54" y="37" textAnchor="middle" fill={item.sh === '—' ? '#475569' : '#f59e0b'} fontSize="8.5" fontFamily="monospace">
                          {item.sh === '—' ? 'No Black Key' : item.k === 'm' ? 'Top Key (MIDI 96)' : `⇧ ${item.sh}`}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* FIG 4.3: Standard Compact 2-Octave Layout & Virtual Piano Syntax Decoder */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                      FIG 4.3 — STANDARD COMPACT 2-TIER CHROMATIC LAYOUT &amp; SHEET SYNTAX DECODER
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Tata Letak Compact (Tanpa Shift untuk Tuts Hitam) & Cara Membaca Sintaks Virtual Piano'
                        : 'Standard Compact Layout (Zero-Shift Black Keys) & Virtual Piano Sheet Syntax'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    DAW / TRACKER STYLE
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 195" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="195" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Left Box: Upper Octave Q-P + 2 3 5 6 7 */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="162" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        UPPER OCTAVE TIER • WHITE [Q–P] + BLACK [2 3 5 6 7]
                      </text>
                      {/* White Keys Q W E R T Y U I O P */}
                      {['Q:C4', 'W:D4', 'E:E4', 'R:F4', 'T:G4', 'Y:A4', 'U:B4', 'I:C5', 'O:D5', 'P:E5'].map((item, i) => (
                        <g key={i} transform={`translate(${16 + i * 37}, 82)`}>
                          <rect width="34" height="62" rx="3" fill="#0f172a" stroke="#0284c7" strokeWidth="1.2" />
                          <text x="17" y="26" textAnchor="middle" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="bold">{item.split(':')[0]}</text>
                          <text x="17" y="50" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontFamily="monospace">{item.split(':')[1]}</text>
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
                          <text x="15" y="18" textAnchor="middle" fill="#fde68a" fontSize="10" fontFamily="monospace" fontWeight="bold">{bk.k}</text>
                          <text x="15" y="34" textAnchor="middle" fill="#f59e0b" fontSize="7.5" fontFamily="monospace">{bk.p}</text>
                        </g>
                      ))}
                    </g>

                    {/* Right Box: Lower Octave Z-M + S D G H J */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="162" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#818cf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        LOWER OCTAVE TIER • WHITE [Z–M] + BLACK [S D G H J]
                      </text>
                      {['Z:C3', 'X:D3', 'C:E3', 'V:F3', 'B:G3', 'N:A3', 'M:B3'].map((item, i) => (
                        <g key={i} transform={`translate(${24 + i * 48}, 82)`}>
                          <rect width="44" height="62" rx="3" fill="#0f172a" stroke="#6366f1" strokeWidth="1.2" />
                          <text x="22" y="26" textAnchor="middle" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="bold">{item.split(':')[0]}</text>
                          <text x="22" y="50" textAnchor="middle" fill="#a5b4fc" fontSize="8.5" fontFamily="monospace">{item.split(':')[1]}</text>
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
                          <text x="17" y="18" textAnchor="middle" fill="#fde68a" fontSize="10" fontFamily="monospace" fontWeight="bold">{bk.k}</text>
                          <text x="17" y="34" textAnchor="middle" fill="#f59e0b" fontSize="7.5" fontFamily="monospace">{bk.p}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                </div>

                {/* Syntax & Hardware Engineering Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="font-mono font-bold text-amber-400">1. Virtual Piano Bracket Syntax</div>
                    <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                      • <b>[tuo]</b> = Press t, u, o simultaneously (C Major Triad)<br />
                      • <b>[t-u-o]</b> = Roll/arpeggiate rapidly from left to right<br />
                      • <b>T Y I</b> = Capital letters / symbols require Shift
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="font-mono font-bold text-cyan-400">2. Live Transposition Strategy (↑ / ↓)</div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Dalam permainan keyboard PC, akor yang mencampurkan huruf kecil dan huruf kapital (Shift + non-Shift sekaligus) sulit dieksekusi. Gunakan tombol panah Atas/Bawah untuk menggeser semitone lagu ke kunci C Mayor / A Minor.'
                        : 'Mixed chords containing both unshifted naturals and shifted accidentals are awkward on a PC keyboard. Use the Up/Down arrow keys to transpose the key signature toward C Major / A Minor.'}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-900/70 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="font-mono font-bold text-emerald-400">3. NKRO vs. Membrane Matrix Ghosting</div>
                    <p className="text-slate-300 leading-relaxed">
                      {isId
                        ? 'Keyboard membran kantor umumnya membatasi 2–3 tombol bersamaan (2KRO/6KRO). Untuk memainkan akor 4–6 nada tanpa input yang hilang, gunakan keyboard mekanikal dengan fitur N-Key Rollover (NKRO).'
                        : 'Standard office membrane keyboards suffer from matrix blocking when 3+ keys share a circuit row. Mechanical keyboards with diode-isolated N-Key Rollover (NKRO) register unlimited simultaneous chord tones.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4.4: Complete PC Keyboard Transposition Masterclass & Controls */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      SECTION 4.4 — LIVE TRANSPOSITION ENGINE, ZERO-SHIFT STRATEGY &amp; PC CONTROLS
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-0.5">
                      {isId
                        ? 'Panduan Lengkap Transposisi Nada Real-Time di Keyboard PC & Strategi Bebas-Shift'
                        : isEs
                        ? 'Guía Completa de Transposición en Tiempo Real para Teclado PC y Estrategia Sin Shift'
                        : 'Complete PC Keyboard Real-Time Transposition Guide & Zero-Shift Strategy'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    ARROW UP (↑) / ARROW DOWN (↓)
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
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isId
                        ? 'Tekan tombol Panah Atas (↑) untuk menaikkan nada +1 semitone, atau Panah Bawah (↓) untuk menurunkan -1 semitone. Nilai transpose aktif ditampilkan langsung di bilah kontrol layar (misalnya Transpose: +2).'
                        : isEs
                        ? 'Presiona la flecha Arriba (↑) para subir +1 semitono, o Abajo (↓) para bajar -1 semitono. El valor activo se muestra en el panel de control (ej. Transpose: +2).'
                        : 'Press Arrow Up (↑) to shift pitch up +1 semitone, or Arrow Down (↓) to shift down -1 semitone. The active transpose offset is displayed on the HUD (e.g. Transpose: +2).'}
                    </p>
                    <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-cyan-300">
                      <code>midiNote = mirpKey.midi + mirpTranspose</code>
                    </div>
                  </div>

                  <div className="bg-[#070a12] border border-amber-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono font-bold text-sm">
                        0-⇧
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {isId ? 'Strategi Pro "Zero-Shift"' : isEs ? 'Estrategia "Zero-Shift"' : 'The "Zero-Shift" Pro Hack'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isId
                        ? 'Tuts putih tidak membutuhkan Shift (1-0, q-p, a-l, z-m), sedangkan tuts hitam (kres/mol) mengharuskan menahan tombol Shift. Transpose lagu bertuts hitam rumit (seperti F♯ / D♭) ke tangga nada C Mayor agar seluruh lagu bisa dimainkan hanya dengan tuts putih tanpa Shift!'
                        : isEs
                        ? 'Las teclas blancas no requieren Shift, mientras que las negras obligan a mantener pulsado Shift. Transpón canciones difíciles con muchos sostenidos/bemoles (como Fa♯ o Re♭) a Do Mayor para tocar sin usar Shift.'
                        : 'Naturals require no Shift, while accidentals demand holding Shift. Transpose black-key heavy songs (like F♯ or D♭) toward C Major to play the entire piece purely on natural keys with zero Shift gymnastics!'}
                    </p>
                    <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-amber-300">
                      <span>F♯ Major (6♯) + Transpose (-6) = C Major (0♯)</span>
                    </div>
                  </div>

                  <div className="bg-[#070a12] border border-purple-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-mono font-bold text-sm">
                        8va
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {isId ? 'Auto-Transpose & Oktaf Compact' : isEs ? 'Auto-Transposición y Octavas' : 'Auto-Transpose & Octave Shift'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isId
                        ? 'Octavia menyediakan tombol saran transposisi otomatis yang mendeteksi Key Signature lagu. Pada tata letak Compact 2-oktaf, tombol panah berfungsi sebagai Octave Shift (-3 hingga +2 oktaf) untuk menjelajahi C1 hingga C8.'
                        : isEs
                        ? 'Octavia incluye un botón de transposición automática según la armadura. En el modo Compact de 2 octavas, las flechas cambian octavas (-3 a +2) para recorrer de Do1 a Do8.'
                        : 'Octavia offers a 1-click Auto-Transpose button calculated from the song Key Signature. In the 2-octave Compact layout, arrows act as an Octave Shift (-3 to +2 octaves) spanning C1 to C8.'}
                    </p>
                    <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-purple-300">
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
                    <span className="text-[10px] font-mono text-slate-400">
                      {isId ? 'Target: Minimalkan Tombol Shift' : isEs ? 'Meta: Minimizar tecla Shift' : 'Goal: Eliminate Shift Modifiers'}
                    </span>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-xl bg-[#070a12]">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 bg-slate-900/90">
                          <th className="py-2.5 px-3">Tonalitas Asli</th>
                          <th className="py-2.5 px-3">Jumlah Kres / Mol</th>
                          <th className="py-2.5 px-3 text-amber-400">Nilai Transpose Disarankan</th>
                          <th className="py-2.5 px-3 text-cyan-400">Tonalitas Hasil Transpose</th>
                          <th className="py-2.5 px-3">Keuntungan Bermain di PC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">C Major / A Minor</td>
                          <td className="py-2 px-3">0 ♯ / 0 ♭</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">0 (Tanpa Ubah)</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major / A Minor</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? '100% tuts putih alami, tanpa kombinasi Shift sama sekali.' : isEs ? '100% teclas naturales sin Shift.' : '100% natural keys, zero Shift key combinations.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">G Major / E Minor</td>
                          <td className="py-2 px-3">1 ♯ (F♯)</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">-1 semitone (Panah ↓)</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">F Major (1 ♭) / C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Hanya 1 tuts hitam tersisa; mudah dimainkan.' : isEs ? 'Casi sin teclas negras.' : 'Nearly all naturals; smooth scalar runs.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">D Major / B Minor</td>
                          <td className="py-2 px-3">2 ♯ (F♯, C♯)</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">-2 semitone (Panah ↓ 2×)</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menghilangkan 2 nada kres menjadi tangga nada C natural.' : isEs ? 'Elimina los 2 sostenidos.' : 'Converts 2 sharps into 100% natural C Major white keys.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">A Major / F♯ Minor</td>
                          <td className="py-2 px-3">3 ♯ (F♯, C♯, G♯)</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">-3 semitone (Panah ↓ 3×)</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">F Major / C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Mengurangi drastis lompatan Shift pada tangan kanan.' : isEs ? 'Reduce drásticamente combinaciones Shift.' : 'Dramatically reduces right-hand Shift combinations.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">E Major / C♯ Minor</td>
                          <td className="py-2 px-3">4 ♯ (F♯, C♯, G♯, D♯)</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">-4 semitone (Panah ↓ 4×)</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menghilangkan 4 tuts hitam yang rawan misinput.' : isEs ? 'Elimina 4 teclas negras propensas a error.' : 'Eliminates 4 tricky black keys prone to missed inputs.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">B Major / G♯ Minor</td>
                          <td className="py-2 px-3">5 ♯ (F♯, C♯, G♯, D♯, A♯)</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">+1 semitone (Panah ↑ 1×)</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Hanya geser 1 semitone ke atas, 5 kres hilang seketika!' : isEs ? 'Sube 1 semitono y desaparecen 5 sostenidos.' : 'Shift up 1 semitone: all 5 sharps disappear instantly!'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">F♯ / G♭ Major</td>
                          <td className="py-2 px-3">6 ♯ / 6 ♭ (Maksimal Kres/Mol)</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">+6 atau -6 semitone</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Lagu tersulit menjadi lagu paling mudah dimainkan di PC.' : isEs ? 'Convierte la tonalidad más difícil en la más fácil.' : 'Turns the hardest keyboard piece into pure natural white keys.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">D♭ Major / B♭ Minor</td>
                          <td className="py-2 px-3">5 ♭ (B♭, E♭, A♭, D♭, G♭)</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">-1 semitone (Panah ↓ 1×)</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Turunkan 1 semitone: 5 mol hilang menjadi C Mayor murni!' : isEs ? 'Baja 1 semitono y desaparecen 5 bemoles.' : 'Shift down 1 semitone: 5 flats resolve into clean C Major.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">A♭ Major / F Minor</td>
                          <td className="py-2 px-3">4 ♭ (B♭, E♭, A♭, D♭)</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">+4 semitone (Panah ↑ 4×)</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Sangat direkomendasikan untuk repertoar pop/anime ber-flat.' : isEs ? 'Ideal para repertorio anime/pop con bemoles.' : 'Perfect for pop and anime ballads composed in flat keys.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">E♭ Major / C Minor</td>
                          <td className="py-2 px-3">3 ♭ (B♭, E♭, A♭)</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">-3 semitone (Panah ↓ 3×)</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Mengubah akor Eb-Ab-Bb menjadi C-F-G tanpa Shift.' : isEs ? 'Toca Eb-Ab-Bb como C-F-G sin Shift.' : 'Play Eb-Ab-Bb progression as effortless C-F-G chords.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">B♭ Major / G Minor</td>
                          <td className="py-2 px-3">2 ♭ (B♭, E♭)</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">+2 semitone (Panah ↑ 2×)</td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">C Major</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Mengoptimalkan kombo kecepatan tinggi pada lagu cepat.' : isEs ? 'Optimiza combos a alta velocidad.' : 'Optimizes high-speed combo execution without misclicks.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-sans font-bold text-white">F Major / D Minor</td>
                          <td className="py-2 px-3">1 ♭ (B♭)</td>
                          <td className="py-2 px-3 text-amber-400 font-bold">-5 atau +1 semitone</td>
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
                      <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Tombol Keyboard</th>
                          <th className="py-2 px-3">Mode Layout</th>
                          <th className="py-2 px-3">Fungsi Utama</th>
                          <th className="py-2 px-3">Deskripsi Operasional</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-amber-300"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Panah Atas (↑)</kbd></td>
                          <td className="py-2 px-3 text-cyan-400">Roblox (MIRP)</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">Transpose Semitone (+1)</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menaikkan nada seluruh tombol keyboard sebesar 1 semitone.' : isEs ? 'Sube el tono de todas las teclas 1 semitono.' : 'Raises pitch of all mapped keys by +1 semitone.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-amber-300"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Panah Bawah (↓)</kbd></td>
                          <td className="py-2 px-3 text-cyan-400">Roblox (MIRP)</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">Transpose Semitone (-1)</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menurunkan nada seluruh tombol keyboard sebesar 1 semitone.' : isEs ? 'Baja el tono de todas las teclas 1 semitono.' : 'Lowers pitch of all mapped keys by -1 semitone.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-purple-300"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Panah Atas (↑)</kbd></td>
                          <td className="py-2 px-3 text-indigo-400">Compact Standard</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">Octave Shift Up (+12)</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menggeser register tuts 1 oktaf ke atas (hingga maksimal +2 oktaf).' : isEs ? 'Desplaza el registro 1 octava arriba (hasta +2).' : 'Shifts register up 1 octave (+12 semitones, up to +2 octaves).'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-purple-300"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Panah Bawah (↓)</kbd></td>
                          <td className="py-2 px-3 text-indigo-400">Compact Standard</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">Octave Shift Down (-12)</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Menggeser register tuts 1 oktaf ke bawah (hingga minimal -3 oktaf).' : isEs ? 'Desplaza el registro 1 octava abajo (hasta -3).' : 'Shifts register down 1 octave (-12 semitones, down to -3 octaves).'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-white"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Shift</kbd> + Tombol</td>
                          <td className="py-2 px-3 text-cyan-400">Roblox (MIRP)</td>
                          <td className="py-2 px-3 font-sans font-bold text-white">Tuts Hitam (Kres/Mol)</td>
                          <td className="py-2 px-3 font-sans text-slate-400">{isId ? 'Memainkan tuts hitam pada tuts fisik yang bersangkutan.' : isEs ? 'Toca la tecla negra del botón físico.' : 'Strikes the accidental black key variant of that physical key.'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-white"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Space</kbd></td>
                          <td className="py-2 px-3 text-slate-400">Semua Mode</td>
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
                        <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 bg-slate-900/90">
                          <th className="py-2.5 px-3">Akor</th>
                          <th className="py-2.5 px-3">Not Musik</th>
                          <th className="py-2.5 px-3 text-amber-400">Tombol Roblox (MIRP)</th>
                          <th className="py-2.5 px-3 text-cyan-400">Tombol Compact (Atas)</th>
                          <th className="py-2.5 px-3 text-indigo-400">Tombol Compact (Bawah)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200 text-[11px]">
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">C Major (I)</td><td className="py-2 px-3 text-slate-400">C4 – E4 – G4</td><td className="py-2 px-3 text-amber-300 font-bold">[tuo]</td><td className="py-2 px-3 text-cyan-300">[qet]</td><td className="py-2 px-3 text-indigo-300">[zcb]</td></tr>
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">G Major (V)</td><td className="py-2 px-3 text-slate-400">G3 – B3 – D4</td><td className="py-2 px-3 text-amber-300 font-bold">[ywp]</td><td className="py-2 px-3 text-cyan-300">[tuo]</td><td className="py-2 px-3 text-indigo-300">[bnx]</td></tr>
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">A Minor (vi)</td><td className="py-2 px-3 text-slate-400">A3 – C4 – E4</td><td className="py-2 px-3 text-amber-300 font-bold">[wtu]</td><td className="py-2 px-3 text-cyan-300">[yqe]</td><td className="py-2 px-3 text-indigo-300">[nzc]</td></tr>
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">F Major (IV)</td><td className="py-2 px-3 text-slate-400">F3 – A3 – C4</td><td className="py-2 px-3 text-amber-300 font-bold">[qet]</td><td className="py-2 px-3 text-cyan-300">[ryq]</td><td className="py-2 px-3 text-indigo-300">[vnz]</td></tr>
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">D Minor (ii)</td><td className="py-2 px-3 text-slate-400">D4 – F4 – A4</td><td className="py-2 px-3 text-amber-300 font-bold">[ryi]</td><td className="py-2 px-3 text-cyan-300">[wry]</td><td className="py-2 px-3 text-indigo-300">[xvn]</td></tr>
                        <tr className="hover:bg-slate-900/40"><td className="py-2 px-3 font-sans font-bold text-white">E Minor (iii)</td><td className="py-2 px-3 text-slate-400">E4 – G4 – B4</td><td className="py-2 px-3 text-amber-300 font-bold">[tuo]</td><td className="py-2 px-3 text-cyan-300">[etu]</td><td className="py-2 px-3 text-indigo-300">[cbm]</td></tr>
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
                    <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {isId ? 'MODUL 05 • LABORATORIUM TEORI HARMONI & VOICE LEADING' : isEs ? 'MÓDULO 05 • TEORÍA ARMÓNICA Y CONDUCCIÓN' : 'MODULE 05 • HARMONIC THEORY & VOICE LEADING LAB'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      5 TECHNICAL DIAGRAMS • INTERACTIVE COMPASS
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {isId
                      ? 'Interval 12-Semitone, Konstruksi Akor, Voice Leading Inversi, 7 Modus & Lingkaran Kuint'
                      : isEs
                      ? 'Intervalos de 12 Semitonos, Acordes, Conducción de Voces, 7 Modos y Círculo de Quintas'
                      : '12-Semitone Intervals, Chord Voicings, Inversion Voice Leading, 7 Modes & Circle of Fifths'}
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-3xl">
                    {isId
                      ? 'Seluruh bangunan harmoni musik Barat bertumpu pada rasio jarak semitone (setengah nada). Dengan menguasai formula interval, inversi akor, pola iringan tangan kiri, dan kompas Circle of Fifths, Anda dapat menganalisis maupun mengimprovisasi lagu di 12 kunci.'
                      : isEs
                      ? 'Toda la armonía occidental se basa en proporciones de semitonos. Dominar las fórmulas de intervalos, inversiones, patrones de mano izquierda y el Círculo de Quintas permite tocar en las 12 tonalidades.'
                      : 'Western harmony is governed by exact semitone intervals. Mastering interval formulas, parsimonious voice leading, left-hand accompaniment patterns, and the Circle of Fifths unlocks fluency across all 12 keys.'}
                  </p>
                </div>
                {onLaunchInGamePractice && (
                  <button
                    type="button"
                    onClick={() => onLaunchInGamePractice('canon', 'theory')}
                    className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center gap-2 flex-shrink-0 shadow-sm"
                  >
                    <span>{isId ? 'Praktik Progresi Canon in D' : isEs ? 'Practicar Canon en Re' : 'Practice Canon in D Chords'}</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              {/* FIG 5.1: 12-Semitone Chromatic Interval Ruler & Acoustic Consonance Blueprint */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 5.1 — THE 12-SEMITONE CHROMATIC INTERVAL RULER &amp; HARMONIC FUNCTION
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Penggaris Interval 0–12 Semitone: Fondasi Pembentukan Akor & Tangga Nada'
                        : '0–12 Semitone Chromatic Ruler: Interval Abbreviations, Ratios & Chord Degrees'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    INVERSION LAW: (12 - n) SEMITONES
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 195" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="195" rx="8" fill="#070a12" stroke="#1e293b" />

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
                          <text x="0" y="30" textAnchor="middle" fill={it.col} fontSize="10" fontFamily="monospace" fontWeight="bold">{it.st}</text>
                          <text x="0" y="44" textAnchor="middle" fill="#e2e8f0" fontSize="8.5" fontFamily="monospace">{it.abbr}</text>
                          <text x="0" y="90" textAnchor="middle" fill="#f8fafc" fontSize="9" fontFamily="monospace" fontWeight="bold">{it.note}</text>
                          <text x="0" y="104" textAnchor="middle" fill="#94a3b8" fontSize="8">{it.name}</text>
                          <rect x="-28" y="114" width="56" height="16" rx="3" fill="#0f172a" stroke="#1e293b" />
                          <text x="0" y="125" textAnchor="middle" fill={it.col} fontSize="7.5" fontFamily="monospace" fontWeight="bold">{it.role}</text>
                        </g>
                      );
                    })}

                    {/* Bottom Formula Strip */}
                    <rect x="24" y="144" width="812" height="36" rx="4" fill="#0a0f1a" stroke="#1e293b" />
                    <text x="430" y="166" textAnchor="middle" fill="#cbd5e1" fontSize="9.5" fontFamily="monospace">
                      Major Triad = [0, 4, 7] • Minor Triad = [0, 3, 7] • Diminished = [0, 3, 6] • Augmented = [0, 4, 8] • Dom7 = [0, 4, 7, 10] • Maj7 = [0, 4, 7, 11]
                    </text>
                  </svg>
                </div>
              </div>


              {/* FIG 5.1B: 6 Core Triad & 7th Chord Keyboard Voicing Blueprints */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 5.1B — PHYSICAL KEYBOARD VOICING BLUEPRINT: TRIADS &amp; SEVENTH CHORDS ON ROOT C
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Perbandingan Visual 6 Struktur Akor Utama pada Tuts Piano (C Mayor, C Minor, C dim, C aug, C7, Cmaj7)'
                        : 'Visual Keyboard Anatomy of 6 Essential Chord Qualities (C Major, C Minor, C dim, C aug, C7, Cmaj7)'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    SEMITONE STACKING
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 245" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="245" rx="8" fill="#070a12" stroke="#1e293b" />
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
                        <text x="12" y="17" fill={ch.col} fontSize="9" fontFamily="monospace" fontWeight="bold">{ch.name}</text>
                        <text x="252" y="17" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">{ch.notes}</text>
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
                        <text x="132" y="94" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">{ch.formula}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* FIG 5.2 & 5.3: Chord Inversions & Smooth Parsimonious Voice Leading */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                      FIG 5.2 — CHORD INVERSIONS (5/3, 6/3, 6/4) &amp; PARSIMONIOUS VOICE LEADING
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Geometri Inversi Akor & Rahasia Voice Leading Halus (Progresi I – IV – V – I Tanpa Melompat)'
                        : 'Triad Inversion Geometry & Smooth Voice Leading (Playing I – IV – V – I Without Hand Jumps)'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-500/30">
                    COMMON-TONE RETENTION
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 240" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="240" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Left Panel: Amateur Jumping Root Positions */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="208" rx="6" fill="#0a0f1a" stroke="#ef4444" strokeWidth="1" />
                      <text x="16" y="22" fill="#f87171" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        INEFFICIENT: JUMPING ROOT POSITIONS (LARGE HAND LEAPS)
                      </text>
                      {[
                        { chord: 'I: C Maj (Root)', notes: 'C4 – E4 – G4', move: 'Start Position', y: 40 },
                        { chord: 'IV: F Maj (Root)', notes: 'F4 – A4 – C5', move: 'Jump UP +5 semitones!', y: 82 },
                        { chord: 'V: G Maj (Root)', notes: 'G4 – B4 – D5', move: 'Jump UP +2 semitones!', y: 124 },
                        { chord: 'I: C Maj (Root)', notes: 'C4 – E4 – G4', move: 'Jump DOWN -7 semitones!', y: 166 },
                      ].map((row, idx) => (
                        <g key={idx} transform={`translate(16, ${row.y})`}>
                          <rect width="368" height="32" rx="4" fill="#0f172a" stroke="#1e293b" />
                          <text x="12" y="20" fill="#f8fafc" fontSize="9.5" fontFamily="monospace" fontWeight="bold">{row.chord}</text>
                          <text x="155" y="20" fill="#fca5a5" fontSize="9.5" fontFamily="monospace">{row.notes}</text>
                          <text x="356" y="20" textAnchor="end" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">{row.move}</text>
                        </g>
                      ))}
                    </g>

                    {/* Right Panel: Pro Voice Leading with Inversions */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="208" rx="6" fill="#0a0f1a" stroke="#10b981" strokeWidth="1.2" />
                      <text x="16" y="22" fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        PRO VOICE LEADING: INVERSIONS (ZERO HAND JUMPS!)
                      </text>
                      {[
                        { chord: 'I: C Maj (Root 5/3)', notes: 'C4 – E4 – G4', move: 'Anchor C4 (1-3-5)', y: 40 },
                        { chord: 'IV: F Maj (2nd Inv 6/4)', notes: 'C4 – F4 – A4', move: 'Keep C4! E→F, G→A (1-3-5)', y: 82 },
                        { chord: 'V: G Maj (1st Inv 6/3)', notes: 'B3 – D4 – G4', move: 'Step C→B, keep G4 (1-2-5)', y: 124 },
                        { chord: 'I: C Maj (Root 5/3)', notes: 'C4 – E4 – G4', move: 'Keep G4! B→C, D→E (1-3-5)', y: 166 },
                      ].map((row, idx) => (
                        <g key={idx} transform={`translate(16, ${row.y})`}>
                          <rect width="368" height="32" rx="4" fill="#0f172a" stroke="#064e3b" />
                          <text x="12" y="20" fill="#f8fafc" fontSize="9.5" fontFamily="monospace" fontWeight="bold">{row.chord}</text>
                          <text x="168" y="20" fill="#6ee7b7" fontSize="9.5" fontFamily="monospace" fontWeight="bold">{row.notes}</text>
                          <text x="356" y="20" textAnchor="end" fill="#a7f3d0" fontSize="8" fontFamily="monospace">{row.move}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                </div>
              </div>

              {/* FIG 5.4: Left-Hand Accompaniment Patterns & Functional Cadences */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                      FIG 5.3 — LEFT-HAND ACCOMPANIMENT PATTERNS, CADENCES &amp; THE 7 DIATONIC MODES
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? '4 Pola Iringan Tangan Kiri, 4 Kadensa Harmoni & Tabel 7 Modus Diatonis (Ionian–Locrian)'
                        : '4 Left-Hand Accompaniment Patterns, 4 Harmonic Cadences & The 7 Diatonic Modes'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    ARRANGEMENT TOOLKIT
                  </span>
                </div>

                {/* 4 Left-Hand Accompaniment SVG Cards */}
                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 175" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="175" rx="8" fill="#070a12" stroke="#1e293b" />
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
                        <text x="12" y="20" fill={pat.col} fontSize="9.5" fontFamily="monospace" fontWeight="bold">{pat.title}</text>
                        <text x="12" y="38" fill="#e2e8f0" fontSize="8.5" fontWeight="bold">{pat.pattern}</text>
                        <rect x="10" y="48" width="179" height="22" rx="3" fill="#0f172a" stroke="#1e293b" />
                        <text x="99.5" y="62" textAnchor="middle" fill="#fde68a" fontSize="8.5" fontFamily="monospace" fontWeight="bold">{pat.notes}</text>
                        <text x="12" y="90" fill="#94a3b8" fontSize="8">{pat.desc.slice(0, 34)}</text>
                        <text x="12" y="104" fill="#94a3b8" fontSize="8">{pat.desc.slice(34)}</text>
                      </g>
                    ))}
                  </svg>
                </div>

                {/* The 7 Modes & Harmonic Cadences Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="font-mono font-bold text-cyan-400 uppercase">The 7 Diatonic Modes (White-Key Rotations)</div>
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800">
                          <th className="py-1">Mode</th>
                          <th className="py-1">Formula</th>
                          <th className="py-1">Color Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        <tr><td className="py-1 font-bold text-white">I. Ionian (C–C)</td><td>1 2 3 4 5 6 7</td><td className="text-cyan-400">Bright Major</td></tr>
                        <tr><td className="py-1 font-bold text-white">II. Dorian (D–D)</td><td>1 2 ♭3 4 5 6 ♭7</td><td className="text-emerald-400">Natural 6 (Jazz/Funk)</td></tr>
                        <tr><td className="py-1 font-bold text-white">III. Phrygian (E–E)</td><td>1 ♭2 ♭3 4 5 ♭6 ♭7</td><td className="text-rose-400">Flat ♭2 (Flamenco)</td></tr>
                        <tr><td className="py-1 font-bold text-white">IV. Lydian (F–F)</td><td>1 2 3 ♯4 5 6 7</td><td className="text-amber-400">Raised ♯4 (Cinematic)</td></tr>
                        <tr><td className="py-1 font-bold text-white">V. Mixolydian (G–G)</td><td>1 2 3 4 5 6 ♭7</td><td className="text-purple-400">Flat ♭7 (Blues/Rock)</td></tr>
                        <tr><td className="py-1 font-bold text-white">VI. Aeolian (A–A)</td><td>1 2 ♭3 4 5 ♭6 ♭7</td><td className="text-indigo-400">Natural Minor</td></tr>
                        <tr><td className="py-1 font-bold text-white">VII. Locrian (B–B)</td><td>1 ♭2 ♭3 4 ♭5 ♭6 ♭7</td><td className="text-slate-400">Diminished ♭5</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2">
                    <div className="font-mono font-bold text-amber-400 uppercase">4 Core Cadences &amp; Hit Progressions</div>
                    <ul className="space-y-1.5 text-slate-300">
                      <li>• <b>Authentic Cadence (<code className="text-cyan-300">V7 → I</code>):</b> {isId ? 'Resolusi paling kuat (G7 → C); tritone B–F menyelesaikan ke C–E.' : isEs ? 'Resolución armónica más fuerte (Sol7 → Do); el tritono Si–Fa resuelve hacia Do–Mi.' : 'Strongest harmonic resolution (G7 → C); the B–F tritone resolves inward to C–E.'}</li>
                      <li>• <b>Plagal Cadence (<code className="text-emerald-300">IV → I</code>):</b> {isId ? 'Kadensa "Amen" (F → C); hangat dan tenang tanpa ketegangan leading-tone.' : isEs ? 'Cadencia "Amén" (Fa → Do); resolución cálida y suave sin la tensión de la sensible.' : 'The "Amen" cadence (F → C); warm subdominant resolution.'}</li>
                      <li>• <b>Deceptive Cadence (<code className="text-amber-300">V → vi</code>):</b> {isId ? 'G → Am; mengecoh telinga ke relatif minor untuk memperpanjang emosi lagu.' : isEs ? 'Sol → Lam; resuelve la tensión dominante en el relativo menor para prolongar la emoción.' : 'G → Am; resolves dominant tension into the relative minor.'}</li>
                      <li>• <b>Jazz Turnaround (<code className="text-purple-300">ii7 – V7 – Imaj7</code>):</b> <code className="font-mono">Dm7 → G7 → Cmaj7</code>.</li>
                      <li>• <b>Royal Road (J-Pop / Anime):</b> <code className="font-mono text-rose-300">IVmaj7 – V7 – iii7 – vi</code> (<code className="font-mono">Fmaj7 → G7 → Em7 → Am</code>).</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* FIG 5.5: Interactive Circle of Fifths Compass & Key Signature Inspector */}
              <div className="bg-[#0b101b] border border-slate-800 p-6 rounded-xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 5.4 — INTERACTIVE CIRCLE OF FIFTHS &amp; DIATONIC CHORD NEIGHBORHOOD INSPECTOR
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white mt-0.5">
                      {isId
                        ? 'Kompas Interaktif Lingkaran Kuint (Klik Kunci Mana Saja untuk Memeriksa Tanda Kunci & Keluarga 7 Akor Diatonis)'
                        : 'Interactive Circle of Fifths Compass (Click Any Key Slice to Inspect Key Signature & Diatonic 7-Chord Family)'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-900 px-2.5 py-1 rounded text-amber-300 border border-slate-800">
                    OUTER: MAJOR • INNER: RELATIVE MINOR
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Interactive Wheel (Enlarged Circles & Bold Readable Typography) */}
                  <div className="lg:col-span-7 xl:col-span-8 bg-[#070a12] rounded-xl p-3 sm:p-6 border border-slate-800 flex flex-col items-center">
                    <div className="w-full max-w-[580px] sm:max-w-[620px] aspect-square select-none">
                      <svg viewBox="0 0 640 640" className="w-full h-full font-sans">
                        <circle cx="320" cy="320" r="310" fill="#070a12" stroke="#1e293b" strokeWidth="2" />
                        <circle cx="320" cy="320" r="222" fill="none" stroke="#1e293b" strokeWidth="1.8" strokeDasharray="5 5" />
                        <circle cx="320" cy="320" r="146" fill="none" stroke="#1e293b" strokeWidth="1.8" strokeDasharray="4 4" />

                        {/* Center Hub */}
                        <circle cx="320" cy="320" r="88" fill="#0b101b" stroke="#0284c7" strokeWidth="2.5" />
                        <text x="320" y="296" textAnchor="middle" fill="#94a3b8" fontSize="10.5" fontFamily="monospace" fontWeight="bold" letterSpacing="0.08em">
                          SELECTED KEY
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
                              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">ACTIVE KEY SIGNATURE</span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">
                                {sel.sigLabel}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-white mt-1">
                              {sel.major} Major <span className="text-slate-500 font-normal">/</span> <span className="text-indigo-300">{sel.minor} Relative Minor</span>
                            </h4>
                            <p className="text-xs text-slate-400 font-mono mt-1">
                              Accidentals: <strong className="text-amber-300">{sel.accidentals}</strong>
                            </p>
                          </div>

                          <div>
                            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-2">
                              7 Diatonic Scale Degrees ({sel.major} Major)
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
                            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-2">
                              Diatonic 7-Chord Family (Roman Numerals)
                            </div>
                            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                              <div className="p-2.5 bg-slate-950 rounded border border-amber-500/40 flex justify-between">
                                <span className="text-amber-400 font-bold">I (Tonic)</span>
                                <span className="text-white font-bold">{sel.majorChords.tonic}</span>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded border border-emerald-500/40 flex justify-between">
                                <span className="text-emerald-400 font-bold">IV (Subdom)</span>
                                <span className="text-white font-bold">{sel.majorChords.subdom}</span>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded border border-cyan-500/40 flex justify-between">
                                <span className="text-cyan-400 font-bold">V (Dominant)</span>
                                <span className="text-white font-bold">{sel.majorChords.dom}</span>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded border border-purple-500/40 flex justify-between">
                                <span className="text-purple-300 font-bold">vi (Rel Min)</span>
                                <span className="text-white font-bold">{sel.minorChords.tonicRel}</span>
                              </div>
                              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between">
                                <span className="text-slate-400">ii (Supertonic)</span>
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
                    <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                      {isId ? 'MODUL 06 • GENERATOR LATIHAN TEKNIS 12 KUNCI & RUTINITAS HARIAN' : isEs ? 'MÓDULO 06 • EJERCICIOS TÉCNICOS EN 12 TONALIDADES' : 'MODULE 06 • 12-KEY TECHNICAL DRILL GENERATOR & DAILY ROUTINE'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      REAL-TIME TRANSPOSITION ENGINE
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {t.ch6Title}
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-3xl">
                    {t.ch6Desc}
                  </p>
                </div>
                <div className="bg-slate-900 px-4 py-2.5 rounded-lg border border-slate-800 flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-slate-400">ACTIVE ROOT:</span>
                  <strong className="text-sm font-mono font-bold text-emerald-400">{selectedKey}</strong>
                </div>
              </div>

              {/* FIG 6.1: Structured 30-Minute Daily Practice Routine Blueprint SVG */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                      FIG 6.1 — CONSERVATORY 30-MINUTE DAILY PRACTICE ARCHITECTURE
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Struktur Sesi Latihan Efektif 30 Menit: Pemanasan Hanon, Tangga Nada, Sight-Reading & Repertoar'
                        : 'High-Yield 30-Minute Practice Allocation: Technical Warmup, Scale Voicing, Sight-Reading & Repertoire'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    4-BLOCK SESSION PLAN
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 130" className="w-full min-w-[740px] h-auto select-none font-sans">
                    <rect width="860" height="130" rx="8" fill="#070a12" stroke="#1e293b" />
                    {[
                      { min: 'MIN 00–05 (5m)', title: '1. Finger Independence & Scales', sub: 'Hanon #1 + Major/Minor Scale in 1 Key', col: '#38bdf8', w: 185, x: 18 },
                      { min: 'MIN 05–12 (7m)', title: '2. Chords, Inversions & Arpeggios', sub: 'Root / 1st / 2nd Inv + I–V–vi–IV / ii–V–I', col: '#10b981', w: 205, x: 213 },
                      { min: 'MIN 12–18 (6m)', title: '3. Sight-Reading Drill', sub: 'Read new patterns in Wait Mode (Strict)', col: '#f59e0b', w: 185, x: 428 },
                      { min: 'MIN 18–30 (12m)', title: '4. Repertoire Chunking (A–B Loop)', sub: 'Isolate 4-bar loops from 60% → 100% BPM', col: '#a855f7', w: 219, x: 623 },
                    ].map((blk, i) => (
                      <g key={i} transform={`translate(${blk.x}, 16)`}>
                        <rect width={blk.w} height="98" rx="5" fill="#0a0f1a" stroke="#1e293b" />
                        <line x1="0" y1="0" x2={blk.w} y2="0" stroke={blk.col} strokeWidth="3" />
                        <text x="12" y="22" fill={blk.col} fontSize="9" fontFamily="monospace" fontWeight="bold">{blk.min}</text>
                        <text x="12" y="44" fill="#f8fafc" fontSize="10" fontWeight="bold">{blk.title}</text>
                        <text x="12" y="66" fill="#94a3b8" fontSize="8.5">{blk.sub}</text>
                      </g>
                    ))}
                  </svg>
                </div>

                {/* Built-in Interactive Repertoire Quick-Launchers */}
                {onLaunchInGamePractice && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase mb-2.5">
                      {isId ? 'REPERTOAR PANDUAN INTERAKTIF BAWAAN (KLIK UNTUK MULAI):' : isEs ? 'REPERTORIO DE GUÍA INTERACTIVA (HAZ CLIC PARA TOCAR):' : 'BUILT-IN INTERACTIVE ACADEMY REPERTOIRE:'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                      {[
                        { id: 'scale_c', name: 'C Major Thumb-Tuck', tag: 'Fingering 1-2-3-1', mode: 'fingering' as const },
                        { id: 'scale_g', name: 'G Major Scale (F♯)', tag: '1 Sharp Drill', mode: 'sheet' as const },
                        { id: 'chords_pop', name: 'Pop 4-Chord (C-G-Am-F)', tag: 'Inversion Voicing', mode: 'falling' as const },
                        { id: 'canon', name: 'Pachelbel Canon in D', tag: 'Harmonic Foundation', mode: 'theory' as const },
                        { id: 'fur_elise', name: 'Beethoven Für Elise', tag: 'Chromatic Motif', mode: 'falling' as const },
                      ].map((les) => (
                        <button
                          key={les.id}
                          type="button"
                          onClick={() => onLaunchInGamePractice(les.id, les.mode)}
                          className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition-colors group"
                        >
                          <div className="text-[10px] font-mono text-cyan-400">{les.tag}</div>
                          <div className="text-xs font-bold text-white group-hover:text-cyan-200 mt-0.5 truncate">{les.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>


              {/* FIG 6.2: Hanon #1 Finger Independence Pattern & Contrary Motion Scale Blueprint */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 6.2 — CORE TECHNICAL ETUDES: HANON EXERCISE #1 &amp; CONTRARY-MOTION SYMMETRY
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {isId
                        ? 'Visualisasi Pola Latihan Kemandirian Jari Hanon No. 1 & Tangga Nada Gerak Berlawanan (Contrary Motion)'
                        : 'Visual Blueprint of Hanon Exercise No. 1 & Mirror-Symmetric Contrary-Motion Scales'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    FINGER INDEPENDENCE LAB
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 860 175" className="w-full min-w-[760px] h-auto select-none font-sans">
                    <rect width="860" height="175" rx="8" fill="#070a12" stroke="#1e293b" />

                    {/* Left Panel: Hanon #1 Ascending Cell */}
                    <g transform="translate(20, 16)">
                      <rect width="400" height="143" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        A. HANON EXERCISE NO. 1 (SKIP-2nd ASCENDING CELL)
                      </text>
                      {[
                        { n: 'C4', rh: '1', lh: '5', skip: false },
                        { n: 'E4', rh: '2', lh: '4', skip: true },
                        { n: 'F4', rh: '3', lh: '3', skip: false },
                        { n: 'G4', rh: '4', lh: '2', skip: false },
                        { n: 'A4', rh: '5', lh: '1', skip: false },
                        { n: 'G4', rh: '4', lh: '2', skip: false },
                        { n: 'F4', rh: '3', lh: '3', skip: false },
                        { n: 'E4', rh: '2', lh: '4', skip: false },
                      ].map((cell, i) => (
                        <g key={i} transform={`translate(${14 + i * 46.5}, 32)`}>
                          <rect width="42" height="74" rx="4" fill={cell.skip ? '#083344' : '#0f172a'} stroke={cell.skip ? '#38bdf8' : '#334155'} />
                          <text x="21" y="18" textAnchor="middle" fill="#f8fafc" fontSize="10" fontFamily="monospace" fontWeight="bold">{cell.n}</text>
                          <text x="21" y="40" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">RH:{cell.rh}</text>
                          <text x="21" y="58" textAnchor="middle" fill="#818cf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">LH:{cell.lh}</text>
                        </g>
                      ))}
                      <text x="200" y="128" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                        Skip 1 white key between first two notes (C→E), then step up and down to land on D4 next!
                      </text>
                    </g>

                    {/* Right Panel: C Major Contrary Motion (Mirror Fingering 1-2-3-1-2-3-4-5) */}
                    <g transform="translate(440, 16)">
                      <rect width="400" height="143" rx="6" fill="#0a0f1a" stroke="#1e293b" />
                      <text x="14" y="20" fill="#10b981" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        B. CONTRARY MOTION C MAJOR (IDENTICAL MIRROR FINGERS!)
                      </text>
                      {[
                        { rh: 'C4', lh: 'C4', f: '1' },
                        { rh: 'D4', lh: 'B3', f: '2' },
                        { rh: 'E4', lh: 'A3', f: '3' },
                        { rh: 'F4', lh: 'G3', f: '1 (Pivot)' },
                        { rh: 'G4', lh: 'F3', f: '2' },
                        { rh: 'A4', lh: 'E3', f: '3' },
                        { rh: 'B4', lh: 'D3', f: '4' },
                        { rh: 'C5', lh: 'C3', f: '5' },
                      ].map((step, i) => (
                        <g key={i} transform={`translate(${14 + i * 46.5}, 32)`}>
                          <rect width="42" height="74" rx="4" fill={i === 3 ? '#064e3b' : '#0f172a'} stroke={i === 3 ? '#10b981' : '#334155'} />
                          <text x="21" y="18" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">{step.rh}</text>
                          <text x="21" y="42" textAnchor="middle" fill="#fde047" fontSize="10" fontFamily="monospace" fontWeight="bold">{step.f}</text>
                          <text x="21" y="64" textAnchor="middle" fill="#818cf8" fontSize="9" fontFamily="monospace" fontWeight="bold">{step.lh}</text>
                        </g>
                      ))}
                      <text x="200" y="128" textAnchor="middle" fill="#6ee7b7" fontSize="8.5" fontFamily="monospace">
                        Start both thumbs on Middle C4: RH ascends &amp; LH descends using 1-2-3-1-2-3-4-5 together!
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Key Selector */}
              <div className="bg-[#0b101b] rounded-xl p-5 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                    {t.ch6RootKey}
                  </h3>
                  <span className="text-[11px] text-slate-400">
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
                        className={`py-2 px-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white border border-emerald-400'
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
                  { id: 'sight_reading', label: isId ? 'Membaca Not (Sight Reading)' : isEs ? 'Lectura a Primera Vista' : 'Sight Reading' },
                  { id: 'scales', label: isId ? 'Tangga Nada & Modus' : isEs ? 'Escalas y Modos' : 'Scales & Modes' },
                  { id: 'chords', label: isId ? 'Akor & Progresi' : isEs ? 'Acordes y Progresiones' : 'Chords & Progressions' },
                  { id: 'arpeggios', label: 'Arpeggios' },
                ].map((tab) => {
                  const isActive = selectedCategoryTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedCategoryTab(tab.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
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
                {EXERCISE_CATEGORIES.filter((cat) =>
                  selectedCategoryTab === 'all' ? true : cat.id === selectedCategoryTab
                ).map((category) => (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                      <h4 className="text-sm font-mono font-bold text-cyan-400 uppercase tracking-wide">
                        {category.name}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {category.types.length} modules
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {category.types.map((drill) => (
                        <div
                          key={drill.id}
                          className="bg-[#0b101b] hover:bg-slate-900/90 rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h5 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {drill.name}
                              </h5>
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-800 whitespace-nowrap">
                                Key: {selectedKey}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {drill.description}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                onLaunchCustomExercise?.(selectedKey, drill.id, drill.name);
                              }}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
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
            </article>
          )}

          {/* ========================================================================= */}
          {/* CHAPTER 7: Video Masterclasses & Study Guide */}
          {/* ========================================================================= */}
          {activeChapter === 'videos' && (
            <article className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
              <div className="border-b border-slate-800 pb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    {isId ? 'MODUL 07 • REFERENSI VIDEO MASTERCLASS & INTISARI STUDI' : isEs ? 'MÓDULO 07 • VIDEOTECA Y GUÍA DE ESTUDIO' : 'MODULE 07 • VIDEO REFERENCE LIBRARY & STUDY NOTES'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                    {TUTORIAL_VIDEOS.length} CURATED LECTURES
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {t.ch7Title}
                </h2>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-3xl">
                  {t.ch7Desc}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {TUTORIAL_VIDEOS.map((video) => {
                  const takeaways = isId ? video.keyTakeawaysId : isEs ? (video.keyTakeawaysEs || video.keyTakeaways) : video.keyTakeaways;
                  return (
                    <div
                      key={video.id}
                      className="bg-[#0b101b] rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors flex flex-col justify-between group"
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
                          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[10px] font-mono font-semibold text-slate-200">
                            <span className="px-2 py-0.5 rounded bg-slate-950/90 border border-slate-800">
                              {video.tag}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-900/90 text-cyan-300 border border-slate-800">
                              {video.duration}
                            </span>
                          </div>
                        </a>

                        <div className="p-5 space-y-3">
                          <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                            {isId ? (video.categoryId || video.category) : isEs ? (video.categoryEs || video.category) : video.category}
                          </div>
                          <h3 className="text-base font-bold text-white leading-snug">
                            {isId ? video.titleId : isEs ? (video.titleEs || video.title) : video.title}
                          </h3>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {isId ? video.descriptionId : isEs ? (video.descriptionEs || video.description) : video.description}
                          </p>
                          <div className="pt-2 border-t border-slate-800/80 space-y-1">
                            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                              {isId ? 'Intisari Materi:' : isEs ? 'Puntos Clave del Estudio:' : 'Key Study Takeaways:'}
                            </div>
                            <ul className="text-[11px] text-slate-400 space-y-1">
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

          {/* CHAPTER 8: MIDI Editor, Sequencer & Audio Calibration Masterclass */}
          {activeChapter === 'midieditor' && (
            <article className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
              {/* Chapter Header */}
              <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      {t.ch8Badge}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      480 PPQ RESOLUTION • DUAL HAND SEQUENCER
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {t.ch8Title}
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-3xl">
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

              {/* FIG 8.1: Full Architectural Piano Roll Visual Diagram */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                      FIG 8.1 — OCTAVIA PIANO ROLL &amp; TICK SEQUENCER BLUEPRINT
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {t.ch8VisualTitle}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    480 TICKS / QUARTER • DUAL CHANNELS
                  </span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                  <svg viewBox="0 0 880 390" className="w-full min-w-[780px] h-auto select-none font-sans">
                    <rect width="880" height="390" rx="8" fill="#070a12" stroke="#1e293b" />

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
                        <text x="35" y="14" fill="#38bdf8" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold">120 BPM</text>
                      </g>
                      <g transform="translate(148, 8)">
                        <rect width="48" height="20" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="24" y="14" fill="#a5b4fc" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold">4/4</text>
                      </g>
                      <g transform="translate(204, 8)">
                        <rect width="60" height="20" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="30" y="14" fill="#fde047" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold">KEY: C</text>
                      </g>
                      <g transform="translate(272, 8)">
                        <rect width="75" height="20" rx="4" fill="#0f172a" stroke="#334155" />
                        <text x="37" y="14" fill="#34d399" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold">SNAP: 1/16</text>
                      </g>

                      {/* Hand Mode Toggle Mock */}
                      <g transform="translate(680, 8)">
                        <rect width="72" height="20" rx="4" fill="#083344" stroke="#06b6d4" />
                        <text x="36" y="14" fill="#22d3ee" textAnchor="middle" fontSize="9.5" fontFamily="monospace" fontWeight="bold">RIGHT (RH)</text>
                      </g>
                      <g transform="translate(760, 8)">
                        <rect width="72" height="20" rx="4" fill="#1e1b4b" stroke="#6366f1" />
                        <text x="36" y="14" fill="#a5b4fc" textAnchor="middle" fontSize="9.5" fontFamily="monospace" fontWeight="bold">LEFT (LH)</text>
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
                          <text x="6" y="17" fill="#f8fafc" fontSize="10" fontFamily="monospace" fontWeight="bold">{m.bar}</text>
                          {m.sub.map((s, si) => (
                            <g key={`sub-${si}`} transform={`translate(${si * 49.5}, 0)`}>
                              {si > 0 && <line x1="0" y1="14" x2="0" y2="26" stroke="#334155" strokeWidth="1" />}
                              {si > 0 && <text x="4" y="22" fill="#64748b" fontSize="8" fontFamily="monospace">{s}</text>}
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
                              fontSize="8"
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
                      <text x="6" y={17 * 13 + 9} fill="#e0e7ff" fontSize="8" fontFamily="monospace" fontWeight="bold">LH: C3 (Root)</text>

                      {/* Bar 2: G3 (Row 15) */}
                      <rect x="198" y={15 * 13 + 1} width="194" height="11" rx="2" fill="#4f46e5" stroke="#818cf8" strokeWidth="1.2" />
                      <text x="204" y={15 * 13 + 9} fill="#e0e7ff" fontSize="8" fontFamily="monospace" fontWeight="bold">LH: G3 (5th)</text>

                      {/* Bar 3: A3 (Row 14) */}
                      <rect x="396" y={14 * 13 + 1} width="194" height="11" rx="2" fill="#4f46e5" stroke="#818cf8" strokeWidth="1.2" />
                      <text x="402" y={14 * 13 + 9} fill="#e0e7ff" fontSize="8" fontFamily="monospace" fontWeight="bold">LH: A3 (vi)</text>

                      {/* Bar 4: F3 (Row 16 / E3) */}
                      <rect x="594" y={16 * 13 + 1} width="194" height="11" rx="2" fill="#4f46e5" stroke="#818cf8" strokeWidth="1.2" />
                      <text x="600" y={16 * 13 + 9} fill="#e0e7ff" fontSize="8" fontFamily="monospace" fontWeight="bold">LH: F3 (IV)</text>

                      {/* Right Hand Notes (Cyan / Sky) */}
                      {/* Bar 1 Arpeggio / Triad: C4, E4, G4 */}
                      <rect x="2" y={12 * 13 + 1} width="46" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="6" y={12 * 13 + 9} fill="#ecfeff" fontSize="7.5" fontFamily="monospace">C4</text>

                      <rect x="51.5" y={8 * 13 + 1} width="46" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="55.5" y={8 * 13 + 9} fill="#ecfeff" fontSize="7.5" fontFamily="monospace">E4</text>

                      <rect x="101" y={5 * 13 + 1} width="46" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="105" y={5 * 13 + 9} fill="#ecfeff" fontSize="7.5" fontFamily="monospace">G4</text>

                      <rect x="150.5" y={0 * 13 + 1} width="46" height="11" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
                      <text x="154.5" y={0 * 13 + 9} fill="#ecfeff" fontSize="7.5" fontFamily="monospace">C5</text>

                      {/* Bar 2 Melody: B4, G4, D4 */}
                      <rect x="200" y={1 * 13 + 1} width="96" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="204" y={1 * 13 + 9} fill="#ecfeff" fontSize="7.5" fontFamily="monospace">B4 (Half)</text>

                      <rect x="298" y={5 * 13 + 1} width="46" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="302" y={5 * 13 + 9} fill="#ecfeff" fontSize="7.5" fontFamily="monospace">G4</text>

                      <rect x="347" y={10 * 13 + 1} width="46" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="351" y={10 * 13 + 9} fill="#ecfeff" fontSize="7.5" fontFamily="monospace">D4</text>

                      {/* Bar 3: Am Chord melody */}
                      <rect x="398" y={3 * 13 + 1} width="96" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="402" y={3 * 13 + 9} fill="#ecfeff" fontSize="7.5" fontFamily="monospace">A4</text>
                      <rect x="496" y={8 * 13 + 1} width="96" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="500" y={8 * 13 + 9} fill="#ecfeff" fontSize="7.5" fontFamily="monospace">E4</text>

                      {/* Bar 4: F Chord melody */}
                      <rect x="596" y={3 * 13 + 1} width="96" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="600" y={3 * 13 + 9} fill="#ecfeff" fontSize="7.5" fontFamily="monospace">A4</text>
                      <rect x="694" y={5 * 13 + 1} width="96" height="11" rx="2" fill="#0891b2" stroke="#22d3ee" strokeWidth="1.2" />
                      <text x="698" y={5 * 13 + 9} fill="#ecfeff" fontSize="7.5" fontFamily="monospace">C5 (End)</text>

                      {/* Vertical Amber Playhead Marker */}
                      <line x1="260" y1="0" x2="260" y2="234" stroke="#f59e0b" strokeWidth="2" strokeDasharray="none" />
                      <polygon points="255,-6 265,-6 260,0" fill="#f59e0b" />
                    </g>

                    {/* Bottom Velocity Lane (Height: 52px) */}
                    <g transform="translate(16, 324)">
                      <rect width="848" height="52" rx="4" fill="#090d16" stroke="#1e293b" />
                      <text x="12" y="16" fill="#64748b" fontSize="8.5" fontFamily="monospace" fontWeight="bold">VELOCITY (0–127)</text>
                      
                      {/* Grid Line for mf (80) */}
                      <line x1="54" y1="24" x2="840" y2="24" stroke="#1e293b" strokeDasharray="3,3" />
                      <text x="46" y="27" textAnchor="end" fill="#475569" fontSize="7.5" fontFamily="monospace">80</text>

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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-cyan-400 font-bold block">01. RULER</span>
                    <span>{isId ? 'Birama 1–4 & Ketukan' : isEs ? 'Compases 1–4' : 'Bars 1–4 & Beats'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-cyan-400 font-bold block">02. RESOLUSI</span>
                    <span>480 PPQ Metric Grid</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-cyan-400 font-bold block">03. TANGAN KANAN</span>
                    <span className="text-cyan-300">{isId ? 'Sian / Melodi Treble' : isEs ? 'Cian / Melodía' : 'Cyan / Lead Mel'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-indigo-400 font-bold block">04. TANGAN KIRI</span>
                    <span className="text-indigo-300">{isId ? 'Ungu / Bass & Akor' : isEs ? 'Índigo / Bajos' : 'Indigo / Bass Root'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-amber-400 font-bold block">05. PLAYHEAD</span>
                    <span>{isId ? 'Scrubber Posisi Audio' : isEs ? 'Línea de Reproducción' : 'Live Timeline Play'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-rose-400 font-bold block">06. VELOCITY</span>
                    <span>0–127 Dyn Dynamics</span>
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
                  <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <polyline points="12 6 12 12 16 14" strokeWidth="2" />
                      </svg>
                      <span>{isId ? 'Sumbu Horizontal (Ticks)' : isEs ? 'Eje Horizontal (Ticks)' : 'Horizontal Time Axis'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isId
                        ? '1 Ketukan Not Seperempat (Quarter Beat) = 480 Ticks. Pada birama 4/4 standar, 1 Bar utuh bernilai persis 1,920 Ticks. Setiap not menyimpan stempel waktu mulai (ticks) dan durasi (durationTicks).'
                        : isEs
                        ? '1 Negra (Quarter Beat) = 480 Ticks. En compás de 4/4, un compás completo mide 1,920 Ticks. Cada nota guarda su posición exacta en ticks y su duración.'
                        : '1 Quarter Note Beat = 480 Ticks. In standard 4/4 meter, 1 full measure is exactly 1,920 Ticks. Every note stores its start timestamp and duration in exact integer ticks.'}
                    </p>
                  </div>

                  <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span>{isId ? 'Sumbu Vertikal (Midi Note)' : isEs ? 'Eje Vertical (Notas MIDI)' : 'Vertical Pitch Axis'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isId
                        ? 'Angka MIDI 0 hingga 127. Pada piano standar 88-tuts, rentang nada membentang dari A0 (MIDI 21) hingga C8 (MIDI 108). Tuts tengah C4 (Middle C) berada pada MIDI 60.'
                        : isEs
                        ? 'Rango MIDI de 0 a 127. En un piano de 88 teclas, va desde La0 (MIDI 21) hasta Do8 (MIDI 108). El Do Central (C4) es la nota MIDI 60.'
                        : 'MIDI note numbers from 0 to 127. On a standard 88-key piano, the range spans from A0 (MIDI 21) to C8 (MIDI 108), with Middle C (C4) anchored at MIDI 60.'}
                    </p>
                  </div>

                  <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                      <span>{isId ? 'Mode Drum vs Mode Piano' : isEs ? 'Modo Batería vs Piano' : 'Drum vs Piano Modes'}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
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
                <div className="bg-[#0b101b] border border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-3">Simbol</th>
                          <th className="p-3">Nama Not</th>
                          <th className="p-3">Nilai Ketukan</th>
                          <th className="p-3">Durasi Ticks (480 PPQ)</th>
                          <th className="p-3">Penggunaan Utama</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-400 font-bold text-sm">1/1</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Not Penuh (Whole Note)' : isEs ? 'Redonda' : 'Whole Note'}</td>
                          <td className="p-3 text-slate-200">4.0 Beats</td>
                          <td className="p-3 text-amber-300 font-bold">1,920 Ticks</td>
                          <td className="p-3 font-sans text-slate-400">{isId ? 'Akor pad latar & pedal bass panjang' : isEs ? 'Acordes de fondo y bajos largos' : 'Long sustained background pads and bass drones'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-400 font-bold text-sm">1/2</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Not Setengah (Half Note)' : isEs ? 'Blanca' : 'Half Note'}</td>
                          <td className="p-3 text-slate-200">2.0 Beats</td>
                          <td className="p-3 text-amber-300 font-bold">960 Ticks</td>
                          <td className="p-3 font-sans text-slate-400">{isId ? 'Pola iringan tangan kiri lambat' : isEs ? 'Acompañamiento pausado de mano izquierda' : 'Slow left-hand chord changes'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-400 font-bold text-sm">1/4</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Not Seperempat (Quarter Note)' : isEs ? 'Negra' : 'Quarter Note'}</td>
                          <td className="p-3 text-slate-200">1.0 Beat</td>
                          <td className="p-3 text-amber-300 font-bold">480 Ticks</td>
                          <td className="p-3 font-sans text-slate-400">{isId ? 'Detak denyut utama lagu pop & klasik' : isEs ? 'Pulso rítmico principal' : 'Standard pulse of pop, rock, and classical pieces'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-400 font-bold text-sm">1/8</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Not Seperdelapan (Eighth Note)' : isEs ? 'Corchea' : 'Eighth Note'}</td>
                          <td className="p-3 text-slate-200">0.5 Beat</td>
                          <td className="p-3 text-amber-300 font-bold">240 Ticks</td>
                          <td className="p-3 font-sans text-slate-400">{isId ? 'Melodi lagu berjalan & arpeggio Alberti' : isEs ? 'Melodías fluidas y arpegios' : 'Walking melodies and Alberti bass arpeggios'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-400 font-bold text-sm">1/16</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Not Seperenambelas (Sixteenth Note)' : isEs ? 'Semicorchea' : 'Sixteenth Note'}</td>
                          <td className="p-3 text-slate-200">0.25 Beat</td>
                          <td className="p-3 text-amber-300 font-bold">120 Ticks</td>
                          <td className="p-3 font-sans text-slate-400">{isId ? 'Lari tangga nada cepat & melodi virtuoso' : isEs ? 'Escalas rápidas y adornos' : 'Fast scalar runs and virtuoso passages'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modifiers Pill Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#0b101b] border border-slate-800 rounded-lg p-3">
                    <span className="text-xs font-mono font-bold text-cyan-300 uppercase block mb-1">
                      NORMAL (1.0×)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {isId ? 'Durasi not standar tanpa modifikasi metrik.' : isEs ? 'Duración estándar sin modificación.' : 'Standard duration without metric alteration.'}
                    </p>
                  </div>
                  <div className="bg-[#0b101b] border border-slate-800 rounded-lg p-3">
                    <span className="text-xs font-mono font-bold text-amber-300 uppercase block mb-1">
                      DOTTED (1.5×)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {isId ? 'Menambahkan 50% durasi (mis. 1/4 bertitik = 720 Ticks).' : isEs ? 'Añade 50% de duración (ej. negra con puntillo = 720 Ticks).' : 'Adds 50% duration (e.g. dotted quarter = 720 Ticks).'}
                    </p>
                  </div>
                  <div className="bg-[#0b101b] border border-slate-800 rounded-lg p-3">
                    <span className="text-xs font-mono font-bold text-purple-300 uppercase block mb-1">
                      TRIPLET (2/3×)
                    </span>
                    <p className="text-[11px] text-slate-400">
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
                  <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-4 flex gap-3">
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

                  <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-4 flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
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

                  <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-4 flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
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

                  <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-4 flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
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

                <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-3">
                  <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    {isId ? 'SKALA DINAMIKA AKUSTIK VELOCITY (0–127)' : isEs ? 'ESCALA DINÁMICA DE VELOCIDAD (0–127)' : 'ACOUSTIC VELOCITY DYNAMIC SPECTRUM (0–127)'}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-emerald-500/30">
                      <div className="flex items-center justify-between text-emerald-400 font-mono text-xs font-bold">
                        <span>PIANISSIMO</span>
                        <span>1–32</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isId ? 'Bisikan sangat lembut, ghost notes, harmoni senyap.' : isEs ? 'Muy suave, notas fantasma y fondos tenues.' : 'Very soft, whisper tones and subtle ghost notes.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-cyan-500/30">
                      <div className="flex items-center justify-between text-cyan-400 font-mono text-xs font-bold">
                        <span>PIANO / MP</span>
                        <span>33–64</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isId ? 'Suara lembut dan terkendali, tekstur iringan tangan kiri.' : isEs ? 'Suave y controlado, acompañamientos de mano izquierda.' : 'Soft and controlled, typical left-hand accompaniment.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-amber-500/30">
                      <div className="flex items-center justify-between text-amber-400 font-mono text-xs font-bold">
                        <span>MEZZO-FORTE</span>
                        <span>65–95</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isId ? 'Tingkat suara melodi bernyanyi standar piano.' : isEs ? 'Nivel melódico estándar, claro y expresivo.' : 'Standard singing melody line and balanced chords.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-rose-500/30">
                      <div className="flex items-center justify-between text-rose-400 font-mono text-xs font-bold">
                        <span>FORTE / FF</span>
                        <span>96–127</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
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
                  <div className="bg-[#0b101b] border border-cyan-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                        {isId ? 'TANGAN KANAN (RIGHT HAND)' : isEs ? 'MANO DERECHA (RIGHT HAND)' : 'RIGHT HAND (RH)'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        CYAN / #22D3EE
                      </span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      <li>{isId ? 'Ditempatkan di paranada Treble (Kunci G)' : isEs ? 'Asignada al pentagrama de Clave de Sol' : 'Assigned to the Treble Staff (G Clef)'}</li>
                      <li>{isId ? 'Membimbing model tangan 3D Tangan Kanan' : isEs ? 'Guía la mano 3D derecha en tiempo real' : 'Drives the 3D Right Hand avatar fingering'}</li>
                      <li>{isId ? 'Warna balok jatuh sian pada falling notes' : isEs ? 'Color celeste en notas cayendo' : 'Cyan waterfall bars in falling notes engine'}</li>
                    </ul>
                  </div>

                  <div className="bg-[#0b101b] border border-indigo-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                        {isId ? 'TANGAN KIRI (LEFT HAND)' : isEs ? 'MANO IZQUIERDA (LEFT HAND)' : 'LEFT HAND (LH)'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
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
                  <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold">TUTORIAL 01</span>
                        <span>{t.ch8Tutorial1Title}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">BEGINNER COMPOSER</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {t.ch8Tutorial1Desc}
                    </p>
                    <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
                      <li><b>Langkah 1:</b> {isId ? 'Buka Editor MIDI, pilih BPM 128 pada bilah toolbar atas.' : isEs ? 'Abre el editor MIDI y fija el tempo en 128 BPM.' : 'Open the MIDI Editor, set BPM to 128 on the top transport bar.'}</li>
                      <li><b>Langkah 2:</b> {isId ? 'Pilih tombol durasi not utuh [1/1] dan pastikan tangan aktif adalah Tangan Kiri (LH).' : isEs ? 'Selecciona redonda [1/1] y asegúrate de que la mano activa sea la Izquierda (LH).' : 'Select the whole note duration [1/1] and set active hand to Left Hand (LH).'}</li>
                      <li><b>Langkah 3:</b> {isId ? 'Klik di Bar 1 pada nada C3, Bar 2 pada G2, Bar 3 pada A2, dan Bar 4 pada F2. Ini menciptakan fondasi bass lagu!' : isEs ? 'Haz clic en el compás 1 en Do3, compás 2 en Sol2, compás 3 en La2 y compás 4 en Fa2 para crear la base de bajos.' : 'Click Bar 1 on C3, Bar 2 on G2, Bar 3 on A2, and Bar 4 on F2 to establish your root bassline.'}</li>
                      <li><b>Langkah 4:</b> {isId ? 'Ubah tangan aktif ke Tangan Kanan (RH), ganti durasi ke [1/4] (Seperempat).' : isEs ? 'Cambia la mano activa a Derecha (RH) y la duración a [1/4] (Negra).' : 'Switch active hand to Right Hand (RH), change duration to [1/4] (Quarter note).'}</li>
                      <li><b>Langkah 5:</b> {isId ? 'Di Bar 1, klik C4, E4, G4. Di Bar 2, klik G3, B3, D4. Di Bar 3, klik A3, C4, E4. Di Bar 4, klik F3, A3, C4.' : isEs ? 'Introduce las tríadas correspondientes en la mano derecha.' : 'Inscribe the corresponding right-hand triads on each measure.'}</li>
                      <li><b>Langkah 6:</b> {isId ? 'Tekan [Spasi] untuk memutar progresi akor Anda dan nikmati harmoni piano yang hidup!' : isEs ? 'Presiona [Espacio] para reproducir y escuchar tu progresión armónica.' : 'Press [Spacebar] to play back your progression and listen to your newly sequenced composition!'}</li>
                    </ol>
                  </div>

                  {/* Tutorial 2 */}
                  <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">TUTORIAL 02</span>
                        <span>{t.ch8Tutorial2Title}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">AUDIO POLISH</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
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
                  <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">TUTORIAL 03</span>
                        <span>{t.ch8Tutorial3Title}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">SYNC CALIBRATION</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
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
                  <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono text-[10px] font-bold">TUTORIAL 04</span>
                        <span>{t.ch8Tutorial4Title}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">EXPORT &amp; SHARE</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
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

                <div className="bg-[#0b101b] border border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-3">Kombinasi Tombol</th>
                          <th className="p-3">Fungsi Pintasan</th>
                          <th className="p-3">Konteks / Efek</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Space</kbd></td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Play / Pause Timeline' : isEs ? 'Reproducir / Pausar' : 'Play / Pause Timeline'}</td>
                          <td className="p-3 font-sans text-slate-400">{isId ? 'Memulai atau menghentikan pemutaran lagu dari posisi playhead' : isEs ? 'Inicia o detiene la reproducción' : 'Starts or pauses playback from current playhead position'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Delete</kbd> / <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Backspace</kbd></td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Hapus Not Terpilih' : isEs ? 'Eliminar Selección' : 'Delete Selected Notes'}</td>
                          <td className="p-3 font-sans text-slate-400">{isId ? 'Menghapus semua not yang sedang aktif terseleksi' : isEs ? 'Borra todas las notas seleccionadas' : 'Deletes all currently selected note events'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Ctrl</kbd> + <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Z</kbd></td>
                          <td className="p-3 font-sans font-semibold text-white">Undo (Batalkan)</td>
                          <td className="p-3 font-sans text-slate-400">{isId ? 'Mengembalikan keadaan kanvas sebelum tindakan terakhir' : isEs ? 'Deshace la última acción' : 'Reverts the last note, tempo, or duration edit'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Ctrl</kbd> + <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Y</kbd></td>
                          <td className="p-3 font-sans font-semibold text-white">Redo (Ulangi)</td>
                          <td className="p-3 font-sans text-slate-400">{isId ? 'Mengulangi tindakan yang sebelumnya di-undo' : isEs ? 'Rehace la acción deshecha' : 'Re-applies the previously undone action'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Shift</kbd> + Klik / Drag</td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Multi-Seleksi Not' : isEs ? 'Selección Múltiple' : 'Multi-Select Notes'}</td>
                          <td className="p-3 font-sans text-slate-400">{isId ? 'Menambah not baru ke kelompok seleksi tanpa membatalkan seleksi lama' : isEs ? 'Añade notas a la selección' : 'Adds additional notes to current selection group'}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold"><kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Panah ↑ / ↓</kbd></td>
                          <td className="p-3 font-sans font-semibold text-white">{isId ? 'Transposisi Semitone' : isEs ? 'Transponer Semitono' : 'Pitch Transposition'}</td>
                          <td className="p-3 font-sans text-slate-400">{isId ? 'Menaikkan atau menurunkan nada not terpilih sebesar 1 semitone' : isEs ? 'Sube o baja el tono un semitono' : 'Shifts selected notes up or down by 1 semitone'}</td>
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
                  <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
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

        </main>
      </div>
    </div>
  );
};
export default LearnArticleView;

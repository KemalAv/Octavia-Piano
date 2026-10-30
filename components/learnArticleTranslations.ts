// Helper localization strings for LearnArticleView
import { AppLanguage } from '../types';

export const getLearnTranslations = (lang: AppLanguage = 'en') => {
  const isId = lang === 'id';
  const isEs = lang === 'es';

  return {
    // Top bar & Nav
    backToMenu: isId ? 'Menu' : isEs ? 'Menú' : 'Menu',
    close: isId ? 'Tutup' : isEs ? 'Cerrar' : 'Close',
    guideBadge: isId ? 'Panduan Lengkap' : isEs ? 'Guía Completa' : 'Comprehensive Guide',
    guideSubtitle: isId
      ? 'Kuasai notasi balok, biomekanika jari ergonomis, tuts virtual Roblox, dan teori harmoni.'
      : isEs
      ? 'Domina la lectura de partituras, mecánica ergonómica de dedos, teclas virtuales de Roblox y teoría armónica.'
      : 'Master staff notation, ergonomic finger mechanics, Roblox virtual keys, and harmonic theory.',
    curriculum: isId ? 'Kurikulum Akademi' : isEs ? 'Plan de Estudios' : 'Academy Curriculum',

    // Chapter 1
    ch1Badge: isId ? 'Bab 1 • Notasi Musik' : isEs ? 'Capítulo 1 • Notación' : 'Chapter 1 • Music Notation',
    ch1Masterclass: isId ? 'Masterclass Grand Staff' : isEs ? 'Clase Magistral Pentagrama' : 'Grand Staff Masterclass',
    ch1Title: isId ? 'Cara Membaca Not Balok Piano: Grand Staff' : isEs ? 'Cómo Leer Partituras de Piano: El Gran Pentagrama' : 'How to Read Piano Sheet Music: The Grand Staff',
    ch1Desc: isId
      ? 'Not balok piano menggunakan dua paranada (stave) yang disatukan oleh tanda kurung kurawal siku, disebut Grand Staff (Paranada Ganda). Paranada atas adalah Kunci G / Treble Clef (dimainkan oleh Tangan Kanan), dan paranada bawah adalah Kunci F / Bass Clef (dimainkan oleh Tangan Kiri).'
      : isEs
      ? 'Las partituras de piano utilizan dos pentagramas unidos por una llave, llamados Gran Pentagrama. El pentagrama superior es la Clave de Sol (mano derecha) y el inferior es la Clave de Fa (mano izquierda).'
      : 'Piano sheet music uses two staves joined together by a brace, called the Grand Staff. The upper staff is the Treble Clef (played by the Right Hand), and the lower staff is the Bass Clef (played by the Left Hand).',
    ch1VisualTitle: isId ? 'Panduan Visual: Grand Staff & C Tengah' : isEs ? 'Guía Visual: Gran Pentagrama y Do Central' : 'Visual Guide: The Grand Staff & Middle C',
    ch1TrebleTitle: isId ? 'Kunci G / Treble Clef 𝄞' : isEs ? 'Clave de Sol 𝄞' : 'Treble Clef (G Clef) 𝄞',
    ch1RightHand: isId ? 'Tangan Kanan' : isEs ? 'Mano Derecha' : 'Right Hand',
    ch1TrebleDesc: isId
      ? 'Pusaran Kunci G melingkari garis kedua dari bawah, yaitu nada G4. Mengatur melodi register menengah hingga tinggi.'
      : isEs
      ? 'El giro de la Clave de Sol rodea la segunda línea desde abajo, que es la nota Sol4 (G4). Gobierna las melodías de registro medio a agudo.'
      : 'The swirl of the Treble Clef encircles the second line from the bottom, which is note G4. It governs mid-to-high register melodies.',
    ch1Lines5: isId ? '5 Garis (Bawah ke Atas):' : isEs ? '5 Líneas (De abajo hacia arriba):' : '5 Lines (Bottom to Top):',
    ch1Spaces4: isId ? '4 Spasi (Bawah ke Atas):' : isEs ? '4 Espacios (De abajo hacia arriba):' : '4 Spaces (Bottom to Top):',
    ch1TrebleLineMnemo: isId ? 'Jembatan Keledai: "Every Good Boy Does Fine" (E - G - B - D - F)' : isEs ? 'Mnemotecnia: "Every Good Boy Does Fine" (E - G - B - D - F)' : 'Mnemonic: "Every Good Boy Does Fine"',
    ch1TrebleSpaceMnemo: isId ? 'Membentuk kata: "FACE" (F - A - C - E)' : isEs ? 'Forma la palabra: "FACE" (F - A - C - E)' : 'Mnemonic: Spells the word "FACE"',
    ch1BassTitle: isId ? 'Kunci F / Bass Clef 𝄢' : isEs ? 'Clave de Fa 𝄢' : 'Bass Clef (F Clef) 𝄢',
    ch1LeftHand: isId ? 'Tangan Kiri' : isEs ? 'Mano Izquierda' : 'Left Hand',
    ch1BassDesc: isId
      ? 'Dua titik Kunci F mengapit garis keempat, yaitu nada F3. Mengatur pola bass rendah, nada dasar akor, dan pengiring ritmis.'
      : isEs
      ? 'Los dos puntos de la Clave de Fa flanquean la cuarta línea, que es la nota Fa3 (F3). Gobierna los bajos graves y el acompañamiento.'
      : 'The two dots of the Bass Clef flank the fourth line, which is note F3. It governs low basslines, harmonic roots, and accompaniment.',
    ch1BassLineMnemo: isId ? 'Jembatan Keledai: "Good Boys Do Fine Always" (G - B - D - F - A)' : isEs ? 'Mnemotecnia: "Good Boys Do Fine Always" (G - B - D - F - A)' : 'Mnemonic: "Good Boys Do Fine Always"',
    ch1BassSpaceMnemo: isId ? 'Jembatan Keledai: "All Cows Eat Grass" (A - C - E - G)' : isEs ? 'Mnemotecnia: "All Cows Eat Grass" (A - C - E - G)' : 'Mnemonic: "All Cows Eat Grass"',
    ch1MidCTitle: isId ? 'C Tengah (C4): Jangkar Pusat Antara Kedua Paranada' : isEs ? 'Do Central (C4): El Ancla Central Entre Ambos Pentagramas' : 'Middle C (C4): The Center Anchor Between Both Staves',
    ch1MidCDesc: isId
      ? 'C Tengah (MIDI Note 60) tidak berada di dalam 5 garis tetap—melainkan mengambang di garis bantu kecil (ledger line) tepat di tengah kedua paranada:'
      : isEs
      ? 'El Do Central (Nota MIDI 60) no pertenece estrictamente a ningún pentagrama de 5 líneas; descansa en una línea adicional corta flotando en el medio:'
      : 'Middle C (MIDI Note 60) does not belong strictly to either 5-line staff—it rests on a short horizontal ledger line floating directly in the middle between the Treble and Bass staves:',
    ch1MidCBullet1: isId ? 'Jika ditulis dengan garis bantu di BAWAH paranada Treble, dimainkan oleh TANGAN KANAN.' : isEs ? 'Cuando se escribe con línea adicional DEBAJO de la Clave de Sol, se toca con la MANO DERECHA.' : 'When written with a ledger line below the Treble Staff, it is played by the Right Hand.',
    ch1MidCBullet2: isId ? 'Jika ditulis dengan garis bantu di ATAS paranada Bass, dimainkan oleh TANGAN KIRI.' : isEs ? 'Cuando se escribe con línea adicional ARRIBA de la Clave de Fa, se toca con la MANO IZQUIERDA.' : 'When written with a ledger line above the Bass Staff, it is played by the Left Hand.',
    ch1MidCBullet3: isId ? 'Pada piano 88 tuts, ini adalah tuts C ke-4 dari kiri, tepat di depan logo merek piano.' : isEs ? 'En un piano estándar de 88 teclas, es el cuarto "Do" desde la izquierda, justo frente al logotipo del piano.' : 'On a standard 88-key piano, it is the 4th "C" from the left, positioned right in front of the piano brand logo.',
    ch1StaffToPianoTitle: isId ? 'Panduan Visual: Menghubungkan Grand Staff ke Tuts Piano Fisik' : isEs ? 'Guía Visual: Conectando el Pentagrama con el Teclado del Piano' : 'Visual Guide: Connecting the Grand Staff to the Real Piano Keyboard',
    ch1StaffToPianoDesc: isId
      ? 'Bagaimana not 2D pada kertas partitur berhubungan langsung dengan 88 tuts fisik di hadapan Anda? Setiap garis dan spasi mengarah ke tuts fisik yang pasti tanpa ragu!'
      : isEs
      ? '¿Cómo se traduce la partitura 2D a las 88 teclas físicas frente a ti? ¡Cada línea y espacio corresponde exactamente a una tecla física invariable!'
      : 'How does the 2D sheet music staff translate directly to the 88 physical keys in front of you? Follow the laser projection lines below—every line and space corresponds to an exact, unvarying physical key on the piano!',

    // Chapter 2
    ch2Badge: isId ? 'Bab 2 • Ritme Visual' : isEs ? 'Capítulo 2 • Ritmo Visual' : 'Chapter 2 • Visual Rhythm',
    ch2Title: isId ? 'Falling Notes & Fitur Revolusioner "Mode Tunggu" (Wait Mode)' : isEs ? 'Notas Cayendo y el Revolucionario "Modo Espera" (Wait Mode)' : 'Falling Notes & The Revolutionary "Wait Mode"',
    ch2Desc: isId
      ? 'Falling Notes (dipopulerkan oleh Synthesia) memberikan visualisasi 1-banding-1 di mana balok not warna-warni jatuh tepat di atas tuts piano yang bersangkutan.'
      : isEs
      ? 'Falling Notes (popularizado por Synthesia) proporciona una cascada visual 1 a 1 donde las barras de notas de colores caen directamente sobre sus teclas físicas.'
      : 'Falling Notes (popularized by Synthesia) provides a 1-to-1 visual cascade where colorful note bars fall directly above their physical keys on the piano keyboard.',
    ch2VisualTitle: isId ? 'Panduan Visual: Air Terjun Not & Garis Pukul Mode Tunggu' : isEs ? 'Guía Visual: Cascada de Notas y Línea de Golpe en Modo Espera' : 'Visual Guide: Falling Note Cascade & Wait Mode Strike Line',
    ch2WaitTitle: isId ? 'Kenapa "Mode Tunggu" Adalah Trik Terbaik Bagi Pemula Piano' : isEs ? 'Por qué el "Modo Espera" es el Mejor Truco para Principiantes' : 'Why "Wait Mode" is the #1 Beginner Piano Hack',
    ch2WaitDesc: isId
      ? 'Hambatan terbesar bagi pemula adalah kepanikan tempo: saat not meluncur deras, jari membeku dan menekan tuts salah. Mode Tunggu Octavia menyelesaikan ini secara tuntas:'
      : isEs
      ? 'La mayor barrera para los pianistas principiantes es la ansiedad del tempo: cuando las notas caen a toda velocidad, el jugador se bloquea. El Modo Espera de Octavia elimina esto por completo:'
      : 'The single biggest barrier for novice pianists is tempo anxiety: when notes drop at full speed, players freeze, hit wrong keys, and develop sloppy habits. Octavia\'s Wait Mode completely eliminates this:',
    ch2WaitNoteStops: isId ? 'Not Berhenti dan Sabar Menunggu Anda' : isEs ? 'La Nota se Detiene y te Espera Pacientemente' : 'The Note Stops and Waits for You',
    ch2WaitNoteStopsDesc: isId
      ? 'Setiap kali not baru menyentuh garis tuts piano, lagu otomatis berhenti sejenak. Lagu akan sabar menunggu sampai Anda menekan tuts fisik yang benar. Begitu tuts benar ditekan, lagu langsung lanjut mengalir!'
      : isEs
      ? 'Cada vez que una nueva nota llega a la línea de golpe, toda la canción se detiene automáticamente. Espera pacientemente hasta que toques la tecla física correcta. ¡Tan pronto como tocas la tecla correcta, la música se reanuda al instante!'
      : 'Whenever a new note reaches the piano keyboard strike line, the entire song automatically pauses. It patiently waits until you physically strike the exact correct key. As soon as you hit the right key, the music instantly resumes!',
    ch2ZeroPressure: isId ? '1. Tanpa Tekanan' : isEs ? '1. Cero Presión' : '1. Zero Pressure',
    ch2ZeroPressureDesc: isId ? 'Luangkan waktu mencari akor rumit tanpa takut kalah atau kehilangan kombo.' : isEs ? 'Tómate el tiempo necesario para ubicar acordes difíciles sin perder tu racha.' : 'Take 10 seconds to locate tricky chords without losing your streak.',
    ch2MuscleMemory: isId ? '2. Memori Otot Murni' : isEs ? '2. Memoria Muscular Pura' : '2. Pure Muscle Memory',
    ch2MuscleMemoryDesc: isId ? 'Merekam jarak perpindahan antar jari secara alami ke alam bawah sadar Anda.' : isEs ? 'Graba las distancias exactas de los dedos en tu memoria subconsciente.' : 'Encodes the exact finger distances into your subconscious memory.',
    ch2Seamless: isId ? '3. Transisi Mulus' : isEs ? '3. Transición Fluida' : '3. Seamless Transition',
    ch2SeamlessDesc: isId ? 'Setelah jari hafal posisi tuts, matikan Mode Tunggu untuk bermain pada kecepatan asli.' : isEs ? 'Una vez que tus dedos memoricen las posiciones, desactiva el Modo Espera para tocar a tempo real.' : 'Once your fingers know the positions, disable Wait Mode to play at tempo.',
    ch2BarLengthTitle: isId ? 'Panjang Balok Not = Durasi Menahan Tuts' : isEs ? 'Longitud de Barra = Duración de la Nota' : 'Note Bar Length = Key Sustain Duration',
    ch2BarLengthDesc: isId ? 'Panjang vertikal persegi panjang menunjukkan nilai ketukan durasi not:' : isEs ? 'La longitud vertical de cada rectángulo corresponde a su duración exacta:' : 'The vertical length of each rectangle corresponds to its precise note value:',
    ch2BarShort: isId ? 'Balok persegi pendek (Staccato): Sentuh dan lepas cepat seketika.' : isEs ? 'Barras cuadradas cortas (Staccato): Toque rápido y suelta de inmediato.' : 'Short square bars (Staccato): Quick tap—strike and release immediately.',
    ch2BarStandard: isId ? 'Balok standar: Not 1 ketuk (Seperempat)—tahan sepanjang ketukan nada.' : isEs ? 'Barras estándar: Negras de 1 tiempo—mantén pulsado durante el pulso.' : 'Standard rectangular bars: 1-beat Quarter notes—hold for the pulse.',
    ch2BarLong: isId ? 'Balok panjang memanjang: Not 2 atau 4 ketuk—tahan tuts sampai ekor balok lewat garis pukul.' : isEs ? 'Barras alargadas: Notas de 2 o 4 tiempos—mantén la tecla pulsada hasta que pase la cola.' : 'Elongated tall bars: 2-beat or 4-beat sustained notes—keep key held down until the trailing tail clears the strike line.',
    ch2HandColors: isId ? 'Warna Tangan Kiri vs Kanan' : isEs ? 'Código de Colores por Mano' : 'Hand Color Coding',
    ch2HandColorsDesc: isId ? 'Jangan pernah bingung tangan mana yang harus memukul:' : isEs ? 'No adivines qué mano toca cada nota:' : 'Never guess which hand plays which note:',
    ch2HandCyan: isId ? 'Sian / Biru Terang: Tangan Kanan (melodi utama, arpeggio, harmoni atas).' : isEs ? 'Cian / Azul Brillante: Mano Derecha (melodías principales, arpegios y armonía superior).' : 'Cyan / Bright Blue: Right Hand (lead melodies, arpeggios, and upper harmony).',
    ch2HandPurple: isId ? 'Ungu / Indigo: Tangan Kiri (nada dasar bass, interval kuint rendah, fondasi akor).' : isEs ? 'Púrpura / Índigo: Mano Izquierda (notas fundamentales graves y acordes).' : 'Purple / Indigo: Left Hand (bass roots, low fifths, and chord foundations).',
    ch2MethodTitle: isId ? 'Metode Latihan 3 Langkah (Cara Pianis Pro Berlatih)' : isEs ? 'Método de Maestría en 3 Pasos (Cómo Practican los Profesionales)' : 'The 3-Step Mastery Method (How Pro Pianists Practice)',
    ch2Step1: isId ? 'Langkah 1: Tangan Terpisah (Hands Separate)' : isEs ? 'Paso 1: Manos Separadas' : 'Step 1: Hands Separate (HS)',
    ch2Step1Desc: isId ? 'Latihlah tangan kanan terlebih dahulu sampai hafal posisi jari, baru kemudian latih tangan kiri sendiri.' : isEs ? 'Toca primero solo con la mano derecha hasta memorizar los dedos, luego practica la mano izquierda.' : 'Play with Right Hand only first until fingerings feel automatic, then practice Left Hand alone.',
    ch2Step2: isId ? 'Langkah 2: Kedua Tangan Bersama + Mode Tunggu' : isEs ? 'Paso 2: Ambas Manos con Modo Espera' : 'Step 2: Hands Together with Wait Mode',
    ch2Step2Desc: isId ? 'Gabungkan kedua tangan dengan Mode Tunggu AKTIF agar ritme tidak tersendat dan tidak terbentuk kebiasaan ragu.' : isEs ? 'Combina ambas manos con el Modo Espera ACTIVADO para no tropezar ni crear dudas.' : 'Combine both hands with Wait Mode ON so you never stumble or form hesitation glitches.',
    ch2Step3: isId ? 'Langkah 3: Mainkan pada Kecepatan 100% Penuh' : isEs ? 'Paso 3: Toca al 100% de Velocidad' : 'Step 3: Play at 100% Full Tempo',
    ch2Step3Desc: isId ? 'Matikan Mode Tunggu dan biarkan memori otot Anda membimbing permainan musik yang hidup.' : isEs ? 'Desactiva el Modo Espera y deja que la memoria muscular guíe tu interpretación.' : 'Turn Wait Mode OFF and let muscle memory carry you through the full dynamic performance.',

    // Chapter 3
    ch3Badge: isId ? 'Bab 3 • Ergonomi & Teknik' : isEs ? 'Capítulo 3 • Ergonomía y Técnica' : 'Chapter 3 • Ergonomics & Technique',
    ch3Title: isId ? 'Penomoran Jari Piano (1–5), Postur Tangan & Rahasia "Thumb Tuck"' : isEs ? 'Digitación del Piano (1–5), Postura y el Secreto del "Paso de Pulgar"' : 'Piano Fingering (1–5), Posture & The "Thumb Tuck" Secret',
    ch3Desc: isId
      ? 'Penomoran jari bukan sekadar aturan kaku—ini adalah efisiensi biomekanis biologis. Posisi jari yang tepat mencegah kram pergelangan dan memungkinkan tangga nada melesat kencang.'
      : isEs
      ? 'La digitación correcta no se trata de reglas arbitrarias, sino de eficiencia biomecánica. Una colocación adecuada evita lesiones y permite escalas ultrarrápidas.'
      : 'Proper fingering is not about arbitrary rules—it is about biological efficiency. Correct finger assignments prevent wrist strain, cramping, and enable lightning-fast scalar runs.',
    ch3VisualTitle: isId ? 'Panduan Visual: Penomoran Jari Tangan Kiri & Kanan (1 sampai 5)' : isEs ? 'Guía Visual: Número de Dedos de la Mano Izquierda y Derecha (1 al 5)' : 'Visual Guide: Left & Right Hand Finger Numbers (1 to 5)',
    ch3Standard: isId ? 'Standar Biomekanika' : isEs ? 'Estándar Biomecánico' : 'Biomechanical Standard',
    ch3NumberingTitle: isId ? 'Penomoran Jari Internasional 1–5' : isEs ? 'Numeración Internacional de Dedos 1–5' : 'International 1–5 Finger Numbering',
    ch3NumberingDesc: isId ? 'Kedua tangan kiri dan kanan menggunakan penomoran anatomi yang sama persis:' : isEs ? 'Tanto la mano izquierda como la derecha siguen exactamente la misma numeración:' : 'Both left and right hands follow the exact same anatomical numbering:',
    ch3Finger1: isId ? 'Jempol: Kuat, lincah, berputar di bawah telapak tangan.' : isEs ? 'Pulgar: Fuerte, ágil, pivota debajo de la palma.' : 'Thumb: Heavy, agile, pivots underneath the palm.',
    ch3Finger2: isId ? 'Telunjuk: Sangat mandiri dan presisi tinggi.' : isEs ? 'Índice: Muy independiente y preciso.' : 'Index Finger: Highly independent and precise.',
    ch3Finger3: isId ? 'Jari Tengah: Jari terpanjang; jembatan utama penyeberangan jari.' : isEs ? 'Medio: El dedo más largo; puente principal para cruces.' : 'Middle Finger: Longest finger; main crossover bridge.',
    ch3Finger4: isId ? 'Jari Manis: Berbagi tendon alami dengan jari 3 & 5; jaga tetap rileks.' : isEs ? 'Anular: Comparte tendones con el 3 y 5; mantenlo relajado.' : 'Ring Finger: Naturally shares tendons with 3 & 5; keep relaxed.',
    ch3Finger5: isId ? 'Kelingking: Jangkar tepi yang kokoh untuk lompatan oktaf dan nada melodi tinggi.' : isEs ? 'Meñique: Ancla fuerte para saltos de octava y notas agudas.' : 'Pinky: Strong edge anchor for octave leaps and melody highs.',
    ch3PostureTitle: isId ? 'Postur Duduk Ergonomis & Penyelarasan Tubuh' : isEs ? 'Postura Ergonómica al Sentarse' : 'Ergonomic Seating & Body Posture',
    ch3BenchHeight: isId ? 'Ketinggian Kursi & Posisi Lengan' : isEs ? 'Altura del Banco y Nivel de Antebrazos' : 'Bench Height & Forearm Alignment',
    ch3BenchHeightDesc: isId ? 'Atur kursi sehingga lengan bawah sejajar lurus dengan tuts piano. Jika terlalu rendah bahu akan terangkat kaku; jika terlalu tinggi pergelangan tangan akan membengkok ke bawah.' : isEs ? 'Ajusta la banqueta para que tus antebrazos estén completamente paralelos a las teclas. Si es muy bajo subirás los hombros; si es muy alto tus muñecas caerán.' : 'Adjust your bench so your forearms are completely level and parallel with the piano keys. If your bench is too low, you will hike your shoulders; if too high, your wrists will bend downwards.',
    ch3FrontHalf: isId ? 'Duduk di Paruh Depan Kursi & Menapak Lantai' : isEs ? 'Sentarse en la Mitad Delantera' : 'Front-Half Bench Seating & Grounding',
    ch3FrontHalfDesc: isId ? 'Duduklah di paruh depan kursi dengan tulang punggung tegak dan kedua telapak kaki menapak kokoh di lantai untuk menopang berat badan.' : isEs ? 'Siéntate en la mitad delantera con la espalda recta y ambos pies apoyados firmemente en el suelo.' : 'Sit on the front half of the bench with your spine upright and pelvis tilted slightly forward. Keep both feet planted firmly flat on the floor to support your upper body weight.',
    ch3DomeArch: isId ? 'Kubah Jari Menggenggam Bola Tenis' : isEs ? 'Arco de Cúpula Sosteniendo una Naranja' : 'The "Holding an Orange" Dome Arch',
    ch3DomeArchDesc: isId ? 'Lengkungkan jari Anda menyerupai kubah seperti sedang memegang bola atau jeruk. Tekan tuts menggunakan bantalan empuk di bawah ujung kuku.' : isEs ? 'Curva suavemente los dedos como si sostuvieras una pelota de tenis. Presiona las teclas con las yemas carnosas justo debajo de las uñas.' : 'Curve your fingers gently like a dome as if holding a tennis ball or orange. Strike the keys using the cushiony fleshy pads just beneath the fingernail tips.',

    // Wrist Motions
    ch3WristTitle: isId ? '3 Gerakan Utama Pergelangan & Lengan (Teknik Pianis Pro)' : isEs ? 'Los 3 Movimientos Esenciales de Muñeca y Brazo' : 'The 3 Essential Wrist & Arm Motions (Pro Piano Technique)',
    ch3WristDesc: isId
      ? 'Pianis hebat tidak bermain mengandalkan kekuatan jari saja—otot jari kecil dan cepat lelah. Pianis konser mengalirkan bobot lengan dan fleksibilitas pergelangan:'
      : isEs
      ? 'Los pianistas profesionales no tocan solo con fuerza en los dedos: canalizan el peso del brazo y la flexibilidad de la muñeca a través de tres movimientos fundamentales:'
      : 'Pianists do not play with finger strength alone—finger muscles are small and tire easily. Professional concert pianists channel arm weight and wrist flexibility through three fundamental biomechanical motions:',
    ch3Motion1: isId ? '1. Jatuhan Berat Vertikal (Napas Pergelangan)' : isEs ? '1. Caída de Peso Vertical (Muñeca Respiratoria)' : '1. Vertical Weight Drop ("Breathing Wrist")',
    ch3Motion1Desc: isId ? 'Jatuhkan beban lengan yang rileks ke atas tuts untuk akor yang bergaung penuh. Angkat pergelangan dengan lembut di akhir frasa musik.' : isEs ? 'Deja caer el peso relajado del brazo para acordes sonoros. Al final de la frase, eleva suavemente la muñeca para respirar.' : 'Drop relaxed arm weight into the keybed for rich, resonant chords. At the end of musical phrases, gently lift the wrist like taking a breath to release tension.',
    ch3Motion2: isId ? '2. Rotasi Lengan Bawah (Pronasi / Supinasi)' : isEs ? '2. Rotación del Antebrazo' : '2. Forearm Rotation (Pronation / Supination)',
    ch3Motion2Desc: isId ? 'Putar lengan bawah seperti memutar gagang pintu untuk memindahkan tumpuan antara Jempol (1) dan Kelingking (5). Rahasia bass Alberti yang ringan dan lancar!' : isEs ? 'Gira el antebrazo como al abrir una puerta para transferir peso entre el pulgar (1) y el meñique (5). ¡El secreto de los bajos Alberti rápidos!' : 'Twist the forearm like turning a doorknob to transfer weight back and forth between Thumb (1) and Pinky (5). The secret behind effortless Alberti bass and fast broken octaves!',
    ch3Motion3: isId ? '3. Peluncuran Lengan Lateral' : isEs ? '3. Desplazamiento Lateral del Brazo' : '3. Lateral Arm Tracking',
    ch3Motion3Desc: isId ? 'Luncurkan pergelangan dan lengan secara mendatar mengikuti arah tuts kiri-kanan. Jangan pernah menekuk pergelangan ke samping secara paksa.' : isEs ? 'Desliza el brazo horizontalmente a lo largo del teclado. Nunca tuerzas la muñeca hacia los lados.' : 'Glide the wrist and forearm horizontally along the keyboard as you travel up and down the keys. Never contort your wrist sideways (ulnar deviation); let the arm guide the hand.',

    // Thumb Tuck
    ch3ThumbTuckTitle: isId ? 'Rahasia Tangga Nada: "Thumb Tuck" (Jempol Masuk di Bawah Telapak)' : isEs ? 'El Secreto de las Escalas: "Paso de Pulgar" (Passaggio del Pollice)' : 'The "Thumb Tuck" (Passaggio del Pollice)',
    ch3ThumbTuckDesc: isId
      ? 'Kita memiliki 5 jari, namun tangga nada satu oktaf memiliki 8 nada berurutan (C-D-E-F-G-A-B-C). Jika Anda memakai jari 1-2-3-4-5, jari akan habis di G4! Bagaimana cara pianis memainkan tangga nada tanpa putus?'
      : isEs
      ? 'Tenemos 5 dedos, pero una escala de una octava contiene 8 notas consecutivas (Do-Re-Mi-Fa-Sol-La-Si-Do). Si tocas 1-2-3-4-5, ¡te quedas sin dedos en Sol! ¿Cómo tocan los pianistas pasajes continuos a gran velocidad?'
      : 'We have 5 fingers, but a standard octave scale contains 8 consecutive notes (C-D-E-F-G-A-B-C). If you play 1-2-3-4-5, you run out of fingers at G4! How do classical concert pianists play uninterrupted 4-octave runs at lightning speed?',
    ch3SecretMotion: isId
      ? 'Rahasia Gerakan: Saat Jari 3 menekan E4, selipkan jempol (1) dengan mulus di bawah lengkungan Jari 3 untuk memukul F4. Begitu jempol mendarat di F4, telapak tangan ikut berputar ke kanan, mereset jari 2, 3, 4, 5 untuk memainkan G4, A4, B4, C5!'
      : isEs
      ? 'El Movimiento Secreto: Mientras el dedo 3 sostiene Mi4, mete el pulgar (1) suavemente por debajo del arco del dedo 3 para tocar Fa4. Al tocar Fa4, la mano se reubica para tocar 2, 3, 4, 5 en Sol4, La4, Si4, Do5.'
      : 'The Secret Motion: While Finger 3 is holding down E4, tuck your thumb (1) smoothly underneath the arch of Finger 3 to strike F4. Once your thumb lands on F4, your entire hand effortlessly pivots forward, resetting your fingers to play 2, 3, 4, 5 for G4, A4, B4, C5!',
    ch3DescendingDesc: isId
      ? 'Saat turun dari C5 ke C4 (5-4-3-2-1 pada C5 ke F4), begitu jempol memukul F4, silangkan Jari 3 MELOMPATI jempol menuju E4, diakhiri dengan 2 di D4 dan 1 di C4.'
      : isEs
      ? 'Al descender de Do5 a Do4 (5-4-3-2-1 en Fa4), cruza el dedo 3 POR ENCIMA del pulgar hacia Mi4, finalizando con 2 en Re4 y 1 en Do4.'
      : 'When descending from C5 to C4 (5-4-3-2-1 on C5 to F4), once your thumb hits F4, cross Finger 3 OVER your thumb onto E4, finishing with 2 on D4 and 1 on C4.',

    // Chapter 4
    ch4Badge: isId ? 'Bab 4 • Bermain di Keyboard Komputer' : isEs ? 'Capítulo 4 • Teclado de PC' : 'Chapter 4 • Computer Keyboard Gaming',
    ch4Title: isId ? 'Masterclass Keyboard PC: Qwerty Typer & Partitur Sheet Music QWERTY' : isEs ? 'Clase Magistral de Teclado PC: Qwerty Typer y Partituras QWERTY' : 'PC Keyboard Masterclass: Qwerty Typer & Sheet Music QWERTY',
    ch4Desc: isId
      ? 'Berbeda dengan situs partitur teks internet lama yang membingungkan dengan kurung siku, Octavia menyediakan dua mode tampilan visual interaktif real-time di Pengaturan > Visual & Gameplay > Game View khusus untuk keyboard laptop dan PC Anda.'
      : isEs
      ? 'A diferencia de las partituras tradicionales basadas en texto en internet, Octavia ofrece dos vistas de juego interactivas en tiempo real en Ajustes > Gráficos y Jugabilidad > Vista de Juego para tu teclado de ordenador.'
      : 'Unlike traditional internet text-based sheets (which force you to read cryptic bracket strings), Octavia provides two dedicated, real-time interactive game views in Settings > Visuals & Gameplay > Game View designed specifically for playing on your laptop or PC mechanical keyboard.',
    ch4RobloxLayout: isId ? '1. Tata Letak Roblox (MIRP)' : isEs ? '1. Distribución Roblox (MIRP)' : '1. Roblox (MIRP) Layout',
    ch4RobloxDesc: isId ? 'Standar pemetaan piano virtual universal yang digunakan di Roblox dan game piano virtual seluruh dunia:' : isEs ? 'La distribución universal de piano virtual utilizada en Roblox y aplicaciones web de todo el mundo:' : 'The universal virtual piano mapping used across Roblox and virtual piano web apps worldwide:',
    ch4CompactLayout: isId ? '2. Tata Letak Compact Standar' : isEs ? '2. Distribución Compacta Estándar' : '2. Standard Compact Layout',
    ch4CompactDesc: isId ? 'Tata letak kromatik 2-oktaf yang meniru posisi tuts piano fisik tanpa membutuhkan tombol Shift untuk tuts hitam:' : isEs ? 'Una distribución cromática de 2 octavas que modela la disposición física del piano sin necesidad de pulsar Shift para teclas negras:' : 'A 2-octave chromatic layout that models physical piano key arrangement without needing the Shift key for black notes:',

    // Chapter 5
    ch5Badge: isId ? 'Bab 5 • Laboratorium Teori Musik' : isEs ? 'Capítulo 5 • Teoría Musical' : 'Chapter 5 • Music Theory Lab',
    ch5Title: isId ? 'Esensi Teori Musik: Akor, Tangga Nada & Semitone' : isEs ? 'Fundamentos de Teoría Musical: Acordes, Escalas e Intervalos' : 'Music Theory Essentials: Chords, Scales & Semitones',
    ch5Desc: isId
      ? 'Musik bukanlah acak—ia dibangun di atas hubungan matematis elegan yang disebut Interval. Setelah Anda memahami rumus semitone (setengah nada), Anda dapat menyusun semua akor dan tangga nada di 12 kunci nada!'
      : isEs
      ? 'La música no es aleatoria: se basa en elegantes relaciones matemáticas llamadas Intervalos. ¡Una vez que aprendas las fórmulas de semitonos, podrás construir cualquier acorde y escala en las 12 tonalidades!'
      : 'Music is not random—it is built on elegant mathematical relationships called Intervals. Once you learn the semitone formulas, you can construct every chord and scale in all 12 musical keys without memorizing hundreds of diagrams.',
    ch5RulerTitle: isId ? 'Panduan Visual: Penggaris Interval 12-Semitone' : isEs ? 'Guía Visual: Regla de Intervalos de 12 Semitonos' : 'Visual Guide: The 12-Semitone Interval Ruler',
    ch5TriadVoicingTitle: isId ? 'Panduan Visual: Akor Mayor vs Minor pada Tuts Piano' : isEs ? 'Guía Visual: Acordes Mayores vs Menores en el Teclado' : 'Visual Guide: Major vs Minor Triad Voicing on the Piano Keyboard',

    // Chapter 6
    ch6Badge: isId ? 'Latihan Teknis Akademi' : isEs ? 'Ejercicios Técnicos de la Academia' : 'Technical Academy Drills',
    ch6Title: isId ? 'Latihan Jari & Pola Drill Teknis' : isEs ? 'Ejercicios de Práctica y Destreza Técnica' : 'Practice Drills & Technical Exercises',
    ch6Desc: isId
      ? 'Bangun ketangkasan jari yang lincah, kuasai tangga nada modal, kembangkan kecepatan membaca not balok, dan latih progresi harmoni di seluruh 12 nada dasar.'
      : isEs
      ? 'Desarrolla destreza en los dedos, domina escalas modales, perfecciona la lectura a primera vista y entrena progresiones armónicas en las 12 tonalidades.'
      : 'Build agile finger dexterity, master modal scale runs, develop rapid sight reading, and drill harmonic progressions across all 12 keys.',
    ch6RootKey: isId ? 'Pilih Nada Dasar' : isEs ? 'Elige la Tonalidad Raíz' : 'Choose Root Key',
    ch6RootKeyDesc: isId ? 'Mentransposisi semua latihan secara dinamis ke nada yang dipilih' : isEs ? 'Transpone todos los ejercicios dinámicamente a la clave elegida' : 'Transposes all drills dynamically to chosen key',
    ch6PlayDrill: isId ? 'Mulai Latihan' : isEs ? 'Tocar Ejercicio' : 'Play Drill',

    // Chapter 7 • MIDI Editor & Sequencer
    ch8Badge: isId ? 'Bab 7 • Editor MIDI & Sekuenser' : isEs ? 'Capítulo 7 • Editor MIDI y Secuenciador' : 'Chapter 7 • MIDI Editor & Sequencer',

    // Chapter 8 • Curated YouTube Masterclasses
    ch7Badge: isId ? 'Bab 8 • Masterclass Video YouTube Terpilih' : isEs ? 'Capítulo 8 • Clases Magistrales Seleccionadas de YouTube' : 'Chapter 8 • Curated YouTube Masterclasses',
    ch7Title: isId ? 'Masterclass Tutorial Video Visual' : isEs ? 'Clases Magistrales en Video' : 'Visual Video Masterclasses',
    ch7Desc: isId
      ? 'Tonton panduan visual berkualitas tinggi yang membahas membaca notasi balok, tanda kunci, pembentukan akor, biomekanika pergelangan tangan, dan kontrol piano Roblox PC.'
      : isEs
      ? 'Disfruta de explicaciones visuales de alto nivel sobre lectura de partituras, armaduras, digitación ergonómica y controles virtuales de teclado de PC.'
      : 'Watch high-yield visual breakdowns covering sheet music notation, key signatures, chord voicings, ergonomic wrist mechanics, and Roblox PC virtual piano controls.',
    ch7ReadChapter: isId ? 'Baca Bab Terkait' : isEs ? 'Leer Capítulo' : 'Read Chapter',
    ch7WatchYoutube: isId ? 'Tonton di YouTube' : isEs ? 'Ver en YouTube' : 'Watch on YouTube',
    ch8Masterclass: isId ? 'Masterclass Editor MIDI & Piano Roll' : isEs ? 'Clase Magistral de Editor MIDI y Piano Roll' : 'MIDI Editor & Piano Roll Masterclass',
    ch8Title: isId ? 'Panduan Lengkap Editor MIDI Octavia: Piano Roll, Kuantisasi, Velocity & Aransemen' : isEs ? 'Guía Completa del Editor MIDI de Octavia: Piano Roll, Cuantización, Dinámica y Arreglos' : 'Complete Octavia MIDI Editor Guide: Piano Roll, Quantization, Velocity & Sequencing',
    ch8Desc: isId
      ? 'Octavia dilengkapi editor sekuenser MIDI internal sekelas DAW yang memungkinkan Anda mengarang lagu dari nol, memperbaiki timing rekaman instrumen, mengatur dinamika ekspresi velocity, membagi jalur tangan kiri/kanan, dan mengekspor file Standard MIDI (.mid).'
      : isEs
      ? 'Octavia incluye un secuenciador MIDI interno tipo DAW para componer canciones desde cero, corregir el ritmo con cuantización, modelar dinámicas de velocidad, asignar manos y exportar archivos MIDI estándar (.mid).'
      : 'Octavia includes a built-in DAW-grade MIDI sequencer allowing you to compose songs from scratch, fix timing errors with grid quantization, shape expressive velocity dynamics, route left/right hand tracks, and export Standard MIDI (.mid) files.',
    ch8LaunchEditor: isId ? 'Buka Editor MIDI Sekarang' : isEs ? 'Abrir Editor MIDI Ahora' : 'Open MIDI Editor Now',
    ch8LaunchDesc: isId ? 'Mulai membuat atau mengedit file MIDI di ruang kerja interaktif' : isEs ? 'Comienza a crear o editar canciones MIDI en el espacio de trabajo interactivo' : 'Start creating or editing MIDI files in the interactive workspace',
    ch8VisualTitle: isId ? 'Panduan Visual: Antarmuka Piano Roll, Penggaris Birama & Kisi Resolusi 480 PPQ' : isEs ? 'Guía Visual: Interfaz de Piano Roll, Regla de Compases y Cuadrícula de 480 PPQ' : 'Visual Guide: Piano Roll Interface, Measure Ruler & 480 PPQ Grid Resolution',
    ch8ArchTitle: isId ? 'Arsitektur Koordinat: Sumbu Waktu (Ticks) & Sumbu Nada (Pitch)' : isEs ? 'Arquitectura de Coordenadas: Eje Temporal (Ticks) y Eje Tonal (Pitch)' : 'Coordinate Architecture: Time Axis (Ticks) & Pitch Axis (Midi Note)',
    ch8ArchDesc: isId
      ? 'Editor MIDI Octavia bekerja pada resolusi standar industri 480 Ticks Per Quarter Note (PPQ). Setiap ketukan birama dibagi secara presisi matematis, memungkinkan penempatan not dari not utuh (1/1) hingga not super cepat (1/64), triplet, maupun not bertitik.'
      : isEs
      ? 'El editor MIDI de Octavia opera con una resolución profesional de 480 Ticks por Negra (PPQ). Cada tiempo se subdivide matemáticamente, permitiendo notas desde redondas (1/1) hasta fusas (1/64), tresillos y notas con puntillo.'
      : 'The Octavia MIDI editor operates on an industry-standard 480 Ticks Per Quarter Note (PPQ) resolution. Every beat is divided with mathematical precision, allowing note placement from whole notes (1/1) down to 64th notes, triplets, and dotted durations.',
    ch8ToolbarTitle: isId ? 'Bilah Alat (Toolbar) & Multiplier Durasi Not' : isEs ? 'Barra de Herramientas y Multiplicadores de Duración' : 'Toolbar & Note Duration Multipliers',
    ch8ToolbarDesc: isId
      ? 'Pilih nilai ketukan default sebelum menggambar not baru di kanvas piano roll:'
      : isEs
      ? 'Selecciona el valor rítmico antes de dibujar notas en el lienzo del piano roll:'
      : 'Select your default rhythmic base before drawing new notes onto the piano roll canvas:',
    ch8ToolSelect: isId ? 'Seleksi & Box Drag' : isEs ? 'Selección y Caja de Arrastre' : 'Select & Marquee Box',
    ch8ToolSelectDesc: isId ? 'Klik not untuk memilih. Seret kotak seleksi untuk memilih banyak not atau seluruh akor sekaligus.' : isEs ? 'Haz clic en una nota para seleccionarla. Arrastra una caja para seleccionar acordes o compases enteros.' : 'Click any note to select. Drag a bounding box to select multiple notes or entire chords at once.',
    ch8ToolDraw: isId ? 'Gambar Not (Draw)' : isEs ? 'Dibujar Nota (Draw)' : 'Draw Notes',
    ch8ToolDrawDesc: isId ? 'Klik pada baris tuts dan kolom waktu yang diinginkan untuk menaruh not dengan durasi aktif.' : isEs ? 'Haz clic en la fila de tono y la columna de tiempo para insertar una nota con la duración activa.' : 'Click on any key row and time column to stamp a new note matching the active rhythm base.',
    ch8ToolResize: isId ? 'Ubah Durasi (Resize)' : isEs ? 'Redimensionar Duración' : 'Resize Duration',
    ch8ToolResizeDesc: isId ? 'Arahkan kursor ke ujung kanan balok not dan seret ke kanan/kiri untuk memperpanjang atau memperpendek ekor durasi not.' : isEs ? 'Pasa el cursor sobre el borde derecho de una nota y arrástralo para alargar o acortar su duración.' : 'Hover over the right edge of any note bar and drag left or right to lengthen or trim sustain duration.',
    ch8ToolErase: isId ? 'Hapus Not (Delete)' : isEs ? 'Eliminar Nota (Delete)' : 'Delete Notes',
    ch8ToolEraseDesc: isId ? 'Pilih not dan tekan tombol Delete / Backspace pada keyboard komputer Anda.' : isEs ? 'Selecciona las notas deseadas y presiona la tecla Supr / Retroceso en tu teclado.' : 'Select any note(s) and press Delete or Backspace on your computer keyboard.',
    ch8VelocityTitle: isId ? 'Velocity & Dinamika Ekspresif (0–127)' : isEs ? 'Velocidad y Dinámica Expresiva (0–127)' : 'Velocity & Expressive Dynamics (0–127)',
    ch8VelocityDesc: isId
      ? 'Velocity menentukan kekuatan tuts ditekan. Nilai 1–127 mencerminkan dinamika akustik dari ppp (bisikan lembut) hingga fff (hantaman kuat). Panel batang velocity di bagian bawah kanvas memudahkan Anda memanipulasi dinamika per not.'
      : isEs
      ? 'La velocidad define la fuerza con la que se presiona cada tecla. Valores de 1 a 127 representan desde pianissimo (ppp) hasta fortissimo (fff). El panel inferior permite ajustar la dinámica nota por nota.'
      : 'Velocity dictates key-strike force. Values from 1 to 127 model acoustic dynamics from delicate whispers (ppp) to thunderous fortissimo (fff). The lower velocity stalk lane lets you shape musical feel.',
    ch8HandsTitle: isId ? 'Pemisahan Jalur Tangan Kiri vs Kanan' : isEs ? 'Separación de Manos Izquierda vs Derecha' : 'Left Hand vs Right Hand Track Separation',
    ch8HandsDesc: isId
      ? 'Octavia membedakan not Tangan Kanan (Sian / Biru Terang) dan Tangan Kiri (Ungu / Indigo). Pemisahan ini sangat penting agar mesin animasi tangan 3D dan partitur not balok dapat merender fingering dan paranada secara akurat.'
      : isEs
      ? 'Octavia distingue notas para Mano Derecha (Cian) y Mano Izquierda (Índigo). Esta separación es crucial para que el motor de manos 3D y el pentagrama generen digitaciones correctas.'
      : 'Octavia distinguishes Right Hand notes (Cyan) from Left Hand notes (Indigo). This separation is vital for driving the 3D hand fingering engine and cleanly splitting treble and bass sheet music staves.',
    ch8TempoTitle: isId ? 'Peta Tempo (BPM), Birama & Tanda Nada' : isEs ? 'Mapa de Tempo (BPM), Compases y Tonalidades' : 'Tempo Map (BPM), Time Signatures & Keys',
    ch8TempoDesc: isId
      ? 'Atur tempo lagu (misalnya 120 BPM), masukkan perubahan tempo bertahap, dan pilih tanda birama (4/4, 3/4, 6/8) serta tanda kunci nada dasar (C Mayor hingga A# Minor) agar penamaan not mol dan kres selalu konsisten.'
      : isEs
      ? 'Configura el tempo (ej. 120 BPM), inserta cambios métricos, selecciona compases (4/4, 3/4, 6/8) y armaduras de clave para que las alteraciones se nombren correctamente.'
      : 'Set song tempo (e.g. 120 BPM), insert gradual tempo changes, and choose time signatures (4/4, 3/4, 6/8) and key signatures so sharps and flats are spelled musically.',
    ch8TutorialsTitle: isId ? 'Tutorial Praktis Langkah demi Langkah' : isEs ? 'Tutoriales Prácticos Paso a Paso' : 'Step-by-Step Practical Tutorials',
    ch8Tutorial1Title: isId ? 'Tutorial 1: Menyusun Progresi Akor Pop 4-Bar dari Nol' : isEs ? 'Tutorial 1: Crear una Progresión Pop de 4 Compases desde Cero' : 'Tutorial 1: Building a 4-Bar Pop Progression from Scratch',
    ch8Tutorial1Desc: isId
      ? 'Pelajari cara mengatur BPM 128, memilih durasi not utuh 1/1, dan menaruh akor C - G - Am - F lengkap dengan bass tangan kiri dan triad tangan kanan.'
      : isEs
      ? 'Aprende a fijar 128 BPM, seleccionar redondas (1/1) e introducir acordes de Do - Sol - Lam - Fa con bajos en mano izquierda y tríadas en mano derecha.'
      : 'Learn how to set 128 BPM, select 1/1 whole notes, and input a classic C - G - Am - F progression with left-hand roots and right-hand triads.',
    ch8Tutorial2Title: isId ? 'Tutorial 2: Kuantisasi & Merapikan Timing yang Berantakan' : isEs ? 'Tutorial 2: Cuantización y Corrección de Desfases Rítmicos' : 'Tutorial 2: Quantizing & Snapping Loose Recordings',
    ch8Tutorial2Desc: isId
      ? 'Jika Anda merekam lagu langsung dari keyboard piano MIDI dan ketukannya sedikit meleset, pelajari cara menyeleksi not dan meratakannya ke kisi 1/16 atau 1/8.'
      : isEs
      ? 'Si grabaste en vivo desde un teclado MIDI y algunas notas quedaron a destiempo, aprende a seleccionarlas y ajustarlas a la cuadrícula de semicorcheas o corcheas.'
      : 'If you recorded a live performance with loose timing, learn how to box-select notes and snap them cleanly to nearest 1/16th or 1/8th grid subdivisions.',
    ch8Tutorial3Title: isId ? 'Tutorial 3: Kalibrasi Sinkronisasi Lagu & Backing Track Audio' : isEs ? 'Tutorial 3: Sincronización con Pistas de Audio de Fondo' : 'Tutorial 3: Calibrating Backing Track Audio Sync',
    ch8Tutorial3Desc: isId
      ? 'Cara mengatur offset milidetik agar file vokal atau backing track MP3 selaras sempurna dengan not balok MIDI saat lagu dimainkan.'
      : isEs
      ? 'Cómo ajustar el desfase en milisegundos para que las pistas MP3 coincidan perfectamente con las notas MIDI durante el juego.'
      : 'How to adjust millisecond sync offsets so MP3 vocal or backing tracks line up seamlessly with falling notes and sheet music.',
    ch8Tutorial4Title: isId ? 'Tutorial 4: Mengekspor dan Membagikan File MIDI (.mid)' : isEs ? 'Tutorial 4: Exportar y Compartir Archivos MIDI (.mid)' : 'Tutorial 4: Exporting & Sharing Standard MIDI (.mid) Files',
    ch8Tutorial4Desc: isId
      ? 'Setelah lagu selesai diedit, simpan sebagai file Standard MIDI Format 1 yang bisa dimainkan langsung di menu Lagu Lokal Octavia atau diedit di DAW lain.'
      : isEs
      ? 'Una vez editada tu canción, expórtala como archivo MIDI Estándar Formato 1 para jugarla en Canciones Locales de Octavia o abrirla en cualquier DAW.'
      : 'Once editing is complete, export as a Standard MIDI Format 1 file ready to play in Octavia\'s Local Songs library or open in external DAWs.',
    ch8ShortcutsTitle: isId ? 'Tabel Pintasan Keyboard Editor MIDI' : isEs ? 'Atajos de Teclado del Editor MIDI' : 'MIDI Editor Keyboard Shortcuts',

  };
};

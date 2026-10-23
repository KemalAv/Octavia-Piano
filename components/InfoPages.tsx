import React, { useEffect, useState } from 'react';
import { AppLanguage, Screen } from '../types';
import { translations } from '../translations';

interface InfoPageProps {
  onBack: () => void;
  onNavigate?: (screen: Screen) => void;
  appLanguage?: AppLanguage;
}

interface InfoLayoutProps {
  title: string;
  activeScreen?: Screen;
  children: React.ReactNode;
  onBack: () => void;
  onNavigate?: (screen: Screen) => void;
  appLanguage?: AppLanguage;
}

const InfoLayout: React.FC<InfoLayoutProps> = ({ title, activeScreen, children, onBack, onNavigate, appLanguage = 'en' }) => {
  const [isRendered, setIsRendered] = useState(false);
  const t = translations[appLanguage] || translations.en;

  useEffect(() => {
    const timer = setTimeout(() => setIsRendered(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'bg-opacity-100' : 'bg-opacity-0'}`}
    >
      <div
        className={`bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-black text-cyan-400 tracking-tight">{title}</h2>
          </div>
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-lg transition-colors border border-white/5 active:scale-95"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Sub-navigation tabs for About, Contact, Privacy, Disclaimer (Hidden when viewing How to Connect / How to Play) */}
        {activeScreen !== 'howToConnect' && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 rounded-2xl border border-white/5 mb-5 overflow-x-auto custom-scrollbar flex-shrink-0">
            <button
              onClick={() => onNavigate?.('about')}
              className={`py-1.5 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeScreen === 'about'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{t.about}</span>
            </button>
            <button
              onClick={() => onNavigate?.('contact')}
              className={`py-1.5 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeScreen === 'contact'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{t.contact}</span>
            </button>
            <button
              onClick={() => onNavigate?.('privacy')}
              className={`py-1.5 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeScreen === 'privacy'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{t.privacy}</span>
            </button>
            <button
              onClick={() => onNavigate?.('disclaimer')}
              className={`py-1.5 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeScreen === 'disclaimer'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{t.disclaimer}</span>
            </button>
          </div>
        )}

        <div className="flex-grow overflow-y-auto custom-scrollbar text-slate-300 space-y-6 pr-4">
          {children}
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800 flex-shrink-0 flex justify-end">
          <button
            onClick={onBack}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
          >
            {appLanguage === 'id' ? 'Kembali ke Menu' : appLanguage === 'es' ? 'Volver al Menú' : 'Back to Menu'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AboutUs: React.FC<InfoPageProps> = ({ onBack, onNavigate, appLanguage = 'en' }) => {
  if (appLanguage === 'id') {
    return (
      <InfoLayout title="Tentang Octavia" activeScreen="about" onBack={onBack} onNavigate={onNavigate} appLanguage={appLanguage}>
        <section>
          <h3 className="text-xl font-bold text-white mb-2">Misi Kami: Mendefinisikan Ulang Latihan Musik</h3>
          <p className="mb-4">
            Octavia lahir dari gagasan yang sederhana namun kuat: belajar piano tidak seharusnya membosankan, dan game ritme modern tidak semestinya terbatas hanya pada kontroler arkade atau keyboard komputer biasa. Kami percaya bahwa disiplin belajar alat musik dapat dan harus diisi dengan tingkat keterlibatan dan kegembiraan yang setara dengan game kelas dunia.
          </p>
          <p>
            Misi kami adalah menyediakan platform berkinerja tinggi yang mudah diakses dan menjembatani latihan instrumen sungguhan dengan hiburan interaktif. Dengan menggunakan alat musik nyata sebagai perangkat input utama, kami membantu musisi membangun keterampilan nyata sambil menikmati kemajuan berbasis pencapaian yang menyenangkan.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-2">Teknologi Mutakhir</h3>
          <p className="mb-4">
            Dibuat menggunakan Web MIDI API modern, Web Audio synthesizer, dan algoritma penomoran jari (fingering) yang canggih, Octavia menganalisis berkas MIDI secara langsung di peramban Anda dengan latensi mendekati nol.
          </p>
          <p>
            Platform kami mendukung berbagai macam instrumen: mulai dari piano digital berkabel USB/MIDI, mikrofon akustik dengan deteksi nada AI, hingga keyboard QWERTY virtual untuk pemain piano Roblox dan komunitas virtual lainnya.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-2">Komunitas Global</h3>
          <p>
            Bergabunglah dengan ribuan pemain dan musisi di seluruh dunia yang mengunggah berkas MIDI, berkompetisi di papan peringkat global, dan belajar membaca not balok bersama kami setiap hari.
          </p>
        </section>
      </InfoLayout>
    );
  }

  if (appLanguage === 'es') {
    return (
      <InfoLayout title="Acerca de Octavia" activeScreen="about" onBack={onBack} onNavigate={onNavigate} appLanguage={appLanguage}>
        <section>
          <h3 className="text-xl font-bold text-white mb-2">Nuestra Misión: Redefinir la Práctica Musical</h3>
          <p className="mb-4">
            Octavia nació de una idea simple pero poderosa: aprender piano no debería ser una tarea pesada, y los juegos de ritmo modernos no deben limitarse a mandos de arcade o teclados de PC. Creemos que la disciplina de aprender un instrumento musical puede y debe infundirse con el mismo nivel de entusiasmo que un videojuego de primer nivel.
          </p>
          <p>
            Nuestra misión es ofrecer una plataforma accesible y de alto rendimiento que una la práctica instrumental rigurosa con el entretenimiento interactivo. Al utilizar instrumentos reales como dispositivo de entrada principal, ayudamos a los músicos a desarrollar habilidades tangibles mientras disfrutan de un sistema de progreso motivador.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-2">Tecnología de Vanguardia</h3>
          <p className="mb-4">
            Desarrollado con la moderna Web MIDI API, sintetizadores Web Audio y algoritmos avanzados de digitación (fingering), Octavia procesa archivos MIDI en tu navegador con una latencia prácticamente nula.
          </p>
          <p>
            Nuestra plataforma es compatible con pianos digitales USB/MIDI, micrófonos acústicos con detección de tono inteligente y teclados QWERTY para jugadores de Roblox Virtual Piano.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-2">Comunidad Global</h3>
          <p>
            Únete a miles de intérpretes en todo el mundo que comparten partituras MIDI, compiten en clasificaciones mundiales y aprenden partituras con nosotros cada día.
          </p>
        </section>
      </InfoLayout>
    );
  }

  return (
    <InfoLayout title="About Octavia" activeScreen="about" onBack={onBack} onNavigate={onNavigate} appLanguage={appLanguage}>
      <section>
        <h3 className="text-xl font-bold text-white mb-2">Our Mission: Redefining Music Practice</h3>
        <p className="mb-4">
          Octavia was born from a simple yet powerful idea: learning piano shouldn't be a chore, and modern rhythm games shouldn't be limited to arcade controllers or computer keyboards. We believe that the discipline of learning a musical instrument can and should be infused with the same level of engagement and excitement found in world-class gaming.
        </p>
        <p>
          Our mission is to provide an accessible, high-performance platform that bridges the gap between serious instrument practice and interactive entertainment. By using real instruments as the primary input device, we help musicians develop tangible skills while enjoying a reward-driven progress system.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-2">Cutting-Edge Web Technology</h3>
        <p className="mb-4">
          Powered by modern Web MIDI APIs, Web Audio synthesizer graphs, and deterministic fingering algorithms, Octavia parses and plays MIDI files entirely inside your web browser with ultra-low latency.
        </p>
        <p>
          Our engine natively supports USB/MIDI keyboards, acoustic microphone pitch recognition, and full computer QWERTY keyboard support with Roblox & Standard layouts.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-2">Global Community</h3>
        <p>
          Join thousands of musicians and gamers worldwide who upload arrangements, climb competitive ranked leaderboards, and master piano reading together.
        </p>
      </section>
    </InfoLayout>
  );
};

export const ContactPage: React.FC<InfoPageProps> = ({ onBack, onNavigate, appLanguage = 'en' }) => {
  const isId = appLanguage === 'id';
  const isEs = appLanguage === 'es';

  return (
    <InfoLayout title={isId ? "Hubungi Kami" : isEs ? "Contacto" : "Contact Us"} activeScreen="contact" onBack={onBack} onNavigate={onNavigate} appLanguage={appLanguage}>
      <section>
        <p className="mb-6">
          {isId
            ? "Punya pertanyaan, masukan, laporan bug, atau usulan kerja sama? Kami selalu siap mendengar dari Anda."
            : isEs
            ? "¿Tienes preguntas, comentarios, reportes de errores o propuestas de colaboración? Estaremos encantados de escucharte."
            : "Have questions, feedback, bug reports, or partnership proposals? We would love to hear from you."}
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-white font-bold mb-2">{isId ? "Dukungan Teknis" : isEs ? "Soporte Técnico" : "Technical Support"}</h3>
            <p className="text-sm mb-4">
              {isId
                ? "Pertanyaan terkait koneksi MIDI, kompabilitas peramban, atau sinkronisasi akun."
                : isEs
                ? "Dudas sobre conectividad MIDI, navegadores o sincronización de cuenta."
                : "Questions regarding MIDI connectivity, browser compatibility, or account synchronization."}
            </p>
            <a href="mailto:trixieabu@gmail.com" className="text-cyan-400 hover:text-cyan-300 font-mono">
              trixieabu@gmail.com
            </a>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-white font-bold mb-2">{isId ? "Media & Kemitraan" : isEs ? "Medios y Colaboraciones" : "Media & Business"}</h3>
            <p className="text-sm mb-4">
              {isId
                ? "Untuk pertanyaan pers, lisensi, atau tawaran kerja sama."
                : isEs
                ? "Consultas de prensa, licencias o acuerdos de colaboración."
                : "For press inquiries, licensing questions, or collaboration proposals."}
            </p>
            <a href="mailto:trixieabu@gmail.com" className="text-cyan-400 hover:text-cyan-300 font-mono">
              trixieabu@gmail.com
            </a>
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-lg border border-cyan-500/20 text-center mt-6">
          <h3 className="text-white font-bold mb-4">{isId ? "Gabung Komunitas Kami" : isEs ? "Únete a Nuestra Comunidad" : "Join Our Community"}</h3>
          <p className="mb-6">
            {isId
              ? "Cara tercepat untuk mendapatkan bantuan dan berdiskusi dengan sesama musisi adalah melalui server Discord resmi kami."
              : isEs
              ? "La forma más rápida de obtener ayuda y charlar con otros músicos es a través de nuestro servidor de Discord oficial."
              : "The fastest way to get help and interact with other musicians is through our official Discord server. Get real-time updates and share your high scores!"}
          </p>
          <a
            href="https://discord.gg/Ms8d6guHf2"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-lg transition-all transform hover:scale-105"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027C.533 9.048-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01 10.898 10.898 0 0 0 .372.292.077.077 0 0 1-.006.128 12.51 12.51 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
            {isId ? "Gabung Server Discord" : isEs ? "Unirse al Servidor Discord" : "Join Discord Server"}
          </a>
        </div>
      </section>
    </InfoLayout>
  );
};

export const PrivacyPolicy: React.FC<InfoPageProps> = ({ onBack, onNavigate, appLanguage = 'en' }) => {
  const isId = appLanguage === 'id';
  const isEs = appLanguage === 'es';

  return (
    <InfoLayout title={isId ? "Kebijakan Privasi" : isEs ? "Política de Privacidad" : "Privacy Policy"} activeScreen="privacy" onBack={onBack} onNavigate={onNavigate} appLanguage={appLanguage}>
      <p className="text-sm italic text-slate-500 mb-4">
        {isId ? "Terakhir Diperbarui: Oktober 2026" : isEs ? "Última Actualización: Octubre 2026" : "Last Updated: October 2026"}
      </p>

      <section>
        <h3 className="text-xl font-bold text-white mb-2">
          {isId ? "1. Pengantar Privasi Digital" : isEs ? "1. Introducción a la Privacidad" : "1. Introduction to Digital Privacy"}
        </h3>
        <p>
          {isId
            ? "Di Octavia, kami mengutamakan privasi dan keamanan data pengguna kami. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda saat menggunakan platform kami."
            : isEs
            ? "En Octavia, priorizamos la privacidad y seguridad de nuestros usuarios. Esta política describe cómo recopilamos, usamos y protegemos tu información al interactuar con nuestra plataforma."
            : "At Octavia, we prioritize the privacy and security of our users' data. This policy outlines how we collect, use, and protect your information when you interact with our platform."}
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-2">
          {isId ? "2. Autentikasi dan Identitas Akun" : isEs ? "2. Autenticación e Identidad" : "2. Authentication and Identity"}
        </h3>
        <p className="mb-4">
          {isId
            ? "Octavia menggunakan Supabase untuk layanan autentikasi aman. Saat masuk melalui Google OAuth, kami menerima dan menyimpan alamat email dan foto profil Anda."
            : isEs
            ? "Octavia utiliza Supabase para autenticación segura. Al iniciar sesión con Google OAuth, recibimos y almacenamos tu correo electrónico y foto de perfil."
            : "Octavia utilizes Supabase for secure authentication and database services. When you choose to sign in using Google OAuth, we receive and store your email address and profile picture."}
        </p>
        <p>
          {isId
            ? "Informasi ini digunakan semata-mata untuk mengelola akun Anda, papan peringkat, dan personalisasi. Kami tidak memiliki akses ke kata sandi Anda dan tidak akan pernah menjual data Anda ke pihak ketiga."
            : isEs
            ? "Esta información se utiliza estrictamente para gestionar tu cuenta y las tablas de clasificación. Nunca venderemos tus datos personales a terceros anunciantes."
            : "This information is used strictly for creating and maintaining your user account and facilitating leaderboard participation. We will never sell your personal contact information to third-party advertisers."}
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-2">
          {isId ? "3. Konten Pengguna & Berkas MIDI" : isEs ? "3. Contenido de Usuarios y MIDI" : "3. User-Generated Content and MIDI Uploads"}
        </h3>
        <p>
          {isId
            ? "Berkas MIDI yang Anda unggah ke platform ini disimpan di basis data publik agar dapat dimainkan oleh komunitas dunia."
            : isEs
            ? "Los archivos MIDI que subes a la plataforma se almacenan en una base de datos pública para disfrute de la comunidad global."
            : "Any MIDI files or musical scores you upload to the platform are stored on our public database to allow for global community play."}
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-2">
          {isId ? "4. Penyimpanan Lokal Peramban" : isEs ? "4. Almacenamiento Local" : "4. Technical Data & Local Storage"}
        </h3>
        <p>
          {isId
            ? "Kami menggunakan Local Storage peramban untuk menyimpan pengaturan preferensi seperti volume, tema, tata letak tuts, dan offset latensi di perangkat Anda tanpa pelacak invasif."
            : isEs
            ? "Utilizamos el almacenamiento local del navegador para recordar tus preferencias como niveles de volumen, tema y calibración sin rastreadores invasivos."
            : "To provide a seamless experience, we use Browser Local Storage to save your application preferences including volume, theme, and latency offsets."}
        </p>
      </section>
    </InfoLayout>
  );
};

export const Disclaimer: React.FC<InfoPageProps> = ({ onBack, onNavigate, appLanguage = 'en' }) => {
  const isId = appLanguage === 'id';
  const isEs = appLanguage === 'es';

  return (
    <InfoLayout title={isId ? "Penyangkalan (Disclaimer)" : isEs ? "Descargo de Responsabilidad" : "Disclaimer"} activeScreen="disclaimer" onBack={onBack} onNavigate={onNavigate} appLanguage={appLanguage}>
      <section>
        <h3 className="text-xl font-bold text-white mb-2">
          {isId ? "Panduan Edukasi" : isEs ? "Orientación Educativa" : "Educational Guidance"}
        </h3>
        <p className="mb-4">
          {isId
            ? "Octavia dirancang sebagai game ritme berkinerja tinggi dan alat pendukung latihan musik. Aplikasi ini BUKAN pengganti mutlak untuk instruktur piano profesional."
            : isEs
            ? "Octavia está diseñado como un juego de ritmo y una herramienta de apoyo para la práctica musical. NO sustituye la instrucción impartida por un profesor profesional."
            : "Octavia is designed as a high-performance rhythm game and a supplementary tool for musical practice. It is NOT intended to be a replacement for professional, one-on-one piano instruction."}
        </p>
        <p>
          {isId
            ? "Octavia sangat baik untuk melatih ketepatan ritme dan pengenalan notasi, namun Anda tetap disarankan untuk berkonsultasi dengan pengajar piano profesional untuk menjaga postur tubuh dan postur tangan yang sehat."
            : isEs
            ? "Octavia es excelente para desarrollar precisión rítmica y lectura de notas, pero recomendamos consultar con profesores cualificados para mantener posturas y técnicas saludables."
            : "While Octavia is excellent for developing rhythmic precision and note recognition, we strongly advise users to consult with a qualified teacher to ensure healthy playing habits."}
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-2">
          {isId ? "Hak Kekayaan Intelektual" : isEs ? "Propiedad Intelectual y Derechos de Autor" : "Intellectual Property & Copyright"}
        </h3>
        <p>
          {isId
            ? "Octavia beroperasi sebagai wadah untuk konten komunitas dan analisis pendidikan. Hak cipta komposisi lagu asli tetap menjadi milik pencipta lagu masing-masing."
            : isEs
            ? "Octavia opera como plataforma para contenido comunitario y análisis formativo. Todos los derechos de autor de las obras originales pertenecen a sus respectivos autores."
            : "Octavia operates as a platform for user-generated content and educational analysis. All copyrights for original compositions remain with their respective owners."}
        </p>
      </section>
    </InfoLayout>
  );
};

export const HowToConnect: React.FC<InfoPageProps> = ({ onBack, onNavigate, appLanguage = 'en' }) => {
  const isId = appLanguage === 'id';
  const isEs = appLanguage === 'es';

  return (
    <InfoLayout title={isId ? "Cara Menghubungkan" : isEs ? "Cómo Conectar" : "How to Connect"} activeScreen="howToConnect" onBack={onBack} onNavigate={onNavigate} appLanguage={appLanguage}>
      <section>
        <h3 className="text-xl font-bold text-white mb-2">
          {isId ? "Kompabilitas Peramban" : isEs ? "Compatibilidad del Navegador" : "Browser Compatibility"}
        </h3>
        <p className="mb-4 text-slate-300 italic">
          <strong>{isId ? "Penting:" : isEs ? "Importante:" : "Important:"}</strong>{" "}
          {isId
            ? "Web MIDI didukung optimal pada Google Chrome dan Microsoft Edge di Windows, Mac, dan Android. Safari / iOS tidak mendukung Web MIDI."
            : isEs
            ? "Web MIDI funciona mejor en Google Chrome y Microsoft Edge en Windows, Mac y Android. Safari e iOS no soportan Web MIDI."
            : "Web MIDI is NOT supported on iOS (iPhone/iPad) or Safari. For the best experience, please use Google Chrome or Edge on Windows, Mac, or Android."}
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-2">
          {isId ? "1. Kabel MIDI Standar" : isEs ? "1. Cable MIDI Estándar" : "1. MIDI Cable"}
        </h3>
        <p className="mb-4 text-slate-300">
          {isId
            ? "Hubungkan port MIDI OUT keyboard Anda ke port MIDI IN antarmuka audio/kabel adaptor MIDI-USB komputer Anda. Peramban akan otomatis mendeteksi perangkat tersebut."
            : isEs
            ? "Conecta el puerto MIDI OUT de tu teclado al puerto MIDI IN de tu interfaz o adaptador USB. El navegador detectará el dispositivo automáticamente."
            : "The most reliable way to connect your digital piano or keyboard is using a standard MIDI cable. Connect the MIDI OUT port to the MIDI IN port on your computer."}
        </p>
        <div className="flex justify-center mb-6">
          <img 
            src="/MIDI.png" 
            alt="MIDI Cable Connection" 
            className="max-w-full md:max-w-md rounded-lg border border-slate-700 shadow-lg"
            referrerPolicy="no-referrer"
          />
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-2">
          {isId ? "2. Kabel USB Type-B" : isEs ? "2. Cable USB Tipo-B" : "2. USB B Cable"}
        </h3>
        <p className="mb-4 text-slate-300">
          {isId
            ? "Sebagian besar piano digital modern memiliki port USB to Host (port USB printer tipe B). Gunakan kabel USB printer standar untuk menghubungkan keyboard langsung ke laptop/PC tanpa perlu audio interface tambahan."
            : isEs
            ? "La mayoría de los pianos digitales modernos disponen de un puerto USB to Host (tipo impresora). Puedes usar un cable USB estándar A-a-B para conectarlo directamente al ordenador."
            : "Many modern digital pianos have a USB Type-B port (often labeled 'USB to Host'). You can use a standard USB A-to-B cable to connect the piano directly to your computer."}
        </p>
        <div className="flex justify-center mb-6">
          <img 
            src="/USB.png" 
            alt="USB B Cable Connection" 
            className="max-w-full md:max-w-md rounded-lg border border-slate-700 shadow-lg"
            referrerPolicy="no-referrer"
          />
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-2">
          {isId ? "3. Keyboard Komputer (QWERTY & Roblox)" : isEs ? "3. Teclado de Computadora (QWERTY y Roblox)" : "3. Computer Keyboard (QWERTY & Roblox)"}
        </h3>
        <p className="mb-4 text-slate-300">
          {isId
            ? "Tidak punya piano fisik? Anda tetap bisa memainkan lagu dengan keyboard komputer standar Anda dengan tata letak Roblox Virtual Piano atau Tata Letak Standar."
            : isEs
            ? "¿No tienes piano físico? ¡Puedes tocar con el teclado de tu ordenador usando la distribución de Roblox Virtual Piano o el diseño estándar!"
            : "Don't have a piano? You can still play using your computer's QWERTY keyboard with Roblox Virtual Piano or Standard layouts!"}
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-2">
          {isId
            ? "4. Piano Akustik Langsung (Mikrofon)"
            : isEs
            ? "4. Piano Acústico Directo (Micrófono)"
            : "4. Direct Acoustic Piano (Microphone)"}
        </h3>
        <p className="mb-4 text-slate-300">
          {isId
            ? "Ingin bermain dengan piano akustik asli (Grand atau Upright) tanpa kabel MIDI? Anda dapat langsung mengaktifkan input mikrofon di menu Pengaturan -> MIDI & Input -> 'Aktifkan Input Mikrofon'."
            : isEs
            ? "¿Quieres tocar con un piano acústico real sin cables MIDI? Puedes activar la entrada de micrófono directamente en Ajustes -> MIDI y Entrada -> 'Activar Entrada de Micrófono'."
            : "Want to play using a real acoustic piano without MIDI cables? You can directly enable microphone input in Settings -> MIDI & Inputs -> 'Enable Microphone Input'."}
        </p>

        <div className="bg-slate-900/90 p-5 rounded-2xl border border-cyan-500/30 mb-6 space-y-3">
          <h4 className="text-sm font-bold text-cyan-400">
            {isId ? "100% Terintegrasi Langsung di Browser" : isEs ? "100% Integrado Directamente en el Navegador" : "100% Directly Integrated in Browser"}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isId
              ? "Octavia memproses frekuensi nada piano akustik secara instan melalui Web Audio API bawaan peramban Anda. Cukup izinkan akses mikrofon saat diminta dan letakkan perangkat Anda di dekat piano. Langsung berfungsi tanpa perlu menginstal berkas zip atau aplikasi tambahan apa pun!"
              : isEs
              ? "Octavia procesa las frecuencias de las notas de forma instantánea a través de la Web Audio API del navegador. Conceda permiso de micrófono y coloque su dispositivo cerca del piano. ¡Funciona al instante sin descargas ni archivos zip externos!"
              : "Octavia processes acoustic piano note frequencies instantly via the browser's built-in Web Audio API. Simply allow microphone access when prompted and place your device near the piano. Works out of the box with zero downloads!"}
          </p>
        </div>
      </section>
    </InfoLayout>
  );
};

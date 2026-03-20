import React, { useEffect, useState } from 'react';

interface InfoPageProps {
  onBack: () => void;
}

const InfoLayout: React.FC<{ title: string; children: React.ReactNode; onBack: () => void }> = ({ title, children, onBack }) => {
  const [isRendered, setIsRendered] = useState(false);

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
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-3xl font-bold text-cyan-400">{title}</h2>
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white text-3xl leading-none"
            aria-label="Close"
          >&times;</button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar text-slate-300 space-y-6 pr-4">
          {children}
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800 flex-shrink-0 flex justify-end">
          <button
            onClick={onBack}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export const AboutUs: React.FC<InfoPageProps> = ({ onBack }) => (
  <InfoLayout title="About Octavia" onBack={onBack}>
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
      <h3 className="text-xl font-bold text-white mb-2">Advanced MIDI Editor & Composition</h3>
      <p className="mb-4">
        Octavia now features a professional-grade <strong>MIDI Editor</strong>, allowing users to create, refine, and automate their musical compositions directly in the browser. Whether you're drawing notes by hand, or mapping complex <strong>BPM</strong>, our editor provides the precision needed for serious work.
      </p>
      <p className="mb-4">
        The editor supports <strong>Backing Track Integration</strong>, allowing you to sync your MIDI compositions with MP3 files or YouTube videos. With adjustable sync offsets and volume controls, you can practice or compose alongside your favorite tracks with ease.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">The Technology Behind the Music</h3>
      <p className="mb-4">
        Unlike traditional training applications, Octavia is built on a foundation of zero-latency rhythmic analysis. Utilizing the <strong>Web MIDI API</strong>, we communicate directly with your digital piano or MIDI controller, ensuring that every note you play is captured with millisecond precision.
      </p>
      <p className="mb-4">
        Our rendering engine is powered by modern web technologies like <strong>React</strong> and <strong>Vite</strong>. For sheet music, we integrate <strong>VexFlow</strong> and <strong>OpenSheetMusicDisplay</strong> to provide beautiful, responsive notation that adapts to your screen size.
      </p>
      <p>
        Data persistence and community leaderboards are handled via <strong>Supabase</strong>, providing a secure and scalable environment for users to track their progress and compete with others globally.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">The Rhythmic Philosophy</h3>
      <p className="mb-4">
        At its core, Octavia focuses on "Internalized Rhythm." Many piano students struggle with consistent timing when practicing alone. By using our "Strict Wait Mode," the app forces the student to recognize and execute correct note choices and timing before the music proceeds. This creates a feedback loop that trains the ear and hands to work in perfect synchronization.
      </p>
      <p>
        Whether you are a classical pianist working on the intricacies of Chopin or a hobbyist playing your favorite game soundtracks, Octavia's flexible engine provides the right balance of challenge and support.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">Continuous Innovation</h3>
      <p>
        Octavia is an evolving project dedicated to the intersection of music and technology. We are constantly expanding our features, from advanced pedagogical analysis of MIDI files to immersive game modes like <strong>Drum Mania</strong> and <strong>Piano Mode</strong>. Our goal is to create the ultimate digital companion for musicians of all skill levels.
      </p>
    </section>
  </InfoLayout>
);

export const ContactPage: React.FC<InfoPageProps> = ({ onBack }) => (
  <InfoLayout title="Contact Us" onBack={onBack}>
    <section className="space-y-6">
      <p className="text-lg">
        Octavia is a project dedicated to musical innovation and we value your feedback. Whether you are experiencing technical difficulties, have suggestions for new features, or are interested in collaboration, our team is ready to assist you.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-white font-bold mb-2">Technical Support</h3>
          <p className="text-sm mb-4">Questions regarding MIDI connectivity, browser compatibility, or account synchronization.</p>
          <a href="mailto:trixieabu@gmail.com" className="text-cyan-400 hover:text-cyan-300 font-mono">
            trixieabu@gmail.com
          </a>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-white font-bold mb-2">Media & Business</h3>
          <p className="text-sm mb-4">For press inquiries, licensing questions, or collaboration proposals.</p>
          <a href="mailto:trixieabu@gmail.com" className="text-cyan-400 hover:text-cyan-300 font-mono">
            trixieabu@gmail.com
          </a>
        </div>
      </div>

      <div className="bg-slate-800/50 p-6 rounded-lg border border-cyan-500/20 text-center">
        <h3 className="text-white font-bold mb-4">Join Our Community</h3>
        <p className="mb-6">The fastest way to get help and interact with other musicians is through our official Discord server. Get real-time updates and share your high scores!</p>
        <a
          href="https://discord.gg/Ms8d6guHf2"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-lg transition-all transform hover:scale-105"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027C.533 9.048-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01 10.898 10.898 0 0 0 .372.292.077.077 0 0 1-.006.128 12.51 12.51 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
          Join Discord Server
        </a>
      </div>
    </section>
  </InfoLayout>
);

export const PrivacyPolicy: React.FC<InfoPageProps> = ({ onBack }) => (
  <InfoLayout title="Privacy Policy" onBack={onBack}>
    <p className="text-sm italic text-slate-500 mb-4">Last Updated: February 2026</p>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">1. Introduction to Digital Privacy</h3>
      <p>
        At Octavia, we prioritize the privacy and security of our users' data. This policy outlines how we collect, use, and protect your information when you interact with our platform. By using Octavia, you agree to the practices described in this document.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">2. Authentication and Identity</h3>
      <p className="mb-4">
        Octavia utilizes <strong>Supabase</strong> for secure authentication and database services. When you choose to sign in using Google OAuth, we receive and store your email address and profile picture.
      </p>
      <p>
        This information is used strictly for creating and maintaining your user account, facilitating leaderboard participation, and personalizing your dashboard experience. We do not have access to your Google account password and we will never sell your personal contact information to third-party advertisers.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">3. User-Generated Content and MIDI Uploads</h3>
      <p className="mb-4">
        Any MIDI files or musical scores you upload to the platform are stored on our public database to allow for global community play. By uploading content, you acknowledge that this data is public and accessible by other users.
      </p>
      <p>
        Please ensure that you do not upload files containing sensitive personal information or copyrighted material for which you do not have the legal right to distribute. Octavia reserves the right to remove any content that violates intellectual property rights.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">4. Technical Data & Local Storage</h3>
      <p className="mb-4">
        To provide a seamless experience, we use <strong>Browser Local Storage</strong> to save your application preferences. This includes volume levels, theme selections, input device IDs, and UI layout settings. This data remains on your local machine and is not tracked across other websites.
      </p>
      <p>
        We do not use invasive tracking cookies or pixel tags. Any anonymous usage data collected (such as page load times or error logs) is used solely for the technical improvement of the application and cannot be linked back to your personal identity.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">5. Data Security Measures</h3>
      <p>
        We implement industry-standard security protocols to protect your data from unauthorized access or disclosure. However, as no method of digital transmission is 100% secure, we encourage users to use strong, unique authentication methods.
      </p>
    </section>
  </InfoLayout>
);

export const Disclaimer: React.FC<InfoPageProps> = ({ onBack }) => (
  <InfoLayout title="Disclaimer" onBack={onBack}>
    <section>
      <h3 className="text-xl font-bold text-white mb-2">Educational Guidance</h3>
      <p className="mb-4">
        Octavia is designed as a high-performance rhythm game and a supplementary tool for musical practice. It is <strong>NOT</strong> intended to be a replacement for professional, one-on-one piano instruction.
      </p>
      <p>
        While Octavia is excellent for developing rhythmic precision and note recognition, it cannot provide feedback on physical posture, proper hand technique, or the nuances of musical expression. We strongly advise users to consult with a qualified teacher to ensure the development of healthy playing habits and to prevent repetitive strain injuries.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">Intellectual Property & Copyright</h3>
      <p className="mb-4">
        Octavia operates as a platform for user-generated content and educational analysis. We do not claim ownership of the MIDI files or musical scores uploaded by our community. All copyrights for the original compositions remain with their respective owners.
      </p>
      <p>
        If you are a copyright holder and believe your work has been uploaded to Octavia without proper authorization, please contact us immediately at our official support email. We are committed to complying with all Digital Millennium Copyright Act (DMCA) requirements and will act promptly to remove infringing material.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">Software & Hardware Liability</h3>
      <p className="mb-4">
        This platform is provided "as is" and "as available," without any warranties of any kind, express or implied. The developers of Octavia are not responsible for any damage to MIDI hardware, computers, or peripherals that may occur during the use of this software.
      </p>
      <p>
        Furthermore, we are not liable for any data loss, performance issues, or service interruptions. Users are responsible for ensuring that their hardware meets the technical requirements for MIDI connectivity.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">Health Warning</h3>
      <p>
        Prolonged periods of musical practice can lead to physical fatigue. If you experience discomfort or pain while playing, we recommend taking immediate breaks and seeking medical advice if symptoms persist.
      </p>
    </section>
  </InfoLayout>
);

export const HowToConnect: React.FC<InfoPageProps> = ({ onBack }) => (
  <InfoLayout title="How to Connect" onBack={onBack}>
    <section>
      <h3 className="text-xl font-bold text-white mb-2">1. MIDI Cable</h3>
      <p className="mb-4 text-slate-300">
        The most reliable way to connect your digital piano or keyboard is using a standard MIDI cable.
        Connect the MIDI OUT port on your keyboard to the MIDI IN port on your computer's audio interface or MIDI-to-USB adapter.
        Once connected, your browser should automatically detect the MIDI device. You can select it from the Settings menu.
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
      <h3 className="text-xl font-bold text-white mb-2">2. USB B Cable</h3>
      <p className="mb-4 text-slate-300">
        Many modern digital pianos have a USB Type-B port (often labeled "USB to Host").
        You can use a standard USB A-to-B cable (like a printer cable) to connect the piano directly to your computer.
        This provides a direct MIDI connection without needing a separate MIDI interface.
        Select your piano from the MIDI Input list in the Settings menu once connected.
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
      <h3 className="text-xl font-bold text-white mb-2">3. Microphone (Beta)</h3>
      <p className="mb-4 text-slate-300">
        If you have an acoustic piano or a keyboard without MIDI/USB outputs, you can use your computer's microphone to detect the notes you play.
        Go to the Settings menu and enable "Audio Input (Microphone)".
        Note that this feature is currently in Beta and works best in a quiet room with a clear, single-note melody. Chords may not be detected accurately.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">4. Computer Keyboard</h3>
      <p className="mb-4 text-slate-300">
        Don't have a piano? You can still play using your computer's QWERTY keyboard! Octavia supports two distinct layouts:
      </p>
      <ul className="list-disc list-inside space-y-2 text-slate-300 mb-4">
        <li>
          <strong>Roblox Layout</strong>: A specialized mapping popular in virtual piano communities (like on Roblox). It maps keys across the entire keyboard (numbers, letters) to a wide range of piano notes, allowing for more complex pieces to be played without shifting octaves.
        </li>
        <li>
          <strong>Standard Layout</strong>: Maps your keyboard rows to a piano-like structure. The middle row (A, S, D, F...) acts as white keys, while the top row (W, E, T, Y...) acts as black keys.
        </li>
      </ul>
      <p className="text-slate-300">
        The application works by listening to your keystrokes and instantly translating them into MIDI signals, just like a real digital piano. You can switch between these layouts and adjust your base octave in the Settings menu.
      </p>
    </section>
  </InfoLayout>
);

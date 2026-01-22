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
      <h3 className="text-xl font-bold text-white mb-2">Our Mission</h3>
      <p>
        Octavia was born from a simple idea: learning piano shouldn't be boring, and rhythm games shouldn't be limited to computer keyboards. We wanted to bridge the gap between serious instrument practice and the addictive fun of rhythm gaming.
      </p>
    </section>
    
    <section>
      <h3 className="text-xl font-bold text-white mb-2">How It Works</h3>
      <p>
        Unlike traditional synthesia-style apps, Octavia focuses on gamification. It connects to your MIDI keyboard (or lets you use your computer keyboard) and scores your performance based on accuracy and timing. With features like our custom "Retical Mode" and real-time difficulty analysis, we aim to provide a platform where you can track your progress and compete with others.
      </p>
    </section>

    <section>
        <h3 className="text-xl font-bold text-white mb-2">Open Source</h3>
        <p>
            Octavia is an evolving project. We believe in community-driven development. 
        </p>
    </section>
  </InfoLayout>
);

export const ContactPage: React.FC<InfoPageProps> = ({ onBack }) => (
  <InfoLayout title="Contact Us" onBack={onBack}>
    <section className="text-center py-8">
      <p className="text-lg mb-6">
        Have feedback, found a bug, or just want to say hi? We'd love to hear from you.
      </p>
      
      <div className="inline-block bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-white font-bold mb-2">General Inquiries</h3>
        <a href="mailto:trixieabu@gmail.com" className="text-cyan-400 hover:text-cyan-300 text-xl font-mono">
          trixieabu@gmail.com
        </a>
      </div>

      <div className="mt-8">
        <p className="mb-4">You can also join our community on Discord for real-time support and updates:</p>
        <a 
            href="https://discord.gg/Ms8d6guHf2" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-lg transition-colors"
        >
            Join Discord Server
        </a>
      </div>
    </section>
  </InfoLayout>
);

export const PrivacyPolicy: React.FC<InfoPageProps> = ({ onBack }) => (
  <InfoLayout title="Privacy Policy" onBack={onBack}>
    <p className="text-sm italic text-slate-500 mb-4">Last Updated: October 2023</p>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">1. Data Collection</h3>
      <p>
        Octavia uses Supabase for authentication and database services. When you sign in with Google, we collect your email address and profile picture solely for the purpose of creating your user profile and displaying it on leaderboards. We do not sell your personal data to third parties.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">2. User Uploads</h3>
      <p>
        MIDI files uploaded to the platform are stored publicly. Do not upload files containing personal information or copyrighted material you do not have permission to share. By uploading a file, you grant Octavia the right to display and allow others to play the file within the application.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">3. Cookies & Local Storage</h3>
      <p>
        We use local storage to save your settings (such as volume, theme preferences, and input device selections) to improve your experience. We do not use invasive tracking cookies.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">4. Analytics</h3>
      <p>
        We may collect anonymous usage data to help us understand how the app is being used and to improve performance. This data is not linked to your personal identity.
      </p>
    </section>
  </InfoLayout>
);

export const Disclaimer: React.FC<InfoPageProps> = ({ onBack }) => (
  <InfoLayout title="Disclaimer" onBack={onBack}>
    <section>
      <h3 className="text-xl font-bold text-white mb-2">Educational Use</h3>
      <p>
        Octavia is designed as a rhythm game and a supplementary practice tool. <strong>It is not a substitute for a professional piano teacher.</strong> While it can help with note recognition and rhythm, it cannot correct your posture, hand technique, or musical expression. Relying solely on this app for learning piano may lead to the development of bad habits.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">Copyright</h3>
      <p>
        Octavia is a platform for user-generated content. We do not claim ownership of the MIDI files uploaded by our users. If you believe your copyrighted work has been uploaded without permission, please contact us immediately, and we will remove it.
      </p>
    </section>

    <section>
      <h3 className="text-xl font-bold text-white mb-2">Software Status</h3>
      <p>
        This software is provided "as is", without warranty of any kind. We are not responsible for any issues that may arise from using this application, including but not limited to hardware incompatibility or data loss.
      </p>
    </section>
  </InfoLayout>
);

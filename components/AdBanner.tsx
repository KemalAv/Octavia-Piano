import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface AdBannerProps {
  isVisible: boolean;
}

const AdBanner: React.FC<AdBannerProps> = ({ isVisible }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);

  useEffect(() => {
    if (containerRef.current && !scriptLoadedRef.current) {
      // Set atOptions on window
      (window as any).atOptions = {
        'key' : '73aa40d12f578501e396347b4374f188',
        'format' : 'iframe',
        'height' : 300,
        'width' : 160,
        'params' : {}
      };

      const script = document.createElement('script');
      script.src = 'https://www.highperformanceformat.com/73aa40d12f578501e396347b4374f188/invoke.js';
      script.async = true;
      
      containerRef.current.appendChild(script);
      scriptLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setIsManuallyClosed(false);
    }
  }, [isVisible]);

  if (!isVisible || isManuallyClosed) return null;

  return (
    <div 
      className="fixed right-0 top-1/2 -translate-y-1/2 z-[9999] flex flex-col items-end pointer-events-none"
    >
      <button
        onClick={() => setIsManuallyClosed(true)}
        className="bg-slate-800/80 hover:bg-slate-700 text-white p-1 rounded-tl-md border-l border-t border-slate-600 pointer-events-auto transition-colors mb-1"
        title="Close Ad"
      >
        <X size={16} />
      </button>
      <div 
        id="ad-banner-container"
        ref={containerRef}
        className="w-[160px] h-[300px] pointer-events-auto bg-slate-900/20"
        style={{
          minWidth: '160px',
          minHeight: '300px',
        }}
      />
    </div>
  );
};

export default AdBanner;

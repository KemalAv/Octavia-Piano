
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';

// This is necessary to prevent TypeScript errors with the adsbygoogle property on window
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AdBanner: React.FC = () => {
  const [showAd, setShowAd] = useState(true);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const adRef = useRef<HTMLModElement>(null);
  const [adRenderKey, setAdRenderKey] = useState(0);

  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        setIsLocalhost(true);
    }
  }, []);

  useEffect(() => {
    if (showAd) {
      setAdRenderKey(prev => prev + 1);
      setAdLoaded(false);
    }
  }, [showAd]);

  useEffect(() => {
    if (isLocalhost || !showAd) return;

    const pushAd = () => {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        
        const isSlotEmpty = (ref: React.RefObject<HTMLElement>) => {
            if (!ref.current) return false;
            const status = ref.current.getAttribute('data-adsbygoogle-status');
            const hasChildren = ref.current.children.length > 0;
            return !(status === 'done' || hasChildren);
        };

        if (isSlotEmpty(adRef)) {
          window.adsbygoogle.push({});
        }
      } catch (e) {
        console.warn('AdSense push warning:', e);
      }
    };

    const timeoutId = setTimeout(pushAd, 200);
    
    // Poll for ad status to hide placeholder
    const pollInterval = setInterval(() => {
        if (adRef.current) {
            const status = adRef.current.getAttribute('data-adsbygoogle-status');
            if (status === 'done') {
                setAdLoaded(true);
                clearInterval(pollInterval);
            }
        }
    }, 500);

    return () => {
        clearTimeout(timeoutId);
        clearInterval(pollInterval);
    };
  }, [showAd, adRenderKey, isLocalhost]); 

  const adContainerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    width: 'min(90vw, 728px)',
    height: '90px', 
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adLoaded ? 'transparent' : 'rgba(15, 23, 42, 0.8)',
    borderRadius: '8px',
    border: adLoaded ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: adLoaded ? 'none' : '0 -4px 20px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    transition: 'background-color 0.3s ease, border 0.3s ease, box-shadow 0.3s ease'
  };

  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(148, 163, 184, 0.5)',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    zIndex: 1,
    pointerEvents: 'none',
    opacity: adLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease'
  };

  const insStyle: React.CSSProperties = {
    display: 'block', 
    width: '100%',
    height: '100%',
    position: 'relative',
    zIndex: 2 
  };

  const closeBtnStyle: React.CSSProperties = {
      position: 'absolute',
      top: '2px',
      right: '2px',
      background: 'rgba(0,0,0,0.5)',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      width: '20px',
      height: '20px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      zIndex: 1001,
  };

  if (!showAd) return null;

  return ReactDOM.createPortal(
    <aside
      className="bottom-ad-banner"
      style={adContainerStyle}
      aria-label="Advertisement"
    >
      <button onClick={() => setShowAd(false)} style={closeBtnStyle} aria-label="Close Ad">
        &times;
      </button>
      
      {!isLocalhost && (
        <div style={placeholderStyle}>
            ADS (SPACE RESERVED)
        </div>
      )}
      
      {isLocalhost ? (
        <div className="text-slate-500 text-[10px] font-mono">ADSENSE HIDDEN ON LOCALHOST</div>
      ) : (
        <ins
          ref={adRef}
          key={`bottom-ad-${adRenderKey}`} 
          className="adsbygoogle"
          style={insStyle}
          data-ad-client="ca-pub-8164710909537323"
          data-ad-slot="5020560527" 
          data-full-width-responsive="true"
        ></ins>
      )}
    </aside>,
    document.body
  );
};

export default AdBanner;

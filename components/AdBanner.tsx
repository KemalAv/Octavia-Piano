
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';

// This is necessary to prevent TypeScript errors with the adsbygoogle property on window
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AdBanner: React.FC = () => {
  const [showLeftAd, setShowLeftAd] = useState(true);
  const [showRightAd, setShowRightAd] = useState(true);
  const [isLocalhost, setIsLocalhost] = useState(false);

  // Refs to access the DOM elements directly
  const leftAdRef = useRef<HTMLModElement>(null);
  const rightAdRef = useRef<HTMLModElement>(null);

  // Use state to force re-render/re-mount of <ins> elements
  const [leftAdRenderKey, setLeftAdRenderKey] = useState(0);
  const [rightAdRenderKey, setRightAdRenderKey] = useState(0);

  useEffect(() => {
    // Check if running on localhost
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        setIsLocalhost(true);
    }
  }, []);

  // Effect to update keys when visibility changes to `true`
  useEffect(() => {
    if (showLeftAd) {
      setLeftAdRenderKey(prev => prev + 1);
    }
  }, [showLeftAd]);

  useEffect(() => {
    if (showRightAd) {
      setRightAdRenderKey(prev => prev + 1);
    }
  }, [showRightAd]);

  useEffect(() => {
    if (isLocalhost) return; // Don't try to push ads on localhost

    const pushVisibleAds = () => {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        
        // Helper to check if an ad slot needs filling
        const isSlotEmpty = (ref: React.RefObject<HTMLElement>) => {
            if (!ref.current) return false;
            // Check if AdSense has marked this as done or if it has content (iframe)
            const status = ref.current.getAttribute('data-adsbygoogle-status');
            const hasChildren = ref.current.children.length > 0;
            if (status === 'done' || hasChildren) {
                return false;
            }
            return true;
        };

        if (showLeftAd && isSlotEmpty(leftAdRef)) {
          window.adsbygoogle.push({});
        }
        
        if (showRightAd && isSlotEmpty(rightAdRef)) {
          window.adsbygoogle.push({});
        }

      } catch (e) {
        console.warn('AdSense push warning:', e);
      }
    };

    const timeoutId = setTimeout(pushVisibleAds, 200);
    return () => clearTimeout(timeoutId);
  }, [showLeftAd, showRightAd, leftAdRenderKey, rightAdRenderKey, isLocalhost]); 

  const adContainerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '75%',
    transform: 'translateY(-75%)',
    zIndex: 1000,
    width: '130px',
    height: '65vh', 
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(148, 163, 184, 0.5)', // slate-400 with opacity
    fontSize: '10px',
    fontFamily: 'sans-serif',
    border: '1px dashed rgba(148, 163, 184, 0.3)',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 23, 42, 0.3)', // slate-900 with opacity
    zIndex: 1,
    pointerEvents: 'none',
    textAlign: 'center',
    padding: '10px'
  };

  const insWrapperStyle: React.CSSProperties = {
    flexGrow: 1, 
    position: 'relative', 
    width: '100%',
    height: '100%',
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
      top: '-40px',
      right: '-10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      border: '2px solid rgba(255,255,255,0.2)',
      borderRadius: '50%',
      width: '36px',
      height: '36px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      zIndex: 1001,
      boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
  };

  // Render ads into a portal to ensure they are positioned relative to the viewport
  // and not affected by parent transforms (like in modals).
  return ReactDOM.createPortal(
    <>
      {/* Left Ad Banner */}
      {showLeftAd && (
        <aside
          className="side-ad-banner hidden xl:flex" // Hide on smaller screens via Tailwind
          style={{ ...adContainerStyle, left: '10px' }}
          aria-label="Advertisement Left"
        >
          <button onClick={() => setShowLeftAd(false)} style={closeBtnStyle} aria-label="Close Ad">
            &times;
          </button>
          <div style={insWrapperStyle}>
            <div style={placeholderStyle}>
                {isLocalhost ? "ADSENSE HIDDEN ON LOCALHOST" : "ADS (SPACE RESERVED)"}
            </div>
            {!isLocalhost && (
                <ins
                ref={leftAdRef}
                key={`left-ad-${leftAdRenderKey}`} 
                className="adsbygoogle"
                style={insStyle}
                data-ad-client="ca-pub-8164710909537323"
                // TODO: Replace with REAL Ad Slot ID from AdSense Dashboard -> Ads -> By ad unit -> Create Display Ad (Vertical)
                data-ad-slot="5020560527" 
                data-full-width-responsive="true"
                ></ins>
            )}
          </div>
        </aside>
      )}

      {/* Right Ad Banner */}
      {showRightAd && (
        <aside
          className="side-ad-banner hidden xl:flex" // Hide on smaller screens via Tailwind
          style={{ ...adContainerStyle, right: '10px' }}
          aria-label="Advertisement Right"
        >
          <button onClick={() => setShowRightAd(false)} style={closeBtnStyle} aria-label="Close Ad">
            &times;
          </button>
          <div style={insWrapperStyle}>
            <div style={placeholderStyle}>
                {isLocalhost ? "ADSENSE HIDDEN ON LOCALHOST" : "ADS (SPACE RESERVED)"}
            </div>
            {!isLocalhost && (
                <ins
                ref={rightAdRef}
                key={`right-ad-${rightAdRenderKey}`} 
                className="adsbygoogle"
                style={insStyle}
                data-ad-client="ca-pub-8164710909537323"
                // TODO: Replace with REAL Ad Slot ID from AdSense Dashboard -> Ads -> By ad unit -> Create Display Ad (Vertical)
                data-ad-slot="5020560527"
                data-full-width-responsive="true"
                ></ins>
            )}
          </div>
        </aside>
      )}
    </>,
    document.body
  );
};

export default AdBanner;


import React, { useEffect, useState } from 'react';

// This is necessary to prevent TypeScript errors with the adsbygoogle property on window
declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const AdBanner: React.FC = () => {
  const [showLeftAd, setShowLeftAd] = useState(true);
  const [showRightAd, setShowRightAd] = useState(true);

  // Use state to force re-render/re-mount of <ins> elements
  // by changing their `key` prop when they become visible.
  const [leftAdRenderKey, setLeftAdRenderKey] = useState(0);
  const [rightAdRenderKey, setRightAdRenderKey] = useState(0);

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
    const pushVisibleAds = () => {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        
        // Crucially, clear the existing adsbygoogle array before pushing new ones.
        // This helps AdSense re-evaluate the ad slots as fresh, preventing the "already have ads" error.
        // This is a common workaround for this specific SPA error.
        if (window.adsbygoogle.length > 0) {
            window.adsbygoogle = [];
        }

        // Push an empty object for each visible ad unit to trigger a new ad request.
        // The dynamic `key` on the <ins> element combined with this reset should ensure AdSense
        // processes them as new slots.
        if (showLeftAd) {
          window.adsbygoogle.push({}); // For left ad
        }
        if (showRightAd) {
          window.adsbygoogle.push({}); // For right ad
        }
      } catch (e) {
        console.error('AdSense push error:', e);
      }
    };

    // A small delay to ensure the DOM is rendered before pushing.
    // This is also crucial for AdSense to correctly identify the `ins` elements.
    const timeoutId = setTimeout(pushVisibleAds, 100);

    // Cleanup: Clear timeout if component unmounts or dependencies change before it fires.
    return () => clearTimeout(timeoutId);
  }, [showLeftAd, showRightAd, leftAdRenderKey, rightAdRenderKey]); // Rerun effect if visibility or render keys change

  const adContainerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1000,
    width: '160px',
    height: '66.66vh', // 2/3 of viewport height
    maxHeight: '600px', // Cap the height on very tall screens
    backgroundColor: 'rgba(30, 41, 59, 0.5)', // slate-800 with transparency
    backdropFilter: 'blur(4px)',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid rgba(51, 65, 85, 0.7)', // slate-700
    display: 'flex', // Use flex to position content and close button
    flexDirection: 'column',
  };

  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(100, 116, 139, 0.6)',
    fontSize: '12px',
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
    letterSpacing: '0.1em',
    zIndex: 1,
    pointerEvents: 'none'
  };

  const insWrapperStyle: React.CSSProperties = {
    flexGrow: 1, // Allow ad to take available space
    position: 'relative', // For placeholder and ins element positioning
    width: '100%',
    height: '100%',
  };

  const insStyle: React.CSSProperties = {
    display: 'block', // Changed to block
    width: '100%',
    height: '100%',
    position: 'relative',
    zIndex: 2 // Ensure ad iframe is on top of placeholder
  };

  return (
    <>
      {/* Left Ad Banner */}
      {showLeftAd && (
        <aside
          className="side-ad-banner"
          style={{ ...adContainerStyle, left: '20px' }}
          aria-label="Advertisement Left"
        >
          <button onClick={() => setShowLeftAd(false)} className="ad-close-button" aria-label="Close Ad">
            &times;
          </button>
          <div style={insWrapperStyle}>
            <div style={placeholderStyle}>IKLAN</div>
            <ins
              key={`left-ad-${leftAdRenderKey}`} // Dynamic key to force re-mount
              className="adsbygoogle"
              style={insStyle}
              data-ad-client="ca-pub-8164710909537323"
              // IMPORTANT: Replace with a real Ad Slot ID for your vertical banner
              data-ad-slot="1234567890"
            ></ins>
          </div>
        </aside>
      )}

      {/* Right Ad Banner */}
      {showRightAd && (
        <aside
          className="side-ad-banner"
          style={{ ...adContainerStyle, right: '20px' }}
          aria-label="Advertisement Right"
        >
          <button onClick={() => setShowRightAd(false)} className="ad-close-button" aria-label="Close Ad">
            &times;
          </button>
          <div style={insWrapperStyle}>
            <div style={placeholderStyle}>IKLAN</div>
            <ins
              key={`right-ad-${rightAdRenderKey}`} // Dynamic key to force re-mount
              className="adsbygoogle"
              style={insStyle}
              data-ad-client="ca-pub-8164710909537323"
              // IMPORTANT: This needs its OWN UNIQUE Ad Slot ID for your second vertical banner
              data-ad-slot="0987654321"
            ></ins>
          </div>
        </aside>
      )}
    </>
  );
};

export default AdBanner;

import React, { useEffect } from 'react';

// This is necessary to prevent TypeScript errors with the adsbygoogle property on window
declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const AdBanner: React.FC = () => {
  useEffect(() => {
    const pushAds = () => {
      try {
        // We need to push one object for each ad unit on the page.
        (window.adsbygoogle = window.adsbygoogle || []).push({}); // For left ad
        (window.adsbygoogle = window.adsbygoogle || []).push({}); // For right ad
      } catch (e) {
        console.error('AdSense error:', e);
      }
    };

    // A small delay can help ensure the ad container is measured before the ad is requested.
    const timeoutId = setTimeout(pushAds, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  const adContainerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1000,
    width: '120px',
    height: '600px',
    backgroundColor: 'rgba(30, 41, 59, 0.5)', // slate-800 with transparency
    backdropFilter: 'blur(4px)',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid rgba(51, 65, 85, 0.7)', // slate-700
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

  const insStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '120px',
    height: '600px',
    position: 'relative',
    zIndex: 2 // Ensure ad iframe is on top of placeholder
  };

  return (
    <>
      {/* Simple CSS to hide banners on smaller screens to avoid overlap */}
      <style>{`
        @media (max-width: 1280px) {
          .side-ad-banner {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Left Ad Banner */}
      <aside
        className="side-ad-banner"
        style={{ ...adContainerStyle, left: '20px' }}
        aria-label="Advertisement Left"
      >
        <div style={placeholderStyle}>IKLAN</div>
        <ins
          className="adsbygoogle"
          style={insStyle}
          data-ad-client="ca-pub-8164710909537323"
          // IMPORTANT: Replace with a real Ad Slot ID for your vertical banner
          data-ad-slot="1234567890"
        ></ins>
      </aside>

      {/* Right Ad Banner */}
      <aside
        className="side-ad-banner"
        style={{ ...adContainerStyle, right: '20px' }}
        aria-label="Advertisement Right"
      >
        <div style={placeholderStyle}>IKLAN</div>
        <ins
          className="adsbygoogle"
          style={insStyle}
          data-ad-client="ca-pub-8164710909537323"
          // IMPORTANT: This needs its OWN UNIQUE Ad Slot ID for your second vertical banner
          data-ad-slot="0987654321"
        ></ins>
      </aside>
    </>
  );
};

export default AdBanner;

/**
 * Fullscreen utilities for Octavia Piano
 * Automatically hides mobile browser navigation/address bar on mobile devices outside the main menu.
 */

export const isAppFullscreen = (): boolean => {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    document.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.webkitCurrentFullScreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
};

export const requestAppFullscreen = async (): Promise<boolean> => {
  if (typeof document === 'undefined') return false;
  if (isAppFullscreen()) return true;

  try {
    const docEl = document.documentElement as any;

    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen({ navigationUI: 'hide' });
      return true;
    } else if (docEl.webkitRequestFullscreen) {
      await docEl.webkitRequestFullscreen();
      return true;
    } else if (docEl.webkitRequestFullScreen) {
      await docEl.webkitRequestFullScreen();
      return true;
    } else if (docEl.mozRequestFullScreen) {
      await docEl.mozRequestFullScreen();
      return true;
    } else if (docEl.msRequestFullscreen) {
      await docEl.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    // Gracefully handle browser policy (e.g. requires transient user gesture)
  }
  return false;
};

export const exitAppFullscreen = async (): Promise<boolean> => {
  if (typeof document === 'undefined') return false;
  if (!isAppFullscreen()) return true;

  try {
    const doc = document as any;
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
      return true;
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
      return true;
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
      return true;
    }
  } catch (err) {
    // Ignore exit failure
  }
  return false;
};


/**
 * Safe mode utilities to completely disable debug functionality when needed
 */

export const isSafeModeEnabled = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('safe') === 'true' || 
         urlParams.get('debug') === 'false' ||
         localStorage.getItem('safe-mode') === 'true';
};

export const enableSafeMode = (): void => {
  localStorage.setItem('safe-mode', 'true');
  localStorage.removeItem('emergency-debug');
  localStorage.removeItem('enable-debug');
  
  // Remove debug parameters from URL
  const url = new URL(window.location.href);
  url.searchParams.delete('debug');
  url.searchParams.set('safe', 'true');
  window.history.replaceState({}, '', url.toString());
};

export const disableSafeMode = (): void => {
  localStorage.removeItem('safe-mode');
  
  // Remove safe parameter from URL
  const url = new URL(window.location.href);
  url.searchParams.delete('safe');
  window.history.replaceState({}, '', url.toString());
};

export const shouldBypassDebug = (): boolean => {
  return isSafeModeEnabled();
};
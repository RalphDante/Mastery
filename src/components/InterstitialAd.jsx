// InterstitialAd.jsx
export const showInterstitialAd = () => {
  console.log('🎯 showInterstitialAd called');
  console.log('🌍 Current domain:', window.location.hostname);
  
  const script = document.createElement('script');
  script.dataset.zone = '10332190';
  script.src = 'https://groleegni.net/vignette.min.js';
  
  script.onload = () => console.log('✅ Ad script loaded successfully');
  script.onerror = () => console.error('❌ Ad script failed to load');
  
  const target = document.body || document.documentElement;
  target.appendChild(script);
  
  console.log('📺 Ad script appended to DOM');
};
let audioCtx = null;
let isAudioEnabled = false;

export const initAudio = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isAudioEnabled = true;

    // play a short silent sound to unlock audio on mobile browsers
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(0);
    osc.stop(audioCtx.currentTime + 0.01);
    
    return true;
  } catch (e) {
    console.error("Audio init failed", e);
    return false;
  }
};

export const getAudioState = () => isAudioEnabled && audioCtx && audioCtx.state === 'running';

export const playBeep = () => {
  try {
    if (!audioCtx || audioCtx.state === 'suspended') {
      return;
    }
    
    const now = audioCtx.currentTime;
    
    // Play a shiny, modern success chime (two tones quickly, like a subtle bell)
    const playTone = (freq, type, startTime, duration, vol) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // First note (ding)
    playTone(1046.50, 'sine', now, 0.2, 0.3); // C6
    playTone(2093.00, 'sine', now, 0.2, 0.1); // C7 (harmonic)
    
    // Second note higher (ding!)
    playTone(1318.51, 'sine', now + 0.08, 0.4, 0.3); // E6
    playTone(2637.02, 'sine', now + 0.08, 0.4, 0.1); // E7 (harmonic)

  } catch (e) {
    console.error("Audio beep failed", e);
  }
};

export const playCheckoutSound = () => {
  if (!isAudioEnabled) return;
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
  audio.volume = 0.5;
  audio.play().catch(e => console.warn('Checkout sound failed', e));
};

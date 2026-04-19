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
      // Audio not initialized or suspended
      return;
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    // Classic checkout beep: short and slightly high pitched square wave
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
    
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.error("Audio beep failed", e);
  }
};

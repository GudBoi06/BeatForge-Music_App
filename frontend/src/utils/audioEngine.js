const AudioContext = window.AudioContext || window.webkitAudioContext;

export const audioCtx = new AudioContext();

//Master Volume knob
export const masterGain = audioCtx.createGain();

//Export Audio Capture
export const recDestination = audioCtx.createMediaStreamDestination();

// Route the Master Volume to the user's speakers AND to the virtual microphone
masterGain.connect(audioCtx.destination);
masterGain.connect(recDestination);

// Helper to resume audio context (browsers block audio until a click happens)
export const wakeAudio = () => {
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
};




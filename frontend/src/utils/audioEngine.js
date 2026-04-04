const AudioContext = window.AudioContext || window.webkitAudioContext;

// Create the single shared audio environment
export const audioCtx = new AudioContext();

// Create the Master Volume knob
export const masterGain = audioCtx.createGain();

// Create the "Virtual Microphone" to capture the audio for export
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
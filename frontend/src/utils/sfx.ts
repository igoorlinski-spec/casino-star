// ─────────────────────────────────────────────────────────────────────────────
// sfx.ts – Syntezowane efekty dźwiękowe przez Web Audio API
// Działają bez żadnych plików / CDN – w pełni offline!
// ─────────────────────────────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return _ctx;
}

interface OscParams {
  freq: number;
  type?: OscillatorType;
  duration: number;
  volume?: number;
  freqEnd?: number;
  attack?: number;
  delay?: number;
}

function playOsc({ freq, type = 'sine', duration, volume = 0.4, freqEnd, attack = 0.005, delay = 0 }: OscParams) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + delay + duration);
    }

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) {
    // silently ignore (e.g. autoplay blocked)
  }
}

// ─── Definicje dźwięków ───────────────────────────────────────────────────────

/** Kliknięcie UI – krótki tik */
export function sfxClick() {
  playOsc({ freq: 1200, type: 'square', duration: 0.06, volume: 0.15, freqEnd: 900 });
}

/** Rozdanie karty – szybki szmer */
export function sfxCardDeal() {
  playOsc({ freq: 800, type: 'triangle', duration: 0.12, volume: 0.25, freqEnd: 400 });
  playOsc({ freq: 1200, type: 'triangle', duration: 0.08, volume: 0.15, freqEnd: 600, delay: 0.05 });
}

/** Wygrana – fanfara */
export function sfxWin() {
  const notes = [523, 659, 784, 1047]; // C E G C
  notes.forEach((freq, i) => {
    playOsc({ freq, type: 'triangle', duration: 0.18, volume: 0.35, delay: i * 0.1 });
  });
}

/** Jackpot – mega fanfara */
export function sfxJackpot() {
  const notes = [523, 659, 784, 1047, 1318];
  notes.forEach((freq, i) => {
    playOsc({ freq, type: 'triangle', duration: 0.22, volume: 0.5, delay: i * 0.09 });
    playOsc({ freq: freq * 2, type: 'sine', duration: 0.15, volume: 0.2, delay: i * 0.09 + 0.04 });
  });
}

/** Przegrana – opadający ton */
export function sfxLose() {
  playOsc({ freq: 400, type: 'sawtooth', duration: 0.4, volume: 0.3, freqEnd: 150 });
}

/** Zakup – kasowy sygnał */
export function sfxBuy() {
  playOsc({ freq: 880, type: 'triangle', duration: 0.1, volume: 0.3 });
  playOsc({ freq: 1100, type: 'triangle', duration: 0.12, volume: 0.3, delay: 0.08 });
}

/** Jedzenie – mlaskanie */
export function sfxEat() {
  playOsc({ freq: 300, type: 'sine', duration: 0.08, volume: 0.25 });
  playOsc({ freq: 400, type: 'sine', duration: 0.07, volume: 0.2, delay: 0.1 });
  playOsc({ freq: 350, type: 'sine', duration: 0.06, volume: 0.15, delay: 0.18 });
}

/** Picie – bulgotanie */
export function sfxDrink() {
  [0, 0.07, 0.14, 0.21].forEach((delay, i) => {
    playOsc({ freq: 500 + i * 80, type: 'sine', duration: 0.06, volume: 0.22, delay });
  });
}

/** Spanie – spokojne brzmienie */
export function sfxSleep() {
  playOsc({ freq: 220, type: 'sine', duration: 0.6, volume: 0.2 });
  playOsc({ freq: 330, type: 'sine', duration: 0.6, volume: 0.15, delay: 0.3 });
}

/** Kręcenie automatem – mechaniczny warkot */
export function sfxSpinStart() {
  for (let i = 0; i < 8; i++) {
    playOsc({ freq: 200 + i * 20, type: 'sawtooth', duration: 0.07, volume: 0.1, delay: i * 0.07 });
  }
}

/** Zatrzymanie bębna – kliknięcie mechaniczne */
export function sfxReelStop() {
  playOsc({ freq: 600, type: 'square', duration: 0.05, volume: 0.2, freqEnd: 300 });
}

/** Błąd / za mało żetonów */
export function sfxError() {
  playOsc({ freq: 250, type: 'square', duration: 0.15, volume: 0.25 });
  playOsc({ freq: 200, type: 'square', duration: 0.15, volume: 0.25, delay: 0.18 });
}

/** Rozrywka – pozytywny dżingiel */
export function sfxFun() {
  [660, 880, 1100].forEach((freq, i) => {
    playOsc({ freq, type: 'triangle', duration: 0.15, volume: 0.25, delay: i * 0.08 });
  });
}

/** Burgerowe kliknięcie pracy */
export function sfxBurger() {
  playOsc({ freq: 700, type: 'triangle', duration: 0.1, volume: 0.2, freqEnd: 500 });
  playOsc({ freq: 1000, type: 'triangle', duration: 0.06, volume: 0.15, delay: 0.08, freqEnd: 700 });
}

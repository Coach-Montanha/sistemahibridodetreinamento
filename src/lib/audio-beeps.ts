/**
 * Sintetizador sonoro de bips e alertas para treinos usando a Web Audio API nativa.
 * Funciona de forma 100% offline, sem arquivos externos de áudio e compatível com iOS e Android.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Toca um tom senoidal limpo na frequência e duração especificadas
   */
  public playTone(freq: number, durationSec: number, type: OscillatorType = "sine", gainVal = 0.15) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationSec);
    } catch {
      // Falha silenciosa em navegadores com restrições estritas de áudio
    }
  }

  /**
   * Bip de contagem regressiva curta (ex.: 3, 2, 1)
   */
  public playCountdownBeep() {
    this.playTone(587.33, 0.12, "sine", 0.18); // Nota Ré5
  }

  /**
   * Bip de início ou virada de minuto (ex.: EMOM go / Início do Tabata)
   */
  public playStartBeep() {
    this.playTone(880, 0.35, "triangle", 0.25); // Nota Lá5 (aguda e marcante)
  }

  /**
   * Alerta duplo de fim de descanso ou fim de round
   */
  public playRestCompleteBeep() {
    try {
      this.playTone(784, 0.15, "sine", 0.2); // Sol5
      setTimeout(() => {
        this.playTone(1046.5, 0.3, "triangle", 0.25); // Dó6
      }, 160);
    } catch {}
  }
}

export const soundEffects = new SoundSynthesizer();

"use client";

/**
 * The new-order alert.
 *
 * Synthesised with the Web Audio API rather than shipped as an audio file: no
 * asset to download on a slow connection, no cache to miss, and it still works
 * with the service worker offline. A kitchen tablet that fails to chime because
 * an mp3 request timed out is a missed order.
 */

let context: AudioContext | null = null;

/**
 * Browsers refuse to start audio without a user gesture, so this must be called
 * from a click — the "enable sound" toggle exists for exactly that reason and
 * cannot be replaced by autoplay.
 */
export async function armAudio(): Promise<boolean> {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") await context.resume();
    return context.state === "running";
  } catch {
    return false;
  }
}

export function isArmed(): boolean {
  return context?.state === "running";
}

/** Two rising notes — distinct from a phone notification, hard to mistake. */
export function playOrderAlert() {
  if (!context || context.state !== "running") return;

  const now = context.currentTime;
  for (const [index, frequency] of [880, 1174.66].entries()) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    const start = now + index * 0.16;
    // Ramped, not switched: an abrupt gain change clicks audibly on cheap
    // tablet speakers, which is what a restaurant counter actually has.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.5);
  }
}

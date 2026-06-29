// Lets the orb (on every tab) open the companion sheet, which is mounted once at the root.
import type { Feeling } from '@/soul/feelings';

type Opener = (feeling?: Feeling) => void;
let _open: Opener | null = null;

export function registerCompanionOpener(fn: Opener | null) {
  _open = fn;
}

/** Open the companion. With a feeling -> straight into the conversation; without -> the Feeling Door grid. */
export function openCompanion(feeling?: Feeling) {
  _open?.(feeling);
}

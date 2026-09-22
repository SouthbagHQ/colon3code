export const DISCONNECTED_COMPOSER_PLACEHOLDER = "meow, what are we making together today? :3";

/**
 * Resting-composer hellos. One is picked per thread so a thread keeps its
 * placeholder across re-renders; the tool hint stays in the rotation so
 * @/$// discoverability is not lost.
 */
export const COMPOSER_PLACEHOLDERS: ReadonlyArray<string> = [
  DISCONNECTED_COMPOSER_PLACEHOLDER,
  "what's on your mind? mrrp",
  "got something for me to pounce on? :3",
  "tell me what to build, purr",
  "what shall we make today? ^w^",
  "ask me anything, @tag files/folders, $use skills, or / for commands :3",
];

// FNV-1a: tiny, stable, and good enough to spread thread ids across the list.
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function composerPlaceholderFor(seed: string): string {
  return COMPOSER_PLACEHOLDERS[hashSeed(seed) % COMPOSER_PLACEHOLDERS.length]!;
}

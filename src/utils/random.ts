// Deterministic pseudo-random generator (a simple LCG) - the same seed
// always produces the same sequence, so anything built from it (star
// movement direction/speed, idle-animation timing) stays reproducible
// across renders/restarts instead of reshuffling, and never costs a real
// Math.random() call in a hot path.
export function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

// Turns a stable string key (e.g. a star id) into a seed for the generator
// above, so per-entity variation doesn't depend on array index alone (which
// would make e.g. every level's first star behave identically).
export function hashStringToSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

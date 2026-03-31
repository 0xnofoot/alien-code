// Stub for bun:bundle — feature() DCE not available at runtime outside Bun
// Return false so all feature-gated code paths are disabled (safe default)
export function feature(_name: string): boolean {
  return false
}

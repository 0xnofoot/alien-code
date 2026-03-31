// Redirect color-diff-napi to the pure TypeScript port bundled in the repo.
// The native module (Rust/NAPI) is not available on public npm;
// the TS port has an identical API.
export * from '../../src/native-ts/color-diff/index.js'

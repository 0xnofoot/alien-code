// Stub for audio-capture-napi: exports proper no-op methods so voice.ts
// cleanly falls back to arecord/sox instead of throwing TypeError.
export function isNativeAudioAvailable(): boolean {
  return false
}
export function isNativeRecordingActive(): boolean {
  return false
}
export function startNativeRecording(
  _onData: (chunk: Buffer) => void,
  _onEnd: () => void,
): boolean {
  return false
}
export function stopNativeRecording(): void {}
export default {}

// Stub for bun:ffi — not available in Node.js runtime
export const dlopen = () => { throw new Error('bun:ffi not available in Node.js') }
export const CString = class {}
export const ptr = () => 0
export const toArrayBuffer = () => new ArrayBuffer(0)
export const read = {}
export default {}

/**
 * 浏览器API兼容性polyfill
 */

// structuredClone
if (typeof structuredClone !== 'function') {
  const globalObj = typeof globalThis !== 'undefined' ? globalThis : window;
  globalObj.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}

export default {}
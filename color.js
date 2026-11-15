/**
 * PixelImage (.pxi) Studio - Main Canvas Controller
 * @file app.js
 * @author BjornEriksson (https://github.com)
 * @version 0.2.0-beta
 */

/**
 * PixelImage (.pxi) Studio - 9-Bit Color Utilities
 */
const Color9Bit = {
  WHITE: 0x01FF, // R:7 G:7 B:7
  BLACK: 0x0000, // R:0 G:0 B:0
  DEFAULT_RASTER: (5 << 6) | (5 << 3) | 6,

  pack(r, g, b) {
    return ((r & 7) << 6) | ((g & 7) << 3) | (b & 7);
  },

  unpack(val) {
    return {
      r: (val >> 6) & 7,
      g: (val >> 3) & 7,
      b: val & 7
    };
  },

  toCss(val) {
    const c = this.unpack(val);
    const r8 = Math.round((c.r * 255) / 7);
    const g8 = Math.round((c.g * 255) / 7);
    const b8 = Math.round((c.b * 255) / 7);
    return `rgb(${r8}, ${g8}, ${b8})`;
  },

  toHex(val) {
    const c = this.unpack(val);
    const hex = (n) => Math.round((n * 255) / 7).toString(16).padStart(2, '0').toUpperCase();
    return `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`;
  },

  getPresets() {
    return [
      { r: 0, g: 0, b: 0 }, { r: 2, g: 2, b: 2 }, { r: 5, g: 5, b: 5 }, { r: 7, g: 7, b: 7 },
      { r: 7, g: 0, b: 0 }, { r: 4, g: 0, b: 0 }, { r: 7, g: 3, b: 0 }, { r: 7, g: 7, b: 0 },
      { r: 0, g: 7, b: 0 }, { r: 0, g: 4, b: 1 }, { r: 0, g: 7, b: 7 }, { r: 0, g: 3, b: 7 },
      { r: 0, g: 0, b: 7 }, { r: 4, g: 0, b: 7 }, { r: 7, g: 0, b: 7 }, { r: 7, g: 4, b: 5 }
    ];
  }
};

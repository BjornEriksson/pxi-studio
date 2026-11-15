/**
 * PixelImage (.pxi) Studio - Multi-Depth Color Engine (8/9/12/16/24-bit)
 * @file color.js
 * @author BjornEriksson (https://github.com)
 * @version 0.3.0-beta
 */
const ColorEngine = {
  // File header paletteMode IDs (backwards compatible with v0.2)
  MODE_9BIT: 0,   // Default: 3-3-3 RGB (512 colors, 2 bytes/px)
  MODE_12BIT: 1,  // Amiga: 4-4-4 RGB (4,096 colors, 2 bytes/px)
  MODE_24BIT: 2,  // Modern: 8-8-8 True Color (16.7M colors, 3 bytes/px)
  MODE_8BIT: 3,   // Classic VGA: Fixed 256-color palette (1 byte/px)
  MODE_16BIT: 4,  // High Color: 5-6-5 RGB (65,536 colors, 2 bytes/px)

  WHITE_24: 0xFFFFFF,
  BLACK_24: 0x000000,
  DEFAULT_RASTER_24: 0xB6B6DB,

  MODES: Object.freeze({
    3: { id: 3, name: '8-Bit Classic VGA (256)', maxR: 255, maxG: 255, maxB: 255, hasGridModal: true },
    0: { id: 0, name: '9-Bit Retro (512) [Default]', maxR: 7, maxG: 7, maxB: 7, hasGridModal: true },
    1: { id: 1, name: '12-Bit Amiga (4,096)', maxR: 15, maxG: 15, maxB: 15, hasGridModal: false },
    4: { id: 4, name: '16-Bit High Color (65,536)', maxR: 31, maxG: 63, maxB: 31, hasGridModal: false },
    2: { id: 2, name: '24-Bit True Color (16.7M)', maxR: 255, maxG: 255, maxB: 255, hasGridModal: false }
  }),

  pack24(r8, g8, b8) {
    return ((r8 & 0xFF) << 16) | ((g8 & 0xFF) << 8) | (b8 & 0xFF);
  },

  unpack24(rgb24) {
    return {
      r: (rgb24 >> 16) & 0xFF,
      g: (rgb24 >> 8) & 0xFF,
      b: rgb24 & 0xFF
    };
  },

  toCss(rgb24) {
    const { r, g, b } = this.unpack24(rgb24);
    return `rgb(${r}, ${g}, ${b})`;
  },

  toHex(rgb24) {
    return '#' + (rgb24 & 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase();
  },

  // Find closest index (0-255) in fixed VGA 256 palette
  nearestVgaIndex(rgb24) {
    const { r, g, b } = this.unpack24(rgb24);
    const pal = ColorPalettes.VGA_256;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < 256; i++) {
      const c = pal[i];
      const dr = r - ((c >> 16) & 0xFF);
      const dg = g - ((c >> 8) & 0xFF);
      const db = b - (c & 0xFF);
      const dist = dr * dr + dg * dg + db * db;
      if (dist === 0) return i;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  },

  // Quantize any 24-bit color to the active paletteMode's exact valid color
  quantize24(rgb24, mode) {
    const { r, g, b } = this.unpack24(rgb24);
    switch (mode) {
      case this.MODE_8BIT:
        return ColorPalettes.VGA_256[this.nearestVgaIndex(rgb24)];
      case this.MODE_9BIT: {
        const r3 = Math.round((r * 7) / 255);
        const g3 = Math.round((g * 7) / 255);
        const b3 = Math.round((b * 7) / 255);
        return this.pack24(Math.round((r3 * 255) / 7), Math.round((g3 * 255) / 7), Math.round((b3 * 255) / 7));
      }
      case this.MODE_12BIT: {
        const r4 = Math.round((r * 15) / 255);
        const g4 = Math.round((g * 15) / 255);
        const b4 = Math.round((b * 15) / 255);
        return this.pack24(r4 * 17, g4 * 17, b4 * 17);
      }
      case this.MODE_16BIT: {
        const r5 = Math.round((r * 31) / 255);
        const g6 = Math.round((g * 63) / 255);
        const b5 = Math.round((b * 31) / 255);
        return this.pack24(Math.round((r5 * 255) / 31), Math.round((g6 * 255) / 63), Math.round((b5 * 255) / 31));
      }
      default:
        return rgb24 & 0xFFFFFF;
    }
  },

  // Convert slider channel values (based on mode) to quantized 24-bit color
  fromChannelSliders(r, g, b, mode) {
    switch (mode) {
      case this.MODE_9BIT:
        return this.pack24(Math.round((r * 255) / 7), Math.round((g * 255) / 7), Math.round((b * 255) / 7));
      case this.MODE_12BIT:
        return this.pack24(r * 17, g * 17, b * 17);
      case this.MODE_16BIT:
        return this.pack24(Math.round((r * 255) / 31), Math.round((g * 255) / 63), Math.round((b * 255) / 31));
      case this.MODE_8BIT:
        return this.quantize24(this.pack24(r, g, b), this.MODE_8BIT);
      default:
        return this.pack24(r, g, b);
    }
  },

  // Convert 24-bit color to channel slider values for the active mode
  toChannelSliders(rgb24, mode) {
    const { r, g, b } = this.unpack24(rgb24);
    switch (mode) {
      case this.MODE_9BIT:
        return { r: Math.round((r * 7) / 255), g: Math.round((g * 7) / 255), b: Math.round((b * 7) / 255) };
      case this.MODE_12BIT:
        return { r: Math.round((r * 15) / 255), g: Math.round((g * 15) / 255), b: Math.round((b * 15) / 255) };
      case this.MODE_16BIT:
        return { r: Math.round((r * 31) / 255), g: Math.round((g * 63) / 255), b: Math.round((b * 31) / 255) };
      default:
        return { r, g, b };
    }
  },

  // Binary file packing (from 24-bit internal color to file format integer)
  encodePixel(rgb24, mode) {
    const { r, g, b } = this.unpack24(rgb24);
    switch (mode) {
      case this.MODE_8BIT:
        return this.nearestVgaIndex(rgb24);
      case this.MODE_9BIT:
        return ((Math.round((r * 7) / 255) & 7) << 6) | ((Math.round((g * 7) / 255) & 7) << 3) | (Math.round((b * 7) / 255) & 7);
      case this.MODE_12BIT:
        return ((Math.round((r * 15) / 255) & 15) << 8) | ((Math.round((g * 15) / 255) & 15) << 4) | (Math.round((b * 15) / 255) & 15);
      case this.MODE_16BIT:
        return ((Math.round((r * 31) / 255) & 31) << 11) | ((Math.round((g * 63) / 255) & 63) << 5) | (Math.round((b * 31) / 255) & 31);
      default:
        return rgb24 & 0xFFFFFF;
    }
  },

  // Binary file unpacking (from file format integer to 24-bit internal color)
  decodePixel(val, mode) {
    switch (mode) {
      case this.MODE_8BIT:
        return ColorPalettes.VGA_256[val & 0xFF];
      case this.MODE_9BIT: {
        const r = (val >> 6) & 7, g = (val >> 3) & 7, b = val & 7;
        return this.pack24(Math.round((r * 255) / 7), Math.round((g * 255) / 7), Math.round((b * 255) / 7));
      }
      case this.MODE_12BIT: {
        const r = (val >> 8) & 15, g = (val >> 4) & 15, b = val & 15;
        return this.pack24(r * 17, g * 17, b * 17);
      }
      case this.MODE_16BIT: {
        const r = (val >> 11) & 31, g = (val >> 5) & 63, b = val & 31;
        return this.pack24(Math.round((r * 255) / 31), Math.round((g * 255) / 63), Math.round((b * 255) / 31));
      }
      default:
        return val & 0xFFFFFF;
    }
  }
};

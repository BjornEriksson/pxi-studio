/**
 * PixelImage (.pxi) Studio - Fixed Hardware Palette Tables
 * @file color-palettes.js
 * @author BjornEriksson (https://github.com)
 * @version 0.3.0-beta
 */
const ColorPalettes = (() => {
  // Build deterministic classic 256-color VGA Mode 13h palette (0xRRGGBB)
  function buildVga256() {
    const pal = new Uint32Array(256);
    // 0-15: Standard 16 CGA/EGA colors
    const ega16 = [
      0x000000, 0x0000AA, 0x00AA00, 0x00AAAA, 0xAA0000, 0xAA00AA, 0xAA5500, 0xAAAAAA,
      0x555555, 0x5555FF, 0x55FF55, 0x55FFFF, 0xFF5555, 0xFF55FF, 0xFFFF55, 0xFFFFFF
    ];
    for (let i = 0; i < 16; i++) pal[i] = ega16[i];

    // 16-31: 16-step grayscale ramp
    for (let i = 0; i < 16; i++) {
      const v = Math.round((i * 255) / 15);
      pal[16 + i] = (v << 16) | (v << 8) | v;
    }

    // 32-247: 216-color RGB cube (6 x 6 x 6)
    let idx = 32;
    for (let r = 0; r < 6; r++) {
      for (let g = 0; g < 6; g++) {
        for (let b = 0; b < 6; b++) {
          const r8 = Math.round((r * 255) / 5);
          const g8 = Math.round((g * 255) / 5);
          const b8 = Math.round((b * 255) / 5);
          pal[idx++] = (r8 << 16) | (g8 << 8) | b8;
        }
      }
    }

    // 248-255: 8 deep shadow/accent tones
    const extra8 = [0x140000, 0x001400, 0x000014, 0x141400, 0x140014, 0x001414, 0x281400, 0x101018];
    for (let i = 0; i < 8; i++) pal[248 + i] = extra8[i];

    return pal;
  }

  const VGA_256 = buildVga256();

  const QUICK_SWATCHES_24 = [
    0x000000, 0x494949, 0xB6B6B6, 0xFFFFFF,
    0xFF0000, 0x920000, 0xFF6D00, 0xFFFF00,
    0x00FF00, 0x009224, 0x00FFFF, 0x006DFF,
    0x0000FF, 0x9200FF, 0xFF00FF, 0xFF92B6
  ];

  return Object.freeze({
    VGA_256,
    QUICK_SWATCHES_24
  });
})();

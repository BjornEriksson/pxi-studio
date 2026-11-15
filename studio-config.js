/**
 * PixelImage (.pxi) Studio - Preset & Window Bounds Configuration
 * @file studio-config.js
 * @author BjornEriksson (https://github.com)
 * @version 0.2.2-beta
 */
const StudioConfig = Object.freeze({
  LIMITS: Object.freeze({
    MIN_WIN_W: 540,
    MAX_WIN_W: 1920,
    MIN_WIN_H: 400,
    MAX_WIN_H: 1200,
    MIN_GRID: 1,
    MAX_GRID: 512,
    MIN_SCALE: 1,
    MAX_SCALE: 16
  }),

  PRESETS: Object.freeze({
    default: {
      formatId: 'pxi_studio_tmp',
      label: 'Default Art (60×50 @ 5x = 300×250px)',
      windowWidth: 800,
      windowHeight: 600,
      gridWidth: 60,
      gridHeight: 50,
      pixelScale: 5,
      rasterStyle: 1,
      rasterThickness: 1
    },
    small_square_125: {
      formatId: 'small_square_125',
      label: 'Small Square (21×21 @ 5x = 125×125px)',
      windowWidth: 620,
      windowHeight: 440,
      gridWidth: 21,
      gridHeight: 21,
      pixelScale: 5,
      rasterStyle: 1,
      rasterThickness: 1
    },
    double_tile_251: {
      formatId: 'double_tile_251',
      label: 'Double Tile (42×21 @ 5x = 251×125px)',
      windowWidth: 720,
      windowHeight: 440,
      gridWidth: 42,
      gridHeight: 21,
      pixelScale: 5,
      rasterStyle: 1,
      rasterThickness: 1
    },
    medium_square_250: {
      formatId: 'medium_square_250',
      label: 'Medium Square (36×36 @ 5x = 250×250px)',
      windowWidth: 680,
      windowHeight: 540,
      gridWidth: 36,
      gridHeight: 36,
      pixelScale: 5,
      rasterStyle: 1,
      rasterThickness: 2
    },
    widescreen_led_600: {
      formatId: 'widescreen_led_600',
      label: 'Widescreen LED (86×18 @ 5x = 600×124px)',
      windowWidth: 980,
      windowHeight: 440,
      gridWidth: 86,
      gridHeight: 18,
      pixelScale: 5,
      rasterStyle: 1,
      rasterThickness: 2
    },
    raw_canvas_300: {
      formatId: 'raw_canvas_300',
      label: '1:1 Raw Canvas (300×250 @ 1x)',
      windowWidth: 800,
      windowHeight: 600,
      gridWidth: 300,
      gridHeight: 250,
      pixelScale: 1,
      rasterStyle: 0,
      rasterThickness: 0
    }
  }),

  getBootConfig() {
    const key = document.body?.dataset?.preset || 'default';
    return this.PRESETS[key] || this.PRESETS.default;
  }
});

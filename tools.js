/**
 * PixelImage (.pxi) Studio - Main Canvas Controller
 * @file app.js
 * @author BjornEriksson (https://github.com)
 * @version 0.2.0-beta
 */

/**
 * PixelImage (.pxi) Studio - Pixel Drawing Algorithms
 */
const DrawingTools = {
  setPixel(pixels, w, h, x, y, color) {
    if (x >= 0 && x < w && y >= 0 && y < h) {
      pixels[y * w + x] = color;
    }
  },

  drawLine(pixels, w, h, x0, y0, x1, y1, color) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.setPixel(pixels, w, h, x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  },

  drawRect(pixels, w, h, x0, y0, x1, y1, color) {
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
    for (let x = minX; x <= maxX; x++) {
      this.setPixel(pixels, w, h, x, minY, color);
      this.setPixel(pixels, w, h, x, maxY, color);
    }
    for (let y = minY; y <= maxY; y++) {
      this.setPixel(pixels, w, h, minX, y, color);
      this.setPixel(pixels, w, h, maxX, y, color);
    }
  },

  floodFill(pixels, w, h, startX, startY, targetColor) {
    const origColor = pixels[startY * w + startX];
    if (origColor === targetColor) return;
    const stack = [{ x: startX, y: startY }];

    while (stack.length > 0) {
      const p = stack.pop();
      if (p.x < 0 || p.x >= w || p.y < 0 || p.y >= h) continue;
      const idx = p.y * w + p.x;
      if (pixels[idx] !== origColor) continue;
      pixels[idx] = targetColor;
      stack.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 });
    }
  }
};

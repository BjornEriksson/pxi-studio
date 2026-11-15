/**
 * PixelImage (.pxi) Studio - Pixel Drawing & Transform Algorithms
 * @file tools.js
 * @author BjornEriksson (https://github.com)
 * @version 0.4.1-beta
 */
const DrawingTools = {
  setPixel(pixels, w, h, x, y, color) {
    if (x >= 0 && x < w && y >= 0 && y < h) {
      pixels[y * w + x] = color;
    }
  },

  // Stamp a square brush centered around (cx, cy)
  stampBrush(pixels, w, h, cx, cy, size, color) {
    if (size <= 1) {
      this.setPixel(pixels, w, h, cx, cy, color);
      return;
    }
    const offset = Math.floor(size / 2);
    const startX = cx - offset;
    const startY = cy - offset;
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        this.setPixel(pixels, w, h, startX + dx, startY + dy, color);
      }
    }
  },

  // Continuous line using 1x1 pixel or multi-pixel brush
  drawBrushLine(pixels, w, h, x0, y0, x1, y1, size, color) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.stampBrush(pixels, w, h, x0, y0, size, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  },

  drawLine(pixels, w, h, x0, y0, x1, y1, color) {
    this.drawBrushLine(pixels, w, h, x0, y0, x1, y1, 1, color);
  },

  drawRect(pixels, w, h, x0, y0, x1, y1, color, filled = false) {
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);

    if (filled) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          this.setPixel(pixels, w, h, x, y, color);
        }
      }
      return;
    }

    for (let x = minX; x <= maxX; x++) {
      this.setPixel(pixels, w, h, x, minY, color);
      this.setPixel(pixels, w, h, x, maxY, color);
    }
    for (let y = minY; y <= maxY; y++) {
      this.setPixel(pixels, w, h, minX, y, color);
      this.setPixel(pixels, w, h, maxX, y, color);
    }
  },

  drawCircle(pixels, w, h, x0, y0, x1, y1, color, filled = false) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    const endX = x0 + (dx >= 0 ? size : -size);
    const endY = y0 + (dy >= 0 ? size : -size);
    this.drawEllipse(pixels, w, h, x0, y0, endX, endY, color, filled);
  },

  drawEllipse(pixels, w, h, x0, y0, x1, y1, color, filled = false) {
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;

    if (rx < 0.5 && ry < 0.5) {
      this.setPixel(pixels, w, h, Math.round(cx), Math.round(cy), color);
      return;
    }

    if (filled) {
      const rx2 = Math.max(0.25, (rx + 0.35) * (rx + 0.35));
      const ry2 = Math.max(0.25, (ry + 0.35) * (ry + 0.35));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - cx;
          const dy = y - cy;
          if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1) {
            this.setPixel(pixels, w, h, x, y, color);
          }
        }
      }
      return;
    }

    const steps = Math.max(24, Math.ceil(Math.PI * (rx + ry) * 2));
    for (let i = 0; i < steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      const px = Math.round(cx + rx * Math.cos(theta));
      const py = Math.round(cy + ry * Math.sin(theta));
      this.setPixel(pixels, w, h, px, py, color);
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
  },

  flipHorizontal(pixels, w, h) {
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = 0; x < Math.floor(w / 2); x++) {
        const leftIdx = rowOffset + x;
        const rightIdx = rowOffset + (w - 1 - x);
        const tmp = pixels[leftIdx];
        pixels[leftIdx] = pixels[rightIdx];
        pixels[rightIdx] = tmp;
      }
    }
  },

  flipVertical(pixels, w, h) {
    for (let y = 0; y < Math.floor(h / 2); y++) {
      const topOffset = y * w;
      const botOffset = (h - 1 - y) * w;
      for (let x = 0; x < w; x++) {
        const tmp = pixels[topOffset + x];
        pixels[topOffset + x] = pixels[botOffset + x];
        pixels[botOffset + x] = tmp;
      }
    }
  }
};

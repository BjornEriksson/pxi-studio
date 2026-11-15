/**
 * PixelImage (.pxi) Studio - Interactive Linear Gradient Tool
 * @file gradient-tool.js
 * @author BjornEriksson (https://github.com)
 * @version 0.4.0-beta
 */
const GradientTool = {
  startColor24: 0xFFFFFF, // Default start color: White (End color = app.activeColor24)

  initUI(app) {
    const slot = document.getElementById('extra-tools-slot');
    if (!slot) return;

    slot.innerHTML = `
      <div id="gradient-options" style="display:none; margin-top:8px; padding-top:6px; border-top:1px solid #808080; text-align:center;">
        <div class="panel-label" style="font-size:9px; margin-bottom:4px;">Grad Start</div>
        <input type="color" id="grad-start-picker" value="#FFFFFF" title="Choose Gradient Start Color (End = Active Color)" style="width:100%; height:24px; cursor:pointer; border:1px solid #404040;">
      </div>
    `;

    const picker = document.getElementById('grad-start-picker');
    if (picker) {
      picker.oninput = () => {
        const raw24 = parseInt(picker.value.slice(1), 16);
        this.startColor24 = ColorEngine.quantize24(raw24, app.paletteMode);
        picker.value = ColorEngine.toHex(this.startColor24);
      };
    }
  },

  toggleUI(visible, app) {
    const box = document.getElementById('gradient-options');
    if (!box) return;
    box.style.display = visible ? 'block' : 'none';
    if (visible && app) {
      this.startColor24 = ColorEngine.quantize24(this.startColor24, app.paletteMode);
      const picker = document.getElementById('grad-start-picker');
      if (picker) picker.value = ColorEngine.toHex(this.startColor24);
    }
  },

  apply(pixels, w, h, x0, y0, x1, y1, start24, end24, paletteMode) {
    const c0 = ColorEngine.unpack24(start24);
    const c1 = ColorEngine.unpack24(end24);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let t = 0;
        if (lenSq > 0) {
          t = ((x - x0) * dx + (y - y0) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));
        }
        const r = Math.round(c0.r + (c1.r - c0.r) * t);
        const g = Math.round(c0.g + (c1.g - c0.g) * t);
        const b = Math.round(c0.b + (c1.b - c0.b) * t);
        pixels[y * w + x] = ColorEngine.quantize24(ColorEngine.pack24(r, g, b), paletteMode);
      }
    }
  },

  drawGuideLine(ctx, stepX, stepY, pixelScale, x0, y0, x1, y1) {
    const half = pixelScale / 2;
    const sx = x0 * stepX + half;
    const sy = y0 * stepY + half;
    const ex = x1 * stepX + half;
    const ey = y1 * stepY + half;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }
};

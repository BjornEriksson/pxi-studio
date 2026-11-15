/**
 * PixelImage (.pxi) Studio - Main Canvas Controller
 * @file app.js
 * @author BjornEriksson (https://github.com)
 * @version 0.4.1-beta
 */
class PixelImageApp {

  // =========================================================================
  // SECTION 1: CONSTRUCTOR, HARDENED LIMITS & INITIAL STATE
  // =========================================================================
  constructor() {
    this.appWindow = document.querySelector('.app-window');
    this.canvas = document.getElementById('editor-canvas');
    this.viewport = document.querySelector('.canvas-viewport');
    this.ctx = this.canvas.getContext('2d');

    const LIMITS = (typeof StudioConfig !== 'undefined')
      ? StudioConfig.LIMITS
      : { MIN_WIN_W: 540, MAX_WIN_W: 1920, MIN_WIN_H: 400, MAX_WIN_H: 1200, MIN_GRID: 1, MAX_GRID: 512, MIN_SCALE: 1, MAX_SCALE: 16 };

    const boot = (typeof StudioConfig !== 'undefined')
      ? StudioConfig.getBootConfig()
      : {};

    const clamp = (val, min, max, fallback) => {
      const n = Number(val);
      return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
    };

    if (this.appWindow) {
      const initWinW = clamp(boot.windowWidth, LIMITS.MIN_WIN_W, LIMITS.MAX_WIN_W, 800);
      const initWinH = clamp(boot.windowHeight, LIMITS.MIN_WIN_H, LIMITS.MAX_WIN_H, 600);
      this.appWindow.style.width = `${initWinW}px`;
      this.appWindow.style.height = `${initWinH}px`;
    }

    const rawId = typeof boot.formatId === 'string' ? boot.formatId.replace(/[^a-zA-Z0-9_-]/g, '') : '';
    this.projectKey = rawId || 'pxi_studio_tmp';
    this.onServerSync = null;

    this.gridWidth = clamp(boot.gridWidth, LIMITS.MIN_GRID, LIMITS.MAX_GRID, 60);
    this.gridHeight = clamp(boot.gridHeight, LIMITS.MIN_GRID, LIMITS.MAX_GRID, 50);
    this.pixelScale = clamp(boot.pixelScale, LIMITS.MIN_SCALE, LIMITS.MAX_SCALE, 5);
    this.paletteMode = ColorEngine.MODE_9BIT;

    this.pixels = new Uint32Array(this.gridWidth * this.gridHeight).fill(ColorEngine.WHITE_24);
    this.activeColor24 = ColorEngine.BLACK_24;
    this.rasterStyle = clamp(boot.rasterStyle, 0, 3, 1);
    this.rasterThickness = clamp(boot.rasterThickness, 0, this.pixelScale, 1);
    this.rasterColor24 = ColorEngine.DEFAULT_RASTER_24;

    this.currentTool = 'pencil';
    this.brushSize = 3;
    this.isDrawing = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.lastPos = null;
    this.snapshot = null;
    this.undoStack = [];
    this.maxUndoSteps = 12;

    this.initPalette();
    setupUIHandlers(this);
    this.bindCanvasEvents();
    this.syncPresetDropdowns();
    this.syncSliderBounds();
    this.updateColorUI();
    this.updateRasterUI();
    this.updateThicknessOptions();
    this.updateUndoUI();
    this.checkAutosaveAvailability();
    this.resizeCanvas();
    this.render();
  }

  // =========================================================================
  // SECTION 2: UI SYNC, PALETTE MODE & SLIDER MANAGEMENT
  // =========================================================================
  initPalette() {
    const container = document.getElementById('quick-palette');
    container.innerHTML = '';
    ColorPalettes.QUICK_SWATCHES_24.forEach((raw24) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch-btn';
      btn.style.backgroundColor = ColorEngine.toCss(raw24);
      btn.onclick = () => this.setActiveColor24(raw24);
      container.appendChild(btn);
    });
  }

  setActiveColor24(raw24) {
    this.activeColor24 = ColorEngine.quantize24(raw24, this.paletteMode);
    this.updateColorUI();
  }

  setPaletteMode(newMode) {
    const mode = Number(newMode);
    if (!ColorEngine.MODES[mode] || mode === this.paletteMode) return;

    const oldMode = this.paletteMode;
    const before = new Uint32Array(this.pixels);
    this.paletteMode = mode;

    for (let i = 0; i < this.pixels.length; i++) {
      this.pixels[i] = ColorEngine.quantize24(this.pixels[i], mode);
    }
    this.activeColor24 = ColorEngine.quantize24(this.activeColor24, mode);
    this.rasterColor24 = ColorEngine.quantize24(this.rasterColor24, mode);

    if (typeof GradientTool !== 'undefined') {
      GradientTool.toggleUI(this.currentTool === 'gradient', this);
    }

    this.syncPresetDropdowns();
    this.syncSliderBounds();
    this.updateColorUI();
    this.updateRasterUI();
    this.render();

    if (this.hasPixelsChanged(before, this.pixels)) {
      this.commitChange(before, `Palette: ${ColorEngine.MODES[mode].name}`, oldMode);
    } else {
      this.triggerAutosave();
      document.getElementById('status-msg').textContent = `Palette: ${ColorEngine.MODES[mode].name}`;
    }
  }

  syncSliderBounds() {
    const meta = ColorEngine.MODES[this.paletteMode] || ColorEngine.MODES[ColorEngine.MODE_9BIT];
    document.getElementById('slider-r').max = meta.maxR;
    document.getElementById('slider-g').max = meta.maxG;
    document.getElementById('slider-b').max = meta.maxB;
  }

  syncPresetDropdowns() {
    const styleSel = document.getElementById('raster-style');
    if (styleSel) styleSel.value = String(this.rasterStyle);
    const palSel = document.getElementById('palette-mode-select');
    if (palSel) palSel.value = String(this.paletteMode);
  }

  updateColorUI() {
    const ch = ColorEngine.toChannelSliders(this.activeColor24, this.paletteMode);
    ['r', 'g', 'b'].forEach((c) => {
      document.getElementById(`slider-${c}`).value = ch[c];
      document.getElementById(`val-${c}`).textContent = ch[c];
    });
    document.getElementById('active-color-swatch').style.backgroundColor = ColorEngine.toCss(this.activeColor24);

    if (this.paletteMode === ColorEngine.MODE_8BIT) {
      const vgaIdx = ColorEngine.nearestVgaIndex(this.activeColor24);
      document.getElementById('color-rgb-text').textContent = `VGA #${vgaIdx} (${ch.r},${ch.g},${ch.b})`;
    } else {
      document.getElementById('color-rgb-text').textContent = `R:${ch.r} G:${ch.g} B:${ch.b}`;
    }
    document.getElementById('color-hex-text').textContent = ColorEngine.toHex(this.activeColor24);
  }

  updateRasterUI() {
    document.getElementById('raster-color-preview').style.backgroundColor = ColorEngine.toCss(this.rasterColor24);
  }

  updateUndoUI() {
    const count = this.undoStack.length;
    const undoBtn = document.getElementById('menu-undo');
    if (undoBtn) {
      undoBtn.disabled = (count === 0);
      undoBtn.textContent = count > 0 ? `Undo (${count})` : 'Undo';
    }
    const toolbarUndoBtn = document.getElementById('toolbar-undo-btn');
    if (toolbarUndoBtn) {
      toolbarUndoBtn.disabled = (count === 0);
      toolbarUndoBtn.title = count > 0 ? `Undo (${count} steps left)` : 'Undo Last Action';
    }
  }

  async checkAutosaveAvailability() {
    const restoreBtn = document.getElementById('menu-restore-tmp');
    if (!restoreBtn || typeof ProjectStorage === 'undefined') return;
    const saved = await ProjectStorage.loadTmp(this.projectKey);
    restoreBtn.disabled = !saved;
  }

  updateThicknessOptions() {
    const sel = document.getElementById('raster-thickness');
    const maxThick = Math.max(0, this.pixelScale);
    if (this.rasterThickness > maxThick) this.rasterThickness = maxThick;
    sel.innerHTML = '';
    for (let i = 0; i <= maxThick; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${i} px`;
      if (i === this.rasterThickness) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  // =========================================================================
  // SECTION 3: MULTI-STEP UNDO & AUTOSAVE HELPERS
  // =========================================================================
  hasPixelsChanged(before, after) {
    if (!before || !after || before.length !== after.length) return true;
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) return true;
    }
    return false;
  }

  commitChange(previousPixels, statusText = null, previousPaletteMode = this.paletteMode) {
    this.undoStack.push({
      pixels: new Uint32Array(previousPixels),
      paletteMode: previousPaletteMode
    });
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    this.updateUndoUI();
    this.triggerAutosave();
    if (statusText) {
      document.getElementById('status-msg').textContent = statusText;
    }
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const prev = this.undoStack.pop();
    if (prev.pixels.length !== this.pixels.length) return;

    this.pixels.set(prev.pixels);
    if (this.paletteMode !== prev.paletteMode) {
      this.paletteMode = prev.paletteMode;
      this.activeColor24 = ColorEngine.quantize24(this.activeColor24, this.paletteMode);
      this.rasterColor24 = ColorEngine.quantize24(this.rasterColor24, this.paletteMode);
      this.syncPresetDropdowns();
      this.syncSliderBounds();
      this.updateColorUI();
      this.updateRasterUI();
    }

    this.render();
    this.updateUndoUI();
    this.triggerAutosave();
    document.getElementById('status-msg').textContent = `Undo (${this.undoStack.length} left)`;
  }

  async triggerAutosave() {
    if (typeof ProjectStorage === 'undefined') return;
    const buf = PxiCodec.encode({
      ...this,
      signature: document.getElementById('creator-signature').value
    });
    await ProjectStorage.saveTmp(this.projectKey, buf, this.onServerSync);
    const restoreBtn = document.getElementById('menu-restore-tmp');
    if (restoreBtn) restoreBtn.disabled = false;
  }

  async restoreAutosave() {
    if (typeof ProjectStorage === 'undefined') return;
    const buf = await ProjectStorage.loadTmp(this.projectKey);
    if (!buf) {
      document.getElementById('status-msg').textContent = 'No autosave found';
      return;
    }
    const previousPixels = new Uint32Array(this.pixels);
    const prevMode = this.paletteMode;
    const prevW = this.gridWidth;
    const prevH = this.gridHeight;

    this.applyDecodedData(PxiCodec.decode(buf));
    if (prevW === this.gridWidth && prevH === this.gridHeight) {
      this.commitChange(previousPixels, 'Autosave restored', prevMode);
    } else {
      this.undoStack = [];
      this.updateUndoUI();
      document.getElementById('status-msg').textContent = 'Autosave restored';
    }
  }

  // =========================================================================
  // SECTION 4: DOCUMENT & CANVAS MANAGEMENT
  // =========================================================================
  resetDoc(w, h, s) {
    this.gridWidth = w;
    this.gridHeight = h;
    this.pixelScale = s;
    this.pixels = new Uint32Array(w * h).fill(ColorEngine.WHITE_24);
    this.undoStack = [];
    this.updateUndoUI();
    this.updateThicknessOptions();
    this.resizeCanvas();
    this.render();
  }

  getStepMetrics() {
    const t = (this.rasterStyle !== 0) ? this.rasterThickness : 0;
    const gapX = (this.rasterStyle === 1 || this.rasterStyle === 3) ? t : 0;
    const gapY = (this.rasterStyle === 1 || this.rasterStyle === 2) ? t : 0;
    return { stepX: this.pixelScale + gapX, stepY: this.pixelScale + gapY, gapX, gapY };
  }

  resizeCanvas() {
    const { stepX, stepY, gapX, gapY } = this.getStepMetrics();
    this.canvas.width = Math.max(1, this.gridWidth * stepX - gapX);
    this.canvas.height = Math.max(1, this.gridHeight * stepY - gapY);
    document.getElementById('status-dims').textContent = `Grid: ${this.gridWidth}×${this.gridHeight} (${this.canvas.width}×${this.canvas.height}px)`;
  }

  // =========================================================================
  // SECTION 5: CANVAS RENDERING ENGINE
  // =========================================================================
  render() {
    this.resizeCanvas();
    const s = this.pixelScale, w = this.gridWidth, h = this.gridHeight;
    const { stepX, stepY } = this.getStepMetrics();

    this.ctx.imageSmoothingEnabled = false;

    if (this.rasterStyle !== 0 && this.rasterThickness > 0) {
      this.ctx.fillStyle = ColorEngine.toCss(this.rasterColor24);
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        this.ctx.fillStyle = ColorEngine.toCss(this.pixels[y * w + x]);
        this.ctx.fillRect(x * stepX, y * stepY, s, s);
      }
    }

    if (this.isDrawing && this.currentTool === 'gradient' && this.dragStart && this.dragCurrent && typeof GradientTool !== 'undefined') {
      GradientTool.drawGuideLine(this.ctx, stepX, stepY, s, this.dragStart.x, this.dragStart.y, this.dragCurrent.x, this.dragCurrent.y);
    }
  }

  // =========================================================================
  // SECTION 6: POINTER & DRAWING INTERACTION
  // =========================================================================
  bindCanvasEvents() {
    this.viewport.onmousedown = (e) => this.onDown(e);
    window.onmousemove = (e) => this.onMove(e);
    window.onmouseup = () => this.onUp();
  }

  getPos(e) {
    const r = this.canvas.getBoundingClientRect();
    const { stepX, stepY } = this.getStepMetrics();
    const x = Math.floor((e.clientX - r.left) / stepX);
    const y = Math.floor((e.clientY - r.top) / stepY);
    const inBounds = (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight);
    return { x, y, inBounds };
  }

  onDown(e) {
    if (e.button !== 0) return;
    if (e.target === this.viewport && (e.offsetX > this.viewport.clientWidth || e.offsetY > this.viewport.clientHeight)) {
      return;
    }

    const pos = this.getPos(e);
    const col = this.activeColor24;

    if (this.currentTool === 'picker') {
      if (!pos.inBounds) return;
      this.setActiveColor24(this.pixels[pos.y * this.gridWidth + pos.x]);
      return;
    }

    if (this.currentTool === 'fill') {
      if (!pos.inBounds) return;
      const before = new Uint32Array(this.pixels);
      DrawingTools.floodFill(this.pixels, this.gridWidth, this.gridHeight, pos.x, pos.y, col);
      if (this.hasPixelsChanged(before, this.pixels)) {
        this.render();
        this.commitChange(before);
      }
      return;
    }

    this.isDrawing = true;
    this.dragStart = pos;
    this.dragCurrent = pos;
    this.lastPos = pos;
    this.snapshot = new Uint32Array(this.pixels);

    if (this.currentTool === 'pencil') {
      DrawingTools.stampBrush(this.pixels, this.gridWidth, this.gridHeight, pos.x, pos.y, 1, col);
      this.render();
    } else if (this.currentTool === 'brush') {
      DrawingTools.stampBrush(this.pixels, this.gridWidth, this.gridHeight, pos.x, pos.y, this.brushSize, col);
      this.render();
    } else if (this.currentTool === 'eraser') {
      DrawingTools.stampBrush(this.pixels, this.gridWidth, this.gridHeight, pos.x, pos.y, 1, ColorEngine.WHITE_24);
      this.render();
    } else if (this.currentTool === 'gradient' && typeof GradientTool !== 'undefined') {
      GradientTool.apply(this.pixels, this.gridWidth, this.gridHeight, pos.x, pos.y, pos.x, pos.y, GradientTool.startColor24, col, this.paletteMode);
      this.render();
    }
  }

  onMove(e) {
    const pos = this.getPos(e);
    document.getElementById('status-coords').textContent = pos.inBounds ? `Pos: ${pos.x}, ${pos.y}` : 'Pos: --, --';

    if (!this.isDrawing) return;
    this.dragCurrent = pos;
    const col = this.activeColor24;

    if (this.currentTool === 'pencil') {
      DrawingTools.drawBrushLine(this.pixels, this.gridWidth, this.gridHeight, this.lastPos.x, this.lastPos.y, pos.x, pos.y, 1, col);
      this.lastPos = pos;
      this.render();
    } else if (this.currentTool === 'brush') {
      DrawingTools.drawBrushLine(this.pixels, this.gridWidth, this.gridHeight, this.lastPos.x, this.lastPos.y, pos.x, pos.y, this.brushSize, col);
      this.lastPos = pos;
      this.render();
    } else if (this.currentTool === 'eraser') {
      DrawingTools.drawBrushLine(this.pixels, this.gridWidth, this.gridHeight, this.lastPos.x, this.lastPos.y, pos.x, pos.y, 1, ColorEngine.WHITE_24);
      this.lastPos = pos;
      this.render();
    } else if (this.snapshot) {
      this.pixels.set(this.snapshot);
      if (this.currentTool === 'line') {
        DrawingTools.drawLine(this.pixels, this.gridWidth, this.gridHeight, this.dragStart.x, this.dragStart.y, pos.x, pos.y, col);
      } else if (this.currentTool === 'rect') {
        DrawingTools.drawRect(this.pixels, this.gridWidth, this.gridHeight, this.dragStart.x, this.dragStart.y, pos.x, pos.y, col, false);
      } else if (this.currentTool === 'rect-filled') {
        DrawingTools.drawRect(this.pixels, this.gridWidth, this.gridHeight, this.dragStart.x, this.dragStart.y, pos.x, pos.y, col, true);
      } else if (this.currentTool === 'circle') {
        DrawingTools.drawCircle(this.pixels, this.gridWidth, this.gridHeight, this.dragStart.x, this.dragStart.y, pos.x, pos.y, col, false);
      } else if (this.currentTool === 'circle-filled') {
        DrawingTools.drawCircle(this.pixels, this.gridWidth, this.gridHeight, this.dragStart.x, this.dragStart.y, pos.x, pos.y, col, true);
      } else if (this.currentTool === 'ellipse') {
        DrawingTools.drawEllipse(this.pixels, this.gridWidth, this.gridHeight, this.dragStart.x, this.dragStart.y, pos.x, pos.y, col, false);
      } else if (this.currentTool === 'ellipse-filled') {
        DrawingTools.drawEllipse(this.pixels, this.gridWidth, this.gridHeight, this.dragStart.x, this.dragStart.y, pos.x, pos.y, col, true);
      } else if (this.currentTool === 'gradient' && typeof GradientTool !== 'undefined') {
        GradientTool.apply(this.pixels, this.gridWidth, this.gridHeight, this.dragStart.x, this.dragStart.y, pos.x, pos.y, GradientTool.startColor24, col, this.paletteMode);
      }
      this.render();
    }
  }

  onUp() {
    if (!this.isDrawing) return;
    const wasGradient = (this.currentTool === 'gradient');
    this.isDrawing = false;

    if (this.snapshot && this.hasPixelsChanged(this.snapshot, this.pixels)) {
      this.commitChange(this.snapshot);
    }

    this.dragStart = null;
    this.dragCurrent = null;
    this.lastPos = null;
    this.snapshot = null;

    if (wasGradient) {
      this.render();
    }
  }

  // =========================================================================
  // SECTION 7: FILE I/O (.pxi Export & Import)
  // =========================================================================
  applyDecodedData(data) {
    Object.assign(this, data);
    document.getElementById('creator-signature').value = data.signature;
    this.syncPresetDropdowns();
    this.syncSliderBounds();
    this.activeColor24 = ColorEngine.quantize24(this.activeColor24, this.paletteMode);
    this.updateColorUI();
    this.updateThicknessOptions();
    document.getElementById('raster-thickness').value = String(data.rasterThickness);
    this.updateRasterUI();
    this.resizeCanvas();
    this.render();
  }

  saveFile() {
    const buf = PxiCodec.encode({
      ...this,
      signature: document.getElementById('creator-signature').value
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/octet-stream' }));
    a.download = `artwork_${this.gridWidth}x${this.gridHeight}.pxi`;
    a.click();
    document.getElementById('status-msg').textContent = `Saved (${buf.byteLength} B)`;
  }

  async loadFile(file) {
    try {
      const data = PxiCodec.decode(await file.arrayBuffer());
      this.applyDecodedData(data);
      this.undoStack = [];
      this.updateUndoUI();
      document.getElementById('status-msg').textContent = `Loaded ${file.name}`;
    } catch {
      document.getElementById('status-msg').textContent = 'Invalid .pxi file';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new PixelImageApp();
});

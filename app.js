/**
 * PixelImage (.pxi) Studio - Main Canvas Controller
 * @file app.js
 * @author BjornEriksson (https://github.com)
 * @version 0.2.0-beta
 */

/**
 * PixelImage (.pxi) Studio - Main Canvas Controller
 * Structured in numbered sections for modular updates and GitHub clarity.
 */
class PixelImageApp {
  // =========================================================================
  // SECTION 1: CONSTRUCTOR & INITIAL STATE
  // =========================================================================
  constructor() {
    this.canvas = document.getElementById('editor-canvas');
    this.viewport = document.querySelector('.canvas-viewport');
    this.ctx = this.canvas.getContext('2d');

    this.projectKey = 'pxi_studio_tmp';
    this.onServerSync = null; // Reserved callback for future Banner Network sync

    this.gridWidth = 60;
    this.gridHeight = 50;
    this.pixelScale = 5;
    this.pixels = new Uint16Array(this.gridWidth * this.gridHeight).fill(Color9Bit.WHITE);

    this.activeColor = { r: 0, g: 0, b: 0 };
    this.rasterStyle = 1;
    this.rasterThickness = 1;
    this.rasterColor9Bit = Color9Bit.DEFAULT_RASTER;

    this.currentTool = 'pencil';
    this.isDrawing = false;
    this.dragStart = null;
    this.snapshot = null;
    this.undoBuffer = null;

    this.initPalette();
    setupUIHandlers(this);
    this.bindCanvasEvents();
    this.updateColorUI();
    this.updateRasterUI();
    this.updateThicknessOptions();
    this.updateUndoUI();
    this.checkAutosaveAvailability();
    this.resizeCanvas();
    this.render();
  }

  // =========================================================================
  // SECTION 2: UI SYNC & PALETTE INITIALIZATION
  // =========================================================================
  initPalette() {
    const container = document.getElementById('quick-palette');
    container.innerHTML = '';
    Color9Bit.getPresets().forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch-btn';
      btn.style.backgroundColor = Color9Bit.toCss(Color9Bit.pack(c.r, c.g, c.b));
      btn.onclick = () => {
        this.activeColor = { ...c };
        ['r', 'g', 'b'].forEach((ch) => document.getElementById(`slider-${ch}`).value = c[ch]);
        this.updateColorUI();
      };
      container.appendChild(btn);
    });
  }

  updateColorUI() {
    const packed = Color9Bit.pack(this.activeColor.r, this.activeColor.g, this.activeColor.b);
    ['r', 'g', 'b'].forEach((ch) => document.getElementById(`val-${ch}`).textContent = this.activeColor[ch]);
    document.getElementById('active-color-swatch').style.backgroundColor = Color9Bit.toCss(packed);
    document.getElementById('color-rgb-text').textContent = `R:${this.activeColor.r} G:${this.activeColor.g} B:${this.activeColor.b}`;
    document.getElementById('color-hex-text').textContent = Color9Bit.toHex(packed);
  }

  updateRasterUI() {
    document.getElementById('raster-color-preview').style.backgroundColor = Color9Bit.toCss(this.rasterColor9Bit);
  }

  updateUndoUI() {
    const undoBtn = document.getElementById('menu-undo');
    if (undoBtn) {
      undoBtn.disabled = !this.undoBuffer;
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
    if (this.rasterThickness > maxThick) {
      this.rasterThickness = maxThick;
    }
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
  // SECTION 3: UNDO & AUTOSAVE HELPERS
  // =========================================================================
  hasPixelsChanged(before, after) {
    if (!before || !after || before.length !== after.length) return true;
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) return true;
    }
    return false;
  }

  commitChange(previousPixels, statusText = null) {
    this.undoBuffer = new Uint16Array(previousPixels);
    this.updateUndoUI();
    this.triggerAutosave();
    if (statusText) {
      document.getElementById('status-msg').textContent = statusText;
    }
  }

  undo() {
    if (!this.undoBuffer || this.undoBuffer.length !== this.pixels.length) return;
    const currentSnapshot = new Uint16Array(this.pixels);
    this.pixels.set(this.undoBuffer);
    this.undoBuffer = currentSnapshot; // Pressing Undo again acts as Redo
    this.render();
    this.updateUndoUI();
    this.triggerAutosave();
    document.getElementById('status-msg').textContent = 'Undo applied';
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
    const previousPixels = new Uint16Array(this.pixels);
    const prevW = this.gridWidth;
    const prevH = this.gridHeight;

    this.applyDecodedData(PxiCodec.decode(buf));
    if (prevW === this.gridWidth && prevH === this.gridHeight) {
      this.undoBuffer = previousPixels;
    } else {
      this.undoBuffer = null;
    }
    this.updateUndoUI();
    document.getElementById('status-msg').textContent = 'Autosave restored';
  }

  // =========================================================================
  // SECTION 4: DOCUMENT & CANVAS MANAGEMENT
  // =========================================================================
  resetDoc(w, h, s) {
    this.gridWidth = w;
    this.gridHeight = h;
    this.pixelScale = s;
    this.pixels = new Uint16Array(w * h).fill(Color9Bit.WHITE);
    this.undoBuffer = null;
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
    document.getElementById('status-dims').textContent = `Grid: ${this.gridWidth}x${this.gridHeight} (${this.canvas.width}x${this.canvas.height}px)`;
  }

  // =========================================================================
  // SECTION 5: CANVAS RENDERING ENGINE (Pixels + Adjacent Raster Gaps)
  // =========================================================================
  render() {
    this.resizeCanvas();
    const s = this.pixelScale, w = this.gridWidth, h = this.gridHeight;
    const { stepX, stepY } = this.getStepMetrics();

    this.ctx.imageSmoothingEnabled = false;

    if (this.rasterStyle !== 0 && this.rasterThickness > 0) {
      this.ctx.fillStyle = Color9Bit.toCss(this.rasterColor9Bit);
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        this.ctx.fillStyle = Color9Bit.toCss(this.pixels[y * w + x]);
        this.ctx.fillRect(x * stepX, y * stepY, s, s);
      }
    }
  }

  // =========================================================================
  // SECTION 6: POINTER & DRAWING INTERACTION (Supports Viewport Margin)
  // =========================================================================
  bindCanvasEvents() {
    // Listen on the entire viewport margin so strokes can start outside the canvas edge
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
    // Ignore clicks on scrollbars if viewport overflows
    if (e.target === this.viewport && (e.offsetX > this.viewport.clientWidth || e.offsetY > this.viewport.clientHeight)) {
      return;
    }

    const pos = this.getPos(e);
    const col = Color9Bit.pack(this.activeColor.r, this.activeColor.g, this.activeColor.b);

    if (this.currentTool === 'picker') {
      if (!pos.inBounds) return;
      const rgb = Color9Bit.unpack(this.pixels[pos.y * this.gridWidth + pos.x]);
      this.activeColor = rgb;
      ['r', 'g', 'b'].forEach((ch) => document.getElementById(`slider-${ch}`).value = rgb[ch]);
      this.updateColorUI();
      return;
    }

    if (this.currentTool === 'fill') {
      if (!pos.inBounds) return;
      const before = new Uint16Array(this.pixels);
      DrawingTools.floodFill(this.pixels, this.gridWidth, this.gridHeight, pos.x, pos.y, col);
      if (this.hasPixelsChanged(before, this.pixels)) {
        this.render();
        this.commitChange(before);
      }
      return;
    }

    // Start stroke for pencil, eraser, line, or rect (even from outer margin)
    this.isDrawing = true;
    this.dragStart = pos;
    this.snapshot = new Uint16Array(this.pixels);

    if (this.currentTool === 'pencil') {
      DrawingTools.setPixel(this.pixels, this.gridWidth, this.gridHeight, pos.x, pos.y, col);
      this.render();
    } else if (this.currentTool === 'eraser') {
      DrawingTools.setPixel(this.pixels, this.gridWidth, this.gridHeight, pos.x, pos.y, Color9Bit.WHITE);
      this.render();
    }
  }

  onMove(e) {
    const pos = this.getPos(e);
    if (pos.inBounds) {
      document.getElementById('status-coords').textContent = `Pos: ${pos.x}, ${pos.y}`;
    } else {
      document.getElementById('status-coords').textContent = 'Pos: --, --';
    }

    if (!this.isDrawing) return;
    const col = Color9Bit.pack(this.activeColor.r, this.activeColor.g, this.activeColor.b);

    if (this.currentTool === 'pencil') {
      DrawingTools.setPixel(this.pixels, this.gridWidth, this.gridHeight, pos.x, pos.y, col);
      this.render();
    } else if (this.currentTool === 'eraser') {
      DrawingTools.setPixel(this.pixels, this.gridWidth, this.gridHeight, pos.x, pos.y, Color9Bit.WHITE);
      this.render();
    } else if (this.currentTool === 'line' && this.snapshot) {
      this.pixels.set(this.snapshot);
      DrawingTools.drawLine(this.pixels, this.gridWidth, this.gridHeight, this.dragStart.x, this.dragStart.y, pos.x, pos.y, col);
      this.render();
    } else if (this.currentTool === 'rect' && this.snapshot) {
      this.pixels.set(this.snapshot);
      DrawingTools.drawRect(this.pixels, this.gridWidth, this.gridHeight, this.dragStart.x, this.dragStart.y, pos.x, pos.y, col);
      this.render();
    }
  }

  onUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    // Only record Undo and trigger tmp autosave if at least one pixel changed
    if (this.snapshot && this.hasPixelsChanged(this.snapshot, this.pixels)) {
      this.commitChange(this.snapshot);
    }

    this.dragStart = null;
    this.snapshot = null;
  }

  // =========================================================================
  // SECTION 7: FILE I/O (.pxi Export & Import)
  // =========================================================================
  applyDecodedData(data) {
    Object.assign(this, data);
    document.getElementById('creator-signature').value = data.signature;
    document.getElementById('raster-style').value = String(data.rasterStyle);
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
      this.undoBuffer = null;
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


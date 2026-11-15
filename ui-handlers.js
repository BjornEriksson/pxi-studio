/**
 * PixelImage (.pxi) Studio - UI Event Handlers
 * @file ui-handlers.js
 * @author BjornEriksson (https://github.com)
 * @version 0.4.1-beta
 */
function setupUIHandlers(app) {
  // Build contextual options inside #extra-tools-slot (Brush Size + Gradient Start)
  const extraSlot = document.getElementById('extra-tools-slot');
  if (extraSlot) {
    extraSlot.innerHTML = `
      <div id="brush-options" style="display:none; margin-top:8px; padding-top:6px; border-top:1px solid #808080; text-align:center;">
        <div class="panel-label" style="font-size:9px; margin-bottom:4px;">Brush Size</div>
        <select id="brush-size-select" style="width:100%; padding:2px;">
          <option value="2">2×2 px</option>
          <option value="3" selected>3×3 px</option>
          <option value="5">5×5 px</option>
        </select>
      </div>
      <div id="gradient-options" style="display:none; margin-top:8px; padding-top:6px; border-top:1px solid #808080; text-align:center;">
        <div class="panel-label" style="font-size:9px; margin-bottom:4px;">Grad Start</div>
        <input type="color" id="grad-start-picker" value="#FFFFFF" title="Gradient Start Color (End = Active Color)" style="width:100%; height:24px; cursor:pointer; border:1px solid #404040;">
      </div>
    `;

    const brushSel = document.getElementById('brush-size-select');
    if (brushSel) {
      brushSel.onchange = (e) => {
        app.brushSize = Number(e.target.value) || 3;
      };
    }

    const gradPicker = document.getElementById('grad-start-picker');
    if (gradPicker && typeof GradientTool !== 'undefined') {
      gradPicker.oninput = () => {
        const raw24 = parseInt(gradPicker.value.slice(1), 16);
        GradientTool.startColor24 = ColorEngine.quantize24(raw24, app.paletteMode);
        gradPicker.value = ColorEngine.toHex(GradientTool.startColor24);
      };
    }
  }

  // Tool buttons (skip toolbar-undo-btn which is an action button, not a drawing tool)
  document.querySelectorAll('.tool-btn[data-tool]').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('.tool-btn[data-tool]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      app.currentTool = btn.dataset.tool;
      document.getElementById('status-tool').textContent = `Tool: ${app.currentTool}`;

      const brushBox = document.getElementById('brush-options');
      if (brushBox) brushBox.style.display = (app.currentTool === 'brush') ? 'block' : 'none';

      if (typeof GradientTool !== 'undefined') {
        GradientTool.toggleUI(app.currentTool === 'gradient', app);
      }
    };
  });

  // Palette Mode Selector (8-bit VGA to 24-bit True Color, 9-bit default)
  const palModeSel = document.getElementById('palette-mode-select');
  if (palModeSel) {
    palModeSel.onchange = (e) => app.setPaletteMode(Number(e.target.value));
  }

  // RGB Sliders
  ['r', 'g', 'b'].forEach((ch) => {
    document.getElementById(`slider-${ch}`).oninput = () => {
      const r = Number(document.getElementById('slider-r').value);
      const g = Number(document.getElementById('slider-g').value);
      const b = Number(document.getElementById('slider-b').value);
      app.activeColor24 = ColorEngine.fromChannelSliders(r, g, b, app.paletteMode);
      app.updateColorUI();
    };
  });

  // Raster Controls
  document.getElementById('raster-style').onchange = (e) => {
    app.rasterStyle = Number(e.target.value);
    app.render();
    app.triggerAutosave();
  };

  document.getElementById('raster-thickness').onchange = (e) => {
    app.rasterThickness = Number(e.target.value);
    app.render();
    app.triggerAutosave();
  };

  document.getElementById('set-raster-color-btn').onclick = () => {
    app.rasterColor24 = app.activeColor24;
    app.updateRasterUI();
    app.render();
    app.triggerAutosave();
  };

  // Creator signature input
  document.getElementById('creator-signature').onchange = () => {
    app.triggerAutosave();
  };

  // Edit Menu & Toolbar Quick Undo
  const undoBtn = document.getElementById('menu-undo');
  if (undoBtn) undoBtn.onclick = () => app.undo();

  const toolbarUndoBtn = document.getElementById('toolbar-undo-btn');
  if (toolbarUndoBtn) toolbarUndoBtn.onclick = () => app.undo();

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      e.preventDefault();
      app.undo();
    }
  });

  const flipHBtn = document.getElementById('menu-flip-h');
  if (flipHBtn) {
    flipHBtn.onclick = () => {
      const before = new Uint32Array(app.pixels);
      DrawingTools.flipHorizontal(app.pixels, app.gridWidth, app.gridHeight);
      if (app.hasPixelsChanged(before, app.pixels)) {
        app.render();
        app.commitChange(before, 'Flipped horizontally');
      }
    };
  }

  const flipVBtn = document.getElementById('menu-flip-v');
  if (flipVBtn) {
    flipVBtn.onclick = () => {
      const before = new Uint32Array(app.pixels);
      DrawingTools.flipVertical(app.pixels, app.gridWidth, app.gridHeight);
      if (app.hasPixelsChanged(before, app.pixels)) {
        app.render();
        app.commitChange(before, 'Flipped vertically');
      }
    };
  }

  document.getElementById('menu-clear-white').onclick = () => {
    const before = new Uint32Array(app.pixels);
    app.pixels.fill(ColorEngine.WHITE_24);
    if (app.hasPixelsChanged(before, app.pixels)) {
      app.render();
      app.commitChange(before, 'Cleared to white');
    }
  };

  document.getElementById('menu-fill-current').onclick = () => {
    const before = new Uint32Array(app.pixels);
    app.pixels.fill(app.activeColor24);
    if (app.hasPixelsChanged(before, app.pixels)) {
      app.render();
      app.commitChange(before, 'Filled with active color');
    }
  };

  // Presets Menu
  document.querySelectorAll('#preset-menu-list button[data-preset-key]').forEach((btn) => {
    btn.onclick = () => {
      const preset = StudioConfig.PRESETS[btn.dataset.presetKey];
      if (!preset) return;
      app.rasterStyle = preset.rasterStyle;
      app.rasterThickness = preset.rasterThickness;
      app.syncPresetDropdowns();
      app.resetDoc(preset.gridWidth, preset.gridHeight, preset.pixelScale);
      document.getElementById('status-msg').textContent = `Preset: ${preset.label}`;
    };
  });

  // New Image Modal with live "Image size: W × H px"
  const modal = document.getElementById('new-image-modal');
  const newW = document.getElementById('new-width');
  const newH = document.getElementById('new-height');
  const newS = document.getElementById('new-scale');
  const newR = document.getElementById('new-raster');
  const visibleLabel = document.getElementById('new-visible-size');

  const updateVisiblePreview = () => {
    const w = Math.max(1, Math.min(512, Number(newW.value) || 1));
    const h = Math.max(1, Math.min(512, Number(newH.value) || 1));
    const s = Math.max(1, Math.min(16, Number(newS.value) || 1));
    const r = Math.max(0, Math.min(s, Number(newR.value) || 0));
    const visW = (w * s) + ((w - 1) * r);
    const visH = (h * s) + ((h - 1) * r);
    visibleLabel.textContent = `Image size: ${visW} × ${visH} px`;
  };

  [newW, newH, newS, newR].forEach((inp) => {
    if (inp) inp.oninput = updateVisiblePreview;
  });

  document.getElementById('menu-new').onclick = () => {
    newW.value = app.gridWidth;
    newH.value = app.gridHeight;
    newS.value = app.pixelScale;
    newR.value = app.rasterStyle === 0 ? 0 : app.rasterThickness;
    updateVisiblePreview();
    modal.classList.remove('hidden');
  };

  document.getElementById('modal-cancel-btn').onclick = () => modal.classList.add('hidden');
  document.getElementById('modal-create-btn').onclick = () => {
    const w = Math.max(1, Math.min(512, Number(newW.value) || 60));
    const h = Math.max(1, Math.min(512, Number(newH.value) || 50));
    const s = Math.max(1, Math.min(16, Number(newS.value) || 5));
    const r = Math.max(0, Math.min(s, Number(newR.value) || 0));

    app.rasterThickness = r;
    if (r === 0) {
      app.rasterStyle = 0;
    } else if (app.rasterStyle === 0) {
      app.rasterStyle = 1;
    }
    app.syncPresetDropdowns();
    app.resetDoc(w, h, s);
    modal.classList.add('hidden');
  };

  // File Save, Open & Restore Autosave
  document.getElementById('menu-save-pxi').onclick = () => app.saveFile();
  const restoreBtn = document.getElementById('menu-restore-tmp');
  if (restoreBtn) restoreBtn.onclick = () => app.restoreAutosave();

  const fileInput = document.getElementById('file-input-pxi');
  document.getElementById('menu-open').onclick = () => fileInput.click();
  fileInput.onchange = (e) => {
    if (e.target.files.length > 0) app.loadFile(e.target.files.item(0));
    e.target.value = '';
  };

  // Adaptive Palette Modal
  const palModal = document.getElementById('palette-modal');
  document.getElementById('active-color-swatch').onclick = () => PaletteModal.open(app);
  document.getElementById('palette-close-btn').onclick = () => palModal.classList.add('hidden');
  palModal.onclick = (e) => { if (e.target === palModal) palModal.classList.add('hidden'); };
}

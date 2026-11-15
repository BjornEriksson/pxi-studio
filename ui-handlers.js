/**
 * PixelImage (.pxi) Studio - Main Canvas Controller
 * @file app.js
 * @author BjornEriksson (https://github.com)
 * @version 0.2.0-beta
 */

/**
 * PixelImage (.pxi) Studio - UI Event Handlers
 */
function setupUIHandlers(app) {
  // Tool buttons
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      app.currentTool = btn.dataset.tool;
      document.getElementById('status-tool').textContent = `Tool: ${app.currentTool}`;
    };
  });

  // RGB Sliders
  ['r', 'g', 'b'].forEach((ch) => {
    document.getElementById(`slider-${ch}`).oninput = () => {
      app.activeColor[ch] = Number(document.getElementById(`slider-${ch}`).value);
      app.updateColorUI();
    };
  });

  // Raster Controls (updates header metadata -> triggers tmp autosave)
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
    app.rasterColor9Bit = Color9Bit.pack(app.activeColor.r, app.activeColor.g, app.activeColor.b);
    app.updateRasterUI();
    app.render();
    app.triggerAutosave();
  };

  // Creator signature input -> triggers tmp autosave
  document.getElementById('creator-signature').onchange = () => {
    app.triggerAutosave();
  };

  // Edit Menu & Undo
  const undoBtn = document.getElementById('menu-undo');
  if (undoBtn) {
    undoBtn.onclick = () => app.undo();
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      // Do not hijack Ctrl+Z while typing inside text/number inputs
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      e.preventDefault();
      app.undo();
    }
  });

  document.getElementById('menu-clear-white').onclick = () => {
    const before = new Uint16Array(app.pixels);
    app.pixels.fill(Color9Bit.WHITE);
    if (app.hasPixelsChanged(before, app.pixels)) {
      app.render();
      app.commitChange(before, 'Cleared to white');
    }
  };

  document.getElementById('menu-fill-current').onclick = () => {
    const before = new Uint16Array(app.pixels);
    app.pixels.fill(Color9Bit.pack(app.activeColor.r, app.activeColor.g, app.activeColor.b));
    if (app.hasPixelsChanged(before, app.pixels)) {
      app.render();
      app.commitChange(before, 'Filled with active color');
    }
  };

  // Presets
  document.getElementById('preset-300x250').onclick = () => app.resetDoc(60, 50, 5);
  document.getElementById('preset-banner').onclick = () => app.resetDoc(96, 12, 5);
  document.getElementById('preset-raw300').onclick = () => app.resetDoc(300, 250, 1);

  // New Image Modal
  const modal = document.getElementById('new-image-modal');
  document.getElementById('menu-new').onclick = () => modal.classList.remove('hidden');
  document.getElementById('modal-cancel-btn').onclick = () => modal.classList.add('hidden');
  document.getElementById('modal-create-btn').onclick = () => {
    const w = Math.max(4, Math.min(512, Number(document.getElementById('new-width').value) || 60));
    const h = Math.max(4, Math.min(512, Number(document.getElementById('new-height').value) || 50));
    const s = Math.max(1, Math.min(16, Number(document.getElementById('new-scale').value) || 5));
    app.resetDoc(w, h, s);
    modal.classList.add('hidden');
  };

  // File Save, Open & Restore Autosave
  document.getElementById('menu-save-pxi').onclick = () => app.saveFile();
  const restoreBtn = document.getElementById('menu-restore-tmp');
  if (restoreBtn) {
    restoreBtn.onclick = () => app.restoreAutosave();
  }

  const fileInput = document.getElementById('file-input-pxi');
  document.getElementById('menu-open').onclick = () => fileInput.click();
  fileInput.onchange = (e) => {
    if (e.target.files.length > 0) app.loadFile(e.target.files.item(0));
    e.target.value = '';
  };

  // Full 512-Color Matrix Popup (Click active color swatch)
  const palModal = document.getElementById('palette-modal');
  const palGrid = document.getElementById('full-512-grid');
  const palInfo = document.getElementById('palette-hover-info');

  document.getElementById('active-color-swatch').title = 'Click to open all 512 colors';
  document.getElementById('active-color-swatch').onclick = () => {
    if (palGrid.children.length === 0) {
      // Arrange in 16 rows x 32 columns grouped smoothly by hue/blocks
      for (let g = 0; g < 8; g++) {
        for (let b = 0; b < 8; b++) {
          for (let r = 0; r < 8; r++) {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'matrix-cell';
            cell.style.backgroundColor = Color9Bit.toCss(Color9Bit.pack(r, g, b));
            cell.onmouseenter = () => { palInfo.textContent = `Code: ${r}${g}${b} (R:${r} G:${g} B:${b})`; };
            cell.onclick = () => {
              app.activeColor = { r, g, b };
              ['r', 'g', 'b'].forEach((ch) => document.getElementById(`slider-${ch}`).value = app.activeColor[ch]);
              app.updateColorUI();
              palModal.classList.add('hidden');
            };
            palGrid.appendChild(cell);
          }
        }
      }
    }
    palModal.classList.remove('hidden');
  };

  document.getElementById('palette-close-btn').onclick = () => palModal.classList.add('hidden');
  palModal.onclick = (e) => { if (e.target === palModal) palModal.classList.add('hidden'); };
}

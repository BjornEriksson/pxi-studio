/**
 * PixelImage (.pxi) Studio - Adaptive Palette Matrix & Direct Color Picker
 * @file palette-modal.js
 * @author BjornEriksson (https://github.com)
 * @version 0.3.1-beta
 */
const PaletteModal = {
  nativePicker: null,

  openNativePicker(app) {
    if (!this.nativePicker) {
      const inp = document.createElement('input');
      inp.type = 'color';
      inp.style.position = 'fixed';
      inp.style.width = '1px';
      inp.style.height = '1px';
      inp.style.opacity = '0';
      inp.style.pointerEvents = 'none';
      document.body.appendChild(inp);
      this.nativePicker = inp;
    }

    // Position to the left of the right sidebar (over the canvas viewport)
    // so the browser's color popup never gets pushed off-screen or covers the sliders
    const sidebar = document.getElementById('right-sidebar');
    if (sidebar) {
      const rect = sidebar.getBoundingClientRect();
      const targetX = Math.max(20, rect.left - 260);
      const targetY = Math.max(40, Math.min(window.innerHeight - 320, rect.top + 40));
      this.nativePicker.style.left = `${targetX}px`;
      this.nativePicker.style.top = `${targetY}px`;
    }

    this.nativePicker.value = ColorEngine.toHex(app.activeColor24);
    this.nativePicker.oninput = () => {
      const raw24 = parseInt(this.nativePicker.value.slice(1), 16);
      app.setActiveColor24(raw24);
    };
    this.nativePicker.click();
  },


  open(app) {
    // Open native color picker directly for 12-bit, 16-bit, and 24-bit modes
    if (
      app.paletteMode !== ColorEngine.MODE_8BIT &&
      app.paletteMode !== ColorEngine.MODE_9BIT
    ) {
      this.openNativePicker(app);
      return;
    }

    const modal = document.getElementById('palette-modal');
    const grid = document.getElementById('full-512-grid');
    const info = document.getElementById('palette-hover-info');
    const title = modal.querySelector('h3');

    grid.innerHTML = '';

    if (app.paletteMode === ColorEngine.MODE_8BIT) {
      title.textContent = '8-Bit Classic VGA Palette (256 Colors)';
      grid.style.gridTemplateColumns = 'repeat(16, 1fr)';
      info.textContent = 'Hover a cell to inspect VGA index (0–255)';

      for (let i = 0; i < 256; i++) {
        const rgb24 = ColorPalettes.VGA_256[i];
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'matrix-cell';
        cell.style.backgroundColor = ColorEngine.toCss(rgb24);
        cell.onmouseenter = () => {
          info.textContent = `VGA #${i} (${ColorEngine.toHex(rgb24)})`;
        };
        cell.onclick = () => {
          app.setActiveColor24(rgb24);
          modal.classList.add('hidden');
        };
        grid.appendChild(cell);
      }
    } else {
      title.textContent = '9-Bit Palette Matrix (All 512 Colors)';
      grid.style.gridTemplateColumns = 'repeat(32, 1fr)';
      info.textContent = 'Hover a cell to inspect RGB (000–777)';

      for (let g = 0; g < 8; g++) {
        for (let b = 0; b < 8; b++) {
          for (let r = 0; r < 8; r++) {
            const rgb24 = ColorEngine.fromChannelSliders(r, g, b, ColorEngine.MODE_9BIT);
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'matrix-cell';
            cell.style.backgroundColor = ColorEngine.toCss(rgb24);
            cell.onmouseenter = () => {
              info.textContent = `Code: ${r}${g}${b} (R:${r} G:${g} B:${b})`;
            };
            cell.onclick = () => {
              app.setActiveColor24(rgb24);
              modal.classList.add('hidden');
            };
            grid.appendChild(cell);
          }
        }
      }
    }

    modal.classList.remove('hidden');
  }
};

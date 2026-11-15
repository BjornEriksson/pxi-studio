# PixelImage (`.pxi`) Studio — Public Beta (v0.4.1)

**Author:** [@BjornEriksson](https://github.com)  
**Version:** `0.4.1-beta`

**PixelImage Studio** is a lightweight, zero-dependency, browser-based pixel art editor built around the custom **`.pxi` (PixelImage)** binary image format. 

`.pxi` files are compact, self-describing, privacy-first still images (containing **zero internal timestamps** or system metadata). They can be used standalone or serve as individual animation frames for the upcoming **`.pxb` (PixelBanner)** multi-frame animation format and ecosystem.

---

## Live Preview

https://github.com

---

## Key Features (Beta v0.4.1)

* **Multi-Depth Color Engine (8-Bit to 24-Bit):**
  * **8-Bit Classic VGA (`paletteMode = 3`):** Deterministic 256-color Mode 13h palette (`1 byte/px`) with visual index table.
  * **9-Bit Retro RGB (`paletteMode = 0`, Default):** Full 512-color palette (`000`–`777` octal / `2 bytes/px`) with individual RGB sliders and a 512-color matrix picker.
  * **12-Bit Amiga RGB (`paletteMode = 1`):** 4,096 colors (`4-4-4` RGB / `2 bytes/px`).
  * **16-Bit High Color (`paletteMode = 4`):** 65,536 colors (`5-6-5` RGB / `2 bytes/px`).
  * **24-Bit True Color (`paletteMode = 2`):** 16.7 million colors (`8-8-8` RGB / `3 bytes/px`).
* **Smart Auto-RLE Binary Compression:** `pxi-codec.js` automatically evaluates Run-Length Encoding (`flags & 0x02`) on export and enables compression whenever it reduces file size compared to raw pixel data.
* **Configurable Raster Grid Rendering:** Real-time hardware-crisp rendering with customizable inner-gap raster styles (*None*, *Full Grid*, *Horizontal Scanlines*, *Vertical Lines*), adjustable raster thickness (`0–16 px`), and custom raster colors stored directly in the file header.
* **Expanded Pixel Toolset:**
  * **Drawing & Fills:** 1×1 Pencil, Multi-size Brush (`2×2`, `3×3`, `5×5 px`), Eraser, Flood Fill Bucket, Interactive Linear Gradient (with live preview guide line), and Color Eyedropper.
  * **Geometric Shapes:** Straight Line, Rectangle (Outline & Filled), Circle (Outline & Filled), and Ellipse/Oval (Outline & Filled) — supporting strokes starting or ending outside the canvas margin.
  * **Canvas Transforms:** Flip Horizontal and Flip Vertical.
* **Official Banner Presets:** Built-in presets for the standardized Kinetic Banner Quartet (*Small Square `21×21`*, *Double Tile `42×21`*, *Medium Square `36×36`*, and *Widescreen LED `86×18`*) alongside freeform art canvases up to `512×512`.
* **12-Step Undo & Crash-Safe Autosave:** Instant `Ctrl+Z` / toolbar undo (up to 12 steps, including palette mode changes) and automatic local binary snapshots via browser **IndexedDB** (`storage.js`) to prevent data loss across reloads or power outages.
* **Pure Client-Side Architecture:** Built entirely in vanilla HTML5 Canvas, CSS, and modular JavaScript. No build steps, bundlers, or external libraries required.

---

## Quick Start

1. Clone or download this repository.
2. Serve the folder using any local web server (e.g., VS Code Live Server, Python `http.server`, or Nginx/Apache) or open `index.html` in a modern browser.
3. Draw your artwork and export it via **File → Save as .pxi**.

---

## Project Structure

* `index.html` — Main editor interface, toolbars, and modal dialogs
* `style.css` — Retro workstation UI styling and resizable window bounds
* `studio-config.js` — Hardened window/grid limits and official banner format presets
* `app.js` — Main canvas controller, rendering engine, 12-step undo, and pointer events
* `color-palettes.js` — Deterministic 256-color VGA table and quick swatch definitions
* `color.js` — Multi-depth (`8/9/12/16/24-bit`) color quantization, packing, and unpacking engine
* `palette-modal.js` — Adaptive 256-VGA grid, 512-color matrix modal, and native color picker
* `pxi-codec.js` — Binary `.pxi` v1 encoder/decoder with automatic RLE compression
* `storage.js` — IndexedDB local autosave and future cloud sync hook
* `tools.js` — Pixel drawing algorithms (brush, line, shapes, flood fill, horizontal/vertical flip)
* `gradient-tool.js` — Interactive linear gradient tool and real-time guide line renderer
* `ui-handlers.js` — DOM event bindings, keyboard shortcuts (`Ctrl+Z`), and live size preview

---

## The `.pxi` Binary File Specification (v1)

Every `.pxi` file is self-describing and begins with a fixed **16-byte Big-Endian header**, followed immediately by pixel data and an optional UTF-8 creator signature. **No timestamps or device identifiers are ever written to the file.**

### 16-Byte Header Layout

| Offset | Size | Field | Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| `0` | 3 bytes | `magic` | ASCII | `"PXI"` (`0x50 0x58 0x49`) |
| `3` | 1 byte | `version` | `uint8` | Format version (`0x01`) |
| `4` | 2 bytes | `gridWidth` | `uint16` | Logical pixel width (`1–65,535`) |
| `6` | 2 bytes | `gridHeight` | `uint16` | Logical pixel height (`1–65,535`) |
| `8` | 1 byte | `pixelScale` | `uint8` | Display scale multiplier per logical pixel (`1–16`) |
| `9` | 1 byte | `rasterStyle` | `uint8` | `0` = None, `1` = Full Grid, `2` = Horizontal, `3` = Vertical |
| `10` | 2 bytes | `rasterColor` | `uint16` | Solid raster line color (encoded per `paletteMode`) |
| `12` | 1 byte | `paletteMode` | `uint8` | `0` = 9-bit RGB, `1` = 12-bit RGB, `2` = 24-bit RGB, `3` = 8-bit VGA, `4` = 16-bit RGB565 |
| `13` | 1 byte | `frameCount` | `uint8` | Strictly `1` for `.pxi` (`1–255` reserved for `.pxb` animations) |
| `14` | 1 byte | `rasterThickness` | `uint8` | Inner-gap raster thickness in screen pixels (`0–16`) |
| `15` | 1 byte | `flags` | `uint8` | Bitmask: `0x02` = RLE compression enabled, `0x08` = Creator signature appended at EOF |

### Pixel & Signature Payload
* **Pixel Data (`gridWidth × gridHeight`):** Stored in row-major order (`1 byte/px` for 8-bit VGA, `2 bytes/px` Big-Endian for 9/12/16-bit RGB, `3 bytes/px` for 24-bit RGB). When `flags & 0x02` is set, data is stored as `[runLength (1–255), pixelValue]` pairs.
* **Creator Signature (Optional, `flags & 0x08`):** Appended at the end of the file (`1 byte` length `1–64` + `N bytes` UTF-8 text). Completely omitted (`0 bytes`) when left blank.

---

## Ecosystem Roadmap

This repository is the first release in a modular suite of pixel tools by [@BjornEriksson](https://github.com):
* **PixelImage (`.pxi`) Studio** *(Current Beta v0.4.1)* — Single-frame pixel editor and `.pxi` encoder/decoder.
* **PixelBanner (`.pxb`) Animator** *(Next Milestone)* — Folder-based timeline assembler for combining `.pxi` frames into multi-frame animated `.pxb` banners and loops.

---

## License

This project is licensed under the [MIT License](LICENSE).

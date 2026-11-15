# PixelImage (`.pxi`) Studio — Public Beta (v0.2.0)

**Author:** [@BjornEriksson](https://github.com)  
**Version:** `0.2.0-beta`

**PixelImage Studio** is a lightweight, zero-dependency, browser-based pixel art editor built around the custom **`.pxi` (PixelImage)** binary image format. 

`.pxi` files are compact, self-describing, privacy-first still images (containing **zero internal timestamps** or system metadata). They can be used standalone or serve as individual animation frames for the upcoming **`.pxb` (PixelBanner)** multi-frame animation format and ecosystem.

---

## Key Features (Beta v0.2)

* **9-Bit Retro RGB Color Engine:** Full 512-color palette (`000`–`777` octal / 3 bits per channel) with individual RGB sliders, quick swatches, and a full 512-color matrix picker.
* **Configurable Raster Grid Rendering:** Real-time hardware-crisp rendering with customizable raster styles (*None*, *Full Grid*, *Horizontal Scanlines*, *Vertical Lines*), adjustable raster thickness, and custom raster colors stored directly in the file header.
* **Essential Pixel Tools:** Pencil, Eraser, Line, Rectangle, Flood Fill, and Color Picker — supporting strokes starting or ending outside the canvas margin.
* **1-Step Undo / Redo & Crash-Safe Autosave:** Instant `Ctrl+Z` undo/redo and automatic local binary snapshots via browser **IndexedDB** (`storage.js`) to prevent data loss across reloads or power outages.
* **Pure Client-Side Architecture:** Built entirely in vanilla HTML5 Canvas, CSS, and modular JavaScript. No build steps, bundlers, or external libraries required.

---

## Quick Start

1. Clone or download this repository.
2. Serve the folder using any local web server (e.g., VS Code Live Server, Python `http.server`, or Nginx/Apache) or open `index.html` in a modern browser.
3. Draw your artwork and export it via **File → Save as .pxi**.

---

## Project Structure

* `index.html` — Main editor interface and layout
* `style.css` — Retro workstation UI styling
* `app.js` — Main canvas controller, rendering engine, and state management
* `color.js` — 9-bit RGB packing, unpacking, and hex/CSS conversion utilities
* `pxi-codec.js` — Binary `.pxi` v1 file encoder and decoder
* `storage.js` — IndexedDB local autosave and future sync hook
* `tools.js` — Pixel drawing algorithms (line, rectangle, flood fill)
* `ui-handlers.js` — DOM event bindings, shortcuts, and palette modal

---

## The `.pxi` Binary File Specification (v1)

Every `.pxi` file is self-describing and begins with a fixed **16-byte Big-Endian header**, followed immediately by raw pixel data and an optional UTF-8 creator signature. **No timestamps or device identifiers are ever written to the file.**

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
| `12` | 1 byte | `paletteMode` | `uint8` | `0` = 9-bit RGB (512 colors), `1` = 12-bit RGB, `2` = 24-bit RGB |
| `13` | 1 byte | `frameCount` | `uint8` | Strictly `1` for `.pxi` (`1–255` reserved for `.pxb` animations) |
| `14` | 1 byte | `rasterThickness` | `uint8` | Raster gap thickness between pixels in screen pixels (`0–16`) |
| `15` | 1 byte | `flags` | `uint8` | Bitmask (`0x02` = RLE compression, `0x08` = Creator signature at EOF) |

### Pixel & Signature Payload
* **Pixel Data (`gridWidth × gridHeight`):** Stored in row-major order. In **9-bit RGB mode (`paletteMode = 0`)**, each pixel is packed into a 16-bit unsigned integer (`uint16`, Big-Endian) as `(R << 6) | (G << 3) | B` where each channel ranges from `0` to `7`.
* **Creator Signature (Optional, `flags & 0x08`):** Appended at the end of the file (`1 byte` length `1–64` + `N bytes` UTF-8 text). Completely omitted (`0 bytes`) when left blank.

---

## Ecosystem Roadmap

This repository is the first release in a modular suite of pixel tools by [@BjornEriksson](https://github.com):
* **PixelImage (`.pxi`) Studio** *(Current Beta)* — Single-frame pixel editor and `.pxi` encoder/decoder.
* **PixelBanner (`.pxb`) Animator** *(Upcoming)* — Folder-based timeline assembler for combining `.pxi` frames into multi-frame animated `.pxb` banners and loops.

---

## License

This project is licensed under the [MIT License](LICENSE).


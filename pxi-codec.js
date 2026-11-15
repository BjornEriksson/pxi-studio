/**
 * PixelImage (.pxi) Studio - Multi-Depth Binary Encoder & Decoder (Auto-RLE)
 * @file pxi-codec.js
 * @author BjornEriksson (https://github.com)
 * @version 0.4.0-beta
 */
const PxiCodec = {
  writeEncodedPixel(view, offset, encoded, bytesPerPixel) {
    if (bytesPerPixel === 1) {
      view.setUint8(offset, encoded);
    } else if (bytesPerPixel === 2) {
      view.setUint16(offset, encoded, false);
    } else {
      view.setUint8(offset, (encoded >> 16) & 0xFF);
      view.setUint8(offset + 1, (encoded >> 8) & 0xFF);
      view.setUint8(offset + 2, encoded & 0xFF);
    }
  },

  encode(state) {
    const mode = state.paletteMode ?? ColorEngine.MODE_9BIT;
    const count = state.gridWidth * state.gridHeight;
    const bytesPerPixel = (mode === ColorEngine.MODE_8BIT) ? 1 : (mode === ColorEngine.MODE_24BIT ? 3 : 2);

    // Pre-encode all pixels to target palette values
    const encodedPixels = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
      encodedPixels[i] = ColorEngine.encodePixel(state.pixels[i], mode);
    }

    // Build RLE runs [runLength (1..255), encodedPixel]
    const rleRuns = [];
    let idx = 0;
    while (idx < count) {
      const val = encodedPixels[idx];
      let run = 1;
      while (idx + run < count && encodedPixels[idx + run] === val && run < 255) {
        run++;
      }
      rleRuns.push({ run, val });
      idx += run;
    }

    const rawPayloadBytes = count * bytesPerPixel;
    const rlePayloadBytes = rleRuns.length * (1 + bytesPerPixel);
    const useRle = rlePayloadBytes < rawPayloadBytes;
    const payloadBytes = useRle ? rlePayloadBytes : rawPayloadBytes;

    const sig = state.signature.trim();
    const sigBytes = sig ? new TextEncoder().encode(sig).slice(0, 64) : null;
    const totalBytes = 16 + payloadBytes + (sigBytes ? 1 + sigBytes.length : 0);

    const buffer = new ArrayBuffer(totalBytes);
    const view = new DataView(buffer);

    // 16-byte self-describing header
    view.setUint8(0, 0x50); // 'P'
    view.setUint8(1, 0x58); // 'X'
    view.setUint8(2, 0x49); // 'I'
    view.setUint8(3, 0x01); // Version 1
    view.setUint16(4, state.gridWidth, false);
    view.setUint16(6, state.gridHeight, false);
    view.setUint8(8, state.pixelScale);
    view.setUint8(9, state.rasterStyle);

    const rasterMode = (mode === ColorEngine.MODE_24BIT) ? ColorEngine.MODE_9BIT : mode;
    view.setUint16(10, ColorEngine.encodePixel(state.rasterColor24, rasterMode), false);

    view.setUint8(12, mode);
    view.setUint8(13, 1); // 1 frame (.pxi)
    view.setUint8(14, state.rasterThickness);

    let flags = 0x00;
    if (useRle) flags |= 0x02;
    if (sigBytes) flags |= 0x08;
    view.setUint8(15, flags);

    let offset = 16;
    if (useRle) {
      for (let i = 0; i < rleRuns.length; i++) {
        view.setUint8(offset++, rleRuns[i].run);
        this.writeEncodedPixel(view, offset, rleRuns[i].val, bytesPerPixel);
        offset += bytesPerPixel;
      }
    } else {
      for (let i = 0; i < count; i++) {
        this.writeEncodedPixel(view, offset, encodedPixels[i], bytesPerPixel);
        offset += bytesPerPixel;
      }
    }

    if (sigBytes) {
      view.setUint8(offset, sigBytes.length);
      new Uint8Array(buffer).set(sigBytes, offset + 1);
    }

    return buffer;
  },

  decode(buffer) {
    const view = new DataView(buffer);
    if (view.getUint8(0) !== 0x50 || view.getUint8(1) !== 0x58 || view.getUint8(2) !== 0x49) {
      throw new Error('Invalid .pxi signature');
    }

    const gridWidth = view.getUint16(4, false);
    const gridHeight = view.getUint16(6, false);
    const pixelScale = view.getUint8(8);
    const rasterStyle = view.getUint8(9);
    const rawRaster = view.getUint16(10, false);
    const paletteMode = view.getUint8(12);
    const rasterThickness = view.getUint8(14);
    const flags = view.getUint8(15);

    const rasterMode = (paletteMode === ColorEngine.MODE_24BIT) ? ColorEngine.MODE_9BIT : paletteMode;
    const rasterColor24 = ColorEngine.decodePixel(rawRaster, rasterMode);

    const count = gridWidth * gridHeight;
    const pixels = new Uint32Array(count);
    const bytesPerPixel = (paletteMode === ColorEngine.MODE_8BIT) ? 1 : (paletteMode === ColorEngine.MODE_24BIT ? 3 : 2);
    let offset = 16;

    const readPixel = () => {
      let rawVal = 0;
      if (bytesPerPixel === 1) {
        rawVal = view.getUint8(offset);
      } else if (bytesPerPixel === 2) {
        rawVal = view.getUint16(offset, false);
      } else {
        rawVal = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
      }
      offset += bytesPerPixel;
      return ColorEngine.decodePixel(rawVal, paletteMode);
    };

    if ((flags & 0x02) !== 0) {
      let written = 0;
      while (written < count && offset < buffer.byteLength) {
        const run = view.getUint8(offset++);
        const col24 = readPixel();
        for (let r = 0; r < run && written < count; r++) {
          pixels[written++] = col24;
        }
      }
    } else {
      for (let i = 0; i < count; i++) {
        pixels[i] = readPixel();
      }
    }

    let signature = '';
    if ((flags & 0x08) !== 0 && offset < buffer.byteLength) {
      const len = view.getUint8(offset);
      signature = new TextDecoder().decode(new Uint8Array(buffer, offset + 1, len));
    }

    return { gridWidth, gridHeight, pixelScale, rasterStyle, rasterColor24, paletteMode, rasterThickness, pixels, signature };
  }
};

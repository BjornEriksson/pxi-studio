/**
 * PixelImage (.pxi) Studio - Main Canvas Controller
 * @file app.js
 * @author BjornEriksson (https://github.com)
 * @version 0.2.0-beta
 */

/**
 * PixelImage (.pxi) Studio - Binary File Encoder & Decoder
 */
const PxiCodec = {
  encode(state) {
    const count = state.gridWidth * state.gridHeight;
    const sig = state.signature.trim();
    const sigBytes = sig ? new TextEncoder().encode(sig).slice(0, 64) : null;
    const totalBytes = 16 + (count * 2) + (sigBytes ? 1 + sigBytes.length : 0);

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
    view.setUint16(10, state.rasterColor9Bit, false);
    view.setUint8(12, 0); // 9-bit RGB mode
    view.setUint8(13, 1); // 1 frame (.pxi)
    view.setUint8(14, state.rasterThickness);
    view.setUint8(15, sigBytes ? 0x08 : 0x00);

    let offset = 16;
    for (let i = 0; i < count; i++) {
      view.setUint16(offset, state.pixels[i], false);
      offset += 2;
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
    const rasterColor9Bit = view.getUint16(10, false);
    const rasterThickness = view.getUint8(14);
    const flags = view.getUint8(15);

    const count = gridWidth * gridHeight;
    const pixels = new Uint16Array(count);
    let offset = 16;

    for (let i = 0; i < count; i++) {
      pixels[i] = view.getUint16(offset, false);
      offset += 2;
    }

    let signature = '';
    if ((flags & 0x08) !== 0 && offset < buffer.byteLength) {
      const len = view.getUint8(offset);
      signature = new TextDecoder().decode(new Uint8Array(buffer, offset + 1, len));
    }

    return { gridWidth, gridHeight, pixelScale, rasterStyle, rasterColor9Bit, rasterThickness, pixels, signature };
  }
};

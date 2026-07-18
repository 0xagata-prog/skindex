const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_IMAGE_EDGE = 4096;
const MAX_IMAGE_PIXELS = 16_000_000;

function startsWith(bytes: Uint8Array, signature: number[]) {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

export function matchesImageSignature(contentType: string, value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  if (contentType === "image/png") return startsWith(bytes, pngSignature);
  if (contentType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (contentType === "image/webp") {
    return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      bytes.length >= 12 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

function uint32(bytes: Uint8Array, offset: number, littleEndian = false) {
  if (offset + 4 > bytes.length) return -1;
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, littleEndian);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function pngInfo(bytes: Uint8Array) {
  const width = uint32(bytes, 16);
  const height = uint32(bytes, 20);
  const forbidden = new Set(["eXIf", "tEXt", "iTXt", "zTXt"]);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = uint32(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    if (length < 0 || offset + 12 + length > bytes.length) return { error: "PNG 文件结构无效" };
    if (forbidden.has(type)) return { error: "预览图包含 EXIF 或文本元数据，请移除后重试" };
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return { width, height };
}

function jpegInfo(bytes: Uint8Array) {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return { error: "JPEG 文件结构无效" };
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return { error: "JPEG 文件结构无效" };
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return { error: "JPEG 文件结构无效" };
    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) {
      return { error: "预览图包含 EXIF、XMP 或注释元数据，请移除后重试" };
    }
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 7) return { error: "JPEG 尺寸信息无效" };
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += length;
  }
  return { error: "无法读取 JPEG 尺寸" };
}

function webpInfo(bytes: Uint8Array) {
  let offset = 12;
  let dimensions: { width?: number; height?: number } = {};
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const length = uint32(bytes, offset + 4, true);
    if (length < 0 || offset + 8 + length > bytes.length) return { error: "WebP 文件结构无效" };
    if (type === "EXIF" || type === "XMP ") return { error: "预览图包含 EXIF 或 XMP 元数据，请移除后重试" };
    if (type === "VP8X" && length >= 10) {
      dimensions = {
        width: 1 + bytes[offset + 12] + (bytes[offset + 13] << 8) + (bytes[offset + 14] << 16),
        height: 1 + bytes[offset + 15] + (bytes[offset + 16] << 8) + (bytes[offset + 17] << 16),
      };
    } else if (type === "VP8 " && length >= 10 && bytes[offset + 11] === 0x9d && bytes[offset + 12] === 0x01 && bytes[offset + 13] === 0x2a) {
      dimensions = {
        width: (bytes[offset + 14] | (bytes[offset + 15] << 8)) & 0x3fff,
        height: (bytes[offset + 16] | (bytes[offset + 17] << 8)) & 0x3fff,
      };
    } else if (type === "VP8L" && length >= 5 && bytes[offset + 8] === 0x2f) {
      const bits = uint32(bytes, offset + 9, true);
      dimensions = { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
    }
    offset += 8 + length + (length % 2);
  }
  return dimensions.width && dimensions.height ? dimensions : { error: "无法读取 WebP 尺寸" };
}

export function inspectImageUpload(contentType: string, value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  if (!matchesImageSignature(contentType, bytes)) return { ok: false as const, error: "预览图内容与文件类型不匹配" };
  const info = contentType === "image/png" ? pngInfo(bytes) : contentType === "image/jpeg" ? jpegInfo(bytes) : webpInfo(bytes);
  if ("error" in info) return { ok: false as const, error: info.error };
  const width = info.width ?? 0;
  const height = info.height ?? 0;
  if (width <= 0 || height <= 0) return { ok: false as const, error: "无法读取预览图尺寸" };
  if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE || width * height > MAX_IMAGE_PIXELS) {
    return { ok: false as const, error: "预览图尺寸过大，最长边不得超过 4096px，且总像素不得超过 1600 万" };
  }
  return { ok: true as const, width, height };
}

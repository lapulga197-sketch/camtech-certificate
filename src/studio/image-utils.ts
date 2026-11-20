/** Reads an image file, shrinks it, and returns a data URL + aspect ratio (width / height). */
export async function fileToDataUrl(
  file: File,
  opts: { max?: number; quality?: number; forceJpeg?: boolean } = {}
): Promise<{ src: string; ar: number }> {
  const max = opts.max ?? 1400;
  const quality = opts.quality ?? 0.85;

  if (file.type === "image/svg+xml") {
    const text = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("read"));
      r.readAsDataURL(file);
    });
    const dim = await measure(text);
    return { src: text, ar: dim.w / Math.max(1, dim.h) };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    const keepAlpha = !opts.forceJpeg && (file.type === "image/png" || file.type === "image/webp");
    if (!keepAlpha) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    const src = keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality);
    return { src, ar: w / h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

async function measure(src: string): Promise<{ w: number; h: number }> {
  const img = await loadImage(src);
  return { w: img.naturalWidth || 1, h: img.naturalHeight || 1 };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 80) || "document";
}

/**
 * Like fileToDataUrl, but makes the (near-)white paper background transparent —
 * for scanned / photographed stamps and handwritten signatures, so they can be
 * placed over text without a white box. Always returns a PNG.
 * `threshold` (0-255) is how light a pixel must be to count as paper.
 */
export async function fileToTransparentPng(
  file: File,
  opts: { max?: number; threshold?: number } = {}
): Promise<{ src: string; ar: number }> {
  const max = opts.max ?? 900;
  const threshold = opts.threshold ?? 225;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    const soft = 45; // fade band below the threshold keeps anti-aliased strokes smooth
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const lightest = Math.min(px[i], px[i + 1], px[i + 2]);
      if (lightest >= threshold) px[i + 3] = 0;
      else if (lightest > threshold - soft) px[i + 3] = Math.round(px[i + 3] * ((threshold - lightest) / soft));
    }
    ctx.putImageData(data, 0, 0);
    return { src: canvas.toDataURL("image/png"), ar: w / h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

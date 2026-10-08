/**
 * Scales a picture in the browser before it is sent (ADR 0048): to the
 * kind's longest side, re-encoded as WebP where the browser can and as
 * PNG (a logo, which may be transparent) or JPEG (a picture) where it
 * cannot. Drawing it on a canvas leaves the file's EXIF data — a phone's
 * GPS position among it — behind. If the result is still too large, it
 * tries again a quarter smaller, a few times.
 */
export async function scaleImage(
  file: File,
  options: { side: number; maxBytes: number; transparent: boolean },
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, options.side / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 5; attempt++) {
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
    let blob = await encode(canvas, "image/webp");
    if (!blob || blob.type !== "image/webp")
      blob = await encode(canvas, options.transparent ? "image/png" : "image/jpeg");
    if (blob && blob.size <= options.maxBytes) return blob;
    scale *= 0.75;
  }
  throw new Error("tooLarge");
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
}

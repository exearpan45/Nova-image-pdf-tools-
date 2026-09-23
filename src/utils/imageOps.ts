export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  aspectRatio: string;
  format: string;
  mimeType: string;
  lastModified: string;
}

export function loadImage(fileOrUrl: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image file.'));
    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      img.src = URL.createObjectURL(fileOrUrl);
    }
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/jpeg',
  quality = 0.9,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert canvas to blob'));
      },
      type,
      quality,
    );
  });
}

export async function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
  };
}

export async function getImageMetadata(file: File): Promise<ImageMetadata> {
  const dims = await getImageDimensions(file);
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const w = dims.width;
  const h = dims.height;
  const divisor = gcd(w, h);
  const aspect = `${Math.round(w / divisor)}:${Math.round(h / divisor)}`;

  return {
    fileName: file.name,
    fileSize: file.size,
    width: w,
    height: h,
    aspectRatio: aspect,
    format: file.name.split('.').pop()?.toUpperCase() || 'IMAGE',
    mimeType: file.type || 'image/jpeg',
    lastModified: new Date(file.lastModified).toLocaleString(),
  };
}

export async function compressImage(
  file: File,
  quality: number, // 0.1 to 1.0
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<Blob> {
  const img = await loadImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const format =
    outputFormat ||
    (file.type as 'image/jpeg' | 'image/png' | 'image/webp') ||
    'image/jpeg';

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  return await canvasToBlob(canvas, format, quality);
}

export async function resizeImage(
  file: File,
  targetWidth: number,
  targetHeight: number,
  outputFormat?: string,
  quality = 0.92,
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(targetWidth));
  canvas.height = Math.max(1, Math.round(targetHeight));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const format = outputFormat || file.type || 'image/jpeg';
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return await canvasToBlob(canvas, format, quality);
}

export async function cropImage(
  file: File,
  x: number,
  y: number,
  width: number,
  height: number,
  outputFormat?: string,
  quality = 0.95,
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const format = outputFormat || file.type || 'image/jpeg';
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, x, y, width, height, 0, 0, canvas.width, canvas.height);

  return await canvasToBlob(canvas, format, quality);
}

export async function convertImageFormat(
  file: File,
  targetFormat: string,
  quality = 0.92,
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (targetFormat === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);
  return await canvasToBlob(canvas, targetFormat, quality);
}

export async function rotateAndFlipImage(
  file: File,
  angleDeg: number,
  flipH: boolean,
  flipV: boolean,
  outputFormat?: string,
  quality = 0.92,
): Promise<Blob> {
  const img = await loadImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const isRotated90 = angleDeg % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = isRotated90 ? h : w;
  canvas.height = isRotated90 ? w : h;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const format = outputFormat || file.type || 'image/jpeg';
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -w / 2, -h / 2);
  ctx.restore();

  return await canvasToBlob(canvas, format, quality);
}

export async function scaleImagePercentage(
  file: File,
  percent: number,
  outputFormat?: string,
  quality = 0.92,
): Promise<Blob> {
  const img = await loadImage(file);
  const targetW = Math.max(1, Math.round((img.naturalWidth * percent) / 100));
  const targetH = Math.max(1, Math.round((img.naturalHeight * percent) / 100));

  return await resizeImage(file, targetW, targetH, outputFormat, quality);
}

const hexToRgb = (hex: string) => {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.substring(0, 2), 16) || 255,
    g: parseInt(c.substring(2, 4), 16) || 255,
    b: parseInt(c.substring(4, 6), 16) || 255,
  };
};

export async function removeSolidBackground(
  file: File,
  targetHexColor: string,
  tolerance = 30,
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const targetColor = hexToRgb(targetHexColor);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt(
      Math.pow(r - targetColor.r, 2) +
        Math.pow(g - targetColor.g, 2) +
        Math.pow(b - targetColor.b, 2),
    );

    if (dist <= tolerance) {
      data[i + 3] = 0; // alpha = 0 (transparent)
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return await canvasToBlob(canvas, 'image/png', 1.0);
}

export async function replaceBackgroundColor(
  file: File,
  newBgHexColor: string,
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.fillStyle = newBgHexColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  return await canvasToBlob(canvas, 'image/png', 1.0);
}

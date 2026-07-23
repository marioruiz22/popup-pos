const MAX_IMAGE_SIZE = 512;
const JPEG_QUALITY = 0.72;

export async function fileToProductImageDataUrl(file: File): Promise<string> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Selected file is not an image.');
  }

  try {
    return await compressWithImageBitmap(file);
  } catch {
    return await compressWithFileReader(file);
  }
}

async function compressWithImageBitmap(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);

  try {
    return drawToJpegDataUrl(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

async function compressWithFileReader(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  return drawToJpegDataUrl(image, image.naturalWidth || image.width, image.naturalHeight || image.height);
}

function drawToJpegDataUrl(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number
): string {
  const { width, height } = fitWithin(sourceWidth, sourceHeight, MAX_IMAGE_SIZE);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to process image.');
  }

  context.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Unable to read image file.'));
    };
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load image.'));
    image.src = src;
  });
}

function fitWithin(width: number, height: number, maxSize: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    throw new Error('Invalid image dimensions.');
  }

  if (width <= maxSize && height <= maxSize) {
    return { width, height };
  }

  const scale = maxSize / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function nameInitial(name: string | null | undefined): string {
  return name?.trim().charAt(0).toUpperCase() || '?';
}

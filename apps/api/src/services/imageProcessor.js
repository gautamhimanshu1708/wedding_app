import sharp from 'sharp';
import { ALLOWED_IMAGE_MIME_TYPES } from '@wedding/shared';

export class ImageProcessor {
  /**
   * Validate image buffer headers / magic bytes
   */
  static validateMagicBytes(buffer) {
    if (!buffer || buffer.length < 8) {
      throw new Error('Invalid or corrupted image file');
    }

    // JPEG: FF D8 FF
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    // WEBP: RIFF .... WEBP
    const isWebP =
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';
    // HEIC/HEIF: .... ftyp (mif1, msf1, heic, heix, hevc)
    const isHeic =
      buffer.length > 12 &&
      buffer.toString('ascii', 4, 8) === 'ftyp' &&
      (buffer.toString('ascii', 8, 12).includes('heic') ||
        buffer.toString('ascii', 8, 12).includes('mif1'));

    if (!isJpeg && !isPng && !isWebP && !isHeic) {
      throw new Error('Unsupported image format. Please upload JPEG, PNG, or WebP images.');
    }

    return true;
  }

  /**
   * Process raw upload buffer:
   * 1. Strips EXIF & GPS
   * 2. Auto-rotates according to EXIF orientation
   * 3. Generates high-quality display WebP (max width 1600px)
   * 4. Generates thumbnail WebP (max width 450px)
   */
  static async processPhoto(inputBuffer) {
    // 1. Validate magic bytes
    this.validateMagicBytes(inputBuffer);

    // 2. Read metadata safely
    const image = sharp(inputBuffer, { failOnError: false });
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to extract image dimensions. Image may be corrupted.');
    }

    // 3. Generate Display Version (Max 1600px width/height, WebP 85% quality, stripped EXIF)
    const displayBuffer = await sharp(inputBuffer, { failOnError: false })
      .rotate() // auto-rotates based on EXIF orientation tag then strips it
      .resize(1600, 1600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();

    const displayMeta = await sharp(displayBuffer).metadata();

    // 4. Generate Thumbnail Version (Max 450px, WebP 80% quality)
    const thumbnailBuffer = await sharp(inputBuffer, { failOnError: false })
      .rotate()
      .resize(450, 450, {
        fit: 'cover',
        position: 'attention', // intelligent focal crop
      })
      .webp({ quality: 80, effort: 3 })
      .toBuffer();

    // 5. Generate high-quality auto-rotated JPEG for Google Drive native previews
    const jpegBuffer = await sharp(inputBuffer, { failOnError: false })
      .rotate()
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    return {
      originalBuffer: inputBuffer,
      jpegBuffer,
      displayBuffer,
      thumbnailBuffer,
      width: displayMeta.width || metadata.width,
      height: displayMeta.height || metadata.height,
      mimeType: 'image/webp',
    };
  }
}

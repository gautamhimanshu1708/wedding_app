import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createApp } from './src/app.js';
import { ImageProcessor } from './src/services/imageProcessor.js';
import { StorageService } from './src/services/storage.js';

console.log('Testing @wedding/api components...');

async function runTests() {
  // 1. Test Express app creation
  const app = createApp();
  assert(app, 'App should be created');
  console.log('✓ Express app factory successfully initialized');

  // 2. Test Image Processing with Sharp
  // Create a 500x500 mock image with sharp
  const testBuffer = await sharp({
    create: {
      width: 500,
      height: 500,
      channels: 4,
      background: { r: 104, g: 29, b: 50, alpha: 1 } // #681D32 Burgundy
    }
  }).png().toBuffer();

  const processed = await ImageProcessor.processPhoto(testBuffer);
  assert(processed.displayBuffer, 'Should generate display buffer');
  assert(processed.thumbnailBuffer, 'Should generate thumbnail buffer');
  assert.equal(processed.mimeType, 'image/webp');
  assert.equal(processed.width, 500);
  assert.equal(processed.height, 500);
  console.log(`✓ ImageProcessor successfully generated WebP display (${processed.displayBuffer.length} bytes) and thumbnail (${processed.thumbnailBuffer.length} bytes)`);

  // 3. Test Storage Service
  const testKey = 'test/mock-image.webp';
  await StorageService.putObject(testKey, processed.thumbnailBuffer, 'image/webp');
  const url = await StorageService.getObjectUrl(testKey);
  assert(url.includes('test/mock-image.webp'), 'Generated URL should include key');
  console.log(`✓ StorageService successfully stored and retrieved URL: ${url}`);

  await StorageService.deleteObject(testKey);
  console.log('✓ StorageService cleanup verified');

  console.log('All API tests passed successfully!');
}

runTests().catch((err) => {
  console.error('API Test Failed:', err);
  process.exit(1);
});

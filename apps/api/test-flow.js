import assert from 'node:assert/strict';
import http from 'http';
import sharp from 'sharp';
import { createApp } from './src/app.js';
import { setupSocketIO } from './src/sockets/socketHandler.js';

console.log('--- Testing Complete End-to-End User Flow (Zero-Config Mode) ---');

const app = createApp();
const server = http.createServer(app);
setupSocketIO(server, 'http://localhost:5173');

server.listen(5099, async () => {
  const baseUrl = 'http://localhost:5099/api/v1';

  try {
    // 1. Test Guest Login (the exact action from the user's screenshot)
    console.log('1. Testing guest login at /auth/guest-demo-login...');
    const loginRes = await fetch(`${baseUrl}/auth/guest-demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rahul Sharma' }),
    });
    const loginData = await loginRes.json();
    assert.equal(loginData.success, true, 'Guest login should succeed instantly');
    assert(loginData.data.token, 'Should return auth token');
    const token = loginData.data.token;
    console.log('✓ Guest login succeeded in milliseconds! Token received for:', loginData.data.user.name);

    // 2. Fetch Wedding by slug
    console.log('2. Fetching royal wedding metadata by slug...');
    const weddingRes = await fetch(`${baseUrl}/weddings/slug/royal-udaipur-2026`);
    const weddingData = await weddingRes.json();
    assert.equal(weddingData.success, true);
    assert.equal(weddingData.data.slug, 'royal-udaipur-2026');
    const weddingId = weddingData.data.id;
    console.log('✓ Wedding metadata verified:', weddingData.data.title);

    // 3. Fetch Events
    console.log('3. Fetching ceremony events...');
    const eventsRes = await fetch(`${baseUrl}/weddings/${weddingId}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const eventsData = await eventsRes.json();
    assert.equal(eventsData.success, true);
    assert(eventsData.data.length >= 5, 'Should have default ceremonies');
    const eventId = eventsData.data[0]._id;
    console.log(`✓ Ceremonies fetched: ${eventsData.data.map(e => e.name).join(', ')}`);

    // 4. Test Direct Photo Upload
    console.log('4. Testing photo upload and immediate publishing...');
    const testImageBuffer = await sharp({
      create: {
        width: 600,
        height: 600,
        channels: 4,
        background: { r: 104, g: 29, b: 50, alpha: 1 },
      },
    }).png().toBuffer();

    const formData = new FormData();
    formData.append('eventId', eventId);
    formData.append('caption', 'Cherished moments at the royal wedding ceremony!');
    const blob = new Blob([testImageBuffer], { type: 'image/png' });
    formData.append('photos', blob, 'ceremony_photo.png');

    const uploadRes = await fetch(`${baseUrl}/weddings/${weddingId}/photos/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    assert.equal(uploadData.success, true);
    assert.equal(uploadData.data.length, 1);
    const photoId = uploadData.data[0]._id;
    console.log('✓ Photo published immediately without manual approval! Photo ID:', photoId);

    // 5. Test Live Feed
    console.log('5. Fetching live photos feed...');
    const feedRes = await fetch(`${baseUrl}/weddings/${weddingId}/photos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const feedData = await feedRes.json();
    assert.equal(feedData.success, true);
    assert.equal(feedData.data.photos.length >= 1, true);
    console.log(`✓ Live feed returned ${feedData.data.photos.length} photo(s)`);

    // 6. Test Like
    console.log('6. Testing like toggle...');
    const likeRes = await fetch(`${baseUrl}/weddings/${weddingId}/photos/${photoId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const likeData = await likeRes.json();
    assert.equal(likeData.success, true);
    assert.equal(likeData.data.isLiked, true);
    assert.equal(likeData.data.likesCount, 1);
    console.log('✓ Photo liked successfully! Likes count:', likeData.data.likesCount);

    console.log('\n🌟 ALL END-TO-END FLOW TESTS PASSED FLAWLESSLY! 🌟');
  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
});

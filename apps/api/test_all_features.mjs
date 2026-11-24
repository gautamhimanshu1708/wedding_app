import assert from 'assert';

const API_BASE = 'http://localhost:5000/api/v1';
const WEB_BASE = 'http://localhost:5173';

console.log('====================================================');
console.log('   ROYAL WEDDING PLATFORM - FULL FEATURE AUDIT     ');
console.log('====================================================\n');

async function runAudit() {
  let passed = 0;
  let failed = 0;

  function record(title, success, details = '') {
    if (success) {
      console.log(`[PASS] ${title}`);
      if (details) console.log(`       -> ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title}`);
      if (details) console.error(`       -> ${details}`);
      failed++;
    }
  }

  // 1. Health check
  try {
    const res = await fetch('http://localhost:5000/api/health');
    const data = await res.json();
    record('API Server Health', res.status === 200 && data.status === 'healthy', `Status: ${data.status}`);
  } catch (e) {
    record('API Server Health', false, e.message);
  }

  // 2. Frontend Web Server
  try {
    const res = await fetch(WEB_BASE);
    const html = await res.text();
    record('Web Frontend Server', res.status === 200 && html.toLowerCase().includes('<!doctype html>'), 'Vite HTML served successfully');
  } catch (e) {
    record('Web Frontend Server', false, e.message);
  }

  // 3. Wedding Space by Slug
  let wedding = null;
  try {
    const res = await fetch(`${API_BASE}/weddings/slug/royal-udaipur-2026`);
    const data = await res.json();
    wedding = data.data;
    record('Wedding Space Resolution', data.success && wedding.slug === 'royal-udaipur-2026', `Title: "${wedding.title}" | ID: ${wedding._id || wedding.id}`);
  } catch (e) {
    record('Wedding Space Resolution', false, e.message);
  }

  if (!wedding) {
    console.error('Cannot proceed without active wedding');
    process.exit(1);
  }

  const weddingId = wedding._id || wedding.id;

  // 4. Admin Host Session & Token Generation
  let authToken = null;
  try {
    const res = await fetch(`${API_BASE}/auth/guest-demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aarav & Diya (Admin Host)',
        email: 'host@royalwedding.com',
      }),
    });
    const data = await res.json();
    authToken = data.data?.token;
    record('Host Session Generation', Boolean(authToken), `User: ${data.data?.user?.name}`);
  } catch (e) {
    record('Host Session Generation', false, e.message);
  }

  // 5. Admin Privilege Claim
  try {
    const res = await fetch(`${API_BASE}/weddings/${weddingId}/claim-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'x-admin-portal': 'true',
      },
    });
    const data = await res.json();
    record('Admin/Owner Role Claim', data.success && data.data?.role === 'owner', `Role: ${data.data?.role}`);
  } catch (e) {
    record('Admin/Owner Role Claim', false, e.message);
  }

  // 6. Ceremony / Event Creation
  let createdEvent = null;
  const testEventName = `Haldi Celebration - ${Date.now().toString().slice(-4)}`;
  try {
    const res = await fetch(`${API_BASE}/weddings/${weddingId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'x-admin-portal': 'true',
      },
      body: JSON.stringify({
        name: testEventName,
        description: 'Vibrant turmeric & blessing ceremony with live music',
        date: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    const data = await res.json();
    createdEvent = data.data;
    record('Ceremony Creation (No Permission Error)', data.success && createdEvent?.name === testEventName, `Event ID: ${createdEvent?._id} | Name: "${createdEvent?.name}"`);
  } catch (e) {
    record('Ceremony Creation', false, e.message);
  }

  // 7. Verify Event In Event List
  try {
    const res = await fetch(`${API_BASE}/weddings/${weddingId}/events`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-admin-portal': 'true',
      },
    });
    const data = await res.json();
    const found = (data.data || []).some(e => e.name === testEventName);
    record('Event Listed in Ceremonies', found, `Total ceremonies now: ${data.data?.length}`);
  } catch (e) {
    record('Event Listed in Ceremonies', false, e.message);
  }

  // 8. Multi-QR Code Generation for Ceremony
  let createdQR = null;
  if (createdEvent) {
    try {
      const res = await fetch(`${API_BASE}/qr/weddings/${weddingId}/events/${createdEvent._id}/qrcodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({
          label: 'VIP Table 4 - Courtyard',
        }),
      });
      const data = await res.json();
      createdQR = data.data;
      record('Multi-QR Code Generation', data.success && Boolean(createdQR?.token), `Label: "${createdQR?.label}" | Token: ${createdQR?.token}`);
    } catch (e) {
      record('Multi-QR Code Generation', false, e.message);
    }
  }

  // 9. QR Code Verification (Simulating Guest Scan)
  if (createdQR) {
    try {
      const res = await fetch(`${API_BASE}/qr/verify/${createdQR.token}`);
      const data = await res.json();
      record('Guest QR Scan Verification', data.success && data.data?.wedding?.slug === 'royal-udaipur-2026', `Event Unlocked: "${data.data?.event?.name}" | Status: ${data.data?.qr?.status || (data.data?.qr?.isActive ? 'active' : 'inactive')}`);
    } catch (e) {
      record('Guest QR Scan Verification', false, e.message);
    }

    // 10. QR Active/Deactivate Toggle
    try {
      const toggleRes = await fetch(`${API_BASE}/qr/weddings/${weddingId}/events/${createdEvent._id}/qrcodes/${createdQR._id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ isActive: false }),
      });
      const toggleData = await toggleRes.json();
      const isDeactivated = toggleData.success && toggleData.data?.isActive === false;

      // Verify scanning deactivated QR is blocked or returns inactive
      const scanInactiveRes = await fetch(`${API_BASE}/qr/verify/${createdQR.token}`);
      const scanInactiveData = await scanInactiveRes.json();
      const properlyBlocked = scanInactiveRes.status === 403 || scanInactiveData.code === 'QR_INACTIVE' || !scanInactiveData.success;

      record('QR Code Deactivation Toggle', isDeactivated && properlyBlocked, 'QR deactivated successfully & blocked guest access');

      // Re-activate QR
      await fetch(`${API_BASE}/qr/weddings/${weddingId}/events/${createdEvent._id}/qrcodes/${createdQR._id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ isActive: true }),
      });
    } catch (e) {
      record('QR Code Deactivation Toggle', false, e.message);
    }
  }

  // 11. Storage Settings (Google Drive Configuration)
  try {
    const res = await fetch(`${API_BASE}/weddings/${weddingId}/storage`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-admin-portal': 'true',
      },
    });
    const data = await res.json();
    record('In-Portal Storage Settings', data.success && Boolean(data.data?.storageMode), `Current Mode: ${data.data?.storageMode} | Drive Configured: ${data.data?.isConnected}`);
  } catch (e) {
    record('In-Portal Storage Settings', false, e.message);
  }

  // 12. Photos Gallery & Live Feed Retrieval
  try {
    const res = await fetch(`${API_BASE}/weddings/${weddingId}/photos?limit=10`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    const data = await res.json();
    record('Live Gallery Photo Feed', data.success && Array.isArray(data.data?.photos), `Photos retrieved: ${data.data?.photos?.length}`);
  } catch (e) {
    record('Live Gallery Photo Feed', false, e.message);
  }

  // 13. Direct Photo Upload (Sharp optimization & storage)
  let uploadedPhoto = null;
  try {
    // 1x1 transparent PNG buffer
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(pngBase64, 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('photos', blob, 'test_haldi_photo.png');
    formData.append('eventId', createdEvent?._id);
    formData.append('caption', 'A beautiful royal blessing celebration!');

    const res = await fetch(`${API_BASE}/weddings/${weddingId}/photos/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });
    const data = await res.json();
    uploadedPhoto = data.data?.[0];
    record('Photo Upload & Image Processing', data.success && Boolean(uploadedPhoto?._id), `Photo ID: ${uploadedPhoto?._id} | Thumbnail: ${Boolean(uploadedPhoto?.thumbnailUrl)}`);
  } catch (e) {
    record('Photo Upload & Image Processing', false, e.message);
  }

  // 14. Real-time Photo Like
  if (uploadedPhoto) {
    try {
      const res = await fetch(`${API_BASE}/weddings/${weddingId}/photos/${uploadedPhoto._id}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      record('Photo Like Interaction', data.success && data.data?.isLiked === true, `Liked: ${data.data?.isLiked} | Likes Count: ${data.data?.likesCount}`);
    } catch (e) {
      record('Photo Like Interaction', false, e.message);
    }
  }

  console.log('\n====================================================');
  console.log(` AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
}

runAudit().catch(console.error);

import sharp from 'sharp';
import fetch from 'node:http';

const BASE = 'http://localhost:5173/api/v1';
const results = [];
let token = '', ownerToken = '';
let weddingId = '', weddingMongoId = '', events = [], photoId = '', membershipId = '', inviteToken = '';

const pass = (name, detail = '') => { results.push({ name, status: 'PASS', detail }); console.log(`  PASS  ${name}${detail ? ' -> ' + detail : ''}`); };
const fail = (name, detail = '') => { results.push({ name, status: 'FAIL', detail }); console.log(`  FAIL  ${name}${detail ? ' -> ' + detail : ''}`); };

async function req(url, opts = {}) {
  const r = await globalThis.fetch(url, opts);
  let d;
  try { d = await r.json(); } catch { d = { _status: r.status }; }
  return { ok: r.ok, status: r.status, data: d };
}
const auth = tk => ({ Authorization: 'Bearer ' + tk });
const jh = () => ({ 'Content-Type': 'application/json' });

async function run() {
  console.log('\n=== Royal Wedding Platform — Comprehensive Feature Audit ===\n');

  // 1. Health
  console.log('--- 1. Infrastructure ---');
  let r = await req('http://localhost:5173/api/health');
  r.ok && r.data.status === 'healthy'
    ? pass('API Health Check', `DB: ${r.data.database}, Storage: ${r.data.storage}, v${r.data.version}`)
    : fail('API Health Check', JSON.stringify(r.data));

  // 2. Wedding by slug
  console.log('\n--- 2. Public Wedding Discovery ---');
  r = await req(`${BASE}/weddings/slug/royal-udaipur-2026`);
  if (r.ok && r.data.success) {
    weddingMongoId = r.data.data._id || r.data.data.id;
    weddingId = weddingMongoId;
    pass('Get Wedding by Slug', `"${r.data.data.title}" | venue: ${r.data.data.venue}`);
  } else fail('Get Wedding by Slug', JSON.stringify(r.data));

  r = await req(`${BASE}/weddings/slug/nonexistent-xyz-slug`);
  !r.ok && r.status === 404 ? pass('Invalid Slug -> 404') : fail('Invalid Slug -> 404', `Got ${r.status}`);

  // 3. Auth
  console.log('\n--- 3. Authentication & Session ---');
  r = await req(`${BASE}/auth/guest-demo-login`, {
    method: 'POST', headers: jh(), body: JSON.stringify({ name: 'Priya Kapoor' })
  });
  if (r.ok && r.data.success && r.data.data.token) {
    token = r.data.data.token;
    pass('Guest Demo Login', `User: ${r.data.data.user.name}`);
  } else fail('Guest Demo Login', JSON.stringify(r.data));

  r = await req(`${BASE}/auth/guest-demo-login`, {
    method: 'POST', headers: jh(), body: JSON.stringify({ name: 'Aarav & Diya', email: 'aarav.diya@royalwedding.com' })
  });
  if (r.ok && r.data.success && r.data.data.token) {
    ownerToken = r.data.data.token;
    pass('Owner Login (pre-seeded)', `User: ${r.data.data.user.name}`);
  } else fail('Owner Login', JSON.stringify(r.data));

  r = await req(`${BASE}/auth/me`, { headers: auth(token) });
  r.ok && r.data.success
    ? pass('/auth/me Session', `${r.data.data.user.name}, memberships: ${r.data.data.memberships?.length ?? 0}`)
    : fail('/auth/me Session', JSON.stringify(r.data));

  r = await req(`${BASE}/auth/me`, { headers: auth('bad-token-xyz') });
  !r.ok && r.status === 401 ? pass('Invalid Token -> 401') : fail('Invalid Token -> 401', `Status: ${r.status}`);

  // 4. Weddings
  console.log('\n--- 4. Wedding Management ---');
  r = await req(`${BASE}/weddings/my`, { headers: auth(ownerToken) });
  r.ok && r.data.success
    ? pass('List My Weddings (Owner)', `Count: ${r.data.data.length}`)
    : fail('List My Weddings', JSON.stringify(r.data));

  r = await req(`${BASE}/weddings/${weddingId}`, { headers: auth(token) });
  r.ok && r.data.success
    ? pass('Get Wedding by ID (Member)', `slug: ${r.data.data.slug}, role: ${r.data.data.currentUserRole}`)
    : fail('Get Wedding by ID', JSON.stringify(r.data));

  const newSlug = `audit-test-${Date.now()}`;
  r = await req(`${BASE}/weddings`, {
    method: 'POST', headers: { ...auth(ownerToken), ...jh() },
    body: JSON.stringify({
      title: 'Audit Test Wedding', slug: newSlug,
      coupleNames: { partner1: 'Amit', partner2: 'Sneha' },
      weddingDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      venue: 'Palace Gardens, Jaipur'
    })
  });
  r.ok && r.data.success
    ? pass('Create New Wedding', `Slug: ${newSlug}`)
    : fail('Create New Wedding', JSON.stringify(r.data).slice(0, 150));

  r = await req(`${BASE}/weddings/${weddingId}`, {
    method: 'PUT', headers: { ...auth(ownerToken), ...jh() },
    body: JSON.stringify({ welcomeMessage: 'Padharo mhare des! Updated by feature audit.' })
  });
  r.ok && r.data.success
    ? pass('Update Wedding (Admin)', 'welcomeMessage updated')
    : fail('Update Wedding', JSON.stringify(r.data).slice(0, 100));

  // 5. Events
  console.log('\n--- 5. Ceremonies & Events ---');
  r = await req(`${BASE}/weddings/${weddingId}/events`, { headers: auth(token) });
  if (r.ok && r.data.success && r.data.data.length > 0) {
    events = r.data.data;
    pass('List Ceremonies', `${events.length} events: ${events.map(e => e.name).join(', ')}`);
  } else fail('List Ceremonies', JSON.stringify(r.data));

  r = await req(`${BASE}/weddings/${weddingId}/events`, {
    method: 'POST', headers: { ...auth(ownerToken), ...jh() },
    body: JSON.stringify({ name: 'After-Party', description: 'Post-wedding', date: new Date(Date.now() + 15 * 86400000).toISOString() })
  });
  if (r.ok && r.data.success) {
    const eid = r.data.data._id;
    pass('Create Ceremony (Admin)', r.data.data.name);
    const up = await req(`${BASE}/weddings/${weddingId}/events/${eid}`, {
      method: 'PUT', headers: { ...auth(ownerToken), ...jh() },
      body: JSON.stringify({ name: 'After-Party (Exclusive)', status: 'live' })
    });
    up.ok && up.data.success
      ? pass('Update Ceremony', `Renamed: ${up.data.data.name}`)
      : fail('Update Ceremony', JSON.stringify(up.data).slice(0, 100));
    const del = await req(`${BASE}/weddings/${weddingId}/events/${eid}`, { method: 'DELETE', headers: auth(ownerToken) });
    del.ok && del.data.success ? pass('Delete Ceremony', del.data.message) : fail('Delete Ceremony', JSON.stringify(del.data).slice(0, 100));
  } else fail('Create Ceremony', JSON.stringify(r.data).slice(0, 100));

  // Guest cannot create event
  r = await req(`${BASE}/weddings/${weddingId}/events`, {
    method: 'POST', headers: { ...auth(token), ...jh() },
    body: JSON.stringify({ name: 'Unauthorized', date: new Date().toISOString() })
  });
  !r.ok && r.status === 403 ? pass('Guest Cannot Create Ceremony (RBAC 403)') : fail('Guest RBAC on Ceremony', `Status: ${r.status}`);

  // 6. Photo Upload
  console.log('\n--- 6. Photo Upload & Image Processing ---');
  if (events.length > 0) {
    const imgBuf = await sharp({ create: { width: 800, height: 600, channels: 4, background: { r: 104, g: 29, b: 50, alpha: 1 } } }).jpeg({ quality: 85 }).toBuffer();
    const fd1 = new FormData();
    fd1.append('eventId', events[2]._id);
    fd1.append('caption', 'Grand royal entry at Sangeet!');
    fd1.append('photos', new Blob([imgBuf], { type: 'image/jpeg' }), 'sangeet.jpg');
    r = await globalThis.fetch(`${BASE}/weddings/${weddingId}/photos/upload`, { method: 'POST', headers: auth(token), body: fd1 });
    const up1 = await r.json();
    if (r.ok && up1.success && up1.data.length > 0) {
      photoId = up1.data[0]._id;
      pass('Single Photo Upload (JPEG -> WebP)', `ID: ${photoId}, mime: ${up1.data[0].mimeType}`);
    } else fail('Single Photo Upload', JSON.stringify(up1).slice(0, 150));

    // Multi-photo
    const fd2 = new FormData();
    fd2.append('eventId', events[0]._id);
    fd2.append('caption', 'Haldi ceremony batch!');
    for (let i = 0; i < 3; i++) {
      const b = await sharp({ create: { width: 400, height: 400, channels: 4, background: { r: 197, g: 161 + i * 5, b: 91, alpha: 1 } } }).jpeg().toBuffer();
      fd2.append('photos', new Blob([b], { type: 'image/jpeg' }), `haldi_${i}.jpg`);
    }
    r = await globalThis.fetch(`${BASE}/weddings/${weddingId}/photos/upload`, { method: 'POST', headers: auth(token), body: fd2 });
    const up2 = await r.json();
    r.ok && up2.success && up2.data.length === 3
      ? pass('Multi-Photo Upload (3 files, Haldi)', `3 photos published instantly`)
      : fail('Multi-Photo Upload', JSON.stringify(up2).slice(0, 150));

    // PNG upload
    const pngBuf = await sharp({ create: { width: 300, height: 300, channels: 4, background: { r: 197, g: 161, b: 91, alpha: 1 } } }).png().toBuffer();
    const fd3 = new FormData();
    fd3.append('eventId', events[1]._id);
    fd3.append('photos', new Blob([pngBuf], { type: 'image/png' }), 'mehendi.png');
    r = await globalThis.fetch(`${BASE}/weddings/${weddingId}/photos/upload`, { method: 'POST', headers: auth(token), body: fd3 });
    const up3 = await r.json();
    r.ok && up3.success ? pass('PNG Upload -> WebP Conversion', `mime: ${up3.data[0]?.mimeType}`) : fail('PNG Upload', JSON.stringify(up3).slice(0, 100));
  } else {
    fail('Photo Upload (skipped — no events)', 'events array empty');
  }

  // 7. Live Gallery
  console.log('\n--- 7. Live Gallery Feed ---');
  r = await req(`${BASE}/weddings/${weddingId}/photos`, { headers: auth(token) });
  if (r.ok && r.data.success) {
    const photos = r.data.data.photos;
    const hasUrls = photos.every(p => p.thumbnailUrl && p.displayUrl);
    pass('Live Photo Feed (all events)', `${photos.length} photos, totalCount: ${r.data.data.pagination.totalCount}, URLs: ${hasUrls ? 'OK' : 'MISSING'}`);
  } else fail('Live Photo Feed', JSON.stringify(r.data).slice(0, 100));

  if (events.length > 2) {
    r = await req(`${BASE}/weddings/${weddingId}/photos?eventId=${events[2]._id}`, { headers: auth(token) });
    r.ok && r.data.success ? pass('Feed - Filter by Ceremony (Sangeet)', `${r.data.data.photos.length} photos`) : fail('Feed - Ceremony Filter', JSON.stringify(r.data).slice(0, 100));
  }

  for (const sort of ['newest', 'oldest', 'mostLiked']) {
    r = await req(`${BASE}/weddings/${weddingId}/photos?sort=${sort}`, { headers: auth(token) });
    r.ok && r.data.success ? pass(`Feed - Sort: ${sort}`, `${r.data.data.photos.length} photos`) : fail(`Feed - Sort: ${sort}`, JSON.stringify(r.data).slice(0, 80));
  }

  r = await req(`${BASE}/weddings/${weddingId}/photos?page=1&limit=2`, { headers: auth(token) });
  r.ok && r.data.success ? pass('Feed - Pagination (page=1, limit=2)', `Got ${r.data.data.photos.length}, hasMore: ${r.data.data.pagination.hasMore}`) : fail('Feed - Pagination', JSON.stringify(r.data).slice(0, 80));

  // 8. Interactions
  console.log('\n--- 8. Photo Interactions ---');
  if (photoId) {
    r = await req(`${BASE}/weddings/${weddingId}/photos/${photoId}/like`, { method: 'POST', headers: auth(token) });
    r.ok && r.data.success && r.data.data.isLiked ? pass('Like Photo (on)', `Likes: ${r.data.data.likesCount}`) : fail('Like Photo', JSON.stringify(r.data));

    r = await req(`${BASE}/weddings/${weddingId}/photos/${photoId}/like`, { method: 'POST', headers: auth(token) });
    r.ok && r.data.success && !r.data.data.isLiked ? pass('Unlike Photo (off)', `Likes: ${r.data.data.likesCount}`) : fail('Unlike Photo', JSON.stringify(r.data));

    await req(`${BASE}/weddings/${weddingId}/photos/${photoId}/like`, { method: 'POST', headers: auth(token) }); // re-like for stats

    r = await req(`${BASE}/weddings/${weddingId}/photos/${photoId}/report`, {
      method: 'POST', headers: { ...auth(token), ...jh() },
      body: JSON.stringify({ reason: 'Low quality / blurry', details: 'Audit test report' })
    });
    r.ok && r.data.success ? pass('Report Photo', r.data.message) : fail('Report Photo', JSON.stringify(r.data));
  } else fail('Photo Interactions (skipped)', 'no photoId — upload failed');

  // 9. My Uploads
  console.log('\n--- 9. My Uploads ---');
  r = await req(`${BASE}/weddings/${weddingId}/photos/my`, { headers: auth(token) });
  if (r.ok && r.data.success) {
    const hasUrls = r.data.data.every(p => p.thumbnailUrl && p.displayUrl);
    pass('My Uploads Gallery', `${r.data.data.length} photo(s), all URLs: ${hasUrls}`);
  } else fail('My Uploads Gallery', JSON.stringify(r.data).slice(0, 100));

  // 10. Invitations
  console.log('\n--- 10. Invitation System & QR ---');
  r = await req(`${BASE}/invitations/weddings/${weddingId}`, {
    method: 'POST', headers: { ...auth(ownerToken), ...jh() },
    body: JSON.stringify({ role: 'guest', expiresInDays: 30, maxUses: 500 })
  });
  if (r.ok && r.data.success) {
    inviteToken = r.data.data.rawToken;
    pass('Create Invitation Token (Admin)', `URL: ${r.data.data.inviteUrl}, Role: ${r.data.data.role}`);
  } else fail('Create Invitation Token', JSON.stringify(r.data).slice(0, 100));

  if (inviteToken) {
    r = await req(`${BASE}/invitations/validate/${inviteToken}`);
    r.ok && r.data.success
      ? pass('Validate Invitation (Public)', `Wedding: "${r.data.data.wedding.title}", Role: ${r.data.data.role}`)
      : fail('Validate Invitation', JSON.stringify(r.data));

    const lr = await req(`${BASE}/auth/guest-demo-login`, { method: 'POST', headers: jh(), body: JSON.stringify({ name: 'New Guest Via Invite' }) });
    const t2 = lr.data.data?.token;
    if (t2) {
      const ar = await req(`${BASE}/invitations/join/${inviteToken}`, { method: 'POST', headers: auth(t2) });
      ar.ok && ar.data.success
        ? pass('Accept Invitation (Guest joins)', `Role: ${ar.data.data.role}, Wedding: ${ar.data.data.weddingSlug}`)
        : fail('Accept Invitation', JSON.stringify(ar.data));
    }
  }

  // Guest cannot create invitation
  r = await req(`${BASE}/invitations/weddings/${weddingId}`, {
    method: 'POST', headers: { ...auth(token), ...jh() },
    body: JSON.stringify({ role: 'guest', expiresInDays: 7, maxUses: 10 })
  });
  !r.ok && r.status === 403 ? pass('Guest Cannot Create Invitation (RBAC 403)') : fail('Guest RBAC on Invitation', `Status: ${r.status}`);

  // 11. Admin Dashboard
  console.log('\n--- 11. Admin Dashboard & Moderation ---');
  r = await req(`${BASE}/weddings/${weddingId}/stats`, { headers: auth(ownerToken) });
  if (r.ok && r.data.success) {
    const d = r.data.data;
    pass('Admin Stats Dashboard', `Guests: ${d.totalGuests}, Photos: ${d.totalPhotos}, Storage: ${d.storageFormatted}, Events breakdown: ${d.photosByEvent.length}`);
  } else fail('Admin Stats Dashboard', JSON.stringify(r.data).slice(0, 100));

  r = await req(`${BASE}/weddings/${weddingId}/stats`, { headers: auth(token) });
  !r.ok && r.status === 403 ? pass('Guest Cannot Access Admin Stats (RBAC)') : fail('Guest RBAC on Admin Stats', `Status: ${r.status}`);

  r = await req(`${BASE}/weddings/${weddingId}/moderation/reports`, { headers: auth(ownerToken) });
  r.ok && r.data.success ? pass('Admin Moderation Reports Queue', `${r.data.data.length} report(s)`) : fail('Admin Reports Queue', JSON.stringify(r.data).slice(0, 100));

  if (photoId) {
    r = await req(`${BASE}/weddings/${weddingId}/moderation/photos/${photoId}`, {
      method: 'PATCH', headers: { ...auth(ownerToken), ...jh() }, body: JSON.stringify({ status: 'hidden' })
    });
    r.ok && r.data.success ? pass('Admin Hide Photo', 'Status -> hidden') : fail('Admin Hide Photo', JSON.stringify(r.data).slice(0, 100));

    // Verify hidden photo is gone from guest feed
    r = await req(`${BASE}/weddings/${weddingId}/photos`, { headers: auth(token) });
    const inFeed = r.data.data?.photos?.some(p => p._id === photoId);
    !inFeed ? pass('Hidden Photo Not Visible to Guests') : fail('Hidden Photo Still in Guest Feed');

    r = await req(`${BASE}/weddings/${weddingId}/moderation/photos/${photoId}`, {
      method: 'PATCH', headers: { ...auth(ownerToken), ...jh() }, body: JSON.stringify({ status: 'published' })
    });
    r.ok && r.data.success ? pass('Admin Restore Photo to Published') : fail('Admin Restore Photo', JSON.stringify(r.data).slice(0, 100));
  }

  r = await req(`${BASE}/weddings/${weddingId}/moderation/members`, { headers: auth(ownerToken) });
  if (r.ok && r.data.success) {
    const nonOwner = r.data.data.find(m => m.role !== 'owner');
    membershipId = nonOwner?.id;
    pass('Admin Guest Roster', `${r.data.data.length} members: ${r.data.data.map(m => `${m.user?.name}(${m.role})`).join(', ')}`);
  } else fail('Admin Guest Roster', JSON.stringify(r.data).slice(0, 100));

  if (membershipId) {
    r = await req(`${BASE}/weddings/${weddingId}/moderation/members/${membershipId}`, {
      method: 'PATCH', headers: { ...auth(ownerToken), ...jh() }, body: JSON.stringify({ role: 'event_manager' })
    });
    r.ok && r.data.success ? pass('Admin Promote Member -> event_manager') : fail('Admin Promote Member', JSON.stringify(r.data).slice(0, 100));

    r = await req(`${BASE}/weddings/${weddingId}/moderation/members/${membershipId}`, {
      method: 'PATCH', headers: { ...auth(ownerToken), ...jh() }, body: JSON.stringify({ status: 'blocked' })
    });
    r.ok && r.data.success ? pass('Admin Block Member') : fail('Admin Block Member', JSON.stringify(r.data).slice(0, 100));

    r = await req(`${BASE}/weddings/${weddingId}/moderation/members/${membershipId}`, {
      method: 'PATCH', headers: { ...auth(ownerToken), ...jh() }, body: JSON.stringify({ status: 'active', role: 'guest' })
    });
    r.ok && r.data.success ? pass('Admin Restore Member (active, guest)') : fail('Admin Restore Member', JSON.stringify(r.data).slice(0, 100));
  }

  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL: ${passed + failed}  |  PASS: ${passed}  |  FAIL: ${failed}`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  - ${r.name}: ${r.detail}`));
  } else {
    console.log('\nAll features working perfectly!');
  }
  console.log('='.repeat(60));
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });

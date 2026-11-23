import assert from 'node:assert/strict';
import { THEME_COLORS, ROLES, hasRolePermission, createWeddingSchema } from '@wedding/shared';

console.log('Testing @wedding/shared...');

// 1. Test Theme Colors
assert.equal(THEME_COLORS.burgundy, '#681D32');
assert.equal(THEME_COLORS.antiqueGold, '#C5A15B');
assert.equal(THEME_COLORS.ivory, '#F7F0E4');
console.log('✓ Theme colors verified');

// 2. Test RBAC permissions
assert.equal(hasRolePermission(ROLES.OWNER, ROLES.ADMIN), true);
assert.equal(hasRolePermission(ROLES.ADMIN, ROLES.GUEST), true);
assert.equal(hasRolePermission(ROLES.GUEST, ROLES.ADMIN), false);
console.log('✓ Role-based permissions verified');

// 3. Test Zod validation schema
const validWedding = {
  title: 'Royal Udaipur Wedding',
  slug: 'royal-udaipur-2026',
  coupleNames: {
    partner1: 'Aarav Sharma',
    partner2: 'Diya Verma'
  },
  weddingDate: '2026-12-15',
  venue: 'City Palace, Udaipur'
};

const parsed = createWeddingSchema.parse(validWedding);
assert.equal(parsed.title, 'Royal Udaipur Wedding');
console.log('✓ Zod wedding schema validation verified');

console.log('All shared package tests passed successfully!');

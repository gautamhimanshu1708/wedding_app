export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EVENT_MANAGER: 'event_manager',
  GUEST: 'guest',
};

export const ROLE_HIERARCHY = {
  [ROLES.OWNER]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.EVENT_MANAGER]: 2,
  [ROLES.GUEST]: 1,
};

export function hasRolePermission(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

export function isOwner(role) {
  return role === ROLES.OWNER;
}

export function isAdminOrAbove(role) {
  return hasRolePermission(role, ROLES.ADMIN);
}

export function isEventManagerOrAbove(role) {
  return hasRolePermission(role, ROLES.EVENT_MANAGER);
}

export const REPORT_REASONS = [
  'Inappropriate content',
  'Not from this wedding',
  'Low quality / blurry',
  'Offensive / Harassment',
  'Copyright issue',
  'Other',
];

export const SOCKET_EVENTS = {
  JOIN_WEDDING: 'join_wedding',
  LEAVE_WEDDING: 'leave_wedding',
  PHOTO_PUBLISHED: 'photo_published',
  PHOTO_LIKED: 'photo_liked',
  PHOTO_UNLIKED: 'photo_unliked',
  PHOTO_REMOVED: 'photo_removed',
  PHOTO_REPORTED: 'photo_reported',
  GUEST_JOINED: 'guest_joined',
  NEW_GUEST_MESSAGE: 'new_guest_message',
};

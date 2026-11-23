import { ROLES, ROLE_HIERARCHY } from './constants.js';

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

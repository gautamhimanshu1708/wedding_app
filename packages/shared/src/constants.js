export const THEME_COLORS = {
  burgundy: '#681D32',
  burgundyDark: '#4A1222',
  burgundyLight: '#852842',
  antiqueGold: '#C5A15B',
  goldDark: '#A6843D',
  goldLight: '#E2CA92',
  ivory: '#F7F0E4',
  ivoryDark: '#EFE5D3',
  deepBrown: '#30231F',
  champagne: '#E8D8BD',
  white: '#FFFFFF',
};

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

export const DEFAULT_EVENTS = [
  { name: 'Haldi', description: 'A vibrant celebration with turmeric paste, music, and joyful blessing ceremonies.' },
  { name: 'Mehendi', description: 'Intricate henna designs, colorful folk dances, and celebratory festivities.' },
  { name: 'Sangeet', description: 'An evening of high-energy music, family dance performances, and celebration.' },
  { name: 'Wedding', description: 'The sacred marriage ceremony, phere, and auspicious royal rituals.' },
  { name: 'Reception', description: 'An elegant royal banquet welcoming the newlyweds with loved ones.' },
];

export const PHOTO_PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  QUARANTINED: 'quarantined',
};

export const PHOTO_PUBLICATION_STATUS = {
  PUBLISHED: 'published',
  HIDDEN: 'hidden',
  REPORTED: 'reported',
  DELETED: 'deleted',
};

export const REPORT_REASONS = [
  'Inappropriate content',
  'Not from this wedding',
  'Low quality / blurry',
  'Offensive / Harassment',
  'Copyright issue',
  'Other',
];

export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB per raw photo
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
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

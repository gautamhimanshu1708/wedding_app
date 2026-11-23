import { DEFAULT_EVENTS, ROLES } from '@wedding/shared';

// Helper to generate string IDs
let idCounter = 1000;
export function generateId() {
  idCounter += 1;
  return `mem_${Date.now()}_${idCounter}`;
}

// In-Memory Storage Arrays
export const memoryStore = {
  users: [],
  weddings: [],
  memberships: [],
  events: [],
  photos: [],
  invitations: [],
  likes: [],
  messages: [],
  reports: [],
};

// Seed default royal wedding into memory store
export function seedMemoryStore() {
  if (memoryStore.weddings.length > 0) return;

  const ownerId = 'user_royal_owner_001';
  const owner = {
    _id: ownerId,
    clerkUserId: ownerId,
    name: 'Aarav & Diya',
    email: 'aarav.diya@royalwedding.com',
    avatar: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=300&q=80',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: async function () { return this; },
    toObject: function () { return { ...this }; },
  };
  memoryStore.users.push(owner);

  const weddingId = 'wedding_royal_udaipur_001';
  const weddingDate = new Date();
  weddingDate.setDate(weddingDate.getDate() + 14);

  const wedding = {
    _id: weddingId,
    title: "Aarav & Diya's Royal Wedding",
    slug: 'royal-udaipur-2026',
    ownerId: ownerId,
    coupleNames: {
      partner1: 'Aarav Sharma',
      partner2: 'Diya Verma',
    },
    weddingDate,
    venue: 'City Palace, Lake Pichola, Udaipur',
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    welcomeMessage: 'Padharo mhare des! Welcome to our royal wedding celebrations. Capture and share your cherished moments with us!',
    theme: {
      primary: '#681D32',
      secondary: '#C5A15B',
      background: '#F7F0E4',
      font: 'Playfair Display',
    },
    settings: {
      allowGuestUploads: true,
      maxPhotosPerGuest: 200,
      isPrivate: false,
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: async function () { return this; },
    toObject: function () { return { ...this }; },
  };
  memoryStore.weddings.push(wedding);

  // Owner membership
  memoryStore.memberships.push({
    _id: generateId(),
    weddingId: weddingId,
    userId: ownerId,
    role: ROLES.OWNER,
    status: 'active',
    joinedAt: new Date(),
    save: async function () { return this; },
    toObject: function () { return { ...this }; },
  });

  // Events
  DEFAULT_EVENTS.forEach((e, index) => {
    const eventDate = new Date(weddingDate);
    eventDate.setDate(eventDate.getDate() - (DEFAULT_EVENTS.length - 1 - index));
    memoryStore.events.push({
      _id: `event_${e.name.toLowerCase()}_00${index + 1}`,
      weddingId: weddingId,
      name: e.name,
      description: e.description,
      date: eventDate,
      coverImage: '',
      status: index === 3 ? 'live' : 'upcoming',
      createdAt: new Date(),
      save: async function () { return this; },
      toObject: function () { return { ...this }; },
    });
  });
}

// Initialize seed
seedMemoryStore();

// Chainable Query Mock
export class MemoryQuery {
  constructor(items) {
    this.items = [...items];
  }

  sort(sortObj = {}) {
    const key = Object.keys(sortObj)[0];
    if (key) {
      const order = sortObj[key];
      this.items.sort((a, b) => {
        const valA = a[key] instanceof Date ? a[key].getTime() : a[key];
        const valB = b[key] instanceof Date ? b[key].getTime() : b[key];
        if (valA < valB) return order === 1 ? -1 : 1;
        if (valA > valB) return order === 1 ? 1 : -1;
        return 0;
      });
    }
    return this;
  }

  skip(n = 0) {
    this.items = this.items.slice(n);
    return this;
  }

  limit(n = 50) {
    this.items = this.items.slice(0, n);
    return this;
  }

  populate(field) {
    this.items = this.items.map((item) => {
      const copy = { ...item };
      if (field === 'uploadedBy' || field === 'userId' || field === 'reportedBy') {
        const uid = copy[field]?._id || copy[field];
        copy[field] = memoryStore.users.find((u) => u._id === uid) || copy[field];
      } else if (field === 'eventId') {
        const eid = copy[field]?._id || copy[field];
        copy[field] = memoryStore.events.find((e) => e._id === eid) || copy[field];
      } else if (field === 'weddingId') {
        const wid = copy[field]?._id || copy[field];
        copy[field] = memoryStore.weddings.find((w) => w._id === wid) || copy[field];
      } else if (field === 'photoId') {
        const pid = copy[field]?._id || copy[field];
        copy[field] = memoryStore.photos.find((p) => p._id === pid) || copy[field];
      }
      return copy;
    });
    return this;
  }

  lean() {
    return this;
  }

  then(resolve, reject) {
    resolve(this.items);
  }
}

export class MemorySingleQuery {
  constructor(item) {
    this.item = item ? { ...item } : null;
  }

  populate(field) {
    if (!this.item) return this;
    if (field === 'uploadedBy' || field === 'userId' || field === 'reportedBy') {
      const uid = this.item[field]?._id || this.item[field];
      this.item[field] = memoryStore.users.find((u) => u._id === uid) || this.item[field];
    } else if (field === 'eventId') {
      const eid = this.item[field]?._id || this.item[field];
      this.item[field] = memoryStore.events.find((e) => e._id === eid) || this.item[field];
    } else if (field === 'weddingId') {
      const wid = this.item[field]?._id || this.item[field];
      this.item[field] = memoryStore.weddings.find((w) => w._id === wid) || this.item[field];
    } else if (field === 'photoId') {
      const pid = this.item[field]?._id || this.item[field];
      this.item[field] = memoryStore.photos.find((p) => p._id === pid) || this.item[field];
    }
    return this;
  }

  lean() {
    return this;
  }

  then(resolve, reject) {
    resolve(this.item);
  }
}

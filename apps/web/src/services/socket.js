import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '@wedding/shared';

class SocketService {
  constructor() {
    this.socket = null;
    this.currentWeddingId = null;
  }

  connect(token) {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (!token) return null;

    const serverUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://royal-wedding-api-6uim.onrender.com' : undefined);

    this.socket = io(serverUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected with id:', this.socket.id);
      if (this.currentWeddingId) {
        this.joinWedding(this.currentWeddingId);
      }
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    return this.socket;
  }

  joinWedding(weddingId) {
    this.currentWeddingId = weddingId;
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.JOIN_WEDDING, { weddingId });
      console.log(`[Socket] Joined wedding room: ${weddingId}`);
    }
  }

  leaveWedding(weddingId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.LEAVE_WEDDING, { weddingId });
    }
    this.currentWeddingId = null;
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();

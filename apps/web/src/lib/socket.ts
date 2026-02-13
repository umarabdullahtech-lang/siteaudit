import { io, Socket } from 'socket.io-client';
import type { AuditProgressEvent, AuditCompleteEvent, AuditErrorEvent } from '@shared/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function subscribeToAudit(
  auditId: string,
  callbacks: {
    onProgress?: (data: AuditProgressEvent) => void;
    onComplete?: (data: AuditCompleteEvent) => void;
    onError?: (data: AuditErrorEvent) => void;
  }
): () => void {
  const s = connectSocket();

  s.emit('subscribeToAudit', auditId);

  if (callbacks.onProgress) s.on('auditProgress', callbacks.onProgress);
  if (callbacks.onComplete) s.on('auditComplete', callbacks.onComplete);
  if (callbacks.onError) s.on('auditError', callbacks.onError);

  // Return cleanup function
  return () => {
    s.emit('unsubscribeFromAudit', auditId);
    if (callbacks.onProgress) s.off('auditProgress', callbacks.onProgress);
    if (callbacks.onComplete) s.off('auditComplete', callbacks.onComplete);
    if (callbacks.onError) s.off('auditError', callbacks.onError);
  };
}

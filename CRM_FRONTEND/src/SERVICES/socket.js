import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

let socket = null;
/** Rooms to (re)join after connect — survives subscribe-before-connect race. */
const subscribedInquiryIds = new Set();

function emitSubscribe(inquiryId) {
  if (!socket || !inquiryId) return;
  socket.emit('inquiry:subscribe', inquiryId);
}

function resubscribeAll() {
  if (!socket?.connected) return;
  for (const id of subscribedInquiryIds) {
    emitSubscribe(id);
  }
}

export function connectSocket(accessToken) {
  if (socket) {
    socket.auth = { token: accessToken };
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: { token: accessToken },
    withCredentials: true,
  });

  socket.on('connect', () => {
    resubscribeAll();
  });

  socket.connect();
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  subscribedInquiryIds.clear();
}

/**
 * Join inquiry room after socket is connected (and again on reconnect).
 */
export function subscribeInquiry(inquiryId) {
  if (!inquiryId) return;
  const id = String(inquiryId);
  subscribedInquiryIds.add(id);
  if (socket?.connected) {
    emitSubscribe(id);
  }
  // else: connect handler will resubscribeAll
}

export function unsubscribeInquiry(inquiryId) {
  if (!inquiryId) return;
  const id = String(inquiryId);
  subscribedInquiryIds.delete(id);
  if (socket?.connected) {
    socket.emit('inquiry:unsubscribe', id);
  }
}

export default { connectSocket, getSocket, disconnectSocket };

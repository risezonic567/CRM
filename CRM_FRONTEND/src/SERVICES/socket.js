import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function connectSocket(accessToken) {
  if (socket?.connected) {
    socket.auth = { token: accessToken };
    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: { token: accessToken },
    withCredentials: true,
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
}

export function subscribeInquiry(inquiryId) {
  if (!socket || !inquiryId) return;
  socket.emit('inquiry:subscribe', inquiryId);
}

export function unsubscribeInquiry(inquiryId) {
  if (!socket || !inquiryId) return;
  socket.emit('inquiry:unsubscribe', inquiryId);
}

export default { connectSocket, getSocket, disconnectSocket };

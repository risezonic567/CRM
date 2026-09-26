import { Server } from 'socket.io';
import config from '../config/index.js';
import { verifyAccessToken } from '../utils/signPublicToken.js';
import logger from '../utils/logger.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.urls.client,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token);
      socket.user = {
        id: decoded.sub,
        role: decoded.role,
        agencyId: decoded.agencyId,
      };
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { userId: socket.user?.id });

    socket.on('inquiry:subscribe', (inquiryId) => {
      if (!inquiryId) return;
      const room = `inquiry_${inquiryId}`;
      socket.join(room);
      logger.debug('Joined room', { room, userId: socket.user?.id });
    });

    socket.on('inquiry:unsubscribe', (inquiryId) => {
      if (!inquiryId) return;
      socket.leave(`inquiry_${inquiryId}`);
    });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { userId: socket.user?.id });
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

export default initSocket;

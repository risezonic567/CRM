import { Server } from 'socket.io';
import config from '../config/index.js';
import { verifyAccessToken } from '../utils/signPublicToken.js';
import { User, Inquiry } from '../models/index.js';
import { ROLES } from '../config/constants.js';
import logger from '../utils/logger.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.urls.client,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub).select(
        '_id role agencyId isActive'
      );
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.user = {
        id: user._id.toString(),
        role: user.role,
        agencyId: user.agencyId?.toString(),
      };
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { userId: socket.user?.id });

    socket.on('inquiry:subscribe', async (inquiryId) => {
      if (!inquiryId || !/^[a-f\d]{24}$/i.test(String(inquiryId))) return;
      try {
        const inquiry = await Inquiry.findById(inquiryId)
          .select('agencyId assignedTo')
          .lean();
        if (!inquiry) return;
        if (String(inquiry.agencyId) !== String(socket.user.agencyId)) return;
        if (
          socket.user.role !== ROLES.ADMIN &&
          String(inquiry.assignedTo) !== String(socket.user.id)
        ) {
          return;
        }
        const room = `inquiry_${inquiryId}`;
        socket.join(room);
        logger.debug('Joined room', { room, userId: socket.user?.id });
      } catch (err) {
        logger.debug('inquiry:subscribe denied', {
          inquiryId,
          message: err.message,
        });
      }
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

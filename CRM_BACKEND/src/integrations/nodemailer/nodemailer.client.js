import nodemailer from 'nodemailer';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

let transporter = null;

export function getMailTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  return transporter;
}

export async function sendMail({ to, subject, html }) {
  const tx = getMailTransporter();
  const info = await tx.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
  });
  logger.info('Email sent', { to, messageId: info.messageId });
  return info;
}

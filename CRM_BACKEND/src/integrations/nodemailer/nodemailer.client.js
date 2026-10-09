import nodemailer from 'nodemailer';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

let transporter = null;

export function getMailTransporter() {
  if (transporter) return transporter;

  if (!config.smtp.user || !config.smtp.pass) {
    throw new Error('SMTP_USER and SMTP_PASS are required to send email');
  }

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  try {
    const tx = getMailTransporter();
    const info = await tx.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });
    logger.info('Email sent', { to, messageId: info.messageId });
    return info;
  } catch (err) {
    logger.error('Email send failed', {
      to,
      code: err.code,
      response: err.response,
      message: err.message,
    });
    throw err;
  }
}

export async function verifyMail() {
  try {
    const tx = getMailTransporter();
    await tx.verify();
    logger.info('SMTP connection verified');
  } catch (err) {
    logger.error('SMTP verify failed', {
      code: err.code,
      response: err.response,
      message: err.message,
    });
  }
}

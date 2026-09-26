const levels = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  debug: 'DEBUG',
};

function format(level, message, meta) {
  const time = new Date().toISOString();
  const extra = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${time}] [${levels[level] || level}] ${message}${extra}`;
}

const logger = {
  info: (message, meta = {}) => console.log(format('info', message, meta)),
  warn: (message, meta = {}) => console.warn(format('warn', message, meta)),
  error: (message, meta = {}) => console.error(format('error', message, meta)),
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(format('debug', message, meta));
    }
  },
};

export default logger;

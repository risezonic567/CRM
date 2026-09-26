import morgan from 'morgan';
import config from '../config/index.js';

const loggerMiddleware =
  config.env === 'production'
    ? morgan('combined')
    : morgan('dev');

export default loggerMiddleware;

import * as Sentry from '@sentry/browser';
const init = options =>
  Sentry.init({ dsn: 'http://802c25779be04b20b1c1d0ba76e08093@10.12.19.231:32396/3', ...options });
export default {
  ...Sentry,
  init,
};

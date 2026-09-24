let logger: any;

logger = {
  info: (obj: any, msg?: string) => {
    if (typeof obj === 'string') {
      console.log(`[INFO] ${obj}`);
    } else {
      console.log(`[INFO]`, msg ?? '', obj);
    }
  },
  warn: (obj: any, msg?: string) => {
    if (typeof obj === 'string') {
      console.warn(`[WARN] ${obj}`);
    } else {
      console.warn(`[WARN]`, msg ?? '', obj);
    }
  },
  error: (obj: any, msg?: string) => {
    if (typeof obj === 'string') {
      console.error(`[ERROR] ${obj}`);
    } else {
      console.error(`[ERROR]`, msg ?? '', obj);
    }
  },
  debug: (obj: any, msg?: string) => {
    if (typeof obj === 'string') {
      console.debug(`[DEBUG] ${obj}`);
    } else {
      console.debug(`[DEBUG]`, msg ?? '', obj);
    }
  },
  child: () => logger,
};

export { logger };

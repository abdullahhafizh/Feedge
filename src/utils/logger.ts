export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function createLogger(moduleName: string) {
  const log = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
    if (LEVELS[level] < LEVELS[currentLevel]) return;

    const timestamp = new Date().toISOString();
    const base = `${timestamp} [${level.toUpperCase()}][${moduleName}] ${message}`;
    const ctx = context ? ` ${JSON.stringify(context)}` : '';
    const line = base + ctx;

    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  };

  return {
    debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
    info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
    warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
    error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
  };
}

export function logTestResult(phaseCode: string, description: string, passed: boolean): void {
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${phaseCode}][${status}] ${description}`);
}


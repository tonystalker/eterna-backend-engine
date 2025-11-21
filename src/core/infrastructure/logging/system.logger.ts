import { env } from '../config/env.config';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  metadata?: Record<string, any>;
  correlationId?: string;
}

class SystemLogger {
  private module: string;
  private correlationId?: string;

  constructor(module: string, correlationId?: string) {
    this.module = module;
    this.correlationId = correlationId;
  }

  private formatMessage(level: string, message: string, metadata?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: `[${level}]`,
      module: `(${this.module})`,
      message,
      metadata,
      correlationId: this.correlationId,
    };
  }

  private log(entry: LogEntry) {
    const formatted = `[${entry.timestamp}] ${entry.level} ${entry.module} ${entry.message}`;
    
    if (env.NODE_ENV === 'development') {
      const colorCode = this.getColorCode(entry.level);
      const reset = '\x1b[0m';
      console.log(`${colorCode}${formatted}${reset}`);
      
      if (entry.metadata) {
        console.log('  📋 Metadata:', JSON.stringify(entry.metadata, null, 2));
      }
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  private getColorCode(level: string): string {
    const colors = {
      '[TRACE]': '\x1b[37m',    // White
      '[DEBUG]': '\x1b[36m',    // Cyan
      '[INFO]': '\x1b[32m',     // Green
      '[WARN]': '\x1b[33m',     // Yellow
      '[ERROR]': '\x1b[31m',    // Red
      '[FATAL]': '\x1b[35m',    // Magenta
    };
    return colors[level as keyof typeof colors] || '\x1b[0m';
  }

  trace(message: string, metadata?: Record<string, any>) {
    this.log(this.formatMessage('TRACE', message, metadata));
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.log(this.formatMessage('DEBUG', message, metadata));
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log(this.formatMessage('INFO', message, metadata));
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log(this.formatMessage('WARN', message, metadata));
  }

  error(message: string, metadata?: Record<string, any>) {
    this.log(this.formatMessage('ERROR', message, metadata));
  }

  fatal(message: string, metadata?: Record<string, any>) {
    this.log(this.formatMessage('FATAL', message, metadata));
  }

  withCorrelation(correlationId: string): SystemLogger {
    return new SystemLogger(this.module, correlationId);
  }
}

export function createLogger(module: string): SystemLogger {
  return new SystemLogger(module);
}

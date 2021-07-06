import { LogLevel } from './log-level.enum';
import { argv } from 'yargs';
import chalk from 'chalk';

export class Logger {
  public logLevel: LogLevel;

  public constructor() {
    /* istanbul ignore else */
    if (!argv['log-level']) {
      this.logLevel = LogLevel.INFO;
      return;
    }

    /* istanbul ignore next */
    switch (argv['log-level'].toUpperCase()) {
      case 'DEBUG':
        this.logLevel = LogLevel.DEBUG;
        break;
      case 'WARNING':
        this.logLevel = LogLevel.WARNING;
        break;
      case 'ERROR':
        this.logLevel = LogLevel.ERROR;
        break;
      case 'INFO':
      default:
        this.logLevel = LogLevel.INFO;
        break;
    }
  }

  public debug(message: any, bold: boolean = false): void {
    this.log(message, chalk.dim, bold, LogLevel.DEBUG);
  }

  public info(message: any, bold: boolean = false): void {
    this.log(message, chalk.reset, bold, LogLevel.INFO);
  }

  public warn(message: any, bold: boolean = false): void {
    this.log(message, chalk.yellow, bold, LogLevel.WARNING);
  }

  public error(message: any, bold: boolean = false): void {
    this.log(message, chalk.red, bold, LogLevel.ERROR);
  }

  public success(message: any, bold: boolean = false): void {
    this.log(message, chalk.green, bold, LogLevel.INFO);
  }

  public log(message: any, color: any, bold: boolean, logLevel: LogLevel): void {
    if (this.logLevel < logLevel) {
      return;
    }

    const text = bold ? chalk.bold(message) : message;
    console.log(`${ color(text) }`);
  }
}

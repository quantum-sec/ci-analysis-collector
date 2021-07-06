import { LogLevel } from './log-level.enum';
import chalk from 'chalk';
import { Logger } from './logger';

describe('Logger', () => {

  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  describe('constructor()', () => {
    it('should set the default log level to INFO', () => {
      expect(logger.logLevel).toEqual(LogLevel.INFO);
    });
  });

  function chalkFunctionEqualityTester(a, b): boolean | void {
    if (typeof a === 'function' && typeof b === 'function') {
      return a._styles.open === b._styles.open;
    }
  }

  function setupLoggerTest(method: string, color: any, logLevel: LogLevel): void {
    describe(`${ method }()`, () => {
      beforeEach(() => {
        jasmine.addCustomEqualityTester(chalkFunctionEqualityTester);
        spyOn(logger, 'log');
      });

      it(`should log the ${ method } message with the expected color`, () => {
        logger[method]('TEST_MESSAGE');
        expect(logger.log).toHaveBeenCalledTimes(1);
        expect(logger.log).toHaveBeenCalledWith('TEST_MESSAGE', chalk.dim, false, logLevel);
      });

      it(`should log the ${ method } message with bold text when specified`, () => {
        logger[method]('TEST_MESSAGE', true);
        expect(logger.log).toHaveBeenCalledTimes(1);
        expect(logger.log).toHaveBeenCalledWith('TEST_MESSAGE', chalk.reset, true, logLevel);
      });
    });
  }

  setupLoggerTest('debug', chalk.dim, LogLevel.DEBUG);
  setupLoggerTest('info', chalk.reset, LogLevel.INFO);
  setupLoggerTest('warn', chalk.yellow, LogLevel.WARNING);
  setupLoggerTest('error', chalk.red, LogLevel.ERROR);
  setupLoggerTest('success', chalk.green, LogLevel.INFO);

  function setupLogLevelTest(logLevel: LogLevel, calls: number): void {
    it(`should log messages <= the log level when the log level is ${ logLevel }`, () => {
      logger.logLevel = logLevel;
      logger.log('TEST_MESSAGE', chalk.magenta, false, LogLevel.DEBUG);
      logger.log('TEST_MESSAGE', chalk.magenta, false, LogLevel.INFO);
      logger.log('TEST_MESSAGE', chalk.magenta, true, LogLevel.WARNING);
      logger.log('TEST_MESSAGE', chalk.magenta, true, LogLevel.ERROR);
      expect(console.log).toHaveBeenCalledTimes(calls);
    });
  }

  describe('log()', () => {
    beforeEach(() => {
      spyOn(console, 'log');
    });

    setupLogLevelTest(LogLevel.DEBUG, 4);
    setupLogLevelTest(LogLevel.INFO, 3);
    setupLogLevelTest(LogLevel.WARNING, 2);
    setupLogLevelTest(LogLevel.ERROR, 1);
  });
});

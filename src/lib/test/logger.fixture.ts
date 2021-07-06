import { Logger } from '../utils';

export function createLoggerFixture(): Logger {
  const fixture: Logger = new Logger();
  fixture.debug = jasmine.createSpy();
  fixture.error = jasmine.createSpy();
  fixture.info = jasmine.createSpy();
  fixture.success = jasmine.createSpy();
  fixture.warn = jasmine.createSpy();

  return fixture;
}

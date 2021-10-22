import { Logger } from '../utils';
import { createLoggerFixture } from '../test/logger.fixture';
import { SonarqubeCollector } from './sonarqube-collector';
import { CheckResult } from '../check-result';

describe('SonarqubeCollector', () => {

  let collector: SonarqubeCollector;
  let logger: Logger;

  beforeEach(() => {
    logger = createLoggerFixture();
    collector = new SonarqubeCollector(logger);

    spyOn(collector, 'spawn').and.returnValue(new Promise((resolve) => {
      resolve('TEST_OUTPUT');
    }));
  });

  describe('constructor()', () => {
    it('should set the tool ID', () => {
      expect(collector.toolId).toEqual('sonarqube');
    });
  });

  describe('getToolVersion()', () => {
    it('should call trivy with the --version flag', async () => {
      const result = await collector.getToolVersion({});
      expect(result).toEqual('TEST_OUTPUT');
      expect(collector.spawn).toHaveBeenCalledTimes(1);
      expect(collector.spawn).toHaveBeenCalledWith('sonar-scanner', ['--version'], {});
    });
  });

  describe('getResults()', () => {
    const oldEnv = process.env;

    beforeEach(() => {
      process.env = { ...oldEnv };
    });

    afterEach(() => {
      process.env = oldEnv;
    });

    it('should call sonarqube with preset options', async () => {
      collector._argv = {
        'proj-dir': 'TEST_PROJECT_DIR',
      } as any;
      process.env.LOGIN = 'TEST_LOGIN';
      process.env.KEY = 'TEST_PROJECT_KEY';
      process.env.USERNAME = 'TEST_USERNAME';
      process.env.PASSWORD = 'TEST_PASSWORD';

      collector.http.get = jasmine.createSpy().and.callFake(async (args) => new Promise(resolve => {
        resolve({
          status: 200,
          data: 'TEST_OUTPUT',
        });
      }));

      spyOn(collector, 'parseResults').and.returnValue('TEST_RESULTS' as any);
      const result = await collector.getResults({});
      expect(result).toEqual('TEST_RESULTS' as any);

      const expectedArgs = [
        '-Dsonar.login=' + 'TEST_LOGIN',
        '-Dsonar.projectKey=' + 'TEST_PROJECT_KEY',
        '-Dsonar.projectBaseDir=' + 'TEST_PROJECT_DIR',
      ];
      expect(collector.spawn).toHaveBeenCalledTimes(1);
      expect(collector.spawn).toHaveBeenCalledWith('sonar-scanner', expectedArgs, {});

      expect(collector.parseResults).toHaveBeenCalledTimes(1);
      expect(collector.parseResults).toHaveBeenCalledWith('"TEST_OUTPUT"');
    });

    it('should error when authentication token is not specified', async () => {
      collector._argv = {
        'proj-dir': 'TEST_PROJECT_DIR',
      } as any;
      process.env.KEY = 'TEST_PROJECT_KEY';
      process.env.USERNAME = 'TEST_USERNAME';
      process.env.PASSWORD = 'TEST_PASSWORD';
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify authentication token in the config.'));
    });

    it('should error when unique SonarQube instance is not specified', async () => {
      collector._argv = {
        'proj-dir': 'TEST_PROJECT_DIR',
      } as any;
      process.env.LOGIN = 'TEST_LOGIN';
      process.env.USERNAME = 'TEST_USERNAME';
      process.env.PASSWORD = 'TEST_PASSWORD';
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify projectkey in the config.'));
    });

    it('should error when directory to scan is not specified', async () => {
      process.env.LOGIN = 'TEST_LOGIN';
      process.env.KEY = 'TEST_PROJECT_KEY';
      process.env.USERNAME = 'TEST_USERNAME';
      process.env.PASSWORD = 'TEST_PASSWORD';
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify a --proj-dir argument.'));
    });

    it('should error when SonarQube username is not specified', async () => {
      collector._argv = {
        'proj-dir': 'TEST_PROJECT_DIR',
      } as any;
      process.env.LOGIN = 'TEST_LOGIN';
      process.env.KEY = 'TEST_PROJECT_KEY';
      process.env.PASSWORD = 'TEST_PASSWORD';
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify username in the config.'));
    });

    it('should error when SonarQube password is not specified', async () => {
      collector._argv = {
        'proj-dir': 'TEST_PROJECT_DIR',
      } as any;
      process.env.LOGIN = 'TEST_LOGIN';
      process.env.KEY = 'TEST_PROJECT_KEY';
      process.env.USERNAME = 'TEST_USERNAME';
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify password in the config.'));
    });
  });

  describe('parseResults()', () => {

    let raw: string;

    beforeEach(()=> {
      raw = JSON.stringify({
        issues: [{
          rule: 'TEST_RULE',
          message: 'TEST_MESSAGE',
          type: 'TEST_TYPE',
          component: 'TEST_COMPONENT',
          textRange: [],
        }],
      });
    });

    it('should report passing when the result contains no issues', () => {
      raw = JSON.stringify([{}]);
      const result = collector.parseResults(raw)[0];
      expect(result.checkResult).toEqual(CheckResult.PASS);
    });

    it('should report failing when the result contains issues', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.checkResult).toEqual(CheckResult.FAIL);
    });

    it('should set the checkID to the rule', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.checkId).toEqual('TEST_RULE');
    });

    it('should set the checkName to the message', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.checkName).toEqual('TEST_MESSAGE');
    });

    it('should set the checkType to type', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.checkType).toEqual('TEST_TYPE');
    });

    it('should set the resourceId to component', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.resourceId).toEqual('TEST_COMPONENT');
    });

    it('should set the fileLineRange to array ', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.fileLineRange).toEqual([]);
    });
  });

});

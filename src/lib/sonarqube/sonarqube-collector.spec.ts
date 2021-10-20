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
    it('should call sonarqube with preset options', async () => {
      collector._argv = {
        'dsonar-login': 'TEST_LOGIN',
        'dsonar-projectkey': 'TEST_PROJECT_KEY',
        'dsonar-projectdir': 'TEST_PROJECT_DIR',
        'dsonar-username': 'TEST_USERNAME',
        'dsonar-password': 'TEST_PASSWORD',
      } as any;

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
        'dsonar-projectkey': 'TEST_PROJECT_KEY',
        'dsonar-projectdir': 'TEST_PROJECT_DIR',
        'dsonar-username': 'TEST_USERNAME',
        'dsonar-password': 'TEST_PASSWORD',
      } as any;
      spyOn(collector, 'parseResults').and.returnValue('TEST_RESULTS' as any);
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify a --dsonar-login argument.'));
    });

    it('should error when unique SonarQube instance is not specified', async () => {
      collector._argv = {
        'dsonar-login': 'TEST_LOGIN',
        'dsonar-projectdir': 'TEST_PROJECT_DIR',
        'dsonar-username': 'TEST_USERNAME',
        'dsonar-password': 'TEST_PASSWORD',
      } as any;
      spyOn(collector, 'parseResults').and.returnValue('TEST_RESULTS' as any);
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify a --dsonar-projectkey argument.'));
    });

    it('should error when directory to scan is not specified', async () => {
      collector._argv = {
        'dsonar-login': 'TEST_LOGIN',
        'dsonar-projectkey': 'TEST_PROJECT_KEY',
        'dsonar-username': 'TEST_USERNAME',
        'dsonar-password': 'TEST_PASSWORD',
      } as any;
      spyOn(collector, 'parseResults').and.returnValue('TEST_RESULTS' as any);
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify a --dsonar-projectdir argument.'));
    });

    it('should error when SonarQube username is not specified', async () => {
      collector._argv = {
        'dsonar-login': 'TEST_LOGIN',
        'dsonar-projectkey': 'TEST_PROJECT_KEY',
        'dsonar-projectdir': 'TEST_PROJECT_DIR',
        'dsonar-password': 'TEST_PASSWORD',
      } as any;
      spyOn(collector, 'parseResults').and.returnValue('TEST_RESULTS' as any);
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify a --dsonar-username argument.'));
    });

    it('should error when SonarQube password is not specified', async () => {
      collector._argv = {
        'dsonar-login': 'TEST_LOGIN',
        'dsonar-projectkey': 'TEST_PROJECT_KEY',
        'dsonar-projectdir': 'TEST_PROJECT_DIR',
        'dsonar-username': 'TEST_USERNAME',
      } as any;
      spyOn(collector, 'parseResults').and.returnValue('TEST_RESULTS' as any);
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify a --dsonar-password argument.'));
    });

  });

  describe('parseResults()', () => {

    let raw: string;

    beforeEach(()=> {
      raw = JSON.stringify({
        issues: [{
          rule: 'TEST_RULE',
          type: 'TEST_TYPE',
          component: 'TEST_COMPONENT',
          textRange: [],
          message: 'TEST_MESSAGE',
          hash: 'TEST_HASH',
          debt: 'TEST_DEBT',
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

    it('should set the checkName to the rule', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.checkName).toEqual('TEST_RULE');
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

    it('should set the codeRule to rule', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.codeRule).toEqual('TEST_RULE');
    });

    it('should set the codeMessage to rule', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.codeMessage).toEqual('TEST_MESSAGE');
    });

    it('should set the codeHash to rule', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.codeHash).toEqual('TEST_HASH');
    });

    it('should set the codeDebt to rule', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.codeDebt).toEqual('TEST_DEBT');
    });
  });

});

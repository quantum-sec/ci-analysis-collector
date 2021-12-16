import { Logger } from '../utils';
import { createLoggerFixture } from '../test/logger.fixture';
import { ZapCollector } from './zap-collector';
import { CheckResult } from '../check-result';

describe('ZapCollector', () => {

  let collector: ZapCollector;
  let logger: Logger;

  beforeEach(() => {
    logger = createLoggerFixture();
    collector = new ZapCollector(logger);

    spyOn(collector, 'spawn').and.returnValue(new Promise((resolve) => {
      resolve('TEST_OUTPUT');
    }));
  });

  describe('constructor()', () => {
    it('should set the tool ID', () => {
      expect(collector.toolId).toEqual('zap');
    });
  });

  describe('getToolVersion()', () => {
    it('should call zap with the -version flag', async () => {
      const result = await collector.getToolVersion({});
      expect(result).toEqual('TEST_OUTPUT');
      expect(collector.spawn).toHaveBeenCalledTimes(1);
      expect(collector.spawn).toHaveBeenCalledWith('zap.sh',
        ['-cmd -version'],
        {});
    });
  });

  describe('getResults()', () => {
    it('should call zap with preset options', async () => {
      collector._argv = {
        'target-name': 'TEST_TARGET',
      } as any;
      spyOn(collector.fs, 'readFileSync').and.returnValue('TEST_OUTPUT');
      spyOn(collector, 'parseResults').and.returnValue('TEST_RESULTS' as any);
      const result = await collector.getResults({});
      expect(result).toEqual('TEST_RESULTS' as any);

      const expectedArgs = [
        '-t',
        'TEST_TARGET',
        '-J zapreport.json',
        '-s',
      ];
      expect(collector.spawn).toHaveBeenCalledTimes(1);
      expect(collector.spawn).toHaveBeenCalledWith('zap-full-scan.py', expectedArgs, {});

      expect(collector.parseResults).toHaveBeenCalledTimes(1);
      expect(collector.parseResults).toHaveBeenCalledWith('TEST_OUTPUT');
    });
    it('should error when target name is not specified', async () => {
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify an --target-name argument.'));
    });
    it('should error when target name cannot be found', async () => {
      collector._argv = {
        'target-name': 'TEST_TARGET',
      } as any;
      (collector.spawn as any).and.returnValue(new Promise((resolve, reject) => {
        reject('TEST_OUTPUT');
      }));

      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('Error executing Zap: TEST_OUTPUT'));
    });

  });

  describe('parseResults()', () => {

    let raw: string;

    beforeEach(()=> {
      raw = JSON.stringify([{
        alerts: [{
          pluginid: 'TEST_PLUGIN_ID',
          alert: 'TEST_ALERT',
          instances: {
            uri: 'TEST_URI',
            method: 'TEST_METHOD',
          },
        }],
      }]);
    });

    it('should report passing when the result contains no vulnerabilities', () => {
      raw = JSON.stringify([{}]);
      const result = collector.parseResults(raw)[0];
      expect(result.checkResult).toEqual(CheckResult.PASS);
    });

    it('should report failing when no vulnerabilities were found', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.checkResult).toEqual(CheckResult.FAIL);
    });

    it('should set the checkId to pluginid', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.checkId).toEqual('TEST_PLUGIN_ID');
    });

    it('should set the checkName to the alert name', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.checkName).toEqual('TEST_ALERT');
    });

    it('should set the resourceId to instances.uri', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.resourceId).toEqual('TEST_URI');
    });

    it('should set the checkMethod to instances.method', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.checkMethod).toEqual('TEST_METHOD');
    });

  });

});

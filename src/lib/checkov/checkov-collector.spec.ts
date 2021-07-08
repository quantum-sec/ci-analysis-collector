import { Logger } from '../utils';
import { createLoggerFixture } from '../test/logger.fixture';
import { CheckovCollector } from './checkov-collector';
import { CheckResult } from '../check-result';
import { IResult } from '../result.interface';

describe('CheckovCollector', () => {

  let collector: CheckovCollector;
  let logger: Logger;

  beforeEach(() => {
    logger = createLoggerFixture();
    collector = new CheckovCollector(logger);

    spyOn(collector, 'spawn').and.returnValue(new Promise((resolve) => {
      resolve('TEST_OUTPUT');
    }));
  });

  describe('constructor()', () => {
    it('should set the tool ID', () => {
      expect(collector.toolId).toEqual('checkov');
    });
  });

  describe('getToolVersion()', () => {
    it('should call checkov with the --version flag', async () => {
      const result = await collector.getToolVersion({});
      expect(result).toEqual('TEST_OUTPUT');
      expect(collector.spawn).toHaveBeenCalledTimes(1);
      expect(collector.spawn).toHaveBeenCalledWith('checkov', ['--version'], {});
    });
  });

  describe('getResults()', () => {
    it('should call checkov with preset options', async () => {
      spyOn(collector, 'parseResults').and.returnValue('TEST_RESULTS' as any);
      const result = await collector.getResults({});
      expect(result).toEqual('TEST_RESULTS' as any);

      const expectedArgs = ['--directory', '.', '--output', 'json', '--no-guide', '--soft-fail'];
      expect(collector.spawn).toHaveBeenCalledTimes(1);
      expect(collector.spawn).toHaveBeenCalledWith('checkov', expectedArgs, {});

      expect(collector.parseResults).toHaveBeenCalledTimes(1);
      expect(collector.parseResults).toHaveBeenCalledWith('TEST_OUTPUT');
    });
  });

  describe('parseResults()', () => {
    let raw: string;

    beforeEach(() => {
      /* eslint-disable @typescript-eslint/naming-convention, camelcase */
      raw = JSON.stringify([{
        check_type: 'TEST_CHECK_TYPE',
        results: {
          passed_checks: [{
            check_result: {
              result: 'PASSED',
            },
            resource: 'TEST_RESOURCE_ID_0',
          }],
          failed_checks: [{
            check_result: {
              result: 'FAILED',
            },
            resource: 'TEST_RESOURCE_ID_1',
            file_path: '/test/path.file',
            file_line_range: [42, 42],
            code_block: [[42, '# TEST LINE OF CODE']],
          }],
          skipped_checks: [{
            check_result: {
              result: 'SKIPPED',
            },
            resource: 'TEST_RESOURCE_ID_2',
          }],
          parsing_errors: [{
            check_result: {
              result: 'ERRORED',
            },
          }],
        },
      }]);
      /* eslint-enable @typescript-eslint/naming-convention, camelcase */
    });

    it('should include all checks', () => {
      const results = collector.parseResults(raw);

      const checkResults = results.map(x => x.checkResult);
      expect(checkResults).toContain(CheckResult.PASS);
      expect(checkResults).toContain(CheckResult.FAIL);
      expect(checkResults).toContain(CheckResult.SKIPPED);
    });
  });

  describe('createResult()', () => {

    let check: any;
    let result: IResult;

    beforeEach(() => {
      /* eslint-disable @typescript-eslint/naming-convention, camelcase */
      check = {
        check_id: 'TEST_CHECK_ID',
        check_name: 'TEST_CHECK_NAME',
        resource: 'module.example.test.',
        file_path: '/test/file/path.tf',
        file_line_range: [0, 99],
      };
      /* eslint-enable @typescript-eslint/naming-convention, camelcase */

      result = collector.createResult(check, 'TEST_CHECK_TYPE', CheckResult.PASS);
    });

    it('should map check_id to checkId', () => {
      expect(result.checkId).toEqual('TEST_CHECK_ID');
    });

    it('should map check_name to checkName', () => {
      expect(result.checkName).toEqual('TEST_CHECK_NAME');
    });

    it('should pass through the check type', () => {
      expect(result.checkType).toEqual('TEST_CHECK_TYPE');
    });

    it('should remove the trailing period from the resource ID', () => {
      expect(result.resourceId).toEqual('module.example.test');
    });

    it('should map file_path to filePath', () => {
      expect(result.filePath).toEqual('/test/file/path.tf');
    });

    it('should map file_line_range to fileLineRange using a 1-based index', () => {
      expect(result.fileLineRange).toEqual([1, 100]);
    });
  });

});

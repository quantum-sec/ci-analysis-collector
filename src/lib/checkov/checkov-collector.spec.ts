import { Logger } from '../utils';
import { createLoggerFixture } from '../test/logger.fixture';
import { CheckovCollector } from './checkov-collector';
import { CheckResult } from '../check-result';

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
          parsing_errors: [],
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

  // describe('createResult()', () => {

  // });

});

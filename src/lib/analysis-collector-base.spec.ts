import { AnalysisCollectorBase } from './analysis-collector-base';
import { CheckResult } from './check-result';
import { IResult } from './result.interface';
import { Logger } from './utils';
import { chalkFunctionEqualityTester } from './utils/logger.spec';
import chalk from 'chalk';
import sinon from 'sinon';
import events from 'events';
import stream from 'stream';
import cp, { ChildProcess } from 'child_process';

class ConcreteAnalysisCollector extends AnalysisCollectorBase {
  public async getToolVersion(options: any): Promise<string> {
    return new Promise((resolve) => resolve('TEST_TOOL_VERSION'));
  }

  public async getResults(options: any): Promise<IResult[]> {
    return new Promise((resolve) => resolve([]));
  }
}

describe('AnalysisCollectorBase', () => {

  let logger: Logger;
  let collector: ConcreteAnalysisCollector;

  beforeEach(() => {
    spyOn(console, 'log');
    logger = new Logger();
    collector = new ConcreteAnalysisCollector('TEST_TOOL_ID', logger);
    spyOn(collector, '_request').and.returnValue(new Promise((resolve) => resolve('TEST_RESPONSE' as any)));
  });

  describe('constructor()', () => {
    it('should create a trace ID', () => {
      expect(collector.traceId).toBeTruthy();
    });

    it('should record the timestamp', () => {
      expect(collector.timestamp).toBeTruthy();
    });
  });

  describe('exec()', () => {
    beforeEach(() => {
      spyOn(collector, 'getResults').and.returnValue(new Promise((resolve) => resolve(['TEST_RESULT' as any])));
      spyOn(collector, 'printResults');
      spyOn(collector, 'postResults');
    });

    it('should call getResults() with the merged options', async () => {
      await collector.exec({});
      expect(collector.getResults).toHaveBeenCalledTimes(1);
    });

    it('should call printResults() with the generated results', async () => {
      await collector.exec({ cwd: '/test/', quiet: false });
      expect(collector.printResults).toHaveBeenCalledTimes(1);
      expect(collector.printResults).toHaveBeenCalledWith(['TEST_RESULT' as any], false);
    });

    it('should call postResults() with the generated results when an API token is present', async () => {
      collector.apiToken = 'TEST_API_TOKEN';
      await collector.exec({ cwd: '/test/' });
      expect(collector.postResults).toHaveBeenCalledTimes(1);
      expect(collector.postResults).toHaveBeenCalledWith(['TEST_RESULT' as any], jasmine.any(Object));
    });

    it('should not call postResults() when an API token is not present', async () => {
      collector.apiToken = null;
      await collector.exec({ cwd: '/test/' });
      expect(collector.postResults).not.toHaveBeenCalled();
    });
  });

  describe('detectApiToken()', () => {
    it('should use the environment variable if supplied', () => {
      delete process.env.QS_API_TOKEN;
      collector.detectApiToken();
      expect(collector.apiToken).toBeFalsy();

      process.env.QS_API_TOKEN = 'TEST_API_TOKEN';
      collector.detectApiToken();
      expect(collector.apiToken).toEqual('TEST_API_TOKEN');
    });
  });

  describe('getLineColor()', () => {
    beforeEach(() => {
      jasmine.addCustomEqualityTester(chalkFunctionEqualityTester);
    });

    it('should return green when the result is passing', () => {
      const result = collector.getLineColor(CheckResult.PASS);
      expect(result).toEqual(chalk.green);
    });

    it('should return red when the result is failing', () => {
      const result = collector.getLineColor(CheckResult.FAIL);
      expect(result).toEqual(chalk.red);
    });

    it('should return yellow when the result is erroring', () => {
      const result = collector.getLineColor(CheckResult.ERRORED);
      expect(result).toEqual(chalk.yellow);
    });

    it('should return dim when the result is skipped', () => {
      const result = collector.getLineColor(CheckResult.SKIPPED);
      expect(result).toEqual(chalk.dim);
    });
  });

  describe('printResults()', () => {
    let resultFixture: IResult;

    beforeEach(() => {
      resultFixture = {
        checkResult: CheckResult.FAIL,
        checkId: 'TEST_CHECK_ID',
        checkName: 'TEST_CHECK_NAME',
        resourceId: 'TEST_RESOURCE_ID',
        checkType: 'TEST_CHECK_TYPE',
      };
    });

    function getConsoleOutput(results: IResult[], quiet: boolean = false): string {
      collector.printResults(results, quiet);
      expect(console.log).toHaveBeenCalledTimes(1);
      return (console.log as jasmine.Spy).calls.argsFor(0)[0];
    }

    it('should write passing checks to the console when the quiet option is false', () => {
      resultFixture.checkResult = CheckResult.PASS;
      const result = getConsoleOutput([resultFixture], false);
      expect(result).toContain('PASS');
    });

    it('should not write passing checks to the console when the quiet option is true', () => {
      resultFixture.checkResult = CheckResult.PASS;
      collector.printResults([resultFixture], true);
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should write the check ID to the console', () => {
      const result = getConsoleOutput([resultFixture]);
      expect(result).toContain('TEST_CHECK_ID');
    });

    it('should write the check name to the console', () => {
      const result = getConsoleOutput([resultFixture]);
      expect(result).toContain('TEST_CHECK_NAME');
    });

    it('should write the check type to the console', () => {
      const result = getConsoleOutput([resultFixture]);
      expect(result).toContain('TEST_CHECK_TYPE');
    });

    it('should write the resource ID to the console', () => {
      const result = getConsoleOutput([resultFixture]);
      expect(result).toContain('TEST_RESOURCE_ID');
    });

    it('should write the file path to the console when the result includes one', () => {
      resultFixture.filePath = '/path/to/file.txt';
      const result = getConsoleOutput([resultFixture]);
      expect(result).toContain('File: /path/to/file.txt');
    });

    it('should suffix the file path with a line number when there is a single line ref', () => {
      resultFixture.filePath = '/path/to/file.txt';
      resultFixture.fileLineRange = [1, 1];
      const result = getConsoleOutput([resultFixture]);
      expect(result).toContain('File: /path/to/file.txt:1');
    });

    it('should suffix the file path with a line range when there are multiple line refs', () => {
      resultFixture.filePath = '/path/to/file.txt';
      resultFixture.fileLineRange = [1, 2];
      const result = getConsoleOutput([resultFixture]);
      expect(result).toContain('File: /path/to/file.txt:1-2');
    });

    it('should print the code block when teh result includes one', () => {
      resultFixture.filePath = '/path/to/file.txt';
      resultFixture.codeBlock = [
        [1, 'TEST_CODE_BLOCK_LINE_1'],
        [2, 'TEST_CODE_BLOCK_LINE_2'],
      ];
      const result = getConsoleOutput([resultFixture]);
      expect(result).toMatch(/1:.*TEST_CODE_BLOCK_LINE_1/gm);
      expect(result).toMatch(/2:.*TEST_CODE_BLOCK_LINE_2/gm);
    });
  });

  describe('postResults()', () => {

    let resultsFixture: IResult[];
    let optionsFixture: any;

    beforeEach(() => {
      spyOn(collector, 'getToolVersion').and.returnValue(new Promise((resolve) =>
        resolve('42.0.0')));

      spyOn(collector, 'getRepositoryUrl').and.returnValue(new Promise((resolve) =>
        resolve('git@github.com:test/test.git')));

      spyOn(collector, 'getRepositoryHead').and.returnValue(new Promise((resolve) =>
        resolve('0000000000000000000000000000000000000000')));

      resultsFixture = [{
        checkResult: CheckResult.PASS,
        checkId: 'TEST_CHECK_ID',
        checkName: 'TEST_CHECK_NAME',
        resourceId: 'TEST_RESOURCE_ID',
        checkType: 'TEST_CHECK_TYPE',
      }];

      optionsFixture = {
        cwd: 'TEST_OPTIONS_CWD',
        webhookUrl: 'TEST_WEBHOOK_URL',
      };
    });

    it('should call the subclass getToolVersion() method', async () => {
      await collector.postResults(resultsFixture, optionsFixture);
      expect(collector.getToolVersion).toHaveBeenCalledTimes(1);
      expect(collector.getToolVersion).toHaveBeenCalledWith(optionsFixture);
    });

    it('should call the subclass getRepositoryUrl() method', async () => {
      await collector.postResults(resultsFixture, optionsFixture);
      expect(collector.getRepositoryUrl).toHaveBeenCalledTimes(1);
      expect(collector.getRepositoryUrl).toHaveBeenCalledWith(optionsFixture);
    });

    it('should call the subclass getRepositoryHead() method', async () => {
      await collector.postResults(resultsFixture, optionsFixture);
      expect(collector.getRepositoryHead).toHaveBeenCalledTimes(1);
      expect(collector.getRepositoryHead).toHaveBeenCalledWith(optionsFixture);
    });

    async function verifyRequest(delegate: Function): Promise<void> {
      await collector.postResults(resultsFixture, optionsFixture);
      expect(collector._request).toHaveBeenCalledTimes(1);

      const request = (collector._request as any).calls.argsFor(0)[0];
      const body = JSON.parse(request.data);

      delegate(request, body);
    }

    it('should PUT the results to the webhook endpoint', async () => {
      await verifyRequest((request) => {
        expect(request.method).toEqual('put');
        expect(request.url).toEqual('TEST_WEBHOOK_URL');
      });
    });

    it('should include the API token in the authorization header', async () => {
      await verifyRequest((request) => {
        expect(request.headers.authorization).toEqual('Bearer TEST_API_TOKEN');
      });
    });

    it('should include the trace ID in the request body', async () => {
      await verifyRequest((request, body) => {
        expect(body.traceId).toEqual(collector.traceId);
      });
    });

    it('should include the timestamp in the request body', async () => {
      await verifyRequest((request, body) => {
        expect(body.timestamp).toEqual(collector.timestamp.toISOString());
      });
    });

    it('should include the tool ID in the request body', async () => {
      await verifyRequest((request, body) => {
        expect(body.toolId).toEqual(collector.toolId);
      });
    });

    it('should include the repository URL in the request body', async () => {
      await verifyRequest((request, body) => {
        expect(body.repositoryUrl).toEqual('git@github.com:test/test.git');
        expect(collector.getRepositoryUrl).toHaveBeenCalledTimes(1);
      });
    });

    it('should include the HEAD commit hash in the request body', async () => {
      await verifyRequest((request, body) => {
        expect(body.commitHash).toEqual('0000000000000000000000000000000000000000');
        expect(collector.getRepositoryHead).toHaveBeenCalledTimes(1);
      });
    });

    it('should remove the check name from the results payload', async () => {
      await verifyRequest((request, body) => {
        expect(body.results[0].checkName).toBeUndefined();
      });
    });

    it('should include the check ID in the results payload', async () => {
      await verifyRequest((request, body) => {
        expect(body.results[0].checkId).toEqual('TEST_CHECK_ID');
      });
    });

  });

  describe('getRepositoryUrl()', () => {
    it('should return the results of the git command', async () => {
      spyOn(collector, 'spawn').and.returnValue(new Promise((resolve) => resolve('TEST_STDOUT')));

      const result = await collector.getRepositoryUrl({});

      expect(collector.spawn).toHaveBeenCalledTimes(1);
      expect(result).toEqual('TEST_STDOUT');
    });

    it('should return null when the command errors', async () => {
      spyOn(collector, 'spawn').and.throwError(new Error());
      const result = await collector.getRepositoryUrl({});
      expect(result).toBeNull();
    });
  });

  describe('getRepositoryHead()', () => {
    it('should return the results of the git command', async () => {
      spyOn(collector, 'spawn').and.returnValue(new Promise((resolve) => resolve('TEST_STDOUT')));

      const result = await collector.getRepositoryHead({});

      expect(collector.spawn).toHaveBeenCalledTimes(1);
      expect(result).toEqual('TEST_STDOUT');
    });

    it('should return null when the command errors', async () => {
      spyOn(collector, 'spawn').and.throwError(new Error());
      const result = await collector.getRepositoryHead({});
      expect(result).toBeNull();
    });
  });

  describe('spawn', () => {
    let sandbox: sinon.createSandbox;
    let proc: ChildProcess;

    beforeEach(() => {
      proc = (new events.EventEmitter()) as ChildProcess;
      proc.stdin = new stream.Writable();
      proc.stdout = (new events.EventEmitter()) as stream.Readable;
      proc.stderr = (new events.EventEmitter()) as stream.Readable;
      sandbox = sinon.createSandbox();
      sandbox.stub(cp, 'spawn')
        .returns(proc)
        .calledOnceWith('foo', ['--bar'], {});
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return the stdout stream of the supplied command', async () => {
      const stdout = 'bar';

      const process = collector.spawn('foo', ['bar']);
      proc.stdout.emit('data', stdout);
      proc.emit('exit', 0);
      await expectAsync(process).toBeResolvedTo(stdout);
    });

    it('should not require arguments to be passed', async () => {
      const stdout = 'Output';

      const process = collector.spawn('foo');
      proc.stdout.emit('data', stdout);
      proc.emit('exit', 0);
      await expectAsync(process).toBeResolvedTo(stdout);
    });

    it('should throw an error if the spawn command fails', async () => {
      const stdout = 'Output';
      const stderr = 'ERROR';

      const process = collector.spawn('foo');
      proc.stderr.emit('data', stderr);
      proc.stdout.emit('data', stdout);
      proc.emit('exit', 1);
      await expectAsync(process).toBeRejectedWith(stderr);
    });

  });

  describe('getMaxLineNumberLength()', () => {
    it('should return the length of the longest line number', () => {
      const codeBlock: [number, string][] = [
        [1, 'TEST_CODE_BLOCK_LINE_1'],
        [10, 'TEST_CODE_BLOCK_LINE_2'],
        [100, 'TEST_CODE_BLOCK_LINE_3'],
      ];

      const result = collector.getMaxLineNumberLength(codeBlock);
      expect(result).toEqual(3);
    });
  });

  describe('padLineNumber()', () => {
    it('should prefix strings with leading spaces to match the desired length', () => {
      const result0 = collector.padLineNumber(42, 3);
      expect(result0).toEqual(' 42');
      const result1 = collector.padLineNumber(42, 4);
      expect(result1).toEqual('  42');
    });
  });
});

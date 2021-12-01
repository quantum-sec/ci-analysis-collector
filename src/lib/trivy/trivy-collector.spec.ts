import { Logger } from '../utils';
import { createLoggerFixture } from '../test/logger.fixture';
import { TrivyCollector } from './trivy-collector';
import { CheckResult } from '../check-result';

describe('TrivyCollector', () => {

  let collector: TrivyCollector;
  let logger: Logger;
  let theSpy;

  beforeEach(() => {
    logger = createLoggerFixture();
    collector = new TrivyCollector(logger);

    theSpy = spyOn(collector, 'spawn').and.returnValue(new Promise((resolve) => {
      resolve('TEST_OUTPUT');
    }));
  });

  describe('constructor()', () => {
    it('should set the tool ID', () => {
      expect(collector.toolId).toEqual('trivy');
    });
  });

  describe('getToolVersion()', () => {
    it('should call trivy with the --version flag', async () => {
      const result = await collector.getToolVersion({});
      expect(result).toEqual('TEST_OUTPUT');
      expect(collector.spawn).toHaveBeenCalledTimes(1);
      expect(collector.spawn).toHaveBeenCalledWith('trivy', ['--version'], {});
    });
  });

  describe('getResults()', () => {
    it('should call trivy with preset options', async () => {
      collector._argv = {
        'image-name': 'TEST_IMAGE',
      } as any;
      spyOn(collector, 'parseResults').and.returnValue('TEST_RESULTS' as any);
      const result = await collector.getResults({});
      expect(result).toEqual('TEST_RESULTS' as any);

      const expectedArgs = [
        '--quiet',
        'image',
        '--security-checks',
        'vuln,config',
        '--exit-code',
        '0',
        '-f',
        'json',
        '--light',
        'TEST_IMAGE',
      ];
      expect(collector.spawn).toHaveBeenCalledTimes(1);
      expect(collector.spawn).toHaveBeenCalledWith('trivy', expectedArgs, {});

      expect(collector.parseResults).toHaveBeenCalledTimes(1);
      expect(collector.parseResults).toHaveBeenCalledWith('TEST_OUTPUT');
    });

    it('should error when image cannot be found', async () => {
      collector._argv = {
        'image-name': 'TEST_IMAGE',
      } as any;

      theSpy.and.callThrough(); // this removes the return value in line 16

      await expectAsync(collector.getResults({}))
        .toBeRejected();
    });
    it('should error when image name is not specified', async () => {
      await expectAsync(collector.getResults({}))
        .toBeRejectedWith(new Error('You must specify an --image-name argument.'));
    });

  });

  describe('parseResults()', () => {

    let raw: string;

    beforeEach(()=> {
      /* eslint-disable @typescript-eslint/naming-convention */
      raw = JSON.stringify([{
        Vulnerabilities: [{
          VulnerabilityID: 'TEST_VULNERABILITY_ID',
          PkgName: 'TEST_PACKAGE_NAME',
          InstalledVersion: 'TEST_INSTALLED_VERSION',
          Layer: {
            Digest: 'TEST_DIGEST',
          },
        }],
      }]);
      /* eslint-enable @typescript-eslint/naming-convention */
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

    it('should set the checkname to the vulnerabilityID', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.checkName).toEqual('TEST_VULNERABILITY_ID');
    });

    it('should set the packageName to PkgName', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.packageName).toEqual('TEST_PACKAGE_NAME');
    });

    it('should set the packageVersion to InstalledVersion', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.packageVersion).toEqual('TEST_INSTALLED_VERSION');
    });

    it('should set the resourceId to Layer.Digest', () => {
      const result = collector.parseResults(raw)[0];
      expect(result.resourceId).toEqual('TEST_DIGEST');
    });
  });

});

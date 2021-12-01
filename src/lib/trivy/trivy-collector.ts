import { AnalysisCollectorBase } from '../analysis-collector-base';
import { CheckResult } from '../check-result';
import { IResult } from '../result.interface';
import { Logger } from '../utils';

export class TrivyCollector extends AnalysisCollectorBase {

  public constructor(logger: Logger) {
    super('trivy', logger);
  }

  public override async getToolVersion(options: any): Promise<string> {
    const args = ['--version'];
    return await this.spawn('trivy', args, options);
  }

  public override async getResults(options: any): Promise<IResult[]> {
    const imageName = this._argv['image-name'];
    if (!imageName) {
      throw new Error('You must specify an --image-name argument.');
    }

    const args = ['--quiet', 'image', '--security-checks', 'vuln,config', '--exit-code', '0', '-f', 'json', '--light', imageName];

    let output;
    try {
      output = await this.spawn('trivy', args, options);
    }
    catch (e: unknown) {
      throw new Error(`Error executing Trivy: ${e as string}`);
    }

    this.logger.debug(JSON.stringify(output, null, 2));


    return this.parseResults(output);
  }

  public parseResults(output: string): IResult[] {

    const parsed = JSON.parse(output);

    const results = [];

    for (const set of parsed) {
      if (!set.Vulnerabilities) {
        const result: IResult = {
          checkId: 'vulnerabilities',
          checkName: 'No vulnerabilities found.',
          checkType: 'container-layer',
          checkResult: CheckResult.PASS,
          resourceId: set.Target,
          vulnerabilityId: set.VulnerabilityID,
          packageName: set.PkgName,
          packageVersion: set.InstalledVersion,
        };

        results.push(result);
        continue;
      }

      results.push(...set.Vulnerabilities.map((v) => {
        const result: IResult = {
          checkId: 'vulnerabilities',
          checkName: v.VulnerabilityID,
          checkType: 'container-layer',
          checkResult: CheckResult.FAIL,
          resourceId: v.Layer.Digest,
          vulnerabilityId: v.VulnerabilityID,
          packageName: v.PkgName,
          packageVersion: v.InstalledVersion,
        };

        return result;
      }));

    }
    return results;
  }

}

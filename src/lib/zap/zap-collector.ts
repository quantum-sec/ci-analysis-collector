import { AnalysisCollectorBase } from '../analysis-collector-base';
import { CheckResult } from '../check-result';
import { IResult } from '../result.interface';
import { Logger } from '../utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ZapCollector extends AnalysisCollectorBase {
  public fs = fs;

  public constructor(logger: Logger) {
    super('zap', logger);
  }

  public override async getToolVersion(options: any): Promise<string> {
    const args = ['-t owasp/zap2docker-stable zap.sh -cmd -version'];
    return await this.spawn('docker run', args, options);
  }

  public override async getResults(options: any): Promise<IResult[]> {
    const targetName = this._argv['target-name'];
    if (!targetName) {
      throw new Error('You must specify an --target-name argument.');
    }

    const dir = fs.mkdtempSync(path.join(os.tmpdir()) + path.sep);
    const args = ['-v $(', dir, '):/zap/wrk/:rw', '-t owasp/zap2docker-stable zap-full-scan.py',
      '-t', targetName, '-J zapreport.json', '-s'];
    const output = await this.spawn('docker run', args, options);


    const jsonFileContents: string = this.fs.readFileSync('zapreport.json', 'utf8');
    this.logger.debug(JSON.stringify(output, null, 2));

    return this.parseResults(jsonFileContents);
  }

  public parseResults(output: string): IResult[] {
    const parsed = JSON.parse(output);

    const results = [];

    for (const set of parsed) {
      if (!set.alerts) {
        const result: IResult = {
          checkId: 'vulnerabilities',
          checkName: 'No vulnerabilities found.',
          checkType: 'website',
          checkResult: CheckResult.PASS,
          resourceId: set.name,
        };

        results.push(result);
        continue;
      }

      results.push(...set.alerts.map((v) => {
        const result: IResult = {
          checkId: v.pluginid,
          checkName: v.alert,
          checkType: 'website',
          checkResult: CheckResult.FAIL,
          resourceId: v.instances.uri,
          checkMethod: v.instances.method,
        };

        return result;
      }));

    }
    return results;
  }

}

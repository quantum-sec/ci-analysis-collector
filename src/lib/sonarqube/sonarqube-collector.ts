import { AnalysisCollectorBase } from '../analysis-collector-base';
import { CheckResult } from '../check-result';
import { IResult } from '../result.interface';
import { Logger } from '../utils';
import * as axios from 'axios';

export class SonarqubeCollector extends AnalysisCollectorBase {
  public http = axios.default;

  public constructor(logger: Logger) {
    super('sonarqube', logger);
  }

  public override async getToolVersion(options: any): Promise<string> {
    const args = ['--version'];
    return await this.spawn('sonar-scanner', args, options);
  }

  public override async getResults(options: any): Promise<IResult[]> {
    const dsonarLogin = this._argv['dsonar-login'];
    if (!dsonarLogin) {
      throw new Error('You must specify a --dsonar-login argument.');
    }

    const dsonarProjectKey = this._argv['dsonar-projectkey'];
    if (!dsonarProjectKey) {
      throw new Error('You must specify a --dsonar-projectkey argument.');
    }

    const dsonarProjectBaseDir = this._argv['dsonar-projectdir'];
    if (!dsonarProjectBaseDir) {
      throw new Error('You must specify a --dsonar-projectdir argument.');
    }

    const dsonarUsername = this._argv['dsonar-username'];
    if (!dsonarUsername) {
      throw new Error('You must specify a --dsonar-username argument.');
    }

    const dsonarPassword = this._argv['dsonar-password'];
    if (!dsonarPassword) {
      throw new Error('You must specify a --dsonar-password argument.');
    }

    const args = [
      `-Dsonar.login=${dsonarLogin}`,
      `-Dsonar.projectKey=${dsonarProjectKey}`,
      `-Dsonar.projectBaseDir=${dsonarProjectBaseDir}`,
    ];
    await this.spawn('sonar-scanner', args, options);

    return new Promise((resolve, reject) => {
      let output;

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.http.get(`http://localhost:9000/api/issues/search?componentKeys=${dsonarProjectKey}`, { withCredentials: true,
        auth: {
          username: dsonarUsername,
          password: dsonarPassword,
        } }).then((response) => {
        output = response.data;
        resolve(this.parseResults(JSON.stringify(output)));
      });
    });
  }

  public parseResults(output: string): IResult[] {
    const parsed = JSON.parse(output);

    const results = [];

    if (!parsed.issues) {
      const result: IResult = {
        checkId: 'issues',
        checkName: 'No issues found.',
        checkType: parsed.type,
        checkResult: CheckResult.PASS,
        resourceId: parsed.component,
        fileLineRange: parsed.textRange,
        codeRule: parsed.rule,
        codeMessage: parsed.message,
        codeHash: parsed.hash,
        codeDebt: parsed.debt,
      };
      results.push(result);

    }
    else {
      for (const set of parsed.issues) {

        const result: IResult = {
          checkId: set.key,
          checkName: set.rule,
          checkType: set.type,
          checkResult: CheckResult.FAIL,
          resourceId: set.component,
          fileLineRange: set.textRange,
          codeRule: set.rule,
          codeMessage: set.message,
          codeHash: set.hash,
          codeDebt: set.debt,
        };
        results.push(result);
      }
    }

    return results;
  }
}

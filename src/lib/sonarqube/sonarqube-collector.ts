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
    const dsonarLogin = process.env.SQ_LOGIN;
    if (!dsonarLogin) {
      throw new Error('You must specify authentication token in the config.');
    }

    const dsonarProjectKey = process.env.SQ_KEY;
    if (!dsonarProjectKey) {
      throw new Error('You must specify projectkey in the config.');
    }

    const dsonarUsername = process.env.SQ_USERNAME;
    if (!dsonarUsername) {
      throw new Error('You must specify username in the config.');
    }

    const dsonarPassword = process.env.SQ_PASSWORD;
    if (!dsonarPassword) {
      throw new Error('You must specify password in the config.');
    }

    const dsonarProjectBaseDir = this._argv['proj-dir'];
    if (!dsonarProjectBaseDir) {
      throw new Error('You must specify a --proj-dir argument.');
    }

    const args = [
      `-Dsonar.login=${dsonarLogin}`,
      `-Dsonar.projectKey=${dsonarProjectKey}`,
      `-Dsonar.projectBaseDir=${dsonarProjectBaseDir}`,
    ];
    try {
      await this.spawn('sonar-scanner', args, options);
    }
    catch (e: unknown) {
      throw new Error(`Error executing Sonarqube: ${e as string}`);
    }

    const response = await this.http.get(`http://${process.env.SQ_HOST}/api/issues/search?componentKeys=${dsonarProjectKey}`, {
      withCredentials: true,
      auth: {
        username: dsonarUsername,
        password: dsonarPassword,
      } });
    return this.parseResults(JSON.stringify(response.data));
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
      };
      results.push(result);

    }
    else {
      for (const set of parsed.issues) {

        const result: IResult = {
          checkId: set.rule,
          checkName: set.message,
          checkType: set.type,
          checkResult: CheckResult.FAIL,
          resourceId: set.component,
          fileLineRange: set.textRange,
        };
        results.push(result);
      }
    }

    return results;
  }
}

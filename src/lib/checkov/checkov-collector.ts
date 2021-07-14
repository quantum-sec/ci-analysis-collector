import { AnalysisCollectorBase } from '../analysis-collector-base';
import { CheckResult } from '../check-result';
import { IResult } from '../result.interface';
import { Logger } from '../utils';

export class CheckovCollector extends AnalysisCollectorBase {

  public constructor(logger: Logger) {
    super('checkov', logger);
  }

  public override async getToolVersion(options: any): Promise<string> {
    const args = ['--version'];
    return await this.spawn('checkov', args, options);
  }

  public override async getResults(options: any): Promise<IResult[]> {
    // Once we develop custom checks, they should be specified using the --external-checks-git argument.
    const args = ['--directory', '.', '--output', 'json', '--no-guide', '--soft-fail'];
    const output = await this.spawn('checkov', args, options);
    return this.parseResults(output);
  }

  public parseResults(output: string): IResult[] {
    const results = [];
    let parsed = JSON.parse(output);

    // When checkov encounters multiple types of checks (i.e. Terraform and Kubernetes in the same repo)
    // it returns an array of summaries, but when it encounters only a single type it returns a single object.
    // If it's not an array, we'll wrap it to be processed consistently by the result handlers.
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    const resultMap = {
      /* eslint-disable @typescript-eslint/naming-convention */
      'PASSED': CheckResult.PASS,
      'FAILED': CheckResult.FAIL,
      'SKIPPED': CheckResult.SKIPPED,
      /* eslint-enable @typescript-eslint/naming-convention */
    };

    for (const set of parsed) {
      const checkType = set.check_type;

      const aggregateChecks = [
        ...set.results.passed_checks,
        ...set.results.failed_checks,
        ...set.results.skipped_checks,
      ];

      results.push(...aggregateChecks.map((check): IResult =>
        this.createResult(check, checkType, resultMap[check.check_result.result])));

      results.push(...set.results.parsing_errors.map((check): IResult =>
        this.createResult(check, checkType, CheckResult.ERRORED)));
    }

    return results;
  }

  public createResult(check: any, checkType, checkResult: CheckResult): IResult {
    return {
      checkId: check.check_id,
      checkName: check.check_name,
      checkType,
      resourceId: check.resource ? check.resource.replace(/\.$/, '') : 'unknown',
      checkResult,
      filePath: check.file_path,
      fileLineRange: check.file_line_range
        ? [check.file_line_range[0] as number + 1, check.file_line_range[1] as number + 1]
        : null,
      codeBlock: check.code_block?.map((line) => [line[0] as number + 1, line[1].trimEnd()]),
    };
  }
}

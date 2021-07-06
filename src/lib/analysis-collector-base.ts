import { IResult } from './result.interface';
import { Logger } from './utils';
import { v4 as uuid } from 'uuid';
import cp from 'child_process';
import chalk from 'chalk';
import { CheckResult } from './check-result';

export abstract class AnalysisCollectorBase {

  public apiToken: string;

  public toolVersion: string;

  public traceId: string;

  public timestamp: Date;

  public constructor(public toolId: string, public logger: Logger) {
    this.traceId = uuid();
    this.timestamp = new Date();
    this.detectApiToken();
  }

  public async exec(options: any): Promise<void> {

    const finalOptions = {
      ...options,
      env: process.env,
      stdio: 'pipe',
      encoding: 'utf-8',
    };

    if (!finalOptions.cwd) {
      finalOptions.cwd = process.cwd();
    }

    const results = await this.getResults(finalOptions);

    this.printResults(results);

    await this.postResults(results, finalOptions);
  }

  public detectApiToken(): void {
    this.apiToken = process.env.QS_API_TOKEN;

    if (!this.apiToken) {
      this.logger.info('No Quantum API token detected on the environment.', true);
      this.logger.info('Some reporting and lifecycle management features may not be available.');
      this.logger.info('You can add your token via the QS_API_TOKEN environment variable.');
    }
  }

  public getLineColor(result: CheckResult): Function {
    switch (result) {
      case CheckResult.PASS:
        return chalk.green;
      case CheckResult.FAIL:
        return chalk.red;
      case CheckResult.ERRORED:
        return chalk.yellow;
      case CheckResult.SKIPPED:
      default:
        return chalk.dim;
    }
  }

  public printResults(results: IResult[]): void {
    for (const result of results) {
      const statusColor = this.getLineColor(result.checkResult);

      let text = chalk.bold.white(` [${ statusColor(result.checkResult) }] `);
      text += chalk.bold.white(`${ result.checkId }: ${ result.checkName }`);
      text += '\n\n';
      text += `  ${ chalk.bold(result.checkType) } | ${ result.resourceId }\n\n`;

      if (result.filePath) {
        text += `  File: ${ result.filePath }`;
        if (result.fileLineRange) {
          if (result.fileLineRange[0] === result.fileLineRange[1]) {
            text += `:${ result.fileLineRange[0] }`;
          }
          else {
            text += `:${ result.fileLineRange[0] }-${ result.fileLineRange[1] }`;
          }
        }
        text += '\n\n';
      }

      if (result.codeBlock) {
        const paddedLength = this.getMaxLineNumberLength(result.codeBlock);
        for (const line of result.codeBlock) {
          const lineNumber = this.padLineNumber(line[0], paddedLength);
          text += chalk.dim(`    ${ lineNumber }: `);
          text += `${ line[1] }\n`;
        }
        text += '\n';
      }

      console.log(chalk.reset(text));
    }
  }

  public async postResults(results: IResult[], options: any): Promise<void> {
    const payload = {
      traceId: this.traceId,
      timestamp: this.timestamp,
      toolId: this.toolId,
      toolVersion: await this.getToolVersion(options),
      repositoryUrl: await this.getRepositoryUrl(options),
      commitHash: await this.getRepositoryHead(options),
      results: results.map((result) => {
        result.checkName = undefined;
        return result;
      }),
    };

    this.logger.debug(JSON.stringify(payload));

    // TODO: webhook things
  }

  public async getRepositoryUrl(options: any): Promise<string> {
    try {
      // Presently only supporting git, but this method could be extended in the future.
      // There is a possibility that the remote is not named `origin`. Can deal with this edge case later.
      return await this.spawn('git', ['remote', 'get-url', 'origin'], options);
    }
    catch {
      return null;
    }
  }

  public async getRepositoryHead(options: any): Promise<string> {
    try {
      // Again, only supporting git for now.
      return await this.spawn('git', ['--no-pager', 'log', '-n', '1', '--pretty=format:%H'], options);
    }
    catch {
      return null;
    }
  }

  public async spawn(command: string, args?: string[], options?: cp.SpawnOptions): Promise<string> {
    this.logger.debug([command, ...args].join(' '));
    this.logger.debug(options);

    return new Promise((resolve) => {
      const proc = cp.spawn(command, args, options);
      const chunks: string[] = [];

      proc.stdout.on('data', (chunk) => {
        this.logger.debug(chunk);
        chunks.push(chunk);
      });

      proc.on('exit', (code) => {
        this.logger.debug(`${ command } exited with status code ${ code }`);
        resolve(chunks.join('').trim());
      });
    });
  }

  public getMaxLineNumberLength(codeBlock: [number, string][]): number {
    return codeBlock.map((line) => line[0].toString().length)
      .sort((a, b) => b - a)[0];
  }

  public padLineNumber(line: number, length: number): string {
    let num = line.toString(10);
    while (num.length > length) {
      num = ` ${ num }`;
    }
    return num;
  }

  public abstract getToolVersion(options: any): Promise<string>;

  public abstract getResults(options: any): Promise<IResult[]>;
}

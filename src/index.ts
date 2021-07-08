#!/usr/bin/env node

import { CheckovCollector, Logger } from './lib';
import fs from 'fs';
import { argv } from 'yargs';

const logger = new Logger();

const collectors = {
  checkov: CheckovCollector,
};

function parseOptions(): any {
  const args = argv as any;
  const tool = args._[0];
  if (!tool) {
    logger.error('No tool specified to instrument.', true);
    logger.info('You must specify the tool as a positional argument.');
    logger.info('Example:');
    logger.info('  npx @quantum-sec/ci-analysis-collector <tool>');
    process.exit(1);
  }

  if (!collectors[tool]) {
    logger.error(`The specified tool "${ tool }" is not supported.`, true);
    logger.info('Specify one of the following supported tools for instrumentation:');
    for (const key in collectors) {
      logger.info(`  • ${ key }`);
    }
    process.exit(1);
  }

  let path = '.';
  if (args.path) {
    if (fs.existsSync(path)) {
      path = args.path;
    }
    else {
      logger.error('The supplied --path argument does not exist.', true);
      logger.info(`${ args.path } could not be found.`);
      process.exit(1);
    }
  }

  return {
    tool,
    path,
  };
}

async function main(): Promise<void> {
  console.log();
  const options = parseOptions();
  const collector = new collectors[options.tool](logger);

  console.log();
  logger.info(`Running tool "${ options.tool }"...`, true);

  await collector.exec({
    cwd: options.path,
  });
}

main().then(() => {
  logger.success('Analysis run and collection completed successfully.', true);
  process.exit(0);
}).catch((e) => {
  logger.error('An error occurred during tool execution or analysis data collection:', true);
  logger.error(e.stack);
  process.exit(-1);
});

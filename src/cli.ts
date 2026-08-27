import minimist from 'minimist';

import { start } from './index';

const { version } = require('../package.json');

const HELP_TEXT = `Options:
  --version      Show version number                                   [boolean]
  --url, -u      URL with {{parameter}}                               [required]
  --from, -f     Provide an initial value from count should start   [default: 0]
  --to, -t       Provide an last value when count ends             [default: 10]
  --verbose, -v  Display endpoints which refused
  --help         Show help                                             [boolean]`;

/**
 * Parse CLI arguments and run the enumeration.
 */
export async function main(): Promise<void> {
  const argv = minimist(process.argv.slice(2), {
    string: ['url'],
    boolean: ['help', 'version', 'verbose'],
    alias: {
      u: 'url',
      f: 'from',
      t: 'to',
      v: 'verbose',
    },
    default: {
      from: 0,
      to: 10,
    },
  });

  // Handle --help flag
  if (argv.help) {
    console.log(HELP_TEXT);
    return;
  }

  // Handle --version flag
  if (argv.version) {
    console.log(version);
    return;
  }

  // Validate required argument
  if (!argv.url) {
    console.log(`${HELP_TEXT}

Missing required argument: url
Please provide url argument to work with this tool`);
    process.exitCode = 1;
    return;
  }

  const from = Number(argv.from);
  const to = Number(argv.to);
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    console.log('--from and --to must be integers');
    process.exitCode = 1;
    return;
  }
  if (from > to) {
    console.log(`--from (${from}) must be less than or equal to --to (${to})`);
    process.exitCode = 1;
    return;
  }

  try {
    await start({
      url: argv.url,
      from,
      to,
      verbose: Boolean(argv.verbose),
    });
  } catch {
    process.exitCode = 1;
  }
}

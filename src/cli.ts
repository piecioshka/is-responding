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
export function main(): void {
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

  start({
    url: argv.url,
    from: Number(argv.from),
    to: Number(argv.to),
    verbose: Boolean(argv.verbose),
  });
}

import minimist from 'minimist';

import { start } from './index';

const { version } = require('../package.json');

const HELP_TEXT = `Usage: is-responding -u <url with {{integer}}> [options]

Options:
  --version          Show version number                               [boolean]
  --url, -u          URL with {{parameter}}                           [required]
  --from, -f         Value the enumeration starts at                [default: 0]
  --to, -t           Value the enumeration ends at                 [default: 10]
  --pad, -p          Pad values with leading zeros, 3 gives 007     [default: 0]
  --concurrency, -c  Requests kept in flight at once                [default: 5]
  --timeout          Milliseconds before a request is abandoned [default: 10000]
  --verbose, -v      Display endpoints which refused
  --help             Show help                                         [boolean]

Examples:
  Scan a range of ids
    is-responding -u "https://example.org/invoice/{{integer}}" -f 1000 -t 1100

  Show why endpoints were skipped
    is-responding -u "https://example.org/{{integer}}" -f 1 -t 50 --verbose

  Fixed-width numbers, so 7 becomes 007
    is-responding -u "https://example.org/photo/{{integer}}.jpg" -t 999 --pad 3

  Scan a wide range faster
    is-responding -u "https://example.org/{{integer}}" -t 5000 --concurrency 25

  Keep the output in range order
    is-responding -u "https://example.org/{{integer}}" -t 100 --concurrency 1

Exit codes:
  0  at least one endpoint responded
  1  nothing responded, or the arguments were invalid`;

/**
 * Parse a CLI argument that has to be a whole number, reporting a bad value.
 */
function parseInteger(name: string, raw: unknown): number | null {
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    console.log(`Option "${name}" must be an integer, got: ${String(raw)}`);
    return null;
  }
  return value;
}

/**
 * Parse CLI arguments and run the enumeration.
 *
 * Sets a non-zero exit code when the input is invalid or nothing responded.
 */
export async function main(): Promise<void> {
  const argv = minimist(process.argv.slice(2), {
    string: ['url', 'from', 'to', 'pad', 'timeout'],
    boolean: ['help', 'version', 'verbose'],
    alias: {
      u: 'url',
      f: 'from',
      t: 'to',
      v: 'verbose',
      p: 'pad',
      c: 'concurrency',
    },
    default: {
      from: '0',
      to: '10',
      pad: '0',
      timeout: '10000',
      concurrency: '5',
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

  const from = parseInteger('from', argv.from);
  const to = parseInteger('to', argv.to);
  const pad = parseInteger('pad', argv.pad);
  const timeout = parseInteger('timeout', argv.timeout);
  const concurrency = parseInteger('concurrency', argv.concurrency);

  if (
    from === null ||
    to === null ||
    pad === null ||
    timeout === null ||
    concurrency === null
  ) {
    process.exitCode = 1;
    return;
  }

  if (from > to) {
    console.log(
      `Option "from" (${from}) must not be greater than "to" (${to})`,
    );
    process.exitCode = 1;
    return;
  }

  if (pad < 0) {
    console.log(`Option "pad" must not be negative, got: ${pad}`);
    process.exitCode = 1;
    return;
  }

  if (timeout <= 0) {
    console.log(`Option "timeout" must be positive, got: ${timeout}`);
    process.exitCode = 1;
    return;
  }

  if (concurrency < 1) {
    console.log(`Option "concurrency" must be at least 1, got: ${concurrency}`);
    process.exitCode = 1;
    return;
  }

  const result = await start({
    url: argv.url,
    from,
    to,
    verbose: Boolean(argv.verbose),
    pad,
    timeout,
    concurrency,
  });

  // Nothing to report means either a rejected template or a silent range.
  if (result === null || result.responding.length === 0) {
    process.exitCode = 1;
  }
}

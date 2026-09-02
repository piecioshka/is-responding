import { red, green, cyan } from 'colors/safe';
import request from 'superagent';

import { delay } from './helper';
import {
  applyParams,
  getParams,
  getGenerators,
  SUPPORTED_TYPES,
  GeneratorFactory,
} from './generators';

const DEFAULT_DELAY = 50;
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_CONCURRENCY = 5;

export interface StartOptions {
  url: string;
  from: number;
  to: number;
  verbose: boolean;
  /** Milliseconds to wait between requests. */
  delay?: number;
  /** Milliseconds before a single request is abandoned. */
  timeout?: number;
  /** Pad values with leading zeros up to this width, e.g. 3 gives `007`. */
  pad?: number;
  /** How many requests may be in flight at once. */
  concurrency?: number;
}

/**
 * Outcome of a completed enumeration.
 */
export interface StartResult {
  /** Endpoints that answered with a success status. */
  responding: string[];
  /** Number of endpoints that were checked. */
  checked: number;
}

/**
 * Write to stdout, resolved at call time so the stream stays interceptable.
 */
function log(text: string): void {
  process.stdout.write(text);
}

/**
 * Render a value for the URL, optionally padded with leading zeros.
 *
 * A negative number keeps its sign in front of the padding, so a width of 3
 * turns -7 into `-007`.
 */
function formatValue(value: number, pad: number): string {
  if (pad <= 0) {
    return String(value);
  }
  const isNegative = value < 0;
  const digits = Math.abs(value).toString().padStart(pad, '0');
  return isNegative ? `-${digits}` : digits;
}

/**
 * Read a property from an unknown error in a type-safe way.
 */
function readErrorProp(err: unknown, key: string): string {
  if (typeof err === 'object' && err !== null && key in err) {
    return String(Reflect.get(err, key));
  }
  return 'undefined';
}

async function isServerRespond(
  url: string,
  label: string,
  width: number,
  verbose: boolean,
  timeout: number,
): Promise<boolean> {
  const prefix = label.padStart(width);
  const progress = `[${prefix}] ${url} ...`;

  // A redirected stream has no cursor to rewind, so the transient progress
  // line would be left behind as noise in the file or pipe.
  const isInteractive = Boolean(process.stdout.isTTY);
  if (isInteractive) {
    log(progress);
  }

  try {
    // superagent takes both budgets; cap the first response at the deadline.
    const res = await request.head(url).timeout({
      response: timeout,
      deadline: timeout,
    });
    const done = `[${prefix}] ${url} ${green(String(res.status))}: ${green(url)}\n`;
    log(isInteractive ? `\r${done}` : done);
    return true;
  } catch (err) {
    if (verbose) {
      const status = readErrorProp(err, 'status');
      const message = readErrorProp(err, 'message');
      const failed = `[${prefix}] ${url} \t\t${red(`${status}: ${message}`)}\n`;
      log(isInteractive ? `\r${failed}` : failed);
    } else if (isInteractive) {
      // Wipe the progress line so a silent endpoint leaves no trace.
      log(`\r${' '.repeat(progress.length)}\r`);
    }
    return false;
  }
}

/**
 * Materialize a generator's full range into an array of values.
 */
function collectValues(gen: ReturnType<GeneratorFactory>): number[] {
  const values: number[] = [];
  for (let value = gen.next(); value !== null; value = gen.next()) {
    values.push(value);
  }
  return values;
}

/**
 * Cartesian product of the per-placeholder value ranges.
 */
function cartesian(ranges: number[][]): number[][] {
  return ranges.reduce<number[][]>(
    (acc, range) =>
      acc.flatMap((combo) => range.map((value) => [...combo, value])),
    [[]],
  );
}

async function test(
  url: string,
  from: number,
  to: number,
  verbose: boolean,
  generators: GeneratorFactory[],
  delayTime: number,
  timeout: number,
  pad: number,
  concurrency: number,
): Promise<StartResult> {
  console.log(cyan('🚀 Enumeration started...'));

  const responding: string[] = [];
  let checked = 0;

  // Align the counter column against the widest label in the range.
  const labelWidth = Math.max(
    formatValue(from, pad).length,
    formatValue(to, pad).length,
  );

  const ranges = generators.map((factory) => collectValues(factory(from, to)));
  const combinations = cartesian(ranges);

  // Workers pull from a shared cursor, so a slow endpoint holds up only its
  // own slot instead of the whole run.
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, combinations.length) },
    async () => {
      while (cursor < combinations.length) {
        const combo = combinations[cursor++];
        const labels = combo.map((value) => formatValue(value, pad));
        const compiledUrl = applyParams(url, labels);
        if (delayTime > 0) {
          await delay(delayTime);
        }
        checked++;
        const isUp = await isServerRespond(
          compiledUrl,
          labels[labels.length - 1] ?? '',
          labelWidth,
          verbose,
          timeout,
        );
        if (isUp) {
          responding.push(compiledUrl);
        }
      }
    },
  );

  await Promise.all(workers);

  console.log(cyan('✅ Enumeration completed'));
  return { responding, checked };
}

/**
 * Start enumerating endpoints derived from the provided URL template.
 *
 * Resolves once every endpoint in the range has been checked, and returns
 * `null` when the template cannot be enumerated.
 */
export async function start({
  url,
  from,
  to,
  verbose,
  delay: delayTime = DEFAULT_DELAY,
  timeout = DEFAULT_TIMEOUT,
  pad = 0,
  concurrency = DEFAULT_CONCURRENCY,
}: StartOptions): Promise<StartResult | null> {
  const params = getParams(url);
  if (params.length === 0) {
    console.log(red('There is no params in url'));
    console.log('Params format: https://example.org/{{integer}}/foo?bar=1');
    return null;
  }

  // Reject a template that is not a valid http(s) URL once placeholders are
  // filled, before firing any request.
  const probe = applyParams(
    url,
    params.map(() => 0),
  );
  let parsed: URL;
  try {
    parsed = new URL(probe);
  } catch {
    console.log(red(`Invalid URL: ${url}`));
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    console.log(
      red(`Unsupported protocol: ${parsed.protocol} (expected http/https)`),
    );
    return null;
  }

  let generators: GeneratorFactory[];
  try {
    generators = getGenerators(params);
  } catch (err) {
    console.log(red(err instanceof Error ? err.message : String(err)));
    const supportTypeNames = Object.keys(SUPPORTED_TYPES).join(', ');
    console.log('Supported types:', supportTypeNames);
    return null;
  }

  return test(
    url,
    from,
    to,
    verbose,
    generators,
    delayTime,
    timeout,
    pad,
    concurrency,
  );
}

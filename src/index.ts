import { red, green, cyan, gray, bold, yellow } from 'colors/safe';
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
  /** Stops the scan early, keeping whatever has been found so far. */
  signal?: AbortSignal;
}

/**
 * Outcome of a completed enumeration.
 */
export interface StartResult {
  /** Endpoints that answered with a success status. */
  responding: string[];
  /** Number of endpoints that were checked. */
  checked: number;
  /** Endpoints that refused or timed out. */
  silent: number;
  /** Wall-clock time of the run, in milliseconds. */
  elapsed: number;
  /** How many times each status (or failure reason) was seen. */
  statuses: Record<string, number>;
  /** True when the scan stopped before reaching the end of the range. */
  interrupted: boolean;
}

const BAR_WIDTH = 24;
const BREAKDOWN_LIMIT = 10;

/**
 * Draw a fixed-width progress bar for `done` out of `total`.
 */
export function renderBar(done: number, total: number, width: number): string {
  const ratio = total > 0 ? Math.min(done / total, 1) : 1;
  const filled = Math.round(ratio * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Render a duration the way a person reads it: milliseconds below a second,
 * one decimal below a minute, minutes and seconds above.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
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
function readErrorProp(err: unknown, key: string): string | undefined {
  if (typeof err === 'object' && err !== null && key in err) {
    const value = Reflect.get(err, key);
    return value === undefined ? undefined : String(value);
  }
  return undefined;
}

/**
 * Outcome of probing a single endpoint.
 */
interface Probe {
  ok: boolean;
  /** Status code, or the reason it never produced one. */
  status: string;
}

async function isServerRespond(
  url: string,
  verbose: boolean,
  timeout: number,
  redraw: (line: string) => void,
): Promise<Probe> {
  try {
    // superagent takes both budgets; cap the first response at the deadline.
    const res = await request.head(url).timeout({
      response: timeout,
      deadline: timeout,
    });
    redraw(`${green('✓')} ${green(String(res.status))}  ${url}\n`);
    return { ok: true, status: String(res.status) };
  } catch (err) {
    const status = readErrorProp(err, 'status');
    const message = readErrorProp(err, 'message') ?? 'no response';
    if (verbose) {
      const reason = status ? `${status} ${message}` : message;
      redraw(`${red('✗')} ${red(reason)}  ${gray(url)}\n`);
    }
    return { ok: false, status: status ?? 'no response' };
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
  signal: AbortSignal | undefined,
): Promise<StartResult> {
  const ranges = generators.map((factory) => collectValues(factory(from, to)));
  const combinations = cartesian(ranges);
  const total = combinations.length;

  console.log(
    cyan(
      `Scanning ${total} endpoint${total === 1 ? '' : 's'} ` +
        `with ${concurrency} parallel request${concurrency === 1 ? '' : 's'}`,
    ),
  );

  const responding: string[] = [];
  const statuses: Record<string, number> = {};
  let checked = 0;
  const startedAt = Date.now();

  // A redirected stream has no cursor to rewind, so the bar would be left
  // behind as noise in the file or pipe.
  const interactive = Boolean(process.stdout.isTTY);
  let barLength = 0;

  const drawBar = () => {
    if (!interactive) {
      return;
    }
    const percent = total > 0 ? Math.round((checked / total) * 100) : 100;
    const line = `  ${renderBar(checked, total, BAR_WIDTH)} ${checked}/${total} (${percent}%)`;
    barLength = line.length;
    log(`\r${line}`);
  };

  // Results and the bar share one line, so a result has to wipe the bar
  // before printing and put it back afterwards.
  const redraw = (text: string) => {
    if (interactive) {
      log(`\r${' '.repeat(barLength)}\r`);
    }
    log(text);
  };

  drawBar();

  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, total) },
    async () => {
      while (cursor < total && !signal?.aborted) {
        const combo = combinations[cursor++];
        const labels = combo.map((value) => formatValue(value, pad));
        const compiledUrl = applyParams(url, labels);
        if (delayTime > 0) {
          await delay(delayTime);
        }
        const probe = await isServerRespond(
          compiledUrl,
          verbose,
          timeout,
          redraw,
        );
        checked++;
        statuses[probe.status] = (statuses[probe.status] ?? 0) + 1;
        if (probe.ok) {
          responding.push(compiledUrl);
        }
        drawBar();
      }
    },
  );

  await Promise.all(workers);

  // Wipe the bar for good; the summary speaks for the finished run.
  if (interactive) {
    log(`\r${' '.repeat(barLength)}\r`);
  }

  const elapsed = Date.now() - startedAt;
  const silent = checked - responding.length;
  const rate = elapsed > 0 ? (checked / elapsed) * 1000 : checked;
  // A signal that lands after the last endpoint changed nothing.
  const interrupted = Boolean(signal?.aborted) && checked < total;

  if (interrupted) {
    console.log(yellow(`\nInterrupted after ${checked} of ${total} endpoints`));
  }

  console.log(
    `${interrupted ? '' : '\n'}Checked ${bold(String(checked))} ` +
      `endpoint${checked === 1 ? '' : 's'} ` +
      `in ${bold(formatDuration(elapsed))} (${rate.toFixed(1)}/s)`,
  );
  console.log(
    `Found ${green(`${responding.length} responding`)}, ` +
      `${gray(`${silent} silent`)}`,
  );

  const breakdown = Object.entries(statuses).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  if (breakdown.length > 0) {
    console.log('\nStatus breakdown:');
    // A wide scan can turn up dozens of distinct statuses; showing them all
    // would bury the summary, so only the most frequent ones are listed.
    for (const [status, count] of breakdown.slice(0, BREAKDOWN_LIMIT)) {
      const isOk = /^[23]\d\d$/.test(status);
      const label = status.padEnd(12);
      console.log(`  ${isOk ? green(label) : gray(label)} ${count}`);
    }
    const hidden = breakdown.length - BREAKDOWN_LIMIT;
    if (hidden > 0) {
      console.log(gray(`  ... and ${hidden} more`));
    }
  }

  return { responding, checked, silent, elapsed, statuses, interrupted };
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
  signal,
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
    signal,
  );
}

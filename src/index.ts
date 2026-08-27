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

const log = process.stdout.write.bind(process.stdout);

export interface StartOptions {
  url: string;
  from: number;
  to: number;
  verbose: boolean;
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

const REQUEST_TIMEOUT = { response: 5000, deadline: 10000 };

async function isServerRespond(
  url: string,
  value: number,
  max: number,
  verbose: boolean
): Promise<void> {
  const prefix = value.toString().padStart(max.toString().length);
  log(`[${prefix}] ${url} ...`);
  try {
    const res = await request.head(url).timeout(REQUEST_TIMEOUT);
    log(`\r[${prefix}] ${url} ${green(String(res.status))}: ${green(url)}`);
  } catch (err) {
    if (verbose) {
      const status = readErrorProp(err, 'status');
      const message = readErrorProp(err, 'message');
      log(`\r[${prefix}] ${url} \t\t${red(`${status}: ${message}`)}`);
    }
  }
  log('\n');
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
    (acc, range) => acc.flatMap((combo) => range.map((value) => [...combo, value])),
    [[]]
  );
}

async function test(
  url: string,
  from: number,
  to: number,
  verbose: boolean,
  generators: GeneratorFactory[]
): Promise<void> {
  console.log(cyan('🚀 Enumeration started...'));

  const ranges = generators.map((factory) => collectValues(factory(from, to)));
  const combinations = cartesian(ranges);

  for (const combo of combinations) {
    const compiledUrl = applyParams(url, combo);
    await delay(50);
    await isServerRespond(compiledUrl, combo[combo.length - 1] ?? 0, to, verbose);
  }

  console.log(cyan('✅ Enumeration completed'));
}

/**
 * Start enumerating endpoints derived from the provided URL template.
 * Rejects if enumeration fails, so the caller can set a non-zero exit code.
 */
export async function start({ url, from, to, verbose }: StartOptions): Promise<void> {
  // Reject a template that is not a valid http(s) URL once placeholders are
  // filled, before firing any request.
  const probe = url.replace(/\{\{.+?\}\}/g, '0');
  let parsed: URL;
  try {
    parsed = new URL(probe);
  } catch {
    console.log(red(`Invalid URL: ${url}`));
    throw new Error(`Invalid URL: ${url}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    console.log(red(`Unsupported protocol: ${parsed.protocol} (expected http/https)`));
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }

  const params = getParams(url);
  if (params.length === 0) {
    console.log(red('There is no params in url'));
    console.log('Params format: https://example.org/{{integer}}/foo?bar=1');
    return;
  }
  try {
    const generators = getGenerators(params);
    await test(url, from, to, verbose, generators);
  } catch (err) {
    console.log(red(err instanceof Error ? err.message : String(err)));
    const supportTypeNames = Object.keys(SUPPORTED_TYPES).join(', ');
    console.log('Supported types:', supportTypeNames);
    throw err;
  }
}

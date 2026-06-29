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

async function isServerRespond(
  url: string,
  value: number,
  max: number,
  verbose: boolean
): Promise<void> {
  const prefix = value.toString().padStart(max.toString().length);
  log(`[${prefix}] ${url} ...`);
  try {
    const res = await request.head(url);
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

async function test(
  url: string,
  from: number,
  to: number,
  verbose: boolean,
  generators: GeneratorFactory[]
): Promise<void> {
  console.log(cyan('🚀 Enumeration started...'));

  for (let g = 0; g < generators.length; g++) {
    const generator = generators[g];
    const gen = generator(from, to);
    const getNextValue = gen.next;

    for (let i = from; i <= to; i++) {
      const value = getNextValue();
      const compiledUrl = applyParams(url, { [gen.type]: value ?? '' });
      await delay(50);
      await isServerRespond(compiledUrl, value ?? 0, to, verbose);
    }
  }

  console.log(cyan('✅ Enumeration completed'));
}

/**
 * Start enumerating endpoints derived from the provided URL template.
 */
export function start({ url, from, to, verbose }: StartOptions): void {
  const params = getParams(url);
  if (params.length === 0) {
    console.log(red('There is no params in url'));
    console.log('Params format: https://example.org/{{integer}}/foo?bar=1');
    return;
  }
  try {
    const generators = getGenerators(params);
    test(url, from, to, verbose, generators);
  } catch (err) {
    console.log(red(err instanceof Error ? err.message : String(err)));
    const supportTypeNames = Object.keys(SUPPORTED_TYPES).join(', ');
    console.log('Supported types:', supportTypeNames);
  }
}

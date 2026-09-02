import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { head, respondWith, failWith } = vi.hoisted(() => {
  const head = vi.fn();
  // superagent requests are chained through .timeout() before they settle.
  const respondWith = (res: unknown) =>
    head.mockImplementation(() => ({ timeout: () => Promise.resolve(res) }));
  const failWith = (err: unknown) =>
    head.mockImplementation(() => ({ timeout: () => Promise.reject(err) }));
  return { head, respondWith, failWith };
});

vi.mock('superagent', () => ({
  default: { head },
}));

import { start } from '../../src/index';

interface Stdout {
  /** Output as a terminal would render it, with carriage returns applied. */
  rendered(): string;
  /** Everything written, verbatim apart from color codes. */
  raw(): string;
}

function captureStdout(): Stdout {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });

  // eslint-disable-next-line no-control-regex
  const raw = () => chunks.join('').replace(/\x1b\[[0-9;]*m/g, '');

  const rendered = () => {
    const lines: string[] = [];
    let line = '';
    let column = 0;
    for (const char of raw()) {
      if (char === '\n') {
        lines.push(line);
        line = '';
        column = 0;
      } else if (char === '\r') {
        // Rewind to the start of the line; later text overwrites earlier text.
        column = 0;
      } else {
        line = line.slice(0, column) + char + line.slice(column + 1);
        column++;
      }
    }
    lines.push(line);
    return lines.join('\n');
  };

  return { rendered, raw };
}

describe('output: quiet mode', () => {
  let stdout: Stdout;

  beforeEach(() => {
    head.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    stdout = captureStdout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves no trace of an endpoint that did not respond', async () => {
    failWith(Object.assign(new Error('Not Found'), { status: 404 }));

    await start({
      url: 'https://example.org/{{integer}}',
      from: 7,
      to: 7,
      verbose: false,
      delay: 0,
    });

    expect(stdout.rendered().trim()).toBe('');
  });

  it('still reports an endpoint that responded', async () => {
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 7,
      to: 7,
      verbose: false,
      delay: 0,
    });

    expect(stdout.rendered()).toContain('https://example.org/7');
    expect(stdout.rendered()).toContain('200');
  });

  it('reports the failure reason in verbose mode', async () => {
    failWith(Object.assign(new Error('Not Found'), { status: 404 }));

    await start({
      url: 'https://example.org/{{integer}}',
      from: 7,
      to: 7,
      verbose: true,
      delay: 0,
    });

    expect(stdout.rendered()).toContain('404');
    expect(stdout.rendered()).toContain('Not Found');
  });
});

describe('output: non-interactive stdout', () => {
  let stdout: Stdout;
  const originalIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    head.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    stdout = captureStdout();
    // Piped or redirected output: there is no cursor to rewind.
    process.stdout.isTTY = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.stdout.isTTY = originalIsTTY;
  });

  it('writes no carriage returns when the output is redirected', async () => {
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 2,
      verbose: false,
      delay: 0,
    });

    expect(stdout.raw()).not.toContain('\r');
  });

  it('emits one clean line per responding endpoint', async () => {
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 2,
      verbose: false,
      delay: 0,
    });

    expect(stdout.raw().split('\n').filter(Boolean)).toEqual([
      '✓ 200  https://example.org/1',
      '✓ 200  https://example.org/2',
    ]);
  });

  it('writes nothing for a silent endpoint', async () => {
    failWith(Object.assign(new Error('Not Found'), { status: 404 }));

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 2,
      verbose: false,
      delay: 0,
    });

    expect(stdout.raw().trim()).toBe('');
  });
});

describe('output: parallel progress', () => {
  let stdout: Stdout;
  const originalIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    head.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    stdout = captureStdout();
    process.stdout.isTTY = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.stdout.isTTY = originalIsTTY;
  });

  it('keeps every result on its own line when running in parallel', async () => {
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 4,
      verbose: false,
      delay: 0,
      concurrency: 4,
    });

    // Workers never rewind the shared line themselves; only the bar does,
    // so no result may end up spliced into another.
    const results = stdout
      .rendered()
      .split('\n')
      .filter((line) => line.includes('example.org'));
    expect(results).toHaveLength(4);
    // Trailing blanks are the wiped progress bar, not part of the result.
    results.forEach((line) => expect(line.trimEnd()).toMatch(/^✓ 200 {2}\S+$/));
  });

  it('animates progress on a terminal', async () => {
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 3,
      verbose: false,
      delay: 0,
      concurrency: 1,
    });

    expect(stdout.raw()).toContain('\r');
  });
});

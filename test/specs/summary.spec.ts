import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { head, respondWith, failWith } = vi.hoisted(() => {
  const head = vi.fn();
  const respondWith = (res: unknown) =>
    head.mockImplementation(() => ({ timeout: () => Promise.resolve(res) }));
  const failWith = (err: unknown) =>
    head.mockImplementation(() => ({ timeout: () => Promise.reject(err) }));
  return { head, respondWith, failWith };
});

vi.mock('superagent', () => ({
  default: { head },
}));

import { start, formatDuration } from '../../src/index';

/** Everything printed, stripped of colors, however it was written. */
function captureOutput(): () => string {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    chunks.push(args.map(String).join(' ') + '\n');
  });
  // eslint-disable-next-line no-control-regex
  return () => chunks.join('').replace(/\x1b\[[0-9;]*m/g, '');
}

describe('formatDuration', () => {
  it('renders sub-second runs in milliseconds', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(842)).toBe('842ms');
  });

  it('renders seconds with one decimal', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(2400)).toBe('2.4s');
    expect(formatDuration(59900)).toBe('59.9s');
  });

  it('renders minutes and seconds past a minute', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(95000)).toBe('1m 35s');
    expect(formatDuration(3600000)).toBe('60m 0s');
  });
});

describe('summary', () => {
  let readOutput: () => string;

  beforeEach(() => {
    head.mockReset();
    readOutput = captureOutput();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports how long the run took', async () => {
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 3,
      verbose: false,
      delay: 0,
    });

    // Matches "in 12ms", "in 1.2s" or "in 1m 2s".
    expect(readOutput()).toMatch(/in \d+(\.\d+)?(ms|s|m \d+s)/);
  });

  it('counts checked, responding and silent endpoints', async () => {
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 4,
      verbose: false,
      delay: 0,
    });

    const out = readOutput();
    expect(out).toContain('Checked 4 endpoints');
    expect(out).toContain('4 responding');
    expect(out).toContain('0 silent');
  });

  it('counts the silent endpoints when nothing answers', async () => {
    failWith(Object.assign(new Error('Not Found'), { status: 404 }));

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 3,
      verbose: false,
      delay: 0,
    });

    const out = readOutput();
    expect(out).toContain('Checked 3 endpoints');
    expect(out).toContain('0 responding');
    expect(out).toContain('3 silent');
  });

  it('reports the throughput', async () => {
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 2,
      verbose: false,
      delay: 0,
    });

    expect(readOutput()).toMatch(/\(\d+(\.\d+)?\/s\)/);
  });

  it('prints a result line without repeating the url', async () => {
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 7,
      to: 7,
      verbose: false,
      delay: 0,
    });

    const hits = readOutput()
      .split('\n')
      .filter((line) => line.includes('https://example.org/7'));
    expect(hits).toHaveLength(1);
    expect(hits[0]).toContain('200');
    expect(hits[0].match(/https:\/\/example\.org\/7/g)).toHaveLength(1);
  });

  it('explains a failure without printing "undefined"', async () => {
    failWith(
      Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }),
    );

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 1,
      verbose: true,
      delay: 0,
    });

    const out = readOutput();
    expect(out).toContain('socket hang up');
    expect(out).not.toContain('undefined');
  });

  it('returns the elapsed time in the result', async () => {
    respondWith({ status: 200 });

    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 2,
      verbose: false,
      delay: 0,
    });

    expect(result?.elapsed).toBeGreaterThanOrEqual(0);
    expect(typeof result?.elapsed).toBe('number');
  });
});

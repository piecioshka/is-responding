import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { head, respondWith, respondSequence, failWith } = vi.hoisted(() => {
  const head = vi.fn();
  const respondWith = (res: unknown) =>
    head.mockImplementation(() => ({ timeout: () => Promise.resolve(res) }));
  const respondSequence = (statuses: Array<number | null>) => {
    let index = 0;
    head.mockImplementation(() => {
      const status = statuses[index++ % statuses.length];
      return {
        timeout: () =>
          status === null
            ? Promise.reject(new Error('socket hang up'))
            : Promise.resolve({ status }),
      };
    });
  };
  const failWith = (err: unknown) =>
    head.mockImplementation(() => ({ timeout: () => Promise.reject(err) }));
  return { head, respondWith, respondSequence, failWith };
});

vi.mock('superagent', () => ({
  default: { head },
}));

import { start, renderBar } from '../../src/index';

function captureOutput(): { raw: () => string } {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    chunks.push(args.map(String).join(' ') + '\n');
  });
  // eslint-disable-next-line no-control-regex
  return { raw: () => chunks.join('').replace(/\x1b\[[0-9;]*m/g, '') };
}

describe('renderBar', () => {
  it('is empty at the start', () => {
    expect(renderBar(0, 10, 10)).toBe('░░░░░░░░░░');
  });

  it('is full at the end', () => {
    expect(renderBar(10, 10, 10)).toBe('██████████');
  });

  it('fills proportionally', () => {
    expect(renderBar(5, 10, 10)).toBe('█████░░░░░');
    expect(renderBar(3, 10, 10)).toBe('███░░░░░░░');
  });

  it('never overflows the requested width', () => {
    expect(renderBar(99, 10, 8)).toHaveLength(8);
    expect(renderBar(7, 10, 8)).toHaveLength(8);
  });

  it('treats an empty total as complete', () => {
    expect(renderBar(0, 0, 4)).toBe('████');
  });
});

describe('progress bar', () => {
  let stdout: { raw: () => string };
  const originalIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    head.mockReset();
    stdout = captureOutput();
    process.stdout.isTTY = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.stdout.isTTY = originalIsTTY;
  });

  it('draws a bar with a count and a percentage while scanning', async () => {
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 4,
      verbose: false,
      delay: 0,
    });

    const out = stdout.raw();
    expect(out).toMatch(/[█░]/);
    expect(out).toMatch(/4\/4/);
    expect(out).toMatch(/100%/);
  });

  it('leaves no bar behind once the run is over', async () => {
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 3,
      verbose: false,
      delay: 0,
    });

    // The bar is transient; the final screen must not keep a stale copy.
    const lastLine = stdout.raw().split('\n').pop() ?? '';
    expect(lastLine).not.toMatch(/[█░]/);
  });

  it('draws no bar when the output is redirected', async () => {
    process.stdout.isTTY = false;
    respondWith({ status: 200 });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 3,
      verbose: false,
      delay: 0,
    });

    expect(stdout.raw()).not.toMatch(/[█░]/);
    expect(stdout.raw()).not.toContain('\r');
  });
});

describe('status breakdown', () => {
  let stdout: { raw: () => string };

  beforeEach(() => {
    head.mockReset();
    stdout = captureOutput();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('counts how often each status occurred', async () => {
    respondSequence([200, 200, 301, 200]);

    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 4,
      verbose: false,
      delay: 0,
      concurrency: 1,
    });

    expect(result?.statuses).toEqual({ '200': 3, '301': 1 });
    expect(stdout.raw()).toMatch(/200.*3/);
    expect(stdout.raw()).toMatch(/301.*1/);
  });

  it('counts failures under a readable label', async () => {
    failWith(Object.assign(new Error('Not Found'), { status: 404 }));

    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 2,
      verbose: false,
      delay: 0,
      concurrency: 1,
    });

    expect(result?.statuses).toEqual({ '404': 2 });
    expect(stdout.raw()).toMatch(/404.*2/);
  });

  it('labels a transport failure that carries no status', async () => {
    failWith(new Error('socket hang up'));

    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 1,
      verbose: false,
      delay: 0,
      concurrency: 1,
    });

    expect(result?.statuses).toEqual({ 'no response': 1 });
    expect(stdout.raw()).not.toContain('undefined');
  });

  it('orders the breakdown by how often each status occurred', async () => {
    respondSequence([500, 200, 200, 200, 500, 404]);

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 6,
      verbose: false,
      delay: 0,
      concurrency: 1,
    });

    // Compare inside the breakdown only; result lines mention statuses too.
    const breakdown = stdout.raw().split('Status breakdown:')[1] ?? '';
    const order = breakdown
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[0])
      .filter(Boolean);
    expect(order).toEqual(['200', '500', '404']);
  });
});

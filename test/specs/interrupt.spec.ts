import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { head, respondWith } = vi.hoisted(() => {
  const head = vi.fn();
  const respondWith = (res: unknown) =>
    head.mockImplementation(() => ({ timeout: () => Promise.resolve(res) }));
  return { head, respondWith };
});

vi.mock('superagent', () => ({
  default: { head },
}));

import { start } from '../../src/index';

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

describe('interrupt', () => {
  let readOutput: () => string;

  beforeEach(() => {
    head.mockReset();
    respondWith({ status: 200 });
    readOutput = captureOutput();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stops early once the signal is raised', async () => {
    const controller = new AbortController();
    // Abort after the third endpoint so the run cannot reach 50.
    head.mockImplementation(() => {
      if (head.mock.calls.length >= 3) {
        controller.abort();
      }
      return { timeout: () => Promise.resolve({ status: 200 }) };
    });

    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 50,
      verbose: false,
      delay: 0,
      concurrency: 1,
      signal: controller.signal,
    });

    expect(result?.checked).toBeLessThan(50);
    expect(result?.checked).toBeGreaterThan(0);
  });

  it('reports the same summary it would have on a full run', async () => {
    const controller = new AbortController();
    head.mockImplementation(() => {
      if (head.mock.calls.length >= 3) {
        controller.abort();
      }
      return { timeout: () => Promise.resolve({ status: 200 }) };
    });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 50,
      verbose: false,
      delay: 0,
      concurrency: 1,
      signal: controller.signal,
    });

    const out = readOutput();
    expect(out).toMatch(/Checked \d+ endpoints? in/);
    expect(out).toContain('responding');
    expect(out).toContain('silent');
    expect(out).toContain('Status breakdown:');
  });

  it('says the run was interrupted', async () => {
    const controller = new AbortController();
    head.mockImplementation(() => {
      if (head.mock.calls.length >= 2) {
        controller.abort();
      }
      return { timeout: () => Promise.resolve({ status: 200 }) };
    });

    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 50,
      verbose: false,
      delay: 0,
      concurrency: 1,
      signal: controller.signal,
    });

    expect(readOutput()).toMatch(/[Ii]nterrupted/);
  });

  it('marks the result as interrupted', async () => {
    const controller = new AbortController();
    head.mockImplementation(() => {
      if (head.mock.calls.length >= 2) {
        controller.abort();
      }
      return { timeout: () => Promise.resolve({ status: 200 }) };
    });

    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 50,
      verbose: false,
      delay: 0,
      concurrency: 1,
      signal: controller.signal,
    });

    expect(result?.interrupted).toBe(true);
  });

  it('reports a completed run as not interrupted', async () => {
    respondWith({ status: 200 });

    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 3,
      verbose: false,
      delay: 0,
    });

    expect(result?.interrupted).toBe(false);
    expect(readOutput()).not.toMatch(/[Ii]nterrupted/);
  });

  it('keeps the findings collected before the interruption', async () => {
    const controller = new AbortController();
    head.mockImplementation(() => {
      if (head.mock.calls.length >= 3) {
        controller.abort();
      }
      return { timeout: () => Promise.resolve({ status: 200 }) };
    });

    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 50,
      verbose: false,
      delay: 0,
      concurrency: 1,
      signal: controller.signal,
    });

    expect(result?.responding.length).toBeGreaterThan(0);
    expect(result?.responding.length).toBe(result?.checked);
    expect(
      Object.values(result?.statuses ?? {}).reduce((a, b) => a + b, 0),
    ).toBe(result?.checked);
  });

  it('never starts a request once the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 10,
      verbose: false,
      delay: 0,
      signal: controller.signal,
    });

    expect(head).not.toHaveBeenCalled();
    expect(result?.checked).toBe(0);
    expect(result?.interrupted).toBe(true);
  });

  it('is not interrupted when the signal arrives after the last endpoint', async () => {
    const controller = new AbortController();
    respondWith({ status: 200 });

    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 3,
      verbose: false,
      delay: 0,
      concurrency: 1,
      signal: controller.signal,
    });

    // Everything was already checked, so a late Ctrl+C changes nothing.
    controller.abort();

    expect(result?.checked).toBe(3);
    expect(result?.interrupted).toBe(false);
    expect(readOutput()).not.toMatch(/[Ii]nterrupted/);
  });
});

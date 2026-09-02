import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { head, state } = vi.hoisted(() => {
  const state = { inFlight: 0, peak: 0 };
  // Each request stays open briefly, so overlapping ones are observable.
  const head = vi.fn(() => ({
    timeout: () =>
      new Promise((resolve) => {
        state.inFlight++;
        state.peak = Math.max(state.peak, state.inFlight);
        setTimeout(() => {
          state.inFlight--;
          resolve({ status: 200 });
        }, 5);
      }),
  }));
  return { head, state };
});

vi.mock('superagent', () => ({
  default: { head },
}));

import { start } from '../../src/index';

describe('concurrency', () => {
  beforeEach(() => {
    head.mockClear();
    state.inFlight = 0;
    state.peak = 0;
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps five requests in flight by default', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 20,
      verbose: false,
      delay: 0,
    });

    expect(state.peak).toBe(5);
  });

  it('honours an explicit concurrency limit', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 20,
      verbose: false,
      delay: 0,
      concurrency: 3,
    });

    expect(state.peak).toBe(3);
  });

  it('runs one at a time when concurrency is 1', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 6,
      verbose: false,
      delay: 0,
      concurrency: 1,
    });

    expect(state.peak).toBe(1);
  });

  it('never opens more slots than there are endpoints', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 2,
      verbose: false,
      delay: 0,
      concurrency: 10,
    });

    expect(state.peak).toBe(2);
  });

  it('checks every endpoint exactly once', async () => {
    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 7,
      verbose: false,
      delay: 0,
      concurrency: 3,
    });

    expect(result?.checked).toBe(7);
    expect(head).toHaveBeenCalledTimes(7);
    expect(new Set(result?.responding).size).toBe(7);
  });

  it('reports every responding endpoint despite the interleaving', async () => {
    const result = await start({
      url: 'https://example.org/{{integer}}',
      from: 1,
      to: 4,
      verbose: false,
      delay: 0,
      concurrency: 4,
    });

    expect(new Set(result?.responding)).toEqual(
      new Set([
        'https://example.org/1',
        'https://example.org/2',
        'https://example.org/3',
        'https://example.org/4',
      ]),
    );
  });
});

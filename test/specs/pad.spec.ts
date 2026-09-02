import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { head } = vi.hoisted(() => {
  const head = vi.fn(() => ({
    timeout: () => Promise.resolve({ status: 200 }),
  }));
  return { head };
});

vi.mock('superagent', () => ({
  default: { head },
}));

import { start } from '../../src/index';

function calledUrls(): string[] {
  return head.mock.calls.map((call) => (call as unknown as string[])[0]);
}

describe('pad: zero padding', () => {
  beforeEach(() => {
    head.mockClear();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pads values below the requested width with leading zeros', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: 8,
      to: 11,
      verbose: false,
      delay: 0,
      pad: 3,
    });

    expect(calledUrls()).toEqual([
      'https://example.org/008',
      'https://example.org/009',
      'https://example.org/010',
      'https://example.org/011',
    ]);
  });

  it('leaves values wider than the pad untouched', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: 1000,
      to: 1000,
      verbose: false,
      delay: 0,
      pad: 2,
    });

    expect(calledUrls()).toEqual(['https://example.org/1000']);
  });

  it('keeps the sign in front of the padding', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: -7,
      to: -7,
      verbose: false,
      delay: 0,
      pad: 3,
    });

    expect(calledUrls()).toEqual(['https://example.org/-007']);
  });

  it('does not pad by default', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: 5,
      to: 5,
      verbose: false,
      delay: 0,
    });

    expect(calledUrls()).toEqual(['https://example.org/5']);
  });

  it('applies the same padded value to every placeholder', async () => {
    await start({
      url: 'https://example.org/{{integer}}/p/{{integer}}.jpg',
      from: 4,
      to: 4,
      verbose: false,
      delay: 0,
      pad: 2,
    });

    expect(calledUrls()).toEqual(['https://example.org/04/p/04.jpg']);
  });
});

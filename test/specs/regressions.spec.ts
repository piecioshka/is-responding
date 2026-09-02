import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { head } = vi.hoisted(() => ({ head: vi.fn() }));

vi.mock('superagent', () => ({
  default: { head },
}));

import { start } from '../../src/index';
import { applyParams, SUPPORTED_TYPES } from '../../src/generators';

describe('bug 1: start awaits the whole scan', () => {
  beforeEach(() => {
    head.mockReset();
    head.mockResolvedValue({ status: 200 });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves only after every request finished', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: 0,
      to: 2,
      verbose: false,
    });
    expect(head).toHaveBeenCalledTimes(3);
  });
});

describe('bug 3+4: range is driven by the generator', () => {
  beforeEach(() => {
    head.mockReset();
    head.mockResolvedValue({ status: 200 });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('makes no request when from is greater than to', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: 5,
      to: 1,
      verbose: false,
    });
    expect(head).not.toHaveBeenCalled();
  });

  it('never builds a url from an exhausted generator', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: 0,
      to: 1,
      verbose: false,
    });
    const calledUrls = head.mock.calls.map((call) => call[0]);
    expect(calledUrls).toEqual([
      'https://example.org/0',
      'https://example.org/1',
    ]);
  });

  it('supports a negative range', async () => {
    await start({
      url: 'https://example.org/{{integer}}',
      from: -2,
      to: -1,
      verbose: false,
    });
    const calledUrls = head.mock.calls.map((call) => call[0]);
    expect(calledUrls).toEqual([
      'https://example.org/-2',
      'https://example.org/-1',
    ]);
  });
});

describe('bug 2: generator next is not bound to the call site', () => {
  it('works when next is detached from its object', () => {
    const gen = SUPPORTED_TYPES.integer(0, 1);
    const detached = gen.next;
    expect(detached()).toBe(0);
    expect(detached()).toBe(1);
    expect(detached()).toBeNull();
  });
});

describe('bug 5: applyParams treats values as literals', () => {
  it('does not interpret dollar patterns in the replacement value', () => {
    expect(applyParams('https://example.org/{{integer}}/x', ['$&$1'])).toBe(
      'https://example.org/$&$1/x',
    );
  });
});

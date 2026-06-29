import { describe, it, expect, vi, afterEach } from 'vitest';

import { delay } from '../../src/helper';

describe('helper: delay', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a promise', () => {
    expect(delay(0)).toBeInstanceOf(Promise);
  });

  it('resolves only after the given amount of time', async () => {
    vi.useFakeTimers();
    const onResolve = vi.fn();
    delay(100).then(onResolve);

    expect(onResolve).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    expect(onResolve).toHaveBeenCalledTimes(1);
  });
});

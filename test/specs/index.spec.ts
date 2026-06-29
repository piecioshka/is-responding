import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { head } = vi.hoisted(() => ({ head: vi.fn() }));

vi.mock('superagent', () => ({
  default: { head },
}));

import { start } from '../../src/index';

describe('index: start', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    head.mockReset();
    head.mockResolvedValue({ status: 200 });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('warns when the url has no parameters', () => {
    start({
      url: 'https://example.org/static',
      from: 0,
      to: 10,
      verbose: false,
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('There is no params in url')
    );
    expect(head).not.toHaveBeenCalled();
  });

  it('reports unsupported parameter types', () => {
    start({
      url: 'https://example.org/{{foo}}',
      from: 0,
      to: 10,
      verbose: false,
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"foo" is not supported')
    );
    expect(logSpy).toHaveBeenCalledWith('Supported types:', 'integer');
    expect(head).not.toHaveBeenCalled();
  });

  it('queries every enumerated endpoint for a supported template', async () => {
    vi.useFakeTimers();

    start({
      url: 'https://example.org/{{integer}}/foo',
      from: 0,
      to: 1,
      verbose: false,
    });

    await vi.runAllTimersAsync();

    expect(head).toHaveBeenCalledTimes(2);
    expect(head).toHaveBeenCalledWith('https://example.org/0/foo');
    expect(head).toHaveBeenCalledWith('https://example.org/1/foo');
  });
});

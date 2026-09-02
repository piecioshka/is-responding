import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { head } = vi.hoisted(() => ({ head: vi.fn() }));

// superagent returns a chainable request; .timeout() resolves to the response.
function makeRequest(response: unknown) {
  return { timeout: () => Promise.resolve(response) };
}

vi.mock('superagent', () => ({
  default: { head },
}));

import { start } from '../../src/index';

describe('index: start', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    head.mockReset();
    head.mockReturnValue(makeRequest({ status: 200 }));
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('warns when the url has no parameters', async () => {
    await start({
      url: 'https://example.org/static',
      from: 0,
      to: 10,
      verbose: false,
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('There is no params in url'),
    );
    expect(head).not.toHaveBeenCalled();
  });

  it('reports unsupported parameter types', async () => {
    const result = await start({
      url: 'https://example.org/{{foo}}',
      from: 0,
      to: 10,
      verbose: false,
    });

    expect(result).toBeNull();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"foo" is not supported'),
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

  it('enumerates the cartesian product of two placeholders', async () => {
    vi.useFakeTimers();

    start({
      url: 'https://example.org/{{integer}}/{{integer}}',
      from: 0,
      to: 1,
      verbose: false,
    });

    await vi.runAllTimersAsync();

    // 2 x 2 combinations, each placeholder varied independently.
    expect(head).toHaveBeenCalledTimes(4);
    expect(head).toHaveBeenCalledWith('https://example.org/0/0');
    expect(head).toHaveBeenCalledWith('https://example.org/0/1');
    expect(head).toHaveBeenCalledWith('https://example.org/1/0');
    expect(head).toHaveBeenCalledWith('https://example.org/1/1');
  });

  it('rejects an invalid url template', async () => {
    const result = await start({
      url: 'not a url {{integer}}',
      from: 0,
      to: 1,
      verbose: false,
    });

    expect(result).toBeNull();
    expect(head).not.toHaveBeenCalled();
  });

  it('rejects a non-http protocol', async () => {
    const result = await start({
      url: 'ftp://example.org/{{integer}}',
      from: 0,
      to: 1,
      verbose: false,
    });

    expect(result).toBeNull();
    expect(head).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { start } = vi.hoisted(() => ({ start: vi.fn() }));

vi.mock('../../src/index', () => ({ start }));

import { main } from '../../src/cli';

function runWith(args: string[]): Promise<void> {
  process.argv = ['node', 'cli', ...args];
  return main();
}

describe('cli: main', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  const originalArgv = process.argv;

  beforeEach(() => {
    start.mockReset();
    start.mockResolvedValue({ responding: [], checked: 0 });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.argv = originalArgv;
    process.exitCode = undefined;
  });

  it('rejects a non-numeric --from instead of scanning nothing', async () => {
    await runWith(['-u', 'https://example.org/{{integer}}', '-f', 'abc']);

    expect(start).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('must be an integer'),
    );
  });

  it('rejects a non-numeric --to', async () => {
    await runWith(['-u', 'https://example.org/{{integer}}', '-t', 'xyz']);

    expect(start).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('rejects a range where from is greater than to', async () => {
    await runWith([
      '-u',
      'https://example.org/{{integer}}',
      '-f',
      '10',
      '-t',
      '2',
    ]);

    expect(start).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('exits with a failure code when nothing responded', async () => {
    start.mockResolvedValue({ responding: [], checked: 3 });

    await runWith(['-u', 'https://example.org/{{integer}}']);

    expect(start).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('exits with a success code when an endpoint responded', async () => {
    start.mockResolvedValue({
      responding: ['https://example.org/1'],
      checked: 3,
    });

    await runWith(['-u', 'https://example.org/{{integer}}']);

    expect(process.exitCode).toBeUndefined();
  });

  it('passes the parsed range through to start', async () => {
    await runWith([
      '-u',
      'https://example.org/{{integer}}',
      '-f',
      '3',
      '-t',
      '7',
      '-v',
    ]);

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.org/{{integer}}',
        from: 3,
        to: 7,
        verbose: true,
      }),
    );
  });

  it('rejects a negative --pad', async () => {
    // `--pad -2` would be read as separate flags, so the value is attached.
    await runWith(['-u', 'https://example.org/{{integer}}', '--pad=-2']);

    expect(start).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('rejects a fractional --pad', async () => {
    await runWith(['-u', 'https://example.org/{{integer}}', '--pad', '2.5']);

    expect(start).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('passes --pad through to start', async () => {
    start.mockResolvedValue({ responding: ['x'], checked: 1 });

    await runWith(['-u', 'https://example.org/{{integer}}', '-p', '3']);

    expect(start).toHaveBeenCalledWith(expect.objectContaining({ pad: 3 }));
  });
});

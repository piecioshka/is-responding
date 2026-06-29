import { describe, it, expect } from 'vitest';

import {
  getParams,
  applyParams,
  getGenerators,
  SUPPORTED_TYPES,
} from '../../src/generators';

describe('generators: getParams', () => {
  it('extracts every parameter name from a template', () => {
    expect(getParams('https://example.org/{{integer}}/a?b={{foo}}')).toEqual([
      'integer',
      'foo',
    ]);
  });

  it('returns an empty array when there are no parameters', () => {
    expect(getParams('https://example.org/static')).toEqual([]);
  });
});

describe('generators: applyParams', () => {
  it('replaces every placeholder with the matching value', () => {
    expect(
      applyParams('https://example.org/{{integer}}/{{integer}}', { integer: 5 })
    ).toBe('https://example.org/5/5');
  });

  it('returns the url unchanged when there is nothing to replace', () => {
    expect(applyParams('https://example.org/static', {})).toBe(
      'https://example.org/static'
    );
  });
});

describe('generators: getGenerators', () => {
  it('returns a factory for each supported parameter', () => {
    const generators = getGenerators(['integer']);
    expect(generators).toHaveLength(1);
    expect(generators[0](0, 2).type).toBe('integer');
  });

  it('throws when a parameter is not supported', () => {
    expect(() => getGenerators(['foo'])).toThrowError('"foo" is not supported');
  });
});

describe('generators: SUPPORTED_TYPES.integer', () => {
  it('yields each value in the range and then null', () => {
    const gen = SUPPORTED_TYPES.integer(0, 2);
    expect(gen.next()).toBe(0);
    expect(gen.next()).toBe(1);
    expect(gen.next()).toBe(2);
    expect(gen.next()).toBeNull();
    expect(gen.next()).toBeNull();
  });
});

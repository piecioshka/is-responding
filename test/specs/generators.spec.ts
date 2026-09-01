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

  it('extracts a repeated parameter name once per occurrence', () => {
    expect(getParams('https://example.org/{{integer}}/{{integer}}')).toEqual([
      'integer',
      'integer',
    ]);
  });

  it('ignores placeholders that are never closed', () => {
    expect(getParams('https://example.org/{{integer')).toEqual([]);
    expect(getParams('{{{{a'.repeat(1000))).toEqual([]);
  });

  it('does not treat line terminators as part of a placeholder', () => {
    expect(getParams('https://example.org/{{a\nb}}')).toEqual([]);
    expect(getParams('https://example.org/{{a\rb}}')).toEqual([]);
  });
});

describe('generators: applyParams', () => {
  it('replaces each placeholder positionally with distinct values', () => {
    expect(
      applyParams('https://example.org/{{integer}}/{{integer}}', [4, 5])
    ).toBe('https://example.org/4/5');
  });

  it('returns the url unchanged when there is nothing to replace', () => {
    expect(applyParams('https://example.org/static', [])).toBe(
      'https://example.org/static'
    );
  });

  it('leaves placeholders that are never closed untouched', () => {
    expect(applyParams('https://example.org/{{integer', { integer: 5 })).toBe(
      'https://example.org/{{integer'
    );
  });

  it('leaves malformed repeated opening braces untouched', () => {
    const url = '{{{{a'.repeat(1000);
    expect(applyParams(url, { a: 'x' })).toBe(url);
  });
});

describe('generators: getGenerators', () => {
  it('returns a factory for each supported parameter', () => {
    const generators = getGenerators(['integer']);
    expect(generators).toHaveLength(1);
    expect(generators[0](0, 2).type).toBe('integer');
  });

  it('returns one generator per placeholder, keeping duplicates', () => {
    // A URL with two {{integer}} placeholders must enumerate both dimensions.
    expect(getGenerators(['integer', 'integer'])).toHaveLength(2);
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

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

  it('keeps a repeated placeholder as separate entries', () => {
    expect(getParams('https://example.org/{{integer}}/{{integer}}')).toEqual([
      'integer',
      'integer',
    ]);
  });
});

describe('generators: applyParams', () => {
  it('fills each placeholder from the matching position', () => {
    expect(
      applyParams('https://example.org/{{integer}}/{{integer}}', [4, 9]),
    ).toBe('https://example.org/4/9');
  });

  it('returns the url unchanged when there is nothing to replace', () => {
    expect(applyParams('https://example.org/static', [])).toBe(
      'https://example.org/static',
    );
  });

  it('does not interpret dollar patterns in the replacement value', () => {
    expect(applyParams('https://example.org/{{integer}}/x', ['$&$1'])).toBe(
      'https://example.org/$&$1/x',
    );
  });

  it('leaves placeholders that are never closed untouched', () => {
    expect(applyParams('https://example.org/{{integer', [5])).toBe(
      'https://example.org/{{integer',
    );
  });

  it('matches a malformed template in linear time', () => {
    // Guards against the polynomial backtracking of a lazy dot group.
    const url = '{{{{a'.repeat(1000);
    expect(applyParams(url, ['x'])).toBe(url);
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

  it('works when next is detached from its object', () => {
    const detached = SUPPORTED_TYPES.integer(0, 1).next;
    expect(detached()).toBe(0);
    expect(detached()).toBe(1);
    expect(detached()).toBeNull();
  });

  it('yields nothing when the range is empty', () => {
    expect(SUPPORTED_TYPES.integer(5, 1).next()).toBeNull();
  });
});

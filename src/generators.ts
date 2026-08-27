const PARAMS_REGEXP = /\{\{([^{}\r\n\u2028\u2029]+)\}\}/g;

/**
 * A single value generator bound to a `from`/`to` range.
 */
export interface ValueGenerator {
  type: string;
  next(): number | null;
}

/**
 * Factory producing a {@link ValueGenerator} for a given range.
 */
export type GeneratorFactory = (from: number, to: number) => ValueGenerator;

export const SUPPORTED_TYPES: Record<string, GeneratorFactory> = {
  integer: (from, to) => {
    let current = from;
    return {
      type: 'integer',
      next() {
        if (current > to) {
          return null;
        }
        return current++;
      },
    };
  },
};

/**
 * Extract parameter names from a URL template.
 */
export function getParams(url: string): string[] {
  const params = url.match(PARAMS_REGEXP);
  if (!params) {
    return [];
  }
  return params.map((param) => param.replace(PARAMS_REGEXP, '$1'));
}

/**
 * Replace `{{parameter}}` placeholders in a URL, substituting each occurrence
 * (left to right) with the matching entry of `values`. Positional so a URL
 * with several placeholders of the same type gets distinct values.
 */
export function applyParams(url: string, values: Array<string | number>): string {
  let index = 0;
  return url.replace(PARAMS_REGEXP, () => String(values[index++] ?? ''));
}

/**
 * Validate that every parameter is supported, throwing otherwise.
 */
function filterParams(params: string[]): string[] {
  return params.filter((param) => {
    const status = SUPPORTED_TYPES[param];
    if (!status) {
      throw new Error(`"${param}" is not supported`);
    }
    return Boolean(status);
  });
}

/**
 * Resolve the generator factories for the requested parameters, one per
 * placeholder, preserving order and duplicates. A URL with two
 * `{{integer}}` placeholders yields two generators, not one.
 */
export function getGenerators(params: string[]): GeneratorFactory[] {
  return filterParams(params).map((param) => SUPPORTED_TYPES[param]);
}

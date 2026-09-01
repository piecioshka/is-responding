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
 * Replace `{{parameter}}` placeholders in a URL with the provided values.
 */
export function applyParams(
  url: string,
  data: Record<string, string | number>
): string {
  const matches = url.match(PARAMS_REGEXP);
  if (!matches) {
    return url;
  }
  const compiledUrl = matches.reduce((currentUrl, type) => {
    const clearType = type.replace(PARAMS_REGEXP, '$1');
    return currentUrl.replace(type, String(data[clearType]));
  }, url);
  return compiledUrl;
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
 * Resolve the generator factories for the requested parameters.
 */
export function getGenerators(params: string[]): GeneratorFactory[] {
  const supportedParams = filterParams(params);
  const generators = Object.keys(SUPPORTED_TYPES)
    .filter((type) => supportedParams.includes(type))
    .map((type) => SUPPORTED_TYPES[type]);
  return generators;
}

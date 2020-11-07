const PARAMS_REGEXP = /\{\{(.+?)\}\}/g;
const SUPPORTED_TYPES = {
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
 * @param {string} url
 * @returns {string[]}
 */
function getParams(url) {
  const params = url.match(PARAMS_REGEXP);
  if (!params) {
    return [];
  }
  return params.map(param => param.replace(PARAMS_REGEXP, '$1'));
}

/**
 * @param {string} url
 * @param {Object} data
 * @returns {string}
 */
function applyParams(url, data) {
  const compiledUrl = url.match(PARAMS_REGEXP).reduce((currentUrl, type) => {
    const clearType = type.replace(PARAMS_REGEXP, '$1');
    return currentUrl.replace(type, data[clearType]);
  }, url);
  return compiledUrl;
}

/**
 * @param {string[]} params
 * @returns {string[]}
 */
function filterParams(params) {
  return params.filter(param => {
    const status = SUPPORTED_TYPES[param];
    if (!status) {
      throw new Error(`"${param}" is not supported`);
    }
    return status;
  });
}

/**
 * @param {string[]} params
 * @returns {Function[]}
 */
function getGenerators(params) {
  const supportedParams = filterParams(params);
  const generators = Object.keys(SUPPORTED_TYPES)
    .filter(type => supportedParams.includes(type))
    .map(type => SUPPORTED_TYPES[type]);
  return generators;
}

module.exports = {
  applyParams,
  getParams,
  getGenerators,
  SUPPORTED_TYPES,
};

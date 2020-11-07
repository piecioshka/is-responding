const { red, green, yellow, cyan } = require('colors');
const request = require('superagent');
const ora = require('ora');

const { delay } = require('./helper');
const {
  applyParams,
  getParams,
  getGenerators,
  SUPPORTED_TYPES,
} = require('./generators');

/**
 * @param {string} url
 * @param {ora} spinner
 * @param {number} value
 * @param {string} verbose
 */
async function isServerRespond(url, spinner, value, verbose) {
  spinner.text = `[${value}] ${url}`;
  try {
    const res = await request.head(url);
    spinner.succeed(`[${value}] ${green(String(res.status))}: ${green(url)}`);
    spinner.start();
  } catch (err) {
    if (verbose) {
      spinner.succeed(`[${value}] ${red(err.status)}: ${red(err.message)}`);
      spinner.start();
    }
  }
}

/**
 * @param {string} url
 * @param {number} from
 * @param {number} to
 * @param {string} verbose
 * @param {Function[]} generators
 */
async function test(url, from, to, verbose, generators) {
  const map = {};
  const requests = [];
  const spinner = ora().start();

  spinner.info('Enumeration started');
  spinner.start();

  for (let g = 0; g < generators.length; g++) {
    const generator = generators[g];
    const gen = generator(from, to);
    const getNextValue = (map[gen.type] = gen.next);

    for (let i = from; i <= to; i++) {
      const value = getNextValue();
      const compiledUrl = applyParams(url, { [gen.type]: value });
      await delay(50);
      requests.push(isServerRespond(compiledUrl, spinner, value, verbose));
    }
  }

  await Promise.all(requests);

  spinner.info('Enumeration completed');
  spinner.stop();
}

/**
 * @param {Object} options
 * @param {string} options.url
 * @param {number} options.from
 * @param {number} options.to
 * @param {string} options.verbose
 */
function start({ url, from, to, verbose }) {
  const params = getParams(url);
  if (params.length === 0) {
    console.log(yellow('There is no params in url'));
    console.log('Params format: https://example.org/{{integer}}/foo?bar=1');
    return;
  }
  try {
    const generators = getGenerators(params);
    test(url, from, to, verbose, generators);
  } catch (err) {
    console.log(yellow(err.message));
    const supportTypeNames = Object.keys(SUPPORTED_TYPES).join(', ');
    console.log('Supported types:', cyan(supportTypeNames));
  }
}

module.exports = {
  start,
};

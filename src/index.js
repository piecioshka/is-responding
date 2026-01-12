const { red, green, cyan } = require("colors");
const request = require("superagent");

const { delay } = require("./helper");
const {
  applyParams,
  getParams,
  getGenerators,
  SUPPORTED_TYPES,
} = require("./generators");

const log = process.stdout.write.bind(process.stdout);

/**
 * @param {string} url
 * @param {number} value
 * @param {number} max
 * @param {string} verbose
 */
async function isServerRespond(url, value, max, verbose) {
  const prefix = value.toString().padStart(max.toString().length);
  log(`[${prefix}] ${url} ...`);
  try {
    const res = await request.head(url);
    log(`\r[${prefix}] ${url} ${green(String(res.status))}: ${green(url)}`);
  } catch (err) {
    if (verbose) {
      log(`\r[${prefix}] ${url} \t\t${red(`${err.status}: ${err.message}`)}`);
    }
  }
  log("\n");
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

  console.log(cyan("🚀 Enumeration started..."));

  for (let g = 0; g < generators.length; g++) {
    const generator = generators[g];
    const gen = generator(from, to);
    const getNextValue = (map[gen.type] = gen.next);

    for (let i = from; i <= to; i++) {
      const value = getNextValue();
      const compiledUrl = applyParams(url, { [gen.type]: value });
      await delay(50);
      requests.push(await isServerRespond(compiledUrl, value, to, verbose));
    }
  }

  console.log(cyan("✅ Enumeration completed"));
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
    console.log(red("There is no params in url"));
    console.log("Params format: https://example.org/{{integer}}/foo?bar=1");
    return;
  }
  try {
    const generators = getGenerators(params);
    test(url, from, to, verbose, generators);
  } catch (err) {
    console.log(red(err.message));
    const supportTypeNames = Object.keys(SUPPORTED_TYPES).join(", ");
    console.log("Supported types:", supportTypeNames);
  }
}

module.exports = {
  start,
};

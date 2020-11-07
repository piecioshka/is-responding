/**
 * @param {number} time
 * @returns {Promise}
 */
function delay(time = 1000) {
  return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = {
  delay,
};

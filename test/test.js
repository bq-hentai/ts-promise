/*!
 * Promsie tester
 * @see https://github.com/promises-aplus/promises-tests
 * @bqliu
 */

const promisesAplusTests = require('promises-aplus-tests');
const adapter = require('./adapter');

promisesAplusTests(adapter, function (err) {
  console.error(err);
});

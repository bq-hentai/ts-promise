/*!
 * Promsie test adapter
 * @see https://github.com/promises-aplus/promises-tests
 * @bqliu
 */

const XPromise = require('../dist/src/promise').default;

module.exports = {
  deferred () {
    let _resolve;
    let _reject;

    return {
      promise: new XPromise((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;
      }),
      resolve: _resolve,
      reject: _reject
    }
  }
}

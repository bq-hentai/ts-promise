/*!
 * simple test of Promise
 * @bqliu
 */

import './main.css';

import XPromise from './src/promise';

new XPromise<XPromise<string> | number>(function (resolve, reject) {
  console.log(1);
  resolve(new XPromise<string>(function (r) {
    r('haha')
  }));
  resolve(3);
  reject(4);
}).then<string>((x) => {
  console.log(x);
  console.log(5)
  return 'ha';
}).then<never>(() => {
  throw new Error('This Error');
}).catch<void>((e) => {
  console.log(e);
});

console.log(2);

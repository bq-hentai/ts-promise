/*!
 * simple Promise implementation
 * @see https://promisesaplus.com/
 * @see https://github.com/iam91/zpromise
 * @bqliu
 */

/* resolve function type */
interface Resolve<T> {
  (value?: T | PromiseLike<T>): void;
}

/* reject function type */
interface Reject<T> {
  (reason?: T): void;
}

// @see [2.5](https://promisesaplus.com/#point-35)
// no this value
/* onResolved function type */
interface OnResolved<T> {
  (this: void, value: T): T | XPromise<T>;
}

/* onRejected function type */
interface OnRejected<T> {
  (this: void, reason: any): T | XPromise<T>
}

interface Executor<T> {
  // TODO fix <any>
  (resolve: Resolve<T>, reject: Reject<any>): void;
}

interface PromiseLike<T> {
  then<VResult = T, EResult = never>(
    onResolved?: OnResolved<VResult> | null,
    onRejected?: OnRejected<EResult> | null
  ): PromiseLike<VResult | EResult>
}

enum PromiseState { PENDING = 'pending', RESOLVED = 'resolved', REJECTED = 'rejected' }

type HandlerTuple<T, U> = [ OnResolved<T> | null | undefined, OnRejected<U> | null | undefined, Resolve<T>, Reject<U> ]

function isObject(x: any): boolean {
  return x !== null && typeof x === 'object';
}

function isFunction(x: any): boolean {
  return typeof x === 'function';
}

// @ts-ignore
function isThenable(x: any): boolean {
  return !!(isObject(x) && isFunction(x.then))
}

export default class XPromise<T> implements PromiseLike<T> {
  chains: Array<HandlerTuple<any, any>> = [];
  // easy debug to check state
  readonly chain: Function | null | undefined;
  
  constructor(executor?: Executor<T>) {
    if (!isFunction(executor)) {
      throw new TypeError('[Promise#executor] must be a function');
    }
    const promise = this;
    let promiseValue: any = undefined;
    let canNotChangeState: boolean = false;
    let state: PromiseState = PromiseState.PENDING;
    
    function fulfill(value: any): void {
      if (canNotChangeState) {
        return;
      }
      if (state === PromiseState.PENDING) {
        state = PromiseState.RESOLVED;
        promiseValue = value;

        done();
      }
    }
    const reject: Reject<any> = function reject(reason: any): void {
      if (canNotChangeState) {
        return;
      }
      if (state === PromiseState.PENDING) {
        state = PromiseState.REJECTED;
        promiseValue = reason;
        
        done();
      }
    }
    // @see [2.3](https://promisesaplus.com/#the-promise-resolution-procedure)
    const resolve: Resolve<any> = function resolve(x) {
      // @see [2.3.1](https://promisesaplus.com/#point-48)
      if (promise === x) {
        throw new TypeError('[Promise#resolve] same ref');
      }
      // @see [2.3.2](https://promisesaplus.com/#point-49)
      if (x instanceof XPromise) {
        // set a flag to prevent state change
        // consider:
        // new Promise((r) => {
        //   r(Promise.resolve(2).then((x) => x));
        //   r(5);
        // }).then((x) => console.log(x)); // 2 ? 5
        canNotChangeState = true;
        x.then(function (value) {
          canNotChangeState = false;
          fulfill(value);
        }, function (reason) {
          canNotChangeState = false;
          reject(reason);
        });
        return;
      }
      // @see [2.3.3](https://promisesaplus.com/#point-53)
      if (isObject(x) || isFunction(x)) {
        let then: any = null;
        try {
          // @see [2.3.3.1](https://promisesaplus.com/#point-54)
          then = x.then;
        } catch(e) {
          // @see [2.3.3.2](https://promisesaplus.com/#point-55)
          reject(e);
          return;
        }
        // @see [2.3.3](https://promisesaplus.com/#point-64)
        if (!isFunction(then)) {
          fulfill(x);
          return;
        }
        let thenCalled: boolean = false;
        // @see [2.3.3.3](https://promisesaplus.com/#point-56)
        const resolvePromise = function resolvePromise (value: any): void {
          if (thenCalled) {
            return;
          }
          thenCalled = true;
          resolve(value);
        }
        const rejectPromise = function rejectPromise (reason: any): void {
          if (thenCalled) {
            return;
          }
          thenCalled = true;
          reject(reason);
        }
        try {
          then.call(x, resolvePromise, rejectPromise);
        } catch(e) {
          // @see [2.3.3.3.4](https://promisesaplus.com/#point-60)
          if (!thenCalled) {
            reject(e);
          }
        }
        return;
      }
      // @see [2.3.4](https://promisesaplus.com/#point-64)
      fulfill(x);
    }
    function done() {
      if (state === PromiseState.PENDING) {
        return;
      }
      // use setTimeout(or asap)
      setTimeout(function () {
        let chain: HandlerTuple<any, any> | void = undefined;
        // const p = Promise.resolve()
        // p.then()
        // p.then()
        // so multiple chains
        while(chain = promise.chains.shift()) {
          // can infer type of chain
          const [onResolved, onRejected, resolve, reject] = chain;
          let handler: any = (state === PromiseState.RESOLVED ? onResolved : onRejected)
          
          if (!isFunction(handler)) {
            // @see [2.2.7.3](https://promisesaplus.com/#point-43)
            if (state === PromiseState.RESOLVED) {
              resolve(promiseValue);
            } else {
              reject(promiseValue);
            }
            continue;
          }
          try {
            resolve(<Function>handler(promiseValue));
          } catch(e) {
            reject(e);
          }
        }
      }, 0);
    }

    function chain (handler: HandlerTuple<any, any>) {
      promise.chains.push(handler);
      // if a promise is resolved/rejected
      // chain it and should execute handlers
      done();
    }

    Object.defineProperties(this, {
      '[[PromiseValue]]': {
        enumerable: false,
        configurable: false,
        set() { throw new Error('[Promise#value] readonly'); },
        get() { return promiseValue; }
      },
      '[[PromiseStatus]]': {
        enumerable: false,
        configurable: false,
        set() { throw new Error('[Promise#status] readonly'); },
        get() { return state }
      },
      chain: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: chain
      }
    })

    try {
      (<Executor<T>>executor)(resolve, reject);
    } catch(e) {
      reject(e);
    }
  }

  then<VResult = T, EResult = never>(
    onResolved?: OnResolved<VResult> | null,
    onRejected?: OnRejected<EResult> | null
  ): XPromise<VResult | EResult> {
    const promise = this;    
    return new XPromise<VResult | EResult>(function (resolve, reject) {
      const handler: HandlerTuple<VResult, EResult> = [ onResolved, onRejected, resolve, reject ];
      (<{ chain: Function; }>promise).chain(handler);
    });
  }

  catch<EResult = never>(onrejected: OnRejected<EResult>): XPromise<T | EResult> {
    return this.then<never, EResult>(undefined, onrejected);
  }

  static resolve<T = any> (value: T | PromiseLike<T>): XPromise<T> {
    return new XPromise<T>((resolve) => {
      resolve(value);
    });
  }

  static reject<T = never> (reason?: any): XPromise<T> {
    return new XPromise<T>((_, reject) => {
      reject(reason);
    });
  }
}

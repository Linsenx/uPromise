enum uStates {
  PENDING,
  FULFILLED,
  REJECTED
};

interface uExecutor<T> {
  (resolve: (value?: T) => void, reject: (reason?: any) => void) : void;
}
interface uFullfilled<T> {
  (value?: T) : T | any;
}
interface uRejected<U> {
  (reason?: any) : U;
}
interface uHandler<T, U> {
  onSuccess: uFullfilled<T> | undefined | null;
  onFaild: uRejected<U> | undefined | null;
}
const uValidator = {
  isObject: (o: any) => Object.prototype.toString.call(o) === '[object Object]',
  isFunction: (o: any) => Object.prototype.toString.call(o) === '[object Function]'
}

const nextTick = (fn: Function) => {
  setTimeout(() => fn(), 0);
}

class uPromise<T> {
  private value:T = null;
  private state:uStates = uStates.PENDING;
  public handlers:uHandler<any, any>[] = [];
  constructor(executor: uExecutor<T>) {
    if (executor) {
      executor(this.doResolve.bind(this), this.doReject.bind(this));
    }
  }

  static resolve<U = any>(value?: U): uPromise<U> {
    return new uPromise<U>((resolve, reject) => {
      resolve(value);
    });
  }

  static reject<U = any>(reason: U): uPromise<U> {
    return new uPromise<U>((resolve, reject) => {
      reject(reason);
    });
  }

  private transition(state: uStates, value: any) {
    if (this.state === state || this.state !== uStates.PENDING) {
      return;
    }
    this.state = state;
    this.value = value;
    this.process();
  }

  private doReject(reason: any) {
    this.transition(uStates.REJECTED, reason);
  }

  private process() {
    if (this.state === uStates.PENDING) {
      return;
    }

    nextTick(() => {
      while (this.handlers.length) {
        const handler = this.handlers.shift();
        if (this.state === uStates.FULFILLED) {
          handler.onSuccess(this.value);
        } else {
          handler.onFaild(this.value);
        }
      }
    });
  }

  private doResolve(x: any) {
    if (this === x) {
      this.transition(uStates.REJECTED, new TypeError('Promise resolve can not refer to self'));
    } else if (x instanceof uPromise) {
      if (x.state === uStates.PENDING) {
        x.then((value) => {
          this.doResolve(value);
        }, (reason) => {
          this.transition(uStates.REJECTED, reason);
        });
      } else {
        this.transition(x.state, x.value);
      }
    } else if (uValidator.isObject(x) || uValidator.isFunction(x)) {
      let called: boolean = false;
      try {
        const then = x.then;
        if (uValidator.isFunction(then)) {
          then.call(x, 
            (y: any) => {
              if (!called) {
                this.doResolve(y);
                called = true;
              }
            }, 
            (r: any) => {
              if (!called) {
                this.transition(uStates.REJECTED, r);
                called = true;
              }
            } 
          );
        } else {
          this.transition(uStates.FULFILLED, x);
        }
      } catch (e) {
        if (!called) {
          this.transition(uStates.REJECTED, e);
          called = true;
        }
      }
    } else {
      this.transition(uStates.FULFILLED, x);
    }
  }

  public then<U = T>(onfullfilled?: uFullfilled<U>, onrejected?: uRejected<any>): uPromise<U> {
    return new uPromise<U>((resolve, reject) => {
      this.handlers.push({
        onSuccess: (value) => {
          if (uValidator.isFunction(onfullfilled)) {
            try {
              resolve(onfullfilled(value));
            } catch (e) {
              reject(e);
            }
          } else {
            resolve(value);
          }
        },
        onFaild: (reason) => {
          if (uValidator.isFunction(onrejected)) {
            try {
              resolve(onrejected(reason));
            } catch (e) {
              reject(e);
            }
          } else {
            reject(reason);
          }
        }
      }); 
      this.process();
    });
  }
};

export const adapter = {
  resolved: uPromise.resolve,
  rejected: uPromise.reject,
  deferred: function() {
    let resolve: any;
    let reject: any;

    return {
      promise: new uPromise((res, rej) => {
        resolve = res;
        reject = rej;
      }),
      resolve,
      reject
    }
  }
}
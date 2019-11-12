import { adapter } from './uPromise'
import * as promisesAplusTests from 'promises-aplus-tests'

promisesAplusTests(adapter, function (err) {
  // All done; output is in the console. Or check `err` for number of failures.
  console.log(err);
});
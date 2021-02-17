// Node.js support
import semver from 'semver';
export {inspect} from 'util';

export function matchAll(string, regEx) {
  if(semver.lt(process.version, '12.0.0')) {
    const matchAll = require('match-all');
    const matches = matchAll(string, regEx);
    const all = [];
    let next;
    while((next = matches.nextRaw())) {
      all.push(next);
    }
    return all;
  } else {
    return Array.from(string.matchAll(regEx));
  }
}

// Node.js support
import * as env from "./env";

import semver from 'semver';
export {inspect} from 'util';

export function matchAll(string, regEx) {
    if(env.nodejs && semver.lt(process.version, '12.0.0')) {
        const matchAll = require('match-all')
        return matchAll(string,regEx).toArray();
    }
    else {
        return Array.from(string.matchAll(regEx));
    }
}
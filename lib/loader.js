/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import fs from 'fs';
const fsp = fs.promises;
import https from 'https';
import os from 'os';
import path from 'path';
import url from 'url';

// default caching document loader for JSON-LD Context files
async function _get({docUrl, file}) {
  const options = {
    headers: {
      accept: 'application/ld+json, application/json'
    }
  };

  await new Promise((resolve, reject) => {
    https.get(docUrl, options, res => {
      if(res.statusCode === 301 || res.statusCode === 302) {
        return _get({docUrl: res.headers.location, file});
      } else {
        res.pipe(file);
        res.on('end', resolve);
        res.on('error', reject);
      }
    });
  });
}

// default caching, redirect following document loader
export async function documentLoader(docUrl) {
  const cacheFile = path.join(
    os.tmpdir(), 'jsonld-context' + url.parse(docUrl)
      .pathname.replace(/\//g, '-').replace(/\.jsonld$/, '') + '.jsonld');
  try {
    await fsp.access(cacheFile, fs.constants.F_OK | fs.constants.R_OK);
  } catch(e) {
    const file = fs.createWriteStream(cacheFile);
    await _get({docUrl, file});
  }

  return await fsp.readFile(cacheFile);
}

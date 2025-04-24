/*!
 * Copyright (c) 2024-2025 Digital Bazaar, Inc. All rights reserved.
 */
import {
  default as chai,
  expect
} from 'chai';
import {default as chaiBytes} from 'chai-bytes';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
chai.use(chaiBytes);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import {decode, encode} from '../lib/index.js';

import * as citizenship_context from 'citizenship-context';
import * as credentials_context from 'credentials-context';
import * as did_context from 'did-context';
import * as ed25519_2020_context from 'ed25519-signature-2020-context';
import * as multikey_context from '@digitalbazaar/multikey-context';
import cit_context from 'cit-context';

const activitystreams_ctx =
  JSON.parse(fs.readFileSync(
    path.join(__dirname, 'contexts', 'activitystreams.jsonld'), 'utf8'));
const activitystreams_context = {
  contexts: new Map([
    ['https://www.w3.org/ns/activitystreams', activitystreams_ctx]
  ])
};

const _contextUrls = [
  ['https://w3id.org/cit/v1', cit_context.contexts],
  ['https://w3id.org/citizenship/v1', citizenship_context.contexts],
  ['https://w3id.org/security/multikey/v1', multikey_context.contexts],
  ['https://w3id.org/security/suites/ed25519-2020/v1', ed25519_2020_context.contexts],
  ['https://www.w3.org/2018/credentials/v1', credentials_context.contexts],
  ['https://www.w3.org/ns/activitystreams', activitystreams_context.contexts],
  ['https://www.w3.org/ns/did/v1', did_context.contexts],
];
const contextMap = new Map(_contextUrls.map(c => [c[0], c[1].get(c[0])]));

const documentLoader = url => {
  if(contextMap.has(url)) {
    return {
      contextUrl: null,
      document: contextMap.get(url),
      documentUrl: url
    };
  }
  throw new Error(`Unkonwn URL "${url}".`);
};

//const allfiles = fs.readdirSync(path.join(__dirname, '..', 'examples'));
const files = [
  'cit.jsonld',
  'cit.cborld',
  'didKey.jsonld',
  'didKey.cborld',
  'empty-array.jsonld',
  'empty-array.cborld',
  'empty-object.jsonld',
  'empty-object.cborld',
  'note.jsonld',
  'note.cborld',
  'prc.jsonld',
  'prc.cborld',
  'uncompressible.jsonld',
  'uncompressible.cborld',
];

describe('cborld examples', () => {
  // FIXME: outdated examples. Update examples to
  // use new tag processing
  for(const f of files) {
    if(f.endsWith('.jsonld')) {
      it(`check encode of JSON-LD: ${f}`, async () => {
        const jfn = path.join(__dirname, '..', 'examples', f);
        const cfn = jfn.replace('.jsonld', '.cborld');
        const jsonldDocument = JSON.parse(await fsp.readFile(jfn, 'utf8'));
        const expectedCborldBytes = await fsp.readFile(cfn, null);
        const cborldBytes = await encode({
          jsonldDocument,
          format: 'legacy-singleton',
          documentLoader
        });
        expect(cborldBytes).equalBytes(expectedCborldBytes);
      });
    }
    if(f.endsWith('.cborld')) {
      it(`check decode of CBOR-LD: ${f}`, async () => {
        const cfn = path.join(__dirname, '..', 'examples', f);
        const jfn = cfn.replace('.cborld', '.jsonld');
        const cborldBytes = await fsp.readFile(cfn, null);
        const expectedJsonldDocument =
          JSON.parse(await fsp.readFile(jfn, 'utf8'));
        const jsonldDocument = await decode({
          cborldBytes,
          documentLoader
        });
        expect(jsonldDocument).to.deep.equal(expectedJsonldDocument);
      });
    }
  }
});

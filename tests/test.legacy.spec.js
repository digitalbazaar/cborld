/*!
* Copyright (c) 2020-2024 Digital Bazaar, Inc. All rights reserved.
*/
import {
  default as chai,
  expect
} from 'chai';
import {default as chaiBytes} from 'chai-bytes';
chai.use(chaiBytes);

import {decode, encode} from '../lib/index.js';

import {
  STRING_TABLE,
  TYPE_TABLE,
} from '../lib/tables.js';

function _makeTypeTableLoader(entries) {
  const typeTables = new Map(entries);
  return async function({registryEntryId}) {
    return typeTables.get(registryEntryId);
  };
}

describe('legacy cborld (singleton)', () => {
  describe('encode', () => {
    it('should encode an empty JSON-LD Document', async () => {
      const jsonldDocument = {};
      const cborldBytes = await encode({
        jsonldDocument,
        legacyFormat: 'singleton'
      });
      expect(cborldBytes).instanceof(Uint8Array);
      expect(cborldBytes).equalBytes('d90501a0');
    });

    it('should encode xsd dateTime when using a prefix', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });
      expect(cborldBytes).equalBytes('d90501a20019800018661a6070bb5f');
    });

    it('should encode xsd date when using a prefix', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:date'
          }
        }
      };
      const date = '2021-04-09';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });
      expect(cborldBytes).equalBytes('d90501a20019800018661a606f9900');
    });

    it('should compress multibase-typed values', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: {
            '@id': 'ex:foo',
            '@type': 'https://w3id.org/security#multibase'
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: ['MAQID', 'zLdp', 'uAQID']
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });
      expect(cborldBytes).equalBytes(
        'd90501a200198000186583444d010203447a0102034475010203');
    });

    it('should compress cryptosuite strings', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: {
            '@id': 'ex:foo',
            '@type': 'https://w3id.org/security#cryptosuiteString'
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: [
          'ecdsa-rdfc-2019',
          'ecdsa-sd-2023',
          'eddsa-rdfc-2022'
        ]
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });
      expect(cborldBytes).equalBytes('d90501a200198000186583010203');
    });

    it('should encode lowercase urn:uuid using a number', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'urn:uuid:75ef3fcc-9ae3-11eb-8e3e-10bf48838a41',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });
      expect(cborldBytes).equalBytes(
        'd90501a30019800018661a6070bb5f186882035075ef3fcc9ae311eb8e3e' +
        '10bf48838a41');
    });

    it('should encode uppercase urn:uuid using a string', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'urn:uuid:75EF3FCC-9AE3-11EB-8E3E-10BF48838A41',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });
      expect(cborldBytes).equalBytes(
        'd90501a30019800018661a6070bb5f1868820378243735454633464343' +
        '2d394145332d313145422d384533452d313042463438383338413431');
    });

    it('should encode https URL', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'https://test.example',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });
      expect(cborldBytes).equalBytes(
        'd90501a30019800018661a6070bb5f186882026c746573742e6578616d706c65');
    });

    it('should encode http URL', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'http://test.example',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });
      expect(cborldBytes).equalBytes(
        'd90501a30019800018661a6070bb5f186882016c746573742e6578616d706c65');
    });
  });

  describe('decode', () => {
    it('should decode empty document CBOR-LD bytes', async () => {
      const cborldBytes = new Uint8Array([0xd9, 0x05, 0x01, 0xa0]);
      const jsonldDocument = await decode({cborldBytes});
      expect(jsonldDocument).deep.equal({});
    });

    it('should decompress multibase-typed values', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: {
            '@id': 'ex:foo',
            '@type': 'https://w3id.org/security#multibase'
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: ['MAQID', 'zLdp', 'uAQID']
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = _hexToUint8Array(
        'd90501a200198000186583444d010203447a0102034475010203');
      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decompress cryptosuite strings', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: {
            '@id': 'ex:foo',
            '@type': 'https://w3id.org/security#cryptosuiteString'
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: [
          'ecdsa-rdfc-2019',
          'ecdsa-sd-2023',
          'eddsa-rdfc-2022'
        ]
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = _hexToUint8Array(
        'd90501a200198000186583010203');
      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decompress xsd date', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:date'
          }
        }
      };
      const date = '2021-04-09';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = _hexToUint8Array(
        'd90501a20019800018661a606f9900');
      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decompress xsd dateTime', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = _hexToUint8Array(
        'd90501a20019800018661a6070bb5f');
      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decode lowercase urn:uuid', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'urn:uuid:75ef3fcc-9ae3-11eb-8e3e-10bf48838a41',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = _hexToUint8Array(
        'd90501a30019800018661a6070bb5f186882035075ef3fcc9ae311eb8e3e' +
        '10bf48838a41');
      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decode uppercase urn:uuid', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'urn:uuid:75EF3FCC-9AE3-11EB-8E3E-10BF48838A41',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = _hexToUint8Array(
        'd90501a30019800018661a6070bb5f1868820378243735454633464343' +
        '2d394145332d313145422d384533452d313042463438383338413431');
      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decode https URL', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'https://test.example',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = _hexToUint8Array(
        'd90501a30019800018661a6070bb5f186882026c746573742e6578616d706c65');
      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decode http URL', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'http://test.example',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = _hexToUint8Array(
        'd90501a30019800018661a6070bb5f186882016c746573742e6578616d706c65');
      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decode a CIT type token', async () => {
      const cborldBytes = _hexToUint8Array(
        'd90501a40015186c1864186e4c7ad90501a2011987430518411870583b7a' +
        '0000e190818fdd92908425370e0b5dad9ad92dc956b5ec2ab41ce76b8c70' +
        'cb859a7c88ca6ba68b1ff238a70ed674999b6ff5179b0ebb10140b23');

      const CONTEXT_URL = 'https://w3id.org/cit/v1';
      /* eslint-disable max-len */
      const CONTEXT = {
        '@context': {
          '@protected': true,
          type: '@type',
          ConcealedIdTokenCredential: 'https://w3id.org/cit#ConcealedIdTokenCredential',
          concealedIdToken: {
            '@id': 'https://w3id.org/cit#concealedIdToken',
            '@type': '@id'
          },
          ConcealedIdToken: {
            '@id': 'https://w3id.org/cit#ConcealedIdToken',
            '@context': {
              '@protected': true,
              meta: {'@id': 'https://w3id.org/cit#meta', '@type': 'https://w3id.org/security#multibase'},
              payload: {'@id': 'https://w3id.org/cit#payload', '@type': 'https://w3id.org/security#multibase'}
            }
          },
          Ed25519Signature2020: {
            '@id': 'https://w3id.org/security#Ed25519Signature2020',
            '@context': {
              '@protected': true,

              id: '@id',
              type: '@type',

              sec: 'https://w3id.org/security#',
              xsd: 'http://www.w3.org/2001/XMLSchema#',

              challenge: 'sec:challenge',
              created: {'@id': 'http://purl.org/dc/terms/created', '@type': 'xsd:dateTime'},
              domain: 'sec:domain',
              expires: {'@id': 'sec:expiration', '@type': 'xsd:dateTime'},
              nonce: 'sec:nonce',
              proofPurpose: {
                '@id': 'sec:proofPurpose',
                '@type': '@vocab',
                '@context': {
                  '@protected': true,

                  id: '@id',
                  type: '@type',

                  sec: 'https://w3id.org/security#',

                  assertionMethod: {'@id': 'sec:assertionMethod', '@type': '@id', '@container': '@set'},
                  authentication: {'@id': 'sec:authenticationMethod', '@type': '@id', '@container': '@set'}
                }
              },
              proofValue: {
                '@id': 'https://w3id.org/security#proofValue',
                '@type': 'https://w3id.org/security#multibase'
              },
              verificationMethod: {'@id': 'sec:verificationMethod', '@type': '@id'}
            }
          }
        }
      };
      /* eslint-enable max-len */

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const jsonldDocument = {
        '@context': 'https://w3id.org/cit/v1',
        type: 'ConcealedIdToken',
        meta: 'zvpJ2L5sbowrJPdA',
        // eslint-disable-next-line max-len
        payload: 'z1177JK4h25dHEAXAVMUMpn2zWcxLCeMLP3oVFQFQ11xHFtE9BhyoU2g47D6Xod1Mu99JR9YJdY184HY'
      };

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });

      //console.log(decodedDocument);
      expect(decodedDocument).to.eql(jsonldDocument);
    });
  });

  describe('round trip', () => {
    it('should handle native JSON types', async () => {
      const CONTEXT = {
        '@context': {
          foo: 'ex:foo'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        foo: [-1, 0, 1, true, false, 1.1, -1.1, 'text']
      };

      const documentLoader = url => {
        throw new Error(`Refused to load URL "${url}".`);
      };
      const cborldBytes = await encode({
        jsonldDocument,
        legacyFormat: 'singleton',
        documentLoader
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle embedded context', async () => {
      const CONTEXT = {
        '@context': {
          foo: 'ex:foo'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        foo: 1
      };

      const documentLoader = url => {
        throw new Error(`Refused to load URL "${url}".`);
      };
      const cborldBytes = await encode({
        jsonldDocument,
        legacyFormat: 'singleton',
        documentLoader
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle remote context', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: 'ex:foo'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: 1
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = await encode({
        jsonldDocument,
        legacyFormat: 'singleton',
        documentLoader
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle compressed remote context', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: 'ex:foo'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: 1
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle embedded scoped context', async () => {
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: 'ex:foo'
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: 1
      };

      const documentLoader = url => {
        throw new Error(`Refused to load URL "${url}".`);
      };
      const cborldBytes = await encode({
        jsonldDocument,
        legacyFormat: 'singleton',
        documentLoader
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle compressed scoped context', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: 'ex:foo'
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: 1
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle embedded nested scoped context', async () => {
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@context': {
                  bar: 'ex:bar'
                }
              }
            }
          },
          foo: 'ex:override_this'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: {
          bar: 1
        }
      };

      const documentLoader = url => {
        throw new Error(`Refused to load URL "${url}".`);
      };
      const cborldBytes = await encode({
        jsonldDocument,
        legacyFormat: 'singleton',
        documentLoader
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle nested compressed scoped context',
      async () => {
        const CONTEXT_URL = 'urn:foo';
        const CONTEXT = {
          '@context': {
            Foo: {
              '@id': 'ex:Foo',
              '@context': {
                foo: {
                  '@id': 'ex:foo',
                  '@context': {
                    bar: 'ex:bar'
                  }
                }
              }
            },
            foo: 'ex:override_this'
          }
        };
        const jsonldDocument = {
          '@context': CONTEXT_URL,
          '@type': 'Foo',
          foo: {
            bar: 1
          }
        };

        const documentLoader = url => {
          if(url === CONTEXT_URL) {
            return {
              contextUrl: null,
              document: CONTEXT,
              documentUrl: url
            };
          }
          throw new Error(`Refused to load URL "${url}".`);
        };

        const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
        const cborldBytes = await encode({
          jsonldDocument,
          documentLoader,
          legacyFormat: 'singleton',
          appContextMap
        });

        const decodedDocument = await decode({
          cborldBytes,
          documentLoader,
          appContextMap
        });
        expect(decodedDocument).to.eql(jsonldDocument);
      });

    it('should revert embedded type-scope', async () => {
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: 'ex:foo',
              bar: null
            }
          },
          foo: 'ex:override_this',
          bar: 'ex:should_exist'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: {
          foo: {
            bar: 1
          }
        }
      };

      const documentLoader = url => {
        throw new Error(`Refused to load URL "${url}".`);
      };
      const cborldBytes = await encode({
        jsonldDocument,
        legacyFormat: 'singleton',
        documentLoader
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should revert remote type-scope', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: 'ex:foo',
              bar: null
            }
          },
          foo: 'ex:override_this',
          bar: 'ex:should_exist'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        '@type': 'Foo',
        foo: {
          foo: {
            bar: 1
          }
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle embedded scoped override', async () => {
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@context': {
                  bar: {
                    '@id': 'ex:bar',
                    '@type': 'http://www.w3.org/2001/XMLSchema#dateTime'
                  }
                }
              }
            }
          },
          foo: 'ex:override_this',
          bar: 'ex:not_a_date'
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: {
          bar: date
        }
      };

      const documentLoader = url => {
        throw new Error(`Refused to load URL "${url}".`);
      };
      const cborldBytes = await encode({
        jsonldDocument,
        legacyFormat: 'singleton',
        documentLoader
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle remote scoped override', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@context': {
                  bar: {
                    '@id': 'ex:bar',
                    '@type': 'http://www.w3.org/2001/XMLSchema#dateTime'
                  }
                }
              }
            }
          },
          foo: 'ex:override_this',
          bar: 'ex:not_a_date'
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        '@type': 'Foo',
        foo: {
          bar: date
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle 2x remote scoped context', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT_2_URL = 'urn:foo-scope';
      const CONTEXT_2 = {
        '@context': {
          bar: {
            '@id': 'ex:bar',
            '@type': 'http://www.w3.org/2001/XMLSchema#dateTime'
          }
        }
      };
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@context': CONTEXT_2_URL
              }
            }
          },
          foo: 'ex:override_this',
          bar: 'ex:not_a_date'
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        '@type': 'Foo',
        foo: {
          bar: date
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        if(url === CONTEXT_2_URL) {
          return {
            contextUrl: null,
            document: CONTEXT_2,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const cborldBytes = await encode({
        jsonldDocument,
        documentLoader,
        legacyFormat: 'singleton',
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle sample Age context', async () => {
      const AGE_CONTEXT_URL = 'https://w3id.org/age/v1';
      const AGE_CONTEXT = {
        '@context': {
          '@protected': true,
          id: '@id',
          type: '@type',
          overAge: {
            '@id': 'https://w3id.org/age#overAge',
            '@type': 'http://www.w3.org/2001/XMLSchema#positiveInteger'
          }
        }
      };
      const jsonldDocument = {
        '@context': 'https://w3id.org/age/v1',
        overAge: 21
      };

      const documentLoader = url => {
        if(url === AGE_CONTEXT_URL) {
          return {
            contextUrl: null,
            document: AGE_CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = await encode({
        jsonldDocument,
        legacyFormat: 'singleton',
        documentLoader
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });

      expect(decodedDocument).to.eql({
        '@context': 'https://w3id.org/age/v1', overAge: 21
      });
    });

    it('should handle sample did:key DID document', async () => {
      const SAMPLE_CONTEXT_URL = 'https://w3id.org/did/v0.11';
      const SAMPLE_CONTEXT = {
        '@context': {
          '@protected': true,
          id: '@id',
          type: '@type',
          authentication: {
            '@id': 'https://w3id.org/security#authenticationMethod',
            '@type': '@id',
            '@container': '@set'
          }
        }
      };
      // NOTE: not a real DID example, just a test for did:key encode/decode
      const jsonldDocument = {
        '@context': 'https://w3id.org/did/v0.11',
        id: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        authentication: [
          'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH' +
            '#z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH'
        ]
      };
      const appContextMap = new Map();
      appContextMap.set('https://w3id.org/did/v0.11', 0x8744);

      const documentLoader = url => {
        if(url === SAMPLE_CONTEXT_URL) {
          return {
            contextUrl: null,
            document: SAMPLE_CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = await encode({
        jsonldDocument,
        appContextMap,
        legacyFormat: 'singleton',
        documentLoader
      });

      expect(cborldBytes).equalBytes(
        'd90501a300198744186581831904015822ed0194966b7c08e4' +
        '05775f8de6cc1c4508f6eb227403e1025b2c8ad2d7477398c5' +
        'b25822ed0194966b7c08e405775f8de6cc1c4508f6eb227403' +
        'e1025b2c8ad2d7477398c5b21866821904015822ed0194966b' +
        '7c08e405775f8de6cc1c4508f6eb227403e1025b2c8ad2d747' +
        '7398c5b2');

      const decodedDocument = await decode({
        appContextMap,
        cborldBytes,
        documentLoader
      });

      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should handle sample did:v1:nym DID document', async () => {
      const SAMPLE_CONTEXT_URL = 'https://w3id.org/did/v0.11';
      const SAMPLE_CONTEXT = {
        '@context': {
          '@protected': true,
          id: '@id',
          type: '@type',
          authentication: {
            '@id': 'https://w3id.org/security#authenticationMethod',
            '@type': '@id',
            '@container': '@set'
          }
        }
      };
      // NOTE: not a real DID example, just a test for did:key encode/decode
      const jsonldDocument = {
        '@context': 'https://w3id.org/did/v0.11',
        id: 'did:v1:nym:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        authentication: [
          'did:v1:nym:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH' +
            '#z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH'
        ]
      };
      const appContextMap = new Map();
      appContextMap.set('https://w3id.org/did/v0.11', 0x8744);

      const documentLoader = url => {
        if(url === SAMPLE_CONTEXT_URL) {
          return {
            contextUrl: null,
            document: SAMPLE_CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = await encode({
        jsonldDocument,
        appContextMap,
        legacyFormat: 'singleton',
        documentLoader
      });

      expect(cborldBytes).equalBytes(
        'd90501a300198744186581831904005822ed0194966b7c08e4' +
        '05775f8de6cc1c4508f6eb227403e1025b2c8ad2d7477398c5' +
        'b25822ed0194966b7c08e405775f8de6cc1c4508f6eb227403' +
        'e1025b2c8ad2d7477398c5b21866821904005822ed0194966b' +
        '7c08e405775f8de6cc1c4508f6eb227403e1025b2c8ad2d747' +
        '7398c5b2');

      const decodedDocument = await decode({
        appContextMap,
        cborldBytes,
        documentLoader
      });

      expect(decodedDocument).to.eql(jsonldDocument);
    });
  });

  describe('data codec', () => {
    // example context and loader
    const DATA_CONTEXT_URL = 'https://example.org/context/v1';
    const DATA_CONTEXT = {
      '@context': {
        data: {
          '@id': 'ex:data',
          '@type': '@id'
        }
      }
    };
    const appContextMap = new Map();
    appContextMap.set(DATA_CONTEXT_URL, 0x8000);
    const documentLoader = url => {
      if(url === DATA_CONTEXT_URL) {
        return {
          contextUrl: null,
          document: DATA_CONTEXT,
          documentUrl: url
        };
      }
      throw new Error(`Refused to load URL "${url}".`);
    };

    /* eslint-disable max-len */
    const vectors = [
      {
        name: 'empty plain data: (1)',
        data: 'data:',
        cborldHex: 'd90501a2001980001864820460'
      },
      {
        name: 'empty plain data: (2)',
        data: 'data:,',
        cborldHex: 'd90501a20019800018648204612c'
      },
      {
        name: 'empty plain data: set (1)',
        data: ['data:', 'data:'],
        cborldHex: 'd90501a200198000186582820460820460'
      },
      {
        name: 'empty plain data: set (2)',
        data: ['other:url', 'data:'],
        cborldHex: 'd90501a200198000186582696f746865723a75726c820460'
      },
      {
        name: 'empty base64 data:',
        data: 'data:;base64,',
        cborldHex: 'd90501a200198000186483046040'
      },
      {
        name: 'empty typed base64 data:',
        data: 'data:image/gif;base64,',
        cborldHex: 'd90501a2001980001864830469696d6167652f67696640'
      },
      {
        name: 'base64 data:',
        data:
          'data:image/gif;base64,' +
          'R0lGODdhAQABAIABAAAAAAAAACwAAAAAAQABAAACAkwBADs=',
        cborldHex:
          'd90501a2001980001864830469696d6167652f6769665823474946383761010001008001000000000000002c00000000010001000002024c01003b'
      },
      {
        name: 'base64 data: set',
        data: [
          'data:image/gif;base64,' +
          'R0lGODdhAQABAIABAAAAAAAAACwAAAAAAQABAAACAkwBADs=',
          'data:image/gif;base64,' +
          'R0lGODdhAQABAIABAAAAAAAAACwAAAAAAQABAAACAkwBADs=',
        ],
        cborldHex:
          'd90501a200198000186582830469696d6167652f6769665823474946383761010001008001000000000000002c00000000010001000002024c01003b830469696d6167652f6769665823474946383761010001008001000000000000002c00000000010001000002024c01003b'
      },
      {
        name: 'non-base64 data:',
        data:
          'data:text/plain,' +
          'test',
        cborldHex:
          'd90501a200198000186482046f746578742f706c61696e2c74657374'
      },
      {
        name: 'bad base64 data:',
        data:
          // missing trailing padding, should encode as non-base64
          'data:image/gif;base64,' +
          'R0lGODdhAQABAIABAAAAAAAAACwAAAAAAQABAAACAkwBADs',
        cborldHex:
          'd90501a200198000186482047840696d6167652f6769663b6261736536342c52306c474f4464684151414241494142414141414141414141437741414141414151414241414143416b7742414473'
      },
      {
        // RFC2397 example
        name: 'plain text',
        data: 'data:,A%20brief%20note',
        cborldHex:
          'd90501a20019800018648204712c4125323062726965662532306e6f7465'
      },
      {
        // RFC2397 example
        name: 'plain text with charset:',
        data: 'data:text/plain;charset=iso-8859-7,%be%fg%be',
        cborldHex:
          'd90501a200198000186482047827746578742f706c61696e3b636861727365743d69736f2d383835392d372c256265256667256265'
      },
      {
        // RFC2397 example
        name: 'vnd example',
        data:
          'data:application/vnd-xxx-query,' +
          'select_vcount,fcol_from_fieldtable/local',
        cborldHex:
          'd90501a2001980001864820478426170706c69636174696f6e2f766e642d7878782d71756572792c73656c6563745f76636f756e742c66636f6c5f66726f6d5f6669656c647461626c652f6c6f63616c'
      },
      {
        // MDN example
        name: 'plain text',
        data: 'data:,Hello%2C%20World%21',
        cborldHex:
         'd90501a20019800018648204742c48656c6c6f253243253230576f726c64253231'
      },
      {
        // MDN example
        name: 'base64 plain text',
        data: 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==',
        cborldHex:
          'd90501a200198000186483046a746578742f706c61696e4d48656c6c6f2c20576f726c6421'
      },
      {
        // MDN example
        name: 'plain text html',
        data:
          'data:text/html,%3Cscript%3Ealert%28%27hi%27%29%3B%3C%2Fscript%3E',
        cborldHex:
          'd90501a20019800018648204783b746578742f68746d6c2c253343736372697074253345616c6572742532382532376869253237253239253342253343253246736372697074253345'
      }
    ];
    /* eslint-enable max-len */

    const hasOnly = vectors.some(d => d.only);
    vectors.forEach(d => {
      if(hasOnly && !d.only) {
        return;
      }
      it(`should handle ${d.name}`, async () => {
        const jsonldDocument = {
          '@context': 'https://example.org/context/v1',
          data: d.data
        };

        const cborldBytes = await encode({
          jsonldDocument,
          appContextMap,
          legacyFormat: 'singleton',
          documentLoader,
          //diagnose: console.log
        });

        //console.log(d.name, Buffer.from(cborldBytes).toString('hex'));

        expect(cborldBytes).equalBytes(d.cborldHex);

        const decodedDocument = await decode({
          appContextMap,
          cborldBytes,
          documentLoader
        });

        expect(decodedDocument).to.eql(jsonldDocument);
      });
    });
  });
});

describe('legacy cborld (range)', () => {
  describe('encode', () => {
    it('should encode an empty JSON-LD Document with no compression',
      async () => {
        const jsonldDocument = {};
        const cborldBytes = await encode({
          jsonldDocument,
          legacyFormat: 'range',
          registryEntryId: 0
        });
        console.log(Buffer.from(cborldBytes).toString('hex'));
        expect(cborldBytes).instanceof(Uint8Array);
        expect(cborldBytes).equalBytes('d90600a0');
      });

    it('should encode an empty JSON-LD Document (default type table)',
      async () => {
        const jsonldDocument = {};
        const cborldBytes = await encode({
          jsonldDocument,
          legacyFormat: 'range',
          registryEntryId: 1
        });
        expect(cborldBytes).instanceof(Uint8Array);
        expect(cborldBytes).equalBytes('d90601a0');
      });

    it('should encode an empty JSON-LD Document (direct type table)',
      async () => {
        const jsonldDocument = {};
        const cborldBytes = await encode({
          jsonldDocument,
          legacyFormat: 'range',
          registryEntryId: 2,
          typeTable: new Map()
        });
        expect(cborldBytes).instanceof(Uint8Array);
        expect(cborldBytes).equalBytes('d90602a0');
      });

    it('should encode an empty JSON-LD Document (type table loader)',
      async () => {
        const jsonldDocument = {};
        const cborldBytes = await encode({
          jsonldDocument,
          legacyFormat: 'range',
          registryEntryId: 1,
          typeTableLoader: _makeTypeTableLoader([[1, new Map()]])
        });
        expect(cborldBytes).instanceof(Uint8Array);
        expect(cborldBytes).equalBytes('d90601a0');
      });

    it('should fail to encode with no typeTableLoader id found',
      async () => {
        const jsonldDocument = {};
        let result;
        let error;
        try {
          result = await encode({
            jsonldDocument,
            legacyFormat: 'range',
            registryEntryId: 2,
            typeTableLoader: _makeTypeTableLoader([])
          });
        } catch(e) {
          error = e;
        }
        expect(result).to.eql(undefined);
        expect(error?.code).to.eql('ERR_NO_TYPETABLE');
      });

    it('should fail with typeTable and typeTableLoader',
      async () => {
        const jsonldDocument = {};
        let result;
        let error;
        try {
          result = await encode({
            jsonldDocument,
            legacyFormat: 'range',
            registryEntryId: 1,
            typeTable: new Map(),
            typeTableLoader: _makeTypeTableLoader([])
          });
        } catch(e) {
          error = e;
        }
        expect(result).to.eql(undefined);
        expect(error?.name).to.eql('TypeError');
      });

    it('should encode an empty JSON-LD Document', async () => {
      const jsonldDocument = {};
      const cborldBytes = await encode({
        jsonldDocument,
        legacyFormat: 'range',
        registryEntryId: 1,
        typeTableLoader: _makeTypeTableLoader([[1, new Map()]])
      });
      expect(cborldBytes).instanceof(Uint8Array);
      expect(cborldBytes).equalBytes('d90601a0');
    });

    it('should encode an empty JSON-LD document with passed varint',
      async () => {
        const jsonldDocument = {};
        const registryEntryId = 16;
        const cborldBytes = await encode({
          jsonldDocument,
          legacyFormat: 'range',
          registryEntryId,
          typeTableLoader: _makeTypeTableLoader([[16, new Map()]])
        });
        expect(cborldBytes).instanceof(Uint8Array);
        expect(cborldBytes).equalBytes('d90610a0');
      });

    it('should encode an empty JSON-LD document with passed varint >1 byte',
      async () => {
        const jsonldDocument = {};
        const registryEntryId = 128;
        const cborldBytes = await encode({
          jsonldDocument,
          registryEntryId,
          legacyFormat: 'range',
          typeTableLoader: _makeTypeTableLoader([[128, new Map()]])
        });
        expect(cborldBytes).instanceof(Uint8Array);
        expect(cborldBytes).equalBytes('d90680824101a0');
      });

    it('should encode an empty JSON-LD document with multiple byte varint',
      async () => {
        const jsonldDocument = {};
        const registryEntryId = 1000000000;
        const cborldBytes = await encode({
          jsonldDocument,
          registryEntryId,
          legacyFormat: 'range',
          typeTableLoader: _makeTypeTableLoader([[1000000000, new Map()]])
        });
        expect(cborldBytes).instanceof(Uint8Array);
        expect(cborldBytes).equalBytes('d90680824494ebdc03a0');
      });

    it('should encode xsd dateTime when using a prefix', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        legacyFormat: 'range',
        registryEntryId: 2,
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes('d90602a20019800018661a6070bb5f');
    });

    it('should encode xsd dateTime with type table when possible', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      typeTable.set(
        'http://www.w3.org/2001/XMLSchema#dateTime',
        new Map([['2021-04-09T20:38:55Z', 0x8001]]));

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes('d90602a2001980001866428001');
    });

    it('should encode xsd date when using a prefix', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:date'
          }
        }
      };
      const date = '2021-04-09';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes('d90602a20019800018661a606f9900');
    });

    it('should compress type aliased URL values', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: '@type',
          bar: {'@id': '@type'},
          baz: '@type',
          notType: 'ex:notType'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        '@type': 'https://example.com',
        foo: 'https://example.com',
        bar: 'https://example.com',
        baz: 'https://example.com',
        // should not compress a URL, treated as a string for non-@type term
        notType: 'https://example.com'
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a600198000' +
        // `@type`
        '0282026b6578616d706c652e636f6d' +
        // `foo`
        '186482026b6578616d706c652e636f6d' +
        // `bar`
        '186682026b6578616d706c652e636f6d' +
        // `baz`
        '186882026b6578616d706c652e636f6d' +
        // `notType`, uncompressed as it is not an `@type` alias
        '186a7368747470733a2f2f6578616d706c652e636f6d');
    });

    it('should compress nested type aliased URL values', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: '@type',
          bar: {'@id': '@type'},
          baz: '@type',
          notType: 'ex:notType',
          replace: 'ex:notTypeToBeReplaced',
          nested: {
            '@id': 'ex:nested',
            '@context': {
              '@propagate': false,
              foo: 'ex:somethingUncompressed',
              alias: '@type',
              replace: {'@id': '@type'}
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        '@type': 'https://example.com',
        foo: 'https://example.com',
        bar: 'https://example.com',
        baz: 'https://example.com',
        // should not compress a URL, treated as a string for non-@type term
        notType: 'https://example.com',
        // should not compress a URL, treated as a string for non-@type term
        replace: 'https://example.com',
        nested: {
          // this should no longer compress
          foo: 'https://example.com',
          // both of these should compress now
          alias: 'https://example.com',
          replace: 'https://example.com',
          notType: {
            // should compress again because `@propagate=false`
            foo: 'https://example.com'
          }
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a800198000' +
        // `@type`
        '0282026b6578616d706c652e636f6d' +
        // `bar`
        '186482026b6578616d706c652e636f6d' +
        // `baz`
        '186682026b6578616d706c652e636f6d' +
        // `foo`
        '186882026b6578616d706c652e636f6d' +
        // `nested` map
        '186aa4' +
        // `nested.foo` uncompressed
        '18687368747470733a2f2f6578616d706c652e636f6d' +
        // `nested.notType`
        '186ca1' +
        // `nested.notType.foo`, compressed again since `@propagate=false`
        '186882026b6578616d706c652e636f6d' +
        // `nested.replace`, compressed now from property-scoped context
        '186e82026b6578616d706c652e636f6d' +
        // `nested.alias`, compressed
        '187082026b6578616d706c652e636f6d' +
        // top-level `notType`, uncompressed as it is not an `@type` alias
        '186c7368747470733a2f2f6578616d706c652e636f6d' +
        // top-level `replace`, uncompressed as it is not an `@type` alias
        '186e7368747470733a2f2f6578616d706c652e636f6d');
    });

    it('should compress multibase-typed values', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: {
            '@id': 'ex:foo',
            '@type': 'https://w3id.org/security#multibase'
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: ['MAQID', 'zLdp', 'uAQID']
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a200198000186583444d010203447a0102034475010203');
    });

    it('should compress multibase values w/type-scope', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@type': 'https://w3id.org/security#multibase'
              }
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        '@type': 'Foo',
        foo: ['MAQID', 'zLdp', 'uAQID']
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a300198000021864186783444d010203447a0102034475010203');
    });

    it('should not compress multibase values w/type-scope', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@type': 'https://w3id.org/security#multibase'
              }
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: ['MAQID', 'zLdp', 'uAQID']
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a20019800063666f6f83654d41514944647a4c6470657541514944');
    });

    it('should not compress deep nested values w/type-scope', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@type': 'https://w3id.org/security#multibase'
              }
            }
          },
          other: 'ex:other'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        '@type': 'Foo',
        other: {
          // should NOT compress because type-scope defaults to propagate=false
          foo: ['MAQID', 'zLdp', 'uAQID']
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        // type 'Foo', etc.
        'd90602a300198000021864' +
        // 'other'...
        '1866a1' +
        // 'foo', uncompressed since no longer defined by type-scope
        '186983654d41514944647a4c6470657541514944');
    });

    it('should compress multibase values w/property-scope', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          nest: {
            '@id': 'ex:nest',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@type': 'https://w3id.org/security#multibase'
              }
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        nest: {
          foo: ['MAQID', 'zLdp', 'uAQID']
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a2001980001864a1186783444d010203447a0102034475010203');
    });

    it('should compress deep nested values w/property-scope', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          other: 'ex:other',
          nest: {
            '@id': 'ex:nest',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@type': 'https://w3id.org/security#multibase'
              }
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        nest: {
          foo: ['MAQID', 'zLdp', 'uAQID'],
          other: {
            // `foo` values should still be defined as multibase-typed here
            foo: ['MAQID', 'zLdp', 'uAQID']
          }
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a2001980001864a21866a1' +
        '186983444d010203447a0102034475010203' +
        '186983444d010203447a0102034475010203');
    });

    it('should compress deep nested values w/propagate=true', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              '@propagate': true,
              foo: {
                '@id': 'ex:foo',
                '@type': 'https://w3id.org/security#multibase'
              }
            }
          },
          other: 'ex:other'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        '@type': 'Foo',
        other: {
          // should compress because type-scope has propagate=true
          foo: ['MAQID', 'zLdp', 'uAQID']
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        // type 'Foo', etc.
        'd90602a300198000021864' +
        // 'other'...
        '1866a1' +
        // 'foo', compressed since type-scope propagate=true
        '186983444d010203447a0102034475010203');
    });

    it('should not compress deep nested values w/propagate=false', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          // propagates
          foo: 'ex:foo',
          other: 'ex:other',
          nest: {
            '@id': 'ex:nest',
            '@context': {
              // does not propagate
              '@propagate': false,
              foo: {
                '@id': 'ex:foo',
                '@type': 'https://w3id.org/security#multibase'
              }
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        nest: {
          // should compress
          foo: ['MAQID', 'zLdp', 'uAQID'],
          other: {
            // should NOT compress
            foo: ['MAQID', 'zLdp', 'uAQID']
          }
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a200198000' +
        // 'nest'...
        '1866a2' +
        // 'foo' compressed, defined by property-scope
        '186583444d010203447a0102034475010203' +
        // 'other'...
        '1868a1' +
        // 'foo', uncompressed since no longer defined by property-scope
        '186583654d41514944647a4c6470657541514944');
    });

    it('should not compress w/property-scope for other property', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          nest: {
            '@id': 'ex:nest',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@type': 'https://w3id.org/security#multibase'
              }
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: ['MAQID', 'zLdp', 'uAQID']
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a20019800063666f6f83654d41514944647a4c6470657541514944');
    });

    it('should not compress type-scoped values w/property-scope', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              // do not compress bar here, but won't be in payload
              bar: 'ex:bar',
              // compress multibase here, but won't be in payload
              foo: {
                '@id': 'ex:foo',
                '@type': 'https://w3id.org/security#multibase'
              },
              nest: {
                '@id': 'ex:nest',
                '@context': {
                  // compress multibase here
                  bar: {
                    '@id': 'ex:bar',
                    '@type': 'https://w3id.org/security#multibase'
                  }
                }
              }
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        '@type': 'Foo',
        foo: ['MAQID', 'zLdp', 'uAQID'],
        nest: {
          bar: ['MAQID', 'zLdp', 'uAQID'],
          foo: ['MAQID', 'zLdp', 'uAQID']
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        // type Foo, etc.
        'd90602a400198000021864' +
        // first 'foo', type-scoped so multibase values are compressed
        '186983444d010203447a0102034475010203' +
        // 'nest'...
        '186aa2' +
        // 'bar' compressed, defined by property-scope
        '186783444d010203447a0102034475010203' +
        // 'foo', uncompressed since no longer defined by type-scope
        '186983654d41514944647a4c6470657541514944');
    });

    it('should not allow protected term redefinition', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          '@protected': true,
          foo: 'ex:foo'
        }
      };
      const jsonldDocument = {
        '@context': [CONTEXT_URL, {
          foo: 'ex:bar'
        }],
        foo: 'abc'
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      let result;
      let error;
      try {
        result = await encode({
          jsonldDocument,
          registryEntryId: 2,
          legacyFormat: 'range',
          documentLoader,
          typeTable
        });
      } catch(e) {
        error = e;
      }
      expect(result).to.eql(undefined);
      expect(error?.code).to.eql('ERR_PROTECTED_TERM_REDEFINITION');
    });

    it('should not allow protected term redefinition w/type-scope',
      async () => {
        const CONTEXT_URL = 'urn:foo';
        const CONTEXT = {
          '@context': {
            '@protected': true,
            foo: 'ex:foo',
            Foo: {
              '@id': 'ex:Foo',
              '@context': {
                foo: 'ex:bar'
              }
            }
          }
        };
        const jsonldDocument = {
          '@context': CONTEXT_URL,
          '@type': 'Foo'
        };

        const documentLoader = url => {
          if(url === CONTEXT_URL) {
            return {
              contextUrl: null,
              document: CONTEXT,
              documentUrl: url
            };
          }
          throw new Error(`Refused to load URL "${url}".`);
        };

        const typeTable = new Map(TYPE_TABLE);

        const contextTable = new Map(STRING_TABLE);
        contextTable.set(CONTEXT_URL, 0x8000);
        typeTable.set('context', contextTable);

        let result;
        let error;
        try {
          result = await encode({
            jsonldDocument,
            registryEntryId: 2,
            legacyFormat: 'range',
            documentLoader,
            typeTable
          });
        } catch(e) {
          error = e;
        }
        expect(result).to.eql(undefined);
        expect(error?.code).to.eql('ERR_PROTECTED_TERM_REDEFINITION');
      });

    it('should allow protected term redefinition w/same definition',
      async () => {
        const CONTEXT_URL = 'urn:foo';
        const CONTEXT = {
          '@context': {
            '@protected': true,
            foo: 'ex:foo',
            Foo: {
              '@id': 'ex:Foo',
              '@context': {
                foo: 'ex:foo'
              }
            }
          }
        };
        const jsonldDocument = {
          '@context': CONTEXT_URL,
          '@type': 'Foo'
        };

        const documentLoader = url => {
          if(url === CONTEXT_URL) {
            return {
              contextUrl: null,
              document: CONTEXT,
              documentUrl: url
            };
          }
          throw new Error(`Refused to load URL "${url}".`);
        };

        const typeTable = new Map(TYPE_TABLE);

        const contextTable = new Map(STRING_TABLE);
        contextTable.set(CONTEXT_URL, 0x8000);
        typeTable.set('context', contextTable);

        const cborldBytes = await encode({
          jsonldDocument,
          registryEntryId: 2,
          legacyFormat: 'range',
          documentLoader,
          typeTable
        });
        expect(cborldBytes).equalBytes('d90602a200198000021864');
      });

    it('should allow protected term redefinition w/property-scope',
      async () => {
        const CONTEXT_URL = 'urn:foo';
        const CONTEXT = {
          '@context': {
            '@protected': true,
            foo: 'ex:foo',
            nest: {
              '@id': 'ex:nest',
              '@context': {
                foo: 'ex:bar'
              }
            }
          }
        };
        const jsonldDocument = {
          '@context': CONTEXT_URL,
          nest: {
            foo: 'allowed'
          }
        };

        const documentLoader = url => {
          if(url === CONTEXT_URL) {
            return {
              contextUrl: null,
              document: CONTEXT,
              documentUrl: url
            };
          }
          throw new Error(`Refused to load URL "${url}".`);
        };

        const typeTable = new Map(TYPE_TABLE);

        const contextTable = new Map(STRING_TABLE);
        contextTable.set(CONTEXT_URL, 0x8000);
        typeTable.set('context', contextTable);

        const cborldBytes = await encode({
          jsonldDocument,
          registryEntryId: 2,
          legacyFormat: 'range',
          documentLoader,
          typeTable
        });
        expect(cborldBytes).equalBytes(
          'd90602a2001980001866a1186467616c6c6f776564');
      });

    it('should compress multibase values using type table if possible',
      async () => {
        const CONTEXT_URL = 'urn:foo';
        const CONTEXT = {
          '@context': {
            foo: {
              '@id': 'ex:foo',
              '@type': 'https://w3id.org/security#multibase'
            }
          }
        };
        const jsonldDocument = {
          '@context': CONTEXT_URL,
          foo: ['MAQID', 'zLdp', 'uAQID']
        };

        const documentLoader = url => {
          if(url === CONTEXT_URL) {
            return {
              contextUrl: null,
              document: CONTEXT,
              documentUrl: url
            };
          }
          throw new Error(`Refused to load URL "${url}".`);
        };

        const typeTable = new Map(TYPE_TABLE);

        const contextTable = new Map(STRING_TABLE);
        contextTable.set(CONTEXT_URL, 0x8000);
        typeTable.set('context', contextTable);

        const multibaseTable = new Map();
        multibaseTable.set('MAQID', 0x8001);
        multibaseTable.set('zLdp', 0x8002);
        multibaseTable.set('uAQID', 0x8003);
        typeTable.set(
          'https://w3id.org/security#multibase',
          multibaseTable);

        const cborldBytes = await encode({
          jsonldDocument,
          registryEntryId: 2,
          legacyFormat: 'range',
          documentLoader,
          typeTable
        });
        expect(cborldBytes).equalBytes(
          'd90602a200198000186583198001198002198003');
      });

    it('should compress cryptosuite strings', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: {
            '@id': 'ex:foo',
            '@type': 'https://w3id.org/security#cryptosuiteString'
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: [
          'ecdsa-rdfc-2019',
          'ecdsa-sd-2023',
          'eddsa-rdfc-2022'
        ]
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes('d90602a200198000186583010203');
    });

    it('should encode lowercase urn:uuid using a number', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'urn:uuid:75ef3fcc-9ae3-11eb-8e3e-10bf48838a41',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a30019800018661a6070bb5f186882035075ef3fcc9ae311eb8e3e' +
        '10bf48838a41');
    });

    it('should encode uppercase urn:uuid using a string', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'urn:uuid:75EF3FCC-9AE3-11EB-8E3E-10BF48838A41',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a30019800018661a6070bb5f1868820378243735454633464343' +
        '2d394145332d313145422d384533452d313042463438383338413431');
    });

    it('should encode https URL', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'https://test.example',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a30019800018661a6070bb5f186882026c746573742e6578616d706c65');
    });

    it('should prioritize url table for URLs and output table ID as bytes',
      async () => {
        const CONTEXT_URL = 'urn:foo';
        const CONTEXT = {
          '@context': {
            id: '@id',
            arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
            foo: {
              '@id': 'ex:foo',
              '@type': 'arbitraryPrefix:dateTime'
            }
          }
        };
        const date = '2021-04-09T20:38:55Z';
        const jsonldDocument = {
          '@context': CONTEXT_URL,
          id: 'https://test.example',
          foo: date
        };

        const documentLoader = url => {
          if(url === CONTEXT_URL) {
            return {
              contextUrl: null,
              document: CONTEXT,
              documentUrl: url
            };
          }
          throw new Error(`Refused to load URL "${url}".`);
        };
        const typeTable = new Map(TYPE_TABLE);

        const contextTable = new Map(STRING_TABLE);
        contextTable.set(CONTEXT_URL, 0x8000);
        typeTable.set('context', contextTable);

        const urlTable = new Map(STRING_TABLE);
        urlTable.set('https://test.example', 0x8001);
        typeTable.set('url', urlTable);

        const cborldBytes = await encode({
          jsonldDocument,
          registryEntryId: 2,
          legacyFormat: 'range',
          documentLoader,
          typeTable
        });
        expect(cborldBytes).equalBytes(
          'd90602a30019800018661a6070bb5f1868428001');
        const decodedDocument = await decode({
          cborldBytes,
          documentLoader,
          typeTable
        });
        expect(decodedDocument).to.eql(jsonldDocument);
      });

    it('should encode http URL', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'http://test.example',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 2,
        legacyFormat: 'range',
        documentLoader,
        typeTable
      });
      expect(cborldBytes).equalBytes(
        'd90602a30019800018661a6070bb5f186882016c746573742e6578616d706c65');
    });
  });
  describe('decode', () => {
    it('should decode CBOR-LD bytes (direct type table)',
      async () => {
        const cborldBytes = new Uint8Array([0xd9, 0x06, 0x01, 0xa0]);
        const jsonldDocument = await decode({
          cborldBytes,
          typeTable: new Map()
        });
        expect(jsonldDocument).deep.equal({});
      });

    it('should decode CBOR-LD bytes (type table loader)',
      async () => {
        const cborldBytes = new Uint8Array([0xd9, 0x06, 0x01, 0xa0]);
        const jsonldDocument = await decode({
          cborldBytes,
          typeTableLoader: _makeTypeTableLoader([[0x01, new Map()]])
        });
        expect(jsonldDocument).deep.equal({});
      });

    it('should fail to decode with no typeTable or typeTableLoader',
      async () => {
        const cborldBytes = new Uint8Array([0xd9, 0x06, 0x01, 0xa0]);
        let result;
        let error;
        try {
          result = await decode({
            cborldBytes
          });
        } catch(e) {
          error = e;
        }
        expect(result).to.eql(undefined);
        expect(error?.code).to.eql('ERR_NO_TYPETABLE');
      });

    it('should fail to decode with no typeTableLoader id found',
      async () => {
        const cborldBytes = new Uint8Array([0xd9, 0x06, 0x02, 0xa0]);
        let result;
        let error;
        try {
          result = await decode({
            cborldBytes,
            typeTableLoader: _makeTypeTableLoader([])
          });
        } catch(e) {
          error = e;
        }
        expect(result).to.eql(undefined);
        expect(error?.code).to.eql('ERR_NO_TYPETABLE');
      });

    it('should fail with typeTable and typeTableLoader',
      async () => {
        const cborldBytes = new Uint8Array([0xd9, 0x06, 0x01, 0xa0]);
        let result;
        let error;
        try {
          result = await decode({
            cborldBytes,
            typeTable: new Map(),
            typeTableLoader: _makeTypeTableLoader([])
          });
        } catch(e) {
          error = e;
        }
        expect(result).to.eql(undefined);
        expect(error?.name).to.eql('TypeError');
      });

    it('should decode empty document CBOR-LD bytes', async () => {
      const cborldBytes = new Uint8Array([0xd9, 0x06, 0x01, 0xa0]);
      const jsonldDocument = await decode({
        cborldBytes,
        typeTableLoader: _makeTypeTableLoader([[0x01, new Map()]])
      });
      expect(jsonldDocument).deep.equal({});
    });

    it('should decode empty JSON-LD document bytes with varint', async () => {
      const cborldBytes = new Uint8Array([0xd9, 0x06, 0x10, 0xa0]);
      const jsonldDocument = await decode({
        cborldBytes,
        typeTableLoader: _makeTypeTableLoader([[0x10, new Map()]])
      });
      expect(jsonldDocument).deep.equal({});
    });

    it('should decode empty JSON-LD document bytes with varint >1 byte',
      async () => {
        const cborldBytes = new Uint8Array(
          [0xd9, 0x06, 0x80, 0x82, 0x41, 0x01, 0xa0]);
        const jsonldDocument = await decode({
          cborldBytes,
          typeTableLoader: _makeTypeTableLoader([[0x80, new Map()]])
        });
        expect(jsonldDocument).deep.equal({});
      });

    it('should decode an empty JSON-LD document with multiple byte varint',
      async () => {
        const cborldBytes = new Uint8Array(
          [0xd9, 0x06, 0x80, 0x82, 0x44, 0x94, 0xeb, 0xdc, 0x03, 0xa0]);
        const jsonldDocument = await decode({
          cborldBytes,
          typeTableLoader: _makeTypeTableLoader([[1000000000, new Map()]])
        });
        expect(jsonldDocument).deep.equal({});
      });

    it('should throw on undefined compressed context', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: {
            '@id': 'ex:foo',
            '@type': 'https://w3id.org/security#multibase'
          }
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = _hexToUint8Array(
        'd90602a200198000186583444d010203447a0102034475010203');

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      typeTable.set('context', contextTable);

      let result;
      let error;
      try {
        result = await decode({
          cborldBytes,
          documentLoader,
          typeTable
        });
      } catch(e) {
        error = e;
      }
      expect(result).to.eql(undefined);
      expect(error?.code).to.eql('ERR_UNDEFINED_COMPRESSED_CONTEXT');
    });

    it('should decompress multibase-typed values', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: {
            '@id': 'ex:foo',
            '@type': 'https://w3id.org/security#multibase'
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: ['MAQID', 'zLdp', 'uAQID']
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = _hexToUint8Array(
        'd90602a200198000186583444d010203447a0102034475010203');

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decompress multibase-typed values using type table',
      async () => {
        const CONTEXT_URL = 'urn:foo';
        const CONTEXT = {
          '@context': {
            foo: {
              '@id': 'ex:foo',
              '@type': 'https://w3id.org/security#multibase'
            }
          }
        };
        const jsonldDocument = {
          '@context': CONTEXT_URL,
          foo: ['MAQID', 'zLdp', 'uAQID']
        };

        const documentLoader = url => {
          if(url === CONTEXT_URL) {
            return {
              contextUrl: null,
              document: CONTEXT,
              documentUrl: url
            };
          }
          throw new Error(`Refused to load URL "${url}".`);
        };

        const cborldBytes = _hexToUint8Array(
          'd90602a200198000186583198001198002198003');

        const typeTable = new Map(TYPE_TABLE);

        const contextTable = new Map(STRING_TABLE);
        contextTable.set(CONTEXT_URL, 0x8000);
        typeTable.set('context', contextTable);

        const multibaseTable = new Map();
        multibaseTable.set('MAQID', 0x8001);
        multibaseTable.set('zLdp', 0x8002);
        multibaseTable.set('uAQID', 0x8003);
        typeTable.set(
          'https://w3id.org/security#multibase',
          multibaseTable);

        const decodedDocument = await decode({
          cborldBytes,
          documentLoader,
          typeTable
        });
        expect(decodedDocument).to.eql(jsonldDocument);
      });
    it(
      'should round trip multibase-typed values using type table if possible',
      async () => {
        const CONTEXT_URL = 'urn:foo';
        const CONTEXT = {
          '@context': {
            foo: {
              '@id': 'ex:foo',
              '@type': 'https://w3id.org/security#multibase'
            }
          }
        };
        const jsonldDocument = {
          '@context': CONTEXT_URL,
          foo: 'MAQID'
        };

        const documentLoader = url => {
          if(url === CONTEXT_URL) {
            return {
              contextUrl: null,
              document: CONTEXT,
              documentUrl: url
            };
          }
          throw new Error(`Refused to load URL "${url}".`);
        };

        const typeTable = new Map(TYPE_TABLE);

        const contextTable = new Map(STRING_TABLE);
        contextTable.set(CONTEXT_URL, 0x8000);
        typeTable.set('context', contextTable);

        const multibaseTable = new Map();
        multibaseTable.set('MAQID', 0x8001);
        typeTable.set(
          'https://w3id.org/security#multibase',
          multibaseTable);

        const cborldBytes = await encode({
          jsonldDocument,
          registryEntryId: 2,
          documentLoader,
          typeTable
        });

        const decodedDocument = await decode({
          cborldBytes,
          documentLoader,
          typeTable
        });
        expect(decodedDocument).to.eql(jsonldDocument);
      });

    it('should decompress cryptosuite strings', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: {
            '@id': 'ex:foo',
            '@type': 'https://w3id.org/security#cryptosuiteString'
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: [
          'ecdsa-rdfc-2019',
          'ecdsa-sd-2023',
          'eddsa-rdfc-2022'
        ]
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = _hexToUint8Array('d90602a200198000186583010203');

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decompress xsd date', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:date'
          }
        }
      };
      const date = '2021-04-09';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = _hexToUint8Array('d90602a20019800018661a606f9900');

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decompress xsd dateTime', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = _hexToUint8Array('d90602a20019800018661a6070bb5f');

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decompress xsd dateTime with type table when possible',
      async () => {
        const CONTEXT_URL = 'urn:foo';
        const CONTEXT = {
          '@context': {
            arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
            foo: {
              '@id': 'ex:foo',
              '@type': 'arbitraryPrefix:dateTime'
            }
          }
        };
        const date = '2021-04-09T20:38:55Z';
        const jsonldDocument = {
          '@context': CONTEXT_URL,
          foo: date
        };

        const documentLoader = url => {
          if(url === CONTEXT_URL) {
            return {
              contextUrl: null,
              document: CONTEXT,
              documentUrl: url
            };
          }
          throw new Error(`Refused to load URL "${url}".`);
        };

        const cborldBytes = _hexToUint8Array('d90602a2001980001866428001');

        const typeTable = new Map(TYPE_TABLE);

        const contextTable = new Map(STRING_TABLE);
        contextTable.set(CONTEXT_URL, 0x8000);
        typeTable.set('context', contextTable);

        typeTable.set(
          'http://www.w3.org/2001/XMLSchema#dateTime',
          new Map([['2021-04-09T20:38:55Z', 0x8001]]));

        const decodedDocument = await decode({
          cborldBytes,
          documentLoader,
          typeTable
        });
        expect(decodedDocument).to.eql(jsonldDocument);
      });

    it('should decode lowercase urn:uuid', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'urn:uuid:75ef3fcc-9ae3-11eb-8e3e-10bf48838a41',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = _hexToUint8Array(
        'd90602a30019800018661a6070bb5f186882035075ef3fcc9ae311eb8e3e' +
        '10bf48838a41');

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decode uppercase urn:uuid', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'urn:uuid:75EF3FCC-9AE3-11EB-8E3E-10BF48838A41',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = _hexToUint8Array(
        'd90602a30019800018661a6070bb5f1868820378243735454633464343' +
        '2d394145332d313145422d384533452d313042463438383338413431');

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decode https URL', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'https://test.example',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = _hexToUint8Array(
        'd90602a30019800018661a6070bb5f186882026c746573742e6578616d706c65');

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decode http URL', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          id: '@id',
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        id: 'http://test.example',
        foo: date
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const cborldBytes = _hexToUint8Array(
        'd90602a30019800018661a6070bb5f186882016c746573742e6578616d706c65');

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should decode a CIT type token', async () => {
      const cborldBytes = _hexToUint8Array(
        'd90601a40015186c1864186e4c7ad90501a2011987430518411870583b7a' +
        '0000e190818fdd92908425370e0b5dad9ad92dc956b5ec2ab41ce76b8c70' +
        'cb859a7c88ca6ba68b1ff238a70ed674999b6ff5179b0ebb10140b23');

      const CONTEXT_URL = 'https://w3id.org/cit/v1';
      /* eslint-disable max-len */
      const CONTEXT = {
        '@context': {
          '@protected': true,
          type: '@type',
          ConcealedIdTokenCredential: 'https://w3id.org/cit#ConcealedIdTokenCredential',
          concealedIdToken: {
            '@id': 'https://w3id.org/cit#concealedIdToken',
            '@type': '@id'
          },
          ConcealedIdToken: {
            '@id': 'https://w3id.org/cit#ConcealedIdToken',
            '@context': {
              '@protected': true,
              meta: {'@id': 'https://w3id.org/cit#meta', '@type': 'https://w3id.org/security#multibase'},
              payload: {'@id': 'https://w3id.org/cit#payload', '@type': 'https://w3id.org/security#multibase'}
            }
          },
          Ed25519Signature2020: {
            '@id': 'https://w3id.org/security#Ed25519Signature2020',
            '@context': {
              '@protected': true,

              id: '@id',
              type: '@type',

              sec: 'https://w3id.org/security#',
              xsd: 'http://www.w3.org/2001/XMLSchema#',

              challenge: 'sec:challenge',
              created: {'@id': 'http://purl.org/dc/terms/created', '@type': 'xsd:dateTime'},
              domain: 'sec:domain',
              expires: {'@id': 'sec:expiration', '@type': 'xsd:dateTime'},
              nonce: 'sec:nonce',
              proofPurpose: {
                '@id': 'sec:proofPurpose',
                '@type': '@vocab',
                '@context': {
                  '@protected': true,

                  id: '@id',
                  type: '@type',

                  sec: 'https://w3id.org/security#',

                  assertionMethod: {'@id': 'sec:assertionMethod', '@type': '@id', '@container': '@set'},
                  authentication: {'@id': 'sec:authenticationMethod', '@type': '@id', '@container': '@set'}
                }
              },
              proofValue: {
                '@id': 'https://w3id.org/security#proofValue',
                '@type': 'https://w3id.org/security#multibase'
              },
              verificationMethod: {'@id': 'sec:verificationMethod', '@type': '@id'}
            }
          }
        }
      };
      /* eslint-enable max-len */

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const jsonldDocument = {
        '@context': 'https://w3id.org/cit/v1',
        type: 'ConcealedIdToken',
        meta: 'zvpJ2L5sbowrJPdA',
        // eslint-disable-next-line max-len
        payload: 'z1177JK4h25dHEAXAVMUMpn2zWcxLCeMLP3oVFQFQ11xHFtE9BhyoU2g47D6Xod1Mu99JR9YJdY184HY'
      };

      const typeTable = new Map(TYPE_TABLE);

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });

      expect(decodedDocument).to.eql(jsonldDocument);
    });
  });
});

function _hexToUint8Array(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

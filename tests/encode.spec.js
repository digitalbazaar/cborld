/*!
 * Copyright (c) 2020-2025 Digital Bazaar, Inc. All rights reserved.
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

describe('cborld encode', () => {
  it('should encode an empty JSON-LD Document with no compression',
    async () => {
      const jsonldDocument = {};
      const cborldBytes = await encode({
        jsonldDocument,
        format: 'cbor-ld-1.0',
        registryEntryId: 0
      });
      expect(cborldBytes).instanceof(Uint8Array);
      expect(cborldBytes).equalBytes('d9cb1d8200a0');
    });

  it('should encode an empty JSON-LD Document (default type table)',
    async () => {
      const jsonldDocument = {};
      const cborldBytes = await encode({
        jsonldDocument,
        format: 'cbor-ld-1.0',
        registryEntryId: 1
      });
      expect(cborldBytes).instanceof(Uint8Array);
      expect(cborldBytes).equalBytes('d9cb1d8201a0');
    });

  it('should encode an empty JSON-LD Document (type table loader)',
    async () => {
      const jsonldDocument = {};
      const cborldBytes = await encode({
        jsonldDocument,
        format: 'cbor-ld-1.0',
        registryEntryId: 2,
        typeTableLoader: _makeTypeTableLoader([[2, new Map()]])
      });
      expect(cborldBytes).instanceof(Uint8Array);
      expect(cborldBytes).equalBytes('d9cb1d8202a0');
    });

  it('should fail to encode with no typeTableLoader id found', async () => {
    const jsonldDocument = {};
    let result;
    let error;
    try {
      result = await encode({
        jsonldDocument,
        format: 'cbor-ld-1.0',
        registryEntryId: 2,
        typeTableLoader: _makeTypeTableLoader([])
      });
    } catch(e) {
      error = e;
    }
    expect(result).to.eql(undefined);
    expect(error?.code).to.eql('ERR_NO_TYPETABLE');
  });

  it('should fail with typeTable', async () => {
    const jsonldDocument = {};
    let result;
    let error;
    try {
      result = await encode({
        jsonldDocument,
        format: 'cbor-ld-1.0',
        registryEntryId: 1,
        typeTable: new Map()
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
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      typeTableLoader: _makeTypeTableLoader([[1, new Map()]])
    });
    expect(cborldBytes).instanceof(Uint8Array);
    expect(cborldBytes).equalBytes('d9cb1d8201a0');
  });

  it('should encode an empty JSON-LD document with passed registry id',
    async () => {
      const jsonldDocument = {};
      const registryEntryId = 16;
      const cborldBytes = await encode({
        jsonldDocument,
        format: 'cbor-ld-1.0',
        registryEntryId,
        typeTableLoader: _makeTypeTableLoader([[16, new Map()]])
      });
      expect(cborldBytes).instanceof(Uint8Array);
      expect(cborldBytes).equalBytes('d9cb1d8210a0');
    });

  it('should encode an empty JSON-LD document with passed id >1 byte',
    async () => {
      const jsonldDocument = {};
      const registryEntryId = 128;
      const cborldBytes = await encode({
        jsonldDocument,
        format: 'cbor-ld-1.0',
        registryEntryId,
        typeTableLoader: _makeTypeTableLoader([[128, new Map()]])
      });
      expect(cborldBytes).instanceof(Uint8Array);
      expect(cborldBytes).equalBytes('d9cb1d821880a0');
    });

  it('should encode an empty JSON-LD document with multiple byte id',
    async () => {
      const jsonldDocument = {};
      const registryEntryId = 1000000000;
      const cborldBytes = await encode({
        jsonldDocument,
        format: 'cbor-ld-1.0',
        registryEntryId,
        typeTableLoader: _makeTypeTableLoader([[1000000000, new Map()]])
      });
      expect(cborldBytes).instanceof(Uint8Array);
      expect(cborldBytes).equalBytes('d9cb1d821a3b9aca00a0');
    });

  it('should fail with non-object term definition', async () => {
    const CONTEXT_URL = 'urn:foo';
    const CONTEXT = {
      '@context': {
        foo: []
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT_URL,
      foo: 'anything'
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
        format: 'cbor-ld-1.0',
        registryEntryId: 2,
        documentLoader,
        typeTableLoader: () => typeTable
      });
    } catch(e) {
      error = e;
    }
    expect(result).to.eql(undefined);
    expect(error?.name).to.eql('CborldError');
  });

  it('should fail with non-CURIE term with no "@id"', async () => {
    const CONTEXT_URL = 'urn:foo';
    const CONTEXT = {
      '@context': {
        nonCurie: {
          '@type': 'urn:anything'
        }
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT_URL,
      nonCurie: 'anything'
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
        format: 'cbor-ld-1.0',
        registryEntryId: 2,
        documentLoader,
        typeTableLoader: () => typeTable
      });
    } catch(e) {
      error = e;
    }
    expect(result).to.eql(undefined);
    expect(error?.name).to.eql('CborldError');
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes('d9cb1d8202a20019800018661a6070bb5f');
  });

  it('should pass with CURIE term with no "@id"', async () => {
    const CONTEXT_URL = 'urn:foo';
    const CONTEXT = {
      '@context': {
        arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
        ex: 'https://test.example#',
        'ex:foo': {
          '@type': 'arbitraryPrefix:dateTime'
        }
      }
    };
    const date = '2021-04-09T20:38:55Z';
    const jsonldDocument = {
      '@context': CONTEXT_URL,
      'ex:foo': date
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes('d9cb1d8202a20019800018681a6070bb5f');
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes('d9cb1d8202a2001980001866428001');
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes('d9cb1d8202a20019800018661a606f9900');
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a600198000' +
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a800198000' +
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a200198000186583444d010203447a0102034475010203');
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a300198000021864186783444d010203447a0102034475010203');
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a20019800063666f6f83654d41514944647a4c6470657541514944');
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      // type 'Foo', etc.
      'd9cb1d8202a300198000021864' +
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a2001980001864a1186783444d010203447a0102034475010203');
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a2001980001864a21866a1' +
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      // type 'Foo', etc.
      'd9cb1d8202a300198000021864' +
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a200198000' +
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a20019800063666f6f83654d41514944647a4c6470657541514944');
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      // type Foo, etc.
      'd9cb1d8202a400198000021864' +
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
        format: 'cbor-ld-1.0',
        registryEntryId: 2,
        documentLoader,
        typeTableLoader: () => typeTable
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
        result = await await encode({
          jsonldDocument,
          format: 'cbor-ld-1.0',
          registryEntryId: 2,
          documentLoader,
          typeTableLoader: () => typeTable
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
        format: 'cbor-ld-1.0',
        registryEntryId: 2,
        documentLoader,
        typeTableLoader: () => typeTable
      });
      expect(cborldBytes).equalBytes('d9cb1d8202a200198000021864');
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
        format: 'cbor-ld-1.0',
        registryEntryId: 2,
        documentLoader,
        typeTableLoader: () => typeTable
      });
      expect(cborldBytes).equalBytes(
        'd9cb1d8202a2001980001866a1186467616c6c6f776564');
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
        format: 'cbor-ld-1.0',
        registryEntryId: 2,
        documentLoader,
        typeTableLoader: () => typeTable
      });
      expect(cborldBytes).equalBytes(
        'd9cb1d8202a200198000186583198001198002198003');
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes('d9cb1d8202a200198000186583010203');
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a30019800018661a6070bb5f186882035075ef3fcc9ae311eb8e3e' +
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a30019800018661a6070bb5f1868820378243735454633464343' +
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a30019800018661a6070bb5f186882026c746573742e6578616d706c65');
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
        format: 'cbor-ld-1.0',
        registryEntryId: 2,
        documentLoader,
        typeTableLoader: () => typeTable
      });
      expect(cborldBytes).equalBytes(
        'd9cb1d8202a30019800018661a6070bb5f1868428001');
      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTableLoader: () => typeTable
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(cborldBytes).equalBytes(
      'd9cb1d8202a30019800018661a6070bb5f186882016c746573742e6578616d706c65');
  });
});

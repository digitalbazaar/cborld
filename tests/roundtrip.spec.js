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

describe('cborld round trip', () => {
  it('should use type table for multibase-typed values', async () => {
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
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should round trip with 1 byte registryEntryId', async () => {
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
      format: 'cbor-ld-1.0',
      registryEntryId: 20,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should round trip with 2 byte registryEntryId', async () => {
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
      format: 'cbor-ld-1.0',
      registryEntryId: 200,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should round trip with 3 byte registryEntryId', async () => {
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
      format: 'cbor-ld-1.0',
      registryEntryId: 2000,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should round trip with 5 byte registryEntryId', async () => {
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
      format: 'cbor-ld-1.0',
      registryEntryId: 200000,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should round trip with 9 byte registryEntryId', async () => {
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
      format: 'cbor-ld-1.0',
      registryEntryId: 20000000000,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle @vocab', async () => {
    const jsonldDocument = {
      '@context': {
        '@vocab': 'http://example.com/vocab/'
      },
      name: 'foo',
      '@type': 'bar'
    };

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle plural types', async () => {
    const jsonldDocument = {
      '@context': {
        type: '@type',
        Type1: 'ex:Type1',
        Type2: 'ex:Type2',
      },
      type: ['Type1', 'Type2'],
    };

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle sets of objects', async () => {
    const jsonldDocument = {
      '@context': {
        type: '@type',
        Type1: 'ex:Type1',
        Type2: 'ex:Type2',
        set: 'ex:set'
      },
      type: ['Type1', 'Type2'],
      set: [{
        type: ['Type1', 'Type2'],
        set: [{
          type: 'Type1'
        }]
      }, {
        type: ['Type1', 'Type2'],
        set: [{
          type: 'Type1'
        }, {
          type: 'Type2'
        }]
      }, {
        type: 'Type1'
      }, {
        type: 'Type2'
      }, {
        type: ['Type1']
      }, {
        type: ['Type2']
      }]
    };

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle array of arrays', async () => {
    const jsonldDocument = {
      '@context': {
        type: '@type',
        Type1: 'ex:Type1',
        Type2: 'ex:Type2',
        set: 'ex:set'
      },
      type: ['Type1', 'Type2'],
      set: [
        [{type: ['Type1', 'Type2']}],
        [{type: 'Type1'}],
        ['string1', 'string2', ['string3']]
      ]
    };

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle uncompressed string term', async () => {
    const jsonldDocument = {
      '@context': {
        '@baz': 'http://example.com#baz'
      },
      baz: 'abcde',
      'ex:foo': 'bar'
    };

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      typeTableLoader: () => typeTable
    });
    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      typeTableLoader: () => typeTable,
      documentLoader
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle nested compressed scoped context', async () => {
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

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle wide dateTime range', async () => {
    const CONTEXT = {
      '@context': {
        date: {
          '@id': 'ex:date',
          '@type': 'http://www.w3.org/2001/XMLSchema#dateTime'
        },
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT['@context'],
      date: [
        '-1000-01-01T00:00:00Z',
        '0-01-01T00:00:00Z',
        '1000-01-01T00:00:00Z',
        '1000-01-01T00:00:00.123Z',
        '1960-01-01T00:00:00Z',
        '1960-01-01T23:59:59Z',
        '1969-12-31T23:59:59Z',
        '1970-01-01T00:00:00Z',
        '1970-01-01T00:00:01Z',
        '1970-12-31T23:59:59Z',
        '2000-01-01T00:00:00Z',
        '3000-01-01T00:00:00Z',
        '3000-01-01T00:00:00.123Z',
        '10000-01-01T00:00:00Z'
        // TODO: increase possible xsd:dateTime value coverage
      ]
    };

    const documentLoader = url => {
      throw new Error(`Refused to load URL "${url}".`);
    };

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle wide date range', async () => {
    const CONTEXT = {
      '@context': {
        date: {
          '@id': 'ex:date',
          '@type': 'http://www.w3.org/2001/XMLSchema#date'
        },
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT['@context'],
      date: [
        '-1000-01-01',
        '0-01-01',
        '1000-01-01',
        '1960-01-01',
        '1960-01-01',
        '1969-12-31',
        '1970-01-01',
        '1970-01-01',
        '1970-12-31',
        '2000-01-01',
        '3000-01-01',
        '10000-01-01'
        // TODO: increase possible xsd:date value coverage
      ]
    };

    const documentLoader = url => {
      throw new Error(`Refused to load URL "${url}".`);
    };

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle sample age context', async () => {
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

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(AGE_CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      documentLoader,
      registryEntryId: 1,
      typeTableLoader: () => typeTable
    });

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set('https://w3id.org/did/v0.11', 0x8744);
    typeTable.set('context', contextTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    expect(cborldBytes).equalBytes(
      'd9cb1d8202a300198744186581831904015822ed0194966b7c08e4' +
      '05775f8de6cc1c4508f6eb227403e1025b2c8ad2d7477398c5' +
      'b25822ed0194966b7c08e405775f8de6cc1c4508f6eb227403' +
      'e1025b2c8ad2d7477398c5b21866821904015822ed0194966b' +
      '7c08e405775f8de6cc1c4508f6eb227403e1025b2c8ad2d747' +
      '7398c5b2');

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
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

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set('https://w3id.org/did/v0.11', 0x8744);
    typeTable.set('context', contextTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    expect(cborldBytes).equalBytes(
      'd9cb1d8202a300198744186581831904005822ed0194966b7c08e4' +
      '05775f8de6cc1c4508f6eb227403e1025b2c8ad2d7477398c5' +
      'b25822ed0194966b7c08e405775f8de6cc1c4508f6eb227403' +
      'e1025b2c8ad2d7477398c5b21866821904005822ed0194966b' +
      '7c08e405775f8de6cc1c4508f6eb227403e1025b2c8ad2d747' +
      '7398c5b2');

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTableLoader: () => typeTable
    });

    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle untyped strings in type table', async () => {
    const jsonldDocument = {
      '@context': {
        foo: 'example.com/bar#foo'
      },
      foo: 'abcde'
    };

    const typeTable = new Map(TYPE_TABLE);

    const noneTable = new Map();
    noneTable.set('abcde', 0x8000);
    typeTable.set('none', noneTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      typeTableLoader: () => typeTable
    });
    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle plain int and string with no conflicts', async () => {
    const jsonldDocument = {
      '@context': {
        foo: 'example.com/bar#foo'
      },
      foo: [100, 'abcde']
    };

    const typeTable = new Map(TYPE_TABLE);

    const noneTable = new Map();
    noneTable.set('abcde', 100);
    typeTable.set('none', noneTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      typeTableLoader: () => typeTable
    });
    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle plain native JSON types', async () => {
    const CONTEXT = {
      '@context': {
        foo: 'ex:foo'
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT['@context'],
      foo: [-1, 0, 1, true, false, 1.1, 1.0, -1.1, 'text']
    };

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1
    });

    expect(cborldBytes).equalBytes(
      'd9cb1d8201a200a163666f6f6665783a666f6f186589200001' +
      'f5f4fb3ff199999999999a01fbbff199999999999a6474657874');

    const decodedDocument = await decode({
      cborldBytes
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle plain native JSON types w/ empty none table', async () => {
    const CONTEXT = {
      '@context': {
        foo: 'ex:foo'
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT['@context'],
      foo: [-1, 0, 1, true, false, 1.1, 1.0, -1.1, 'text']
    };

    const typeTable = new Map(TYPE_TABLE);

    const noneTable = new Map();
    typeTable.set('none', noneTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      typeTableLoader: () => typeTable
    });

    expect(cborldBytes).equalBytes(
      'd9cb1d8202a200a163666f6f6665783a666f6f186589200001' +
      'f5f4fb3ff199999999999a01fbbff199999999999a6474657874');

    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle plain native JSON types w/ none table', async () => {
    const CONTEXT = {
      '@context': {
        foo: 'ex:foo'
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT['@context'],
      foo: [-1, 0, 1, true, false, 1.1, 1.0, -1.1, 'text']
    };

    const typeTable = new Map(TYPE_TABLE);

    const noneTable = new Map();
    noneTable.set('text', 1);
    typeTable.set('none', noneTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      typeTableLoader: () => typeTable
    });

    expect(cborldBytes).equalBytes(
      'd9cb1d8202a200a163666f6f6665783a666f6f186589200001' +
      'f5f4fb3ff199999999999a01fbbff199999999999a4101');
    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle typed int and string with no conflicts', async () => {
    const jsonldDocument = {
      '@context': {
        foo: {
          '@id': 'ex:foo',
          '@type': 'ex:SomeType'
        }
      },
      foo: [100, 'abcde']
    };

    const typeTable = new Map(TYPE_TABLE);

    const noneTable = new Map();
    noneTable.set('abcde', 100);
    typeTable.set('none', noneTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      typeTableLoader: () => typeTable
    });
    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle typed native JSON types', async () => {
    const CONTEXT = {
      '@context': {
        foo: {
          '@id': 'ex:foo',
          '@type': 'ex:SomeType'
        }
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT['@context'],
      foo: [-1, 0, 1, true, false, 1.1, 1.0, -1.1, 'text']
    };

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1
    });

    expect(cborldBytes).equalBytes(
      'd9cb1d8201a200a163666f6fa2634069646665783a666f6f65' +
      '40747970656b65783a536f6d6554797065186589200001' +
      'f5f4fb3ff199999999999a01fbbff199999999999a6474' +
      '657874');

    const decodedDocument = await decode({cborldBytes});
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle typed native integer w/o subtable', async () => {
    const CONTEXT = {
      '@context': {
        '@id': 'ex:foo',
        '@type': 'ex:SomeType'
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT['@context'],
      foo: 1
    };

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 1
    });

    expect(cborldBytes).equalBytes(
      'd9cb1d8201a200a2634069646665783a666f6f654074797065' +
      '6b65783a536f6d655479706563666f6f01');

    const decodedDocument = await decode({cborldBytes});
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle typed native integer w/ empty subtable', async () => {
    const CONTEXT = {
      '@context': {
        foo: {
          '@id': 'ex:foo',
          '@type': 'ex:SomeType'
        }
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT['@context'],
      foo: 1
    };

    const typeTable = new Map(TYPE_TABLE);

    const subTable = new Map();
    typeTable.set('ex:SomeType', subTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      typeTableLoader: () => typeTable
    });

    expect(cborldBytes).equalBytes(
      'd9cb1d8202a200a163666f6fa2634069646665783a666f6f65' +
      '40747970656b65783a536f6d655479706518644101');

    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle typed native JSON types w/ empty subtable', async () => {
    const CONTEXT = {
      '@context': {
        foo: {
          '@id': 'ex:foo',
          '@type': 'ex:SomeType'
        }
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT['@context'],
      foo: [-1, 0, 1, true, false, 1.1, 1.0, -1.1, 'text']
    };

    const typeTable = new Map(TYPE_TABLE);

    const subTable = new Map();
    typeTable.set('ex:SomeType', subTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      typeTableLoader: () => typeTable
    });

    expect(cborldBytes).equalBytes(
      'd9cb1d8202a200a163666f6fa2634069646665783a666f6f65' +
      '40747970656b65783a536f6d655479706518658941ff41' +
      '004101f5f4fb3ff199999999999a4101fbbff199999999' +
      '999a6474657874');

    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should handle typed native JSON types w/ used subtable', async () => {
    const CONTEXT = {
      '@context': {
        foo: {
          '@id': 'ex:foo',
          '@type': 'ex:SomeType'
        }
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT['@context'],
      foo: [-1, 0, 1, true, false, 1.1, 1.0, -1.1, 'text']
    };

    const typeTable = new Map(TYPE_TABLE);

    const subTable = new Map();
    subTable.set('text', 1);
    typeTable.set('ex:SomeType', subTable);

    const cborldBytes = await encode({
      jsonldDocument,
      format: 'cbor-ld-1.0',
      registryEntryId: 2,
      typeTableLoader: () => typeTable
    });

    expect(cborldBytes).equalBytes(
      'd9cb1d8202a200a163666f6fa2634069646665783a666f6f65' +
      '40747970656b65783a536f6d655479706518658941ff41' +
      '004101f5f4fb3ff199999999999a4101fbbff199999999' +
      '999a01');

    const decodedDocument = await decode({
      cborldBytes,
      typeTableLoader: () => typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
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
        cborldHex: 'd9cb1d8202a2001980001864820460'
      },
      {
        name: 'empty plain data: (2)',
        data: 'data:,',
        cborldHex: 'd9cb1d8202a20019800018648204612c'
      },
      {
        name: 'empty plain data: set (1)',
        data: ['data:', 'data:'],
        cborldHex: 'd9cb1d8202a200198000186582820460820460'
      },
      {
        name: 'empty plain data: set (2)',
        data: ['other:url', 'data:'],
        cborldHex: 'd9cb1d8202a200198000186582696f746865723a75726c820460'
      },
      {
        name: 'empty base64 data:',
        data: 'data:;base64,',
        cborldHex: 'd9cb1d8202a200198000186483046040'
      },
      {
        name: 'empty typed base64 data:',
        data: 'data:image/gif;base64,',
        cborldHex: 'd9cb1d8202a2001980001864830469696d6167652f67696640'
      },
      {
        name: 'base64 data:',
        data:
          'data:image/gif;base64,' +
          'R0lGODdhAQABAIABAAAAAAAAACwAAAAAAQABAAACAkwBADs=',
        cborldHex:
          'd9cb1d8202a2001980001864830469696d6167652f6769665823474946383761010001008001000000000000002c00000000010001000002024c01003b'
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
          'd9cb1d8202a200198000186582830469696d6167652f6769665823474946383761010001008001000000000000002c00000000010001000002024c01003b830469696d6167652f6769665823474946383761010001008001000000000000002c00000000010001000002024c01003b'
      },
      {
        name: 'non-base64 data:',
        data:
          'data:text/plain,' +
          'test',
        cborldHex:
          'd9cb1d8202a200198000186482046f746578742f706c61696e2c74657374'
      },
      {
        name: 'bad base64 data:',
        data:
          // missing trailing padding, should encode as non-base64
          'data:image/gif;base64,' +
          'R0lGODdhAQABAIABAAAAAAAAACwAAAAAAQABAAACAkwBADs',
        cborldHex:
          'd9cb1d8202a200198000186482047840696d6167652f6769663b6261736536342c52306c474f4464684151414241494142414141414141414141437741414141414151414241414143416b7742414473'
      },
      {
        // RFC2397 example
        name: 'plain text',
        data: 'data:,A%20brief%20note',
        cborldHex:
          'd9cb1d8202a20019800018648204712c4125323062726965662532306e6f7465'
      },
      {
        // RFC2397 example
        name: 'plain text with charset:',
        data: 'data:text/plain;charset=iso-8859-7,%be%fg%be',
        cborldHex:
          'd9cb1d8202a200198000186482047827746578742f706c61696e3b636861727365743d69736f2d383835392d372c256265256667256265'
      },
      {
        // RFC2397 example
        name: 'vnd example',
        data:
          'data:application/vnd-xxx-query,' +
          'select_vcount,fcol_from_fieldtable/local',
        cborldHex:
          'd9cb1d8202a2001980001864820478426170706c69636174696f6e2f766e642d7878782d71756572792c73656c6563745f76636f756e742c66636f6c5f66726f6d5f6669656c647461626c652f6c6f63616c'
      },
      {
        // MDN example
        name: 'plain text',
        data: 'data:,Hello%2C%20World%21',
        cborldHex:
          'd9cb1d8202a20019800018648204742c48656c6c6f253243253230576f726c64253231'
      },
      {
        // MDN example
        name: 'base64 plain text',
        data: 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==',
        cborldHex:
          'd9cb1d8202a200198000186483046a746578742f706c61696e4d48656c6c6f2c20576f726c6421'
      },
      {
        // MDN example
        name: 'plain text html',
        data:
          'data:text/html,%3Cscript%3Ealert%28%27hi%27%29%3B%3C%2Fscript%3E',
        cborldHex:
          'd9cb1d8202a20019800018648204783b746578742f68746d6c2c253343736372697074253345616c6572742532382532376869253237253239253342253343253246736372697074253345'
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

        const typeTable = new Map(TYPE_TABLE);

        const contextTable = new Map(STRING_TABLE);
        contextTable.set(DATA_CONTEXT_URL, 0x8000);
        typeTable.set('context', contextTable);

        const cborldBytes = await encode({
          jsonldDocument,
          format: 'cbor-ld-1.0',
          registryEntryId: 2,
          documentLoader,
          typeTableLoader: () => typeTable
        });

        expect(cborldBytes).equalBytes(d.cborldHex);

        const decodedDocument = await decode({
          cborldBytes,
          documentLoader,
          typeTableLoader: () => typeTable
        });

        expect(decodedDocument).to.eql(jsonldDocument);
      });
    });
  });
});

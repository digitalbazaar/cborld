/*!
* Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
*/
import {
  default as chai,
  expect
} from 'chai';
import {default as chaiBytes} from 'chai-bytes';
chai.use(chaiBytes);
global.should = chai.should();

import {encode, decode} from '..';

describe('cborld', () => {
  describe('encode', () => {
    it('should encode an empty JSON-LD Document', async () => {
      const jsonldDocument = {};
      const cborldBytes = await encode({jsonldDocument});
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
        appContextMap
      });
      expect(cborldBytes).equalBytes('d90501a20019800018661a6070bb5f');
    });
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
      foo: ['MAQID', 'zLdp']
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
      appContextMap
    });
    expect(cborldBytes).equalBytes(
      'd90501a200198000186582444d010203447a010203');
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
      appContextMap
    });
    expect(cborldBytes).equalBytes(
      'd90501a30019800018661a6070bb5f186882016c746573742e6578616d706c65');
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
        foo: ['MAQID', 'zLdp']
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
        'd90501a200198000186582444d010203447a010203');
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

    it('should round trip with embedded context', async () => {
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
      const cborldBytes = await encode({jsonldDocument, documentLoader});

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should round trip with remote context', async () => {
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
        documentLoader
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should round trip with compressed remote context', async () => {
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
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should round trip with embedded scoped context', async () => {
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
      const cborldBytes = await encode({jsonldDocument, documentLoader});

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should round trip with compressed scoped context', async () => {
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
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should round trip w/ embedded nested scoped context', async () => {
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
      const cborldBytes = await encode({jsonldDocument, documentLoader});

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should round trip w/ nested compressed scoped context',
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
          appContextMap
        });

        const decodedDocument = await decode({
          cborldBytes,
          documentLoader,
          appContextMap
        });
        expect(decodedDocument).to.eql(jsonldDocument);
      });

    it('should round trip w/ revert embedded type-scope', async () => {
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
      const cborldBytes = await encode({jsonldDocument, documentLoader});

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should round trip w/ revert remote type-scope', async () => {
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
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should round trip w/ embedded scoped override', async () => {
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
      const cborldBytes = await encode({jsonldDocument, documentLoader});

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should round trip w/ remote scoped override', async () => {
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
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should round trip w/ 2x remote scoped context', async () => {
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
        appContextMap
      });

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
        payload: 'z1177JK4h25dHEAXAVMUMpn2zWcxLCeMLP3oVFQFQ11xHFtE9BhyoU2g47D6Xod1Mu99JR9YJdY184HY'
      };

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader
      });

      //console.log(decodedDocument);
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it('should round trip sample Age context', async () => {
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

    it('should round trip sample did:key DID document', async () => {
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

    it('should round trip sample did:v1:nym DID document', async () => {
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
});

function _hexToUint8Array(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

# JavaScript CBOR-LD Processor

[![Build Status](https://img.shields.io/github/actions/workflow/status/digitalbazaar/cborld/main.yml)](https://github.com/digitalbazaar/cborld/actions/workflows/main.yml)
[![Coverage Status](https://img.shields.io/codecov/c/github/digitalbazaar/cborld)](https://codecov.io/gh/digitalbazaar/cborld)

> A JavaScript CBOR-LD Process for Web browsers and Node.js apps.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [Commercial Support](#commercial-support)
- [License](#license)

## Background

This library provides a CBOR-LD Processor for Web browsers and Node.js
applications.

## Install

- Browsers and Node.js 18+ are supported.

### NPM

```
npm install @digitalbazaar/cborld
```

### Git

To install locally (for development):

```
git clone https://github.com/digitalbazaar/cborld.git
cd cborld
npm install
```

## Usage

This library provides two primary functions for encoding and decoding
CBOR-LD data.

### Encode to CBOR-LD

To encode a JSON-LD document as CBOR-LD:

```js
import {encode} from '@digitalbazaar/cborld';

const jsonldDocument = {
  '@context': 'https://www.w3.org/ns/activitystreams',
  type: 'Note',
  summary: 'CBOR-LD',
  content: 'CBOR-LD is awesome!'
};

// encode a JSON-LD Javascript object into CBOR-LD bytes
// Note: user must provide their own JSON-LD `documentLoader`
const cborldBytes = await encode({jsonldDocument, documentLoader});
```

To decode a CBOR-LD document to JSON-LD:

```js
import {decode} from '@digitalbazaar/cborld';

// get the CBOR-LD bytes
const cborldBytes = await fs.promises.readFile('out.cborld');

// decode the CBOR-LD bytes into a Javascript object
// Note: user must provide their own JSON-LD `documentLoader`
const jsonldDocument = await cborld.decode({cborldBytes, documentLoader});
```

## API

### Functions

<dl>
<dt><a href="#encode">encode(options)</a> ⇒ <code>Uint8Array</code></dt>
<dd>
  <p>Encodes a given JSON-LD document into a CBOR-LD byte array.</p>
</dd>
<dt><a href="#decode">decode(options)</a> ⇒ <code>object</code></dt>
<dd>
  <p>Decodes a CBOR-LD byte array into a JSON-LD document.</p>
</dd>
</dl>

### Typedefs

<dl> <dt><a href="#diagnosticFunction">diagnosticFunction</a> :
    <code>function</code></dt>
  <dd>
    <p>A diagnostic function that is called with
      diagnostic information. Typically set to <code>console.log</code> when
      debugging.</p>
  </dd> <dt><a href="#documentLoaderFunction">documentLoaderFunction</a> ⇒
    <code>string</code></dt>
  <dd>
    <p>Fetches a resource given a URL and returns it
      as a string.</p>
  </dd>
</dl>

<a name="encode"></a>

### encode(options) ⇒ <code>Promise&lt;Uint8Array></code>
Encodes a given JSON-LD document into a CBOR-LD byte array.

**Kind**: global function
**Returns**: <code>Uint8Array</code> - - The encoded CBOR-LD bytes.
<table>
  <thead>
    <tr>
      <th>Param</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>options</td>
      <td><code>object</code></td>
      <td>
        <p>The
          options to use when encoding to CBOR-LD.</p>
      </td>
    </tr>
    <tr>
      <td>options.jsonldDocument</td>
      <td><code>object</code></td>
      <td>
        <p>The JSON-LD
          Document to convert to CBOR-LD bytes.</p>
      </td>
    </tr>
    <tr>
      <td>options.documentLoader</td>
      <td><code><a href="#documentLoaderFunction">documentLoaderFunction</a></code></td>
      <td>
        <p>The document loader to use when resolving JSON-LD Context URLs.</p>
      </td>
    </tr>
    <tr>
      <td>[options.appContextMap]</td>
      <td><code>Map</code></td>
      <td>
        <p>A map of JSON-LD Context URLs and their encoded CBOR-LD values
          (must be values greater than 32767 (0x7FFF)).</p>
      </td>
    </tr>
    <tr>
      <td>[options.appTermMap]</td>
      <td><code>Map</code></td>
      <td>
        <p>A map of JSON-LD terms and their associated
          CBOR-LD term codecs.</p>
      </td>
    </tr>
    <tr>
      <td>[options.diagnose]</td>
      <td><code><a href="#diagnosticFunction">diagnosticFunction</a></code></td>
      <td>
        <p>A function that, if provided, is called with diagnostic
        information.</p>
      </td>
    </tr>
  </tbody>
</table>
<a name="decode"></a>

### decode(options) ⇒ <code>Promise&lt;object></code>
Decodes a CBOR-LD byte array into a JSON-LD document.

**Kind**: global function
**Returns**: <code>object</code> - - The decoded JSON-LD Document.
<table>
  <thead>
    <tr>
      <th>Param</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>options</td>
      <td><code>object</code></td>
      <td>
        <p>The options to use when decoding CBOR-LD.</p>
      </td>
    </tr>
    <tr>
      <td>options.cborldBytes</td>
      <td><code>Uint8Array</code></td>
      <td>
        <p>The encoded CBOR-LD bytes to
          decode.</p>
      </td>
    </tr>
    <tr>
      <td>options.documentLoader</td>
      <td><code>function</code></td>
      <td>
        <p>The document loader to use when
          resolving JSON-LD Context URLs.</p>
      </td>
    </tr>
    <tr>
      <td>[options.appContextMap]</td>
      <td><code>Map</code></td>
      <td>
        <p>A map of JSON-LD Context URLs and
          their associated CBOR-LD values. The values must be greater than
          32767 (0x7FFF)).</p>
      </td>
    </tr>
    <tr>
      <td>[options.appTermMap]</td>
      <td><code>Map</code></td>
      <td>
        <p>A map of JSON-LD terms and
          their associated CBOR-LD term codecs.</p>
      </td>
    </tr>
    <tr>
      <td>[options.diagnose]</td>
      <td><code><a href="#diagnosticFunction">diagnosticFunction</a></code></td>
      <td>
        <p>A function that, if
          provided, is called with diagnostic information.</p>
      </td>
    </tr>
  </tbody>
</table>
<a name="diagnosticFunction"></a>

### diagnosticFunction : <code>function</code>
A diagnostic function that is called with diagnostic information. Typically
set to `console.log` when debugging.

**Kind**: global typedef
<table>
  <thead>
    <tr>
      <th>Param</th><th>Type</th><th>Description</th>
    </tr>
  </thead>
  <tbody>
<tr>
    <td>message</td><td><code>string</code></td><td><p>The diagnostic message.</p>
</td>
    </tr>  </tbody>
</table>

<a name="documentLoaderFunction"></a>

### documentLoaderFunction ⇒ <code>string</code>
Fetches a resource given a URL and returns it as a string.

**Kind**: global typedef
**Returns**: <code>string</code> - The resource associated with the URL as a string.
<table>
  <thead>
    <tr>
      <th>Param</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>url</td>
      <td><code>string</code></td>
      <td>
        <p>The URL to retrieve.</p>
      </td>
    </tr>
  </tbody>
</table>

Examples:

```
TBD
```

## Contribute

Please follow the existing code style.

PRs accepted.

If editing the README, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## Commercial Support

Commercial support for this library is available upon request from
Digital Bazaar: support@digitalbazaar.com

## License

[BSD-3-Clause](LICENSE.md) © Digital Bazaar

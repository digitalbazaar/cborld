# JavaScript CBOR-LD Processor

> A JavaScript CBOR-LD Process for Web browsers and Node.js apps.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [CLI](#cli)
- [Contribute](#contribute)
- [Commercial Support](#commercial-support)
- [License](#license)

## Background

This library provides a CBOR-LD Processor for Web browsers and Node.js
applications.

## Quickstart

To quickly see cborld in action, run the following commands:

```
git clone git@github.com:digitalbazaar/cborld.git
cd cborld
npm i
./cborld encode --verbose --diagnose examples/note.jsonld
```

## Install

### NPM

```
npm install cborld
```

### Git

To install locally (for development):

```
git clone https://github.com/digitalbazaar/cborld.git
cd cborld
npm install
```

## Usage

TBD...

### Encode to CBOR-LD

To encode a JSON-LD document as CBOR-LD:

```js
import * as cborld from 'cborld';

const jsonldDocument = {
  '@context': 'https://www.w3.org/ns/activitystreams',
  type: 'Note',
  summary: 'CBOR-LD',
  content: 'CBOR-LD is awesome!'
};

const cborldBytes = await cborld.encode({jsonldDocument});
```

To decode a CBOR-LD document to JSON-LD:

```js
import * as cborld from 'cborld';

const jsonldDocument = await cborld.decode({cborldBytes});
```

## API


## CLI

A command line interface tool called `cborld` is provided to encode and decode
CBOR-LD.

`cborld` can be run installed, run directly, or run via `npx`:

```
npm install -g cborld
cborld [OPTIONS]
```
```
./cborld [OPTIONS]
```
```
npx cborld [OPTIONS]
```

The options follow the API. See help for more information:

```
npx cborld --help
```

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

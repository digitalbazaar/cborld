/*!
 * Copyright (c) 2020-2025 Digital Bazaar, Inc. All rights reserved.
 */
import {decode, Token, Tokenizer, Type} from 'cborg';
import {CborldError} from './CborldError.js';
import {default as varint} from 'varint';

const FORMAT_1_0 = 'cbor-ld-1.0';
const FORMAT_LEGACY_RANGE = 'legacy-range';
const FORMAT_LEGACY_SINGLETON = 'legacy-singleton';

// 0xd9 == 11011001
// 110 = CBOR major type 6
// 11001 = 25, 16-bit tag size (65536 possible values)
// 0xcb1d = the first 16-bits of a CBOR-LD 1.0 tag
// 0x0600-0x06ff = the first 16-bits of a legacy range CBOR-LD tag
// 0x0500-0x0501 = the first 16-bits of a legacy singleton CBOR-LD tag

// encodes as 0xcb1d
const TAG_1_0 = 51997;
// encodes as 0x0600
const TAG_LEGACY_RANGE_START = 1536;
// encodes as 0x06ff
const TAG_LEGACY_RANGE_END = 1791;
// encodes as 0x0500
const TAG_LEGACY_UNCOMPRESSED = 1280;
// encodes as 0x0501
const TAG_LEGACY_COMPRESSED = 1281;

class HeaderParser extends Tokenizer {
  constructor(data, options) {
    super(data, options);
    this.expectedTokenType = null;
    this.header = null;
    this.headerParsed = false;
    this.shouldParseRemainder = false;
  }

  next() {
    if(this.shouldParseRemainder) {
      return this._parseRemainder({useMaps: false});
    }
    const nextToken = super.next();
    if(this.header === null) {
      return this._handleTag(nextToken);
    }
    if(this.headerParsed) {
      return nextToken;
    }
    if(nextToken.type !== this.expectedTokenType) {
      throw new CborldError(
        'ERR_NOT_CBORLD',
        `Unexpected CBOR type "${nextToken.type.name}" in CBOR-LD data; ` +
        `expecting "${this.expectedTokenType.name}".`);
    }
    if(this.header.format === FORMAT_1_0) {
      this.header.registryEntryId = nextToken.value;
      // anything other than `registryEntryId === 0` means compression
      this.header.payloadCompressed = this.header.registryEntryId !== 0;
      this.headerParsed = true;
      if(!this.header.payloadCompressed) {
        // non-compression requires parsing remainder without using Maps; set
        // flag to cause remainder to be parsed on following call to `next()`
        this.shouldParseRemainder = true;
      }
    } else if(this.header.format === FORMAT_LEGACY_RANGE) {
      // get varint bytes that express the registry entry ID by using the
      // relative tag value (i.e., subtracting start of legacy range from the
      // tag value) and appending the parsed byte array
      const varintBytes = new Uint8Array(nextToken.value.length + 1);
      varintBytes[0] = this.header.tagToken.value - TAG_LEGACY_RANGE_START;
      varintBytes.set(nextToken.value, 1);
      // ensure varint isn't too large
      if(varintBytes.length >= 24) {
        throw new CborldError(
          'ERR_NOT_CBORLD', 'CBOR-LD encoded registryEntryId too large.');
      }
      // decode varint and ensure it is well formed
      this.header.registryEntryId = varint.decode(varintBytes);
      if(varint.bytes !== varintBytes.length) {
        throw new CborldError(
          'ERR_NOT_CBORLD', 'CBOR-LD registry entry ID varint encoding error.');
      }
      this.headerParsed = true;
    }
    return nextToken;
  }

  _handleTag(tagToken) {
    if(tagToken.type !== Type.tag) {
      throw new CborldError(
        'ERR_NOT_CBORLD',
        'CBOR-LD must start with a CBOR major type "Tag" header of `0xd9`.');
    }

    const header = {
      format: '',
      registryEntryId: undefined,
      tagToken,
      payloadCompressed: false
    };
    this.header = header;
    const {value: tag} = tagToken;

    if(tag === TAG_1_0) {
      header.format = FORMAT_1_0;
      this.expectedTokenType = Type.uint;
    } else if(tag >= TAG_LEGACY_RANGE_START && tag <= TAG_LEGACY_RANGE_END) {
      header.format = FORMAT_LEGACY_RANGE;
      this.expectedTokenType = Type.bytes;
    } else if(tag === TAG_LEGACY_UNCOMPRESSED ||
      tag === TAG_LEGACY_COMPRESSED) {
      header.format = FORMAT_LEGACY_SINGLETON;
      this.expectedTokenType = Type.map;
      this.header.payloadCompressed = tag === TAG_LEGACY_COMPRESSED;
      this.headerParsed = true;
      // parse remainder, only using maps when compression is on
      return this._parseRemainder({useMaps: this.header.payloadCompressed});
    } else {
      throw new CborldError('ERR_NOT_CBORLD', 'Unknown CBOR-LD tag.');
    }

    // advance to next token; must be an array
    const nextToken = super.next();
    if(!(nextToken.type === Type.array && nextToken.value === 2)) {
      throw new CborldError(
        'ERR_NOT_CBORLD',
        'CBOR-LD format requires an array of length 2 after the main tag.');
    }
    return nextToken;
  }

  // this function is needed to parse the remaining bytes while allowing the
  // value of `useMaps` to change; the underlying `cborg` lib doesn't allow
  // the option to be changed after parsing has started -- and it must be
  // `false` for uncompressed payloads and `true` for compressed ones
  _parseRemainder({useMaps}) {
    const remainder = this.data.subarray(this.pos());
    this._pos += remainder.length;
    const value = decode(remainder, {useMaps});
    this.headerParsed = true;
    // return as undefined token; will cause the `value` to be used directly
    return new Token(Type.undefined, value);
  }
}

export function parse({cborldBytes} = {}) {
  const options = {tokenizer: null, useMaps: true};
  options.tokenizer = new HeaderParser(cborldBytes, options);
  const suffix = decode(cborldBytes, options);
  const {header} = options.tokenizer;
  if(header.format === FORMAT_1_0 || header.format === FORMAT_LEGACY_RANGE) {
    return {header, payload: suffix[1]};
  }
  return {header, payload: suffix};
}

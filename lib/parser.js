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

// encodes as 0xcb1d; modern implementations only need to implement this tag
const TAG_1_0 = 51997;
// encodes as 0x0600; rarely used tag
const TAG_LEGACY_RANGE_START = 1536;
// encodes as 0x06ff; rarely used tag
const TAG_LEGACY_RANGE_END = 1791;
// encodes as 0x0500; some legacy production software uses this tag
const TAG_LEGACY_UNCOMPRESSED = 1280;
// encodes as 0x0501; some legacy production software uses this tag
const TAG_LEGACY_COMPRESSED = 1281;

class Parser extends Tokenizer {
  constructor(data, options) {
    super(data, options);
    this.expectedTokenTypes = [Type.tag];
    this.header = null;
    this.headerParsed = false;
    this.shouldParseRemainder = false;
  }

  next() {
    while(true) {
      // finalize parsing if requested
      if(this.shouldParseRemainder) {
        // parse remainder, only use maps when compression is on
        return this._parseRemainder({useMaps: this.header.payloadCompressed});
      }

      // get next token to consider
      const nextToken = super.next();

      // header fully parsed, pass any token through
      if(this.headerParsed) {
        return nextToken;
      }

      // check expected token type
      const expectedTokenType = this.expectedTokenTypes.shift();
      if(nextToken.type !== expectedTokenType) {
        throw new CborldError(
          'ERR_NOT_CBORLD',
          `Unexpected CBOR type "${nextToken.type.name}" in CBOR-LD data; ` +
          `expecting "${expectedTokenType.name}".`);
      }

      // start parsing header
      const {header} = this;
      if(header === null) {
        this._handleTag(nextToken);
        continue;
      }

      // no more expected tokens for parsing the header; finish parsing it
      if(this.expectedTokenTypes.length === 0) {
        // get registry entry ID
        header.registryEntryId = header.format === FORMAT_LEGACY_RANGE ?
          this._varintToRegistryEntryId({nextToken}) : nextToken.value;
        // anything other than `registryEntryId === 0` means compression
        header.payloadCompressed = header.registryEntryId !== 0;
        if(!header.payloadCompressed) {
          // set flag to cause remainder to be parsed on next call to `next()`
          this.shouldParseRemainder = true;
        }
        this.headerParsed = true;
      }

      return nextToken;
    }
  }

  _handleTag(tagToken) {
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
      this.expectedTokenTypes = [Type.array, Type.uint];
    } else if(tag >= TAG_LEGACY_RANGE_START && tag <= TAG_LEGACY_RANGE_END) {
      header.format = FORMAT_LEGACY_RANGE;
      // registry entry ID is expressed as varint where the first byte of the
      // varint resides in the tag; if the tag minus the start of the legacy
      // tag range is under `128` then the varint is 1 byte and the registry
      // entry ID is that value
      const registryEntryIdStart = tag - TAG_LEGACY_RANGE_START;
      if(registryEntryIdStart < 128) {
        header.registryEntryId = registryEntryIdStart;
        // anything other than `registryEntryId === 0` means compression
        header.payloadCompressed = header.registryEntryId !== 0;
        this.shouldParseRemainder = true;
        this.headerParsed = true;
      } else {
        // remainder of varint is expressed as bytes in an array's 1st element
        this.expectedTokenTypes = [Type.array, Type.bytes];
      }
    } else if(tag === TAG_LEGACY_UNCOMPRESSED ||
      tag === TAG_LEGACY_COMPRESSED) {
      header.format = FORMAT_LEGACY_SINGLETON;
      this.header.payloadCompressed = tag === TAG_LEGACY_COMPRESSED;
      this.shouldParseRemainder = true;
      this.headerParsed = true;
    } else {
      throw new CborldError(
        'ERR_NOT_CBORLD', `Unknown CBOR-LD tag "${tag}".`);
    }
  }

  _varintToRegistryEntryId({nextToken}) {
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
    const registryEntryId = varint.decode(varintBytes);
    if(varint.decode.bytes !== varintBytes.length) {
      throw new CborldError(
        'ERR_NOT_CBORLD', 'CBOR-LD registry entry ID varint encoding error.');
    }
    return registryEntryId;
  }

  // this function is needed to parse the remaining bytes while allowing the
  // value of `useMaps` to change; the underlying `cborg` lib doesn't allow
  // the option to be changed after parsing has started -- and it must be
  // `false` for uncompressed payloads and `true` for compressed ones
  _parseRemainder({useMaps}) {
    const remainder = this.data.subarray(this.pos());
    this._pos += remainder.length;
    const value = decode(remainder, {useMaps});
    // return as undefined token which is "terminal" and will cause the
    // `value` to be used directly
    return new Token(Type.undefined, value);
  }
}

export function parse({cborldBytes} = {}) {
  const options = {tokenizer: null, useMaps: true};
  options.tokenizer = new Parser(cborldBytes, options);
  const suffix = decode(cborldBytes, options);
  const {header} = options.tokenizer;
  if(header.format === FORMAT_1_0 || header.format === FORMAT_LEGACY_RANGE) {
    return {header, payload: Array.isArray(suffix) ? suffix[1] : suffix};
  }
  return {header, payload: suffix};
}

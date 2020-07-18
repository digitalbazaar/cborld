/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {Base64PadCodec} from './codecs/base64Pad';
import {XsdDateTimeCodec} from './codecs/xsdDateTime';
import {UrlCodec} from './codecs/url';

// all term codecs available to use when transforming term values
const termCodecs = {
  base64Pad: Base64PadCodec,
  dateTime: XsdDateTimeCodec,
  url: UrlCodec
};

/**
 * Gets a list of all term codecs available to use when transforming term
 * values.
 *
 * @returns {Array} - An array of all term codecs.
 */
export function getTermCodecs() {
  return termCodecs;
}

# @digitalbazaar/cborld ChangeLog

## 8.0.0 - 2024-mm-dd

### Added
- Added support for passing through (without semantic compression) terms not
  defined in contexts and other plain values.

### Changed
- Restructure term registry system to be more general with a type table. The
  type table expresses type-namespaced tables of values that can be used when encoding and decoding. This type table (of tables) can be passed by the user
  when encoding and decoding and will be given preference over any processing-
  mode-specific codecs (such as multibase codecs).
  The supported types include:
    - context: for JSON-LD context URLs, this subsumes the old 'appContextMap'
      and any contexts expressed in the old arbitrary string table as well.
    - url: for any JSON-LD URL value, such as values associated with `@id`
      or `@type` (or their aliases) JSON keys.
    - none: for any untyped or plain literal values.
    - <any JSON-LD type expressed as URL>: for any values associated with
      any custom JSON-LD types.
- Restructure CBOR-LD tag system to use a range of tags where
  the tag value informs what values for the tables above should be used
  via a registry. Legacy tags (0x0501) are still supported, and new tags are
  in the range 0x0600-0x06FF. In addition, the tag value is part of a varint
  that begins the CBORLD paylaod if necessary that allows for more registry
  entries than the number of tags in that range.

## 7.0.0 - 2024-07-01

### Added
- **BREAKING**: Add support for compressing RFC 2397 data URLs. Base64 encoded
  data is compressed as binary.
- Add VCDM v2 context value.

### Changed
- **BREAKING**: Encode cryptosuite strings using a separate registry (specific
  to cryptosuites) to further reduce their encoded size (instead of using the
  global table). This approach is incompatible with previous encodings that
  used the global table.
- **BREAKING**: Encode all URIs using the vocab term codec. This allows
  arbitrary URIs to be encoded with the same small integers as other terms.
  The mapping in a context needs to use a redundant form: `{"URI":"URI"}`. This
  technique assume a use case where the CBOR-LD size has high priority over
  context size.
- Improve and test examples.
- Update dependencies.

### Removed
- **BREAKING**: Remove and reserve cryptosuite values from term registry in
  favor of the new cryptosuite codec.

## 6.0.3 - 2023-12-19

### Fixed
- Use `appContextMap` in `CryptosuiteEncoder`.
- Ensure custom `appContextMap` is used first before registered table of term
  codecs in cryptosuite codecs.

## 6.0.2 - 2023-11-29

### Fixed
- Ensure custom `appContextMap` is used first before registered table of
  term codecs.

## 6.0.1 - 2023-11-29

### Changed
- **BREAKING**: Require node 18+ (current non-EOL node versions).

## 6.0.0 - 2023-11-29

### Added
- **BREAKING**: Add support for compressing base64url-encoded multibase values.
- **BREAKING**: Add support for compressing Data Integrity cryptosuite strings.

## 5.2.0 - 2023-11-15

### Changed
- Update dependencies:
  - Use `cborg@4`.
  - Use `uuid@9`.

## 5.1.0 - 2023-11-15

### Added
- Add `https://w3id.org/security/data-integrity/v2` registered context.
- Add `https://purl.imsglobal.org/spec/ob/v3p0/context.json` registered context.

## 5.0.0 - 2022-06-09

### Changed
- **BREAKING**: Convert to module (ESM).
- **BREAKING**: Require Node.js >=14.
- Update dependencies.
- Lint module.

## 4.4.0 - 2022-01-27

### Added
- Add `https://w3id.org/vc/status-list/v1` registered context.

## 4.3.0 - 2021-09-17

### Added
- Add `https://w3id.org/dcc/v1c` registered context.

## 4.2.0 - 2021-04-22

### Added
- Add `https://w3id.org/vc-revocation-list-2020/v1` registered context.

## 4.1.0 - 2021-04-22

### Added
- Add latest contexts from the cborld term codec registry.

## 4.0.1 - 2021-04-16

### Fixed
- **BREAKING**: Fixed broken security ed25519 suite context URLs.

## 4.0.0 - 2021-04-16

### Removed
- **BREAKING**: Removed CLI, see: https://github.com/digitalbazaar/cborld-cli

### Changed
- **BREAKING**: Use `cborg` as the underlying CBOR library.
- **BREAKING**: Assign term IDs for defined terms in pairs using even numbers
  for terms with single values and odd numbers for multiple values. This
  approach avoids adding additional tags for multiple values and is based
  on the fact that JSON-LD keywords themselves will be assigned term IDs that
  exceed the CBOR single byte value limit of 24. Custom term IDs therefore
  start at 100 and will use two bytes per term up to `65536-100` custom
  terms.
- **BREAKING**: Support embedded and scoped contexts in JSON-LD and, more
  generally, any JSON-LD document that has all of its terms defined. The
  only exceptions are contexts that use change the `@propagate` setting
  from its default; these are not presently supported but may be in a future
  version.
- **BREAKING**: Treat the last 8-bits of the CBOR-LD tag as a compression
  mode with support for mode=0 (no compression) or mode=1 (compression as
  implemented with the above term ID rules, sorting, etc. -- to be updated
  in the spec). Future compression modes can be added to support other
  algorithms.
- **BREAKING**: Type encoding depends on `@type` in term definitions and does
  not require a CBOR Map to be used when encoding values. If a value cannot
  be encoded to match the `@type`, it is the encoders job to provide a
  default uncompressed value that is distinguishable from a compressed one. For
  example, a compressed `@type` value for `foo` may use a `Uint8Array` but an
  uncompressed value may use any other major CBOR type.

## 3.1.1 - 2021-03-30

### Fixed
- Update to latest `@digitalbazaar/cbor` version that has the `ignoreBOM` fix.

## 3.1.0 - 2021-03-29
### Added
- Add entry for X25519 2020 crypto suite context codec.

## 3.0.0 - 2021-03-24

### Changed
- **BREAKING**: Use `@digitalbazaar/cbor` as a temporary measure to get better
  Web/browser compatiblity for cbor-ld. The plan is to switch to `cborg`
  library in another subsequent major release.
- **BREAKING**: Temporarily disable `diagnose` mode. This will be re-enabled
  in some way once the transition to the `cborg` library is complete.
- **BREAKING**: Disabled errors that throw when using an app context map with
  tag numbers from the registry. This is currently allowed to enable people
  to use the library even when a new version hasn't been released that supports
  newly registered tags. We'll explore if this is right path forward or if
  we need to do something else in the future.

### Removed
- **BREAKING**: Removed support for node 10.x. Node 10.x reaches EOL at
  the end of April 2021 (a little over 30 days from the time this entry was
  written) and it is lacking in features required to run `@digitalbazaar/cbor`. Support
  is therefore being removed.

## 2.2.0 - 2021-03-22

### Added
- Add support for compressing `xsd:date` types.

## 2.1.0 - 2021-02-20

### Changed
- Use `match-all` for compatibility with Node.js <12.
- **NOTE**: The required Node.js version may be increased to v12 sometime after
  v10 hits end-of-life. The above `match-all` support may be removed at that
  time.

## Fixed
- UrlCodec decode dropped base58 multibase prefix.

## 2.0.1 - 2020-10-21

### Fixed
- Get entries based on cborMap type.

## 2.0.0 - 2020-08-18

### Fixed
- Handle decoding of encoded empty object.
- Refactoring to allow simple karma tests to pass.

### Changed
- **BREAKING**: Move documentLoader towards alignment with JSON-LD spec. Allows
  reuse of jsonld.js document loaders.

## 1.0.0 - 2020-07-23

### Note
- Browser support unfinished in this release.

### Added
- Add core files.

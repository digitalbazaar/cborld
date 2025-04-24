# @digitalbazaar/cborld ChangeLog

## 7.3.0 - 2025-MM-DD

### Added
- Added new tag system for use with a single CBOR tag (0xcb1d). The tagged
  item is always an array of two elements. The first element is a CBOR integer
  representation of the registry entry ID for the payload, and the second
  element is the encoded JSON-LD. To use the new mode when encoding, pass
  `format: 'cbor-ld-1.0'` as an option to `encode()`. When decoding, the new
  mode will be automatically supported. Both the legacy tag 0x0500/01 and the
  legacy tag range 0x0600-0x06FF are still supported for both encoding and
  decoding.

## 7.2.1 - 2025-04-14

### Fixed
- Fix registry entries `0` and `1`. Previously, entry `0` could not be passed
  without an error; it can now be used to produce output with no compression.
  Entry `1` could not previously be used when specifying a type table loader
  even though the loader should not need to return the default (empty) type
  table for entry `1`, which should not be overridden. The tests have also
  been updated to use entry `2` for custom `typeTable` entries to encourage
  that mechanism NOT to be used to override entry `1`, which should be
  prevented from being overridden entirely in a future major release.

## 7.2.0 - 2024-10-21

### Added
- Add `async function typeTableLoader({registryEntryId})` option to look up the
  `typeTable` to use by id for both `encode` and `decode`.

### Changed
- **NOTE**: The handling of `typeTable` and `typeTableLoader` is more strict
  than before and requies one option be used when appropriate. This could cause
  issues with code that was depending on undefined behavior.
- Refactor `registryEntryId` encoding and decoding logic. Trying to be more
  readable and handle more error and edge cases. This is a work in progress.

## 7.1.3 - 2024-10-16

### Fixed
- Fix varint processing when registry IDs require multiple bytes.
- Fix bug with registry IDs that are expressed using varints larger than
  1 byte in size. This would break any previous use of this, but that
  previous use is invalid and non-interoperable. When a registry entry is
  used that requires more than one byte, the payload is now appropriately
  a two element tagged array containing a bytestring and the encoded
  JSON-LD document instead of a sequence containing a tagged
  bytestring and the encoded document.

## 7.1.2 - 2024-08-13

### Fixed
- Fix compression of values in arrays of arrays.
- Internal refactor for simpler code, better maintenance, and better
  better separation of concerns.

## 7.1.1 - 2024-08-12

### Fixed
- Fix property-scope processing bug that applied property-scope context
  without removing any type-scope context first.
- Ensure error is thrown if unexpected protected term redefinition is
  attempted.
- Ensure `@propagate` context flag is considered.
- Add missing `@propagate` to keywords table.

### Fixed

## 7.1.0 - 2024-07-14

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
    - \<any JSON-LD type expressed as URL>: for any values associated with
      any custom JSON-LD types.
- Restructure CBOR-LD tag system to use a range of tags where
  the tag value informs what values for the tables above should be used
  via a registry. Legacy tags (0x0501) are still supported, and new tags are
  in the range 0x0600-0x06FF. In addition, the tag value is part of a varint
  that begins the CBOR-LD paylaod if necessary that allows for more registry
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

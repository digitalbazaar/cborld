# @digitalbazaar/cborld ChangeLog

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

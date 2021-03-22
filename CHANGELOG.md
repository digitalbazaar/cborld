# @digitalbazaar/cborld ChangeLog

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

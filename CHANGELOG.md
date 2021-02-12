# @digitalbazaar/cborld ChangeLog

### Changed
- Use `match-all` for compatibility with Node.js <12.

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

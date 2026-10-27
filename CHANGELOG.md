# Changelog

This file records changes for MCP releases. Keep work in **Unreleased** until a version is published, then move those entries under its version and release date.

## Unreleased

### Documentation

- Added [GLPI 12 High-Level API v3 migration research](docs/glpi-high-level-api-migration.md) and a [dated migration log](docs/migration-log.md).
- Added repository contributor guidelines in `AGENTS.md`.

### Development

- Installed and configured Jest and ESLint. The test runner is ready for the GLPI API migration; no tests have been added yet.

The MCP still uses GLPI's legacy API. The migration research does not change runtime behavior.

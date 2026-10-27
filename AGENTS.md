# Repository Guidelines

## Project Structure & Module Organization

This is a TypeScript MCP server. `src/index.ts` defines MCP tools, resources, configuration, and the stdio server. `src/glpi-client.ts` holds GLPI HTTP calls and response types. `README.md` covers installation; `docs/glpi-high-level-api-migration.md` records the GLPI 12 API v3 migration plan, and `docs/migration-log.md` records progress. Keep release-facing changes in `CHANGELOG.md`. `dist/` is generated build output and is ignored. Tests are in `tests/`; v3 writable input schemas are in `src/v3-schemas.json`.

## Build, Test, and Development Commands

Use Node.js 18.18 or newer for development. Run `npm ci` to install from the lockfile and `npm run build` to compile `src/` into `dist/`; `npm run watch` recompiles during development. Run `npm run lint` for ESLint and `npm test` for Jest. Run `npm start` after building and setting the five v3 OAuth environment variables described in `README.md`. The `dev` script still requires `ts-node`, which is not installed.

## Coding Style & Naming Conventions

Follow the existing two-space indentation, single quotes, and semicolons. TypeScript uses strict checking, ES2022, and NodeNext modules. ESLint rules are in `eslint.config.mjs`. Use `PascalCase` for classes and interfaces, `camelCase` for TypeScript methods and variables, and `glpi_snake_case` for public MCP tool names. Keep HTTP authentication and request handling in the client rather than duplicating it in tool handlers.

## Testing Guidelines

Jest is configured in `jest.config.cjs`; put new tests in `tests/` with `*.test.ts` names. Cover API authentication, payload mapping, pagination, permissions, and errors. Verify GLPI 12 v3 behavior against its versioned OpenAPI document and a disposable instance before claiming endpoint compatibility.

## Commit & Pull Request Guidelines

Recent commits use short prefixes such as `feat:`, `fix:`, `docs:`, and `chore:`. Keep each commit focused. Pull requests should summarize behavior, list build and test results, link relevant issues, and identify affected MCP tools and GLPI endpoints. Update the migration log for migration work and the changelog for user-visible changes. Never commit GLPI credentials, tokens, or private instance data; `.env` is ignored.

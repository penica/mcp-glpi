# Repository Guidelines

## Project Structure & Module Organization

This is a TypeScript MCP server. `src/index.ts` defines MCP tools, resources, configuration, and the stdio server. `src/glpi-client.ts` holds GLPI HTTP calls and response types. `README.md` covers installation; `docs/glpi-high-level-api-migration.md` records the GLPI 12 API v3 migration plan, and `docs/migration-log.md` records progress. Keep release-facing changes in `CHANGELOG.md`. `dist/` is generated build output and is ignored. There are no test files or static assets yet.

## Build, Test, and Development Commands

Use Node.js 18 or newer. Run `npm ci` to install from the lockfile and `npm run build` to compile `src/` into `dist/`; `npm run watch` recompiles during development. Run `npm start` after building and setting `GLPI_URL` plus the current legacy API credentials described in `README.md`. The `dev`, `test`, and `lint` scripts exist, but their `ts-node`, Jest, and ESLint dependencies are not installed; configure them before treating those scripts as working checks.

## Coding Style & Naming Conventions

Follow the existing two-space indentation, single quotes, and semicolons. TypeScript uses strict checking, ES2022, and NodeNext modules. Use `PascalCase` for classes and interfaces, `camelCase` for TypeScript methods and variables, and `glpi_snake_case` for public MCP tool names. Keep HTTP authentication and request handling in the client rather than duplicating it in tool handlers.

## Testing Guidelines

No test framework is configured and no coverage threshold exists. When adding tests, install and configure the runner in the same change; name tests `*.test.ts` and cover API authentication, payload mapping, pagination, and errors. Verify GLPI 12 v3 behavior against its versioned OpenAPI document and a disposable instance before claiming endpoint compatibility.

## Commit & Pull Request Guidelines

Recent commits use short prefixes such as `feat:`, `fix:`, `docs:`, and `chore:`. Keep each commit focused. Pull requests should summarize behavior, list build and test results, link relevant issues, and identify affected MCP tools and GLPI endpoints. Update the migration log for migration work and the changelog for user-visible changes. Never commit GLPI credentials, tokens, or private instance data; `.env` is ignored.

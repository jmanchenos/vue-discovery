# Change Log

All notable changes to the "vue-discovery" extension will be documented in this file.

## [0.8.0] 2026-10-21

### Changed

- The extension source has been migrated from JavaScript (ESM) to **TypeScript** (`src/*.ts`) with
  `strict` type checking. The generated types live in `src/types.ts` and the declarations of the
  third party modules without types in `src/typings/vendor.d.ts`.
- The package is now an explicit **ES Module** (`"type": "module"`).
- The build pipeline uses `esbuild` over the TypeScript sources and the `vite` build has been
  adapted to the Node target (the node builtins are externalized instead of being polyfilled for
  the browser).
- ESLint is configured with `typescript-eslint` and the Prettier configuration has been unified in
  `.prettierrc.mjs` (it is the single source of truth).

### Fixed

- The path aliases of the workspace are now read from `tsconfig.json` as well as from
  `jsconfig.json`, so the imports of the components honour the `@/` alias.
- The props of the mixins are now collected (the mixin chain was parsed asynchronously and the
  result was discarded) and they keep the name, the type and the default value as they are
  written in the source code.
- The props that are already set on a component tag are no longer offered again.
- The `refs` provider works again: the `ref` attributes are located with the real API of
  `vue-sfc-parser`.
- The `importFile` command accepts both a component entry and a plain path.
- The `insertSnippet` call is awaited, so the command does not finish before the snippet has been
  inserted in the document.
- The casing of the components is applied when they are shown, so changing the configuration takes
  effect without having to rediscover the files of the workspace.
- The unit tests run on Windows (the paths are resolved with `fileURLToPath`) and they open the
  fixture folder as the workspace of the test instance.

## [0.7.6] 2025-03-12

- Dependencies are updated
- Fix access to ShowCaseView

## [0.7.5] 2024-06-28

- Add support for external routes to Registered components with absolute paths

## [0.7.4] 2024-06-23

- Add posibility to delete the node_modules folder in the project
- Add posibility to create a test unit file for .vue files
- Add vite support

## [0.7.3] 2022-12-12

-   Dependencies are updated
-   Improved the way the extension discover plugins.
-   Changes in AST finder dependencies
-   Now, we can navigate to Cypress Commands definitions
-   Add improvements to detect and navigate to $refs in a vue page
-   Add improvements to detect and navigate to constants defined in Vue instance
    New property 'utilsDirectory' added

## [0.7.2] 2022-03-31

-   Update default value for property 'componentShowcaseUrl'

## [0.7.1] 2022-01-11

-   Add improvements for Cypress test files

## [0.7.0] 2021-10-04

### Added

-   Add improvement to show plugins from the page, and properties on objects from data siuch as i18n properties.

## [0.6.0] 2021-09-21

### Added

-   In script, when we write this. intelliSense show object froms props, data, computed, and methods,

## [0.5.0] 2021-09-03

### Added

-   In test folder, the added methods through the "add" function in cy object (Cypress plugin) are detected.
-   New property 'cypressTestsDirectory' added

## [0.4.0] 2021-08-28

### Added

-   Access to the showCase application is added by clicking on Ctrl+Shift+I with the punch on the component tag

## [0.3.0] 2021-08-23

### Changed

-   Vue parser dependency has changed

## [0.2.0] 2021-08-19

### Added

-   Added possibility of showing the description of the component and accessing the file by clicking on the Ctrl key when mouse is over the component tag

## [0.1.1] 2021-08-18

### Fixed

-   Fix how detect where pointer in in template section
-   Fix lack of events detections in some components

## [0.1.0] 2021-08-16

### Added

-   Initial version of Vue-discovery-MTM

# Change Log

All notable changes to the "vue-discovery" extension will be documented in this file.

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

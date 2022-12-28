# Vue Discovery MTM🔭

This extension discovers Vue components in your workspace and provides IntelliSense for them. Just starting typing your component name and press enter to automatically import, register and expand any required props.

![imagen de overview](https://raw.githubusercontent.com/jmanchenos/vue-discovery/master/images/overview_o.gif)

## ✨ Features

### Provide IntelliSense for components in template section. It automatically import, register and expand required props

![imagen de componentes](https://raw.githubusercontent.com/jmanchenos/vue-discovery/master/images/show-components.gif)

### Provide IntelliSense for props on components

![imagen de props](https://raw.githubusercontent.com/jmanchenos/vue-discovery/master/images/show-available-props.gif)

### Show available props on hover

![imagen de hover](https://raw.githubusercontent.com/jmanchenos/vue-discovery/master/images/show-props-on-hover.gif)

### Provide IntelliSense for events

![imagen de eventos](https://raw.githubusercontent.com/jmanchenos/vue-discovery/master/images/event-intellisense.gif)

### Provide IntelliSense for object 'this.' in script

### Provide Info of Components provided by Showcase Application (Ctrl + Shift + I)

![imagen de showCase](https://raw.githubusercontent.com/jmanchenos/vue-discovery/master/images/showcase-keybind.gif.gif)

## 🔧 Extension Settings

This extension can be customized with the following settings:

- `VueDiscoveryMTM.rootDirectory`: this tells where to look for vue components. It admits several paths with a ';' separator (default: `/src/components;/src/mixins`).
- `VueDiscoveryMTM.registeredDirectory`: this tells where to look for vue components that are previosly registered in Vue an do not need to be imported. It admits several paths with a ';' separator (default: `/sgtnj-vue-components/src/components`).
- `VueDiscoveryMTM.cypressTestsDirectory`: this tells where to look for Cypress configuration test files. It admits several paths with a ';' separator (default: `"/tests/e2e`).
- `VueDiscoveryMTM.pluginsDirectory`: list of plugins directories in your workspace on which search js files with plugins definitions separated by ; (default: '/src/plugins').
- `VueDiscoveryMTM.utilsDirectory`: list of directories in your workspace on which search js files with definitions of constants and other utilities, separated by ; (default: '/src/utils').
- `VueDiscoveryMTM.componentCase`: The casing for the component, available options are `kebab` for kebab-case and `pascal` for PascalCase (default: `pascal`).
- `VueDiscoveryMTM.addTrailingComma`: Add a trailing comma to the registered component (default: `true`).
- `VueDiscoveryMTM.propCase`: The casing for the props, available options are `kebab` for kebab-case and `camel` for camelCase (default: `kebab`).
- `VueDiscoveryMTM.propIconType`: The type of icon shown for properties of the component (default: `Auto`, menas Snippet when snippetSuggestion='top' cause help to bring them at first positions
    ).
- `VueDiscoveryMTM.includeRefAtribute`: Boolean to choose if a 'ref' atribute in the component is generated when creating a tag component ( default: `true`).
- `VueDiscoveryMTM.hoverComponentInfoType`: Define what info must be shown in the hover over a tag component. By now only props or none values are possible ( default: `props`).
- `VueDiscoveryMTM.useComponentShowcase`: Define if we will show help info for a component when hover is over that component and we push over `Ctrl` button. This help comes from the showCase application (default: `true`).
- `VueDiscoveryMTM.componentShowcaseUrl`: URL for Components Showcase Application to show examples of how to use them. Only used when property useComponentShowcase is set to true (default: <http://10.12.19.106:32006>).
- `VueDiscoveryMTM.componentShowcaseTimeout`: Timeout for connecting to Components Showcase Application (default: 3000).

## 🔖 Release Notes

<p>
  <h1 align="center">Vue Discovery MTM🔭</h1>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=jmanchenos.vue-discovery">
    <img src="https://vsmarketplacebadge.apphb.com/version-short/jmanchenos.vue-discovery.svg?style=flat-square">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=jmanchenos.vue-discovery">
    <img src="https://vsmarketplacebadge.apphb.com/downloads/jmanchenos.vue-discovery.svg?style=flat-square">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=jmanchenos.vue-discovery">
    <img src="https://vsmarketplacebadge.apphb.com/rating-star/jmanchenos.vue-discovery.svg?style=flat-square">
  </a>
</p>

This extension discovers Vue components in your workspace and provides IntelliSense for them. Just starting typing your component name and press enter to automatically import, register and expand any required props.

<img src="images/overview_o.gif" width="680">

## ✨ Features

##### Provide IntelliSense for components in template section

<img src="images/show-components.gif" width="680">

##### Automatically import, register and expand required props

<img src="images/auto-import.gif" width="680">

##### Provide IntelliSense for props on components

<img src="images/show-available-props.gif" width="680">

##### Show available props on hover

<img src="images/show-props-on-hover.gif" width="680">

##### Provide IntelliSense for events

<img src="images/event-intellisense.gif" width="680">

##### Uses your defined paths in `jsconfig.json`

<img src="images/uses-paths.gif" width="680">

##### Import with `cmd + i`, this is useful for importing pasted components

<img src="images/import-keybind.gif" width="680">

## 🔧 Extension Settings

This extension can be customized with the following settings:

-   `VueDiscoveryMTM.rootDirectory`: this tells where to look for vue components. It admits several paths with a ';' separator (default: `\src`)
-   `VueDiscoveryMTM.registeredDirectory`: this tells where to look for vue components that are previosly registered in Vue an do not need to be imported. It admits several paths with a ';' separator (default: ``)
-   `VueDiscoveryMTM.componentCase`: The casing for the component, available options are `kebab` for kebab-case and `pascal` for PascalCase (default: `pascal`)
-   `VueDiscoveryMTM.addTrailingComma`: Add a trailing comma to the registered component (default: `true`)
-   `VueDiscoveryMTM.propCase`: The casing for the props, available options are `kebab` for kebab-case and `camel` for camelCase (default: `kebab`)

## 🔖 Release Notes

### 0.1.0

Initial version

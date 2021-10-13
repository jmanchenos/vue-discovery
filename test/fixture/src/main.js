/* eslint-disable global-require */

import Vue from 'vue';
import PortalVue from 'portal-vue';
// TODO: Cuando la libreria de componentes esté completa, apuntar a la version correspondiente
import i18n from './plugins/i18n';
import axios from './plugins/axios';
// import Sentry from './plugins/sentry';
import App from './App.vue';
import store from '@/store';
import router from './router/router';
import './quasar';
import isElectron from './isElectron';
import * as sgntj from '../sgtnj-vue-components/src/index';
import EB from './plugins/eventBus';
import HandleError from '@/plugins/exceptions';
import Notification from '@/plugins/notification';
import Loading from '@/plugins/loading';
import validations from '@/plugins/validations';
import apiService from '@/plugins/apiService';
import fileOpener from '@/plugins/fileOpener';
import json2pdf from '@/plugins/json2pdf';
import Shortkey from '@/plugins/shortKey';
// import { Vue as VueIntegration } from '@sentry/integrations';
import UtilsGeneric from '@/plugins/utilsGeneric';
import Helpers from '@/plugins/helpers';
import Header from '@/components/Header';
import Menu from '@/components/Menu';
import RecursiveMenu from '@/components/RecursiveMenu';
import SgInputInput from '@/components/InputInput.vue';
import SgInputsDialogSelector from '@/components/InputsDialogSelector';
import Plugin from '@quasar/quasar-ui-qcalendar';
import '@quasar/quasar-ui-qcalendar/dist/index.css';
import electronCypress from '@/utils/electronCypress';
import { ROUTER_NAMES } from '@/utils/routerNames';
import { ALIAS } from '@/utils/alias';
import { STATE_NAMES } from '@/utils/stateNames';
import { UtilsShortkeys } from '@/utils/shortkeys';
import { MUTATIONS } from '@/utils/constants';

const { SET_CONFIGURACION_APP } = MUTATIONS;

// if (process.env.NODE_ENV === 'development') {
//   Sentry.init({
//     integrations: [
//       new VueIntegration({ Vue, attachProps: true, logErrors: true }),
//       new Sentry.Integrations.GlobalHandlers({ onerror: true, onunhandledrejection: true }),
//     ],
//   });
// }

Vue.prototype.$ROUTER_NAMES = ROUTER_NAMES;
Vue.prototype.$ALIAS = ALIAS;
Vue.prototype.$STATE_NAMES = STATE_NAMES;
Vue.prototype.$UTILS_SHORTKEYS = UtilsShortkeys;

Object.keys(sgntj).forEach(name => {
  Vue.component(name, sgntj[name]);
});

// Limpieza del catálogo de componentes que estan acoplados al proyecto y se estan migrando al proyecto principal
Vue.component('sg-header', Header);
Vue.component('sg-menu', Menu);
Vue.component('sg-recursive-menu', RecursiveMenu);
Vue.component('sg-input-input', SgInputInput);
Vue.component('sg-inputs-dialog-selector', SgInputsDialogSelector);

const electron = isElectron ? require('electron') : null;

Vue.use(EB);
Vue.use(PortalVue);
Vue.use(HandleError);
Vue.use(Notification);
Vue.use(Loading);
Vue.use(validations);
Vue.use(apiService);
Vue.use(fileOpener);
Vue.use(json2pdf);
Vue.use(Shortkey);
Vue.use(UtilsGeneric);
Vue.use(Helpers, { store });
Vue.use(Plugin);

Vue.config.productionTip = false;
Vue.prototype.$electron = window.Cypress ? electronCypress : electron;

(async function init() {
  if (electron) {
    const configuracionApp = await electron.ipcRenderer.invoke('get-configuracion');
    store.commit(SET_CONFIGURACION_APP, configuracionApp);
  }
  store.dispatch('auth/AUTO_REFRESH_TOKEN');
  const app = new Vue({
    router,
    store,
    i18n,
    render: h => h(App),
  }).$mount('#app');
  if (window.Cypress) {
    // Add `store` to the window object only when testing with Cypress
    window.app = app;
  }
})();

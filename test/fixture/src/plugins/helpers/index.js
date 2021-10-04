import { FORBIDDEN } from '@/utils/constants';
import { getForm, getSelects } from '@/plugins/helpers/helpers';

const Helpers = {};

Helpers.install = (Vue, { store }) => {
  const vueLocal = Vue;
  const $this = vueLocal.prototype;
  $this.$Helpers = {
    /**
     * @function initShortkey
     * @description Se usa para la gestión del teclado (Shortkeys) en el proyecto
     * @param {Array} configShortkey = [] - Configuración con los shortkey (Array de objetos)
     * @example
     * const configShortkey = [
     *   {
     *     key: {
     *       key: this.$UTILS_SHORTKEYS.KEYS.B,
     *       altKey: true,
     *     },
     *     callback: this.key_B_Callback,
     *   }];
     * this.$Helpers.initShortkey.call(this, configShortkey);
     * @version 1.0.0
     */
    initShortkey(configShortkey = []) {
      $this.$ShortKey.removeShortkey();
      $this.$ShortKey.initShortkey(configShortkey);
    },
    /**
     * @function setup
     * @description Se usa para la configuración inicial de la página (selects, formularios)
     * @param {Object} payload - Payload con la configuración
     * @param {string} payload.url = '' - La ruta del endpoint
     * @param {object} payload.modelFront = {} - El modelo con el formulario
     * @param {array}  payload.selects = [] - Array con los selects
     * @return {Object} - Devuelve el objeto preparado (llamadas y estructura) para consumir en la página
     * @example
     * const payload = {
     *    url: this.url,
     *    modelFront: this.claseRepartoFront,
     *    selects: this.initialSelects,
     * };
     * const data = await this.$Helpers.setup(payload);
     * @version 1.0.0
     */
    async setup({ url = '', modelFront = {}, selects = [] }) {
      const _url = url ?? '';
      const _modelFront = modelFront ?? {};
      const _selects = selects ?? [];
      const { data } = await $this.$APIService.get(_url);
      const { _hint: hints, _links: links, content: content } = data;
      const checkSelects = await (Object.values(_selects).length
        ? getSelects.call($this, links, _selects)
        : {});
      const form = getForm(_modelFront, data?.content || data);
      return { hints, links, content, selects: checkSelects, ...form };
    },
    /**
     * @function setupStoreOrForm
     * @description Se usa para almacenar el contenido del store dentro del formulario y eliminar las referencias
     * @param {Object} payload - Payload con la configuración
     * @param {Object} payload.form = {} - Objeto con el formulario
     * @param {Object} payload.storeValue = {} - Objeto con los datos del store
     * @return {Object} - Nuevo objeto (nueva referencia), con el formulario y el store fusionados
     * @example
     * const payload = {
     *    form: this.form,
     *    storeModule: this.storeModule,
     *    stateName: this.$STATE_NAMES.CONSULTA_MULTIPLE,
     * };
     * this.form = this.$Helpers.setupStoreOrForm(payload);
     * @version 1.0.0
     */
    setupStoreOrForm({ form = {}, stateName = '', storeModule = '' }) {
      return JSON.parse(
        JSON.stringify({ ...form, ...(store.state?.[storeModule]?.[stateName] ?? {}) })
      );
    },
    /**
     * @function getDataTableByIdFromStore
     * @description Se usa para obtener los datos de la tabla almacenada en el store en base a su 'id'
     * @param {string} tableId = '' - El identificador de la tabla que necesitamos recuperar
     * @return {Object} - Devuelve un objeto con el resultado de la búsqueda
     * @example
     * this.storeDataTable = this.$Helpers.getDataTableByIdFromStore(tableId);
     * @version 1.0.0
     */
    getDataTableByIdFromStore(tableId = '') {
      const dataTableArray =
        store.state[$this.$STATE_NAMES.DATA_TABLE]?.filter(item => item.id === tableId) || [];
      return dataTableArray.length > 0 ? JSON.parse(JSON.stringify(dataTableArray[0].data)) : {};
    },
    /**
     * @function getUrl
     * @description Se usa para obtener la url del endpoint
     * @param {String} alias = '' - Payload con la configuración
     * @param {Object} links = {} - Objeto con los links
     * @return {Boolean | String} - Devuelve false (boolean) o string con el href
     * @example
     * const links = {
     *    ayuda: {
     *      href: "Forbidden"
     *    },
     *    self: {
     *      href: "/mtm-back-consultas-general/api/no-pragma/v1/16078510002SE/geografico/poblacion"
     *    }
     * };
     * this.$Helpers.storgetUrl('alias', links);
     * @version 1.0.0
     */
    getUrl(alias = '', links = {}) {
      return this.isValidURL(links[alias]?.href) && links[alias]?.href;
    },
    /**
     * @function isValidURL
     * @description Se usa para comprobar si tenemos permisos para acceder al endpoint
     * @param {String} url = '' - Payload con la configuración
     * @return {Boolean} - Devuelve un valor boleano indicando si tenemos o no permisos para acceder a la url
     * @example
     * const url = '/mtm-back-consultas-general/api/no-pragma/v1/16078510002SE/geografico/poblacion';
     * this.$Helpers.isValidURL(url);
     * @version 1.0.0
     */
    isValidURL(url = '') {
      return ![FORBIDDEN, ''].includes(url ?? '');
    },
    /**
     * @function goBack
     * @description Se usa para volver atras en una página y cuando finalice ejecutar el callback
     * @param {Function} callback = ()=>{} - Función a ejecutar cuando termine la operación
     * @return {Number} steps = 1 - Cantidad de pasos atras en la navegación que deseas ejecutar
     * @example
     * this.$Helpers.goBack(() => {}, 2);
     * @version 1.0.0
     */
    goBack(callback = () => {}, steps = 1) {
      window.onpopstate = () =>
        setTimeout(() => {
          window.onpopstate = null;
          callback();
        }, 0);
      window.history.go(-Math.abs(steps));
    },
  };
};

export default Helpers;

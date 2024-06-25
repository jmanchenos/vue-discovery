import axios from '../axios';
import retryAxios from '../axios/retry';
import { API_METHODS } from '@/utils/constants';

const { GET, POST, PUT, PATCH, DELETE } = API_METHODS;

// Retry: La configuración global que se desee sobrescribir puede pasarse como segundo parámetro.
const retry = retryAxios(axios);
// Sobrescribirmos la configuración global con la de cada método/verbo en la llamada que deseemos.
const getRetryConfig = (config = {}) => ({ ...retry.config, ...config });

/**
 * @namespace $APIService
 */

const multiCall = async (items = [{ url: '', method: GET, params: {}, retry: {} }]) => {
    /**
     * @memberof $APIService
     * @function multiCall
     * @description Recibe array de objetos que tendrán como atributos la url, método y parámetros de la llamada.
     *              necesidad de importar nada en ningún componente ni formulario.
     *              Se requiren dos parámetros de entrada. Un array con las rules del componente a validar y el valor a validar en la regla.
     *
     * @param {array}  reglas   - Reglas de los componentes a validar(por ejemplo: required, fecha no puede ser mayor que la fecha del sistema, etc).
     * @param {string} value    - Valor a validar en la regla.
     * @example
     * componentRules() {
     *   const ruleObligatorio = this.required ? [val => !!val || `El campo ${this.label} es obligatorio`] : [];
     *   const rules = [...ruleObligatorio, ...this.rules]
     *   return [...rules];
     * },
     * this.$Validate.validateRulesComponent(this.componentRules,value)
     * @version 1.0.0
     */
    const defaultMethod = GET;
    const defaultParams = {};
    const defaultRetryConfig = {};
    const defaultUrl = '';
    const calls = [];
    const results = {
        ok: [],
        errors: [],
    };
    items.forEach(item => {
        calls.push(
            new Promise(resolve => {
                const callMethod = item.method || defaultMethod;
                const callParams = item.params || defaultParams;
                const callRetryConfig = item.retry || defaultRetryConfig;
                const callUrl = item.url || defaultUrl;
                this[callMethod](callUrl, { ...callParams }, getRetryConfig(callRetryConfig))
                    .then(response => {
                        results.ok.push({ response, item });
                        resolve();
                    })
                    .catch(error => {
                        results.errors.push({ error, item });
                        resolve();
                    });
            })
        );
    });
    await Promise.all(calls);
    return results;
};

const apiService = {
    install(Vue) {
        const vueLocal = Vue;
        vueLocal.prototype.$APIService = {
            get: (resource, params = {}, retryConfig = {}) =>
                axios({
                    url: resource,
                    params,
                    // Aplica a todos los métodos/verbos:
                    // Si deseamos sobrescribir parámetros solo para el verbo:
                    // EJ:
                    // getRetryConfig({retries: 1, backoffType: 'linear', ...retryConfig}),
                    retry: getRetryConfig(retryConfig),
                    method: GET,
                }),
            post: (resource, params = {}, retryConfig = {}) =>
                axios({
                    url: resource,
                    data: params,
                    retry: getRetryConfig(retryConfig),
                    method: POST,
                }),
            put: (resource, params = {}, retryConfig = {}) =>
                axios({
                    url: resource,
                    data: params,
                    retry: getRetryConfig(retryConfig),
                    method: PUT,
                }),
            patch: (resource, params = {}, retryConfig = {}) =>
                axios({
                    url: resource,
                    data: params,
                    retry: getRetryConfig(retryConfig),
                    method: PATCH,
                }),
            delete: (resource, params = {}, retryConfig = {}) =>
                axios({
                    url: resource,
                    data: params,
                    retry: getRetryConfig(retryConfig),
                    method: DELETE,
                }),
            async getList(resource, params = {}, FormClass, retryConfig = {}) {
                const res = await axios({
                    url: resource,
                    params,
                    retry: getRetryConfig(retryConfig),
                    method: GET,
                });
                const data = res.data || res;

                let resForm = {};
                let filas = [];
                if (data._embedded && FormClass) {
                    data._embedded.forEach(item => {
                        filas.push(new FormClass(item));
                    });
                } else if (data._embedded) {
                    filas = data._embedded;
                } else if (data.content && FormClass) {
                    data.content.forEach(item => {
                        filas.push(new FormClass(item));
                    });
                } else if (data.content) {
                    filas = data.content;
                }

                resForm._embedded = filas;
                resForm._links = data._links;
                resForm._hint = data._hint;

                resForm.total = data.total || filas.length;
                resForm.currentPage = data.currentPage || '1';
                resForm.pages = data.pages || '1';
                resForm.maxRows = data.maxRows || '20';
                resForm.from = data.from || '1';
                resForm.to = data.to || filas.length;
                resForm.nextPage = data.nextPage || '1';
                resForm.first = data.first || '1';
                resForm.last = data.last || filas.length;

                return { data: resForm };
            },
            raw(config) {
                return axios(config);
            },
            multiCall: item => multiCall(item),
        };
    },
};

export default apiService;

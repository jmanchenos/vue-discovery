import https from 'https';
import axios from 'axios';
import Qs from 'qs';
import { LowUp } from 'lowup';
import helperAxios from '@/plugins/axios/helper';
import caCert from '@/plugins/axios/justicia-es-chain.pem';
// Full config:  https://github.com/axios/axios#request-config

// const instance = axios.create({
//     baseURL: 'https://desagateway.justicia.es',
//     // http://localhost:8080/mtm-core-uaa: 'http://localhost:8082',
// });

/**
 * @namespace Axios
 */
const httpsAgent = new https.Agent({ ca: caCert });
const instance = axios.create({
  httpsAgent,
  withCredentials: true,
}); // timeout para errores timeout

// la url base es la por defecto ya que los recusros de front(html, js, css) pasan a ser un servicio de back {entorno}/mtm-front-iu/
if (process.env.NODE_ENV !== 'production') {
  let baseUrl = 'https://desagateway.justicia.es';
  if (JSON.parse(process.env.VUE_APP_DESAINT)) baseUrl = 'https://desaintgateway.justicia.es';
  instance.defaults.baseURL = baseUrl;
}
helperAxios.setAuth(instance);

const isValidXss = url => {
  const xssRegex = /(\b)(on\w+)=|javascript|(<\s*)(\/*)script/gi;
  return xssRegex.test(url);
};

const configureRequest = config => {
  /**
   * @memberof Axios
   * @function configureRequest(interceptor-request)
   * @description  En axios, antes de realizar la petición http desde axios configura la request, como pasar todos los caractereres a mayúsculas.
   * @param {Object} config       - Objeto con la informacion para realizar la petición(url, params,etc)
   * @example
   *         axios.put(resource, params);
   * @version 1.0.0
   */
  const { url } = config;
  // eslint-disable-next-line no-param-reassign
  config.paramsSerializer = params => {
    // Qs is already included in the Axios package
    const uri = encodeURI(
      Qs.stringify(params, {
        allowDots: true,
        encode: false,
      })
    );
    return uri;
  };
  const innerConfig = config;

  // eliminamos credenciales para el servidor local
  if (innerConfig?.url.includes('localhost')) {
    innerConfig.withCredentials = false;
  }

  // Convertimos en mayúsculas.
  if (innerConfig && innerConfig.data && !innerConfig?.url.includes('localhost')) {
    // Filtramos para que las llamadas con tipo FormData (como el login) no sean convertidos
    const dataParser =
      innerConfig.data && typeof innerConfig.data === 'string'
        ? JSON.parse(innerConfig.data)
        : innerConfig.data;
    innerConfig.data = LowUp.up(dataParser, el => el instanceof FormData);
  }
  if (isValidXss(url))
    throw new Error(`URL contains XSS injection attempt at resolveURL\nURL: ${url}`);

  return innerConfig;
};

instance.interceptors.request.use(
  // Do something before request is sent
  config => configureRequest(config),
  // Do something with request error
  error => Promise.reject(error)
);
// Add a response interceptor
instance.interceptors.response.use(
  /**
   * @memberof Axios
   * @function interceptor-Response
   * @description  En axios, recoge la response de la peticion http
   * @param {Object} response       - Objeto respuesta petición http
   * @example
   *         En cada servicio la respuesta al ser customizable, no hay una estructura predefinida.
   * @version 1.0.0
   */
  // Do something with response data
  response => response,
  error => {
    const failed = error;
    // Si el responseType es del tipo arraybuffer debemos transformar el error nuevamente en formato JSON
    if (error.request?.responseType === 'arraybuffer' && error.response) {
      const data = Buffer.from(error.response.data).toString('utf8');
      try {
        // Como no sabemos con seguridad si algún servicio devuelve un Json, dejamos lo que había anteriormente pero
        // añadimos el mensaje de error en caso de que no lo sea.
        failed.response.data = JSON.parse(data);
      } catch (e) {
        failed.message = data;
      }
    }
    const errorMessage = failed.message?.includes?.('Network Error')
      ? 'No hay red. Por favor, contacte con su administrador o Centro de Atención a Usuarios (CAU).'
      : failed.message;
    failed.message = errorMessage;
    return Promise.reject(failed);
  }
);

export default instance;

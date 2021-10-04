export default class {
  /**
   * @memberof Axios
   * @function setAuth
   * @description  Recupera el token al realizar cada petición http.
   * @param {Object} instance       - Objeto de la instancia de axios (obtenido de la funcionalidad axios.create())
   * @example
   *         instance = axios.create();
   *         setAuth(instance);
   * @version 1.0.0
   */
  static setAuth(instance) {
    const innerInstance = instance;
    const auth = JSON.parse(localStorage.getItem('mtm-auth'));
    if (auth) {
      const { token_type: tokenType, access_token: accessToken } = auth;
      innerInstance.defaults.headers.common.Authorization = `${tokenType} ${accessToken}`;
    }
    return innerInstance;
  }
}

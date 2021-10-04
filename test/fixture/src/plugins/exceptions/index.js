import { addExceptionHandler, EXCEPTIONS } from '@/utils/exception';
/**
 * @namespace $Exceptions
 */

const exceptionHandler = function(error) {
  if (!error?.config?.handle) addExceptionHandler(error, EXCEPTIONS.NOT_FOUND);
  return error?.config?.handle(this, error);
};

const Exceptions = {
  /**
   * @memberof $Exceptions
   * @function backend
   * @description  Por parte de Backend, nos puede traer el mensaje error de la petición http en varios atributos.
   *               Por lo que esta función realiza la búsqueda del atributo donde viene informado el error para
   *               tu posterior tratamiento.
   * @param {Object} error       - Objeto respuesta error de la petición http realizada.
   * @example
   *      try {
   * } catch (err) {
   *      this.$Exceptions(err);
   * }
   * @version 1.0.0
   */
  install(Vue) {
    const vueLocal = Vue;
    vueLocal.prototype.$Exceptions = exceptionHandler;
  },
};

export { Exceptions as default, exceptionHandler };

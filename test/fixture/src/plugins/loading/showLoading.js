import { Loading } from 'quasar';

/* 
  Método que se usa para mostra el Notify de Quasar
  Caso 1: showLoading() usado desde el Mixin
  Caso 2: showLoading() usado desde fuera de Vue (importado como una librería independiente)
*/
const showLoading = (status, message, spinnerSize, spinnerColor, messageColor, backgroundColor) => {
    /**
     * @memberof $Loading
     * @function showLoading
     * @description  Prototype que lanza el loading(spinner) en pantalla. Esta función tiene dos funcionalidades;
     *              - Mostrar Loading
     *              - Ocultar Loading
     * @param {string} message           - Mensaje a mostrar por pantalla en el loading.
     * @param {string} spinnerSize       - Tamaño del loading. Por defecto 60px.
     * @param {string} spinnerColor      - Color del loading. Por defecto blanco
     * @param {string} messageColor      - Color letras mensaje. Por defecto blanco
     * @param {string} backgroundColor   - Color de fondo del loding. Por defecto negro
     * @example
     *        Mostrar Loading --> this.$Loading.show(this.i18n.createEntidad);
     *        Ocultar Loading --> this.$Loading.hide();
     * @version 1.0.0
     */
    Loading[status ? 'show' : 'hide']({
        message: message || '',
        spinnerSize: spinnerSize || 60,
        spinnerColor: spinnerColor || 'white',
        messageColor: messageColor || 'white',
        backgroundColor: backgroundColor || 'black',
    });
};

/*
  Métodos para usar desde fuera del Mixin
*/
const $Loading = {
    show: message => {
        showLoading(true, message);
    },
    hide: () => {
        showLoading(false);
    },
};

export default $Loading;

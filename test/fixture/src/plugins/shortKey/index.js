function callback(keypress) {
    const { key: keypressKey, ctrlKey: keypressCtrl, shiftKey: keypressShift, altKey: keypressAlt } = keypress;
    const hasOnlyKey = this.filter(item => {
        const key = (item?.key?.key || '').toLocaleLowerCase();
        const onlyKey = item?.key?.onlyKey || false;
        return onlyKey && keypressKey?.toLocaleLowerCase() === key;
    });
    if (keypressCtrl || keypressShift || keypressAlt || hasOnlyKey) {
        const trigger = this.filter(shortkey => {
            const { key } = shortkey;
            const { key: shortkeysKey, ctrlKey: shortkeysCtrl, shiftKey: shortkeysShift, altKey: shortkeysAlt } = key;
            return keypressKey?.toLocaleLowerCase() === (shortkeysKey.toLocaleLowerCase() || '') &&
                keypressCtrl === (shortkeysCtrl || false) &&
                keypressShift === (shortkeysShift || false) &&
                keypressAlt === (shortkeysAlt || false)
                ? shortkey
                : false;
        });
        if (trigger.length === 1 && typeof trigger[0].callback !== 'undefined') {
            trigger[0].callback();
        }
    }
}
/**
 * @namespace $Shortkey
 * @description Permite definir acceso directo a los métodos mediante combinaciones de teclado.
 * @param {Array} configShortkey='[]'                    - Configuración de shortkeys
 * @param {Object} configShortkey.key='{}'               - Objeto con la configuración de las teclas
 * @param {String} configShortkey.key.key=''             - Letra
 * @param {Boolean} configShortkey.key.ctrlKey='false'   - Usar tecla CTRL
 * @param {Boolean} configShortkey.key.shiftKey='false'  - Usar tecla SHIFT
 * @param {Boolean} configShortkey.key.altKey='false'    - Usar tecla ALT
 * @param {Boolean} configShortkey.key.onlyKey='false'   - Cambiar a true cuando usemos solo una tecla
 * @param {Function} configShortkey.callback=''          - Función que ejecuta con la combinación de teclas
 * @example
 * data() {
 *    return {
 *      configShortkey: [{
 *        key: {
 *          key: 'c',
 *          altKey: true,
 *        },
 *        callback: this.method
 *      }, {
 *        key: {
 *          key: 'a',
 *          altKey: true,
 *          ctrlKey: true,
 *        },
 *        callback: this.method
 *      }, {
 *        key: {
 *          key: 'Escape',
 *          onlyKey: true,
 *        },
 *        callback: this.method,
 *      }]
 *    };
 * }
 * Se puede usar donde se necesite, ya sea en un hook del ciclo de vida o cuando se ejecute un método
 * mounted() {
 *    // Siempre debemos usar antes el método removeShortkey() para eliminar cualquier rastro de los shortkey anteriores
 *    this.$Shortkey.removeShortkey();
 *    this.$Shortkey.initShortkey(configShortkey);
 * }
 * @version 1.0.0
 */
const Shortkey = {
    install(Vue) {
        const vueLocal = Vue;
        let $callback;
        vueLocal.prototype.$ShortKey = {
            /**
             * @namespace initShortkey
             * @description Añade shortkeys a la pantalla actual
             * @property {Object}           shortkeys={}            - Objeto con la configuración de las teclas
             * @example
             * this.$ShortKey.initShortkey([{
             *   key: {
             *     key: this.$UTILS_SHORTKEYS.KEYS.A,
             *     altKey: true,
             *   },
             *   callback: payload.accept,
             * }]);
             */
            initShortkey: shortkeys => {
                $callback = callback.bind(shortkeys);
                window.addEventListener('keydown', $callback);
            },
            /**
             * @namespace removeShortkey
             * @description Elimina los shortkeys en la pantalla actual
             * @property {Object}           newCallback=null         - Objeto con la referencia a la configuración de las teclas
             * @example
             * // Si añadimos en la página 'this.$ShortKey.initShortkey({})'
             * this.$ShortKey.removeShortkey();
             * 'o'
             * // Si no añadimos en la página 'this.$ShortKey.initShortkey({})'
             * this.$ShortKey.removeShortKey(this.$ShortKey.getCallback());
             */
            removeShortkey: (newCallback = null) => {
                window.removeEventListener('keydown', newCallback || $callback);
            },
            /**
             * @namespace getCallback
             * @description Nos devuelve la referencia al callback que se
             * @return {Object}             return                  - Devuelve la referencia del callback con la confiración de las teclas
             * @example
             * // Nos devuelve la referencia actual
             * this.$ShortKey.getCallback();
             */
            getCallback: () => $callback,
        };
    },
};

export default Shortkey;

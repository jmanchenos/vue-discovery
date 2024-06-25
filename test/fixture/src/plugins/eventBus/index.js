/**
 * @namespace $EventBus
 * @description  Realiza nueva instancia de vue para comunicarse entre componentes. La comunicación entre componentes se hará de la siguiente manera;
 *              $EventBus.$emit() --> emite el valor que se quiera compartir con otro/s componente/s.
 *              $EventBus.$on()   --> recibe  el valor del componente que ha emitido el valor.
 *              $EventBus.$off()  --> cierra la escucha de la emision del evento.
 *
 * @example
 *              this.$EventBus.$emit('showTopMenu', true);
 *              this.$EventBus.$off('showTopMenu');
 *              this.$EventBus.$on('showTopMenu', this.changeShowMenu);
 * @version 1.0.0
 */

const EB = {};

EB.install = Vue => {
    const vueLocal = Vue;
    vueLocal.prototype.$EventBus = new Vue();
};

export default EB;

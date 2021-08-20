<template>
  <sg-modal ref="modalConfirm" v-model="dialog" mode="small" :border-on-actions="false" persistent>
    <template #body>
      <slot name="body">
        <div class="flex full-width inline items-center flex-no-wrap">
          <sg-avatar
            :icon="icon"
            :color="color"
            text-color="white"
            ref="SgAvatar"
            class="q-mx-md"
          />
          <p class="q-ma-none" v-html="iMessage" />
        </div>
      </slot>
      <div
        class="flex full-width inline items-center flex-no-wrap q-pl-md q-pt-lg"
        v-if="showSubBody"
      >
        <slot name="subbody"></slot>
      </div>
    </template>
    <template #actions>
      <slot name="actions">
        <div class="full-width row q-col-gutter-sm justify-end">
          <div class="col-2">
            <sg-button
              :ref="dataCyAceptar"
              color="positive"
              v-close-popup
              @click="accept"
              :index-underlined="0"
              :label="$t('generic.yes')"
              :full-width="true"
            />
          </div>
          <div class="col-2">
            <sg-button
              :ref="dataCyCancelar"
              color="negative"
              v-close-popup
              @click="cancel"
              :index-underlined="0"
              :label="$t('generic.no')"
              :full-width="true"
            />
          </div>
        </div>
      </slot>
    </template>
  </sg-modal>
</template>

<script>
import SgButton from './Button.vue';
import SgAvatar from './Avatar.vue';
import SgModal from './Modal.vue';

export default {
  /**
   * @namespace SgConfirm
   * @property {object}           config='{}'                   - Aplica configuración para sgConfirm
   * @property {string}           icon='icon-pregunta'          - Icono para el componente
   * @property {boolean}          value=false                   - Muestra / oculta el componente
   * @property {string}           message='NO_MESSAGE_FOUND'    - Mensaje que se añade dentro del componente
   * @property {string}           color='light-blue-6'          - Color del avatar
   * @example
   * <sg-confirm
   *  :config="configPruebaSgConfirm"
   *  v-model="modelo"
   *  message="Mensaje input"
   *  icon="icon-check"
   * />
   * @version 1.0.0
   */
  /**
   * Se emite cuando el modelo de la modal cambia
   * @event SgConfirm#input
   * @param {boolean} value - Visibilidad de la modal
   */
  /**
   * Se emite cuando la modal se va a mostrar
   * @event SgConfirm#show-confirm
   * @param {object} payload - Objeto que contiene los metodos de aceptar y cancelar de la modal
   */
  /**
   * Se emite cuando la modal se va a ocultar
   * @event SgConfirm#hide-confirm
   */
  /**
   * Se emite al ejecutar el metodo cancel
   * @event SgConfirm#cancel
   */
  /**
   * Se emite al ejecutar el metodo accept
   * @event SgConfirm#accept
   */
  name: 'SgConfirm',
  components: {
    SgButton,
    SgAvatar,
    SgModal,
  },
  props: {
    config: {
      type: Object,
      required: false,
    },
    icon: {
      type: String,
      required: false,
      default: 'icon-pregunta',
    },
    value: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      default: 'NO_MESSAGE_FOUND',
    },
    color: {
      type: String,
      default: 'light-blue-6',
    },
  },
  data() {
    return {
      showSubBody: false,
    };
  },
  mounted() {
    this.checkSlot();
  },
  computed: {
    dialog: {
      get() {
        return this.config?.dialog || this.value;
      },
      set(value) {
        this.$emit('input', value);
      },
    },
    iMessage() {
      return this.config?.message || this.message;
    },
    dataCyAceptar() {
      return this.$vnode.data.ref ? `${this.$vnode.data.ref}Aceptar` : 'accept';
    },
    dataCyCancelar() {
      return this.$vnode.data.ref ? `${this.$vnode.data.ref}Cancelar` : 'cancel';
    },
  },
  watch: {
    'config.dialog': {
      immediate: true,
      handler(val) {
        this.eventType(val);
      },
    },
  },
  methods: {
    /**
     * Comprueba si se ha definido un slot fuera del componente y muestra / oculta el contenido
     * @memberof SgConfirm
     * @method checkSlot
     */

    checkSlot() {
      this.showSubBody = Object.keys(this.$scopedSlots).includes('subbody');
    },
    /**
     * Emite un evento u otro en funcion del status recibido
     * @memberof SgConfirm
     * @method eventType
     * @param {boolean} status - Estado del confirm: true (se abre) / false (se cierra)
     */
    eventType(status) {
      const payload = {
        accept: this.accept,
        cancel: this.cancel,
      };
      this.$emit(`${status ? 'show' : 'hide'}-confirm`, status ? payload : null);
    },
    /**
     * Cierra la modal y emite el evento cancel
     * @memberof SgConfirm
     * @method cancel
     */
    cancel() {
      this.dialog = false;
      this.eventType(false);
      this.$emit('cancel');
    },
    /**
     * Cierra la modal y emite el evento accept
     * @memberof SgConfirm
     * @method accept
     */
    accept() {
      this.dialog = false;
      this.eventType(false);
      this.$emit('accept');
    },
  },
};
</script>
<style lang="scss" scoped>
.flex-no-wrap {
  flex-wrap: nowrap;
}
</style>

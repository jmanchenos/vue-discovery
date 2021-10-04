import Vue from 'vue';
import VueI18n from 'vue-i18n';
import messages from './messages';

Vue.use(VueI18n);

/**
 * @namespace i18n
 * @description  Translate de las descripciones y literales de la aplicación.
 * @example
 *        :label1="i18n.numero"
 *        this.$Notification.info(this.i18n.createCargosOK, 'icon-info-circulo');
 * @version 1.0.0
 */

const i18n = new VueI18n({
  locale: 'en-es',
  fallbackLocale: 'es-es',
  formatFallbackMessages: true,
  silentTranslationWarn: true,
  messages,
});

export default i18n;

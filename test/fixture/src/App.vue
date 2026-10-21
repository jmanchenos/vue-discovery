<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />

  </div>
</template>

<script type="text/javascript">
import { ref, onMounted } from 'vue';
export default {
  name: 'App',
  props: {
    pepe: {
      type: String,
      required: false,
    },
    jose: {
      type: Object,
      required: false,
    },
  },
  computed: {
    hola() {
      return 'hola';
    },
    adios() {
      return { key1: 'esto', key2: 'es', key3: 'una', key4: 'prueba' };
    },
  },
  setup() {
    const i18n = {
      title: this.$t('viewsTitles.viewsTitlesBajaAsuntos'),
      close: this.$t('generic.close'),
      funcion: item => this.$t('generic.funcion', { item }),
      funcion2: (alfa, beta) => this.$t('generic.funcion', { alfa, beta }),
    };
    const state = ref({
      i18n,
      form: { label: 'esto es el label', value: 'esto es el value' },
      prueba: 'Hola',
    });
  },
  methods: {
    /**
     *  Metodo de setup
     * que realiza un monton de cosas
     * @returns {String} salida
     */
    setup() {
      return;
    },
    load() {},
  },
};
</script>

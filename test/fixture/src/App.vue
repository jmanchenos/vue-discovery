<template>
    <div id="app">
        <img alt="Vue logo" src="./assets/logo.png" />
    </div>
</template>

<script type="text/javascript">
export default {
    name: 'App',
    props: {
        pepe: {
            type: String,
            required: false,
        },
    },
    computed:{
        hola(){
            return 'hola'
        },
    },
    data() {
        const i18n = {
            title: this.$t('viewsTitles.viewsTitlesBajaAsuntos'),
            close: this.$t('generic.close'),
        };
        return {
            i18n,
            form: {},
            prueba:  'Hola',
        };
    },
    methods: {
        /**
        *  Metodo de setup
        * que realiza un montón de cosas
        * @param {String} arg1
        * @returns {String} salida
        */
        setup(){
            this.
            return;
        },
        load(){

        }
    }
};
</script>

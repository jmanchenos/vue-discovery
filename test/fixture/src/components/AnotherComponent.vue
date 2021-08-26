<template>
    <div></div>
    </template>

    <script>
import mixinUsingMixin from '@/mixins/mixinUsingMixin';
export default {
    /**
     * @example
     * <another-component-name
     *   :value='hola'
     * />
     **/
    mixins: [mixinUsingMixin],
    name: 'AnotherComponentName',
    props: {
        /* Es un ejemplo de descripcion*/
        value: {
            type: [String, Array],
            required: false,
            default: 'Pepe'
        },
    },
};
</script>

    <style> </style>

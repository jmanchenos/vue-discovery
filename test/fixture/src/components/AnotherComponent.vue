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
        value: {
            type: String,
            required: false,
            value: '',
        },
    },
};
</script>

    <style> </style>

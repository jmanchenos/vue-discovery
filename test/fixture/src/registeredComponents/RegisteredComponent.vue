<template>
    <div></div>
</template>

    <script>
import mixinUsingMixin from '@/mixins/mixinUsingMixin';
import { ref, onMounted } from 'vue';
export default {
    mixins: [mixinUsingMixin],
    name: 'RegisteredComponentName',
    props: {
        value: {
            type: String,
            required: false,
            default: '',
        },
        anotherValue: {
            type: String,
            required: true,
            value: 'defaultValue',
        },
        theLastOne: 'Boolean',
    },
};
</script>

<style > </style>

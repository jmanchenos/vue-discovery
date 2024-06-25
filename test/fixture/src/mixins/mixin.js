export default {
    props: {
        name: {
            type: String,
            required: true,
            default: 'Ejemplo valor por defecto',
        },
    },
    mounted() {
        this.$emit('eventInMixin');
    },
};

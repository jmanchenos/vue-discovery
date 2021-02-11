import mixin from '@/mixins/mixin';
export default {
    mixins: [mixin],
    props: {
        names: {
            type: Array,
            required: true,
        },
    },
    created() {
        this.$emit('eventInSubMixin');
    },
};

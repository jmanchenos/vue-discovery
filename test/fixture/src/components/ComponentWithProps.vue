<template>
  <div></div>
</template>

<script>
import mixinUsingMixin from '@/mixins/mixinUsingMixin';
import { ref, onMounted } from 'vue';
export default {
  mixins: [mixinUsingMixin],
  name: 'ComponentWithPropsName',
  props: {
    label: {
      type: String,
      required: false,
      value: '',
    },
    defaultValue: {
      type: String,
      required: true,
      value: '',
    },
  },
  created() {
    this.$emit('eventInComponent');
  },
};
</script>

<style></style>

<template>
    <div id="app">
        <img alt="Vue logo" src="./assets/logo.png">
<another-component-name :name="" :names=""></another-component-name>
    </div>
</template>

<script>
import another-component-name from '@/components/AnotherComponent.vue'
export default {
    components: {
        'another-component-name': AnotherComponentName,
    },
    name: 'App',
};
</script>

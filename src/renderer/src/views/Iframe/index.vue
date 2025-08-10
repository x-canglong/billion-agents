<template>
  <div class="iframe-container">
    <iframe :src="url" width="100%" height="100%"></iframe>
  </div>
</template>

<script setup>
const route = useRoute()
const url = computed(() => {
  return decodeURIComponent(route.query.url)
})
</script>
<style lang="stylus" scoped>
.iframe-container
  width: 100%
  height: 100%
  iframe
    border none
</style>

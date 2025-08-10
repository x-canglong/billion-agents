<template>
  <div class="introduction" :class="[align, background]">
    <div class="introduction-logo-container" v-if="logoImg || title">
      <img v-if="logoImg" :src="logoImg" :alt="title" />
      <div class="introduction-title">{{ title }}</div>
    </div>
    <div v-if="subTitle" class="introduction-sub-title">
      <Typewriter
        :content="subTitle"
        :typing="{
          step: 2,
          interval: 45
        }"
        :is-fog="{
          bgColor: '#fff'
        }"
      />
    </div>
    <div v-if="description.length" class="introduction-description">
      <div v-for="(item, index) in description" :key="index">{{ item }}</div>
    </div>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  logoImg: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  subTitle: {
    type: String,
    default: ''
  },
  description: {
    type: Array,
    default: () => []
  },
  background: {
    type: String,
    default: 'transparent'
  },
  align: {
    type: String,
    default: 'center'
  }
})
</script>

<style scoped lang="stylus">
.introduction
  display flex
  gap 12px
  flex-direction column
  font-family PingFang SC
  color #252b3a
  margin-top 20%
  .introduction-logo-container
    display flex
    align-items center
    gap 8px

    .introduction-title
      font-weight 700
      font-size 40px
      letter-spacing 1px

  .introduction-sub-title
    font-weight 500
    font-size 18px
    color #333333
  .introduction-description
    font-size 14px

    & > div
      line-height 2

  &.filled
    background-color #f6f6f8
    border-radius 8px
    padding 8px 12px

  &.center
    align-items center
    .introduction-description
      text-align center

  &.left
    align-items flex-start
    .introduction-description
      text-align left

  &.right
    align-items flex-end
    .introduction-description
      text-align right
</style>

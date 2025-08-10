<template>
  <div class="login-container">
    <div class="login-logo">
      <div class="logo"></div>
    </div>
    <div class="login-box-wrapper table-wrap">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { getLocale } from '@/locales'
const language = computed(() => getLocale())
</script>
<style lang='stylus' scoped>
.login-container
  width 100vw
  height 100vh
  background-image url("imgs/login-bg.png")
  background-size: 100% 100%
  background-repeat: no-repeat
  background-position: 20% center
  box-sizing border-box
  position relative
  user-select none
  .login-logo
    width 333px
    height 52px
    position absolute
    left 67px
    top 51px
    background url("imgs/logo-en.png") no-repeat center/cover
  .login-box-wrapper
    position absolute
    top 50%
    right 20vw
    transform translateY(-50%)
    width: 482px
    background: #FFFFFF;
    box-shadow: 0px 23px 59px 0px rgba(145,162,177,0.3);
    border: 5px solid #FFFFFF
    padding-bottom 36px
@media (max-width: 900px)
  .login-logo
    zoom 0.6
    left 50px
    top 40px
  .login-box-wrapper
    zoom 0.8
</style>
<template>
  <div class="code-block" :class="themeClass">
    <div class="code-block-header" v-if="!$slots.header">
      <span class="code-lang">{{ language }}</span>
      <slot name="actions">
        <div class="code-block-actions">
          <div class="action-btn toggle-btn" @click="toggleExpand">
            <img src="./asset/all-collapse.svg" />
          </div>
          <div class="action-btn copy-btn" @click="copyCode">
            <img v-if="!copied" src="./asset/copy-new.svg" />
            <img v-else src="./asset/right.svg">
          </div>
        </div>
      </slot>
    </div>
    <slot name="header" v-else></slot>
    <Transition
    name="collapse-transition"
    @beforeEnter="beforeEnter"
    @enter="enter"
    @afterEnter="afterEnter"
    @beforeLeave="beforeLeave"
    @leave="leave"
    @afterLeave="afterLeave"
    >
      <div v-if="expanded">
        <pre v-if="!$slots.content"><code :class="`hljs language-${language}`" v-html="highlightedCode"></code></pre>
        <slot v-else name="content"></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import hljs from 'highlight.js';
import { debounce } from 'lodash';
import { MDCardService } from './MDCardService';

const props = defineProps({
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: ''
  },
  blockIndex: {
    type: Number,
    required: true
  },
  theme: {
    type: String,
    default: 'light'
  }
});

const mdCardService = new MDCardService();

const expanded = ref(true);
const copied = ref(false);

const highlightedCode = computed(() => {
  if (props.language && hljs.getLanguage(props.language)) {
    try {
      return hljs.highlight(props.code, { language: props.language }).value;
    } catch (_) {}
  }
  return mdCardService.filterHtml(props.code);
});

const toggleExpand = () => {
  expanded.value = !expanded.value;
};

const copyCode = debounce((e) => {
  const target = e.target;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(props.code);
  } else {
    const textarea = document.createElement('textarea');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.zIndex = '-1';
    textarea.value = props.code;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  target.classList.remove('icon-copy-new');
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1500);
}, 300);

const beforeEnter = (el) => {
  if (!el.dataset) {
    el.dataset = {};
  }
  if (el.style.height) {
    el.dataset.height = el.style.height;
  }
  el.style.maxHeight = 0;
};
const enter = (el) => {
  requestAnimationFrame(() => {
    el.dataset.oldOverflow = el.style.overflow;
    if (el.dataset.height) {
      el.style.maxHeight = el.dataset.height;
    } else if (el.scrollHeight !== 0) {
      el.style.maxHeight = `${el.scrollHeight}px`;
    } else {
      el.style.maxHeight = 0;
    }
    el.style.overflow = 'hidden';
  });
};
const afterEnter = (el) => {
  el.style.maxHeight = '';
  el.style.overflow = el.dataset.oldOverflow;
};
const beforeLeave = (el) => {
  if (!el.dataset) {
    el.dataset = {};
  }
  el.dataset.oldOverflow = el.style.overflow;
  el.style.maxHeight = `${el.scrollHeight}px`;
  el.style.overflow = 'hidden';
};
const leave = (el) => {
  if (el.scrollHeight !== 0) {
    el.style.maxHeight = 0;
  }
};
const afterLeave = (el) => {
  el.style.maxHeight = '';
  el.style.overflow = el.dataset.oldOverflow;
};

const themeClass = computed(() => {
  // return props.theme === 'dark' ? 'code-block-dark' : 'code-block-light';
  return 'code-block-dark';
});
</script>

<style scoped lang="stylus">
.v-enter-active,
.v-leave-active
  transition opacity 0.5s ease

.v-enter-from,
.v-leave-to
  opacity 0

.code-block
  margin 1rem 0
  overflow hidden
  border-radius 14px

  pre
    margin 0

  .action-btn
    width 24px
    height 24px

  .code-block-header
    display flex
    justify-content space-between
    align-items center
    padding 0.5rem 1rem
    .code-lang
      font-size 14px

  .code-block-actions
    display flex
    align-items center
    .copy-btn,
    .toggle-btn
      cursor pointer
      border-radius 4px
      font-size 18px
      padding 4px

.code-block-light
  border 1px solid #d7d8da
  code.hljs
    padding 1em
  background-color #f5f5f5
  .code-lang
    color #252b3a
  .code-block-actions
    .copy-btn,
    .toggle-btn
      color #252b3a
      &:hover
        background-color #EBEBEB

.code-block-dark
  border 1px solid #4e5057
  code.hljs
    padding 1em
  background-color #34363A
  .code-lang
    color #CED1DB
  .code-block-actions
    .copy-btn,
    .toggle-btn
      color #CED1DB
      &:hover
        background-color #393a3e
      img
        filter brightness(1.5)

.collapse-transition
  &-enter-from,
  &-leave-to
    opacity 0

  &-enter-to,
  &-leave-from
    opacity 1

  &-enter-active,
  &-leave-active
    transition max-height 0.3s cubic-bezier(0.5, 0.05, 0.5, 0.95), opacity 0.3s cubic-bezier(0.5, 0.05, 0.5, 0.95)
</style>
<template>
  <div class="markdown-render" :class="themeClass">
      <component :is="markdownComponent" />
  </div>
  <div v-if="false">
      <slot name="actions"></slot>
      <slot name="header"></slot>
      <slot name="content"></slot>
  </div>
</template>

<script setup>
import hljs from 'highlight.js';
import markdownit from 'markdown-it';
import CodeBlock from './CodeBlock.vue';
import { MDCardService } from './MDCardService';
import { katex } from '@mdit/plugin-katex'
import markdownItMermaid from "@datatraccorporation/markdown-it-mermaid"
import PlantUml from 'markdown-it-plantuml';
import 'katex/dist/katex.min.css'

const mdCardService = new MDCardService();

const props = defineProps({
  content: {
    type: String,
    default: '',
  },

  enableThink: {
    type: Boolean,
    default: false,
  },

  thinkOptions: {
    customClass: {
      type: String,
      default: '',
    },
  },

  mdOptions: {
    type: Object,
    default: () => ({}),
  },

  mdPlugins: {
    type: Array,
    default: () => [
      {
        plugin: katex,
        opt: {
          inlineOpen: '$',
          inlineClose: '$',
          blockOpen: '$$',
          blockClose: '$$',
          katexOptions: {
            throwOnError: false,
            errorColor: '#cc0000',
            strict: 'warn',
            trust: false,
            macros: {
              '\\RR': '\\mathbb{R}',
              '\\NN': '\\mathbb{N}',
              '\\ZZ': '\\mathbb{Z}',
              '\\QQ': '\\mathbb{Q}',
              '\\CC': '\\mathbb{C}',
            },
            fleqn: false,
            leqno: false,
            minRuleThickness: 0.04,
          }
        }
      },
      {
        plugin: markdownItMermaid
      },
      {
        plugin: PlantUml,
        opts: {server: 'https://www.plantuml.com/plantuml'}
      },
    ],
  },

  customXssRules: {
    type: Array,
    default: () => [],
  },

  theme: {
    type: String,
    default: 'light',
  }
});

const emit = defineEmits(['afterMdtInit']);

const slots = useSlots();

const mdt = markdownit({
  breaks: true,
  linkify: true,
  html: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (_) {}
    }
    return '';
  },
  ...props.mdOptions,
});

mdt.renderer.rules.fence = (tokens, idx) => {
  return `<!----MC_MARKDOWN_CODE_BLOCK_${idx}---->`;
};

const createCodeBlock = (language, code, blockIndex) => {
  const codeBlockSlots = {
    actions: () =>
      slots.actions?.({
        codeBlockData: {
          code,
          language,
        },
      }),
  };
  if (slots.header) {
    codeBlockSlots.header = () =>
      slots.header?.({
        codeBlockData: {
          code,
          language,
        },
      });
  }
  if (slots.content) {
    codeBlockSlots.content = () =>
      slots.content?.({
        codeBlockData: {
          code,
          language,
        },
      });
  }
  return h(
    CodeBlock,
    {
      language,
      code,
      blockIndex,
      theme: props.theme,
    },
    codeBlockSlots,
  );
};

const markdownComponent = computed(() => {
  let content = processFormulas(props.content) || '';

  if (props.enableThink) {
    const thinkClass = props.thinkOptions?.customClass || 'think-block';
    content = content
        ?.replace('<think>', `<div class="${thinkClass}">`)
        .replace('</think>', '</div>') || '';
  }

  const tokens = mdt.parse(content, {});
  const html = mdt.render(content);

  return {
    name: 'MarkdownRenderer',
    render() {
      if (typeof document === 'undefined') {
        return;
      }
      const container = document.createElement('div');
      container.innerHTML = html;

      const vNodes = [];
      let lastIndex = 0;
      let match;
      const regex = /<!----MC_MARKDOWN_CODE_BLOCK_(\d+)---->/g;
      let codeBlockIndex = 0;

      while (true) {
        match = regex.exec(html);
        if (!match) break;
        if (match.index > lastIndex) {
          vNodes.push(
            h('div', {
              innerHTML: html.slice(lastIndex, match.index),
            }),
          );
        }
        const token = tokens[Number.parseInt(match[1])];
        const lang = token.info || '';
        const code = token.content;

        vNodes.push(createCodeBlock(lang, code, codeBlockIndex));
        codeBlockIndex++;
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < html.length) {
        vNodes.push(
          h('div', {
            innerHTML: html.slice(lastIndex),
          }),
        );
      }

      return h('div', vNodes);
    },
  };
});

watch(
  () => props.customXssRules,
  (rules) => {
    mdCardService.setCustomXssRules(rules);
  },
);

watch(
  () => props.mdPlugins,
  (plugins) => {
    mdCardService.setMdPlugins(plugins, mdt);
  },
  {
    immediate: true,
  },
);

const themeClass = computed(() => {
  return props.theme === 'dark'
    ? 'markdown-render-dark'
    : 'markdown-render-light';
});

onMounted(() => {
  emit('afterMdtInit', mdt);
});

defineExpose({
  mdt,
});
</script>

<style lang="stylus">
.markdown-render
  overflow-x auto
  h1
    font-size 24px
    font-weight 600
    margin-bottom 16px
  h2
    font-size 22px
    font-weight 600
    margin-bottom 12px
  h3
    font-size 20px
    font-weight 600
    margin-bottom 10px
  h4
    font-size 18px
    font-weight 600
    margin-bottom 8px
  h5
    font-size 16px
    font-weight 600
    margin-bottom 6px
  h6
    font-size 14px
    font-weight 600
    margin-bottom 4px
  p
    font-size 14px
    line-height 1.5
    margin-bottom 16px
  &.markdown-render-dark
    color #CED1DB
    table
      background-color #23242a
      border 1px solid #393a3e
      border-radius 8px
      box-shadow 0 2px 8px rgba(0,0,0,0.12)
      overflow hidden
      border-collapse collapse
    th, td
      border 1px solid #393a3e
      padding 12px 16px
      text-align left
      border-collapse collapse
    th
      background #18191f
      color #CED1DB
      font-weight 600
      border-bottom 2px solid #393a3e
    tr
      transition background 0.2s
    tr:nth-child(even)
      background #26272c
    tr:hover
      background #34363a

  &.markdown-render-light
    color #252b3a
    table
      background-color #fff
      border 1px solid #e5e6eb
      border-radius 8px
      box-shadow 0 2px 8px rgba(0,0,0,0.06)
      overflow hidden
      border-collapse collapse
    th, td
      border 1px solid #e5e6eb
      padding 12px 16px
      text-align left
      border-collapse collapse
    th
      background #e5e6eb
      color #252b3a
      font-weight 600
      border-bottom 2px solid #e5e6eb
    tr
      transition background 0.2s
    tr:nth-child(even)
      background #fafbfc
    tr:hover
      background #f0f6ff

:deep(.think-block)
  color #71757f
  border-left 1px solid #d7d8da
  padding-left 8px
  margin-bottom 1rem

// KaTeX 数学公式样式优化
.markdown-render
  // 通用数学公式样式
  :deep(.katex)
    font-size 1.1em
    
  :deep(.katex-display)
    margin 16px 0
    text-align center
    
  :deep(.katex-html)
    white-space nowrap
    
  // 浅色主题下的数学公式样式
  &.markdown-render-light
    :deep(.katex)
      color #252b3a
      
    :deep(.katex-display)
      background-color rgba(0, 0, 0, 0.02)
      border-radius 4px
      padding 12px
      
    :deep(.katex .base)
      color #252b3a
      
  // 深色主题下的数学公式样式  
  &.markdown-render-dark
    :deep(.katex)
      color #CED1DB
      
    :deep(.katex-display)
      background-color rgba(255, 255, 255, 0.05)
      border-radius 4px
      padding 12px
      
    :deep(.katex .base)
      color #CED1DB
      
    // 确保数学公式中的符号在深色主题下可见
    :deep(.katex .mord), 
    :deep(.katex .mop),
    :deep(.katex .mbin),
    :deep(.katex .mrel),
    :deep(.katex .mopen),
    :deep(.katex .mclose),
    :deep(.katex .mpunct)
      color #CED1DB !important
</style>
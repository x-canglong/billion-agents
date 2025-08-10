import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import IconResolver from 'unplugin-icons/resolver'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import inject from '@rollup/plugin-inject'

const env = {
  VITE_APP_BASE_URL: 'http://115.190.106.118:8886'
}
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    base: './',
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src'),
        imgs: resolve('src/renderer/src/assets/imgs')
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              return id
                .toString()
                .split('node_modules/')[1]
                .split('/')[0]
                .toString()
            }
          }
        }
      }
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_APP_BASE_URL,
          ws: true,
          changeOrigin: true,
          rewrite: (path) => {
            console.log(`API请求代理：${path} -> ${env.VITE_APP_BASE_URL}${path}`)
            return path
          }
        },
        '/socket.io': {
          target: env.VITE_APP_BASE_URL,
          ws: true,
          changeOrigin: true,
          rewrite: (path) => {
            console.log(`WebSocket代理：${path} -> ${env.VITE_APP_BASE_URL}${path}`)
            return path
          }
        }
      }
    },
    plugins: [
      vue(),
      UnoCSS(),
      AutoImport({
        imports: ['vue', 'vue-router', 'vue-i18n'],
        dirs: [
          './src/utils',
          './src/api',
          './src/composables',
          './src/constants',
          './src/store'
        ],
        resolvers: [ElementPlusResolver(), IconResolver({ prefix: 'Icon' })],
        dts: './src/auto-imports.d.ts'
      }),
      Components({
        dirs: ['./src/components/'],
        resolvers: [ElementPlusResolver({ importStyle: false })],
        dts: './src/components.d.ts'
      }),
      inject({
        _: 'lodash',
        dayjs: 'dayjs',
        Cookies: 'js-cookie',
        include: ['src/**/*.vue', 'src/**/*.js']
      })
    ]
  }
})

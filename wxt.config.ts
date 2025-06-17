import type { OutputOptions } from 'rollup'
import { defineConfig } from 'wxt'
import ViteConfig from './vite.config'

function getBuildOptions() {
  delete (ViteConfig.build!.rollupOptions!.output as OutputOptions)!.manualChunks
  return ViteConfig.build
}
export default defineConfig({
  srcDir: `src`,
  modulesDir: `src/modules`,
  manifest: ({ mode, browser }) => ({
    name: `MarkTwain`,
    icons: {
      256: mode === `development` ? `/mpmd/icon-256-gray.png` : `/mpmd/icon-256.png`,
    },
    permissions: [`storage`, `tabs`, `activeTab`, `sidePanel`, `contextMenus`],
    host_permissions: [
      `https://*.github.com/*`,
      `https://*.githubusercontent.com/*`,
      `https://*.gitee.com/*`,
      `https://*.weixin.qq.com/*`,
      // 微信公众号图片
      `https://*.qpic.cn/*`,
    ],
    web_accessible_resources: [
      {
        resources: [`*.png`, `*.svg`, `injected.js`],
        matches: [`<all_urls>`],
      },
    ],
    side_panel: browser === `chrome`
      ? {
          default_path: `sidepanel.html`,
        }
      : undefined,
    sidebar_action: browser === `firefox`
      ? {
          default_panel: `sidepanel.html`,
          default_icon: {
            256: `mpmd/icon-256.png`,
          },
          default_title: `MarkTwain -- publish everwhere!`,
          open_at_install: false,
        }
      : undefined,
    commands: {
      _execute_sidebar_action: {
        description: `Open MarkTwain Editor Side Panel`,
        suggested_key: {
          default: `Ctrl+Shift+Y`,
        },
      },
    },
  }),
  analysis: {
    open: true,
  },
  vite: () => ({
    ...ViteConfig,
    plugins: ViteConfig.plugins!.filter(plugin =>
      typeof plugin === `object`
      && plugin !== null
      && !(`name` in plugin && plugin.name === `vite-plugin-Radar`),
    ),
    build: getBuildOptions(),
    base: `/`,
  }),
})

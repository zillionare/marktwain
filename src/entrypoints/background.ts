import { browser, defineBackground } from '#imports'

export default defineBackground({
  type: `module`,
  main() {
    browser.runtime.onInstalled.addListener((detail) => {
      if (import.meta.env.COMMAND === `serve`) {
        browser.runtime.openOptionsPage()
        return
      }
      if (detail.reason === `install`) {
        browser.tabs.create({ url: `https://zillionare.github.io/marktwain` })
      }
      else if (detail.reason === `update`) {
        browser.runtime.openOptionsPage()
      }
    })

    browser.runtime.onInstalled.addListener(() => {
      // Chrome/Edge side panel support
      if (typeof browser.sidePanel !== `undefined`) {
        browser.contextMenus.create({
          id: `openSidePanel`,
          title: `MarkTwain`,
          documentUrlPatterns: [`https://mp.weixin.qq.com/cgi-bin/appmsg*`],
          contexts: [`all`],
        })
      }
      // Firefox sidebar support
      else if (typeof browser.sidebarAction !== `undefined`) {
        browser.contextMenus.create({
          id: `openSidebar`,
          title: `MarkTwain`,
          documentUrlPatterns: [`https://mp.weixin.qq.com/cgi-bin/appmsg*`],
          contexts: [`all`],
        })
      }
    })

    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === `openSidePanel`) {
        browser.sidePanel.open({ tabId: tab!.id! })
      }
      else if (info.menuItemId === `openSidebar`) {
        // Firefox sidebar - toggle open/close
        browser.sidebarAction.toggle()
      }
    })
  },
})

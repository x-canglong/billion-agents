import { filterXSS, getDefaultCSSWhiteList, getDefaultWhiteList } from 'xss'

export class MDCardService {
  xssWhiteList = getDefaultWhiteList()
  cssWhiteList = getDefaultCSSWhiteList()

  constructor() {
    this.setDefaultXss()
  }

  setDefaultXss() {
    this.xssWhiteList['input'] = ['type', 'checked', 'disabled', 'class']
    this.xssWhiteList['label'] = ['for']
    this.xssWhiteList['ul'] = ['class']
    this.xssWhiteList['div'] = ['class']
    this.xssWhiteList['a'] = ['href', 'class', 'target', 'name']
    this.xssWhiteList['ol'] = ['start']

    this.xssWhiteList['p'] = ['class']
    this.xssWhiteList['span'] = ['style', 'class', 'title', 'id']
    this.xssWhiteList['svg'] = [
      'style',
      'class',
      'width',
      'height',
      'viewbox',
      'preserveaspectratio',
      'id',
      'fill',
      'stroke'
    ]
    this.xssWhiteList['path'] = ['style', 'class', 'd', 'id', 'fill', 'stroke']
    this.xssWhiteList['th'] = ['style']
    this.xssWhiteList['td'] = ['style']
  }

  onIgnoreTagAttr(tag, name, value, isWhiteAttr) {
    if (
      !isWhiteAttr &&
      (name === 'id' || (tag === 'span' && name === 'style'))
    ) {
      return name + '=' + value
    }
  }

  getXssWhiteList() {
    return this.xssWhiteList
  }

  setXssWhiteList(list) {
    this.xssWhiteList = list
  }

  setCustomXssRules(rules) {
    if (rules) {
      rules.forEach((rule) => {
        if (rule['value'] === null) {
          delete this.xssWhiteList[rule['key']]
        } else {
          this.xssWhiteList[rule['key']] = rule['value']
        }
      })
    }
  }

  setMdPlugins(plugins, mdt) {
    if (plugins && plugins.length) {
      plugins.forEach((item) => {
        const { plugin, opts } = item
        mdt.use(plugin, opts)
      })
    }
  }

  filterHtml(html) {
    return filterXSS(html, {
      whiteList: this.xssWhiteList,
      onIgnoreTagAttr: this.onIgnoreTagAttr,
      css: {
        whiteList: Object.assign({}, this.cssWhiteList, {
          top: true,
          left: true,
          bottom: true,
          right: true
        })
      }
    })
  }
}

let LoStore = {
  get: function (key) {
    var value = localStorage.getItem(key)
    if (value) {
      try {
        var valuejson = JSON.parse(value)
        if (['object', 'number', 'boolean'].includes(typeof valuejson)) {
          return valuejson
        } else {
          return value
        }
      } catch (e) {
        return value
      }
    } else {
      return false
    }
  },
  set: function (key, value) {
    localStorage.setItem(key, value)
  },
  push: function (key, value) {
    let old = JSON.parse(localStorage.getItem(key))
    let news = [...old, ...value]
    localStorage.setItem(key, JSON.stringify(news))
  },
  remove: function (key) {
    localStorage.removeItem(key)
  },
  clear: function () {
    localStorage.clear()
  }
}
// 批量保存，data是一个字典
LoStore.setList = function (data) {
  for (var i in data) {
    localStorage.setItem(i, data[i])
  }
}

// 批量删除，list是一个数组
LoStore.removeList = function (list) {
  for (var i = 0, len = list.length; i < len; i++) {
    localStorage.removeItem(list[i])
  }
}

let SeStore = {
  get: function (key) {
    var value = sessionStorage.getItem(key)
    if (value) {
      try {
        var valuejson = JSON.parse(value)
        if (['object', 'number', 'boolean'].includes(typeof valuejson)) {
          return valuejson
        } else {
          return value
        }
      } catch (e) {
        return value
      }
    } else {
      return false
    }
  },
  set: function (key, value) {
    sessionStorage.setItem(key, value)
  },
  push: function (key, value) {
    let old = JSON.parse(sessionStorage.getItem(key))
    let news = [...old, ...value]
    sessionStorage.setItem(key, JSON.stringify(news))
  },
  remove: function (key) {
    sessionStorage.removeItem(key)
  },
  clear: function () {
    sessionStorage.clear()
  }
}
// 批量保存，data是一个字典
SeStore.setList = function (data) {
  for (var i in data) {
    sessionStorage.setItem(i, data[i])
  }
}

// 批量删除，list是一个数组
SeStore.removeList = function (list) {
  for (var i = 0, len = list.length; i < len; i++) {
    sessionStorage.removeItem(list[i])
  }
}

export const ls = LoStore

export const ss = SeStore

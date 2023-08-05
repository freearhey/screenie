class Layout {
  constructor(_debugger) {
    this.maxHeight = 7000 // large values cause glitches in screenshots
    this.debugger = _debugger
  }

  async getMetrics() {
    console.log('Emulator.getMetrics')
    const layoutMetrics = await this.debugger.sendCommand('Page.getLayoutMetrics')
    const width = layoutMetrics.cssContentSize.width
    const height =
      layoutMetrics.cssContentSize.height > this.maxHeight
        ? this.maxHeight
        : layoutMetrics.cssContentSize.height

    return {
      width,
      height
    }
  }
}

class Emulator {
  constructor(_debugger) {
    this.debugger = _debugger
  }

  async override(metrics = {}) {
    console.log('Emulator.override:', metrics)
    metrics = { ...{ deviceScaleFactor: 1, mobile: false }, ...metrics }
    await this.debugger.sendCommand('Emulation.setDeviceMetricsOverride', metrics)
  }

  async reset() {
    console.log('Emulator.reset')
    await this.debugger.sendCommand('Emulation.resetPageScaleFactor')
  }
}

class Debugger {
  constructor(target) {
    this.target = target
  }

  attach() {
    console.log('Debugger.attach')
    return new Promise((resolve, reject) => {
      const version = '1.3'
      chrome.debugger.attach(this.target, version, result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result)
        }
      })
    })
  }

  detach() {
    console.log('Debugger.detach')
    return new Promise((resolve, reject) => {
      chrome.debugger.detach(this.target, result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result)
        }
      })
    })
  }

  sendCommand(method, params = {}) {
    console.log('Debugger.sendCommand:', method, params)
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(this.target, method, params, result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result)
        }
      })
    })
  }
}

class Screenshot {
  constructor(tab, _debugger) {
    this.delay = 1000
    this.format = 'png'
    this.tab = tab
    this.debugger = _debugger
  }

  capture(options) {
    console.log('Screenshot.capture:', options)
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const { data } = await this.debugger.sendCommand('Page.captureScreenshot', {
            format: this.format,
            clip: {
              x: 0,
              y: 0,
              width: options.width,
              height: options.height,
              scale: 1 // TODO: replace with the currect deviceScaleFactor
            },
            fromSurface: true,
            quality: 100,
            captureBeyondViewport: true
          })
          this.base64 = data
          resolve(data)
        } catch (err) {
          reject(err)
        }
      }, this.delay)
    })
  }

  download() {
    console.log('Screenshot.download')
    return new Promise((resolve, reject) => {
      const currentUrl = this.tab.url
      const filename =
        currentUrl
          .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
          .replace(/[^a-z0-9\.\-]/gi, '_')
          .toLowerCase() +
        '.' +
        this.format
      const contentType = `image/${this.format}`
      const url = `data:${contentType};base64,${this.base64}`
      chrome.downloads.download(
        {
          url,
          filename,
          conflictAction: 'uniquify',
          saveAs: false
        },
        () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve()
          }
        }
      )
    })
  }
}

chrome.action.onClicked.addListener(async tab => {
  console.log("I'm taking a screenshot...")
  const customDebugger = new Debugger({ tabId: tab.id })
  try {
    await customDebugger.attach()
    const layout = new Layout(customDebugger)
    const layoutMetrics = await layout.getMetrics()
    const emulator = new Emulator(customDebugger)
    emulator.override(layoutMetrics)
    const screenshot = new Screenshot(tab, customDebugger)
    await screenshot.capture(layoutMetrics)
    emulator.reset()
    await screenshot.download()
    await customDebugger.detach()
    console.log('Done!')
  } catch (err) {
    console.error('Error:', err.message)
    await customDebugger.detach()
  }
})

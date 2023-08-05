export default class Screenshot {
  constructor(tab, _debugger, logger) {
    this.captureDelay = 1000
    this.format = 'png'
    this.tab = tab
    this.debugger = _debugger
    this.logger = logger
  }

  capture(options) {
    this.logger.debug('Screenshot.capture:', options)
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
      }, this.captureDelay)
    })
  }

  download() {
    this.logger.debug('Screenshot.download')
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

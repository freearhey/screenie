const config = {
  debugger: {
    version: '1.3'
  },
  content: {
    maxHeight: 7000 // large values cause glitches in screenshots
  },
  device: {
    scaleFactor: devicePixelRatio,
    mobile: false
  },
  capture: {
    delay: 1000
  },
  output: {
    format: 'png',
    quality: 100,
    conflictAction: 'uniquify',
    saveAs: false
  }
}

let target, device
chrome.browserAction.onClicked.addListener(async tab => {
  let currentUrl = tab.url
  config.output.filename =
        currentUrl
          .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
          .replace(/[^a-z0-9\.\-]/gi, '_')
          .toLowerCase() +
        '.' +
        config.output.format
  console.log(config.output.filename)

  console.log("I'm taking a screenshot...")
  target = { tabId: tab.id }
  try {
    await attach()
    await sendCommand('Debugger.enable')
    await sendCommand('Emulation.clearDeviceMetricsOverride')
    const layoutMetrics = await sendCommand('Page.getLayoutMetrics')
    const height =
      layoutMetrics.cssContentSize.height > config.content.maxHeight
        ? config.content.maxHeight
        : layoutMetrics.cssContentSize.height
    device = {
      width: layoutMetrics.cssContentSize.width,
      height,
      deviceScaleFactor: config.device.scaleFactor,
      mobile: config.device.mobile
    }
    await sendCommand('Emulation.resetPageScaleFactor')
    await sendCommand('Emulation.setDeviceMetricsOverride', device)
    await sendCommand('Overlay.disable')
    const screenshot = await captureScreenshot()
    await download(screenshot)
    await detach()
    console.log('Done!')
  } catch (err) {
    console.error(err.message)
  }
})

function attach() {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach(target, config.debugger.version, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(result)
      }
      console.log('attach')
    })
  })
}

function detach() {
  return new Promise((resolve, reject) => {
    chrome.debugger.detach(target, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(result)
      }
      console.log('detach')
    })
  })
}

function sendCommand(method, params = {}) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand(target, method, params, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(result)
      }
      console.log('sendCommand', method, params)
    })
  })
}

function captureScreenshot() {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const { data } = await sendCommand('Page.captureScreenshot', {
          format: config.output.format,
          clip: {
            x: 0,
            y: 0,
            width: device.width,
            height: device.height,
            scale: 1
          },
          fromSurface: true,
          quality: config.output.quality,
          captureBeyondViewport: true
        })
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }, config.capture.delay)
  })
}

function download(base64) {
  return new Promise((resolve, reject) => {
    const contentType = 'image/' + config.output.format
    const blob = base64ToBlob(base64, contentType)
    const obj = URL.createObjectURL(blob, { type: contentType })
    chrome.downloads.download(
        {
          url: obj,
          filename: config.output.filename,
          conflictAction: config.output.conflictAction,
          saveAs: config.output.saveAs
        },
        () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve()
          }

          console.log('download', base64)
        }
      )
  })
}

function base64ToBlob(b64Data, contentType, sliceSize = 512) {
  const byteCharacters = atob(b64Data)
  const byteArrays = []

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize)

    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    byteArrays.push(byteArray)
  }

  const blob = new Blob(byteArrays, { type: contentType })
  return blob
}

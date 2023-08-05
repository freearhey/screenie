const config = {
  debugger: {
    version: '1.3'
  },
  content: {
    maxHeight: 7000 // large values cause glitches in screenshots
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

let target, deviceInfo
chrome.action.onClicked.addListener(async tab => {
  let currentUrl = tab.url
  config.output.filename =
        currentUrl
          .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
          .replace(/[^a-z0-9\.\-]/gi, '_')
          .toLowerCase() +
        '.' +
        config.output.format

  console.log("I'm taking a screenshot...")
  target = { tabId: tab.id }
  try {
    await attach()
    deviceInfo = await getDeviceInfo()
    await sendCommand('Emulation.setDeviceMetricsOverride', deviceInfo)
    const screenshot = await captureScreenshot()
    await sendCommand('Emulation.resetPageScaleFactor')
    await download(screenshot)
    await detach()
    console.log('Done!')
  } catch (err) {
    console.error(err.message)
    await detach()
  }
})

async function getDeviceInfo() {
  const layoutMetrics = await sendCommand('Page.getLayoutMetrics')
  const width = layoutMetrics.cssContentSize.width
  const height = layoutMetrics.cssContentSize.height > config.content.maxHeight ? config.content.maxHeight : layoutMetrics.cssContentSize.height

  return {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  }
}

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
            width: deviceInfo.width,
            height: deviceInfo.height,
            scale: 1 // TODO: replace with the currect deviceScaleFactor
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
    const url = `data:${contentType};base64,${base64}`
    chrome.downloads.download(
        {
          url,
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

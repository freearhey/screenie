let target, device, currentTab
chrome.browserAction.onClicked.addListener(async (tab) => {
  console.log('I\'m taking a screenshot...')
  target = { tabId: tab.id }
  currentTab = tab
  await attach()
  await sendCommand('Debugger.enable')
  await sendCommand('Emulation.clearDeviceMetricsOverride')
  await sendCommand('Overlay.setShowViewportSizeOnResize', { show: true })
  await sendCommand('Overlay.setShowViewportSizeOnResize', { show: false })
  const layoutMetrics = await sendCommand('Page.getLayoutMetrics')
  device = { 
    width: layoutMetrics.contentSize.width, 
    height: layoutMetrics.contentSize.height,
    // deviceScaleFactor: devicePixelRatio,
    deviceScaleFactor: 2.200000047683716,
    mobile: false
  }
  await sendCommand('Emulation.resetPageScaleFactor')
  await sendCommand('Emulation.setDeviceMetricsOverride', device)
  await sendCommand('Overlay.disable')
  const screenshot = await captureScreenshot()
  await download(screenshot)
  await detach()
  console.log('Done!')
})

function attach() {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach(target, '1.3', result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(result)
      }
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
  return new Promise((resolve) => {
    setTimeout(async () => {
      const { data } = await sendCommand('Page.captureScreenshot', {
        format: 'png',
        clip: {
          x: 0,
          y: 0,
          width: device.width,
          height: device.height,
          scale: 1
        }, 
        fromSurface: true,
        quality: 100
      })

      resolve(data)
    }, 1000)
  })
}

function download(base64) {
  return new Promise((resolve, reject) => {
    const contentType = 'image/png'
    const blob = base64ToBlob(base64, contentType)
    const obj = URL.createObjectURL(blob, { type: contentType }) 
    const filename = currentTab.url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").replace(/[^a-z0-9\.\-]/gi, '_').toLowerCase() + '.png'
    chrome.downloads.download({ url: obj, filename: filename, conflictAction: 'uniquify', saveAs: false }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
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

  const blob = new Blob(byteArrays, {type: contentType})
  return blob
}
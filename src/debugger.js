export default class Debugger {
  constructor(tab, logger) {
    this.target = { tabId: tab.id }
    this.logger = logger
  }

  attach() {
    this.logger.debug('Debugger.attach')
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
    this.logger.debug('Debugger.detach')
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
    this.logger.debug('Debugger.sendCommand:', method, params)
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

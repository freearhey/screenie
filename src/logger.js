export default class Logger {
  constructor(options = {}) {
    this.debugMode = options.debug || false
  }

  info(...args) {
    console.log(...args)
  }

  error(...args) {
    console.error(...args)
  }

  debug(...args) {
    if (this.debugMode) {
      console.log(...args)
    }
  }
}

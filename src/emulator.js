export default class Emulator {
  constructor(_debugger, logger) {
    this.maxHeight = 7000 // large values cause glitches in screenshots
    this.debugger = _debugger
    this.logger = logger
  }

  async override(metrics = {}) {
    this.logger.debug('Emulator.override:', metrics)
    metrics = { ...{ deviceScaleFactor: 1, mobile: false }, ...metrics }
    metrics.height = metrics.height > this.maxHeight ? this.maxHeight : metrics.height
    await this.debugger.sendCommand('Emulation.setDeviceMetricsOverride', metrics)
  }

  async reset() {
    this.logger.debug('Emulator.reset')
    await this.debugger.sendCommand('Emulation.resetPageScaleFactor')
  }
}

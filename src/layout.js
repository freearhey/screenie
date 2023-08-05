export default class Layout {
  constructor(_debugger, logger) {
    this.debugger = _debugger
    this.logger = logger
  }

  async getMetrics() {
    this.logger.debug('Emulator.getMetrics')
    const layoutMetrics = await this.debugger.sendCommand('Page.getLayoutMetrics')

    return {
      width: layoutMetrics.cssContentSize.width,
      height: layoutMetrics.cssContentSize.height
    }
  }
}

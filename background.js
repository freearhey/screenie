import { Layout, Debugger, Screenshot, Emulator, Logger } from './models/index.js'

chrome.action.onClicked.addListener(async tab => {
  const logger = new Logger({ debug: false })
  logger.info("I'm taking a screenshot...")
  const customDebugger = new Debugger(tab, logger)
  try {
    await customDebugger.attach()
    const layout = new Layout(customDebugger, logger)
    const layoutMetrics = await layout.getMetrics()
    const emulator = new Emulator(customDebugger, logger)
    await emulator.override(layoutMetrics)
    const screenshot = new Screenshot(tab, customDebugger, logger)
    await screenshot.capture(layoutMetrics)
    await emulator.reset()
    await screenshot.download()
    await customDebugger.detach()
    logger.info('Done!')
  } catch (err) {
    logger.error('Error:', err.message)
    await customDebugger.detach()
  }
})

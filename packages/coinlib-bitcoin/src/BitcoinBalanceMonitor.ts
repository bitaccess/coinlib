import { BitcoinPaymentsUtils } from './BitcoinPaymentsUtils'
import { BitcoinishBalanceMonitor } from './bitcoinish/BitcoinishBalanceMonitor'
import { BitcoinBalanceMonitorConfig } from './types'
import { toBitcoinishConfig } from './utils'

export class BitcoinBalanceMonitor extends BitcoinishBalanceMonitor {
  constructor(config: BitcoinBalanceMonitorConfig) {
    super({
      ...toBitcoinishConfig(config),
      utils: new BitcoinPaymentsUtils(config),
    })
  }
}

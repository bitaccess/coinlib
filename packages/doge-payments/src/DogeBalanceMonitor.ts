import { DogePaymentsUtils } from './DogePaymentsUtils'
import { bitcoinish } from '@faast/bitcoin-payments'
import { DogeBalanceMonitorConfig } from './types'
import { toBitcoinishConfig } from './utils';

export class DogeBalanceMonitor extends bitcoinish.BitcoinishBalanceMonitor {
  constructor(config: DogeBalanceMonitorConfig) {
    super({
      ...toBitcoinishConfig(config),
      utils: new DogePaymentsUtils(config),
    })
  }
}

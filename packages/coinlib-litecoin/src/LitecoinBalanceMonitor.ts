import { LitecoinPaymentsUtils } from './LitecoinPaymentsUtils'
import { bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { LitecoinBalanceMonitorConfig } from './types'
import { toBitcoinishConfig } from './utils';

export class LitecoinBalanceMonitor extends bitcoinish.BitcoinishBalanceMonitor {
  constructor(config: LitecoinBalanceMonitorConfig) {
    super({
      ...toBitcoinishConfig(config),
      utils: new LitecoinPaymentsUtils(config),
    })
  }
}

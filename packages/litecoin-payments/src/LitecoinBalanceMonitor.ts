import { LitecoinPaymentsUtils } from './LitecoinPaymentsUtils'
import { bitcoinish } from '@faast/bitcoin-payments'
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

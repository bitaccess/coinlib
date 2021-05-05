import { BitcoinCashPaymentsUtils } from './BitcoinCashPaymentsUtils'
import { bitcoinish } from '@faast/bitcoin-payments'
import { BitcoinCashBalanceMonitorConfig } from './types'
import { toBitcoinishConfig } from './utils';

export class BitcoinCashBalanceMonitor extends bitcoinish.BitcoinishBalanceMonitor {
  constructor(config: BitcoinCashBalanceMonitorConfig) {
    super({
      ...toBitcoinishConfig(config),
      utils: new BitcoinCashPaymentsUtils(config),
    })
  }
}

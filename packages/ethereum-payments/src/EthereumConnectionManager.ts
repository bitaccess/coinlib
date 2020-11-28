import Web3 from 'web3'
import { PaymentsConnectionManager } from '@faast/payments-common'

import { EthereumPaymentsUtilsConfig } from './types';
import { EthereumPaymentsUtils } from './EthereumPaymentsUtils'

export class EthereumConnectionManager implements PaymentsConnectionManager<
  Web3,
  EthereumPaymentsUtils,
  EthereumPaymentsUtilsConfig
> {

  connections = {}

  getConnection(connected: EthereumPaymentsUtils) {
    return connected.web3
  }

  getConnectionUrl(config: EthereumPaymentsUtilsConfig) {
    return config.fullNode || null
  }

  setConnection(config: EthereumPaymentsUtilsConfig, web3: Web3) {
    return config.web3 = web3
  }
}

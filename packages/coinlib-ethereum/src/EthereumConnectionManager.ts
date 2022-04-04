import Web3 from 'web3'
import { PaymentsConnectionManager } from '@bitaccess/coinlib-common'

import { EthereumNodesConnection, EthereumPaymentsUtilsConfig } from './types'
import { EthereumPaymentsUtils } from './EthereumPaymentsUtils'

export class EthereumConnectionManager
  implements PaymentsConnectionManager<EthereumNodesConnection, EthereumPaymentsUtilsConfig> {
  connections = {}

  getConnection(connected: EthereumPaymentsUtils) {
    return { web3: connected.web3, blockbookApi: connected.blockBookApi }
  }

  getConnectionUrl(config: EthereumPaymentsUtilsConfig) {
    const { fullNode, blockbookNode } = config

    if (fullNode && blockbookNode) {
      return `${fullNode}-${blockbookNode}`
    }

    return config.fullNode ?? config.blockbookNode ?? null
  }

  setConnection(config: EthereumPaymentsUtilsConfig, ethereumConnection: EthereumNodesConnection) {
    config.web3 = ethereumConnection.web3
    config.blockbookApi = ethereumConnection.blockbookApi
  }
}

import { PaymentsUtils } from '@faast/payments-common'
import { EthereumPaymentsUtils } from '../EthereumPaymentsUtils'
import { BaseErc20PaymentsConfig } from './types'

export class Erc20PaymentsUtils extends EthereumPaymentsUtils {
  constructor(config: BaseErc20PaymentsConfig) {
    super(config)
  }
}

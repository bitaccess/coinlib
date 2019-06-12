import { AnyPayments } from './PaymentsInterface'
import { BaseConfig } from './types'

export interface PaymentsFactory {
  forConfig<C extends BaseConfig, P extends AnyPayments<C>>(config: C): P
}

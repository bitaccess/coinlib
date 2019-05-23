import { AnyPayments } from './PaymentsInterface'

export interface PaymentsFactory<C extends object> {
  forConfig<P extends AnyPayments<C>>(config: C): P
}

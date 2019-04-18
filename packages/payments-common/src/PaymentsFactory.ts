import { PaymentsInterface } from './PaymentsInterface'

export interface PaymentsFactory<P extends PaymentsInterface<any, any, any>> {
  forConfig(config: any): P
}
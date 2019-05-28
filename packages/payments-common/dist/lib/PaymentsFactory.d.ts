import { AnyPayments } from './PaymentsInterface';
export interface PaymentsFactory {
    forConfig<C extends object, P extends AnyPayments<C>>(config: C): P;
}

import { AnyPayments } from './PaymentsInterface';
export interface PaymentsFactory<P extends AnyPayments> {
    forConfig(config: any): P;
}

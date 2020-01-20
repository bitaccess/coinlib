import { PaymentsFactory } from '@faast/payments-common';
import { BitcoinPaymentsConfig } from './types';
import { HdBitcoinPayments } from './HdBitcoinPayments';
export declare class BitcoinPaymentsFactory implements PaymentsFactory<BitcoinPaymentsConfig> {
    forConfig(config: BitcoinPaymentsConfig): HdBitcoinPayments;
}
export default BitcoinPaymentsFactory;

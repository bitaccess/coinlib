import { PaymentsFactory } from '@faast/payments-common';
import { BitcoinPaymentsConfig } from './types';
import { HdBitcoinPayments } from './HdBitcoinPayments';
import { KeyPairBitcoinPayments } from './KeyPairBitcoinPayments';
import { MultisigBitcoinPayments } from './MultisigBitcoinPayments';
export declare class BitcoinPaymentsFactory implements PaymentsFactory<BitcoinPaymentsConfig> {
    forConfig(config: BitcoinPaymentsConfig): HdBitcoinPayments | KeyPairBitcoinPayments | MultisigBitcoinPayments;
}
export default BitcoinPaymentsFactory;

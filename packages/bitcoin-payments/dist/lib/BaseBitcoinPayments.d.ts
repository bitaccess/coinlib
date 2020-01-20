import { FeeRate, AutoFeeLevels } from '@faast/payments-common';
import { BaseBitcoinPaymentsConfig, BitcoinishUnsignedTransaction, BitcoinishSignedTransaction, AddressType } from './types';
import { BitcoinishPayments } from './bitcoinish';
import { KeyPair } from './bip44';
export declare abstract class BaseBitcoinPayments<Config extends BaseBitcoinPaymentsConfig> extends BitcoinishPayments<Config> {
    readonly addressType: AddressType;
    constructor(config: BaseBitcoinPaymentsConfig);
    abstract getKeyPair(index: number): KeyPair;
    isValidAddress(address: string): Promise<boolean>;
    getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate>;
    signTransaction(tx: BitcoinishUnsignedTransaction): Promise<BitcoinishSignedTransaction>;
}

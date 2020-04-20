import { PaymentsUtils, Payport, createUnitConverters, MaybePromise } from '@faast/payments-common';
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib';
import { Numeric } from '@faast/ts-common';
import { BlockbookConnected } from './BlockbookConnected';
import { BitcoinishBlock, BitcoinishPaymentsUtilsConfig } from './types';
declare type UnitConverters = ReturnType<typeof createUnitConverters>;
export declare abstract class BitcoinishPaymentsUtils extends BlockbookConnected implements PaymentsUtils {
    decimals: number;
    bitcoinjsNetwork: BitcoinjsNetwork;
    constructor(config: BitcoinishPaymentsUtilsConfig);
    isValidExtraId(extraId: string): boolean;
    abstract isValidAddress(address: string): MaybePromise<boolean>;
    private _getPayportValidationMessage;
    getPayportValidationMessage(payport: Payport): Promise<string | undefined>;
    validatePayport(payport: Payport): Promise<void>;
    isValidPayport(payport: Payport): Promise<boolean>;
    toMainDenomination(amount: Numeric): string;
    toBaseDenomination(amount: Numeric): string;
    toMainDenominationString: UnitConverters['toMainDenominationString'];
    toMainDenominationNumber: UnitConverters['toMainDenominationNumber'];
    toMainDenominationBigNumber: UnitConverters['toMainDenominationBigNumber'];
    toBaseDenominationString: UnitConverters['toMainDenominationString'];
    toBaseDenominationNumber: UnitConverters['toMainDenominationNumber'];
    toBaseDenominationBigNumber: UnitConverters['toMainDenominationBigNumber'];
    getBlock(id?: string | number): Promise<BitcoinishBlock>;
}
export {};

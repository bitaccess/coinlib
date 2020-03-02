import { PaymentsUtils, Payport } from '@faast/payments-common';
import { Numeric, Logger } from '@faast/ts-common';
import { BaseEthereumPaymentsConfig, BaseDenominationOptions } from './types';
export declare class EthereumPaymentsUtils implements PaymentsUtils {
    logger: Logger;
    constructor(config: BaseEthereumPaymentsConfig);
    toBaseDenomination(amount: Numeric, options?: BaseDenominationOptions): string;
    toMainDenomination(amount: Numeric, options?: BaseDenominationOptions): string;
    isValidAddress(address: string): Promise<boolean>;
    isValidExtraId(extraId: unknown): Promise<boolean>;
    isValidPayport(payport: Payport): Promise<boolean>;
    validatePayport(payport: Payport): Promise<void>;
    getPayportValidationMessage(payport: Payport): Promise<string | undefined>;
    isValidXprv(xprv: string): boolean;
    isValidXpub(xpub: string): boolean;
    isValidPrivateKey(prv: string): boolean;
    privateKeyToAddress(prv: string): string;
    private _getPayportValidationMessage;
}

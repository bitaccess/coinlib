import { PaymentsUtils, NetworkType, Payport } from '@faast/payments-common';
import { isValidXprv, isValidXpub, isValidPrivateKey, privateKeyToAddress } from './helpers';
import { Logger } from '@faast/ts-common';
import { BaseTronPaymentsConfig } from './types';
export declare class TronPaymentsUtils implements PaymentsUtils {
    networkType: NetworkType;
    logger: Logger;
    constructor(config?: BaseTronPaymentsConfig);
    isValidExtraId(extraId: string): Promise<boolean>;
    isValidAddress(address: string): Promise<boolean>;
    private _getPayportValidationMessage;
    getPayportValidationMessage(payport: Payport): Promise<string | undefined>;
    validatePayport(payport: Payport): Promise<void>;
    isValidPayport(payport: Payport): Promise<boolean>;
    toMainDenomination(amount: string | number): string;
    toBaseDenomination(amount: string | number): string;
    isValidXprv: typeof isValidXprv;
    isValidXpub: typeof isValidXpub;
    isValidPrivateKey: typeof isValidPrivateKey;
    privateKeyToAddress: typeof privateKeyToAddress;
}

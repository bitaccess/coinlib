import { PaymentsUtils, NetworkType, Payport } from '@faast/payments-common';
import { RippleAPI } from 'ripple-lib';
import { isValidXprv, isValidXpub } from './helpers';
import { Logger } from '@faast/ts-common';
import { BaseRippleConfig } from './types';
export declare class RipplePaymentsUtils implements PaymentsUtils {
    networkType: NetworkType;
    logger: Logger;
    rippleApi: RippleAPI;
    server: string | null;
    constructor(config?: BaseRippleConfig);
    init(): Promise<void>;
    destroy(): Promise<void>;
    _retryDced<T>(fn: () => Promise<T>): Promise<T>;
    isValidExtraId(extraId: string): Promise<boolean>;
    isValidAddress(address: string): Promise<boolean>;
    private getPayportValidationMessage;
    validatePayport(payport: Payport): Promise<void>;
    isValidPayport(payport: Payport): Promise<boolean>;
    toMainDenomination(amount: string | number): string;
    toBaseDenomination(amount: string | number): string;
    isValidXprv: typeof isValidXprv;
    isValidXpub: typeof isValidXpub;
}

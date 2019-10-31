import { PaymentsUtils, Payport } from '@faast/payments-common';
import { isValidXprv, isValidXpub } from './helpers';
import { BaseRippleConfig } from './types';
import { RippleConnected } from './RippleConnected';
export declare class RipplePaymentsUtils extends RippleConnected implements PaymentsUtils {
    constructor(config: BaseRippleConfig);
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
}

import { PaymentsUtils, Payport } from '@faast/payments-common';
import { Numeric } from '@faast/ts-common';
import { StellarConnected } from './StellarConnected';
export declare class StellarPaymentsUtils extends StellarConnected implements PaymentsUtils {
    isValidExtraId(extraId: string): Promise<boolean>;
    isValidAddress(address: string): Promise<boolean>;
    private getPayportValidationMessage;
    validatePayport(payport: Payport): Promise<void>;
    isValidPayport(payport: Payport): Promise<boolean>;
    toMainDenomination(amount: Numeric): string;
    toBaseDenomination(amount: Numeric): string;
}

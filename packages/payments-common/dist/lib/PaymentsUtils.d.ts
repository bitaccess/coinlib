import { Numeric } from '@faast/ts-common';
import { Payport, MaybePromise } from './types';
export interface PaymentsUtils {
    toMainDenomination<O extends object>(amount: Numeric, options?: O): string;
    toBaseDenomination<O extends object>(amount: Numeric, options?: O): string;
    isValidAddress<O extends object>(address: string, options?: O): MaybePromise<boolean>;
    isValidExtraId<O extends object>(extraId: string, options?: O): MaybePromise<boolean>;
    isValidPayport<O extends object>(payport: Payport, options?: O): MaybePromise<boolean>;
    validatePayport<O extends object>(payport: Payport, options?: O): MaybePromise<void>;
    getPayportValidationMessage<O extends object>(payport: Payport, options?: O): MaybePromise<string | undefined>;
}

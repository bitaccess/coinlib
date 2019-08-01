import { Numeric } from '@faast/ts-common';
import { Payport } from './types';
export interface PaymentsUtils {
    toMainDenomination<O extends object>(amount: Numeric, options?: O): string;
    toBaseDenomination<O extends object>(amount: Numeric, options?: O): string;
    isValidAddress<O extends object>(address: string, options?: O): Promise<boolean>;
    isValidExtraId<O extends object>(extraId: string, options?: O): Promise<boolean>;
    isValidPayport<O extends object>(payport: Payport, options?: O): Promise<boolean>;
}

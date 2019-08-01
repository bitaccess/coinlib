import { Numeric } from '@faast/ts-common';
import { Payport, BaseConfig, NetworkType } from './types';
export declare abstract class PaymentsUtils {
    networkType: NetworkType;
    constructor(config: BaseConfig);
    abstract toMainDenomination<O extends object>(amount: Numeric, options?: O): string;
    abstract toBaseDenomination<O extends object>(amount: Numeric, options?: O): string;
    abstract isValidAddress<O extends object>(address: string, options?: O): Promise<boolean>;
    abstract isValidExtraId<O extends object>(extraId: string, options?: O): Promise<boolean>;
    isValidPayport<O extends object>(payport: Payport, options?: O): Promise<boolean>;
}

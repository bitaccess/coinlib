import { PaymentsFactory } from '@faast/payments-common';
import { EthereumPaymentsConfig, HdEthereumPaymentsConfig, KeyPairEthereumPaymentsConfig } from './types';
import { HdEthereumPayments } from './HdEthereumPayments';
import { KeyPairEthereumPayments } from './KeyPairEthereumPayments';
export declare class EthereumPaymentsFactory implements PaymentsFactory<EthereumPaymentsConfig> {
    forConfig(config: HdEthereumPaymentsConfig): HdEthereumPayments;
    forConfig(config: KeyPairEthereumPaymentsConfig): KeyPairEthereumPayments;
}
export default EthereumPaymentsFactory;

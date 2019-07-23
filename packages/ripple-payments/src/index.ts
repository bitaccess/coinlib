import {
  PaymentsInterface,
  BalanceResult,
  CreateTransactionOptions,
  FeeOption,
  ResolvedFeeOption,
} from '@faast/payments-common'
import { RippleAPI } from 'ripple-lib'

import {
  RipplePaymentsConfig,
  RippleUnsignedTransaction,
  RippleSignedTransaction,
  RippleBroadcastResult,
  RippleTransactionInfo,
} from './types'
import { isValidXprv, isValidXpub } from './utils'
import { xprvToXpub } from './bip44'
import { SignOptions } from 'ripple-lib/dist/npm/transaction/types'

export class RipplePayments
  implements
    PaymentsInterface<
      RipplePaymentsConfig,
      RippleUnsignedTransaction,
      RippleSignedTransaction,
      RippleBroadcastResult,
      RippleTransactionInfo
    > {
  readonly rippleApi: RippleAPI
  readonly xprv: string | null
  readonly xpub: string

  constructor(public readonly config: RipplePaymentsConfig) {
    if (config.server) {
      if (isValidXprv(config.hdKey)) {
        this.xprv = config.hdKey
        this.xpub = xprvToXpub(this.xprv)
      } else if (isValidXpub(config.hdKey)) {
        this.xprv = null
        this.xpub = config.hdKey
      } else {
        throw new Error('Account must be a valid xprv or xpub')
      }
      this.rippleApi = new RippleAPI({
        server: config.server,
      })
    } else {
      this.rippleApi = new RippleAPI()
    }
  }

  getFullConfig() {
    return this.config
  }

  getPublicConfig() {
    return {
      ...this.config,
      hdKey: xprvToXpub(this.config.hdKey),
    }
  }

  toMainDenomination<O extends object>(amount: string | number, options?: O | undefined): string {
    throw new Error('Method not implemented.')
  }
  toBaseDenomination<O extends object>(amount: string | number, options?: O | undefined): string {
    throw new Error('Method not implemented.')
  }
  isValidAddress<O extends object>(address: string, options?: O | undefined): boolean | Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  resolveAddress<O extends object>(addressOrIndex: string | number, options?: O | undefined): Promise<string> {
    throw new Error('Method not implemented.')
  }
  resolveFromTo<O extends object>(
    from: string | number,
    to: string | number,
    options?: O | undefined,
  ): Promise<{ fromIndex: number; fromAddress: string; toIndex: number | null; toAddress: string }> {
    throw new Error('Method not implemented.')
  }
  getAccountIds(): string[] {
    throw new Error('Method not implemented.')
  }
  getAccountId(index: number): string {
    throw new Error('Method not implemented.')
  }
  getAddressIndex<O extends object>(address: string, options?: O | undefined): Promise<number> {
    throw new Error('Method not implemented.')
  }
  getAddressIndexOrNull<O extends object>(address: string, options?: O | undefined): Promise<number | null> {
    throw new Error('Method not implemented.')
  }
  getAddress<O extends object>(index: number, options?: O | undefined): Promise<string> {
    throw new Error('Method not implemented.')
  }
  getAddressOrNull<O extends object>(index: number, options?: O | undefined): Promise<string | null> {
    throw new Error('Method not implemented.')
  }
  getBalance<O extends object>(addressOrIndex: string | number, options?: O | undefined): Promise<BalanceResult> {
    throw new Error('Method not implemented.')
  }
  getTransactionInfo(txId: string, addressOrIndex: string | number): Promise<RippleTransactionInfo> {
    throw new Error('Method not implemented.')
  }
  resolveFeeOption(feeOption: FeeOption): Promise<ResolvedFeeOption> {
    throw new Error('Method not implemented.')
  }
  createTransaction(
    from: string | number,
    to: string | number,
    amount: string,
    options?: CreateTransactionOptions,
  ): Promise<RippleUnsignedTransaction> {
    throw new Error('Method not implemented.')
  }
  createSweepTransaction(
    from: string | number,
    to: string | number,
    options?: CreateTransactionOptions,
  ): Promise<RippleUnsignedTransaction> {
    throw new Error('Method not implemented.')
  }
  signTransaction(unsignedTx: RippleUnsignedTransaction): Promise<RippleSignedTransaction> {
    throw new Error('Method not implemented.')
  }
  broadcastTransaction(signedTx: RippleSignedTransaction): Promise<RippleBroadcastResult> {
    throw new Error('Method not implemented.')
  }
}

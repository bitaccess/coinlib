import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import {
  MultisigBitcoinPaymentsConfig,
  HdBitcoinPaymentsConfig,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  MultisigAddressType,
  AddressType,
} from './types'
import { cloneDeep, omit } from 'lodash'
import { HdBitcoinPayments } from './HdBitcoinPayments'
import { KeyPairBitcoinPayments } from './KeyPairBitcoinPayments'
import * as bitcoin from 'bitcoinjs-lib'
import {
  CreateTransactionOptions,
  ResolveablePayport,
  BaseMultisigData,
  PayportOutput,
  MultisigData,
  UtxoInfo,
  AddressMultisigData
} from '@bitaccess/coinlib-common'
import { publicKeyToString, getMultisigPaymentScript, isMultisigFullySigned } from './helpers'
import { isNumber, Numeric } from '@faast/ts-common'
import { DEFAULT_MULTISIG_ADDRESS_TYPE } from './constants'

export class MultisigBitcoinPayments extends BaseBitcoinPayments<MultisigBitcoinPaymentsConfig> {

  addressType: MultisigAddressType
  m: number
  signers: (HdBitcoinPayments | KeyPairBitcoinPayments)[]
  accountIdToSigner: { [accountId: string]: HdBitcoinPayments | KeyPairBitcoinPayments } = {}

  constructor(private config: MultisigBitcoinPaymentsConfig) {
    super(config)
    this.addressType = config.addressType || DEFAULT_MULTISIG_ADDRESS_TYPE
    this.m = config.m
    this.signers = config.signers.map((signerConfig, i) => {
      signerConfig = {
        network: this.networkType,
        logger: this.logger,
        ...signerConfig,
      }
      if (signerConfig.network !== this.networkType) {
        throw new Error(`MultisigBitcoinPayments is on network ${this.networkType} but signer config ${i} is on ${signerConfig.network}`)
      }
      const payments = HdBitcoinPaymentsConfig.is(signerConfig)
        ? new HdBitcoinPayments(signerConfig)
        : new KeyPairBitcoinPayments(signerConfig)

      payments.getAccountIds().forEach((accountId) => {
        this.accountIdToSigner[accountId] = payments
      })
      return payments
    })
  }

  getFullConfig(): MultisigBitcoinPaymentsConfig {
    return {
      ...this.config,
      network: this.networkType,
      addressType: this.addressType,
    }
  }

  getPublicConfig(): MultisigBitcoinPaymentsConfig {
    return {
      ...omit(this.getFullConfig(), ['logger', 'server', 'signers']),
      signers: this.signers.map((signer) => signer.getPublicConfig()),
    }
  }

  getEstimateTxSizeInputKey() {
    return `${this.addressType}:${this.m}-${this.signers.length}`
  }

  getAccountId(index: number): string {
    throw new Error('Multisig payments does not have single account for an index, use getAccountIds(index) instead')
  }

  getAccountIds(index?: number): string[] {
    return this.signers.reduce((result, signer) => ([...result, ...signer.getAccountIds(index)]), [] as string[])
  }

  getSignerPublicKeyBuffers(index: number): Buffer[] {
    return this.signers.map((signer) => signer.getKeyPair(index).publicKey)
  }

  getPaymentScript(index: number, addressType?: MultisigAddressType): bitcoin.payments.Payment {
    return getMultisigPaymentScript(
      this.bitcoinjsNetwork,
      addressType || this.addressType,
      this.getSignerPublicKeyBuffers(index),
      this.m,
    )
  }

  getAddress(index: number, addressType?: MultisigAddressType): string {
    const { address } = this.getPaymentScript(index, addressType)
    if (!address) {
      throw new Error('bitcoinjs-lib address derivation returned falsy value')
    }
    return address
  }

  private createMultisigData(inputUtxos: UtxoInfo[]) {
    const result: { [address: string]: AddressMultisigData } = {}
    for (let i = 0; i < inputUtxos.length; i++) {
      const input = inputUtxos[i]
      if (!input.address) {
        throw new Error(`Missing address field for input utxo ${input.txid}:${input.vout}`)
      }
      if (!isNumber(input.signer)) {
        throw new Error(`Missing signer field for input utxo ${input.txid}:${input.vout}`)
      }
      const signerIndex = input.signer
      if (result[input.address]) {
        // Address already included in multisig data, append this input index
        result[input.address].inputIndices.push(i)
        continue
      }
      const accountIds = []
      const publicKeys = []
      for (let signer of this.signers) {
        // accountIds and publicKeys are parallel arrays with lengths equal to number of signers in the multisig address
        accountIds.push(signer.getAccountId(signerIndex))
        publicKeys.push(publicKeyToString(signer.getKeyPair(signerIndex).publicKey))
      }
      result[input.address] = {
        m: this.m,
        accountIds,
        publicKeys,
        signedAccountIds: [],
        signerIndex,
        inputIndices: [i],
      }
    }
    return result
  }

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amount: Numeric,
    options?: CreateTransactionOptions,
  ): Promise<BitcoinUnsignedTransaction> {
    const tx = await super.createTransaction(from, to, amount, options)
    return {
      ...tx,
      multisigData: this.createMultisigData(tx.inputUtxos!),
    }
  }

  async createMultiOutputTransaction(
    from: number,
    to: PayportOutput[],
    options: CreateTransactionOptions = {},
  ): Promise<BitcoinUnsignedTransaction> {
    const tx = await super.createMultiOutputTransaction(from, to, options)
    return {
      ...tx,
      multisigData: this.createMultisigData(tx.inputUtxos!),
    }
  }

  async createMultiInputTransaction(
    from: number[],
    to: PayportOutput[],
    options: CreateTransactionOptions = {},
  ): Promise<BitcoinUnsignedTransaction> {
    const tx = await super.createMultiInputTransaction(from, to, options)
    return {
      ...tx,
      multisigData: this.createMultisigData(tx.inputUtxos!),
    }
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: CreateTransactionOptions = {},
  ): Promise<BitcoinUnsignedTransaction> {
    const tx = await super.createSweepTransaction(from, to, options)
    return {
      ...tx,
      multisigData: this.createMultisigData(tx.inputUtxos!),
    }
  }

  private deserializeSignedTxPsbt(tx: BitcoinSignedTransaction): bitcoin.Psbt {
    if (!tx.data.partial) {
      throw new Error('Cannot decode psbt of a finalized tx')
    }
    return bitcoin.Psbt.fromHex(tx.data.hex, this.psbtOptions)
  }

  private validateCompatibleBaseMultisigData(m1: BaseMultisigData, m2: BaseMultisigData) {
    if (m1.m !== m2.m) {
      throw new Error(`Mismatched legacy multisig data m value (${m1.m} vs ${m2.m})`)
    }
    if (m1.accountIds.length !== m1.publicKeys.length
      || m1.accountIds.length !== m2.accountIds.length
      || m1.accountIds.length !== m2.publicKeys.length) {
      throw new Error('Mismatched lengths of multisigdata accountIds or publicKeys')
    }
    for (let i = 0; i < m1.accountIds.length; i++) {
      if (m1.accountIds[i] !== m2.accountIds[i]) {
        throw new Error(`Mismatched accountId at index ${i}: ${m1.accountIds[i]} ${m2.accountIds[i]}`)
      }
      if (m1.publicKeys[i] !== m2.publicKeys[i]) {
        throw new Error(`Mismatched publicKey at index ${i}: ${m1.publicKeys[i]} ${m2.publicKeys[i]}`)
      }
    }
  }

  private combineBaseMultisigData<D extends BaseMultisigData>(m1: D, m2: D): D {
    this.validateCompatibleBaseMultisigData(m1, m2)
    return {
      ...m1,
      signedAccountIds: Array.from(new Set([
        ...m1.signedAccountIds,
        ...m2.signedAccountIds,
      ]))
    }
  }

  private combineMultisigData(m1: MultisigData, m2: MultisigData) {
    if (BaseMultisigData.is(m1)) {
      if (!BaseMultisigData.is(m2)) {
        throw new Error('Cannot merge legacy single input with multi input MultisigData')
      }
      return this.combineBaseMultisigData(m1, m2)
    } else if (BaseMultisigData.is(m2)) {
      throw new Error('Cannot merge multi-input with legacy single-input MultisigData')
    } else {
      // Both are multi-input MultisigData
      return Object.entries(m2).reduce((result, [address, data]) => {
        if (result[address]) {
          // Both transactions have entries for an address (ie standard multisig)
          result[address] = this.combineBaseMultisigData(result[address], data)
        } else {
          // m2 has entry for address that m1 doesn't (ie coinjoin)
          throw new Error(`combineMultisigData does not yet support coinjoin (${address})`)
        }
        return result
      }, cloneDeep(m1))
    }
  }

  /**
   * Combines two of more partially signed transactions. Once the required # of signatures is reached (`m`)
   * the transaction is validated and finalized.
   */
  async combinePartiallySignedTransactions(txs: BitcoinSignedTransaction[]): Promise<BitcoinSignedTransaction> {
    if (txs.length < 2) {
      throw new Error(`Cannot combine ${txs.length} transactions, need at least 2`)
    }

    const unsignedTxHash = txs[0].data.unsignedTxHash
    txs.forEach(({ multisigData, inputUtxos, externalOutputs, data }, i) => {
      if (!multisigData) throw new Error(`Cannot combine signed multisig tx ${i} because multisigData is ${multisigData}`)
      if (!inputUtxos) throw new Error(`Cannot combine signed multisig tx ${i} because inputUtxos field is missing`)
      if (!externalOutputs) throw new Error(`Cannot combine signed multisig tx ${i} because externalOutputs field is missing`)
      if (data.unsignedTxHash !== unsignedTxHash) throw new Error(`Cannot combine signed multisig tx ${i} because unsignedTxHash is ${data.unsignedTxHash} when expecting ${unsignedTxHash}`)
      if (!data.partial) throw new Error(`Cannot combine signed multisig tx ${i} because partial is ${data.partial}`)
    })

    const baseTx = txs[0]
    const baseTxMultisigData = baseTx.multisigData!
    let updatedMultisigData = baseTxMultisigData

    let combinedPsbt = this.deserializeSignedTxPsbt(baseTx)
    for (let i = 1; i < txs.length; i++) {
      if (isMultisigFullySigned(updatedMultisigData)) {
        this.logger.debug('Already received enough signatures, not combining')
        break
      }
      const tx = txs[i]
      const psbt = this.deserializeSignedTxPsbt(tx)
      combinedPsbt.combine(psbt)
      updatedMultisigData = this.combineMultisigData(updatedMultisigData, tx.multisigData!)
    }

    return this.updateSignedMultisigTx(baseTx, combinedPsbt, updatedMultisigData)
  }

  async signTransaction(tx: BitcoinUnsignedTransaction): Promise<BitcoinSignedTransaction> {
    const partiallySignedTxs = await Promise.all(this.signers.map((signer) => signer.signTransaction(tx)))
    return this.combinePartiallySignedTransactions(partiallySignedTxs)
  }

  getSupportedAddressTypes(): AddressType[] {
    return [
      AddressType.MultisigLegacy,
      AddressType.MultisigSegwitNative,
      AddressType.MultisigSegwitP2SH,
    ]
  }
}

export default MultisigBitcoinPayments

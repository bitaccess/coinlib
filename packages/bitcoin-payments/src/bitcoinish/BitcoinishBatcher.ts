import { FeeOption, FeeLevel, ResolvedFeeOption } from '@faast/payments-common'
import { BitcoinishUnsignedTransaction, BatchTransferParameter, BatchTransactionOptions, UtxosOptionsByAddress, UtxoOptions } from './types'
import { BitcoinishPaymentsUtils } from './BitcoinishPaymentsUtils'
import { groupByField, estimateBitcoinTxSize } from './utils';
import { BitcoinishPayments } from './BitcoinishPayments'
import { CreateTransactionOptions } from '../../../payments-common/src/types';

export abstract class BitcoinishBatcher extends BitcoinishPaymentsUtils {

  /** Helper fn for createBatchTransaction. Expects all transfers to be from the same address and signer */
  private async createIntermediateTranscation(
    transfers: BatchTransferParameter[],
    options: CreateTransactionOptions,
  ) {
    const firstTransfer = transfers[0]
    const { fromAddress, signerIndex, paymentsInstance } = firstTransfer

    if (!(paymentsInstance instanceof BitcoinishPayments
        && paymentsInstance.coinSymbol !== this.coinSymbol)) {
      throw new Error(`Expected paymentsInstance to be instanceof BitcoinishPayments for coin ${this.coinSymbol}`)
    }
    if (transfers.length > 0) { // multi output case
      // validate all transfers
      transfers.slice(1).forEach((t, i) => {
        if (t.fromAddress !== fromAddress) {
          throw new Error('All transfers passed into createIntermediateTransaction must have the same fromAddress')
        }
        if (t.signerIndex !== signerIndex) {
          throw new Error(`All transfers from address ${fromAddress} must have the same signerIndex (${signerIndex})`)
        }
        if (t.paymentsInstance !== paymentsInstance) {
          throw new Error(`All transfers from address ${fromAddress} must have the same paymentsInstance`)
        }
        if (t.amount === 'max') {
          throw new Error(
            `Cannot have multiple outputs from address ${fromAddress} with amount === 'max' when batching`
          )
        }
      })
      const outputs = transfers.map((t) => ({
        payport: t.toAddress,
        amount: t.amount,
      }))
      return paymentsInstance.createMultiOutputTransaction(
        signerIndex,
        outputs,
        options,
      )
    } else if (firstTransfer.amount === 'max') { // sweep case
      return paymentsInstance.createSweepTransaction(signerIndex, firstTransfer.toAddress, options)
    } else { // send case
      return paymentsInstance.createTransaction(
        signerIndex,
        firstTransfer.toAddress,
        firstTransfer.amount,
        options,
      )
    }
  }

  async createBatchTransaction(
    transfers: BatchTransferParameter[],
    options: BatchTransactionOptions = {},
  ): Promise<BitcoinishUnsignedTransaction> {
    // All intermediate txs must use the same fee rate so the overall tx averages to the target
    const { targetFeeRate, targetFeeRateType } = await this.resolveFeeOption(options)
    const intermediateTxFeeOption = {
      feeLevel: FeeLevel.Custom,
      feeRate: targetFeeRate,
      feeRateType: targetFeeRateType,
    }

    const transfersByFromAddress = groupByField(transfers, 'fromAddress')
    const transfersByToAddress = groupByField(transfers, 'toAddress')

    const fromAddressCount = Object.values(transfersByFromAddress).length
    const estimatedHeaderSize = estimateBitcoinTxSize({}, {}, this.bitcoinjsNetwork)
    const headerFeeDeduction = (1 - (1 / fromAddressCount)) * estimatedHeaderSize * satPerByte

    const intermediateTxs = []
    // Using for loop so intermediate transactions are created serially
    // and server is not hammered by simultaneous requests
    for (let [fromAddress, transfersForAddress] of Object.entries(transfersByFromAddress)) {
      const utxoOptions = (options.utxosByAddress || {})[fromAddress]
      const txOptions = {
        ...intermediateTxFeeOption,
        ...utxoOptions,
      }
      const
      const tx = await this.createIntermediateTranscation(transfersForAddress, txOptions)
      intermediateTxs.push(tx)
    }
  }
}

export default BitcoinishBatcher

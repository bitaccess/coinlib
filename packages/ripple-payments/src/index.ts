import {
  Transaction, TransactionStatus,
} from './types'
import axios from 'axios'
import { isValidAddress } from './utils/address'

export * from './types'

export interface RipplePaymentsOptions {
  apiUrl: string // required
}

export interface CreateTransactionOptions {
  feeRate?: number // base denomination per byte (ie sat/byte)
}

export default class RipplePayments {

  options: RipplePaymentsOptions

  constructor(options: RipplePaymentsOptions) {
    this.options = Object.assign({}, options)
    if (!this.options) {
      this.options.apiUrl = 'http://s1.ripple.com:51234' 
    }
  }

  /**
   * Generate a ripple wallet/keys using the key type 'secp256k1'
   */
  async generateKeys() {
    try {
      const newAccount = await axios.post(this.options.apiUrl, {
        'method': 'wallet_propose',
        'params': [
            {
                'key_type': 'secp256k1'
            }
          ]
        }
      )
      return newAccount.data.result
    } catch(err) {
      throw err
    }
  }

  /**
   * Determine if an address is a valid xrp address
   */
  static isValidAddress(address: string): boolean {
    return isValidAddress(address)
  }

  /**
   * Get an address for the specified index. If `index === 0` the base monero address will be returned.
   * If `index > 0` an integrated address will be returned with `index` used as the payment ID.
   */
  getAddress(index = 0): string {
    // TODO
    return ''
  }

  /**
   * Get the balance of an address. If address is not provided get the balance of the entire
   * account (ie every address).
   *
   * @return The balance formatted as a string in the main denomination (eg "0.125" XRP)
   */
  async getBalance(address: string): Promise<string> {
    try {
      const account = await axios.post(this.options.apiUrl, {
        'method': 'account_info',
        'params': [
            {
                'account': address,
                'strict': true,
                'ledger_index': 'validated'
            }
          ]
        }
      )
      return account.data.result.account_data.Balance
    } catch(err) {
      throw err
    }
  }

  /**
   * Get the status of a transaction.
   */
  async getTransactionStatus(txHash: string): Promise<object> {
    try {
      const tx = await axios.post(this.options.apiUrl, {
        'method': 'tx',
        'params': [
            {
                'transaction': txHash,
                'binary': false
            }
          ]
        }
      )
      return tx.data
    } catch(err) {
      throw err
    }
  }

  /**
   * fetch previous history of an addresses' tx.
   */
  async getAccountTransactions(address: string): Promise<object> {
    try {
      const txs = await axios.post(this.options.apiUrl, {
        'method': 'tx',
        'params': [
          {
            'method': 'account_tx',
            'params': [
                {
                  'account': address,
                  'binary': false,
                  'forward': false,
                  'ledger_index_max': -1,
                  'ledger_index_min': -1,
                }
              ]
            }
          ]
        }
      )
      return txs.data
    } catch(err) {
      throw err
    }
  }

  /**
   * signs a new payment transaction with address `from` to address `to`.
   */
  async signTransaction(
    from: string, to: string, amount: string, secret: string
  ): Promise<string> {
    try {
      const signedTx = await axios.post(this.options.apiUrl, {
        'method': 'sign',
        'params': [
            {
                'offline': false,
                'secret': secret,
                'tx_json': {
                    'Account': from,
                    'Amount': {
                        'currency': 'USD',
                        'issuer': from,
                        'value': amount
                    },
                    'Destination': to,
                    'TransactionType': 'Payment'
                },
                'fee_mult_max': 1000
            }
          ]
        }
      )
      return signedTx.data.result.tx_blob
    } catch (err) {
      throw err
    }
  }

  /**
   * Submits the signed tx
   */
  async submitTransaction (
    txBlob: string
  ) : Promise<any> {
    try {
      const submittedTx = await axios.post(this.options.apiUrl, {
        'method': 'submit',
        'params': [
            {
              'tx_blob': txBlob
            }
          ]
        }
      )
      return submittedTx
    } catch(err) {
      throw err
    }
  }

  /**
   * Creates and signs a new payment transaction sending the entire balance of address `from` to address `to`.
   */
  async createTransaction(
    from: string, to: string, amount: string, secret: string,
  ): Promise<any> {
    try {
      const signedTxBlob = await this.signTransaction(from, to, amount, secret)
      const submittedTx = await this.submitTransaction(signedTxBlob)
      return submittedTx
    } catch (err) {
      throw err
    }
  }

  /**
   * Creates and signs a new payment transaction sending the entire balance of address `from` to address `to`.
   */
  async createSweepTransaction(
    from: string, to: string, secret: string,
  ): Promise<any> {
    try {
      const balance = await this.getBalance(from)
      const tx = await this.createTransaction(from, to, balance, secret)
      return tx
    } catch(err) {
      throw err
    }
  }
}

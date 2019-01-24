import {
  UnsignedTx, SignedTx, TxStatus,
} from './types'

export * from './types'

export interface MoneroPaymentsOptions {
  paymentsNode: string // required
  network?: 'mainnet' | 'stagenet' | 'testnet' // default to mainnet
}

export interface CreateTransactionOptions {
  feeRate?: number // base denomination per byte (ie sat/byte)
}

/**
 * A class that provides the necessary tools for accepting and sending monero payments.
 * Communicates with a [monero payments server](https://bitbucket.org/bitaccess/monero-payments-server/src)
 * for most of the core logic including getting balance, generating txs, and signing txs.
 */
export default class MoneroPayments {

  options: MoneroPaymentsOptions

  constructor(options: MoneroPaymentsOptions) {
    this.options = Object.assign({}, options)
    if (!options.network) {
      options.network = 'mainnet'
    }
  }

  /**
   * Return `true` if `address` is a valid Monero address.
   */
  static isValidAddress(address: string): boolean {
    // TODO
    return false
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
   * Get the balance of an address (or address at `index`). If address is not provided get the balance of the entire
   * account (ie every address).
   *
   * @return The balance formatted as a string in the main denomination (eg "0.125" XMR)
   */
  async getBalance(addressOrIndex?: string | number): Promise<string> {
    // TODO
    return ''
  }

  /**
   * Get the status of a transaction.
   */
  async getTransactionStatus(txId: string): Promise<TxStatus> {
    // TODO
    return null
  }

  /**
   * Create a new payment transaction sending `amount` to from address `from` to address `to`.
   *
   * @param from - The monero address to send from, or an index to pass into getAddress
   * @param to - The monero address of the recipient. To include a payment ID this should be an integrated address
   * @param amount - The amount to send in the main denomination (eg "0.125" XMR)
   * @returns An object representing the unsigned transaction
   */
  async createTransaction(
    from: string | number, to: string, amount: string, options?: CreateTransactionOptions,
  ): Promise<UnsignedTx> {
    // TODO
    return null
  }

  /**
   * Create a new payment transaction sending the entire balance of address `from` to address `to`.
   */
  async createSweepTransaction(
    from: string | number, to: string, options?: CreateTransactionOptions,
  ): Promise<UnsignedTx> {
    // TODO
    return null
  }

  /**
   * Signs the transaction specified by `unsignedTx`.
   *
   * @throws Error if the transaction cannot be signed by this monero account
   */
  async signTransaction(unsignedTx: UnsignedTx): Promise<SignedTx> {
    // TODO
    return null
  }

  /**
   * Broadcasts the transaction specified by `signedTx`. Allows rebroadcasting already sent transactions.
   *
   * @throws Error if the transaction is invalid or not signed
   */
  async broadcastTransaction(signedTx: SignedTx): Promise<void> {
    // TODO
  }
}

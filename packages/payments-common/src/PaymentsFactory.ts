import { BalanceMonitor } from './BalanceMonitor'
import { AnyPayments } from './BasePayments'
import { PaymentsConnectionManager } from './PaymentsConnectionManager'
import { PaymentsUtils } from './PaymentsUtils'
import { BaseConfig } from './types'

/**
 * A factory class for instantiating various payments objects. Includes basic connection management
 * for reusing an established connection across objects.
 */
export abstract class PaymentsFactory<
  C extends BaseConfig = BaseConfig,
  U extends PaymentsUtils = PaymentsUtils,
  P extends AnyPayments<C> = AnyPayments<C>,
  B extends BalanceMonitor = BalanceMonitor
> {
  abstract readonly packageName: string

  /**
   * Should be assigned to a payments connection manager if the package uses some form of connected API
   * that can be shared across instantiated objects.
   * (ie web3 with websockets, Stellar.Server, RippleAPI, etc)
   */
  connectionManager?: PaymentsConnectionManager<any, C>

  /** Instantiate a new Payments object */
  abstract newPayments(config: C): P

  /** Instantiate a new PaymentsUtils object */
  abstract newUtils(config: C): U

  /** true if newBalanceMonitor has been implemented */
  hasBalanceMonitor = false

  /** Instantiate a new BalanceMonitor object. Override this if supported. */
  newBalanceMonitor(c: C): B {
    throw new Error(`${this.packageName} balance monitor not supported`)
  }


  /** Instantiate a Payments object using an existing connection */
  initPayments(config: C): Promise<P> {
    return this.reuseConnection(config, this.newPayments.bind(this))
  }

  /** Instantiate a PaymentsUtils object using an existing connection */
  initUtils(config: C): Promise<U> {
    return this.reuseConnection(config, this.newUtils.bind(this))
  }

  /** Instantiate a BalanceMonitor object using an existing connection */
  initBalanceMonitor(config: C): Promise<B> {
    return this.reuseConnection(config, this.newBalanceMonitor.bind(this))
  }

  private async createConnection<T extends U | P | B>(
    config: C,
    instantiator: (c: C) => T,
  ): Promise<T> {
    const connected = instantiator(config)
    await connected.init()
    return connected
  }

  private async reuseConnection<T extends U | P | B>(
    config: C,
    instantiator: (c: C) => T
  ): Promise<T> {
    if (!this.connectionManager) {
      return this.createConnection(config, instantiator)
    }
    const { getConnection, getConnectionUrl, setConnection, connections } = this.connectionManager
    const url = getConnectionUrl(config)
    if (!url) {
      return this.createConnection(config, instantiator)
    }
    const existingConnection = connections[url]
    if (existingConnection) {
      // connection is cached, pass it to instantiated object
      config = { ...config } // avoid mutating external objects
      setConnection(config, existingConnection)
      return this.createConnection(config, instantiator)
    } else {
      // connection isnt cached yet, get it and add it to cache
      const connected = await this.createConnection(config, instantiator)
      connections[url] = getConnection(connected)
      return connected
    }
  }
}

import { BalanceMonitor } from './BalanceMonitor'
import { AnyPayments } from './BasePayments'
import { PaymentsUtils } from './PaymentsUtils'
import { BaseConfig } from './types'

export interface PaymentsConnectionManager<
  Connection, // connection type
  Config extends BaseConfig, // config for the connection and url
> {
  connections: { [url: string]: Connection }
  getConnection(x: any): Connection
  getConnectionUrl(c: Config): string | string[] | null
  setConnection(c: Config, t: Connection): void
}

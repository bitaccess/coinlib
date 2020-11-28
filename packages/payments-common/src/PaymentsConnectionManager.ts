import { BalanceMonitor } from './BalanceMonitor'
import { AnyPayments } from './BasePayments'
import { PaymentsUtils } from './PaymentsUtils'
import { BaseConfig } from './types'

export interface PaymentsConnectionManager<
  Connection, // connection type
  Connected, // object that holds a connection
  Config extends BaseConfig, // config for the connection and url
> {
  connections: { [url: string]: Connection }
  getConnection: (x: Connected) => Connection
  getConnectionUrl: (c: Config) => string | null
  setConnection: (c: Config, t: Connection) => void
}

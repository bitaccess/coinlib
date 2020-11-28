import { PaymentsConnectionManager } from './PaymentsConnectionManager'
import { AnyPayments } from './BasePayments';
import { BaseConfig } from './types';
import { BalanceMonitor } from './BalanceMonitor';
import { PaymentsUtils } from './PaymentsUtils';

export class StandardConnectionManager<
  Connection, // connection type
  Connected extends { api: Connection, server: string | null | undefined },
  Config extends { api?: Connection, server?: string | null } & BaseConfig,
> implements PaymentsConnectionManager<Connection, Connected, Config> {

  connections = {}

  getConnection(connected: Connected) {
    return connected.api
  }

  getConnectionUrl(config: Config) {
    return config.server || null
  }

  setConnection(config: Config, connection: Connection) {
    return config.api = connection
  }
}

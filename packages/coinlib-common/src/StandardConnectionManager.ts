import { PaymentsConnectionManager } from './PaymentsConnectionManager'
import { AnyPayments } from './BasePayments';
import { BaseConfig } from './types';
import { BalanceMonitor } from './BalanceMonitor';
import { PaymentsUtils } from './PaymentsUtils';

export class StandardConnectionManager<
  Connection,
  Config extends { api?: Connection, server?: string | string[] | null } & BaseConfig,
> implements PaymentsConnectionManager<Connection, Config> {

  connections: { [url: string]: Connection } = {}

  getConnection(connected: any) {
    return connected.api
  }

  getConnectionUrl(config: Config) {
    return config.server || null
  }

  setConnection(config: Config, connection: Connection) {
    config.api = connection
  }
}

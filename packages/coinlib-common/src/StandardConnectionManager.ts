import { BaseConfig, PaymentsConnectionManager } from '@bitaccess/coinlib-types'

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

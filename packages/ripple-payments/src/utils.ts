import { BaseRippleConfig } from './types'
import { RippleAPI } from 'ripple-lib'
import { isString } from 'util'
import { NetworkType } from '@faast/payments-common'
import { DEFAULT_TESTNET_SERVER, DEFAULT_MAINNET_SERVER } from './constants'

export function padLeft(x: string, n: number, v: string): string {
  while (x.length < n) {
    x = `${v}${x}`
  }
  return x
}

export function resolveRippleServer(server: BaseRippleConfig['server'], network: NetworkType): RippleAPI {
  if (typeof server === 'undefined') {
    server = network === NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER
  }
  if (isString(server)) {
    return new RippleAPI({
      server: server,
    })
  } else if (server instanceof RippleAPI) {
    return server
  } else {
    // null server -> offline mode
    return new RippleAPI()
  }
}

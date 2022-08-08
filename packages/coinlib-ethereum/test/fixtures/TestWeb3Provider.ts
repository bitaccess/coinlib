import { DelegateLogger, Logger } from '@bitaccess/ts-common'
import { AbstractProvider } from 'web3-core'
import { JsonRpcPayload, JsonRpcResponse } from 'web3-core-helpers'
import { isEqual } from 'lodash'
import { Mock } from './types'

export class TestWeb3Provider implements AbstractProvider {

  logger: Logger

  constructor(logger: Logger) {
    this.logger = new DelegateLogger(logger, this.constructor.name)
  }

  connected = true
  rpcId: number = 1
  mocks: { [index: number]: { req: JsonRpcPayload, res: JsonRpcResponse} } = {}

  addMock(mock: Mock) {
    const mockId = this.rpcId++
    this.mocks[mockId] = {
      req: {
        ...mock.req,
        id: mockId,
        jsonrpc: '2.0',
      },
      res: {
        ...mock.res,
        id: mockId,
        jsonrpc: '2.0',
      }
    }
    this.logger.log(`Added mock req for id ${mockId}`, mock.req)
  }

  send(payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => void): void {
    const id = payload.id as number
    const mock = this.mocks[id]
    if (!mock) {
      this.logger.log(`Unexpected payload without mock at ${id}`, payload)
      this.rpcId = id + 1
      return callback(new Error(`No mock at id ${id} for ${payload.method}, check logs for details`))
    }
    const expectedRequest = mock.req
    if (!isEqual(payload, expectedRequest)) {
      this.logger.log(`Mock payload mismatch at ${id}\nexpected =`, expectedRequest, '\nactual = ', payload)
      return callback(new Error(`Mock payload mismatch at id ${id} for ${payload.method}, check logs for details`))
    }
    // Add a super small delay so that event handlers can have time to be added before the send resolves
    setTimeout(() => callback(null, mock.res), 10)
  }

  sendAsync(payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => void): void {
    return this.send(payload, callback)
  }
}

import { AbstractProvider } from 'web3-core'
import { JsonRpcPayload, JsonRpcResponse } from 'web3-core-helpers'
import { isEqual } from 'lodash'

export class TestWeb3Provider implements AbstractProvider {

  connected = true
  rpcId: number = 1
  mocks: { [index: number]: { req: object, res: object } } = {}

  addMock(mock: { req: object, res: object }) {
    const mockId = this.rpcId++
    this.mocks[mockId] = {
      req: {
        ...mock.req,
        id: mockId,
      },
      res: {
        ...mock.res,
        id: mockId,
      }
    }
  }

  send(payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => void): void {
    const id = payload.id as number
    const mock = this.mocks[id]
    if (!mock) {
      console.log(`Unexpected request without mock at ${id}`, payload)
      throw new Error(`No mock at id ${id}`)
    }
    const expectedRequest = mock.req
    if (!isEqual(payload, expectedRequest)) {
      console.log(`Expected request at ${id}`, expectedRequest)
      console.log(`Actual request at ${id}`, payload)
      throw new Error(`Mock payload mismatch at id ${id}`)
    }
    callback(null, mock.res as JsonRpcResponse)
  }

  sendAsync(payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => void): void {
    return this.send(payload, callback)
  }
}

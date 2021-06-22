declare module 'ethereum-input-data-decoder' {
  interface DecodeResult {
    method: string
    types: string[]
    inputs: any[]
    names: any[]
  }
  export default class InputDataDecoder {
    constructor(abi: string | object)

    decodeConstructor(data: string | Buffer): DecodeResult
    decodeData(data: string | Buffer): DecodeResult
  }
}

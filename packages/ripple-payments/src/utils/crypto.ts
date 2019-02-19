const jsSHA = require('jssha/src/sha256')
import sjcl from 'sjcl'
import { ALLOWED_CHARS } from '../config'

export const numberToHex = (n: number) => {
  let hex = Math.round(n).toString(16)
  if(hex.length === 1) {
      hex = '0' + hex
  }
  return hex
}

export const toHex = (arrayOfBytes: Buffer) => {
  let hex = ''
  for(let i = 0; i < arrayOfBytes.length; i++) {
      hex += numberToHex(arrayOfBytes[i])
  }
  return hex
}

export const sha256 = (hexString: string) => {
  const sha = new jsSHA('SHA-256', 'HEX')
  sha.update(hexString)
  return sha.getHash('HEX')
}

export const sha256Checksum = (payload: any) => {
  return sha256(sha256(payload)).substr(0, 8)
}
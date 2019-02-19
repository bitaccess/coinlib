import baseX from 'base-x'
import { ALLOWED_CHARS } from '../config'
import { sha256Checksum, toHex } from './crypto'

export const verifyChecksum = (address: string) => {
    const codec = baseX(ALLOWED_CHARS)
    const bytes = codec.decode(address)
    const computedChecksum = sha256Checksum(toHex(bytes.slice(0, -4)))
    const checksum = toHex(bytes.slice(-4))
    return computedChecksum === checksum
}

export const isValidAddress = (address: string) => {
    const regexp = new RegExp('^r[' + ALLOWED_CHARS + ']{27,35}$')
    if (regexp.test(address)) {
        return verifyChecksum(address)
    }
    return false
}
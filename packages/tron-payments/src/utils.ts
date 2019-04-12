/** Converts strings to Error */
export function toError(e: any): any {
  if (typeof e === 'string') {
    return new Error(e)
  }
  return e
}

export function toMainDenominationNumber(amountSun: number | string): number {
  return (typeof amountSun === 'number' ? amountSun : Number.parseInt(amountSun)) / 1e6
}

export function toMainDenomination(amountSun: number | string): string {
  return toMainDenominationNumber(amountSun).toString()
}

export function toBaseDenominationNumber(amountTrx: number | string): number {
  return (typeof amountTrx === 'number' ? amountTrx : Number.parseFloat(amountTrx)) * 1e6
}

export function toBaseDenomination(amountTrx: number | string): string {
  return toBaseDenominationNumber(amountTrx).toString()
}

export function isValidXprv(xprv: string): boolean {
  return xprv.startsWith('xprv')
}

export function isValidXpub(xpub: string): boolean {
  return xpub.startsWith('xpub')
}

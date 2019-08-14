/** Converts strings to Error */
export function toError(e: any): any {
  if (typeof e === 'string') {
    return new Error(e)
  }
  return e
}

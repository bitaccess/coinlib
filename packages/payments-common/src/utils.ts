import { Reporter } from 'io-ts/lib/Reporter'
import { Context, getFunctionName, ValidationError, UnionType, IntersectionType, Type } from 'io-ts'

export { PathReporter } from 'io-ts/lib/PathReporter'

function stringify(v: any): string {
  if (typeof v === 'function') {
    return getFunctionName(v)
  }
  if (typeof v === 'number' && !isFinite(v)) {
    if (isNaN(v)) {
      return 'NaN'
    }
    return v > 0 ? 'Infinity' : '-Infinity'
  }
  return JSON.stringify(v)
}

function getContextPath(context: Context): string {
  return context
    .filter(({ type }, i) => {
      if (i === 0) return true
      const previousType = context[i - 1].type
      return !(previousType instanceof UnionType || previousType instanceof IntersectionType)
    })
    .map(({ key, type }) => (key ? key : type.name))
    .join('.')
}

function getMessage(e: ValidationError): string {
  const expectedType = e.context[e.context.length - 1].type.name
  const contextPath = getContextPath(e.context)
  const expectedMessage = expectedType !== contextPath ? `${expectedType} for ${contextPath}` : expectedType
  return e.message !== undefined ? e.message : `Expected type ${expectedMessage}, but got: ${stringify(e.value)}`
}

export const SimpleReporter: Reporter<Array<string>> = {
  report: validation => validation.fold(es => es.map(getMessage), () => ['No errors!'])
}

/**
 * Throws a type error if `value` isn't conformant to type `T`.
 *
 * @param typeCodec - An io-ts type codec for T
 * @param value - The value to check
 * @returns The decoded value
 * @throws TypeError when assertion fails
 */
export function assertType<T>(typeCodec: Type<T>, value: unknown, description: string = 'type'): T {
  const validation = typeCodec.decode(value)
  if (validation.isLeft()) {
    throw new TypeError(`Invalid ${description} - ${SimpleReporter.report(validation)[0]}`)
  }
  return validation.value
}

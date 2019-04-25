import * as t from 'io-ts'
import { isEmptyObject } from '#/utils';

/**
 * Creates an io-ts runtime type based off a typescript enum `e`
 */
export function enumCodec<E>(e: Object, name: string): t.Type<E> {
  const keyed: { [k: string]: null } = {}
  Object.values(e).forEach(v => {
    keyed[v] = null
  })
  return t.keyof(keyed, name) as any
}

/**
 * Creates a codec for an object with required and optional params using an intersection
 * codec.
 *
 * @param required The required attributes
 * @param optional The optional attributes
 * @param name The name of the type
 */
export function requiredOptionalCodec<A extends t.Props, B extends t.Props>(required: A, optional: B, name: string) {
  return t.intersection([t.type(required, `${name}Req`), t.partial(optional, `${name}Opt`)], name)
}

/**
 * Extends a codec with additional required and optional attributes
 *
 * @param parent The type to extend
 * @param required The required props to add
 * @param optional The optional props to add
 * @param name The name of the type
 */
export function extendCodec<P extends t.Mixed>(
  parent: P, required: {}, name: string,
): P
export function extendCodec<P extends t.Mixed, R extends t.Props>(
  parent: P, required: R, name: string,
): t.IntersectionC<[P, t.TypeC<R>]>
export function extendCodec<P extends t.Mixed>(
  parent: P, required: {}, optional: {}, name: string,
): P
export function extendCodec<P extends t.Mixed, O extends t.Props>(
  parent: P, required: {}, optional: O, name: string,
): t.IntersectionC<[P, t.PartialC<O>]>
export function extendCodec<P extends t.Mixed, R extends t.Props>(
  parent: P, required: R, optional: {}, name: string,
): t.IntersectionC<[P, t.TypeC<R>]>
export function extendCodec<P extends t.Mixed, R extends t.Props, O extends t.Props>(
  parent: P, required: R, optional: O, name: string,
): t.IntersectionC<[P, t.TypeC<R>, t.PartialC<O>]>
export function extendCodec<P extends t.Mixed, R extends t.Props, O extends t.Props>(
  parent: P, required: R | {}, optional: O | {} | string, name?: string,
): any {
  if (typeof optional === 'string') {
    name = optional
    optional = {}
  }
  const noRequired = isEmptyObject(required)
  const noOptional = isEmptyObject(optional)
  const nameOpt = `${name}Opt`
  const nameReq = `${name}Req`
  if (noRequired && noOptional) {
    return parent
  }
  if (noRequired) {
    return t.intersection([parent, t.partial(optional, nameOpt)], name)
  }
  if (noOptional) {
    return t.intersection([parent, t.type(required, nameReq)], name)
  }
  return t.intersection([parent, t.type(required, nameReq), t.partial(optional, nameOpt)], name)
}

export const nullable = <T extends t.Mixed>(codec: T) => t.union([codec, t.null], `${codec.name}Nullable`)
export const optional = <T extends t.Mixed>(codec: T) => t.union([codec, t.undefined], `${codec.name}Optional`)

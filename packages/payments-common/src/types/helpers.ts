import * as t from 'io-ts'

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
 * Extends a codec with additional required and optional attributes
 *
 * @param parent The type to extend
 * @param required The required props to add
 * @param optional The optional props to add
 * @param name The name of the type
 */
export function extend<P extends t.Mixed, R extends t.Props, O extends t.Props>(
  parent: P, required: R, optional: O, name: string,
) {
  return t.intersection(
    [
      parent,
      t.type(required, `${name}Req`),
      t.partial(optional, `${name}Opt`),
    ],
    name,
  )
}

export const nullable = <T extends t.Mixed>(codec: T) => t.union([codec, t.null], `${codec.name}Nullable`)

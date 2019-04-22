import * as t from 'io-ts';
export declare function enumCodec<E>(e: Object, name: string): t.Type<E>;
export declare function extend<P extends t.Mixed, R extends t.Props, O extends t.Props>(parent: P, required: R, optional: O, name: string): t.IntersectionC<[P, t.TypeC<R>, t.PartialC<O>]>;
export declare const nullable: <T extends t.Mixed>(codec: T) => t.UnionC<[T, t.NullC]>;

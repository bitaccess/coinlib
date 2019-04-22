import * as t from 'io-ts'

export class DateType extends t.Type<Date, Date, unknown> {
  readonly _tag: 'DateType' = 'DateType'
  constructor() {
    super(
      'Date',
      (u): u is Date => u instanceof Date,
      (u, c) => (this.is(u) ? t.success(u) : t.failure(u, c)),
      t.identity
    )
  }
}

export interface DateC extends DateType {}
export const DateT: DateC = new DateType()

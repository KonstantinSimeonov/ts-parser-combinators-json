export type Parser<T> = (ctx: Context) => Result<T>

export type Context = Readonly<{
  text: string
  index: number
}>

type Result<T> = Success<T> | Failure

type Success<T> = Readonly<{
  success: true
  value: T
  ctx: Context
}>

type Failure = Readonly<{
  success: false
  expected: string
  ctx: Context
}>

export const success = <T>(ctx: Context, value: T): Success<T> => ({
  success: true,
  value,
  ctx,
})

export const failure = (ctx: Context, expected: string): Failure => ({
  success: false,
  expected,
  ctx,
})

export const context = (text: string) => ({ text, index: 0 })

export const literal =
  <Str extends string>(match: Str): Parser<Str> =>
  (ctx: Context) =>
    ctx.text.slice(ctx.index).startsWith(match)
      ? success({ ...ctx, index: ctx.index + match.length }, match)
      : failure(ctx, match)

export const regex =
  (regex: RegExp): Parser<string> =>
  (ctx: Context) => {
    const string = ctx.text.slice(ctx.index)
    const match = string.match(regex)
    if (match?.index !== 0) return failure(ctx, regex.toString())

    const [value] = match
    const index = ctx.index + value.length
    return success({ ...ctx, index }, value)
  }

export const any =
  <T>(parsers: readonly Parser<T>[]): Parser<T> =>
  (ctx: Context) => {
    for (const parser of parsers) {
      const result = parser(ctx)
      if (result.success) return success(result.ctx, result.value)
    }

    return failure(ctx, "no parser matched")
  }

export const repeat =
  <T>(parser: Parser<T>): Parser<T[]> =>
  (ctx: Context) => {
    let values: T[] = []
    let next_ctx = ctx
    for (;;) {
      const result = parser(next_ctx)
      if (!result.success) return success(next_ctx, values)

      values.push(result.value)
      next_ctx = result.ctx
    }
  }

export const optional =
  <T>(parser: Parser<T>) =>
  (ctx: Context): Success<T | null> => {
    const result = parser(ctx)
    return success(result.ctx, result.success ? result.value : null)
  }

type UnwrapParser<P> = P extends Parser<infer Result> ? Result : never

type UnwrapParserTuple<ParserTuple> = ParserTuple extends readonly [
  infer P,
  ...infer Rest
]
  ? [UnwrapParser<P>, ...UnwrapParserTuple<Rest>]
  : []

export const sequence =
  <T extends readonly Parser<any>[]>(
    parsers: T
  ): Parser<UnwrapParserTuple<T>> =>
  (ctx: Context) => {
    const values: unknown[] = []
    let next_ctx = ctx
    for (const parser of parsers) {
      const result = parser(next_ctx)
      if (!result.success) return result

      values.push(result.value)
      next_ctx = result.ctx
    }

    return success(next_ctx, values as UnwrapParserTuple<T>)
  }

export const map =
  <T, R>(parser: Parser<T>, fn: (x: T) => R): Parser<R> =>
  (ctx: Context) => {
    const result = parser(ctx)
    return result.success
      ? success(result.ctx, fn(result.value))
      : failure(result.ctx, result.expected)
  }

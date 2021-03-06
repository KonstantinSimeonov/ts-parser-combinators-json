import {
  regex,
  literal,
  sequence,
  map,
  any,
  Parser,
  repeat,
  optional,
  failure,
  success,
} from "./index"

export type PrimitiveJsonValue =
  | string
  | number
  | boolean
  | null

export type JsonObject = { [k: string]: JsonValue }

export type JsonValue =
  | PrimitiveJsonValue
  | JsonValue[]
  | JsonObject

const int_parser = map(regex(/\d+/), parseInt)

const float_parser: Parser<number> = ctx => {
  const result = regex(/[\d\.e\-\+]+/)(ctx)
  if (!result.success) return result

  const float = parseFloat(result.value)
  return Number.isNaN(float)
    ? failure(result.ctx, "float")
    : success(result.ctx, float)
}

export const number_parser = any([float_parser, int_parser])

export const string_parser: Parser<string> = ctx => {
  if (ctx.text[ctx.index] !== `"`) return failure(ctx, `"`)
  let value = ``

  let i = ctx.index + 1
  for (; i < ctx.text.length; ++i) {
    if (ctx.text[i] === `"`) return success({ ...ctx, index: i + 1 }, value)
    if (ctx.text[i] !== `\\`) value += ctx.text[i]
    else if (i < ctx.text.length - 1) {
      value += ctx.text[i + 1]
      ++i
    }
  }

  return failure({ ...ctx, index: i }, "closing quote")
}

export const bool_parser = map(regex(/true|false/), bool => bool === "true")

export const null_parser = map(literal("null"), () => null)

export const primitive_parser = any<PrimitiveJsonValue>([
  number_parser,
  bool_parser,
  string_parser,
  null_parser,
])

export const array_member_parser: Parser<JsonValue> = any<JsonValue>([
  ctx => object_parser(ctx),
  ctx => array_parser(ctx),
  primitive_parser,
])

export const array_members_parser: Parser<JsonValue[]> = repeat(
  map(
    sequence([
      regex(/\s*/),
      array_member_parser,
      regex(/\s*/),
      optional(literal(",")),
    ] as const),
    ([, member]) => member
  )
)

export const array_parser: Parser<JsonValue[]> = map(
  sequence([literal("["), array_members_parser, literal("]")] as const),
  ([, values]) => values
)

export const key_value_pair_parser: Parser<[key: string, value: JsonValue]> =
  map(
    sequence([
      regex(/\s*/),
      string_parser,
      regex(/\s*:\s*/),
      ctx => json_parser(ctx),
      regex(/\s*/),
      optional(literal(",")),
    ] as const),
    ([, key, , value]) => [key, value]
  )

export const object_parser: Parser<JsonObject> = map(
  sequence([
    literal("{"),
    repeat(key_value_pair_parser),
    literal("}"),
  ] as const),
  ([, kvps]) => Object.fromEntries(kvps)
)

export const json_parser: Parser<JsonValue> = any<JsonValue>([
  object_parser,
  array_parser,
  primitive_parser
])

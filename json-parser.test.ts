import * as jp from "./json-parser"
import * as fc from "fast-check"
import { context, Parser } from "./index"

function assert(condition: any, msg?: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${msg}`)
}

const assert_can_parse = <T extends any, R>(
  message: string,
  arbitrary: fc.Arbitrary<T>,
  parser: Parser<R>
) => {
  it(`can parse ${message}`, () => {
    fc.assert(
      fc.property(arbitrary, value => {
        const json = JSON.stringify(value)
        const result = parser(context(json))
        assert(
          result.success,
          `expected success: true, but got: ${JSON.stringify(result, null, 4)}`
        )
        const actual = JSON.stringify(result.value)
        assert(actual === json, `expected ${actual} to equal ${json}`)
      })
    )
  })
}

const num = fc.oneof(fc.integer(), fc.float().filter(Number.isFinite))

const primitives = fc.oneof(
  fc.string({ maxLength: 100 }),
  fc.boolean(),
  fc.constant(null),
  num
)

const anything = fc
  .anything()
  .filter(x => typeof x !== "number" || Number.isFinite(x))

assert_can_parse(`numbers`, num, jp.number_parser)

assert_can_parse(`strings`, fc.string({ maxLength: 100 }), jp.string_parser)

assert_can_parse(`arrays of primitives`, fc.array(primitives), jp.array_parser)

assert_can_parse(
  `objects of primitives`,
  fc.object({ values: [primitives] }),
  jp.object_parser
)

assert_can_parse(`arrays`, fc.array(anything), jp.array_parser)

assert_can_parse(`objects`, fc.object({ values: [anything] }), jp.object_parser)

assert_can_parse(`any json`, fc.jsonValue(), jp.json_parser)

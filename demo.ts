import * as jp from "./json-parser"

console.log(
  jp.object_parser({
    text: JSON.stringify(
      {
        xs: [1, 2, "hello there", ["kekw", 123123], null, true, false],
        test: 5,
        hellow: false,
      },
      null,
      4
    ),
    index: 0,
  }) as any
)

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseJSON, stringifyJSON } from "../src/lib/json.ts";

describe("lib/json", () => {
  it("parseJSON: devuelve fallback en null/undefined", () => {
    assert.deepEqual(parseJSON(null, []), []);
    assert.deepEqual(parseJSON(undefined, { a: 1 }), { a: 1 });
  });

  it("parseJSON: devuelve fallback en JSON inválido", () => {
    assert.deepEqual(parseJSON("not-json", ["x"]), ["x"]);
  });

  it("parseJSON: parsea arrays y objetos correctamente", () => {
    assert.deepEqual(parseJSON("[1,2,3]", []), [1, 2, 3]);
    assert.deepEqual(parseJSON('{"a":1}', {}), { a: 1 });
  });

  it("stringifyJSON: round-trip con parseJSON", () => {
    const input = { name: "QYRO", tags: ["a", "b"] };
    const round = parseJSON(stringifyJSON(input), null);
    assert.deepEqual(round, input);
  });

  it("stringifyJSON: serializa null como 'null'", () => {
    assert.equal(stringifyJSON(null), "null");
    assert.equal(stringifyJSON(undefined), "null");
  });
});

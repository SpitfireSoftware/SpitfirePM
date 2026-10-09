const test = require("node:test");
const assert = require("node:assert/strict");
const { normalize } = require("../scripts/update-swagger.js");

test("normalize sorts paths and schema names but leaves schema contents alone", () => {
    const doc = normalize({
        openapi: "3.0.0",
        paths: { "/api/zeta": { get: {} }, "/api/alpha": { post: {} } },
        components: { schemas: { Zed: { properties: { b: {}, a: {} } }, Alpha: {} } },
    });
    assert.deepEqual(Object.keys(doc.paths), ["/api/alpha", "/api/zeta"]);
    assert.deepEqual(Object.keys(doc.components.schemas), ["Alpha", "Zed"]);
    assert.deepEqual(Object.keys(doc.components.schemas.Zed.properties), ["b", "a"]);
});

test("normalize also handles a swagger 2 definitions block", () => {
    const doc = normalize({ swagger: "2.0", paths: {}, definitions: { B: {}, A: {} } });
    assert.deepEqual(Object.keys(doc.definitions), ["A", "B"]);
});

test("normalize refuses a document without paths so the snapshot is never overwritten with junk", () => {
    assert.throws(() => normalize({ message: "login required" }), /paths/);
    assert.throws(() => normalize(null), /paths/);
});

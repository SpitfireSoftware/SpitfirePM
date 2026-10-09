// Refreshes the committed OpenAPI snapshot (swagger/v23.json) that `npm run generate` reads.
//
//   npm run swagger:update            fetches the dev site's swagger document
//   npm run swagger:update -- <url>   fetches another site's document
//   npm run swagger:update -- <path>  re-normalizes a local file (used by the tests)
//
// The document is written pretty-printed with the `paths` and schema keys sorted, so that a
// refresh diffs as the API changed rather than as the server happened to enumerate it. Nothing
// below those keys is reordered on purpose: property order inside a schema is what the generator
// emits. (JavaScript itself orders integer-like keys numerically, so the response-code keys of
// every operation come out ascending; the generated status branches are exclusive, so that only
// changes the order of a few union types in the output.)
// The file is replaced only after the whole document has been fetched and parsed; a non-200
// response, a non-JSON body or a document without `paths` leaves the snapshot untouched.
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_URL = "https://dev.spitfirepm.com:8443/SFPMS/swagger/v23/swagger.json";
const TARGET = path.join(__dirname, "..", "swagger", "v23.json");

function sortedCopy(obj) {
    const result = {};
    for (const key of Object.keys(obj).sort()) result[key] = obj[key];
    return result;
}

/** Sorts the top-level keys of paths and of the schema collection; everything else is left as served. */
function normalize(document) {
    if (!document || typeof document !== "object" || !document.paths || typeof document.paths !== "object") {
        throw new Error("document has no `paths` object; refusing to overwrite the snapshot");
    }
    document.paths = sortedCopy(document.paths);
    if (document.definitions && typeof document.definitions === "object") {            // swagger 2
        document.definitions = sortedCopy(document.definitions);
    }
    if (document.components && document.components.schemas && typeof document.components.schemas === "object") { // openapi 3
        document.components.schemas = sortedCopy(document.components.schemas);
    }
    return document;
}

async function load(source) {
    if (/^https?:\/\//i.test(source)) {
        const response = await fetch(source, { headers: { Accept: "application/json" } });
        if (response.status !== 200) throw new Error(`${source} answered HTTP ${response.status} ${response.statusText}`);
        const text = await response.text();
        return parse(text, source);
    }
    return parse(fs.readFileSync(source, "utf8"), source);
}

function parse(text, source) {
    try {
        return JSON.parse(text);
    } catch (err) {
        throw new Error(`${source} is not JSON: ${err.message}`);
    }
}

function writeAtomically(target, content) {
    const temp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(temp, content);
    fs.renameSync(temp, target);
}

async function main() {
    const source = process.argv[2] || DEFAULT_URL;
    const document = normalize(await load(source));
    const content = JSON.stringify(document, null, 2) + "\n";
    const before = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, "utf8") : null;
    if (before === content) {
        console.log(`swagger/v23.json unchanged (${Object.keys(document.paths).length} paths from ${source})`);
        return;
    }
    writeAtomically(TARGET, content);
    console.log(`swagger/v23.json updated: ${Object.keys(document.paths).length} paths from ${source}; review with git diff`);
}

module.exports = { normalize };

if (require.main === module) {
    main().catch((err) => {
        console.error(`swagger:update failed: ${err.message}`);
        process.exit(1);
    });
}

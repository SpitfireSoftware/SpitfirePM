// Generates src/version.ts from the version in package.json.
// Runs automatically before "npm run build" via the prebuild script.
const fs = require("fs");
const path = require("path");

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
const target = path.join(__dirname, "..", "src", "version.ts");
const content = `// Generated from package.json by scripts/genversion.js -- do not edit, do not import from anywhere but sfRESTClient.ts
export const ClientPackageVersion: string = "${pkg.version}";
`;

// only rewrite when the version changed, so tsc incremental builds are not disturbed
if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content) {
    fs.writeFileSync(target, content);
    console.log(`genversion: src/version.ts set to ${pkg.version}`);
}

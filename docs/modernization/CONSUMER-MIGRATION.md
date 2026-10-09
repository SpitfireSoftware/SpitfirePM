# Taking the native-promise / fetch version of `spitfirepm`

What changes for each consumer when it moves to the first version published from the
`modernize/native-promises-fetch` branch. Nothing here changes a success-path value of a public method;
the list is what a build or a code review has to look at.

## What changed in the package

| Area | Before | Now |
|---|---|---|
| Generated clients (`dist/SwaggerClients`) | `jQuery.ajax`, `import * as jQuery from 'jquery'` | `fetch` (NSwag Fetch template); no jQuery import |
| Generated constructor | `new XClient(baseUrl?)` | `new XClient(baseUrl?, http?)` — `http` is an optional `{ fetch }` (tests inject a fake) |
| `baseUrl` on a generated client | public field | **private** (so is `http`) |
| `client.beforeSend` | per-class `any`, received the jqXHR | on `APIClientBase`, typed `(xhr: SFBeforeSendRequest) => void`; the argument only has `setRequestHeader(name, value)` |
| Endpoint result types | inferred `Promise<T>` | explicit `Promise<T>`, same `T` for all 444 endpoints |
| Non-2xx rejection | parsed body or `ApiException` | **unchanged** |
| Network failure rejection | `ApiException` with `status === 0` | `TypeError` from fetch |
| 22 `HttpResponseMessage` endpoints documented as octet-stream | parsed JSON, `any` | **unchanged** (generator keeps them JSON/`any`; see FINDINGS §3.1) |
| Date revival | only for clients built without a base URL | **unchanged** (B1 preserved) |
| `GAMonitorSend`, `GA4MonitorSend`, `GAMonitorEvent`, `GAAPIEvent` | `JQuery.Promise` | native `Promise<any>`; never reject |
| `LoadUCFunctionMap` (protected) | `JQueryPromise` | `Promise`; never rejects |
| `_GetAPIXHR` (protected) | returned a jqXHR | renamed `_GetAPIJSON`, resolves `{ status, data }` |
| `setImgSrc` / `requestImgPath` (protected) | jqXHR / `JQuery.Promise<string>` | `Promise<string>` |
| `PageServerPingBackFailed` (protected) | `jqXHR: string \| JQueryXHR` | `failure: string \| Response \| unknown` |
| `BuildViewModelForContext`, `GetLookupResults` | never settled on failure | **reject** on failure |
| `RuleResult` | never settled on failure | resolves the `defaultValue` argument on failure |
| `GetDV` (batched path) | never settled when the batch failed | resolves `null` |
| `PopDoc` / `PopNewDoc` / `OpenProject` | never settled when a lookup failed | resolve `null` |
| `CheckPermit`, `GetPagePartPermits`, `UploadFile`, `AssureJQUITools`, `AddCachedScript` | could hang on failure | always settle (see commit messages for the values) |
| `SharePageContext` | `true` even when a `Doc*` key was ignored | `false` in that case (keys still applied as before) |
| `dist/main.*` | shipped (dead) | removed |
| `localforage` | listed dependency, unused | removed |
| `jquery` | not declared | `peerDependencies: { jquery: ">=3.7" }` (npm 7+ installs it automatically) |
| `typescript` used to build | whatever was global | 6.0.3 (devDependency); `npm ci` is reproducible (`package-lock.json` is tracked) |

Everything jQuery-UI, SignalR, DOM, `sfPMSHubSignal.*` events, `sfClient.SetWCC_*` events, `exports.$`,
`window.sfClient`/`top.sfClient` bootstrap, synchronous helpers and jQuery-element signatures are unchanged.

## PowerUX

1. **Retype the three `beforeSend` hooks** (`sources/models/main.ts:209`, `:333`, `:425`). They are
   written as `(xhr: JQueryXHR) => ...` and only call `xhr.setRequestHeader(...)`. Under
   `strictFunctionTypes` that annotation no longer assigns to the hook's type. Change the parameter type
   to `SFBeforeSendRequest` (exported from `spitfirepm/dist/APIClientBase`) or drop the annotation and let
   it infer. Behaviour is identical: the header lands on the fetch request.
2. **Grep for `.baseUrl` on client instances.** It is private now; nothing in the library reads it. If
   PowerUX does, read `sfApplicationRootPath` (`spitfirepm/dist/string.extensions`) instead.
3. **Error shape.** Any `catch` that distinguishes a network failure by `reason.status === 0` must also
   accept `reason instanceof TypeError`. Typed non-2xx rejections (parsed body, or `ApiException` with
   `status`) are unchanged. Server-side 5xx with an HTML body still rejects with a `SyntaxError` from
   `JSON.parse`, as before.
4. **`jquery` in the bundle.** `SwaggerClients` no longer imports it. If nothing else in PowerUX imports
   `jquery` (SignalR's script tag does not count), Vite will stop bundling it; `sfRESTClient` still expects
   the global `$`/`jQuery` the page provides. Keep the global; drop the import only if it is unused.
5. **Promises that now settle.** Code that awaited `BuildViewModelForContext`, `GetLookupResults`,
   `RuleResult`, `PopDoc`, `CheckPermit`, `UploadFile` could never see a failure before. It can now:
   rejections for the first two, `null`/default/`0`/`error` for the rest. Review the `catch`-less call sites
   (grep `BuildViewModelForContext(` and `GetLookupResults(`) and add a `.catch` where a rejection would
   otherwise surface as an unhandled rejection in the console.
6. `GAMonitorEvent` / `GAEvent` return values were never used; no change needed.
6a. **`Property '$' does not exist on type 'Window'`** (seen in `modules/dynamicForm/dynamicForm.ts` on
   `top.$`). The `Window.$`/`sfClient`/`sfPMSHub` augmentations live in `dist/globals.d.ts` and only reach a
   file whose program loads that declaration. Add it to `tsconfig.json` once rather than importing per file:
   `"include": ["sources/**/*", "node_modules/spitfirepm/dist/globals.d.ts"]`. Vite does not type-check,
   so this shows in `tsc --noEmit` and the editor, not in `vite build`. Under TypeScript 6 also list
   `"types": ["jquery"]`, because `types` now defaults to none and `JQueryStatic` would lose its call signatures.
7. Rebuild and run the type check (`vite build` / `tsc --noEmit`) before testing the three login paths,
   a document, a grid with batched DVs, an upload and a logout/login as another user.

## sfPMS (classic pages)

1. **No call-site changes.** Classic code already treats library results as native promises
   (`.then`); the Deferred bridges in `cscript/Util.js` and jqUtility keep working because a native promise
   is thenable.
2. **`dscript/npmLoader.js`**: the `"jquery"` branch of the stub `require` becomes unused
   (`SwaggerClients.js` no longer calls `require('jquery')`). Leave it; it costs nothing and protects an
   older package. `PageClass.vb:2116` file list (`string.extensions.js, APIClientBase.js, SwaggerClients.js,
   BrowserExtensionChecker.js, sfRestClient.js`) is unchanged; `main.js` was never in it.
3. **Shared global scope.** `test/classic-load.test.js` replays that loader in jsdom and would fail on a
   duplicate top-level identifier across the five files. One less global now: the old `SwaggerClients.js`
   declared a top-level `const jQuery` (shadowing `window.jQuery` inside the page's lexical scope).
4. **`tscript/globals.ts`** redeclares about 15 `Window` augmentations; nothing in `globals.ts` changed, so
   `npx tsc` in `sfPMS/tscript` should still report zero errors. Run it to confirm.
5. **Fetch on classic pages.** The generated clients use `window.fetch` with default credentials
   (`same-origin`), the same cookie behaviour `jQuery.ajax` had. The server does not inspect
   `X-Requested-With` (jQuery set it; fetch does not).
6. `dscript/sfRestClientTest.js` is already dead and does not need updating.
7. Smoke test on a classic page: `top.sfClient` exists; a DV lookup; a permit check; a file upload over and
   under the chunk limit (8 MB default); a SignalR notification; the support panel (`InvokeSupportPanel`).

## Client Code add-ins

- No change required. Add-ins call `top.sfClient.*` methods whose success values are unchanged, and the
  `.done` contract they rely on comes from the sfPMS shims, not from this library.
- `VBBCheckReqBodyHelper.js:66` calls a method that no longer exists (unrelated to this change; it was
  already broken).
- `exports.$` and the generated client constructors (`new exports.SessionClient()`) are unchanged.

## Publishing checklist (Stan, local)

1. `npm ci && npm run build && npm test` (41 tests, includes the classic-load smoke test).
2. `Copy NPM Binary to PowerUX for testing.cmd`, then the PowerUX and sfPMS checks above.
3. Bump the version and publish as usual; the generator is now `npm run swagger:update && npm run generate`
   (needs the .NET 10 SDK; first run restores NSwag 14.6.3 from NuGet).

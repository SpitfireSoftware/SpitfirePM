# SpitfireNPM modernization: native promises, fetch transport, debt scan

## Context

`spitfirepm` (repo `D:\SpitfireDev\npmSpitfirePM`, GitHub `SpitfireSoftware/SpitfirePM`, public) was built for the
classic jQuery UI and has had several authors. Goals: make jQuery less central, finish the move from jQuery-style
promises to native promises, and scan for bugs and tech debt.

A survey of the library and all three consumers (sfPMS, PowerUX, Client Code) changed the shape of the work:

- **The public API is already native-Promise.** No consumer calls `.done/.fail/.always/$.when` on anything the
  library returns. No jQuery-promise compatibility shim is needed. The `.done` contract that Client Code add-ins
  rely on belongs to classic shims in sfPMS (`cscript/Util.js`, jqUtility `getDV`), not to this library.
- **What is left of jQuery promises is internal:** 9 `$.Deferred`, 4 hand-written `$.ajax`/`$.getJSON`, about 10
  protected/GA methods typed `JQuery.Promise`/`JQueryXHR`.
- **The biggest jQuery block is generated.** All 444 endpoints in `src/SwaggerClients.ts` wrap `jQuery.ajax`
  because the generator uses NSwag's `JQueryPromises` template. Switching to the `Fetch` template removes it.
- **The real confusion and bugs are promises that never settle** on failure paths (about a dozen), plus mixed
  Deferred/native bridging.
- jQuery cannot be removed: SignalR 2.4.3, jQuery UI dialogs/autocomplete, the `sfPMSHubSignal.*` event bus, and
  `exports.$` (used by add-ins) all stay.

Decisions already made by Stan:
1. Cloud session changes **the library only**. Consumer changes are follow-on local work, driven by a migration guide.
2. Bugs: **fix low-risk in separate commits, report the rest**.
3. The generator (tiny, currently Azure DevOps `Internal Tools/TypeScriptClientGenerator`) **moves into this repo**.
4. Swagger is read from a **committed snapshot**, with a **script to refresh the snapshot**.

## Phase 0 — local seeding (this desktop session, after approval)

The cloud session can only see GitHub, so seed a branch first. In `D:\SpitfireDev\npmSpitfirePM`:

1. Branch `modernize/native-promises-fetch` from `master`.
2. Copy `D:\SpitfireDev\TypeScriptClientGenerator\{Program.cs,TypeScriptClientGenerator.csproj}` to
   `tools/ClientGenerator/` unchanged (cloud session does the retargeting so the diff is reviewable).
3. Save the snapshot: `https://dev.spitfirepm.com:8443/SFPMS/swagger/v23/swagger.json` to `swagger/v23.json`
   (reachable from this machine, 1.6 MB).
4. Commit this plan as `docs/modernization/PLAN.md`.
5. Push the branch (outward-facing: public GitHub repo). No changes to `master`, no publish.

## Cloud session work (branch `modernize/native-promises-fetch`, one commit per numbered step, draft PR to master)

### Hard constraints (read first)

- **Do not bump the version, publish, or touch `master`.** Stan versions and publishes.
- **Classic UI loads `dist/*.js` as plain script tags**, in this order, sharing one global scope and one global
  `exports`, with a stub `require` (`sfPMS/dscript/npmLoader.js`: returns `top.$` for `"jquery"`, else `exports`):
  `string.extensions.js, APIClientBase.js, SwaggerClients.js, BrowserExtensionChecker.js, sfRestClient.js`.
  Therefore: **add no new source modules** (put helpers in `APIClientBase.ts` or `sfRESTClient.ts`), add no new
  runtime `import` of an npm package, and avoid new top-level identifiers that could collide across files.
- **Keep the deep-import layout** (`spitfirepm/dist/SwaggerClients`, `.../sfRESTClient`, `.../globals`,
  `.../string.extensions`, `.../BrowserExtensionChecker`). PowerUX has 391 such imports. Keep `module: commonjs`.
- **Keep unchanged:** `window.sfClient`/`top.sfClient` bootstrap, `exports.$`, setting `window.$`/`top.$`, all
  synchronous helpers, jQuery-element signatures (`SetJQElementValue`, `GetDBFElement`, `CreateButtonElement`,
  `PopDoc(element)`, `sfAC`, `DisplayUserNotification` returning `Promise<JQuery>`), jQuery events
  (`sfPMSHubSignal.*`, `sfClient.SetWCC_*`), SignalR code, jQuery UI dialog/autocomplete code.
- **Do not change `Window`/`JQuery`/`JQueryStatic` augmentations in `globals.ts`.** sfPMS `tscript/globals.ts`
  redeclares about 15 of them; a type change there is TS2717 and blocks all sfPMS emit.
- Success-path behavior of public methods must not change. Anything that would change it goes in the findings report.

### 1. Tooling baseline

- Add devDependencies: `typescript` 6.0.3 (matches consumers), `jquery` + keep `@types/jquery`; declare `jquery`
  as a `peerDependency` (`>=3.7`). Remove unused `localforage` dependency and its import (`sfRESTClient.ts:6`).
- Regenerate `package-lock.json` (stale at 23.9600.3; tracked although gitignored — remove it from `.gitignore`).
- Add `npm test` using `node --test` (same choice as PowerUX `test:unit`). Add `jsdom` as devDependency for tests only.
- Add **classic-load smoke test**: concatenate the five dist files in classic order behind the stub `require`,
  run in a jsdom window with jQuery loaded, assert no parse/redeclaration error and that `exports.sfRestClient`
  and the 19 client classes exist. Run it on untouched `master` output first to prove the harness (it must pass).
- Add `.github/workflows/ci.yml`: `npm ci`, `npm run build`, `npm test` on push/PR.

### 2. Generator in-repo (`tools/ClientGenerator`)

- Retarget `net10.0-windows10.0.22621.0` to `net10.0`; drop the Release `OutputPath` to `D:\Util`.
- First argument accepts a **file path or URL** (`OpenApiDocument.FromFileAsync` / `FromUrlAsync`).
- npm scripts:
  - `swagger:update` — `scripts/update-swagger.js [url]`: fetch (default the dev URL above), write
    `swagger/v23.json` pretty-printed with stable key order so API changes diff cleanly. Fail loudly on non-200
    or non-JSON; never write a partial file.
  - `generate` — `dotnet run --project tools/ClientGenerator -- swagger/v23.json S src/SwaggerClients`.
- **Baseline commit:** run `generate` with settings unchanged (`JQueryPromises`). The diff against the committed
  `SwaggerClients.ts` must be empty or pure swagger drift (new endpoints). Commit that alone so step 3's diff is
  only the template switch.
- Delete stale `nswag.json` (not what generates the clients). Update README with the new procedure.
- If the .NET 10 SDK cannot be installed in the sandbox: do steps 2's file changes anyway, skip running, still do
  step 3's base-class work (it is written to serve both templates), and say so at the top of the PR.

### 3. Generated clients: jQuery.ajax to fetch

In `Program.cs`: `Template = TypeScriptTemplate.Fetch`, `UseTransformOptionsMethod = true`; keep
`UseTransformResultMethod`, `UseGetBaseUrlMethod`, `ClientBaseClass`, `PromiseType.Promise`, `TypeStyle.Interface`.
Leave `UseAbortSignal = false` (note as an option in the report).

In `src/APIClientBase.ts` (already has `transformResult(url, response: Response, processor)`):

- Add `protected transformOptions(options: RequestInit): Promise<RequestInit>`.
- **Keep `beforeSend` working.** Declare `public beforeSend: ((xhr: {setRequestHeader(n: string, v: string): void}) => void) | undefined`
  on the base class. `transformOptions` calls it with a small adapter that writes into `options.headers`.
  PowerUX login (`sources/models/main.ts:209,333,425`) only calls `xhr.setRequestHeader`, so it keeps working
  unchanged; its `JQueryXHR` parameter annotation is the one line the migration guide must flag.
- Preserve transport parity with jQuery: credentials stay `same-origin` (fetch default; do not set `include`);
  no global ajax hooks exist in any consumer; the server does not inspect `X-Requested-With` (verified by grep).
- **Date revival (bug B1): preserve current behavior exactly** — reviver armed only in `getBaseUrl`, so clients
  built with an explicit URL still return ISO strings. Do not "fix" it here; it changes data types seen by
  consumers. Report it.
- Regenerate. Then check and document in the migration guide: rejection values per status (`ApiException` vs
  parsed body) are unchanged; network failure now rejects with `TypeError` instead of a status-0 `ApiException`
  — if any library code branches on `status === 0`, adapt it.
- **Leave `src/SWSRestClients.ts` untouched** (Stan's ruling). It is a 2021 NSwag 13 TypeScript client for the
  separate SWS service, whose live pipeline is the C# client in `DashboardFoundationSolution/SWSRESTClient`.
  No surveyed code imports the TS file, but it stays shipped, still on `jQuery.ajax`; exclude it from the
  step-3 grep checks and list it in `FINDINGS.md` as apparently unused.
- Remove dead `src/main.ts` (marked "not used", but has side effects) and `src/CreateBundle.js`.

Tests (plain Node, fake `http.fetch` injected through the generated constructor's second argument): GET/POST
happy path, typed non-200 rejection, 204/empty body, `beforeSend` header lands on the request, GA hook still
fires through `transformResult`, date revival behaves as before for both construction styles.

### 4. Hand-written jQuery promises and ajax to native

All in `src/sfRESTClient.ts` and `src/APIClientBase.ts`. Use `async/await`; no `new Promise(async …)`.

| Where | Change |
|---|---|
| `_GetAPIXHR` (2988) | Replace with a fetch helper returning `{status, data}`. Callers read `.status` (304 handling at 2239, 2281/2297): 304 must resolve, not reject. |
| `LoadUCFunctionMap` (2204) | Return `Promise<…>`. Keep "resolve with the current map on failure". `_SessionClientGetUCFKMap` becomes a shared in-flight promise cleared when settled, which also makes `force` actually reload (bug B2). Guard the `localStorage` parse (B16). |
| `_LoadIconMap` (2268) | Same helper. |
| `setImgSrc` / `requestImgPath` (2135, 2167) | `Promise<string>`; `fetch` for `px.ashx`. |
| `CheckPermit` (770–899), `GetPagePartPermits` (989) | Remove Deferreds and the async executor; every failure path settles and clears `_LoadingPermitRequests`. |
| `UploadFile` (1727) | `fetch` with `FormData`; drop the `.progress` that never fires; every failure resolves `taskResult.error` as today (`beginUpload` rejection included). |
| `WaitForTask` (1847) | Remove async executor. |
| `GAMonitorSend`, `GA4MonitorSend`, `GAAPIEvent`, `GAMonitorEvent`, `GAMonitorPageHit` | `fetch` with `keepalive`; return `Promise<any>`. Delete the dead Universal Analytics branch. Type-only break; no consumer uses the return value. |
| `PageServerPingBackFailed` (6629) | Accept `string | Response | unknown` instead of `JQueryXHR`. |
| `.load(url)` at 1604, 1883, 4378 | Leave (DOM helper feeding jQuery UI dialogs). |
| `hub.start().done` (6100, 6111), `hub.stop()` | Leave; SignalR is jQuery-based. |

Utilities: `$.each` (12) to `for…of`/`Object.entries`; `$.trim` (5485, removed in jQuery 4) to `.trim()`.
Leave `jQuery.Event`, `.on/.trigger`, DOM selection, `.dialog`, `.autocomplete`, the `jQuery.fn.bind` patch.

Bootstrap note: `this.LoadUCFunctionMap().then(...)` in the constructor (6928) creates `window.sfClient`. With a
native promise that continuation runs as a microtask, so on the cached path the global appears earlier than
today, never later. Keep the order of side effects inside it identical.

### 5. Low-risk bug fixes (one commit each, each named in the PR)

Rule: local fix, no public signature change, no success-path change, covered by a test or obvious by reading.

- **Never-settling promises:** `_ThrottleDVRequests` batch failure and missing items (1272–1289: resolve queued
  resolvers with `null`, matching the documented contract); `BuildViewModelForContext` (602), `GetLookupResults`
  (1097), `RuleResult` (1513), `PopNewDoc`/`PopDoc`/`OpenProject` (2608, 2701, 2785), `ExportCompetitiveBidData`
  (1923), `AssureJQUITools` `return false` in executor (2483), `AddCachedScript` missing `onerror` (2535).
- `InvokeAction` regex lost escapes in template literal (4024). `new Error` never thrown (1199, 1501).
  `return false` inside `forEach` (3125). Duplicate `sessionAlive()` (6018/6020). Duplicate `GAClientID` check.
  `"basekune"` typo (5010). `GetLookupSuggestions` caching rejected promises (1056).
- Hygiene: untrack `.vs/`; fix README sample (calls removed `BuildViewModel`); unused imports/locals.

### 6. Deliverables in `docs/modernization/`

- **`FINDINGS.md`** — everything not fixed, with file:line, impact, suggested fix, risk. Seed list from the survey:
  B1 date revival inconsistency; `ClearCache` not clearing `GlobalPermitAPIPromise` (B3); shared `_PromiseList`
  (B4); precedence at 4221 (B8); `PageTypeNames` duplicate 128 and `8092` (B11); string compare of
  `DataLockFlag` (B12); ignored `silentDefault` (B13); always-true timer check (B14); `ApplyDataChanges` drop
  (B15); `GetDV` doc vs behavior (B18); `LoadUserSessionInfo` resetting `WCCLoaded` (B21); 19 string
  `setTimeout` and 3 `eval` sites, two fed by SignalR payloads; unescaped HTML in `MakeTable`, `jqAlert`,
  `CreateButtonElement`, `BuildWCCInfoTableHTML`, notifications; GA4 `api_secret` in source; four site-URL
  resolvers; SignalR hub methods typed as native promises; prototype extensions; import-time `window` access;
  `"main": ""` and no `exports` map. Plus whatever the session finds while converting.
- **`CONSUMER-MIGRATION.md`** — per consumer, what to do when taking the new version:
  - PowerUX: retype the three `beforeSend` hooks; drop bundled `jquery` if nothing else imports it; error-shape note.
  - sfPMS: nothing in call sites; `npmLoader.js` `"jquery"` branch becomes unused; `PageClass.vb:2116` file list
    unchanged; rebuild tscript to confirm zero errors; `dscript/sfRestClientTest.js` is already dead.
  - Client Code: no change required. Note `VBBCheckReqBodyHelper.js:66` calls a method that no longer exists.
- Optional next stages, listed not done: DOM/dialog isolation, `UseAbortSignal`, ESM build.

## Verification

Cloud session, before opening the PR:
1. `npm run build` with zero errors under `strict`.
2. `npm test`: fetch-client tests, hang-fix tests (each fixed method rejects or resolves under a failing fake
   fetch within a timeout), classic-load smoke test.
3. `grep` proves: no `$.Deferred`, `$.ajax`, `$.getJSON`, `jQuery.ajax`, `JQueryPromise`, `JQuery.Promise`,
   `JQueryXHR` left in `src/` outside SignalR lines and `SWSRestClients.ts`; no `import … from 'jquery'` in
   `SwaggerClients.ts`.
4. `npm pack --dry-run` shows the same `dist` file names as before minus `main.*` only.

Stan, locally, after the PR (not automatable from the cloud):
1. Build, then `Copy NPM Binary to PowerUX for testing.cmd` to drop `dist` into PowerUX and sfPMS `node_modules`.
2. sfPMS: `npx tsc` in `sfPMS/tscript` (zero errors); load a classic page, confirm `top.sfClient` exists, a DV
   lookup, a permit check, a file upload over and under the chunk limit, a SignalR notification.
3. PowerUX at `localhost:8896`: login by each of the three paths that set `beforeSend`, open a document, a grid
   with batched DVs, upload, logout/login as another user.
4. One Client Code add-in on a classic page (for example `VBBDocHelper.js`).

## Follow-on work found by the survey (not in this plan; file as cases)

- sfPMS `cscript/Util.js:2563`: retry `setTimeout` evaluates a quoted string, so `NPMLoaderPromise` can hang forever.
- sfPMS `Util.js:625` `sfAPICheckPermit` and jqUtility `getDV` wrappers never reject.
- sfPMS `PageClass.vb` never loads `version.js`, so `sfClient.ClientVersion` is undefined on classic pages.
- sfPMS `tscript/XTSDocHelper.ts:152` (`depth++` passes the old value; polls forever) and `:211` (missing `()`).
- PowerUX `models/document/document.ts:821`: `if (!Route.sfrc.IsLoggedIn())` tests a promise, always false.
- PowerUX `.npmrc` has a committed auth token for `npm.webix.com`.
- Deploys ship whatever is in a developer's `tscript/node_modules`, not the lockfile version.
- Retire the Azure DevOps `TypeScriptClientGenerator` repo and `GenerateSwag2TS.cmd` once the in-repo one is proven.

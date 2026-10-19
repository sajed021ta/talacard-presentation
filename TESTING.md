# Verification

Verified locally on 2026-10-19 with Node.js 24.19.0 and the Codex in-app browser.

## Automated checks

`node --test tests/studio.test.mjs` passes all three tests, covering:

- Original fourteen scenes and six-chapter content, twelve-page proposal, and nine distinct supplied videos.
- Import validation, finite timing/style bounds, unique scene IDs and same-origin media paths.
- Isolated HTTP save/reload and synchronized static defaults.
- Stale/concurrent save rejection, so one browser tab cannot silently replace another tab's changes.
- Local host/origin guards, upload type checks, media byte-range/suffix seeking and invalid-range responses.

JavaScript syntax checks pass for the server, studio and legacy controller. `node scripts/export.mjs` successfully creates the static distribution.

## Browser checks

- Selected the original home scene; verified the selection, inspector and paused preview match.
- Changed a title and confirmed the iframe caption updated, then restored it with undo.
- Duplicated, moved, deleted and restored a scene.
- Replaced an app scene with the supplied ATM video, played and paused it; media reported ready state 4 and paused state true after stopping.
- Added a local image through the file chooser and successfully saved; removed the disposable test copy and restored the original configuration.
- Downloaded project JSON and imported it through the file chooser; the fourteen-page app baseline was retained.
- Inspected app/proposal/media editor at desktop and mobile sizes, including the browser's normal viewport.
- On mobile, used the visible plus control to create a page and confirmed the visible unsaved state; restored the fourteen-page baseline afterward.
- No browser console errors were observed during these flows.

## Review

An independent finish review requested three material corrections: legacy scene synchronization, mobile page creation, and mobile save-state visibility. A single correction batch addressed them. The verdict pass scored all three **resolved**, with disposition **ship** at that fix scope.

The original user-authored source is archived in `original/source.html`. Host-injected Claude runtime is excluded from the independent app. All nine source movies remain untranscoded. Derived posters/crops and extracted raster files carry origin metadata; the provenance scan reports **27 rasters, 0 missing**.

## Practical limits

- The server is a single-device local editor. Internet hosting and authenticated multiuser editing are not configured.
- Saving from the panel writes local project files; GitHub synchronization is an explicit Git/GitHub Desktop operation.
- App text baked into supplied screenshots requires a replacement image; captions and surrounding text are editable.
- Static export is served at a website root. Disk saves and file uploads require the local Node server.
- Mobile viewport capture is used as visual evidence; this browser's full-page RTL capture produced invalid cropping and was discarded.

## Navigation and direct layout editing · 2026-10-19

Four Node tests passed, including backward-compatible geometry validation and bounded pointer math. Browser checks covered the RTL chapter menu, top subpages/current-page state, absence of the bottom flow and seek timeline, muted video autoplay, loop toggle, no timed page advance, pointer text move, pointer media resize, save/reload, reset, and legacy caption keyboard movement. Desktop and compact editor/viewer captures are in ignored `.impeccable/review/`. Original app scene acknowledgements and media playback produced no console errors.

## Automatic local save and cloud content sync

Six tests pass: previous server/model checks plus authenticated Worker publication, missing-media rejection, conditional updates, immutable asset checks, upload-before-project ordering, repeated-upload avoidance, offline retry and remote-conflict protection. The original-video assertion now permits owner uploads alongside the nine supplied videos. Live verification checks editor autosave without a button click, public JSON revision, protected writes and video byte ranges.

# TalaCard presentation studio

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated by the user: preserve the extracted HTML/CSS/JavaScript artifact. Use native browser modules and a dependency-free Node.js local server for file saving and media uploads.

## Users
The TalaCard owner edits individual presentation pages and presents the result to cooperation partners.

## Product Purpose
Make the existing Claude artifact independently runnable and maintainable in the owner's GitHub repository, with editable text, images, videos, timing and page order.

## Capabilities and Constraints
- Follow the pinned 2026-10-19 Claude reference across four decks: app (23 current reference steps plus two preserved historical pages, 25 total), proposal (12 pages), kiosk (22 steps), and delivery from balance (13 steps). The chapter menu is on the right and current chapter pages are across the top; page changes remain manual.
- Preserve the original archive and its twenty extracted images/fonts unchanged. Keep the refreshed reference separately, with 46 exact image/font assets recorded by hash and source provenance.
- Include the nine explicitly provided videos; do not substitute neighboring versions.
- The twelve-page proposal deck follows the supplied PDF; claims come only from the PDF.
- Refresh source-owned app text through a three-way merge against the original app baseline. Preserve owner-edited text, rich formatting, media, desktop/mobile placements, custom pages and proposal content. Repeated migration must not duplicate pages or replace subsequent edits. Render the retained historical branch-detail page through `legacy-previous`.
- Provide live editing, media selection/upload, add/duplicate/reorder/delete, undo/redo, automatic local save and authenticated cloud content sync, import/export, and a presentation view.
- In every chapter, offer «+ افزودن زیرصفحه» in the studio's top page tabs. Insert the new sibling after that chapter's final page, inherit the current page's chapter, colors and presentation style, and focus its label for renaming. Use existing autosave and undo/redo; keep the public viewer read-only without this button.
- Edit titles and independent description boxes with a shared Word-like toolbar: YekanX/Tahoma/Arial, size, color, bold, italic, underline, alignment and line spacing. Character formatting applies to selected text or the whole active box; alignment and line spacing apply to the box. Keep YekanX and RTL as defaults. Store structured text runs rather than HTML.
- Add, delete, reorder and move/resize description boxes independently. Existing descriptions expose sentence boxes without rewriting saved content until edited; a split action preserves text formatting while separating sentences. Support up to forty description boxes per scene and independent desktop/mobile placement.
- Apply image/video zoom, four-direction pan, fade and blur effects, with duration (0.2–120 seconds), delay (0–60 seconds), amount, easing, repeat and replay controls. Effect repetition and video looping are separate settings; effect completion never advances the page. Respect reduced-motion preferences.
- Offer the reference's animated gold guilloche or a plain selected color under motion/appearance. Video pages use the same reference backdrop. Shared playback controls pause and resume source timers, backdrop motion, media effects and videos together; embedded source timers advance only from the parent player.
- Persist locally without credentials. Never put GitHub tokens into browser code. GitHub synchronization uses the owner's normal Git workflow. Content updates sync independently to durable cloud storage; no browser credentials.
- Use the local studio for editing and autosave; the public link presents the synchronized content read-only. Show local-save and cloud-sync states separately, including retry and version-conflict recovery.
- The source Claude URL remains read-only; this is an independent copy.

## Brand Commitments
Persian, RTL, YekanX from the supplied artifact, gold/charcoal/light surfaces, original phone frames and supplied product motion. Preserve the incumbent rather than create a replacement identity.

## Evidence on Hand
The original archive under `original/`, supplied media under `public/media`, and `references/proposal.pdf`. The refreshed authority is [the pinned Claude artifact](https://claude.ai/artifact/A1CLteSL9qqvEHSW4Rpa8r), captured as `references/artifact-2026-10-20.json`; its step catalog is `public/reference/catalog.json`, assets are under `public/reference/assets`, and renderer is under `public/legacy`. `scripts/merge-reference.mjs` uses `references/original-app-content.json` as the merge baseline. Illustration frames remain preserved images rather than fully editable vector app screens.

## Product Principles
- Content editing does not require changing rendering code.
- Every video autoplays muted. Loop is optional per page; page changes are always manual.
- Text and media support direct pointer move/resize, with independent desktop/mobile geometry and undo.
- Use the supplied Asset 14.png logo, without studio branding.
- The current page preview is the authority for an edit.
- Save status and recovery are visible.
- Presentation controls recede while editing controls stay outside the artifact.

## Editing additions — 2026-10-20
- Preserve selected character ranges while using the native color picker or six document-color swatches. Show whether formatting targets selected characters or the entire box.
- Add up to twelve extra image/video layers per page alongside the primary media or original reference iframe. Each layer has its own name, fit, loop, timed effect and independent desktop/mobile move/resize geometry. Batch file selection appends subsequent files.
- Rename a whole chapter and all its sibling pages together; keep per-page chapter reassignment separate, rejecting empty or colliding names.
- Unify current backgrounds to the reference white/gold geometry once, including historical renderers; provide an explicit apply-to-all action for subsequent background edits.
- Refresh against the 2026-10-20 source catalog with source-aware index remapping, preserving owner copy/rich runs, custom pages and media. Keep the removed confirmation page using its 2026-10-19 renderer snapshot.
- Include every extra media/poster path in local disk checks, cloud upload ordering and server publication validation.

## First-page navigation — 2026-10-20
- Root presentation URLs show the supplied four-card chooser with exact reference images and white/gold animated ground: طلاپرداز → kiosk, اپ طلاکارت → app, کارت طلا → deliv (physical delivery from balance), طلاکارت → proposal. Preserve every existing editable deck.
- Every card opens its corresponding deck at its first scene; each destination has a shareable ?deck= URL. Direct #edit keeps the owner editing workflow. Add a «صفحهٔ اول» action and make browser Back return to the chooser.
- Use supplied reference artwork, retained RTL order and responsive two-column cards on mobile; no placeholder or inactive cards.

## Partnership content update — 2026-10-20
The chooser uses the owner-supplied transparent ecosystem image. The studio content inspector exposes the gold-card chooser title, description, image library selection and target deck; all persist through normal autosave. The cooperation chapter includes a native four-column responsibility matrix from the supplied screenshot, with twelve rows and explicit undecided entries. Each header and cell is editable. New reference copy replaces only untouched source copy, preserving owner changes. Partner names use Digikala.

## Homepage revision
The owner removed the ecosystem background and set the chooser heading to «طلاکارت جریان طلا». Retain the four product cards and editable gold-card settings.

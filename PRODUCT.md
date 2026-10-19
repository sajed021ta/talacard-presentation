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
- Preserve the original six app chapters and fourteen steps, visual identity and manual page controls. The chapter menu is on the right and current chapter pages are across the top; no bottom flow map or video timeline.
- Archive the complete user-authored artifact and its twenty extracted images/fonts.
- Include the nine explicitly provided videos; do not substitute neighboring versions.
- A second twelve-page proposal deck follows the supplied PDF; claims come only from the PDF.
- Provide live editing, media selection/upload, add/duplicate/reorder/delete, undo/redo, automatic local save and authenticated cloud content sync, import/export, and a presentation view.
- Edit titles and independent description boxes with a shared Word-like toolbar: YekanX/Tahoma/Arial, size, color, bold, italic, underline, alignment and line spacing. Character formatting applies to selected text or the whole active box; alignment and line spacing apply to the box. Keep YekanX and RTL as defaults. Store structured text runs rather than HTML.
- Add, delete, reorder and move/resize description boxes independently. Existing descriptions expose sentence boxes without rewriting saved content until edited; a split action preserves text formatting while separating sentences. Support up to forty description boxes per scene and independent desktop/mobile placement.
- Apply image/video zoom, four-direction pan, fade and blur effects, with duration (0.2–120 seconds), delay (0–60 seconds), amount, easing, repeat and replay controls. Effect repetition and video looping are separate settings; effect completion never advances the page. Respect reduced-motion preferences.
- Persist locally without credentials. Never put GitHub tokens into browser code. GitHub synchronization uses the owner's normal Git workflow. Content updates sync independently to durable cloud storage; no browser credentials.
- Use the local studio for editing and autosave; the public link presents the synchronized content read-only. Show local-save and cloud-sync states separately, including retry and version-conflict recovery.
- The source Claude URL remains read-only; this is an independent copy.

## Brand Commitments
Persian, RTL, YekanX from the supplied artifact, gold/charcoal/light surfaces, original phone frames and supplied product motion. Preserve the incumbent rather than create a replacement identity.

## Evidence on Hand
`original/source.html`, extracted artifact files, supplied media under `public/media`, and `references/proposal.pdf`. Illustration frames are preserved images, not fully editable vector app screens.

## Product Principles
- Content editing does not require changing rendering code.
- Every video autoplays muted. Loop is optional per page; page changes are always manual.
- Text and media support direct pointer move/resize, with independent desktop/mobile geometry and undo.
- Use the supplied Asset 14.png logo, without studio branding.
- The current page preview is the authority for an edit.
- Save status and recovery are visible.
- Presentation controls recede while editing controls stay outside the artifact.

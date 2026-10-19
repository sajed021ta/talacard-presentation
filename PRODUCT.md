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
- Provide live editing, media selection/upload, add/duplicate/reorder/delete, undo/redo, save, import/export, and a presentation view.
- Persist locally without credentials. Never put GitHub tokens into browser code. GitHub synchronization uses the owner's normal Git workflow.
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

---
name: TalaCard presentation studio
description: Persian live scene editor around the preserved TalaCard presentation
colors:
  ink: "#222225"
  muted: "#65676e"
  paper: "#fff"
  workspace: "#f3f3f5"
  line: "#e4e4e8"
  gold: "#e7c569"
  gold-dark: "#8c6418"
  selected: "#faf3df"
  danger: "#a1322c"
  field-line: "#d9d9df"
typography:
  display:
    fontFamily: "YekanX, Tahoma, sans-serif"
    fontSize: "40px"
    fontWeight: 900
    lineHeight: 1.5
  legacy-headline:
    fontFamily: "YekanX, Tahoma, sans-serif"
    fontSize: "clamp(28px, 3.4vw, 44px)"
    fontWeight: 900
    lineHeight: 1.3
  title:
    fontFamily: "YekanX, Tahoma, sans-serif"
    fontSize: "16px"
    fontWeight: 700
  body:
    fontFamily: "YekanX, Tahoma, sans-serif"
    fontSize: "14px"
  scene-body:
    fontFamily: "YekanX, Tahoma, sans-serif"
    fontSize: "19px"
    lineHeight: 2.1
  label:
    fontFamily: "YekanX, Tahoma, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  helper:
    fontFamily: "YekanX, Tahoma, sans-serif"
    fontSize: "11px"
    fontWeight: 400
rounded:
  field: "8px"
  button: "9px"
  scene-row: "10px"
  menu: "12px"
  editing-stage: "15px"
  player: "16px"
  stage: "24px"
spacing:
  tight: "6px"
  small: "8px"
  control: "10px"
  group: "12px"
  panel: "16px"
  field: "20px"
  workspace: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "9px 15px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "9px 15px"
  text-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px"
  scene-row-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.ink}"
    rounded: "{rounded.scene-row}"
    padding: "10px 8px"
  flow-card:
    backgroundColor: "{colors.paper}"
    rounded: "14px"
    padding: "15px"
---

# Design System: TalaCard presentation studio

## Overview

**Creative North Star: "The Preserved TalaCard Stage"**

A Persian editing workspace surrounds the preserved TalaCard presentation. White panels, quiet gray workspace, charcoal type and restrained gold selection keep the supplied phone compositions and motion in the foreground. YekanX and RTL remain the shared identity across editor and player.

**Key Characteristics:**
- Persian RTL with extracted YekanX font files.
- White and gray editing chrome; charcoal actions and gold selection.
- Original six chapters and fourteen scenes retained as the app deck.
- Page-specific live preview with text, image and video controls.

## Colors

### Primary
Gold marks the current page, chapter progress, playback and focus-related emphasis. Dark gold supports readable small state text and field accents. Pale selected gold fills active scene rows.

### Neutral
White holds toolbar, rails, player and flow cards. Workspace gray separates these panels. Charcoal is the main text and save-button surface; muted gray supports timing and helpers. Fine gray borders separate fields and rails. Danger red is reserved for destructive actions.

The legacy player has its own retained palette: original charcoal, gray, gold gradient and partner teal remain inside the supplied presentation. These values are scoped to that artifact, not an expanded editor palette.

**The Preserved Stage Rule.** Extend the editing chrome around the incumbent presentation; retain its supplied phone frames, artwork and motion.

**The Gold State Rule.** Use gold for selection, progress and playback emphasis; use charcoal for the save action.


## Typography

**Display Font:** YekanX, with Tahoma and sans-serif fallbacks.  
**Body Font:** the same supplied family; weights 400, 600, 700 and 900 are loaded by the editor. The original player also loads 500.

Display is heavy, balanced Persian type. The default media-scene heading uses the display token, with scene-level size settings; compact scenes multiply it by 1.15. Legacy headings retain their fluid scale. Inspector titles use the title role, action labels use label, and secondary metadata uses helper. Media-scene copy has generous line height and a 42ch desktop measure; original captions use 16px, line-height 1.9 and 34ch. The inspector's title textarea uses 15px bold type.

**The Persian First Rule.** Keep YekanX and RTL as the default; isolate time readouts and seek controls in LTR.

## Layout

Desktop editing uses three columns in RTL order: a 218px scene rail on the right, flexible stage in the center, and 290px inspector on the left. The white toolbar is 76px high; rails occupy the remaining viewport and scroll internally. The preview column uses 16px 26px 35px padding. The stage scales a 1240×820 canvas; split scenes use a 1:1.15 copy/media grid. Media, full-image and centered-title layouts share this canvas.

At 1190px the rails narrow to 178px/270px, and at 960px to 145px/250px; toolbar height becomes 65px. Above 1800px rails widen to 250px/330px. At 760px and below, a horizontal scene strip appears above the stage, followed by the inspector in normal document flow. A separate 46px column keeps add-page visible beside the strip. Toolbar actions wrap to a full-width second row and save status remains visible. The canvas changes to 700×1000, with copy above media. Below 960px scene thumbnails disappear. Presentation mode hides editor rails and toolbar; fullscreen letterboxes the canvas without changing scene geometry.

## Elevation & Depth

Editor depth is quiet: white surfaces, fine borders and muted shadows. The stage uses `0 18px 50px -38px #22222566`; the project menu uses `0 12px 28px #2222251a`; toast feedback uses `0 8px 25px #22222522`. The original stage retains its diffuse `0 0 39px #2222290A` shadow. Metallic gradients, inset edges and larger ambient shadows belong to the preserved phone, not general editor containers.

Motion uses the incumbent easing, `cubic-bezier(.22,1,.36,1)`. Added media scenes animate for 850ms plus 500ms times scene intensity; optional media drift spans scene duration. Pause stops the stage timeline and media together. Reduced-motion preferences suppress scene entry animation and collapse CSS durations.

## Shapes

Rounded rectangles dominate: compact field and button corners, softer rails/cards, and a broad stage. Hairline borders define controls; scene selection combines a gold outline and pale fill. Small SVG stroke icons share rounded caps and joins. The phone retains its original 40px shell and 30px clipped screen corners.

## Components

### Buttons
Charcoal primary save, white secondary mode switch, transparent icon actions and gold playback. Primary/secondary buttons share compact semibold labels, 38px minimum height, and quiet gray hover fills; primary hover becomes lighter charcoal. Mobile minimum height is 34px. Focus is a 2px dark-gold outline with 3px offset; disabled opacity is 0.35.

### Cards / Containers
Flow cards use white surfaces, 14px corners and 15px padding. Scene rows combine a thumbnail, short name and duration; the selected row uses pale gold and a gold border. Menu and toast shadows are overlays, not card defaults.

### Inputs / Fields
White fields have a fine gray outline, 8px corners and 10px padding. Textareas have line-height 1.9 and resize vertically. Fields are grouped with 20px vertical spacing; paired controls use two columns with a 12px gap. The inspector has content, media, and motion/appearance tabs; the active tab gains a dark-gold underline and bold charcoal text. Media choices show contained previews and a dark-gold selected border.

### Navigation
The scene list, chapter progress and flow map point to the same current page. Chapter tracks are thin gray rails with gold fill. Time readouts use tabular numerals. Mobile hides chapter text but retains the tracks and accessible button labels.

### Live Stage and Save State
The preview shows the current page's text, images or video immediately. Original scenes render in the preserved player; a gray loading cover remains until the selected scene acknowledges synchronization. Save state distinguishes unsaved, saving, saved and browser-demo persistence. Save state stays in the mobile action row; page creation stays alongside the scene strip.

## Do's and Don'ts

### Do:
- **Do** retain the supplied TalaCard identity and original chapter/scene structure.
- **Do** keep the selected scene synchronized across list, inspector and stage.
- **Do** preserve the visible mobile save state and add-page control.
- **Do** use supplied images and videos with contain fitting by default; scene settings may explicitly choose another fit.

### Don't:
- **Don't** replace YekanX, RTL or the white/gray/charcoal/gold identity.
- **Don't** apply the phone's metallic depth or partner-brand teal to editor controls.
- **Don't** treat text inside raster app frames as editable live text.


Not canonized or repaired here: the retained chapter metadata above scene titles is an incumbent presentation detail, not a reusable eyebrow pattern. Original and studio neutral values remain deliberately scoped to their separate stylesheets. This documentation pass changes neither source nor assets.

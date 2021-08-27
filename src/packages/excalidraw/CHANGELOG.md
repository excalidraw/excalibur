# Changelog

<!--
Guidelines for changelog:
The change should be grouped under one of the below section and must contain PR link.
- Features: For new features.
- Fixes: For bug fixes.
- Chore: Changes for non src files example package.json.
- Refactor: For any refactoring.

Please add the latest change on the top under the correct section.
-->

## Unreleased

## Excalidraw Library

### Features

- Plugin-like subtypes for `ExcalidrawTextElement`. These allow easily supporting specialized `ExcalidrawTextElement`s such as for MathJax, Markdown, or inline code. Rendered text dimensions no longer have to match editing text dimensions. [#3915](https://github.com/excalidraw/excalidraw/pull/3915).

### Fixes

- Prevent gradual misalignment of the canvas due to floating point rounding errors [#3833](https://github.com/excalidraw/excalidraw/pull/3833).

## 0.9.0 (2021-07-10)

## Excalidraw API

### Features

- [`restore(data, localAppState, localElements)`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#restore) and [`restoreElements(elements, localElements)`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#restoreElements) now take `localElements` argument which will be used to ensure existing elements' versions are used and incremented. This fixes an issue where importing the same file would resolve to elements with older versions, potentially causing issues when reconciling [#3797](https://github.com/excalidraw/excalidraw/pull/3797).

  #### BREAKING CHANGE

  - `localElements` argument is mandatory (can be `null`/`undefined`) if using TypeScript.

- Support `appState.exportEmbedScene` attribute in [`exportToSvg`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#exportToSvg) which allows to embed the scene data [#3777](https://github.com/excalidraw/excalidraw/pull/3777).

  #### BREAKING CHANGE

  - The attribute `metadata` is now removed as `metadata` was only used to embed scene data which is now supported with the `appState.exportEmbedScene` attribute.
  - [`exportToSvg`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#exportToSvg) now resolves to a promise which resolves to `svg` of the exported drawing.

- Expose [`loadLibraryFromBlob`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#loadLibraryFromBlobY), [`loadFromBlob`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#loadFromBlob), and [`getFreeDrawSvgPath`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#getFreeDrawSvgPath) [#3764](https://github.com/excalidraw/excalidraw/pull/3764).

- Expose [`FONT_FAMILY`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#FONT_FAMILY) so that consumer can use when passing `initialData.appState.currentItemFontFamily` [#3710](https://github.com/excalidraw/excalidraw/pull/3710).

- Added prop [`autoFocus`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#autoFocus) to focus the excalidraw component on page load when enabled, defaults to false [#3691](https://github.com/excalidraw/excalidraw/pull/3691).

  Note: Earlier Excalidraw component was focussed by default on page load, you need to enable `autoFocus` prop to retain the same behaviour.

- Added prop `UIOptions.canvasActions.export.renderCustomUI` to support Custom UI rendering inside export dialog [#3666](https://github.com/excalidraw/excalidraw/pull/3666).
- Added prop `UIOptions.canvasActions.saveAsImage` to show/hide the **Save as image** button in the canvas actions. Defauls to `true` hence the **Save as Image** button is rendered [#3662](https://github.com/excalidraw/excalidraw/pull/3662).

- Export dialog can be customised with [`UiOptions.canvasActions.export`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#exportOpts) [#3658](https://github.com/excalidraw/excalidraw/pull/3658).

  Also, [`UIOptions`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#UIOptions) is now memoized to avoid unnecessary rerenders.

  #### BREAKING CHANGE

  - `UIOptions.canvasActions.saveAsScene` is now renamed to `UiOptions.canvasActions.export.saveFileToDisk`. Defaults to `true` hence the **save file to disk** button is rendered inside the export dialog.
  - `exportToBackend` is now renamed to `UIOptions.canvasActions.export.exportToBackend`. If this prop is not passed, the **shareable-link** button will not be rendered, same as before.

### Fixes

- Use excalidraw Id in elements so every element has unique id [#3696](https://github.com/excalidraw/excalidraw/pull/3696).

### Refactor

- #### BREAKING CHANGE
  - Rename `UIOptions.canvasActions.saveScene` to `UIOptions.canvasActions.saveToActiveFile`[#3657](https://github.com/excalidraw/excalidraw/pull/3657).
  - Removed `shouldAddWatermark: boolean` attribute from options for [export](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#export-utilities) APIs [#3639](https://github.com/excalidraw/excalidraw/pull/3639).
  - Removed `appState.shouldAddWatermark` so in case you were passing `shouldAddWatermark` in [initialData.AppState](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42) it will not work anymore.

## Excalidraw Library

**_This section lists the updates made to the excalidraw library and will not affect the integration._**

### Features

- Switch to selection tool on library item insert [#3773](https://github.com/excalidraw/excalidraw/pull/3773)

- Show active file name when saving to current file [#3733](https://github.com/excalidraw/excalidraw/pull/3733)

- Add hint around text editing [#3708](https://github.com/excalidraw/excalidraw/pull/3708)

- Change library icon to be more clear [#3583](https://github.com/excalidraw/excalidraw/pull/3583)

- Pass current `theme` when installing libraries [#3701](https://github.com/excalidraw/excalidraw/pull/3701)

- Update virgil font [#3692](https://github.com/excalidraw/excalidraw/pull/3692)

- Support exporting json to excalidraw plus [#3678](https://github.com/excalidraw/excalidraw/pull/3678)

- Save exportScale in AppState [#3580](https://github.com/excalidraw/excalidraw/pull/3580)

- Add shortcuts for stroke and background color picker [#3318](https://github.com/excalidraw/excalidraw/pull/3318)

- Exporting redesign [#3613](https://github.com/excalidraw/excalidraw/pull/3613)

- Auto-position tooltip and suport overflowing container [#3631](https://github.com/excalidraw/excalidraw/pull/3631)

- Auto release @excalidraw/excalidraw-next on every change [#3614](https://github.com/excalidraw/excalidraw/pull/3614)

- Allow inner-drag-selecting with cmd/ctrl [#3603](https://github.com/excalidraw/excalidraw/pull/3603)

### Fixes

- view mode cursor adjustments [#3809](https://github.com/excalidraw/excalidraw/pull/3809).

- Pass next release to updatePackageVersion & replace ## unreleased with new version [#3806](https://github.com/excalidraw/excalidraw/pull/3806)

- Include deleted elements when passing to restore [#3802](https://github.com/excalidraw/excalidraw/pull/3802)

- Import React before using jsx [#3804](https://github.com/excalidraw/excalidraw/pull/3804)

- Ensure `s` and `g` shortcuts work on no selection [#3800](https://github.com/excalidraw/excalidraw/pull/3800)

- Keep binding for attached arrows after changing text [#3754](https://github.com/excalidraw/excalidraw/pull/3754)

- Deselect elements on viewMode toggle [#3741](https://github.com/excalidraw/excalidraw/pull/3741)

- Allow pointer events for disable zen mode button [#3743](https://github.com/excalidraw/excalidraw/pull/3743)

- Use rgba instead of shorthand alpha [#3688](https://github.com/excalidraw/excalidraw/pull/3688)

- Color pickers not opening on mobile [#3676](https://github.com/excalidraw/excalidraw/pull/3676)

- On contextMenu, use selected element regardless of z-index [#3668](https://github.com/excalidraw/excalidraw/pull/3668)

- SelectedGroupIds not being stored in history [#3630](https://github.com/excalidraw/excalidraw/pull/3630)

- Overscroll on touch devices [#3663](https://github.com/excalidraw/excalidraw/pull/3663)

- Small UI issues around image export dialog [#3642](https://github.com/excalidraw/excalidraw/pull/3642)

- Normalize linear element points on restore [#3633](https://github.com/excalidraw/excalidraw/pull/3633)

- Disable pointer-events on footer-center container [#3629](https://github.com/excalidraw/excalidraw/pull/3629)

### Refactor

- Delete React SyntheticEvent persist [#3700](https://github.com/excalidraw/excalidraw/pull/3700)

- Code clean up [#3681](https://github.com/excalidraw/excalidraw/pull/3681)

### Performance

- Improve arrow head sizing [#3480](https://github.com/excalidraw/excalidraw/pull/3480)

### Build

- Add release script to update relevant files and commit for next release [#3805](https://github.com/excalidraw/excalidraw/pull/3805)

- Add script to update changelog before a stable release [#3784](https://github.com/excalidraw/excalidraw/pull/3784)

- Add script to update readme before stable release [#3781](https://github.com/excalidraw/excalidraw/pull/3781)

---

## 0.8.0 (2021-05-15)

## Excalidraw API

**_These section lists the updates which may affect your integration, so it is recommended to go through this when upgrading the version._**

### Features

- Support updating any `appState` properties in [`updateScene`](https://github.com/excalidraw/excalidraw/blob/master/src/components/App.tsx#L282) API. Earlier only `appState.viewBackgroundColor` was supported, now any attribute can be updated with this API.
- Expose [`serializeAsJSON`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#serializeAsJSON) helper that we use when saving Excalidraw scene to a file [#3538](https://github.com/excalidraw/excalidraw/pull/3538).
- Add support to render custom UI in the top right corner via [`renderTopRightUI`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#renderTopRightUI) prop [#3539](https://github.com/excalidraw/excalidraw/pull/3539), [#3572](https://github.com/excalidraw/excalidraw/pull/3572) .

  This also removes the GitHub icon, keeping it local to the https://excalidraw.com app.

### Fixes

- The encryption shield icon is now removed from excalidraw package as it was specific to excalidraw app and is now rendered via [`renderFooter`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#renderFooter) prop. In case you were hiding this icon earlier, you need not do that anymore [#3577](https://github.com/excalidraw/excalidraw/pull/3577).

  Now `appState` is also passed to [`renderFooter`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#renderFooter) prop.

## Excalidraw Library

**_These section lists the updates made to the excalidraw library and will not affect the integration._**

### Features

- Shortcut key for nerd stats [#3552](https://github.com/excalidraw/excalidraw/pull/3552).
- Better rendering of curved rectangles [#3562](https://github.com/excalidraw/excalidraw/pull/3562).
- Improved freedraw [#3512](https://github.com/excalidraw/excalidraw/pull/3512).
- Add shortcut for dark mode [#3543](https://github.com/excalidraw/excalidraw/pull/3543).
- Adds rounded icons, joins and caps.[#3521](https://github.com/excalidraw/excalidraw/pull/3521).

### Fixes

- Exporting freedraw with color to svg [#3565](https://github.com/excalidraw/excalidraw/pull/3565).
- Handle render errors [#3557](https://github.com/excalidraw/excalidraw/pull/3557).
- Restore on paste or lib import [#3558](https://github.com/excalidraw/excalidraw/pull/3558).
- Improve mobile user experience [#3508](https://github.com/excalidraw/excalidraw/pull/3508).
- Prevent selecting `.visually-hidden` elements [#3501](https://github.com/excalidraw/excalidraw/pull/3501).

### Perf

- Reduce SVG export size by more than half by reducing precision to 2 decimal places [#3567](https://github.com/excalidraw/excalidraw/pull/3567).
- Remove `backdrop-filter` to improve perf [#3506](https://github.com/excalidraw/excalidraw/pull/3506)

---

## 0.7.0 (2021-04-26)

## Excalidraw API

### Features

- [`scrollToContent`](https://github.com/excalidraw/excalidraw/blob/master/src/components/App.tsx#L265) API now supports passing just a single Excalidraw element, or none at all (which will default to current elements on the scene) [#3482](https://github.com/excalidraw/excalidraw/pull/3482).

  #### BREAKING CHANGE

  - Renamed `setScrollToContent` to [`scrollToContent`](https://github.com/excalidraw/excalidraw/blob/master/src/components/App.tsx#L265).

- Make library local to given excalidraw instance (previously, all instances on the same page shared one global library) [#3451](https://github.com/excalidraw/excalidraw/pull/3451).

  - Added prop [onLibraryChange](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#onLibraryChange) which if supplied will be called when library is updated.

  - Added attribute `libraryItems` to prop [initialData](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#initialdata) which can be used to load excalidraw with existing library items.

  - Assign a [unique id](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#Id) to the excalidraw component. The id can be accessed via [`ref`](https://github.com/excalidraw/excalidraw/blob/master/src/components/App.tsx#L298).

  #### BREAKING CHANGE

  - From now on the host application is responsible for [persisting the library](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#onLibraryChange) to LocalStorage (or elsewhere), and [importing it on mount](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#initialdata).

- Bind the keyboard events to component and added a prop [`handleKeyboardGlobally`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#handleKeyboardGlobally) which if set to true will bind the keyboard events to document [#3430](https://github.com/excalidraw/excalidraw/pull/3430).

  #### BREAKING CHANGE

  - Earlier keyboard events were bind to document but now its bind to Excalidraw component by default. So you will need to set [`handleKeyboardGlobally`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#handleKeyboardGlobally) to true if you want the previous behaviour (bind the keyboard events to document).

- Recompute offsets on `scroll` of the nearest scrollable container [#3408](https://github.com/excalidraw/excalidraw/pull/3408). This can be disabled by setting [`detectScroll`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#detectScroll) to `false`.

- Add `onPaste` prop to handle custom clipboard behaviours [#3420](https://github.com/excalidraw/excalidraw/pull/3420).

### Fixes

- Changing z-index of elements (sorting them below/above other elements) now updates their `version` and `versionNonce` (only applies to the selected elements). This fix will allow you account for z-index changes if you're syncing just the elements that changed (and not the whole scene) [#3483](https://github.com/excalidraw/excalidraw/pull/3483).
- Only handle cut/paste events inside excalidraw [#3484](https://github.com/excalidraw/excalidraw/pull/3484).

- Make history local to a given Excalidraw instance. This fixes a case where history was getting shared when you have multiple Excalidraw components on the same page [#3481](https://github.com/excalidraw/excalidraw/pull/3481).
- Use active Excalidraw component when editing text. This fixes a case where text editing was not working when you have multiple Excalidraw components on the same page [#3478](https://github.com/excalidraw/excalidraw/pull/3478).

- Fix library being pasted off-center [#3462](https://github.com/excalidraw/excalidraw/pull/3462).

- When switching theme, apply it only to the active Excalidraw component. This fixes a case where the theme was getting applied to the first Excalidraw component if you had multiple Excalidraw components on the same page [#3446](https://github.com/excalidraw/excalidraw/pull/3446).

### Refactor

- #### BREAKING CHANGE

  - Removed exposing `getSyncableElements` helper which was specific to excalidraw app collab implementation [#3471](https://github.com/excalidraw/excalidraw/pull/3471). If you happened to use it, you can easily reimplement it yourself using the newly exposed [isInvisiblySmallElement](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#isInvisiblySmallElement) helper:

    ```ts
    const getSyncableElements = (elements: readonly ExcalidrawElement[]) =>
      elements.filter((el) => el.isDeleted || !isInvisiblySmallElement(el));
    ```

### Build

- Add vendor prefixes to css rules [#3476](https://github.com/excalidraw/excalidraw/pull/3476).

## Types

- Renamed the following types in case you depend on them (via [#3427](https://github.com/excalidraw/excalidraw/pull/3427)):
  - `DataState` → `ExportedDataState`
  - `LibraryData` → `ExportedLibraryData`

## Excalidraw Library

### Features

- Support tab-to-indent when editing text [#3411](https://github.com/excalidraw/excalidraw/pull/3411).

- App now breaks into mobile view using the component dimensions, not viewport dimensions. This fixes a case where the app would break sooner than necessary when the component's size is smaller than viewport [#3414](https://github.com/excalidraw/excalidraw/pull/3414).

- Add screenshots to manifest.json [#3369](https://github.com/excalidraw/excalidraw/pull/3369).

- Enable drop event on the whole component [#3406](https://github.com/excalidraw/excalidraw/pull/3406).

### Fixes

- Focus on last active element when dialog closes [#3447](https://github.com/excalidraw/excalidraw/pull/3447).

- Fix incorrectly caching png file handle [#3407](https://github.com/excalidraw/excalidraw/pull/3407).

- Fix popover position incorrect on Safari for non-zero offsets/scroll [#3399](https://github.com/excalidraw/excalidraw/pull/3399).

---

## 0.6.0 (2021-04-04)

## Excalidraw API

### Features

- Add `UIOptions` prop to customise `canvas actions` which includes customising `background color picker`, `clear canvas`, `export`, `load`, `save`, `save as` & `theme toggle` [#3364](https://github.com/excalidraw/excalidraw/pull/3364). Check the [readme](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#uioptions) for more details.
- Calculate `width/height` of canvas based on excalidraw component (".excalidraw" selector) & also resize and update offsets whenever the dimensions of excalidraw component gets updated [#3379](https://github.com/excalidraw/excalidraw/pull/3379). You also don't need to add a resize handler anymore for excalidraw as its handled now in excalidraw itself.
  #### BREAKING CHANGE
  - `width/height` props have been removed. Instead now it takes `100%` of `width` and `height` of the container so you need to make sure the container in which you are rendering Excalidraw has non zero dimensions (It should have non zero width and height so Excalidraw can match the dimensions of containing block)
- Calculate offsets when excalidraw container resizes using resize observer api [#3374](https://github.com/excalidraw/excalidraw/pull/3374).
- Export types for the package so now it can be used with typescript [#3337](https://github.com/excalidraw/excalidraw/pull/3337). The types are available at `@excalidraw/excalidraw/types`.
- Add `renderCustomStats` prop to render extra stats on host, and expose `setToastMessage` API via refs which can be used to show toast with custom message [#3360](https://github.com/excalidraw/excalidraw/pull/3360).
- Support passing a CSRF token when importing libraries to prevent prompting before installation. The token is passed from [https://libraries.excalidraw.com](https://libraries.excalidraw.com/) using the `token` URL key [#3329](https://github.com/excalidraw/excalidraw/pull/3329).
- #### BREAKING CHANGE
  Use `location.hash` when importing libraries to fix installation issues. This will require host apps to add a `hashchange` listener and call the newly exposed `excalidrawAPI.importLibrary(url)` API when applicable [#3320](https://github.com/excalidraw/excalidraw/pull/3320). Check the [readme](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#importlibrary) for more details.
- Append `location.pathname` to `libraryReturnUrl` default url [#3325](https://github.com/excalidraw/excalidraw/pull/3325).

### Build

- Expose separate builds for dev and prod and support source maps in dev build [#3330](https://github.com/excalidraw/excalidraw/pull/3330). Check the [readme](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#installation) for more details.
  #### BREAKING CHANGE
  - If you are using script tag to embed excalidraw then the name of the file will have to be updated to `excalidraw.production.min.js` instead of `excalidraw.min.js`. If you want to use dev build you can use `excalidraw.development.js`

### Refactor

#### BREAKING CHANGE

- Rename the API `setCanvasOffsets` exposed via [`ref`](https://github.com/excalidraw/excalidraw/blob/master/src/components/App.tsx#L265) to `refresh` [#3398](https://github.com/excalidraw/excalidraw/pull/3398).

## Excalidraw Library

### Features

- Reopen library menu on import from file [#3383](https://github.com/excalidraw/excalidraw/pull/3383).
- Don't unnecessarily prompt when installing libraries [#3329](https://github.com/excalidraw/excalidraw/pull/3329).
- Add option to flip single element on the context menu [#2520](https://github.com/excalidraw/excalidraw/pull/2520).
- Replace fontSize and fontFamily text with icons [#2857](https://github.com/excalidraw/excalidraw/pull/2857).

### Fixes

- Export dialog canvas positioning [#3397](https://github.com/excalidraw/excalidraw/pull/3397).
- Don't share collab types with core [#3353](https://github.com/excalidraw/excalidraw/pull/3353).
- Support d&d of files without extension [#3168](https://github.com/excalidraw/excalidraw/pull/3168).
- Positions stats for linear elements [#3331](https://github.com/excalidraw/excalidraw/pull/3331).
- Debounce.flush invokes func even if never queued before [#3326](https://github.com/excalidraw/excalidraw/pull/3326).
- State selection state on opening contextMenu [#3333](https://github.com/excalidraw/excalidraw/pull/3333).
- Add unique key for library header to resolve dev warnings [#3316](https://github.com/excalidraw/excalidraw/pull/3316).
- disallow create text in viewMode on mobile [#3219](https://github.com/excalidraw/excalidraw/pull/3219).
- Make help toggle tabbable [#3310](https://github.com/excalidraw/excalidraw/pull/3310)
- Show Windows share icon for Windows users [#3306](https://github.com/excalidraw/excalidraw/pull/3306).
- Don't scroll to content on INIT websocket message [#3291](https://github.com/excalidraw/excalidraw/pull/3291).

### Refactor

- Use arrow function where possible [#3315](https://github.com/excalidraw/excalidraw/pull/3315).

---

## 0.5.0 (2021-03-21)

## Excalidraw API

### Features

- Set the target to `window.name` if present during excalidraw libraries installation so it opens in same tab for the host. If `window.name` is not set it will open in a new tab [#3299](https://github.com/excalidraw/excalidraw/pull/3299).
- Add `name` prop to indicate the name of the drawing which will be used when exporting the drawing. When supplied, the value takes precedence over `intialData.appState.name`, the `name` will be fully controlled by host app and the users won't be able to edit from within Excalidraw [#3273](https://github.com/excalidraw/excalidraw/pull/3273).
- Export API `setCanvasOffsets` via `ref` to set the offsets for Excalidraw[#3265](https://github.com/excalidraw/excalidraw/pull/3265).
  #### BREAKING CHANGE
  - `offsetLeft` and `offsetTop` props have been removed now so you have to use the `setCanvasOffsets` via `ref` to achieve the same.
- Export API to export the drawing to canvas, svg and blob [#3258](https://github.com/excalidraw/excalidraw/pull/3258). For more info you can check the [readme](https://github.com/excalidraw/excalidraw/tree/master/src/packages/excalidraw/README.md#user-content-export-utils)
- Add a `theme` prop to indicate Excalidraw's theme. [#3228](https://github.com/excalidraw/excalidraw/pull/3228). When this prop is passed, the theme is fully controlled by host app.
- Support `libraryReturnUrl` prop to indicate what URL to install libraries to [#3227](https://github.com/excalidraw/excalidraw/pull/3227).

### Refactor

- #### BREAKING CHANGE
  - Rename prop `initialData.scrollToCenter` and `setScrollToCenter` API exposed via ref to `initialData.scrollToContent` and `setScrollToContent` respectively[#3261](https://github.com/excalidraw/excalidraw/pull/3261).
- Rename appearance to theme [#3237](https://github.com/excalidraw/excalidraw/pull/3237).
  #### BREAKING CHANGE
  - Since `appState.appearance` is renamed to `appState.theme` so wherever `appState.appearance` including `initialData.appState.appearance` should be renamed to `appState.theme` and `initialData.appState.theme` respectively. If the `appearance` was persisted earlier, now it needs to passed as `theme`.
  - The class `Appearance_dark` is renamed to `theme--dark`.
  - The class `Appearance_dark-background-none` is renamed to `theme--dark-background-none`.

## Excalidraw Library

### Features

- Support pasting file contents & always prefer system clip [#3257](https://github.com/excalidraw/excalidraw/pull/3257)
- Add label for name field and use input when editable in export dialog [#3286](https://github.com/excalidraw/excalidraw/pull/3286)
- Implement the Web Share Target API [#3230](https://github.com/excalidraw/excalidraw/pull/3230).

### Fixes

- Don't show export and delete when library is empty [#3288](https://github.com/excalidraw/excalidraw/pull/3288)
- Overflow in textinput in export dialog [#3284](https://github.com/excalidraw/excalidraw/pull/3284).
- Bail on noop updates for newElementWith [#3279](https://github.com/excalidraw/excalidraw/pull/3279).
- Prevent State continuously updated when holding ctrl/cmd #3283
- Debounce flush not invoked if lastArgs not defined [#3281](https://github.com/excalidraw/excalidraw/pull/3281).
- Stop preventing canvas pointerdown/tapend events [#3207](https://github.com/excalidraw/excalidraw/pull/3207).
- Double scrollbar on modals [#3226](https://github.com/excalidraw/excalidraw/pull/3226).

---

## 0.4.3 (2021-03-12)

## Excalidraw API

### Fixes

- Allow copy of excalidraw elements only when inside excalidraw [#3206](https://github.com/excalidraw/excalidraw/pull/3206).
- Position text editor absolute and fix the offsets so it doesn't remain fixed when the container is scrolled [#3200](https://github.com/excalidraw/excalidraw/pull/3200).
- Scope CSS variables so that host CSS vars don't clash with excalidraw [#3199](https://github.com/excalidraw/excalidraw/pull/3199).

## Excalidraw Library

- Apply correct translation when text editor overflows when zoom not 100% [#3225](https://github.com/excalidraw/excalidraw/pull/3225)
- Don't overflow text beyond width of Excalidraw [#3215](https://github.com/excalidraw/excalidraw/pull/3215).

---

## 0.4.2

## Excalidraw API

### Fixes

- Wrap excalidraw in position relative so host need not do it anymore & hide scrollbars in zen mode [#3174](https://github.com/excalidraw/excalidraw/pull/3174).
- Reduce the scroll debounce timeout to `100ms` so `offsets` gets updated faster if changed when container scrolled [#3182](https://github.com/excalidraw/excalidraw/pull/3182).
- Rerender UI on `renderFooter` prop change [#3183](https://github.com/excalidraw/excalidraw/pull/3183)

## Excalidraw Library

### Fixes

- Temporarily downgrade browser-fs-access to fix legacy FS API [#3172](https://github.com/excalidraw/excalidraw/pull/3172)

---

## 0.4.1

## Excalidraw API

### Fixes

- Use `Array.from` when spreading over set so that typescript transpiles correctly in the umd build[#3165](https://github.com/excalidraw/excalidraw/pull/3165).

## Excalidraw Library

### Features

- Add export info on copy PNG to clipboard toast message [#3159](https://github.com/excalidraw/excalidraw/pull/3159).
- Use the latest version of Virgil [#3124](https://github.com/excalidraw/excalidraw/pull/3124).
- Support exporting with dark mode [#3046](https://github.com/excalidraw/excalidraw/pull/3046).

### Fixes

- Cursor being leaked outside of canvas [#3161](https://github.com/excalidraw/excalidraw/pull/3161).
- Hide scrollbars in zenMode [#3144](https://github.com/excalidraw/excalidraw/pull/3144).

## 0.4.0

## Excalidraw API

### Features

- Render math notation using the MathJax library. Both Latex input (the default) and AsciiMath input are supported. Math mode is activated by selecting the "normal" font and typing math between delimiters. [#2993](https://github.com/excalidraw/excalidraw/pull/2993).

  The delimiters are double dollar signs ('$$') for Latex and grave accents ('`') for AsciiMath. Press "Control Shift M" to toggle between Latex and AsciiMath. This toggles the input mode for each selected text element which could be in math mode. With only one text element selected, this also sets the default input mode for new text elements. Press "Shift M" to check which input mode the selected text element uses, or the default input mode if no text element is selected.

- Expose `window.EXCALIDRAW_ASSET_PATH` which host can use to load assets from a different URL. By default it will be loaded from `https://unpkg.com/@excalidraw/excalidraw{currentVersion}/dist/`[#3068](https://github.com/excalidraw/excalidraw/pull/3068).

  Also now the assets will have a hash in filename so cache bursting can easily happen with version bump.

- Add support for `scrollToCenter` in [initialData](https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L18) so host can control whether to scroll to center on mount [#3070](https://github.com/excalidraw/excalidraw/pull/3070).

- Export [`restore`](https://github.com/excalidraw/excalidraw/blob/master/src/data/restore.ts#L182), [`restoreAppState`](https://github.com/excalidraw/excalidraw/blob/master/src/data/restore.ts#L144) and [`restoreElements`](https://github.com/excalidraw/excalidraw/blob/master/src/data/restore.ts#L128) to host [#3049](https://github.com/excalidraw/excalidraw/pull/3049)

### Fixes

- Show user state only when [userState](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L35) is passed on remote pointers during collaboration [#3050](https://github.com/excalidraw/excalidraw/pull/3050)

## Excalidraw Library

### Features

- Adjust line-confirm-threshold based on zoom [#2884](https://github.com/excalidraw/excalidraw/pull/2884)

### Fixes

- Hide scrollbars on mobile [#3044](https://github.com/excalidraw/excalidraw/pull/3044)

## 0.3.1

## Excalidraw API

### Fixes

- Support Excalidraw inside scrollable container [#3018](https://github.com/excalidraw/excalidraw/pull/3018)

## Excalidraw Library

### Fixes

- Allow to toggle between modes when view only mode to make UI consistent [#3009](https://github.com/excalidraw/excalidraw/pull/3009)

## 0.3.0

## Excalidraw API

### Features

- Allow host to pass [color](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L36) for [collaborator](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L27) [#2943](https://github.com/excalidraw/excalidraw/pull/2943). The unused prop `user` is now removed.
- Add `zenModeEnabled` and `gridModeEnabled` prop which enables zen mode and grid mode respectively [#2901](https://github.com/excalidraw/excalidraw/pull/2901). When this prop is used, the zen mode / grid mode will be fully controlled by the host app.
- Allow host to pass [userState](https://github.com/excalidraw/excalidraw/blob/6967d8c9851c65bb8873e2f97387749976bbe326/src/types.ts#L35) for [collaborator](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L27) to show the current user state [#2877](https://github.com/excalidraw/excalidraw/pull/2877).
- Add `viewModeEnabled` prop which enabled the view mode [#2840](https://github.com/excalidraw/excalidraw/pull/2840). When this prop is used, the view mode will not show up in context menu is so it is fully controlled by host.
- Expose `getAppState` on `excalidrawRef` [#2834](https://github.com/excalidraw/excalidraw/pull/2834).

### Build

- Remove publicPath so host can use `__webpack_public_path__` to host the assets[#2835](https://github.com/excalidraw/excalidraw/pull/2835)

## Excalidraw Library

### Features

- Add the ability to clear library [#2997](https://github.com/excalidraw/excalidraw/pull/2997)
- Updates to Collaboration and RTL UX [#2994](https://github.com/excalidraw/excalidraw/pull/2994)
- Show toast when saving to existing file [#2988](https://github.com/excalidraw/excalidraw/pull/2988)
- Support supplying custom scale when exporting canvas [#2904](https://github.com/excalidraw/excalidraw/pull/2904)
- Show version in the stats dialog [#2908](https://github.com/excalidraw/excalidraw/pull/2908)
- Add idle detection to collaboration feature [#2877](https://github.com/excalidraw/excalidraw/pull/2877)
- Add view mode in Excalidraw [#2840](https://github.com/excalidraw/excalidraw/pull/2840)
- Increase max zoom [#2881](https://github.com/excalidraw/excalidraw/pull/2881)
- Remove copy & paste from context menu on desktop [#2872](https://github.com/excalidraw/excalidraw/pull/2872)
- Add separators on context menu [#2659](https://github.com/excalidraw/excalidraw/pull/2659)
- Add ctrl-y to redo [#2831](https://github.com/excalidraw/excalidraw/pull/2831)
- Add view mode [#2840](https://github.com/excalidraw/excalidraw/pull/2840).
- Remove `copy`, `cut`, and `paste` actions from contextmenu [#2872](https://github.com/excalidraw/excalidraw/pull/2872)
- Support `Ctrl-Y` shortcut to redo on Windows [#2831](https://github.com/excalidraw/excalidraw/pull/2831).

### Fixes

- Refresh wysiwyg position on canvas resize [#3008](https://github.com/excalidraw/excalidraw/pull/3008)
- Update the `lang` attribute with the current lang. [#2995](https://github.com/excalidraw/excalidraw/pull/2995)
- Rename 'Grid mode' to 'Show grid' [#2944](https://github.com/excalidraw/excalidraw/pull/2944)
- Deal with users on systems that don't handle emoji [#2941](https://github.com/excalidraw/excalidraw/pull/2941)
- Mobile toolbar tooltip regression [#2939](https://github.com/excalidraw/excalidraw/pull/2939)
- Hide collaborator list on mobile if empty [#2938](https://github.com/excalidraw/excalidraw/pull/2938)
- Toolbar unnecessarily eats too much width [#2924](https://github.com/excalidraw/excalidraw/pull/2924)
- Mistakenly hardcoding scale [#2925](https://github.com/excalidraw/excalidraw/pull/2925)
- Text editor not visible in dark mode [#2920](https://github.com/excalidraw/excalidraw/pull/2920)
- Incorrect z-index of text editor [#2914](https://github.com/excalidraw/excalidraw/pull/2914)
- Make scrollbars draggable when offsets are set [#2916](https://github.com/excalidraw/excalidraw/pull/2916)
- Pointer-events being disabled on free-draw [#2912](https://github.com/excalidraw/excalidraw/pull/2912)
- Track zenmode and grid mode usage [#2900](https://github.com/excalidraw/excalidraw/pull/2900)
- Disable UI pointer-events on canvas drag [#2856](https://github.com/excalidraw/excalidraw/pull/2856)
- Stop flooring scroll positions [#2883](https://github.com/excalidraw/excalidraw/pull/2883)
- Apply initialData appState for zenmode and grid stats and refactor check param for actions [#2871](https://github.com/excalidraw/excalidraw/pull/2871)
- Show correct state of Nerd stats in context menu when nerd stats dialog closed [#2874](https://github.com/excalidraw/excalidraw/pull/2874)
- Remote pointers not accounting for offset [#2855](https://github.com/excalidraw/excalidraw/pull/2855)
- Toggle help dialog when "shift+?" is pressed [#2828](https://github.com/excalidraw/excalidraw/pull/2828)
- Add safe check for process so Excalidraw can be loaded via script [#2824](https://github.com/excalidraw/excalidraw/pull/2824)
- Fix UI pointer-events not disabled when dragging on canvas [#2856](https://github.com/excalidraw/excalidraw/pull/2856).
- Fix remote pointers not accounting for offset [#2855](https://github.com/excalidraw/excalidraw/pull/2855).

### Refactor

- Remove duplicate key handling [#2878](https://github.com/excalidraw/excalidraw/pull/2878)
- Reuse scss variables in js for SSOT [#2867](https://github.com/excalidraw/excalidraw/pull/2867)
- Rename browser-nativefs to browser-fs-access [#2862](https://github.com/excalidraw/excalidraw/pull/2862)
- Rewrite collabWrapper to remove TDZs and simplify [#2834](https://github.com/excalidraw/excalidraw/pull/2834)

### Chore

- Use `Sentence case` for `Live collaboration`

## 0.2.1

## Excalidraw API

### Build

- Bundle css files with js [#2819](https://github.com/excalidraw/excalidraw/pull/2819). The host would not need to import css files separately.

## 0.2.0

## Excalidraw API

### Features

- Exported few [Extra API's](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#extra-apis) which can be used by the host to communicate with Excalidraw.

- Remove language picker, and add `langCode`, `renderFooter` [#2644](https://github.com/excalidraw/excalidraw/pull/2644):
  - BREAKING: removed the language picker from UI. It is now the host app's responsibility to implement a language picker if desirable, using the newly added [`renderFooter`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#renderFooter) prop. The reasoning is that the i18n should be controlled by the app itself, not by the nested Excalidraw component.
  - Added [`langCode`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#langCode) prop to control the UI language.
- Add support for `exportToBackend` prop to allow host apps to implement shareable links [#2612](https://github.com/excalidraw/excalidraw/pull/2612/files)

### Fixes

- Hide collaboration button when the prop `onCollabButtonClick` is not provided [#2598](https://github.com/excalidraw/excalidraw/pull/2598)

## Excalidraw Library

### Features

- Add toast [#2772](https://github.com/excalidraw/excalidraw/pull/2772)
- Add `cmd+o` shortcut to load scene [#2732](https://github.com/excalidraw/excalidraw/pull/2732)
- Require use of a preset dialog size; adjust dialog sizing [#2684](https://github.com/excalidraw/excalidraw/pull/2684)
- Add line chart and paste dialog selection [#2670](https://github.com/excalidraw/excalidraw/pull/2670)
- Tweak editing behavior [#2668](https://github.com/excalidraw/excalidraw/pull/2668)
- Change title to Excalidraw after a timeout
- Checkmark to toggle context-menu-items [#2645](https://github.com/excalidraw/excalidraw/pull/2645)
- Add zoom to selection [#2522](https://github.com/excalidraw/excalidraw/pull/2522)
- Insert Library items in the middle of the screen [#2527](https://github.com/excalidraw/excalidraw/pull/2527)
- Show shortcut context menu [#2501](https://github.com/excalidraw/excalidraw/pull/2501)
- Aligns arrowhead schemas [#2517](https://github.com/excalidraw/excalidraw/pull/2517)
- Add Cut to menus [#2511](https://github.com/excalidraw/excalidraw/pull/2511)
- More Arrowheads: dot, bar [#2486](https://github.com/excalidraw/excalidraw/pull/2486)
- Support CSV graphs and improve the look and feel [#2495](https://github.com/excalidraw/excalidraw/pull/2495)

### Fixes

- Fix compile error [#2685](https://github.com/excalidraw/excalidraw/pull/2685)
- Center zoom on iPhone and iPad [#2642](https://github.com/excalidraw/excalidraw/pull/2642)
- Allow text-selecting in dialogs & reset cursor [#2783](https://github.com/excalidraw/excalidraw/pull/2783)
- Don't render due to zoom after unmount [#2779](https://github.com/excalidraw/excalidraw/pull/2779)
- Track the chart type correctly [#2773](https://github.com/excalidraw/excalidraw/pull/2773)
- Fix late-render due to debounced zoom [#2779](https://github.com/excalidraw/excalidraw/pull/2779)
- Fix initialization when browser tab not focused [#2677](https://github.com/excalidraw/excalidraw/pull/2677)
- Consistent case for export locale strings [#2622](https://github.com/excalidraw/excalidraw/pull/2622)
- Remove unnecessary console.error as it was polluting Sentry [#2637](https://github.com/excalidraw/excalidraw/pull/2637)
- Fix scroll-to-center on init for non-zero canvas offsets [#2445](https://github.com/excalidraw/excalidraw/pull/2445)
- Fix resizing the pasted charts [#2586](https://github.com/excalidraw/excalidraw/pull/2586)
- Fix element visibility and zoom on cursor when canvas offset isn't 0. [#2534](https://github.com/excalidraw/excalidraw/pull/2534)
- Fix Library Menu Layout [#2502](https://github.com/excalidraw/excalidraw/pull/2502)
- Support number with commas in charts [#2636](https://github.com/excalidraw/excalidraw/pull/2636)
- Don't break zoom when zooming in on UI [#2638](https://github.com/excalidraw/excalidraw/pull/2638)

### Improvements

- Added Zen Mode to the context menu [#2734](https://github.com/excalidraw/excalidraw/pull/2734)
- Do not reset to selection for draw tool [#2721]((https://github.com/excalidraw/excalidraw/pull/2721)
- Make dialogs look more like dialogs [#2686](https://github.com/excalidraw/excalidraw/pull/2686)
- Browse libraries styles fixed [#2694](https://github.com/excalidraw/excalidraw/pull/2694)
- Change hint for 2-point lines on resize [#2655](https://github.com/excalidraw/excalidraw/pull/2655)
- Align items in context menu [#2640](https://github.com/excalidraw/excalidraw/pull/2640)
- Do not reset to selection when using the draw tool [#2721](https://github.com/excalidraw/excalidraw/pull/2721)
- Display proper tooltip for 2-point lines during resize, and normalize modifier key labels in hints [#2655](https://github.com/excalidraw/excalidraw/pull/2655)
- Improve error message around importing images [#2619](https://github.com/excalidraw/excalidraw/pull/2619)
- Add tooltip with icon for embedding scenes [#2532](https://github.com/excalidraw/excalidraw/pull/2532)
- RTL support for the stats dialog [#2530](https://github.com/excalidraw/excalidraw/pull/2530)
- Expand canvas padding based on zoom. [#2515](https://github.com/excalidraw/excalidraw/pull/2515)
- Hide shortcuts on pickers for mobile [#2508](https://github.com/excalidraw/excalidraw/pull/2508)
- Hide stats and scrollToContent-button when mobile menus open [#2509](https://github.com/excalidraw/excalidraw/pull/2509)

### Refactor

- refactor: Converting span to kbd tag [#2774](https://github.com/excalidraw/excalidraw/pull/2774)
- Media queries [#2680](https://github.com/excalidraw/excalidraw/pull/2680)
- Remove duplicate entry from en.json[#2654](https://github.com/excalidraw/excalidraw/pull/2654)
- Remove the word toggle from labels [#2648](https://github.com/excalidraw/excalidraw/pull/2648)
-

### Docs

- Document some of the more exotic element props [#2673](https://github.com/excalidraw/excalidraw/pull/2673)

## 0.1.1

#### Fix

- Update the homepage URL so it redirects to correct readme [#2498](https://github.com/excalidraw/excalidraw/pull/2498)

## 0.1.0

First release of `@excalidraw/excalidraw`

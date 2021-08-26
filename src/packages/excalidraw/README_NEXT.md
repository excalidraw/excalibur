<!-- unstable-readme-start-->

## Note

**This is an unstable release and not recommended for production. If you don't want to wait for the stable release and try out the unreleased changes you can use this.**

For stable release please use [@excalidraw/excalidraw](https://www.npmjs.com/package/@excalidraw/excalidraw).

<!-- unstable-readme-end-->

### Excalidraw

Excalidraw exported as a component to directly embed in your projects.

### Installation

You can use npm

```
npm install react react-dom @excalidraw/excalidraw-next
```

or via yarn

```
yarn add react react-dom @excalidraw/excalidraw-next
```

After installation you will see a folder `excalidraw-assets` and `excalidraw-assets-dev` in `dist` directory which contains the assets needed for this app in prod and dev mode respectively.

Move the folder `excalidraw-assets` and `excalidraw-assets-dev` to the path where your assets are served.

By default it will try to load the files from `https://unpkg.com/@excalidraw/excalidraw-next/dist/`

If you want to load assets from a different path you can set a variable `window.EXCALIDRAW_ASSET_PATH` depending on environment (for example if you have different URL's for dev and prod) to the url from where you want to load the assets.

### Demo

[Try here](https://codesandbox.io/s/excalidraw-ehlz3).

### Usage

#### Using Web Bundler

If you are using a Web bundler (for instance, Webpack), you can import it as an ES6 module as shown below

<details><summary><strong>View Example</strong></summary>

```js
import React, { useEffect, useState, useRef } from "react";
import Excalidraw from "@excalidraw/excalidraw-next";
import InitialData from "./initialData";

import "./styles.scss";

export default function App() {
  const excalidrawRef = useRef(null);

  const [viewModeEnabled, setViewModeEnabled] = useState(false);
  const [zenModeEnabled, setZenModeEnabled] = useState(false);
  const [gridModeEnabled, setGridModeEnabled] = useState(false);

  const updateScene = () => {
    const sceneData = {
      elements: [
        {
          type: "rectangle",
          version: 141,
          versionNonce: 361174001,
          isDeleted: false,
          id: "oDVXy8D6rom3H1-LLH2-f",
          fillStyle: "hachure",
          strokeWidth: 1,
          strokeStyle: "solid",
          roughness: 1,
          opacity: 100,
          angle: 0,
          x: 100.50390625,
          y: 93.67578125,
          strokeColor: "#c92a2a",
          backgroundColor: "transparent",
          width: 186.47265625,
          height: 141.9765625,
          seed: 1968410350,
          groupIds: [],
        },
      ],
      appState: {
        viewBackgroundColor: "#edf2ff",
      },
    };
    excalidrawRef.current.updateScene(sceneData);
  };

  return (
    <div className="App">
      <h1> Excalidraw Example</h1>
      <div className="button-wrapper">
        <button className="update-scene" onClick={updateScene}>
          Update Scene
        </button>
        <button
          className="reset-scene"
          onClick={() => {
            excalidrawRef.current.resetScene();
          }}
        >
          Reset Scene
        </button>
        <label>
          <input
            type="checkbox"
            checked={viewModeEnabled}
            onChange={() => setViewModeEnabled(!viewModeEnabled)}
          />
          View mode
        </label>
        <label>
          <input
            type="checkbox"
            checked={zenModeEnabled}
            onChange={() => setZenModeEnabled(!zenModeEnabled)}
          />
          Zen mode
        </label>
        <label>
          <input
            type="checkbox"
            checked={gridModeEnabled}
            onChange={() => setGridModeEnabled(!gridModeEnabled)}
          />
          Grid mode
        </label>
      </div>
      <div className="excalidraw-wrapper">
        <Excalidraw
          ref={excalidrawRef}
          initialData={InitialData}
          onChange={(elements, state) =>
            console.log("Elements :", elements, "State : ", state)
          }
          onPointerUpdate={(payload) => console.log(payload)}
          onCollabButtonClick={() =>
            window.alert("You clicked on collab button")
          }
          viewModeEnabled={viewModeEnabled}
          zenModeEnabled={zenModeEnabled}
          gridModeEnabled={gridModeEnabled}
        />
      </div>
    </div>
  );
}
```

To view the full example visit :point_down:

[![Edit excalidraw](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/excalidraw-ehlz3?fontsize=14&hidenavigation=1&theme=dark)

</details>

Since Excalidraw doesn't support server side rendering yet, you should render the component once the host is mounted.

```js
import { useState, useEffect } from "react";
export default function IndexPage() {
  const [Comp, setComp] = useState(null);
  useEffect(() => {
    import("@excalidraw/excalidraw-next").then((comp) => setComp(comp.default));
  }, []);
  return <>{Comp && <Comp />}</>;
}
```

The `types` are available at `@excalidraw/excalidraw-next/types`, you can view [example for typescript](https://codesandbox.io/s/excalidraw-types-9h2dm)

#### In Browser

To use it in a browser directly:

For development use :point_down:

```js
<script
  type="text/javascript"
  src="https://unpkg.com/@excalidraw/excalidraw-next/dist/excalidraw.development.js"
></script>
```

For production use :point_down:

```js
<script
  type="text/javascript"
  src="https://unpkg.com/@excalidraw/excalidraw-next/dist/excalidraw.production.min.js"
></script>
```

You will need to make sure `react`, `react-dom` is available as shown in the below example. For prod please use the production versions of `react`, `react-dom`.

<details><summary><strong>View Example</strong></summary>

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Excalidraw in browser</title>
    <meta charset="UTF-8" />
    <script src="https://unpkg.com/react@16.14.0/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@16.13.1/umd/react-dom.development.js"></script>

    <script
      type="text/javascript"
      src="https://unpkg.com/@excalidraw/excalidraw-next/dist/excalidraw.development.js"
    ></script>
  </head>

  <body>
    <div class="container">
      <h1>Excalidraw Embed Example</h1>
      <div id="app"></div>
    </div>
    <script type="text/javascript" src="src/index.js"></script>
  </body>
</html>
```

```js
/*eslint-disable */
import "./styles.css";
import InitialData from "./initialData";

const App = () => {
  const excalidrawRef = React.useRef(null);

  const [viewModeEnabled, setViewModeEnabled] = React.useState(false);
  const [zenModeEnabled, setZenModeEnabled] = React.useState(false);
  const [gridModeEnabled, setGridModeEnabled] = React.useState(false);

  const updateScene = () => {
    const sceneData = {
      elements: [
        {
          type: "rectangle",
          version: 141,
          versionNonce: 361174001,
          isDeleted: false,
          id: "oDVXy8D6rom3H1-LLH2-f",
          fillStyle: "hachure",
          strokeWidth: 1,
          strokeStyle: "solid",
          roughness: 1,
          opacity: 100,
          angle: 0,
          x: 100.50390625,
          y: 93.67578125,
          strokeColor: "#c92a2a",
          backgroundColor: "transparent",
          width: 186.47265625,
          height: 141.9765625,
          seed: 1968410350,
          groupIds: [],
        },
      ],
      appState: {
        viewBackgroundColor: "#edf2ff",
      },
    };
    excalidrawRef.current.updateScene(sceneData);
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "button-wrapper" },
      React.createElement(
        "button",
        {
          className: "update-scene",
          onClick: updateScene,
        },
        "Update Scene",
      ),
      React.createElement(
        "button",
        {
          className: "reset-scene",
          onClick: () => excalidrawRef.current.resetScene(),
        },
        "Reset Scene",
      ),
      React.createElement(
        "label",
        null,
        React.createElement("input", {
          type: "checkbox",
          checked: viewModeEnabled,
          onChange: () => setViewModeEnabled(!viewModeEnabled),
        }),
        "View mode",
      ),
      React.createElement(
        "label",
        null,
        React.createElement("input", {
          type: "checkbox",
          checked: zenModeEnabled,
          onChange: () => setZenModeEnabled(!zenModeEnabled),
        }),
        "Zen mode",
      ),
      React.createElement(
        "label",
        null,
        React.createElement("input", {
          type: "checkbox",
          checked: gridModeEnabled,
          onChange: () => setGridModeEnabled(!gridModeEnabled),
        }),
        "Grid mode",
      ),
    ),
    React.createElement(
      "div",
      {
        className: "excalidraw-wrapper",
        ref: excalidrawWrapperRef,
      },
      React.createElement(Excalidraw.default, {
        initialData: InitialData,
        onChange: (elements, state) =>
          console.log("Elements :", elements, "State : ", state),
        onPointerUpdate: (payload) => console.log(payload),
        onCollabButtonClick: () => window.alert("You clicked on collab button"),
        viewModeEnabled: viewModeEnabled,
        zenModeEnabled: zenModeEnabled,
        gridModeEnabled: gridModeEnabled,
      }),
    ),
  );
};

const excalidrawWrapper = document.getElementById("app");

ReactDOM.render(React.createElement(App), excalidrawWrapper);
```

To view the full example visit :point_down:

[![Edit excalidraw-in-browser](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/excalidraw-in-browser-tlqom?fontsize=14&hidenavigation=1&theme=dark)

</details>

### Props

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [`onChange`](#onChange) | Function |  | This callback is triggered whenever the component updates due to any change. This callback will receive the excalidraw elements and the current app state. |
| [`initialData`](#initialData) | <pre>{elements?: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement[]</a>, appState?: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42">AppState<a> } </pre> | null | The initial data with which app loads. |
| [`ref`](#ref) | [`createRef`](https://reactjs.org/docs/refs-and-the-dom.html#creating-refs) &#124; [`useRef`](https://reactjs.org/docs/hooks-reference.html#useref) &#124; [`callbackRef`](https://reactjs.org/docs/refs-and-the-dom.html#callback-refs) &#124; <pre>{ current: { readyPromise: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/utils.ts#L317">resolvablePromise</a> } }</pre> |  | Ref to be passed to Excalidraw |
| [`onCollabButtonClick`](#onCollabButtonClick) | Function |  | Callback to be triggered when the collab button is clicked |
| [`isCollaborating`](#isCollaborating) | `boolean` |  | This implies if the app is in collaboration mode |
| [`onPointerUpdate`](#onPointerUpdate) | Function |  | Callback triggered when mouse pointer is updated. |
| [`langCode`](#langCode) | string | `en` | Language code string |
| [`renderTopRightUI`](#renderTopRightUI) | Function |  | Function that renders custom UI in top right corner |
| [`renderFooter `](#renderFooter) | Function |  | Function that renders custom UI footer |
| [`renderCustomStats`](#renderCustomStats) | Function |  | Function that can be used to render custom stats on the stats dialog. |
| [`viewModeEnabled`](#viewModeEnabled) | boolean |  | This implies if the app is in view mode. |
| [`zenModeEnabled`](#zenModeEnabled) | boolean |  | This implies if the zen mode is enabled |
| [`gridModeEnabled`](#gridModeEnabled) | boolean |  | This implies if the grid mode is enabled |
| [`libraryReturnUrl`](#libraryReturnUrl) | string |  | What URL should [libraries.excalidraw.com](https://libraries.excalidraw.com) be installed to |
| [`theme`](#theme) | `light` or `dark` |  | The theme of the Excalidraw component |
| [`name`](#name) | string |  | Name of the drawing |
| [`UIOptions`](#UIOptions) | <pre>{ canvasActions: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L208"> CanvasActions<a/> }</pre> | [DEFAULT UI OPTIONS](https://github.com/excalidraw/excalidraw/blob/master/src/constants.ts#L129) | To customise UI options. Currently we support customising [`canvas actions`](#canvasActions) |
| [`onPaste`](#onPaste) | <pre>(data: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/clipboard.ts#L17">ClipboardData</a>, event: ClipboardEvent &#124; null) => boolean</pre> |  | Callback to be triggered if passed when the something is pasted in to the scene |
| [`detectScroll`](#detectScroll) | boolean | true | Indicates whether to update the offsets when nearest ancestor is scrolled. |
| [`handleKeyboardGlobally`](#handleKeyboardGlobally) | boolean | false | Indicates whether to bind the keyboard events to document. |
| [`onLibraryChange`](#onLibraryChange) | <pre>(items: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L200">LibraryItems</a>) => void &#124; Promise&lt;any&gt; </pre> |  | The callback if supplied is triggered when the library is updated and receives the library items. |
| [`autoFocus`](#autoFocus) | boolean | false | Implies whether to focus the Excalidraw component on page load |
| [`onBeforeTextEdit`](#onBeforeTextEdit) | (textElement: ExcalidrawTextElement) => string |  | Callback to be triggered when a text element is about to be edited. |
| [`onBeforeTextSubmit`](#onBeforeTextSubmit) | (textElement: ExcalidrawTextElement, textToSubmit:string, isDeleted:boolean) => string |  | Callback to be triggered when the editing of a text element is finished. |

### Dimensions of Excalidraw

Excalidraw takes `100%` of `width` and `height` of the containing block so make sure the container in which you render Excalidraw has non zero dimensions.

#### `onChange`

Every time component updates, this callback if passed will get triggered and has the below signature.

```js
(excalidrawElements, appState) => void;
```

1.`excalidrawElements`: Array of [excalidrawElements](https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78) in the scene.

2.`appState`: [AppState](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42) of the scene

Here you can try saving the data to your backend or local storage for example.

#### `initialData`

This helps to load Excalidraw with `initialData`. It must be an object or a [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise) which resolves to an object containing the below optional fields.

| Name | Type | Descrption |
| --- | --- | --- |
| `elements` | [ExcalidrawElement[]](https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78) | The elements with which Excalidraw should be mounted. |
| `appState` | [AppState](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42) | The App state with which Excalidraw should be mounted. |
| `scrollToContent` | boolean | This attribute implies whether to scroll to the nearest element to center once Excalidraw is mounted. By default, it will not scroll the nearest element to the center. Make sure you pass `initialData.appState.scrollX` and `initialData.appState.scrollY` when `scrollToContent` is false so that scroll positions are retained |
| `libraryItems` | [LibraryItems](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L151) | This library items with which Excalidraw should be mounted. |

```json
{
  "elements": [
    {
      "type": "rectangle",
      "version": 141,
      "versionNonce": 361174001,
      "isDeleted": false,
      "id": "oDVXy8D6rom3H1-LLH2-f",
      "fillStyle": "hachure",
      "strokeWidth": 1,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "angle": 0,
      "x": 100.50390625,
      "y": 93.67578125,
      "strokeColor": "#000000",
      "backgroundColor": "transparent",
      "width": 186.47265625,
      "height": 141.9765625,
      "seed": 1968410350,
      "groupIds": []
    }
  ],
  "appState": { "zenModeEnabled": true, "viewBackgroundColor": "#AFEEEE" }
}
```

You might want to use this when you want to load excalidraw with some initial elements and app state.

#### `ref`

You can pass a `ref` when you want to access some excalidraw APIs. We expose the below APIs:

| API | signature | Usage |
| --- | --- | --- |
| ready | `boolean` | This is set to true once Excalidraw is rendered |
| readyPromise | [resolvablePromise](https://github.com/excalidraw/excalidraw/blob/master/src/utils.ts#L317) | This promise will be resolved with the api once excalidraw has rendered. This will be helpful when you want do some action on the host app once this promise resolves. For this to work you will have to pass ref as shown [here](#readyPromise) |
| [updateScene](#updateScene) | <pre>(<a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L207">sceneData</a>)) => void </pre> | updates the scene with the sceneData |
| resetScene | `({ resetLoadingState: boolean }) => void` | Resets the scene. If `resetLoadingState` is passed as true then it will also force set the loading state to false. |
| getSceneElementsIncludingDeleted | <pre> () => <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement[]</a></pre> | Returns all the elements including the deleted in the scene |
| getSceneElements | <pre> () => <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement[]</a></pre> | Returns all the elements excluding the deleted in the scene |
| getAppState | <pre> () => <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42">AppState</a></pre> | Returns current appState |
| history | `{ clear: () => void }` | This is the history API. `history.clear()` will clear the history |
| scrollToContent | <pre> (target?: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement</a> &#124; <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement</a>[]) => void </pre> | Scroll the nearest element out of the elements supplied to the center. Defaults to the elements on the scene. |
| refresh | `() => void` | Updates the offsets for the Excalidraw component so that the coordinates are computed correctly (for example the cursor position). You don't have to call this when the position is changed on page scroll or when the excalidraw container resizes (we handle that ourselves). For any other cases if the position of excalidraw is updated (example due to scroll on parent container and not page scroll) you should call this API. |
| [importLibrary](#importlibrary) | `(url: string, token?: string) => void` | Imports library from given URL |
| setToastMessage | `(message: string) => void` | This API can be used to show the toast with custom message. |
| [id](#id) | string | Unique ID for the excalidraw component. |

#### `readyPromise`

<pre>
const excalidrawRef = { current: { readyPromise: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/utils.ts#L317">resolvablePromise</a>}}
</pre>

Since plain object is passed as a `ref`, the `readyPromise` is resolved as soon as the component is mounted. Most of the time you will not need this unless you have a specific use case where you can't pass the `ref` in the react way and want to do some action on the host when this promise resolves. You can check the [example](https://codesandbox.io/s/eexcalidraw-resolvable-promise-d0qg3?file=/src/App.js) for the usage.

### `updateScene`

<pre>
(<a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L207">sceneData</a>)) => void
</pre>

You can use this function to update the scene with the sceneData. It accepts the below attributes.

| Name | Type | Description |
| --- | --- | --- |
| `elements` | [`ImportedDataState["elements"]`](https://github.com/excalidraw/excalidraw/blob/master/src/data/types.ts#L17) | The `elements` to be updated in the scene |
| `appState` | [`ImportedDataState["appState"]`](https://github.com/excalidraw/excalidraw/blob/master/src/data/types.ts#L18) | The `appState` to be updated in the scene. |
| `collaborators` | <pre>Map<string, <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L29">Collaborator></a></pre> | The list of collaborators to be updated in the scene. |
| `commitToHistory` | `boolean` | Implies if the `history (undo/redo)` should be recorded. Defaults to `false`. |

#### `onCollabButtonClick`

This callback is triggered when clicked on the collab button in excalidraw. If not supplied, the collab dialog button is not rendered.

#### `isCollaborating`

This prop indicates if the app is in collaboration mode.

#### `onPointerUpdate`

This callback is triggered when mouse pointer is updated.

```js
({ x, y }, button, pointersMap}) => void;
```

1.`{x, y}`: Pointer coordinates

2.`button`: The position of the button. This will be one of `["down", "up"]`

3.`pointersMap`: [`pointers map`](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L131) of the scene

```js
(exportedElements, appState, canvas) => void
```

1. `exportedElements`: An array of [non deleted elements](https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L87) which needs to be exported.
2. `appState`: [AppState](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42) of the scene.
3. `canvas`: The `HTMLCanvasElement` of the scene.

#### `langCode`

Determines the language of the UI. It should be one of the [available language codes](https://github.com/excalidraw/excalidraw/blob/master/src/i18n.ts#L14). Defaults to `en` (English). We also export default language and supported languages which you can import as shown below.

```js
import { defaultLang, languages } from "@excalidraw/excalidraw-next";
```

| name | type |
| --- | --- |
| defaultLang | string |
| languages | [Language[]](https://github.com/excalidraw/excalidraw/blob/master/src/i18n.ts#L8) |

#### `renderTopRightUI`

<pre>
(isMobile: boolean, appState: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42">AppState</a>) => JSX
</pre>

A function returning JSX to render custom UI in the top right corner of the app.

#### `renderFooter`

<pre>
(isMobile: boolean, appState: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42">AppState</a>) => JSX
</pre>

A function returning JSX to render custom UI footer. For example, you can use this to render a language picker that was previously being rendered by Excalidraw itself (for now, you'll need to implement your own language picker).

#### `renderCustomStats`

A function that can be used to render custom stats (returns JSX) in the nerd stats dialog. For example you can use this prop to render the size of the elements in the storage.

#### `viewModeEnabled`

This prop indicates whether the app is in `view mode`. When supplied, the value takes precedence over `intialData.appState.viewModeEnabled`, the `view mode` will be fully controlled by the host app, and users won't be able to toggle it from within the app.

#### `zenModeEnabled`

This prop indicates whether the app is in `zen mode`. When supplied, the value takes precedence over `intialData.appState.zenModeEnabled`, the `zen mode` will be fully controlled by the host app, and users won't be able to toggle it from within the app.

#### `gridModeEnabled`

This prop indicates whether the shows the grid. When supplied, the value takes precedence over `intialData.appState.gridModeEnabled`, the grid will be fully controlled by the host app, and users won't be able to toggle it from within the app.

#### `libraryReturnUrl`

If supplied, this URL will be used when user tries to install a library from [libraries.excalidraw.com](https://libraries.excalidraw.com). Defaults to `window.location.origin + window.location.pathname`. To install the libraries in the same tab from which it was opened, you need to set `window.name` (to any alphanumeric string) — if it's not set it will open in a new tab.

#### `theme`

This prop controls Excalidraw's theme. When supplied, the value takes precedence over `intialData.appState.theme`, the theme will be fully controlled by the host app, and users won't be able to toggle it from within the app.

#### `name`

This prop sets the name of the drawing which will be used when exporting the drawing. When supplied, the value takes precedence over `intialData.appState.name`, the `name` will be fully controlled by host app and the users won't be able to edit from within Excalidraw.

#### `UIOptions`

This prop can be used to customise UI of Excalidraw. Currently we support customising only [`canvasActions`](#canvasActions). It accepts the below parameters

<pre>
{ canvasActions: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L208"> CanvasActions<a/> }
</pre>

##### canvasActions

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `changeViewBackgroundColor` | boolean | true | Implies whether to show `Background color picker` |
| `clearCanvas` | boolean | true | Implies whether to show `Clear canvas button` |
| `export` | false &#124; [exportOpts](#exportOpts) | <pre>{ saveFileToDisk: true }</pre> | This prop allows to customize the UI inside the export dialog. By default it shows the "saveFileToDisk". If this prop is `false` the export button will not be rendered. For more details visit [`exportOpts`](#exportOpts). |
| `loadScene` | boolean | true | Implies whether to show `Load button` |
| `saveToActiveFile` | boolean | true | Implies whether to show `Save button` to save to current file |
| `theme` | boolean | true | Implies whether to show `Theme toggle` |
| `saveAsImage` | boolean | true | Implies whether to show `Save as image button` |

#### `exportOpts`

The below attributes can be set in `UIOptions.canvasActions.export` to customize the export dialog. If `UIOptions.canvasActions.export` is `false` the export button will not be rendered.

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `saveFileToDisk` | boolean | true | Implies if save file to disk button should be shown |
| `exportToBackend` | <pre> (exportedElements: readonly NonDeletedExcalidrawElement[],appState: AppState,canvas: HTMLCanvasElement &#124; null) => void </pre> |  | This callback is triggered when the shareable-link button is clicked in the export dialog. The link button will only be shown if this callback is passed. |
| `renderCustomUI` | <pre> (exportedElements: readonly NonDeletedExcalidrawElement[],appState: AppState,canvas: HTMLCanvasElement &#124; null) => void </pre> |  | This callback should be supplied if you want to render custom UI in the export dialog. |

#### `onPaste`

This callback is triggered if passed when something is pasted into the scene. You can use this callback in case you want to do something additional when the paste event occurs.

<pre>
(data: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/clipboard.ts#L17">ClipboardData</a>, event: ClipboardEvent &#124; null) => boolean
</pre>

This callback must return a `boolean` value or a [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise) which resolves to a boolean value.

In case you want to prevent the excalidraw paste action you must return `true`, it will stop the native excalidraw clipboard management flow (nothing will be pasted into the scene).

### Does it support collaboration ?

No, Excalidraw package doesn't come with collaboration built in, since the implementation is specific to each host app. We expose APIs which you can use to communicate with Excalidraw which you can use to implement it. You can check our own implementation [here](https://github.com/excalidraw/excalidraw/blob/master/src/excalidraw-app/index.tsx).

### importLibrary

Imports library from given URL. You should call this on `hashchange`, passing the `addLibrary` value if you detect it as shown below. Optionally pass a CSRF `token` to skip prompting during installation (retrievable via `token` key from the url coming from [https://libraries.excalidraw.com](https://libraries.excalidraw.com/)).

```js
useEffect(() => {
  const onHashChange = () => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const libraryUrl = hash.get("addLibrary");
    if (libraryUrl) {
      excalidrawRef.current.importLibrary(libraryUrl, hash.get("token"));
    }
  };
  window.addEventListener("hashchange", onHashChange, false);
  return () => {
    window.removeEventListener("hashchange", onHashChange);
  };
}, []);
```

Try out the [Demo](#Demo) to see it in action.

### detectScroll

Indicates whether Excalidraw should listen for `scroll` event on the nearest scrollable container in the DOM tree and recompute the coordinates (e.g. to correctly handle the cursor) when the component's position changes. You can disable this when you either know this doesn't affect your app or you want to take care of it yourself (calling the [`refresh()`](#ref) method).

### handleKeyboardGlobally

Indicates whether to bind keyboard events to `document`. Disabled by default, meaning the keyboard events are bound to the Excalidraw component. This allows for multiple Excalidraw components to live on the same page, and ensures that Excalidraw keyboard handling doesn't collide with your app's (or the browser) when the component isn't focused.

Enable this if you want Excalidraw to handle keyboard even if the component isn't focused (e.g. a user is interacting with the navbar, sidebar, or similar).

### onLibraryChange

Ths callback if supplied will get triggered when the library is updated and has the below signature.

<pre>
(items: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L200">LibraryItems</a>) => void | Promise<any>
</pre>

It is invoked with empty items when user clears the library. You can use this callback when you want to do something additional when library is updated for example persisting it to local storage.

### id

The unique id of the excalidraw component. This can be used to identify the excalidraw component, for example importing the library items to the excalidraw component from where it was initiated when you have multiple excalidraw components rendered on the same page as shown in [multiple excalidraw demo](https://codesandbox.io/s/multiple-excalidraw-k1xx5).

### autoFocus

This prop implies whether to focus the Excalidraw component on page load. Defaults to false.

### onBeforeTextEdit

Callback to be triggered when a text element is about to be edited. The string returned will replace the element's text. If `null` is returned, the TextElement will not be changed. Use this to pre-process text before editing.

<pre>
(textElement: ExcalidrawTextElement) => string
</pre>

### onBeforeTextSubmit

Callback to be triggered when the editing of a TextElement is finished, but right before the result is submitted. The string returned will replace the text element's text. Use this to post-process text after editing has finished.

<pre>
(textElement: ExcalidrawTextElement, textToSubmit:string, isDeleted:boolean) => string
</pre>

### Extra API's

#### `getSceneVersion`

**How to use**

<pre>
import { getSceneVersion } from "@excalidraw/excalidraw-next";
getSceneVersion(elements:  <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement[]</a>)
</pre>

This function returns the current scene version.

#### `isInvisiblySmallElement`

**_Signature_**

<pre>
isInvisiblySmallElement(element:  <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement</a>): boolean
</pre>

**How to use**

```js
import { isInvisiblySmallElement } from "@excalidraw/excalidraw-next";
```

Returns `true` if element is invisibly small (e.g. width & height are zero).

#### `getElementMap`

**_Signature_**

<pre>
getElementsMap(elements:  <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement[]</a>): {[id: string]: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement</a>}
</pre>

**How to use**

```js
import { getElementsMap } from "@excalidraw/excalidraw-next";
```

This function returns an object where each element is mapped to its id.

### Restore utilities

#### `restoreAppState`

**_Signature_**

<pre>
restoreAppState(appState: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/data/types.ts#L17">ImportedDataState["appState"]</a>, localAppState: Partial<<a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42">AppState</a>> | null): <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42">AppState</a>
</pre>

**_How to use_**

```js
import { restoreAppState } from "@excalidraw/excalidraw-next";
```

This function will make sure all the keys have appropriate values in [appState](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42) and if any key is missing, it will be set to default value.

When `localAppState` is supplied, it's used in place of values that are missing (`undefined`) in `appState` instead of defaults. Use this as a way to not override user's defaults if you persist them. Required: supply `null`/`undefined` if not applicable.

#### `restoreElements`

**_Signature_**

<pre>
restoreElements(elements: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/data/types.ts#L16">ImportedDataState["elements"]</a>, localElements: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/data/types.ts#L16">ExcalidrawElement[]</a> | null | undefined): <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement[]</a>
</pre>

**_How to use_**

```js
import { restoreElements } from "@excalidraw/excalidraw-next";
```

This function will make sure all properties of element is correctly set and if any attribute is missing, it will be set to default value.

When `localElements` are supplied, they are used to ensure that existing restored elements reuse `version` (and increment it), and regenerate `versionNonce`. Use this when you import elements which may already be present in the scene to ensure that you do not disregard the newly imported elements if you're using element version to detect the updates.

#### `restore`

**_Signature_**

<pre>
restoreElements(data: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/data/types.ts#L12">ImportedDataState</a>, localAppState: Partial<<a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42">AppState</a>> | null | undefined, localElements: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/data/types.ts#L16">ExcalidrawElement[]</a> | null | undefined): <a href="https://github.com/excalidraw/excalidraw/blob/master/src/data/types.ts#L4">DataState</a>
</pre>

See [`restoreAppState()`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#restoreAppState) about `localAppState`, and [`restoreElements()`](https://github.com/excalidraw/excalidraw/blob/master/src/packages/excalidraw/README.md#restoreElements) about `localElements`.

**_How to use_**

```js
import { restore } from "@excalidraw/excalidraw-next";
```

This function makes sure elements and state is set to appropriate values and set to default value if not present. It is a combination of [restoreElements](#restoreElements) and [restoreAppState](#restoreAppState).

#### `serializeAsJSON`

**_Signature_**

<pre>
serializeAsJSON({
  elements: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement[]</a>,
  appState: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42">AppState</a>,
}): string
</pre>

Takes the scene elements and state and returns a JSON string. Deleted `elements`as well as most properties from `AppState` are removed from the resulting JSON. (see [`serializeAsJSON()`](https://github.com/excalidraw/excalidraw/blob/master/src/data/json.ts#L16) source for details).

### Export utilities

#### `exportToCanvas`

**_Signature_**

<pre
>exportToCanvas({
  elements,
  appState
  getDimensions,
}: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/packages/utils.ts#L10">ExportOpts</a>
</pre>

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| elements | [Excalidraw Element []](https://github.com/excalidraw/excalidraw/blob/master/src/element/types) |  | The elements to be exported to canvas |
| appState | [AppState](https://github.com/excalidraw/excalidraw/blob/master/src/packages/utils.ts#L12) | [defaultAppState](https://github.com/excalidraw/excalidraw/blob/master/src/appState.ts#L11) | The app state of the scene |
| getDimensions | `(width: number, height: number) => {width: number, height: number, scale: number)` | `(width, height) => ({ width, height, scale: 1 })` | A function which returns the width, height and scale with which canvas is to be exported. |

**How to use**

```js
import { exportToCanvas } from "@excalidraw/excalidraw-next";
```

This function returns the canvas with the exported elements, appState and dimensions.

#### `exportToBlob`

**_Signature_**

<pre>
exportToBlob(
  opts: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/packages/utils.ts#L10">ExportOpts</a> & {
  mimeType?: string,
  quality?: number;
})
</pre>

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| opts |  |  | This param is passed to `exportToCanvas`. You can refer to [`exportToCanvas`](#exportToCanvas) |
| mimeType | string | "image/png" | Indicates the image format |
| quality | number | 0.92 | A value between 0 and 1 indicating the [image quality](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob#parameters). Applies only to `image/jpeg`/`image/webp` MIME types. |

**How to use**

```js
import { exportToBlob } from "@excalidraw/excalidraw-next";
```

Returns a promise which resolves with a [blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob). It internally uses [canvas.ToBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob).

#### `exportToSvg`

**_Signature_**

<pre>
exportToSvg({
  elements: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78">ExcalidrawElement[]</a>,
  appState: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42">AppState</a>,
  exportPadding?: number,
  metadata?: string,
})
</pre>

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| elements | [Excalidraw Element []](https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L78) |  | The elements to exported as svg |
| appState | [AppState](https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42) | [defaultAppState](https://github.com/excalidraw/excalidraw/blob/master/src/appState.ts#L11) | The app state of the scene |
| exportPadding | number | 10 | The padding to be added on canvas |

This function returns a promise which resolves to svg of the exported drawing.

##### Additional attributes of appState for `export\*` APIs

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| exportBackground | boolean | true | Indicates whether background should be exported |
| viewBackgroundColor | string | #fff | The default background color |
| exportWithDarkMode | boolean | false | Indicates whether to export with dark mode |
| exportEmbedScene | boolean | false | Indicates whether scene data should be embedded in svg. This will increase the svg size. |

### FONT_FAMILY

**How to use**

```js
import { FONT_FAMILY } from "@excalidraw/excalidraw-next";
```

`FONT_FAMILY` contains all the font families used in `Excalidraw` as explained below

| Font Family | Description          |
| ----------- | -------------------- |
| Virgil      | The handwritten font |
| Helvetica   | The Normal Font      |
| Cascadia    | The Code Font        |

Defaults to `FONT_FAMILY.Virgil` unless passed in `initialData.appState.currentItemFontFamily`.

### loadLibraryFromBlob

```js
import { loadLibraryFromBlob } from "@excalidraw/excalidraw-next";
```

**_Signature_**

<pre>
loadLibraryFromBlob(blob: <a href="https://developer.mozilla.org/en-US/docs/Web/API/Blob">Blob</a>)
</pre>

This function loads the library from the blob.

### loadFromBlob

**How to use**

```js
import { loadFromBlob } from "@excalidraw/excalidraw-next";
```

**Signature**

<pre>
loadFromBlob(blob: <a href="https://developer.mozilla.org/en-US/docs/Web/API/Blob">Blob</a>, localAppState:  <a href="https://github.com/excalidraw/excalidraw/blob/master/src/types.ts#L42">AppState</a> | null)
</pre>

This function loads the scene data from the blob. If you pass `localAppState`, `localAppState` value will be preferred over the `appState` derived from `blob`

### getFreeDrawSvgPath

**How to use**

```js
import { getFreeDrawSvgPath } from "@excalidraw/excalidraw-next";
```

**Signature**

<pre>
getFreeDrawSvgPath(element: <a href="https://github.com/excalidraw/excalidraw/blob/master/src/element/types.ts#L127">ExcalidrawFreeDrawElement</a>
</pre>

This function returns the free draw svg path for the element.

## Need help?

Check out the existing [Q&A](https://github.com/excalidraw/excalidraw/discussions?discussions_q=label%3Apackage%3Aexcalidraw). If you have any queries or need help, ask us [here](https://github.com/excalidraw/excalidraw/discussions?discussions_q=label%3Apackage%3Aexcalidraw).

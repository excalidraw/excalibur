import {
  PointerType,
  ExcalidrawLinearElement,
  NonDeletedExcalidrawElement,
  NonDeleted,
  TextAlign,
  ExcalidrawElement,
  GroupId,
  ExcalidrawBindableElement,
  Arrowhead,
  ChartType,
  FontFamilyValues,
  ImageId,
} from "./element/types";
import { SHAPES } from "./shapes";
import { Point as RoughPoint } from "roughjs/bin/geometry";
import { LinearElementEditor } from "./element/linearElementEditor";
import { SuggestedBinding } from "./element/binding";
import { ImportedDataState } from "./data/types";
import type App from "./components/App";
import type { ResolvablePromise } from "./utils";
import { Spreadsheet } from "./charts";
import { Language } from "./i18n";
import { ClipboardData } from "./clipboard";
import { isOverScrollBars } from "./scene";
import { MaybeTransformHandleType } from "./element/transformHandles";
import Library from "./data/library";

export type Point = Readonly<RoughPoint>;

export type Collaborator = {
  pointer?: {
    x: number;
    y: number;
  };
  button?: "up" | "down";
  selectedElementIds?: AppState["selectedElementIds"];
  username?: string | null;
  userState?: UserIdleState;
  color?: {
    background: string;
    stroke: string;
  };
};

export type AppState = {
  files: Record<
    ExcalidrawElement["id"],
    { type: "image"; id: string; data: string }
  >;
  isLoading: boolean;
  errorMessage: string | null;
  draggingElement: NonDeletedExcalidrawElement | null;
  resizingElement: NonDeletedExcalidrawElement | null;
  multiElement: NonDeleted<ExcalidrawLinearElement> | null;
  selectionElement: NonDeletedExcalidrawElement | null;
  isBindingEnabled: boolean;
  startBoundElement: NonDeleted<ExcalidrawBindableElement> | null;
  suggestedBindings: SuggestedBinding[];
  // element being edited, but not necessarily added to elements array yet
  // (e.g. text element when typing into the input)
  editingElement: NonDeletedExcalidrawElement | null;
  editingLinearElement: LinearElementEditor | null;
  elementType: typeof SHAPES[number]["value"];
  elementLocked: boolean;
  exportBackground: boolean;
  exportEmbedScene: boolean;
  exportWithDarkMode: boolean;
  exportScale: number;
  currentItemStrokeColor: string;
  currentItemBackgroundColor: string;
  currentItemFillStyle: ExcalidrawElement["fillStyle"];
  currentItemStrokeWidth: number;
  currentItemStrokeStyle: ExcalidrawElement["strokeStyle"];
  currentItemRoughness: number;
  currentItemOpacity: number;
  currentItemFontFamily: FontFamilyValues;
  currentItemFontSize: number;
  currentItemTextAlign: TextAlign;
  currentItemStrokeSharpness: ExcalidrawElement["strokeSharpness"];
  currentItemStartArrowhead: Arrowhead | null;
  currentItemEndArrowhead: Arrowhead | null;
  currentItemLinearStrokeSharpness: ExcalidrawElement["strokeSharpness"];
  viewBackgroundColor: string;
  scrollX: number;
  scrollY: number;
  cursorButton: "up" | "down";
  scrolledOutside: boolean;
  name: string;
  isResizing: boolean;
  isRotating: boolean;
  zoom: Zoom;
  openMenu: "canvas" | "shape" | null;
  openPopup:
    | "canvasColorPicker"
    | "backgroundColorPicker"
    | "strokeColorPicker"
    | null;
  lastPointerDownWith: PointerType;
  selectedElementIds: { [id: string]: boolean };
  previousSelectedElementIds: { [id: string]: boolean };
  shouldCacheIgnoreZoom: boolean;
  showHelpDialog: boolean;
  toastMessage: string | null;
  zenModeEnabled: boolean;
  theme: "light" | "dark";
  gridSize: number | null;
  viewModeEnabled: boolean;

  /** top-most selected groups (i.e. does not include nested groups) */
  selectedGroupIds: { [groupId: string]: boolean };
  /** group being edited when you drill down to its constituent element
    (e.g. when you double-click on a group's element) */
  editingGroupId: GroupId | null;
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;

  isLibraryOpen: boolean;
  fileHandle: import("browser-fs-access").FileSystemHandle | null;
  collaborators: Map<string, Collaborator>;
  showStats: boolean;
  currentChartType: ChartType;
  pasteDialog:
    | {
        shown: false;
        data: null;
      }
    | {
        shown: true;
        data: Spreadsheet;
      };
};

export type NormalizedZoomValue = number & { _brand: "normalizedZoom" };

export type Zoom = Readonly<{
  value: NormalizedZoomValue;
  translation: Readonly<{
    x: number;
    y: number;
  }>;
}>;

export type PointerCoords = Readonly<{
  x: number;
  y: number;
}>;

export type Gesture = {
  pointers: Map<number, PointerCoords>;
  lastCenter: { x: number; y: number } | null;
  initialDistance: number | null;
  initialScale: number | null;
};

export declare class GestureEvent extends UIEvent {
  readonly rotation: number;
  readonly scale: number;
}

export type LibraryItem = readonly NonDeleted<ExcalidrawElement>[];
export type LibraryItems = readonly LibraryItem[];

// NOTE ready/readyPromise props are optional for host apps' sake (our own
// implem guarantees existence)
export type ExcalidrawAPIRefValue =
  | ExcalidrawImperativeAPI
  | {
      readyPromise?: ResolvablePromise<ExcalidrawImperativeAPI>;
      ready?: false;
    };

export interface ExcalidrawProps {
  onChange?: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ) => void;
  initialData?: ImportedDataState | null | Promise<ImportedDataState | null>;
  excalidrawRef?: ForwardRef<ExcalidrawAPIRefValue>;
  onCollabButtonClick?: () => void;
  isCollaborating?: boolean;
  onPointerUpdate?: (payload: {
    pointer: { x: number; y: number };
    button: "down" | "up";
    pointersMap: Gesture["pointers"];
  }) => void;
  onPaste?: (
    data: ClipboardData,
    event: ClipboardEvent | null,
  ) => Promise<boolean> | boolean;
  renderTopRightUI?: (isMobile: boolean, appState: AppState) => JSX.Element;
  renderFooter?: (isMobile: boolean, appState: AppState) => JSX.Element;
  langCode?: Language["code"];
  viewModeEnabled?: boolean;
  zenModeEnabled?: boolean;
  gridModeEnabled?: boolean;
  libraryReturnUrl?: string;
  theme?: "dark" | "light";
  name?: string;
  renderCustomStats?: (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: AppState,
  ) => JSX.Element;
  UIOptions?: UIOptions;
  detectScroll?: boolean;
  handleKeyboardGlobally?: boolean;
  onLibraryChange?: (libraryItems: LibraryItems) => void | Promise<any>;
  autoFocus?: boolean;
}

export type SceneData = {
  elements?: ImportedDataState["elements"];
  appState?: ImportedDataState["appState"];
  collaborators?: Map<string, Collaborator>;
  commitToHistory?: boolean;
};

export enum UserIdleState {
  ACTIVE = "active",
  AWAY = "away",
  IDLE = "idle",
}

export type ExportOpts = {
  saveFileToDisk?: boolean;
  onExportToBackend?: (
    exportedElements: readonly NonDeletedExcalidrawElement[],
    appState: AppState,
    canvas: HTMLCanvasElement | null,
  ) => void;
  renderCustomUI?: (
    exportedElements: readonly NonDeletedExcalidrawElement[],
    appState: AppState,
    canvas: HTMLCanvasElement | null,
  ) => JSX.Element;
};

type CanvasActions = {
  changeViewBackgroundColor?: boolean;
  clearCanvas?: boolean;
  export?: false | ExportOpts;
  loadScene?: boolean;
  saveToActiveFile?: boolean;
  theme?: boolean;
  saveAsImage?: boolean;
};

export type UIOptions = {
  canvasActions?: CanvasActions;
};

export type AppProps = ExcalidrawProps & {
  UIOptions: {
    canvasActions: Required<CanvasActions> & { export: ExportOpts };
  };
  detectScroll: boolean;
  handleKeyboardGlobally: boolean;
};

/** A subset of App class properties that we need to use elsewhere
 * in the app, eg Manager. Factored out into a separate type to keep DRY. */
export type AppClassProperties = {
  props: AppProps;
  canvas: HTMLCanvasElement | null;
  focusContainer(): void;
  library: Library;
  imageCache: Map<ImageId, HTMLImageElement>;
};

export type PointerDownState = Readonly<{
  // The first position at which pointerDown happened
  origin: Readonly<{ x: number; y: number }>;
  // Same as "origin" but snapped to the grid, if grid is on
  originInGrid: Readonly<{ x: number; y: number }>;
  // Scrollbar checks
  scrollbars: ReturnType<typeof isOverScrollBars>;
  // The previous pointer position
  lastCoords: { x: number; y: number };
  // map of original elements data
  originalElements: Map<string, NonDeleted<ExcalidrawElement>>;
  resize: {
    // Handle when resizing, might change during the pointer interaction
    handleType: MaybeTransformHandleType;
    // This is determined on the initial pointer down event
    isResizing: boolean;
    // This is determined on the initial pointer down event
    offset: { x: number; y: number };
    // This is determined on the initial pointer down event
    arrowDirection: "origin" | "end";
    // This is a center point of selected elements determined on the initial pointer down event (for rotation only)
    center: { x: number; y: number };
  };
  hit: {
    // The element the pointer is "hitting", is determined on the initial
    // pointer down event
    element: NonDeleted<ExcalidrawElement> | null;
    // The elements the pointer is "hitting", is determined on the initial
    // pointer down event
    allHitElements: NonDeleted<ExcalidrawElement>[];
    // This is determined on the initial pointer down event
    wasAddedToSelection: boolean;
    // Whether selected element(s) were duplicated, might change during the
    // pointer interaction
    hasBeenDuplicated: boolean;
    hasHitCommonBoundingBoxOfSelectedElements: boolean;
  };
  withCmdOrCtrl: boolean;
  drag: {
    // Might change during the pointer interation
    hasOccurred: boolean;
    // Might change during the pointer interation
    offset: { x: number; y: number } | null;
  };
  // We need to have these in the state so that we can unsubscribe them
  eventListeners: {
    // It's defined on the initial pointer down event
    onMove: null | ((event: PointerEvent) => void);
    // It's defined on the initial pointer down event
    onUp: null | ((event: PointerEvent) => void);
    // It's defined on the initial pointer down event
    onKeyDown: null | ((event: KeyboardEvent) => void);
    // It's defined on the initial pointer down event
    onKeyUp: null | ((event: KeyboardEvent) => void);
  };
}>;

export type ExcalidrawImperativeAPI = {
  updateScene: InstanceType<typeof App>["updateScene"];
  resetScene: InstanceType<typeof App>["resetScene"];
  getSceneElementsIncludingDeleted: InstanceType<
    typeof App
  >["getSceneElementsIncludingDeleted"];
  history: {
    clear: InstanceType<typeof App>["resetHistory"];
  };
  scrollToContent: InstanceType<typeof App>["scrollToContent"];
  getSceneElements: InstanceType<typeof App>["getSceneElements"];
  getAppState: () => InstanceType<typeof App>["state"];
  refresh: InstanceType<typeof App>["refresh"];
  importLibrary: InstanceType<typeof App>["importLibraryFromUrl"];
  setToastMessage: InstanceType<typeof App>["setToastMessage"];
  readyPromise: ResolvablePromise<ExcalidrawImperativeAPI>;
  ready: true;
  id: string;
};

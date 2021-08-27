import oc from "open-color";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_ALIGN,
  EXPORT_SCALES,
} from "./constants";
import { t } from "./i18n";
import { AppState, NormalizedZoomValue } from "./types";
import { getDateTime } from "./utils";

const defaultExportScale = EXPORT_SCALES.includes(devicePixelRatio)
  ? devicePixelRatio
  : 1;

export const getDefaultAppState = (): Omit<
  AppState,
  "offsetTop" | "offsetLeft" | "width" | "height"
> => {
  return {
    theme: "light",
    collaborators: new Map(),
    currentChartType: "bar",
    currentItemBackgroundColor: "transparent",
    currentItemEndArrowhead: "arrow",
    currentItemFillStyle: "hachure",
    currentItemFontFamily: DEFAULT_FONT_FAMILY,
    currentItemFontSize: DEFAULT_FONT_SIZE,
    currentItemLinearStrokeSharpness: "round",
    currentItemOpacity: 100,
    currentItemRoughness: 1,
    currentItemStartArrowhead: null,
    currentItemStrokeColor: oc.black,
    currentItemStrokeSharpness: "sharp",
    currentItemStrokeStyle: "solid",
    currentItemStrokeWidth: 1,
    currentItemTextAlign: DEFAULT_TEXT_ALIGN,
    cursorButton: "up",
    draggingElement: null,
    editingElement: null,
    editingGroupId: null,
    editingLinearElement: null,
    elementLocked: false,
    elementType: "selection",
    errorMessage: null,
    exportBackground: true,
    exportScale: defaultExportScale,
    exportEmbedScene: false,
    exportSvgFont: false,
    exportWithDarkMode: false,
    fileHandle: null,
    gridSize: null,
    isBindingEnabled: true,
    isLibraryOpen: false,
    isLoading: false,
    isResizing: false,
    isRotating: false,
    lastPointerDownWith: "mouse",
    multiElement: null,
    name: `${t("labels.untitled")}-${getDateTime()}`,
    openMenu: null,
    openPopup: null,
    pasteDialog: { shown: false, data: null },
    previousSelectedElementIds: {},
    resizingElement: null,
    scrolledOutside: false,
    scrollX: 0,
    scrollY: 0,
    selectedElementIds: {},
    selectedGroupIds: {},
    selectionElement: null,
    shouldCacheIgnoreZoom: false,
    showHelpDialog: false,
    showStats: false,
    startBoundElement: null,
    suggestedBindings: [],
    toastMessage: null,
    viewBackgroundColor: oc.white,
    zenModeEnabled: false,
    zoom: { value: 1 as NormalizedZoomValue, translation: { x: 0, y: 0 } },
    viewModeEnabled: false,
  };
};

/**
 * Config containing all AppState keys. Used to determine whether given state
 *  prop should be stripped when exporting to given storage type.
 */
const APP_STATE_STORAGE_CONF = (<
  Values extends {
    /** whether to keep when storing to browser storage (localStorage/IDB) */
    browser: boolean;
    /** whether to keep when exporting to file/database */
    export: boolean;
  },
  T extends Record<keyof AppState, Values>
>(
  config: { [K in keyof T]: K extends keyof AppState ? T[K] : never },
) => config)({
  theme: { browser: true, export: false },
  collaborators: { browser: false, export: false },
  currentChartType: { browser: true, export: false },
  currentItemBackgroundColor: { browser: true, export: false },
  currentItemEndArrowhead: { browser: true, export: false },
  currentItemFillStyle: { browser: true, export: false },
  currentItemFontFamily: { browser: true, export: false },
  currentItemFontSize: { browser: true, export: false },
  currentItemLinearStrokeSharpness: { browser: true, export: false },
  currentItemOpacity: { browser: true, export: false },
  currentItemRoughness: { browser: true, export: false },
  currentItemStartArrowhead: { browser: true, export: false },
  currentItemStrokeColor: { browser: true, export: false },
  currentItemStrokeSharpness: { browser: true, export: false },
  currentItemStrokeStyle: { browser: true, export: false },
  currentItemStrokeWidth: { browser: true, export: false },
  currentItemTextAlign: { browser: true, export: false },
  cursorButton: { browser: true, export: false },
  draggingElement: { browser: false, export: false },
  editingElement: { browser: false, export: false },
  editingGroupId: { browser: true, export: false },
  editingLinearElement: { browser: false, export: false },
  elementLocked: { browser: true, export: false },
  elementType: { browser: true, export: false },
  errorMessage: { browser: false, export: false },
  exportBackground: { browser: true, export: false },
  exportEmbedScene: { browser: true, export: false },
  exportScale: { browser: true, export: false },
  exportSvgFont: { browser: true, export: false },
  exportWithDarkMode: { browser: true, export: false },
  fileHandle: { browser: false, export: false },
  gridSize: { browser: true, export: true },
  height: { browser: false, export: false },
  isBindingEnabled: { browser: false, export: false },
  isLibraryOpen: { browser: false, export: false },
  isLoading: { browser: false, export: false },
  isResizing: { browser: false, export: false },
  isRotating: { browser: false, export: false },
  lastPointerDownWith: { browser: true, export: false },
  multiElement: { browser: false, export: false },
  name: { browser: true, export: false },
  offsetLeft: { browser: false, export: false },
  offsetTop: { browser: false, export: false },
  openMenu: { browser: true, export: false },
  openPopup: { browser: false, export: false },
  pasteDialog: { browser: false, export: false },
  previousSelectedElementIds: { browser: true, export: false },
  resizingElement: { browser: false, export: false },
  scrolledOutside: { browser: true, export: false },
  scrollX: { browser: true, export: false },
  scrollY: { browser: true, export: false },
  selectedElementIds: { browser: true, export: false },
  selectedGroupIds: { browser: true, export: false },
  selectionElement: { browser: false, export: false },
  shouldCacheIgnoreZoom: { browser: true, export: false },
  showHelpDialog: { browser: false, export: false },
  showStats: { browser: true, export: false },
  startBoundElement: { browser: false, export: false },
  suggestedBindings: { browser: false, export: false },
  toastMessage: { browser: false, export: false },
  viewBackgroundColor: { browser: true, export: true },
  width: { browser: false, export: false },
  zenModeEnabled: { browser: true, export: false },
  zoom: { browser: true, export: false },
  viewModeEnabled: { browser: false, export: false },
});

const _clearAppStateForStorage = <ExportType extends "export" | "browser">(
  appState: Partial<AppState>,
  exportType: ExportType,
) => {
  type ExportableKeys = {
    [K in keyof typeof APP_STATE_STORAGE_CONF]: typeof APP_STATE_STORAGE_CONF[K][ExportType] extends true
      ? K
      : never;
  }[keyof typeof APP_STATE_STORAGE_CONF];
  const stateForExport = {} as { [K in ExportableKeys]?: typeof appState[K] };
  for (const key of Object.keys(appState) as (keyof typeof appState)[]) {
    const propConfig = APP_STATE_STORAGE_CONF[key];
    if (propConfig?.[exportType]) {
      // @ts-ignore see https://github.com/microsoft/TypeScript/issues/31445
      stateForExport[key] = appState[key];
    }
  }
  return stateForExport;
};

export const clearAppStateForLocalStorage = (appState: Partial<AppState>) => {
  return _clearAppStateForStorage(appState, "browser");
};

export const cleanAppStateForExport = (appState: Partial<AppState>) => {
  return _clearAppStateForStorage(appState, "export");
};

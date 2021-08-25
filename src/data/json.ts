import { fileOpen, fileSave } from "browser-fs-access";
import { cleanAppStateForExport } from "../appState";
import { EXPORT_DATA_TYPES, EXPORT_SOURCE, MIME_TYPES } from "../constants";
import { clearElementsForExport } from "../element";
import { ExcalidrawElement } from "../element/types";
import { AppState } from "../types";
import { isImageFileHandle, loadFromBlob } from "./blob";

import {
  ExportedDataState,
  ImportedDataState,
  ExportedLibraryData,
} from "./types";
import Library from "./library";

export const serializeAsJSON = (
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
): string => {
  const data: ExportedDataState = {
    type: EXPORT_DATA_TYPES.excalidraw,
    version: 2,
    source: EXPORT_SOURCE,
    elements: clearElementsForExport(elements),
    appState: cleanAppStateForExport(appState, elements),
  };

  return JSON.stringify(data, null, 2);
};

export const saveAsJSON = async (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
) => {
  const serialized = serializeAsJSON(elements, appState);
  const blob = new Blob([serialized], {
    type: MIME_TYPES.excalidraw,
  });

  const fileHandle = await fileSave(
    blob,
    {
      fileName: `${appState.name}.excalidraw`,
      description: "Excalidraw file",
      extensions: [".excalidraw"],
    },
    isImageFileHandle(appState.fileHandle) ? null : appState.fileHandle,
  );
  return { fileHandle };
};

export const loadFromJSON = async (
  localAppState: AppState,
  localElements: readonly ExcalidrawElement[] | null,
) => {
  const blob = await fileOpen({
    description: "Excalidraw files",
    // ToDo: Be over-permissive until https://bugs.webkit.org/show_bug.cgi?id=34442
    // gets resolved. Else, iOS users cannot open `.excalidraw` files.
    /*
    extensions: [".json", ".excalidraw", ".png", ".svg"],
    mimeTypes: [
      MIME_TYPES.excalidraw,
      "application/json",
      "image/png",
      "image/svg+xml",
    ],
    */
  });
  return loadFromBlob(blob, localAppState, localElements);
};

export const isValidExcalidrawData = (data?: {
  type?: any;
  elements?: any;
  appState?: any;
}): data is ImportedDataState => {
  return (
    data?.type === EXPORT_DATA_TYPES.excalidraw &&
    (!data.elements ||
      (Array.isArray(data.elements) &&
        (!data.appState || typeof data.appState === "object")))
  );
};

export const isValidLibrary = (json: any) => {
  return (
    typeof json === "object" &&
    json &&
    json.type === EXPORT_DATA_TYPES.excalidrawLibrary &&
    json.version === 1
  );
};

export const saveLibraryAsJSON = async (library: Library) => {
  const libraryItems = await library.loadLibrary();
  const data: ExportedLibraryData = {
    type: EXPORT_DATA_TYPES.excalidrawLibrary,
    version: 1,
    source: EXPORT_SOURCE,
    library: libraryItems,
  };
  const serialized = JSON.stringify(data, null, 2);
  const fileName = "library.excalidrawlib";
  const blob = new Blob([serialized], {
    type: MIME_TYPES.excalidrawlib,
  });
  await fileSave(blob, {
    fileName,
    description: "Excalidraw library file",
    extensions: [".excalidrawlib"],
  });
};

export const importLibraryFromJSON = async (library: Library) => {
  const blob = await fileOpen({
    description: "Excalidraw library files",
    // ToDo: Be over-permissive until https://bugs.webkit.org/show_bug.cgi?id=34442
    // gets resolved. Else, iOS users cannot open `.excalidraw` files.
    /*
    extensions: [".json", ".excalidrawlib"],
    */
  });
  await library.importLibrary(blob);
};

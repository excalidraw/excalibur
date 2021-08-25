import { FileSystemHandle } from "browser-fs-access";
import { cleanAppStateForExport } from "../appState";
import { EXPORT_DATA_TYPES } from "../constants";
import { clearElementsForExport } from "../element";
import { ExcalidrawElement } from "../element/types";
import { CanvasError } from "../errors";
import { t } from "../i18n";
import { calculateScrollCenter } from "../scene";
import { AppState } from "../types";
import { isValidExcalidrawData } from "./json";
import { restore } from "./restore";
import { ImportedLibraryData } from "./types";

const parseFileContents = async (blob: Blob | File) => {
  let contents: string;

  if (blob.type === "image/png") {
    try {
      return await (
        await import(/* webpackChunkName: "image" */ "./image")
      ).decodePngMetadata(blob);
    } catch (error) {
      if (error.message === "INVALID") {
        throw new DOMException(
          t("alerts.imageDoesNotContainScene"),
          "EncodingError",
        );
      } else {
        throw new DOMException(
          t("alerts.cannotRestoreFromImage"),
          "EncodingError",
        );
      }
    }
  } else {
    if ("text" in Blob) {
      contents = await blob.text();
    } else {
      contents = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsText(blob, "utf8");
        reader.onloadend = () => {
          if (reader.readyState === FileReader.DONE) {
            resolve(reader.result as string);
          }
        };
      });
    }
    if (blob.type === "image/svg+xml") {
      try {
        return await (
          await import(/* webpackChunkName: "image" */ "./image")
        ).decodeSvgMetadata({
          svg: contents,
        });
      } catch (error) {
        if (error.message === "INVALID") {
          throw new DOMException(
            t("alerts.imageDoesNotContainScene"),
            "EncodingError",
          );
        } else {
          throw new DOMException(
            t("alerts.cannotRestoreFromImage"),
            "EncodingError",
          );
        }
      }
    }
  }
  return contents;
};

export const getMimeType = (blob: Blob | string): string => {
  let name: string;
  if (typeof blob === "string") {
    name = blob;
  } else {
    if (blob.type) {
      return blob.type;
    }
    name = blob.name || "";
  }
  if (/\.(excalidraw|json)$/.test(name)) {
    return "application/json";
  } else if (/\.png$/.test(name)) {
    return "image/png";
  } else if (/\.jpe?g$/.test(name)) {
    return "image/jpeg";
  } else if (/\.svg$/.test(name)) {
    return "image/svg+xml";
  }
  return "";
};

export const getFileHandleType = (handle: FileSystemHandle | null) => {
  if (!handle) {
    return null;
  }

  return handle.name.match(/\.(json|excalidraw|png|svg)$/)?.[1] || null;
};

export const isImageFileHandleType = (
  type: string | null,
): type is "png" | "svg" => {
  return type === "png" || type === "svg";
};

export const isImageFileHandle = (handle: FileSystemHandle | null) => {
  const type = getFileHandleType(handle);
  return type === "png" || type === "svg";
};

export const isImageFile = (blob: Blob | null | undefined): blob is File => {
  const { type } = blob || {};
  return (
    type === "image/jpeg" || type === "image/png" || type === "image/svg+xml"
  );
};

export const loadFromBlob = async (
  blob: Blob,
  /** @see restore.localAppState */
  localAppState: AppState | null,
  localElements: readonly ExcalidrawElement[] | null,
) => {
  const contents = await parseFileContents(blob);
  try {
    const data = JSON.parse(contents);
    if (!isValidExcalidrawData(data)) {
      throw new Error(t("alerts.couldNotLoadInvalidFile"));
    }
    const result = restore(
      {
        elements: clearElementsForExport(data.elements || []),
        appState: {
          theme: localAppState?.theme,
          fileHandle: blob.handle || null,
          ...cleanAppStateForExport(data.appState || {}, data.elements || []),
          ...(localAppState
            ? calculateScrollCenter(data.elements || [], localAppState, null)
            : {}),
        },
      },
      localAppState,
      localElements,
    );

    return result;
  } catch (error) {
    console.error(error.message);
    throw new Error(t("alerts.couldNotLoadInvalidFile"));
  }
};

export const loadLibraryFromBlob = async (blob: Blob) => {
  const contents = await parseFileContents(blob);
  const data: ImportedLibraryData = JSON.parse(contents);
  if (data.type !== EXPORT_DATA_TYPES.excalidrawLibrary) {
    throw new Error(t("alerts.couldNotLoadInvalidFile"));
  }
  return data;
};

export const canvasToBlob = async (
  canvas: HTMLCanvasElement,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          return reject(
            new CanvasError(
              t("canvasError.canvasTooBig"),
              "CANVAS_POSSIBLY_TOO_BIG",
            ),
          );
        }
        resolve(blob);
      });
    } catch (error) {
      reject(error);
    }
  });
};

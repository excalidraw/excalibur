import { fileSave, FileSystemHandle } from "browser-fs-access";
import {
  copyBlobToClipboardAsPng,
  copyTextToSystemClipboard,
} from "../clipboard";
import { DEFAULT_EXPORT_PADDING } from "../constants";
import { NonDeletedExcalidrawElement } from "../element/types";
import { t } from "../i18n";
import { exportToCanvas, exportToSvg, getFontUrls } from "../scene/export";
import { ExportType } from "../scene/types";
import { AppState } from "../types";
import { canvasToBlob } from "./blob";
import { serializeAsJSON } from "./json";

export { loadFromBlob } from "./blob";
export { loadFromJSON, saveAsJSON } from "./json";

export const exportCanvas = async (
  type: ExportType,
  elements: readonly NonDeletedExcalidrawElement[],
  appState: AppState,
  {
    exportBackground,
    exportPadding = DEFAULT_EXPORT_PADDING,
    viewBackgroundColor,
    name,
    fileHandle = null,
  }: {
    exportBackground: boolean;
    exportPadding?: number;
    viewBackgroundColor: string;
    name: string;
    fileHandle?: FileSystemHandle | null;
  },
) => {
  if (elements.length === 0) {
    throw new Error(t("alerts.cannotExportEmptyCanvas"));
  }
  if (type === "svg" || type === "clipboard-svg") {
    const fontUrls = await getFontUrls(appState.exportSvgFont);
    const tempSvg = await exportToSvg(elements, {
      exportBackground,
      exportWithDarkMode: appState.exportWithDarkMode,
      viewBackgroundColor,
      exportPadding,
      exportScale: appState.exportScale,
      exportEmbedScene: appState.exportEmbedScene && type === "svg",
      fontUrls,
    });
    if (type === "svg") {
      return await fileSave(
        new Blob([tempSvg.outerHTML], { type: "image/svg+xml" }),
        {
          fileName: `${name}.svg`,
          extensions: [".svg"],
        },
        fileHandle,
      );
    } else if (type === "clipboard-svg") {
      await copyTextToSystemClipboard(tempSvg.outerHTML);
      return;
    }
  }

  const tempCanvas = exportToCanvas(elements, appState, {
    exportBackground,
    viewBackgroundColor,
    exportPadding,
  });
  tempCanvas.style.display = "none";
  document.body.appendChild(tempCanvas);
  let blob = await canvasToBlob(tempCanvas);
  tempCanvas.remove();

  if (type === "png") {
    const fileName = `${name}.png`;
    if (appState.exportEmbedScene) {
      blob = await (
        await import(/* webpackChunkName: "image" */ "./image")
      ).encodePngMetadata({
        blob,
        metadata: serializeAsJSON(elements, appState),
      });
    }

    return await fileSave(
      blob,
      {
        fileName,
        extensions: [".png"],
      },
      fileHandle,
    );
  } else if (type === "clipboard") {
    try {
      await copyBlobToClipboardAsPng(blob);
    } catch (error) {
      if (error.name === "CANVAS_POSSIBLY_TOO_BIG") {
        throw error;
      }
      throw new Error(t("alerts.couldNotCopyToClipboard"));
    }
  }
};

import {
  exportToCanvas as _exportToCanvas,
  exportToSvg as _exportToSvg,
} from "../scene/export";
import { getDefaultAppState } from "../appState";
import { AppState } from "../types";
import { ExcalidrawElement } from "../element/types";
import { getNonDeletedElements } from "../element";
import { restore } from "../data/restore";

type ExportOpts = {
  elements: readonly ExcalidrawElement[];
  appState?: Partial<Omit<AppState, "offsetTop" | "offsetLeft">>;
  getDimensions?: (
    width: number,
    height: number,
  ) => { width: number; height: number; scale: number };
};

export const exportToCanvas = ({
  elements,
  appState,
  getDimensions = (width, height) => ({ width, height, scale: 1 }),
}: ExportOpts) => {
  const { elements: restoredElements, appState: restoredAppState } = restore(
    { elements, appState },
    null,
    null,
  );
  const { exportBackground, viewBackgroundColor } = restoredAppState;
  return _exportToCanvas(
    getNonDeletedElements(restoredElements),
    { ...restoredAppState, offsetTop: 0, offsetLeft: 0, width: 0, height: 0 },
    { exportBackground, viewBackgroundColor },
    (width: number, height: number) => {
      const canvas = document.createElement("canvas");
      const ret = getDimensions(width, height);

      canvas.width = ret.width;
      canvas.height = ret.height;

      return { canvas, scale: ret.scale };
    },
  );
};

export const exportToBlob = async (
  opts: ExportOpts & {
    mimeType?: string;
    quality?: number;
  },
): Promise<Blob | null> => {
  const canvas = await exportToCanvas(opts);

  let { mimeType = "image/png", quality } = opts;

  if (mimeType === "image/png" && typeof quality === "number") {
    console.warn(`"quality" will be ignored for "image/png" mimeType`);
  }

  if (mimeType === "image/jpg") {
    mimeType = "image/jpeg";
  }

  quality = quality ? quality : /image\/jpe?g/.test(mimeType) ? 0.92 : 0.8;

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob: Blob | null) => {
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
};

export const exportToSvg = async ({
  elements,
  appState = getDefaultAppState(),
  exportPadding,
}: Omit<ExportOpts, "getDimensions"> & {
  exportPadding?: number;
}): Promise<SVGSVGElement> => {
  const { elements: restoredElements, appState: restoredAppState } = restore(
    { elements, appState },
    null,
    null,
  );
  return _exportToSvg(getNonDeletedElements(restoredElements), {
    ...restoredAppState,
    exportPadding,
  });
};

export { serializeAsJSON } from "../data/json";
export { loadFromBlob, loadLibraryFromBlob } from "../data/blob";
export { getFreeDrawSvgPath } from "../renderer/renderElement";

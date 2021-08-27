import rough from "roughjs/bin/rough";
import { NonDeletedExcalidrawElement } from "../element/types";
import { getCommonBounds } from "../element/bounds";
import { renderScene, renderSceneToSvg } from "../renderer/renderScene";
import { distance, SVG_NS } from "../utils";
import { AppState } from "../types";
import { DEFAULT_EXPORT_PADDING, THEME_FILTER } from "../constants";
import { getDefaultAppState } from "../appState";
import { serializeAsJSON } from "../data/json";

export const SVG_EXPORT_TAG = `<!-- svg-source:excalidraw -->`;
const DEFAULT_FONT_URLS = {
  virgil: "https://excalidraw.com/Virgil.woff2",
  cascadia: "https://excalidraw.com/Cascadia.woff2",
};

export const exportToCanvas = (
  elements: readonly NonDeletedExcalidrawElement[],
  appState: AppState,
  {
    exportBackground,
    exportPadding = DEFAULT_EXPORT_PADDING,
    viewBackgroundColor,
  }: {
    exportBackground: boolean;
    exportPadding?: number;
    viewBackgroundColor: string;
  },
  createCanvas: (
    width: number,
    height: number,
  ) => { canvas: HTMLCanvasElement; scale: number } = (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width * appState.exportScale;
    canvas.height = height * appState.exportScale;
    return { canvas, scale: appState.exportScale };
  },
) => {
  const [minX, minY, width, height] = getCanvasSize(elements, exportPadding);

  const { canvas, scale = 1 } = createCanvas(width, height);

  renderScene(
    elements,
    appState,
    null,
    scale,
    rough.canvas(canvas),
    canvas,
    {
      viewBackgroundColor: exportBackground ? viewBackgroundColor : null,
      exportWithDarkMode: appState.exportWithDarkMode,
      scrollX: -minX + exportPadding,
      scrollY: -minY + exportPadding,
      zoom: getDefaultAppState().zoom,
      remotePointerViewportCoords: {},
      remoteSelectedElementIds: {},
      shouldCacheIgnoreZoom: false,
      remotePointerUsernames: {},
      remotePointerUserStates: {},
    },
    {
      renderScrollbars: false,
      renderSelection: false,
      renderOptimizations: false,
      renderGrid: false,
    },
  );

  return canvas;
};

export const exportToSvg = async (
  elements: readonly NonDeletedExcalidrawElement[],
  appState: {
    exportBackground: boolean;
    exportPadding?: number;
    exportScale?: number;
    viewBackgroundColor: string;
    exportWithDarkMode?: boolean;
    exportEmbedScene?: boolean;
    metadata?: string;
    fontUrls?: { virgil: string; cascadia: string };
  },
): Promise<SVGSVGElement> => {
  const {
    exportPadding = DEFAULT_EXPORT_PADDING,
    viewBackgroundColor,
    exportScale = 1,
    exportEmbedScene,
    fontUrls = DEFAULT_FONT_URLS,
  } = appState;
  let metadata = "";
  if (exportEmbedScene) {
    try {
      metadata = await (
        await import(/* webpackChunkName: "image" */ "../../src/data/image")
      ).encodeSvgMetadata({
        text: serializeAsJSON(elements, appState),
      });
    } catch (err) {
      console.error(err);
    }
  }
  const [minX, minY, width, height] = getCanvasSize(elements, exportPadding);

  // initialze SVG root
  const svgRoot = document.createElementNS(SVG_NS, "svg");
  svgRoot.setAttribute("version", "1.1");
  svgRoot.setAttribute("xmlns", SVG_NS);
  svgRoot.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svgRoot.setAttribute("width", `${width * exportScale}`);
  svgRoot.setAttribute("height", `${height * exportScale}`);
  if (appState.exportWithDarkMode) {
    svgRoot.setAttribute("filter", THEME_FILTER);
  }

  svgRoot.innerHTML = `
  ${SVG_EXPORT_TAG}
  ${metadata}
  <defs>
    <style>
      @font-face {
        font-family: "Virgil";
        src: url("${fontUrls.virgil}");
      }
      @font-face {
        font-family: "Cascadia";
        src: url("${fontUrls.cascadia}");
      }
    </style>
  </defs>
  `;

  // render background rect
  if (appState.exportBackground && viewBackgroundColor) {
    const rect = svgRoot.ownerDocument!.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", `${width}`);
    rect.setAttribute("height", `${height}`);
    rect.setAttribute("fill", viewBackgroundColor);
    svgRoot.appendChild(rect);
  }

  const rsvg = rough.svg(svgRoot);
  renderSceneToSvg(elements, rsvg, svgRoot, {
    offsetX: -minX + exportPadding,
    offsetY: -minY + exportPadding,
  });

  return svgRoot;
};

// calculate smallest area to fit the contents in
const getCanvasSize = (
  elements: readonly NonDeletedExcalidrawElement[],
  exportPadding: number,
): [number, number, number, number] => {
  const [minX, minY, maxX, maxY] = getCommonBounds(elements);
  const width = distance(minX, maxX) + exportPadding * 2;
  const height = distance(minY, maxY) + exportPadding + exportPadding;

  return [minX, minY, width, height];
};

export const getExportSize = (
  elements: readonly NonDeletedExcalidrawElement[],
  exportPadding: number,
  scale: number,
): [number, number] => {
  const [, , width, height] = getCanvasSize(
    elements,
    exportPadding,
  ).map((dimension) => Math.trunc(dimension * scale));

  return [width, height];
};

export const convertBlobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(blob);
  });

export const getFontUrls = async (
  exportSvgFont: boolean,
): Promise<{ virgil: string; cascadia: string }> => {
  if (!exportSvgFont) {
    return DEFAULT_FONT_URLS;
  }
  const fontUrls = { ...DEFAULT_FONT_URLS };
  for (const k of Object.keys(fontUrls) as Array<keyof typeof fontUrls>) {
    const response = await fetch(fontUrls[k]);
    const blob = await response.blob();
    const encoded = await convertBlobToBase64(blob);
    fontUrls[k] = encoded;
  }
  return fontUrls;
};

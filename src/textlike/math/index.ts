// Some imports
import { FontFamilyValues, FontString } from "../../element/types";
import {
  SVG_NS,
  getFontString,
  getFontFamilyString,
  isRTL,
  measureText,
} from "../../utils";
import { isTextElement } from "../../element/typeChecks";
import {
  ExcalidrawElement,
  ExcalidrawTextElement,
  NonDeleted,
} from "../../element/types";
import {
  ElementUpdate,
  mutateElement,
  newElementWith,
} from "../../element/mutateElement";
import { addTextLikeActions, registerTextLikeMethod } from "../";

// Imports for actions
import { t } from "../../i18n";
import { Action } from "../../actions/types";
import { AppState } from "../../types";
import { getSelectedElements } from "../../scene";
import { getElementMap, getNonDeletedElements } from "../../element";
import { invalidateShapeForElement } from "../../renderer/renderElement";

// Begin exports
export type TextOptsMath = { useTex?: boolean };

type ExcalidrawTextElementMath = ExcalidrawTextElement &
  Readonly<{
    subtype: "math";
    useTex: boolean;
    fontFamily: 2;
  }>;

const isMathElement = (
  element: ExcalidrawElement | null,
): element is ExcalidrawTextElementMath => {
  return (
    isTextElement(element) && "subtype" in element && element.subtype === "math"
  );
};

export type TextActionNameMath = "toggleUseTex" | "showUseTex";

let _useTex = true;

const setUseTex = (useTex: boolean) => {
  _useTex = useTex;
};

const getUseTex = (): boolean => {
  return _useTex;
};

const mathJax = {} as {
  adaptor: any;
  amHtml: any;
  texHtml: any;
};

let mathJaxLoaded = false;
let mathJaxLoading = false;
let mathJaxLoadedCallback:
  | ((isTextElementSubtype: Function) => void)
  | undefined;

const loadMathJax = async () => {
  if (
    !mathJaxLoaded &&
    !mathJaxLoading &&
    (mathJax.adaptor === undefined ||
      mathJax.amHtml === undefined ||
      mathJax.texHtml === undefined)
  ) {
    mathJaxLoading = true;

    // MathJax components we use
    const AsciiMath = await import("mathjax-full/js/input/asciimath.js");
    const TeX = await import("mathjax-full/js/input/tex.js");
    const SVG = await import("mathjax-full/js/output/svg.js");
    const liteAdaptor = await import("mathjax-full/js/adaptors/liteAdaptor.js");
    const HTMLDocument = await import(
      "mathjax-full/js/handlers/html/HTMLDocument.js"
    );

    // Types needed to lazy-load MathJax
    const LiteElement = (
      await import("mathjax-full/js/adaptors/lite/Element.js")
    ).LiteElement;
    const LiteText = (await import("mathjax-full/js/adaptors/lite/Text.js"))
      .LiteText;
    const LiteDocument = (
      await import("mathjax-full/js/adaptors/lite/Document.js")
    ).LiteDocument;

    // Now set up MathJax
    const asciimath = new AsciiMath.AsciiMath<
      typeof LiteElement | typeof LiteText,
      typeof LiteText,
      typeof LiteDocument
    >({ displaystyle: false });
    const tex = new TeX.TeX({});
    const svg = new SVG.SVG({ fontCache: "local" });
    mathJax.adaptor = liteAdaptor.liteAdaptor();
    mathJax.amHtml = new HTMLDocument.HTMLDocument("", mathJax.adaptor, {
      InputJax: asciimath,
      OutputJax: svg,
    });
    mathJax.texHtml = new HTMLDocument.HTMLDocument("", mathJax.adaptor, {
      InputJax: tex,
      OutputJax: svg,
    });
    mathJaxLoaded = true;
    if (mathJaxLoadedCallback !== undefined) {
      mathJaxLoadedCallback(isMathElement);
    }
  }
};

// Cache the SVGs from MathJax
const mathJaxSvgCacheAM = {} as { [key: string]: string };
const mathJaxSvgCacheTex = {} as { [key: string]: string };

const math2Svg = (text: string, useTex: boolean, isMathJaxLoaded: boolean) => {
  if (
    isMathJaxLoaded &&
    (useTex ? mathJaxSvgCacheTex[text] : mathJaxSvgCacheAM[text])
  ) {
    return useTex ? mathJaxSvgCacheTex[text] : mathJaxSvgCacheAM[text];
  }
  loadMathJax();
  try {
    const userOptions = { display: false };
    const htmlString = isMathJaxLoaded
      ? mathJax.adaptor.innerHTML(
          useTex
            ? mathJax.texHtml.convert(text, userOptions)
            : mathJax.amHtml.convert(text, userOptions),
        )
      : text;
    if (isMathJaxLoaded) {
      if (useTex) {
        mathJaxSvgCacheTex[text] = htmlString;
      } else {
        mathJaxSvgCacheAM[text] = htmlString;
      }
    }
    return htmlString;
  } catch {
    return text;
  }
};

const markupText = (
  text: string,
  useTex: boolean,
  isMathJaxLoaded: boolean,
) => {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const outputs = [] as Array<string>[];
  for (let index = 0; index < lines.length; index++) {
    outputs.push([]);
    if (!isMathJaxLoaded) {
      // Run lines[index] through math2Svg so loadMathJax() gets called
      outputs[index].push(math2Svg(lines[index], useTex, isMathJaxLoaded));
      continue;
    }
    const lineArray = lines[index].split(useTex ? "$$" : "`");
    for (let i = 0; i < lineArray.length; i++) {
      // Don't guard the following as "isMathJaxLoaded && i % 2 === 1"
      // in order to ensure math2Svg() actually gets called, and thus
      // loadMathJax().
      if (i % 2 === 1) {
        const svgString = math2Svg(lineArray[i], useTex, isMathJaxLoaded);
        outputs[index].push(svgString);
      } else {
        outputs[index].push(lineArray[i]);
      }
    }
    if (lineArray.length === 0) {
      outputs[index].push("");
    }
  }
  return outputs;
};

const getCacheKey = (
  text: string,
  fontFamily: FontFamilyValues,
  strokeColor: String,
  textAlign: CanvasTextAlign,
  opacity: Number,
  useTex: boolean,
) => {
  const key = `${text}, ${getFontFamilyString({
    fontFamily,
  })}, ${strokeColor}, ${textAlign}, ${opacity}, ${useTex}`;
  return key;
};

const metricsCache = {} as {
  [key: string]: {
    outputMetrics: Array<{ width: number; height: number; baseline: number }>[];
    lineMetrics: Array<{ width: number; height: number; baseline: number }>;
    imageMetrics: { width: number; height: number; baseline: number };
  };
};

const measureOutputs = (
  outputs: string[][],
  fontString: FontString,
  isMathJaxLoaded: boolean,
) => {
  let key = fontString as string;
  for (let index = 0; index < outputs.length; index++) {
    for (let i = 0; i < outputs[index].length; i++) {
      key += outputs[index][i] === "" ? " " : outputs[index][i];
    }
    key += "\n";
  }
  const cKey = key;
  if (isMathJaxLoaded && metricsCache[cKey]) {
    return metricsCache[cKey];
  }
  const tDiv = document.createElement("div");
  const tCtx = document.createElement("canvas").getContext("2d");
  if (tCtx !== null) {
    tCtx.font = fontString;
  }
  const exSize = tCtx ? tCtx.measureText("x").actualBoundingBoxAscent : 1;
  const outputMetrics = [] as Array<{
    width: number;
    height: number;
    baseline: number;
  }>[];
  const lineMetrics = [] as Array<{
    width: number;
    height: number;
    baseline: number;
  }>;
  let imageWidth = 0;
  let imageHeight = 0;
  let imageBaseline = 0;
  for (let index = 0; index < outputs.length; index++) {
    outputMetrics.push([]);
    let lineWidth = 0;
    let lineHeight = 0;
    let lineBaseline = 0;
    for (let i = 0; i < outputs[index].length; i++) {
      if (isMathJaxLoaded && i % 2 === 1) {
        //svg
        tDiv.innerHTML = outputs[index][i];
        const cNode = tDiv.children[0];
        // For some reason, the width/height/baseline metrics gotten from
        // window.getComputedStyle() might not match the width and height
        // of the MathJax SVG. So we calculate these directly from the SVG
        // attributes, which are given in "ex" CSS units. If anything goes
        // wrong, fall back to a value of 0.
        let cWidth;
        let cHeight;
        let cBaseline;
        if (cNode && cNode.hasAttribute("width")) {
          cWidth = cNode.getAttribute("width");
          if (cWidth === null) {
            cWidth = "0";
          }
          cWidth = parseFloat(cWidth) * exSize;
        } else {
          cWidth = 0;
        }
        if (cNode && cNode.hasAttribute("height")) {
          cHeight = cNode.getAttribute("height");
          if (cHeight === null) {
            cHeight = "0";
          }
          cHeight = parseFloat(cHeight) * exSize;
        } else {
          cHeight = 0;
        }
        if (cNode && cNode.hasAttribute("style")) {
          cBaseline = cNode.getAttribute("style");
          if (cBaseline === null) {
            cBaseline = "vertical-align: 0ex;";
          }
          cBaseline =
            parseFloat(cBaseline.split(":")[1].split(";")[0]) * exSize;
        } else {
          cBaseline = 0;
        }
        outputMetrics[index].push({
          width: cWidth,
          height: cHeight,
          baseline: cHeight + cBaseline,
        });
      } else {
        outputMetrics[index].push(measureText(outputs[index][i], fontString));
      }
      lineWidth +=
        outputs[index].length > 0 && outputs[index][i] === ""
          ? 0
          : outputMetrics[index][i].width;
      lineHeight = Math.max(lineHeight, outputMetrics[index][i].height);
      if (lineHeight === outputMetrics[index][i].height) {
        lineBaseline = outputMetrics[index][i].baseline;
      }
    }
    imageWidth = Math.max(imageWidth, lineWidth);
    imageBaseline = imageHeight + lineBaseline;
    imageHeight += lineHeight;
    lineMetrics.push({
      width: lineWidth,
      height: lineHeight,
      baseline: lineBaseline,
    });
  }
  const imageMetrics = {
    width: imageWidth,
    height: imageHeight,
    baseline: imageBaseline,
  };
  const metrics = { outputMetrics, lineMetrics, imageMetrics };
  if (isMathJaxLoaded) {
    metricsCache[cKey] = metrics;
    return metricsCache[cKey];
  }
  return metrics;
};

const svgCache = {} as { [key: string]: SVGSVGElement };

// Use a power-of-two font size to generate the SVG.
const fontSizePoT = 256;

const createSvg = (
  text: string,
  fontSize: number,
  fontFamily: FontFamilyValues,
  strokeColor: String,
  textAlign: CanvasTextAlign,
  opacity: Number,
  useTex: boolean,
  isMathJaxLoaded: boolean,
) => {
  const key = getCacheKey(
    text,
    fontFamily,
    strokeColor,
    textAlign,
    opacity,
    useTex,
  );

  const mathLines = text.replace(/\r\n?/g, "\n").split("\n");
  const processed = markupText(text, useTex, isMathJaxLoaded);

  const scale = fontSize / fontSizePoT;
  const fontString = getFontString({
    fontSize: fontSizePoT,
    fontFamily,
  });
  const metrics = measureOutputs(processed, fontString, isMathJaxLoaded);
  const imageMetrics = metrics.imageMetrics;

  if (isMathJaxLoaded && svgCache[key]) {
    const svgRoot = svgCache[key];
    svgRoot.setAttribute("width", `${Math.max(scale * imageMetrics.width, 1)}`);
    svgRoot.setAttribute(
      "height",
      `${Math.max(scale * imageMetrics.height, 1)}`,
    );
    return svgRoot;
  }
  const svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const node = svgRoot.ownerDocument.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  node.setAttribute("font-family", `${getFontFamilyString({ fontFamily })}`);
  node.setAttribute("font-size", `${fontSizePoT}px`);
  node.setAttribute("color", `${strokeColor}`);
  node.setAttribute("stroke-opacity", `${opacity}`);
  node.setAttribute("fill-opacity", `${opacity}`);
  svgRoot.appendChild(node);

  let y = 0;
  for (let index = 0; index < processed.length; index++) {
    const lineMetrics = metrics.lineMetrics[index];
    let x =
      textAlign === "right"
        ? imageMetrics.width - lineMetrics.width
        : textAlign === "center"
        ? (imageMetrics.width - lineMetrics.width) / 2
        : 0;
    y += lineMetrics.height;
    const rtl = isRTL(mathLines[index]);
    for (
      let i = rtl ? processed[index].length - 1 : 0;
      rtl ? i >= 0 : i < processed[index].length;
      i += rtl ? -1 : 1
    ) {
      let childNode = {} as SVGSVGElement | SVGTextElement;
      // If i % 2 === 0, then childNode is an SVGTextElement, not an SVGSVGElement.
      const childIsSvg = isMathJaxLoaded && i % 2 === 1;
      if (childIsSvg) {
        const tempDiv = svgRoot.ownerDocument.createElement("div");
        tempDiv.innerHTML = processed[index][i];
        childNode = tempDiv.children[0] as SVGSVGElement;
      } else {
        const text = svgRoot.ownerDocument.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        text.setAttribute("style", "white-space: pre;");
        text.setAttribute("fill", `${strokeColor}`);
        text.setAttribute("direction", `${rtl ? "rtl" : "ltr"}`);
        text.setAttribute("text-anchor", `${rtl ? "end" : "start"}`);
        text.textContent = processed[index][i];
        childNode = text;
      }
      const childMetrics = metrics.outputMetrics[index][i];
      childNode.setAttribute("x", `${x}`);
      // Don't offset x when we have an empty string.
      x +=
        processed[index].length > 0 && processed[index][i] === ""
          ? 0
          : childMetrics.width;
      const svgVerticalOffset = childIsSvg ? childMetrics.baseline : 0;
      const yOffset =
        lineMetrics.height - (lineMetrics.baseline - svgVerticalOffset);
      childNode.setAttribute("y", `${y - yOffset}`);
      node.appendChild(childNode);
    }
  }
  svgRoot.setAttribute("version", "1.1");
  svgRoot.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svgRoot.setAttribute(
    "viewBox",
    `0 0 ${imageMetrics.width} ${imageMetrics.height}`,
  );
  svgRoot.setAttribute("width", `${imageMetrics.width}`);
  svgRoot.setAttribute("height", `${imageMetrics.height}`);
  if (isMathJaxLoaded) {
    svgCache[key] = svgRoot;
  }
  // Now that we have cached the base SVG, scale it appropriately.
  svgRoot.setAttribute("width", `${Math.max(scale * imageMetrics.width, 1)}`);
  svgRoot.setAttribute("height", `${Math.max(scale * imageMetrics.height, 1)}`);
  return svgRoot;
};

const imageCache = {} as { [key: string]: HTMLImageElement };
const imageMetricsCache = {} as {
  [key: string]: { width: number; height: number; baseline: number };
};

const getRenderDims = (width: number, height: number) => {
  return [width / window.devicePixelRatio, height / window.devicePixelRatio];
};

const containsMath = (text: string, useTex: boolean) => {
  const delimiter = (useTex ? "\\$\\$" : "`") as string;
  return text.search(delimiter) >= 0;
};

const isMathMode = (fontString: FontString) => {
  return fontString.search("Helvetica") >= 0;
};

const measureMath = (
  text: string,
  fontSize: number,
  fontFamily: FontFamilyValues,
  useTex: boolean,
  isMathJaxLoaded: boolean,
) => {
  const scale = fontSize / fontSizePoT;
  const fontStringPoT = getFontString({
    fontSize: fontSizePoT,
    fontFamily,
  });
  const fontString = getFontString({ fontSize, fontFamily });
  const metrics = isMathMode(fontStringPoT)
    ? measureOutputs(
        markupText(text, useTex, isMathJaxLoaded),
        fontStringPoT,
        isMathJaxLoaded,
      ).imageMetrics
    : measureText(text, fontString);
  if (isMathMode(fontStringPoT)) {
    return {
      width: metrics.width * scale,
      height: metrics.height * scale,
      baseline: metrics.baseline * scale,
    };
  }
  return metrics;
};

const getSelectedMathElements = (
  elements: readonly ExcalidrawElement[],
  appState: Readonly<AppState>,
): NonDeleted<ExcalidrawTextElementMath>[] => {
  const selectedElements = getSelectedElements(
    getNonDeletedElements(elements),
    appState,
  );
  const eligibleElements = selectedElements.filter(
    (element, index, eligibleElements) => {
      return isMathElement(element);
    },
  ) as NonDeleted<ExcalidrawTextElementMath>[];
  return eligibleElements;
};

const applyTextElementMathOpts = (
  element: ExcalidrawTextElementMath,
  textOpts?: TextOptsMath,
): ExcalidrawTextElement => {
  const useTex = textOpts?.useTex !== undefined ? textOpts.useTex : getUseTex();
  return newElementWith(element, { useTex });
};

const cleanTextOptUpdatesMath = (
  opts: ElementUpdate<ExcalidrawTextElementMath>,
): ElementUpdate<ExcalidrawTextElementMath> => {
  const newOpts = {};
  for (const key in opts) {
    const value = key === "fontFamily" ? 2 : (opts as any)[key];
    (newOpts as any)[key] = value;
  }
  return newOpts;
};

const measureTextElementMath = (
  element: Omit<
    ExcalidrawTextElementMath,
    | "id"
    | "isDeleted"
    | "type"
    | "baseline"
    | "width"
    | "height"
    | "angle"
    | "seed"
    | "version"
    | "versionNonce"
    | "groupIds"
    | "boundElementIds"
  >,
  next?: {
    fontSize?: number;
    text?: string;
  },
) => {
  const isMathJaxLoaded = mathJaxLoaded;
  const fontSize =
    next?.fontSize !== undefined ? next.fontSize : element.fontSize;
  const text = next?.text !== undefined ? next.text : element.text;
  const useTex = element.useTex !== undefined ? element.useTex : getUseTex();
  return measureMath(
    text,
    fontSize,
    element.fontFamily,
    useTex,
    isMathJaxLoaded,
  );
};

const renderTextElementMath = (
  element: NonDeleted<ExcalidrawTextElementMath>,
  context: CanvasRenderingContext2D,
  refresh?: () => void,
) => {
  const isMathJaxLoaded = mathJaxLoaded;

  const text = element.text;
  const fontSize = element.fontSize * window.devicePixelRatio;
  const fontFamily = element.fontFamily;
  const strokeColor = element.strokeColor;
  const textAlign = element.textAlign;
  const opacity = context.globalAlpha;
  const useTex = element.useTex;

  const key = getCacheKey(
    text,
    fontFamily,
    strokeColor,
    textAlign,
    opacity,
    useTex,
  );

  if (
    isMathJaxLoaded &&
    imageMetricsCache[key] &&
    imageMetricsCache[key] === undefined
  ) {
    imageMetricsCache[key] = measureOutputs(
      markupText(text, useTex, isMathJaxLoaded),
      getFontString({ fontSize: fontSizePoT, fontFamily }),
      isMathJaxLoaded,
    ).imageMetrics;
  }
  const imageMetrics =
    isMathJaxLoaded &&
    imageMetricsCache[key] &&
    imageMetricsCache[key] !== undefined
      ? imageMetricsCache[key]
      : measureOutputs(
          markupText(text, useTex, isMathJaxLoaded),
          getFontString({ fontSize: fontSizePoT, fontFamily }),
          isMathJaxLoaded,
        ).imageMetrics;
  const scale = fontSize / fontSizePoT;
  const imgKey = `${key}, ${scale * imageMetrics.width}, ${
    scale * imageMetrics.height
  }`;
  if (
    isMathJaxLoaded &&
    imageCache[imgKey] &&
    imageCache[imgKey] !== undefined
  ) {
    const img = imageCache[imgKey];
    const [width, height] = getRenderDims(img.naturalWidth, img.naturalHeight);
    context.drawImage(img, 0, 0, width, height);
  } else {
    // Avoid creating and rendering an SVG until MathJax is loaded.
    if (!isMathJaxLoaded) {
      return;
    }
    const img = new Image();
    const svgString = createSvg(
      text,
      fontSize,
      fontFamily,
      strokeColor,
      textAlign,
      opacity,
      useTex,
      isMathJaxLoaded,
    ).outerHTML;
    const svg = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const transformMatrix = context.getTransform();
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => {
        img.onload = function () {
          const [width, height] = getRenderDims(
            img.naturalWidth,
            img.naturalHeight,
          );
          context.setTransform(transformMatrix);
          context.drawImage(img, 0, 0, width, height);
          if (isMathJaxLoaded) {
            imageCache[imgKey] = img;
          }
          if (refresh) {
            refresh();
          }
        };
        img.src = reader.result as string;
      },
      false,
    );
    reader.readAsDataURL(svg);
  }
};

const renderSvgTextElementMath = (
  svgRoot: SVGElement,
  node: SVGElement,
  element: NonDeleted<ExcalidrawTextElementMath>,
): void => {
  const isMathJaxLoaded = mathJaxLoaded;
  const svg = createSvg(
    element.text,
    element.fontSize,
    element.fontFamily,
    element.strokeColor,
    element.textAlign,
    element.opacity / 100,
    element.useTex,
    isMathJaxLoaded,
  );
  const tempSvg = svgRoot.ownerDocument!.createElementNS(SVG_NS, "svg");
  tempSvg.innerHTML = svg.innerHTML;
  tempSvg.setAttribute("width", svg.getAttribute("width")!);
  tempSvg.setAttribute("height", svg.getAttribute("height")!);
  tempSvg.setAttribute("viewBox", svg.getAttribute("viewBox")!);
  node.appendChild(tempSvg);
};

const restoreTextElementMath = (
  element: ExcalidrawTextElementMath,
  elementRestored: ExcalidrawTextElementMath,
): ExcalidrawTextElement => {
  const mathElement = element;
  elementRestored = newElementWith(elementRestored, {
    useTex: mathElement.useTex,
  });
  return elementRestored;
};

export const registerTextElementSubtypeMath = (
  onSubtypesLoaded?: (isTextElementSubtype: Function) => void,
) => {
  // Set the callback first just in case anything in this method
  // calls loadMathJax().
  mathJaxLoadedCallback = onSubtypesLoaded;
  registerTextLikeMethod("apply", {
    subtype: "math",
    method: applyTextElementMathOpts,
  });
  registerTextLikeMethod("clean", {
    subtype: "math",
    method: cleanTextOptUpdatesMath,
  });
  registerTextLikeMethod("measure", {
    subtype: "math",
    method: measureTextElementMath,
  });
  registerTextLikeMethod("render", {
    subtype: "math",
    method: renderTextElementMath,
  });
  registerTextLikeMethod("renderSvg", {
    subtype: "math",
    method: renderSvgTextElementMath,
  });
  registerTextLikeMethod("restore", {
    subtype: "math",
    method: restoreTextElementMath,
  });
  registerActionsMath();
  // Call loadMathJax() here if we want to be sure it's loaded.
};

const enableActionToggleUseTex = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
) => {
  const eligibleElements = getSelectedMathElements(elements, appState);

  let enabled = false;
  eligibleElements.forEach((element) => {
    // Only operate on selected elements which are text elements in
    // math mode containing math content.
    if (
      isMathMode(getFontString(element)) &&
      (containsMath(element.text, element.useTex) ||
        containsMath(element.text, !element.useTex))
    ) {
      enabled = true;
    }
  });

  return enabled;
};

const toggleUseTexForSelectedElements = (
  elements: readonly ExcalidrawElement[],
  appState: Readonly<AppState>,
) => {
  const selectedElements = getSelectedMathElements(elements, appState);

  selectedElements.forEach((element) => {
    const isMathJaxLoaded = mathJaxLoaded;
    // Only operate on selected elements which are text elements in
    // math mode containing math content.
    if (
      isMathMode(getFontString(element)) &&
      (containsMath(element.text, element.useTex) ||
        containsMath(element.text, !element.useTex))
    ) {
      // Toggle the useTex field
      mutateElement(element, { useTex: !element.useTex });
      // Mark the element for re-rendering
      invalidateShapeForElement(element);
      // Update the width/height of the element
      const metrics = measureMath(
        element.text,
        element.fontSize,
        element.fontFamily,
        element.useTex,
        isMathJaxLoaded,
      );
      mutateElement(element, metrics);
      // If only one element is selected, use the element's updated
      // useTex value to set the default value for new text elements.
      if (selectedElements.length === 1) {
        setUseTex(element.useTex);
      }
    }
  });
  const updatedElementsMap = getElementMap(elements);

  return elements.map((element) => updatedElementsMap[element.id] || element);
};

const enableActionShowUseTex = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
) => {
  const selectedMathElements = getSelectedMathElements(elements, appState);
  const selectedElements = getSelectedElements(
    getNonDeletedElements(elements),
    appState,
  );
  return selectedMathElements.length === 1 || selectedElements.length === 0;
};

const showUseTexForSelectedElements = (
  elements: readonly ExcalidrawElement[],
  appState: Readonly<AppState>,
) => {
  const selectedElements = getSelectedMathElements(elements, appState);

  // Require the "Control" key to toggle Latex/AsciiMath so no one
  // toggles by accidentally typing "Shift M" without
  // being in text-editing/entry mode.
  if (selectedElements.length < 2) {
    // Only report anything if at most one element is selected, to avoid confusion.
    // If only one element is selected and that element is a text element,
    // then report that element's useTex value; otherwise report the default
    // value for new text elements.
    const usingTex =
      selectedElements.length === 1 ? selectedElements[0].useTex : getUseTex();
    if (usingTex) {
      window.alert(t("alerts.useTexTrue"));
    } else {
      window.alert(t("alerts.useTexFalse"));
    }
  }
};

const registerActionsMath = () => {
  const mathActions: Action[] = [];
  const actionToggleUseTex: Action = {
    name: "toggleUseTex",
    perform: (elements, appState) => {
      return {
        elements: toggleUseTexForSelectedElements(elements, appState),
        appState,
        commitToHistory: true,
      };
    },
    keyTest: (event) =>
      event.ctrlKey && event.shiftKey && event.code === "KeyM",
    contextItemLabel: "labels.toggleUseTex",
    contextItemPredicate: (elements, appState) =>
      enableActionToggleUseTex(elements, appState),
  };

  const actionShowUseTex: Action = {
    name: "showUseTex",
    perform: (elements, appState) => {
      showUseTexForSelectedElements(elements, appState);
      return {
        appState,
        commitToHistory: false,
      };
    },
    keyTest: (event) =>
      !event.ctrlKey && event.shiftKey && event.code === "KeyM",
    contextItemLabel: "labels.showUseTex",
    contextItemPredicate: (elements, appState) =>
      enableActionShowUseTex(elements, appState),
  };
  mathActions.push(actionToggleUseTex);
  mathActions.push(actionShowUseTex);
  addTextLikeActions(mathActions);
};

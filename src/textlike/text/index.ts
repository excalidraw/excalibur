import {
  SVG_NS,
  measureText,
  getFontFamilyString,
  getFontString,
  isRTL,
} from "../../utils";
import { ExcalidrawTextElement, NonDeleted } from "../../element/types";
import { ElementUpdate } from "../../element/mutateElement";
import { registerTextLikeMethod } from "../";

export type TextOptsText = {};

export type TextActionNameText = "";

type ExcalidrawTextElementText = ExcalidrawTextElement &
  Readonly<{
    subtype: "none";
  }>;

const applyTextElementTextOpts = (
  element: ExcalidrawTextElementText,
  textOpts: TextOptsText | undefined,
): ExcalidrawTextElement => {
  return element;
};

const cleanTextOptUpdatesText = (
  opts: ElementUpdate<ExcalidrawTextElementText>,
): ElementUpdate<ExcalidrawTextElementText> => {
  return opts;
};

const measureTextElementText = (
  element: Omit<
    ExcalidrawTextElementText,
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
  const fontSize =
    next?.fontSize !== undefined ? next.fontSize : element.fontSize;
  const text = next?.text !== undefined ? next.text : element.text;

  return measureText(
    text,
    getFontString({ fontSize, fontFamily: element.fontFamily }),
  );
};

const renderTextElementText = (
  element: NonDeleted<ExcalidrawTextElementText>,
  context: CanvasRenderingContext2D,
  renderCb?: () => void,
) => {
  const rtl = isRTL(element.text);
  context.canvas.setAttribute("dir", rtl ? "rtl" : "ltr");
  context.save();
  context.font = getFontString(element);
  context.fillStyle = element.strokeColor;
  context.textAlign = element.textAlign as CanvasTextAlign;

  // Canvas does not support multiline text by default
  const lines = element.text.replace(/\r\n?/g, "\n").split("\n");
  const lineHeight = element.height / lines.length;
  const verticalOffset = element.height - element.baseline;
  const horizontalOffset =
    element.textAlign === "center"
      ? element.width / 2
      : element.textAlign === "right"
      ? element.width
      : 0;
  for (let index = 0; index < lines.length; index++) {
    context.fillText(
      lines[index],
      horizontalOffset,
      (index + 1) * lineHeight - verticalOffset,
    );
  }
  context.restore();
};

const renderSvgTextElementText = (
  svgRoot: SVGElement,
  node: SVGElement,
  element: NonDeleted<ExcalidrawTextElementText>,
): void => {
  const lines = element.text.replace(/\r\n?/g, "\n").split("\n");
  const lineHeight = element.height / lines.length;
  const verticalOffset = element.height - element.baseline;
  const horizontalOffset =
    element.textAlign === "center"
      ? element.width / 2
      : element.textAlign === "right"
      ? element.width
      : 0;
  const direction = isRTL(element.text) ? "rtl" : "ltr";
  const textAnchor =
    element.textAlign === "center"
      ? "middle"
      : element.textAlign === "right" || direction === "rtl"
      ? "end"
      : "start";
  for (let i = 0; i < lines.length; i++) {
    const text = svgRoot.ownerDocument!.createElementNS(SVG_NS, "text");
    text.textContent = lines[i];
    text.setAttribute("x", `${horizontalOffset}`);
    text.setAttribute("y", `${(i + 1) * lineHeight - verticalOffset}`);
    text.setAttribute("font-family", getFontFamilyString(element));
    text.setAttribute("font-size", `${element.fontSize}px`);
    text.setAttribute("fill", element.strokeColor);
    text.setAttribute("text-anchor", textAnchor);
    text.setAttribute("style", "white-space: pre;");
    text.setAttribute("direction", direction);
    node.appendChild(text);
  }
};

const restoreTextElementText = (
  element: ExcalidrawTextElement,
  elementRestored: ExcalidrawTextElement,
): ExcalidrawTextElement => {
  return elementRestored;
};

export const registerTextElementSubtypeText = (
  onSubtypesLoaded?: (isTextElementSubtype: Function) => void,
) => {
  registerTextLikeMethod("apply", {
    subtype: "none",
    method: applyTextElementTextOpts,
    default: true,
  });
  registerTextLikeMethod("clean", {
    subtype: "none",
    method: cleanTextOptUpdatesText,
    default: true,
  });
  registerTextLikeMethod("measure", {
    subtype: "none",
    method: measureTextElementText,
    default: true,
  });
  registerTextLikeMethod("render", {
    subtype: "none",
    method: renderTextElementText,
    default: true,
  });
  registerTextLikeMethod("renderSvg", {
    subtype: "none",
    method: renderSvgTextElementText,
    default: true,
  });
  registerTextLikeMethod("restore", {
    subtype: "none",
    method: restoreTextElementText,
    default: true,
  });
};

import {
  ExcalidrawElement,
  ExcalidrawLinearElement,
  ExcalidrawTextElement,
  Arrowhead,
  NonDeletedExcalidrawElement,
  ExcalidrawFreeDrawElement,
} from "../element/types";
import {
  isTextElement,
  isLinearElement,
  isFreeDrawElement,
  isInitializedImageElement,
} from "../element/typeChecks";
import {
  getDiamondPoints,
  getElementAbsoluteCoords,
  getArrowheadPoints,
} from "../element/bounds";
import { RoughCanvas } from "roughjs/bin/canvas";
import { Drawable, Options } from "roughjs/bin/core";
import { RoughSVG } from "roughjs/bin/svg";
import { RoughGenerator } from "roughjs/bin/generator";
import { SceneState } from "../scene/types";
import {
  SVG_NS,
  distance,
  getFontString,
  getFontFamilyString,
  isRTL,
} from "../utils";
import { isPathALoop } from "../math";
import rough from "roughjs/bin/rough";
import { Zoom } from "../types";
import { getDefaultAppState } from "../appState";
import getFreeDrawShape from "perfect-freehand";
import { MAX_DECIMALS_FOR_SVG_EXPORT, THEME_FILTER } from "../constants";

const defaultAppState = getDefaultAppState();

const getDashArrayDashed = (strokeWidth: number) => [8, 8 + strokeWidth];

const getDashArrayDotted = (strokeWidth: number) => [1.5, 6 + strokeWidth];

const getCanvasPadding = (element: ExcalidrawElement) =>
  element.type === "freedraw" ? element.strokeWidth * 12 : 20;

export interface ExcalidrawElementWithCanvas {
  element: ExcalidrawElement | ExcalidrawTextElement;
  canvas: HTMLCanvasElement;
  theme: SceneState["theme"];
  canvasZoom: Zoom["value"];
  canvasOffsetX: number;
  canvasOffsetY: number;
}

const generateElementCanvas = (
  element: NonDeletedExcalidrawElement,
  zoom: Zoom,
  sceneState: SceneState,
): ExcalidrawElementWithCanvas => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  const padding = getCanvasPadding(element);

  let canvasOffsetX = 0;
  let canvasOffsetY = 0;

  if (isLinearElement(element) || isFreeDrawElement(element)) {
    let [x1, y1, x2, y2] = getElementAbsoluteCoords(element);

    x1 = Math.floor(x1);
    x2 = Math.ceil(x2);
    y1 = Math.floor(y1);
    y2 = Math.ceil(y2);

    canvas.width =
      distance(x1, x2) * window.devicePixelRatio * zoom.value +
      padding * zoom.value * 2;
    canvas.height =
      distance(y1, y2) * window.devicePixelRatio * zoom.value +
      padding * zoom.value * 2;

    canvasOffsetX =
      element.x > x1
        ? Math.floor(distance(element.x, x1)) *
          window.devicePixelRatio *
          zoom.value
        : 0;

    canvasOffsetY =
      element.y > y1
        ? Math.floor(distance(element.y, y1)) *
          window.devicePixelRatio *
          zoom.value
        : 0;

    context.translate(canvasOffsetX, canvasOffsetY);
  } else {
    canvas.width =
      element.width * window.devicePixelRatio * zoom.value +
      padding * zoom.value * 2;
    canvas.height =
      element.height * window.devicePixelRatio * zoom.value +
      padding * zoom.value * 2;
  }

  context.save();
  context.translate(padding * zoom.value, padding * zoom.value);
  context.scale(
    window.devicePixelRatio * zoom.value,
    window.devicePixelRatio * zoom.value,
  );

  const rc = rough.canvas(canvas);

  if (sceneState.theme === "dark" && isInitializedImageElement(element)) {
    context.filter = THEME_FILTER;
  }

  drawElementOnCanvas(element, rc, context, sceneState);
  context.restore();

  return {
    element,
    canvas,
    theme: sceneState.theme,
    canvasZoom: zoom.value,
    canvasOffsetX,
    canvasOffsetY,
  };
};

const drawImagePlaceholder = (
  element: NonDeletedExcalidrawElement,
  rc: RoughCanvas,
  context: CanvasRenderingContext2D,
) => {
  context.fillStyle = "rgba(134, 134, 134, 0.199)";
  context.fillRect(0, 0, element.width, element.height);
};

const drawElementOnCanvas = (
  element: NonDeletedExcalidrawElement,
  rc: RoughCanvas,
  context: CanvasRenderingContext2D,
  sceneState: SceneState,
) => {
  context.globalAlpha = element.opacity / 100;
  switch (element.type) {
    case "rectangle":
    case "diamond":
    case "ellipse": {
      context.lineJoin = "round";
      context.lineCap = "round";
      rc.draw(getShapeForElement(element) as Drawable);
      break;
    }
    case "arrow":
    case "line": {
      context.lineJoin = "round";
      context.lineCap = "round";

      (getShapeForElement(element) as Drawable[]).forEach((shape) => {
        rc.draw(shape);
      });
      break;
    }
    case "freedraw": {
      // Draw directly to canvas
      context.save();
      context.fillStyle = element.strokeColor;

      const path = getFreeDrawPath2D(element) as Path2D;

      context.fillStyle = element.strokeColor;
      context.fill(path);

      context.restore();
      break;
    }
    case "image": {
      const img = isInitializedImageElement(element)
        ? sceneState.imageCache.get(element.imageId)
        : undefined;
      if (img != null) {
        context.drawImage(
          img,
          0 /* hardcoded for the selection box*/,
          0,
          element.width,
          element.height,
        );
      } else {
        drawImagePlaceholder(element, rc, context);
      }
      break;
    }
    default: {
      if (isTextElement(element)) {
        const rtl = isRTL(element.text);
        const shouldTemporarilyAttach = rtl && !context.canvas.isConnected;
        if (shouldTemporarilyAttach) {
          // to correctly render RTL text mixed with LTR, we have to append it
          // to the DOM
          document.body.appendChild(context.canvas);
        }
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
        if (shouldTemporarilyAttach) {
          context.canvas.remove();
        }
      } else {
        throw new Error(`Unimplemented type ${element.type}`);
      }
    }
  }
  context.globalAlpha = 1;
};

const elementWithCanvasCache = new WeakMap<
  ExcalidrawElement,
  ExcalidrawElementWithCanvas
>();

const shapeCache = new WeakMap<
  ExcalidrawElement,
  Drawable | Drawable[] | null
>();

export const getShapeForElement = (element: ExcalidrawElement) =>
  shapeCache.get(element);

export const invalidateShapeForElement = (element: ExcalidrawElement) =>
  shapeCache.delete(element);

export const generateRoughOptions = (
  element: ExcalidrawElement,
  continuousPath = false,
): Options => {
  const options: Options = {
    seed: element.seed,
    strokeLineDash:
      element.strokeStyle === "dashed"
        ? getDashArrayDashed(element.strokeWidth)
        : element.strokeStyle === "dotted"
        ? getDashArrayDotted(element.strokeWidth)
        : undefined,
    // for non-solid strokes, disable multiStroke because it tends to make
    // dashes/dots overlay each other
    disableMultiStroke: element.strokeStyle !== "solid",
    // for non-solid strokes, increase the width a bit to make it visually
    // similar to solid strokes, because we're also disabling multiStroke
    strokeWidth:
      element.strokeStyle !== "solid"
        ? element.strokeWidth + 0.5
        : element.strokeWidth,
    // when increasing strokeWidth, we must explicitly set fillWeight and
    // hachureGap because if not specified, roughjs uses strokeWidth to
    // calculate them (and we don't want the fills to be modified)
    fillWeight: element.strokeWidth / 2,
    hachureGap: element.strokeWidth * 4,
    roughness: element.roughness,
    stroke: element.strokeColor,
    preserveVertices: continuousPath,
  };

  switch (element.type) {
    case "rectangle":
    case "diamond":
    case "image":
    case "ellipse": {
      options.fillStyle = element.fillStyle;
      options.fill =
        element.backgroundColor === "transparent"
          ? undefined
          : element.backgroundColor;
      if (element.type === "ellipse") {
        options.curveFitting = 1;
      }
      return options;
    }
    case "line": {
      if (isPathALoop(element.points)) {
        options.fillStyle = element.fillStyle;
        options.fill =
          element.backgroundColor === "transparent"
            ? undefined
            : element.backgroundColor;
      }
      return options;
    }
    case "freedraw":
    case "arrow":
      return options;
    default: {
      throw new Error(`Unimplemented type ${element.type}`);
    }
  }
};

/**
 * Generates the element's shape and puts it into the cache.
 * @param element
 * @param generator
 */
const generateElementShape = (
  element: NonDeletedExcalidrawElement,
  generator: RoughGenerator,
) => {
  let shape = shapeCache.get(element) || null;

  if (!shape) {
    elementWithCanvasCache.delete(element);

    switch (element.type) {
      case "rectangle":
        // case "image":
        if (element.strokeSharpness === "round") {
          const w = element.width;
          const h = element.height;
          const r = Math.min(w, h) * 0.25;
          shape = generator.path(
            `M ${r} 0 L ${w - r} 0 Q ${w} 0, ${w} ${r} L ${w} ${
              h - r
            } Q ${w} ${h}, ${w - r} ${h} L ${r} ${h} Q 0 ${h}, 0 ${
              h - r
            } L 0 ${r} Q 0 0, ${r} 0`,
            generateRoughOptions(element, true),
          );
        } else {
          shape = generator.rectangle(
            0,
            0,
            element.width,
            element.height,
            generateRoughOptions(element),
          );
        }
        break;
      case "diamond": {
        const [
          topX,
          topY,
          rightX,
          rightY,
          bottomX,
          bottomY,
          leftX,
          leftY,
        ] = getDiamondPoints(element);
        shape = generator.polygon(
          [
            [topX, topY],
            [rightX, rightY],
            [bottomX, bottomY],
            [leftX, leftY],
          ],
          generateRoughOptions(element),
        );
        break;
      }
      case "ellipse":
        shape = generator.ellipse(
          element.width / 2,
          element.height / 2,
          element.width,
          element.height,
          generateRoughOptions(element),
        );
        break;
      case "line":
      case "arrow": {
        const options = generateRoughOptions(element);

        // points array can be empty in the beginning, so it is important to add
        // initial position to it
        const points = element.points.length ? element.points : [[0, 0]];

        // curve is always the first element
        // this simplifies finding the curve for an element
        if (element.strokeSharpness === "sharp") {
          if (options.fill) {
            shape = [generator.polygon(points as [number, number][], options)];
          } else {
            shape = [
              generator.linearPath(points as [number, number][], options),
            ];
          }
        } else {
          shape = [generator.curve(points as [number, number][], options)];
        }

        // add lines only in arrow
        if (element.type === "arrow") {
          const { startArrowhead = null, endArrowhead = "arrow" } = element;

          const getArrowheadShapes = (
            element: ExcalidrawLinearElement,
            shape: Drawable[],
            position: "start" | "end",
            arrowhead: Arrowhead,
          ) => {
            const arrowheadPoints = getArrowheadPoints(
              element,
              shape,
              position,
              arrowhead,
            );

            if (arrowheadPoints === null) {
              return [];
            }

            // Other arrowheads here...
            if (arrowhead === "dot") {
              const [x, y, r] = arrowheadPoints;

              return [
                generator.circle(x, y, r, {
                  ...options,
                  fill: element.strokeColor,
                  fillStyle: "solid",
                  stroke: "none",
                }),
              ];
            }

            // Arrow arrowheads
            const [x2, y2, x3, y3, x4, y4] = arrowheadPoints;

            if (element.strokeStyle === "dotted") {
              // for dotted arrows caps, reduce gap to make it more legible
              const dash = getDashArrayDotted(element.strokeWidth - 1);
              options.strokeLineDash = [dash[0], dash[1] - 1];
            } else {
              // for solid/dashed, keep solid arrow cap
              delete options.strokeLineDash;
            }
            return [
              generator.line(x3, y3, x2, y2, options),
              generator.line(x4, y4, x2, y2, options),
            ];
          };

          if (startArrowhead !== null) {
            const shapes = getArrowheadShapes(
              element,
              shape,
              "start",
              startArrowhead,
            );
            shape.push(...shapes);
          }

          if (endArrowhead !== null) {
            if (endArrowhead === undefined) {
              // Hey, we have an old arrow here!
            }

            const shapes = getArrowheadShapes(
              element,
              shape,
              "end",
              endArrowhead,
            );
            shape.push(...shapes);
          }
        }

        break;
      }
      case "freedraw": {
        generateFreeDrawShape(element);
        shape = [];
        break;
      }
      case "text": {
        // just to ensure we don't regenerate element.canvas on rerenders
        shape = [];
        break;
      }
      case "image": {
        // just to ensure we don't regenerate element.canvas on rerenders
        shape = [];
        break;
      }
    }
    shapeCache.set(element, shape);
  }
};

const generateElementWithCanvas = (
  element: NonDeletedExcalidrawElement,
  sceneState: SceneState,
) => {
  const zoom: Zoom = sceneState ? sceneState.zoom : defaultAppState.zoom;
  const prevElementWithCanvas = elementWithCanvasCache.get(element);
  const shouldRegenerateBecauseZoom =
    prevElementWithCanvas &&
    prevElementWithCanvas.canvasZoom !== zoom.value &&
    !sceneState?.shouldCacheIgnoreZoom;

  if (
    !prevElementWithCanvas ||
    shouldRegenerateBecauseZoom ||
    prevElementWithCanvas.theme !== sceneState.theme
  ) {
    const elementWithCanvas = generateElementCanvas(element, zoom, sceneState);

    elementWithCanvasCache.set(element, elementWithCanvas);

    return elementWithCanvas;
  }
  return prevElementWithCanvas;
};

const drawElementFromCanvas = (
  elementWithCanvas: ExcalidrawElementWithCanvas,
  rc: RoughCanvas,
  context: CanvasRenderingContext2D,
  sceneState: SceneState,
) => {
  const element = elementWithCanvas.element;
  const padding = getCanvasPadding(element);
  let [x1, y1, x2, y2] = getElementAbsoluteCoords(element);

  // Free draw elements will otherwise "shuffle" as the min x and y change
  if (isFreeDrawElement(element)) {
    x1 = Math.floor(x1);
    x2 = Math.ceil(x2);
    y1 = Math.floor(y1);
    y2 = Math.ceil(y2);
  }

  const cx = ((x1 + x2) / 2 + sceneState.scrollX) * window.devicePixelRatio;
  const cy = ((y1 + y2) / 2 + sceneState.scrollY) * window.devicePixelRatio;

  const scaleXFactor =
    "scale" in elementWithCanvas.element
      ? elementWithCanvas.element.scale[0]
      : 1;
  const scaleYFactor =
    "scale" in elementWithCanvas.element
      ? elementWithCanvas.element.scale[1]
      : 1;

  context.save();
  context.scale(
    (1 / window.devicePixelRatio) * scaleXFactor,
    (1 / window.devicePixelRatio) * scaleYFactor,
  );
  context.translate(cx * scaleXFactor, cy * scaleYFactor);
  context.rotate(element.angle * scaleXFactor * scaleYFactor);

  context.drawImage(
    elementWithCanvas.canvas!,
    (-(x2 - x1) / 2) * window.devicePixelRatio -
      (padding * elementWithCanvas.canvasZoom) / elementWithCanvas.canvasZoom,
    (-(y2 - y1) / 2) * window.devicePixelRatio -
      (padding * elementWithCanvas.canvasZoom) / elementWithCanvas.canvasZoom,
    elementWithCanvas.canvas!.width / elementWithCanvas.canvasZoom,
    elementWithCanvas.canvas!.height / elementWithCanvas.canvasZoom,
  );
  context.restore();

  // Clear the nested element we appended to the DOM
};

export const renderElement = (
  element: NonDeletedExcalidrawElement,
  rc: RoughCanvas,
  context: CanvasRenderingContext2D,
  renderOptimizations: boolean,
  sceneState: SceneState,
) => {
  const generator = rc.generator;
  switch (element.type) {
    case "selection": {
      context.save();
      context.translate(
        element.x + sceneState.scrollX,
        element.y + sceneState.scrollY,
      );
      context.fillStyle = "rgba(0, 0, 255, 0.10)";
      context.fillRect(0, 0, element.width, element.height);
      context.restore();
      break;
    }
    case "freedraw": {
      generateElementShape(element, generator);

      if (renderOptimizations) {
        const elementWithCanvas = generateElementWithCanvas(
          element,
          sceneState,
        );
        drawElementFromCanvas(elementWithCanvas, rc, context, sceneState);
      } else {
        const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
        const cx = (x1 + x2) / 2 + sceneState.scrollX;
        const cy = (y1 + y2) / 2 + sceneState.scrollY;
        const shiftX = (x2 - x1) / 2 - (element.x - x1);
        const shiftY = (y2 - y1) / 2 - (element.y - y1);
        context.save();
        context.translate(cx, cy);
        context.rotate(element.angle);
        context.translate(-shiftX, -shiftY);
        drawElementOnCanvas(element, rc, context, sceneState);
        context.restore();
      }

      break;
    }
    case "rectangle":
    case "diamond":
    case "ellipse":
    case "line":
    case "arrow":
    case "image":
    case "text": {
      generateElementShape(element, generator);
      if (renderOptimizations) {
        const elementWithCanvas = generateElementWithCanvas(
          element,
          sceneState,
        );
        drawElementFromCanvas(elementWithCanvas, rc, context, sceneState);
      } else {
        const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
        const cx = (x1 + x2) / 2 + sceneState.scrollX;
        const cy = (y1 + y2) / 2 + sceneState.scrollY;
        const shiftX = (x2 - x1) / 2 - (element.x - x1);
        const shiftY = (y2 - y1) / 2 - (element.y - y1);
        context.save();
        context.translate(cx, cy);
        context.rotate(element.angle);
        context.translate(-shiftX, -shiftY);
        drawElementOnCanvas(element, rc, context, sceneState);
        context.restore();
      }
      break;
    }
    default: {
      // @ts-ignore
      throw new Error(`Unimplemented type ${element.type}`);
    }
  }
};

const roughSVGDrawWithPrecision = (
  rsvg: RoughSVG,
  drawable: Drawable,
  precision?: number,
) => {
  if (typeof precision === "undefined") {
    return rsvg.draw(drawable);
  }
  const pshape: Drawable = {
    sets: drawable.sets,
    shape: drawable.shape,
    options: { ...drawable.options, fixedDecimalPlaceDigits: precision },
  };
  return rsvg.draw(pshape);
};

export const renderElementToSvg = (
  element: NonDeletedExcalidrawElement,
  rsvg: RoughSVG,
  svgRoot: SVGElement,
  offsetX?: number,
  offsetY?: number,
) => {
  const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
  const cx = (x2 - x1) / 2 - (element.x - x1);
  const cy = (y2 - y1) / 2 - (element.y - y1);
  const degree = (180 * element.angle) / Math.PI;
  const generator = rsvg.generator;
  switch (element.type) {
    case "selection": {
      // Since this is used only during editing experience, which is canvas based,
      // this should not happen
      throw new Error("Selection rendering is not supported for SVG");
    }
    case "rectangle":
    case "diamond":
    case "ellipse": {
      generateElementShape(element, generator);
      const node = roughSVGDrawWithPrecision(
        rsvg,
        getShapeForElement(element) as Drawable,
        MAX_DECIMALS_FOR_SVG_EXPORT,
      );
      const opacity = element.opacity / 100;
      if (opacity !== 1) {
        node.setAttribute("stroke-opacity", `${opacity}`);
        node.setAttribute("fill-opacity", `${opacity}`);
      }
      node.setAttribute("stroke-linecap", "round");
      node.setAttribute(
        "transform",
        `translate(${offsetX || 0} ${
          offsetY || 0
        }) rotate(${degree} ${cx} ${cy})`,
      );
      svgRoot.appendChild(node);
      break;
    }
    case "line":
    case "arrow": {
      generateElementShape(element, generator);
      const group = svgRoot.ownerDocument!.createElementNS(SVG_NS, "g");
      const opacity = element.opacity / 100;
      group.setAttribute("stroke-linecap", "round");

      (getShapeForElement(element) as Drawable[]).forEach((shape) => {
        const node = roughSVGDrawWithPrecision(
          rsvg,
          shape,
          MAX_DECIMALS_FOR_SVG_EXPORT,
        );
        if (opacity !== 1) {
          node.setAttribute("stroke-opacity", `${opacity}`);
          node.setAttribute("fill-opacity", `${opacity}`);
        }
        node.setAttribute(
          "transform",
          `translate(${offsetX || 0} ${
            offsetY || 0
          }) rotate(${degree} ${cx} ${cy})`,
        );
        if (
          element.type === "line" &&
          isPathALoop(element.points) &&
          element.backgroundColor !== "transparent"
        ) {
          node.setAttribute("fill-rule", "evenodd");
        }
        group.appendChild(node);
      });
      svgRoot.appendChild(group);
      break;
    }
    case "freedraw": {
      generateFreeDrawShape(element);
      const opacity = element.opacity / 100;
      const node = svgRoot.ownerDocument!.createElementNS(SVG_NS, "g");
      if (opacity !== 1) {
        node.setAttribute("stroke-opacity", `${opacity}`);
        node.setAttribute("fill-opacity", `${opacity}`);
      }
      node.setAttribute(
        "transform",
        `translate(${offsetX || 0} ${
          offsetY || 0
        }) rotate(${degree} ${cx} ${cy})`,
      );
      const path = svgRoot.ownerDocument!.createElementNS(SVG_NS, "path");
      node.setAttribute("stroke", "none");
      node.setAttribute("fill", element.strokeColor);
      path.setAttribute("d", getFreeDrawSvgPath(element));
      node.appendChild(path);
      svgRoot.appendChild(node);
      break;
    }
    default: {
      if (isTextElement(element)) {
        const opacity = element.opacity / 100;
        const node = svgRoot.ownerDocument!.createElementNS(SVG_NS, "g");
        if (opacity !== 1) {
          node.setAttribute("stroke-opacity", `${opacity}`);
          node.setAttribute("fill-opacity", `${opacity}`);
        }
        node.setAttribute(
          "transform",
          `translate(${offsetX || 0} ${
            offsetY || 0
          }) rotate(${degree} ${cx} ${cy})`,
        );
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
        svgRoot.appendChild(node);
      } else {
        // @ts-ignore
        throw new Error(`Unimplemented type ${element.type}`);
      }
    }
  }
};

export const pathsCache = new WeakMap<ExcalidrawFreeDrawElement, Path2D>([]);

export function generateFreeDrawShape(element: ExcalidrawFreeDrawElement) {
  const svgPathData = getFreeDrawSvgPath(element);
  const path = new Path2D(svgPathData);
  pathsCache.set(element, path);
  return path;
}

export function getFreeDrawPath2D(element: ExcalidrawFreeDrawElement) {
  return pathsCache.get(element);
}

export function getFreeDrawSvgPath(element: ExcalidrawFreeDrawElement) {
  const inputPoints = element.simulatePressure
    ? element.points
    : element.points.length
    ? element.points.map(([x, y], i) => [x, y, element.pressures[i]])
    : [[0, 0, 0]];

  // Consider changing the options for simulated pressure vs real pressure
  const options = {
    simulatePressure: element.simulatePressure,
    size: element.strokeWidth * 6,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t: number) => t * (2 - t),
    last: true,
  };

  const points = getFreeDrawShape(inputPoints as number[][], options);
  const d: (string | number)[] = [];

  let [p0, p1] = points;

  d.push("M", p0[0], p0[1], "Q");

  for (let i = 0; i < points.length; i++) {
    d.push(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
    p0 = p1;
    p1 = points[i];
  }

  p1 = points[0];
  d.push(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);

  d.push("Z");

  return d.join(" ");
}

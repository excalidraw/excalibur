import { RoughCanvas } from "roughjs/bin/canvas";
import { RoughSVG } from "roughjs/bin/svg";
import oc from "open-color";

import { FlooredNumber, AppState } from "../types";
import {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  ExcalidrawLinearElement,
  NonDeleted,
  GroupId,
  ExcalidrawBindableElement,
} from "../element/types";
import {
  getElementAbsoluteCoords,
  OMIT_SIDES_FOR_MULTIPLE_ELEMENTS,
  getResizeHandlesFromCoords,
  getResizeHandles,
  getElementBounds,
  getCommonBounds,
} from "../element";

import { roundRect } from "./roundRect";
import { SceneState } from "../scene/types";
import {
  getScrollBars,
  SCROLLBAR_COLOR,
  SCROLLBAR_WIDTH,
} from "../scene/scrollbars";
import { getSelectedElements } from "../scene/selection";

import { renderElement, renderElementToSvg } from "./renderElement";
import { getClientColors } from "../clients";
import { LinearElementEditor } from "../element/linearElementEditor";
import {
  isSelectedViaGroup,
  getSelectedGroupIds,
  getElementsInGroup,
} from "../groups";
import { maxBindingGap } from "../element/collision";
import {
  SuggestedBinding,
  SuggestedPointBinding,
  isBindingEnabled,
} from "../element/binding";
import { ResizeHandles, ResizeHandleSide } from "../element/handlerRectangles";

const strokeRectWithRotation = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cx: number,
  cy: number,
  angle: number,
  fill: boolean = false,
) => {
  context.translate(cx, cy);
  context.rotate(angle);
  if (fill) {
    context.fillRect(x - cx, y - cy, width, height);
  }
  context.strokeRect(x - cx, y - cy, width, height);
  context.rotate(-angle);
  context.translate(-cx, -cy);
};

const strokeDiamondWithRotation = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cx: number,
  cy: number,
  angle: number,
) => {
  context.translate(cx, cy);
  context.rotate(angle);
  context.beginPath();
  context.moveTo(0, height / 2);
  context.lineTo(width / 2, 0);
  context.lineTo(0, -height / 2);
  context.lineTo(-width / 2, 0);
  context.closePath();
  context.stroke();
  context.rotate(-angle);
  context.translate(-cx, -cy);
};

const strokeEllipseWithRotation = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cx: number,
  cy: number,
  angle: number,
) => {
  context.beginPath();
  context.ellipse(cx, cy, width / 2, height / 2, angle, 0, Math.PI * 2);
  context.stroke();
};

const fillCircle = (
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
) => {
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
};

const strokeGrid = (
  context: CanvasRenderingContext2D,
  gridSize: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
) => {
  const origStrokeStyle = context.strokeStyle;
  context.strokeStyle = "rgba(0,0,0,0.1)";
  context.beginPath();
  for (let x = offsetX; x < offsetX + width + gridSize * 2; x += gridSize) {
    context.moveTo(x, offsetY - gridSize);
    context.lineTo(x, offsetY + height + gridSize * 2);
  }
  for (let y = offsetY; y < offsetY + height + gridSize * 2; y += gridSize) {
    context.moveTo(offsetX - gridSize, y);
    context.lineTo(offsetX + width + gridSize * 2, y);
  }
  context.stroke();
  context.strokeStyle = origStrokeStyle;
};

const renderLinearPointHandles = (
  context: CanvasRenderingContext2D,
  appState: AppState,
  sceneState: SceneState,
  element: NonDeleted<ExcalidrawLinearElement>,
) => {
  context.translate(sceneState.scrollX, sceneState.scrollY);
  const origStrokeStyle = context.strokeStyle;
  const lineWidth = context.lineWidth;
  context.lineWidth = 1 / sceneState.zoom;

  LinearElementEditor.getPointsGlobalCoordinates(element).forEach(
    (point, idx) => {
      context.strokeStyle = "red";
      context.setLineDash([]);
      context.fillStyle =
        appState.editingLinearElement?.activePointIndex === idx
          ? "rgba(255, 127, 127, 0.9)"
          : "rgba(255, 255, 255, 0.9)";
      const { POINT_HANDLE_SIZE } = LinearElementEditor;
      fillCircle(
        context,
        point[0],
        point[1],
        POINT_HANDLE_SIZE / 2 / sceneState.zoom,
      );
    },
  );
  context.setLineDash([]);
  context.lineWidth = lineWidth;
  context.translate(-sceneState.scrollX, -sceneState.scrollY);
  context.strokeStyle = origStrokeStyle;
};

export const renderScene = (
  elements: readonly NonDeletedExcalidrawElement[],
  appState: AppState,
  selectionElement: NonDeletedExcalidrawElement | null,
  scale: number,
  rc: RoughCanvas,
  canvas: HTMLCanvasElement,
  sceneState: SceneState,
  // extra options, currently passed by export helper
  {
    renderScrollbars = true,
    renderSelection = true,
    // Whether to employ render optimizations to improve performance.
    // Should not be turned on for export operations and similar, because it
    //  doesn't guarantee pixel-perfect output.
    renderOptimizations = false,
    renderGrid = true,
  }: {
    renderScrollbars?: boolean;
    renderSelection?: boolean;
    renderOptimizations?: boolean;
    renderGrid?: boolean;
  } = {},
) => {
  if (!canvas) {
    return { atLeastOneVisibleElement: false };
  }

  const context = canvas.getContext("2d")!;
  context.scale(scale, scale);

  // When doing calculations based on canvas width we should used normalized one
  const normalizedCanvasWidth = canvas.width / scale;
  const normalizedCanvasHeight = canvas.height / scale;

  // Paint background
  if (typeof sceneState.viewBackgroundColor === "string") {
    const hasTransparence =
      sceneState.viewBackgroundColor === "transparent" ||
      sceneState.viewBackgroundColor.length === 5 || // #RGBA
      sceneState.viewBackgroundColor.length === 9 || // #RRGGBBA
      /(hsla|rgba)\(/.test(sceneState.viewBackgroundColor);
    if (hasTransparence) {
      context.clearRect(0, 0, normalizedCanvasWidth, normalizedCanvasHeight);
    }
    const fillStyle = context.fillStyle;
    context.fillStyle = sceneState.viewBackgroundColor;
    context.fillRect(0, 0, normalizedCanvasWidth, normalizedCanvasHeight);
    context.fillStyle = fillStyle;
  } else {
    context.clearRect(0, 0, normalizedCanvasWidth, normalizedCanvasHeight);
  }

  // Apply zoom
  const zoomTranslationX = (-normalizedCanvasWidth * (sceneState.zoom - 1)) / 2;
  const zoomTranslationY =
    (-normalizedCanvasHeight * (sceneState.zoom - 1)) / 2;
  context.translate(zoomTranslationX, zoomTranslationY);
  context.scale(sceneState.zoom, sceneState.zoom);

  // Grid
  if (renderGrid && appState.gridSize) {
    strokeGrid(
      context,
      appState.gridSize,
      -Math.ceil(zoomTranslationX / sceneState.zoom / appState.gridSize) *
        appState.gridSize +
        (sceneState.scrollX % appState.gridSize),
      -Math.ceil(zoomTranslationY / sceneState.zoom / appState.gridSize) *
        appState.gridSize +
        (sceneState.scrollY % appState.gridSize),
      normalizedCanvasWidth / sceneState.zoom,
      normalizedCanvasHeight / sceneState.zoom,
    );
  }

  // Paint visible elements
  const visibleElements = elements.filter((element) =>
    isVisibleElement(
      element,
      normalizedCanvasWidth,
      normalizedCanvasHeight,
      sceneState,
    ),
  );

  visibleElements.forEach((element) => {
    renderElement(element, rc, context, renderOptimizations, sceneState);
  });

  if (appState.editingLinearElement) {
    const element = LinearElementEditor.getElement(
      appState.editingLinearElement.elementId,
    );
    if (element) {
      renderLinearPointHandles(context, appState, sceneState, element);
    }
  }

  // Paint selection element
  if (selectionElement) {
    renderElement(
      selectionElement,
      rc,
      context,
      renderOptimizations,
      sceneState,
    );
  }

  if (isBindingEnabled(appState)) {
    appState.suggestedBindings
      .filter((binding) => binding != null)
      .forEach((suggestedBinding) => {
        renderBindingHighlight(context, sceneState, suggestedBinding!);
      });
  }

  // Paint selected elements
  if (
    renderSelection &&
    !appState.multiElement &&
    !appState.editingLinearElement
  ) {
    const selections = elements.reduce((acc, element) => {
      const selectionColors = [];
      // local user
      if (
        appState.selectedElementIds[element.id] &&
        !isSelectedViaGroup(appState, element)
      ) {
        selectionColors.push(oc.black);
      }
      // remote users
      if (sceneState.remoteSelectedElementIds[element.id]) {
        selectionColors.push(
          ...sceneState.remoteSelectedElementIds[element.id].map((socketId) => {
            const { background } = getClientColors(socketId);
            return background;
          }),
        );
      }
      if (selectionColors.length) {
        const [
          elementX1,
          elementY1,
          elementX2,
          elementY2,
        ] = getElementAbsoluteCoords(element);
        acc.push({
          angle: element.angle,
          elementX1,
          elementY1,
          elementX2,
          elementY2,
          selectionColors,
        });
      }
      return acc;
    }, [] as { angle: number; elementX1: number; elementY1: number; elementX2: number; elementY2: number; selectionColors: string[] }[]);

    function addSelectionForGroupId(groupId: GroupId) {
      const groupElements = getElementsInGroup(elements, groupId);
      const [elementX1, elementY1, elementX2, elementY2] = getCommonBounds(
        groupElements,
      );
      selections.push({
        angle: 0,
        elementX1,
        elementX2,
        elementY1,
        elementY2,
        selectionColors: [oc.black],
      });
    }

    for (const groupId of getSelectedGroupIds(appState)) {
      // TODO: support multiplayer selected group IDs
      addSelectionForGroupId(groupId);
    }

    if (appState.editingGroupId) {
      addSelectionForGroupId(appState.editingGroupId);
    }

    selections.forEach((selection) =>
      renderSelectionBorder(context, sceneState, selection),
    );

    const locallySelectedElements = getSelectedElements(elements, appState);

    // Paint resize resizeHandles
    context.translate(sceneState.scrollX, sceneState.scrollY);
    if (locallySelectedElements.length === 1) {
      context.fillStyle = oc.white;
      const resizeHandles = getResizeHandles(
        locallySelectedElements[0],
        sceneState.zoom,
      );
      renderResizeHandles(
        context,
        sceneState,
        resizeHandles,
        locallySelectedElements[0].angle,
      );
    } else if (locallySelectedElements.length > 1 && !appState.isRotating) {
      const dashedLinePadding = 4 / sceneState.zoom;
      context.fillStyle = oc.white;
      const [x1, y1, x2, y2] = getCommonBounds(locallySelectedElements);
      const initialLineDash = context.getLineDash();
      context.setLineDash([2 / sceneState.zoom]);
      const lineWidth = context.lineWidth;
      context.lineWidth = 1 / sceneState.zoom;
      strokeRectWithRotation(
        context,
        x1 - dashedLinePadding,
        y1 - dashedLinePadding,
        x2 - x1 + dashedLinePadding * 2,
        y2 - y1 + dashedLinePadding * 2,
        (x1 + x2) / 2,
        (y1 + y2) / 2,
        0,
      );
      context.lineWidth = lineWidth;
      context.setLineDash(initialLineDash);
      const resizeHandles = getResizeHandlesFromCoords(
        [x1, y1, x2, y2],
        0,
        sceneState.zoom,
        undefined,
        OMIT_SIDES_FOR_MULTIPLE_ELEMENTS,
      );
      renderResizeHandles(context, sceneState, resizeHandles, 0);
    }
    context.translate(-sceneState.scrollX, -sceneState.scrollY);
  }

  // Reset zoom
  context.scale(1 / sceneState.zoom, 1 / sceneState.zoom);
  context.translate(-zoomTranslationX, -zoomTranslationY);

  // Paint remote pointers
  for (const clientId in sceneState.remotePointerViewportCoords) {
    let { x, y } = sceneState.remotePointerViewportCoords[clientId];
    const username = sceneState.remotePointerUsernames[clientId];

    const width = 9;
    const height = 14;

    const isOutOfBounds =
      x < 0 ||
      x > normalizedCanvasWidth - width ||
      y < 0 ||
      y > normalizedCanvasHeight - height;

    x = Math.max(x, 0);
    x = Math.min(x, normalizedCanvasWidth - width);
    y = Math.max(y, 0);
    y = Math.min(y, normalizedCanvasHeight - height);

    const { background, stroke } = getClientColors(clientId);

    const strokeStyle = context.strokeStyle;
    const fillStyle = context.fillStyle;
    const globalAlpha = context.globalAlpha;
    context.strokeStyle = stroke;
    context.fillStyle = background;
    if (isOutOfBounds) {
      context.globalAlpha = 0.2;
    }

    if (
      sceneState.remotePointerButton &&
      sceneState.remotePointerButton[clientId] === "down"
    ) {
      context.beginPath();
      context.arc(x, y, 15, 0, 2 * Math.PI, false);
      context.lineWidth = 3;
      context.strokeStyle = "#ffffff88";
      context.stroke();
      context.closePath();

      context.beginPath();
      context.arc(x, y, 15, 0, 2 * Math.PI, false);
      context.lineWidth = 1;
      context.strokeStyle = stroke;
      context.stroke();
      context.closePath();
    }

    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 1, y + 14);
    context.lineTo(x + 4, y + 9);
    context.lineTo(x + 9, y + 10);
    context.lineTo(x, y);
    context.fill();
    context.stroke();

    if (!isOutOfBounds && username) {
      const offsetX = x + width;
      const offsetY = y + height;
      const paddingHorizontal = 4;
      const paddingVertical = 4;
      const measure = context.measureText(username);
      const measureHeight =
        measure.actualBoundingBoxDescent + measure.actualBoundingBoxAscent;

      // Border
      context.fillStyle = stroke;
      context.globalAlpha = globalAlpha;
      context.fillRect(
        offsetX - 1,
        offsetY - 1,
        measure.width + 2 * paddingHorizontal + 2,
        measureHeight + 2 * paddingVertical + 2,
      );
      // Background
      context.fillStyle = background;
      context.fillRect(
        offsetX,
        offsetY,
        measure.width + 2 * paddingHorizontal,
        measureHeight + 2 * paddingVertical,
      );
      context.fillStyle = oc.white;
      context.fillText(
        username,
        offsetX + paddingHorizontal,
        offsetY + paddingVertical + measure.actualBoundingBoxAscent,
      );
    }

    context.strokeStyle = strokeStyle;
    context.fillStyle = fillStyle;
    context.globalAlpha = globalAlpha;
    context.closePath();
  }

  // Paint scrollbars
  let scrollBars;
  if (renderScrollbars) {
    scrollBars = getScrollBars(
      elements,
      normalizedCanvasWidth,
      normalizedCanvasHeight,
      sceneState,
    );

    const fillStyle = context.fillStyle;
    const strokeStyle = context.strokeStyle;
    context.fillStyle = SCROLLBAR_COLOR;
    context.strokeStyle = "rgba(255,255,255,0.8)";
    [scrollBars.horizontal, scrollBars.vertical].forEach((scrollBar) => {
      if (scrollBar) {
        roundRect(
          context,
          scrollBar.x,
          scrollBar.y,
          scrollBar.width,
          scrollBar.height,
          SCROLLBAR_WIDTH / 2,
        );
      }
    });
    context.fillStyle = fillStyle;
    context.strokeStyle = strokeStyle;
  }

  context.scale(1 / scale, 1 / scale);

  return { atLeastOneVisibleElement: visibleElements.length > 0, scrollBars };
};

const renderResizeHandles = (
  context: CanvasRenderingContext2D,
  sceneState: SceneState,
  resizeHandles: ResizeHandles,
  angle: number,
): void => {
  Object.keys(resizeHandles).forEach((key) => {
    const resizeHandle = resizeHandles[key as ResizeHandleSide];
    if (resizeHandle !== undefined) {
      const lineWidth = context.lineWidth;
      context.lineWidth = 1 / sceneState.zoom;
      if (key === "rotation") {
        fillCircle(
          context,
          resizeHandle[0] + resizeHandle[2] / 2,
          resizeHandle[1] + resizeHandle[3] / 2,
          resizeHandle[2] / 2,
        );
      } else {
        strokeRectWithRotation(
          context,
          resizeHandle[0],
          resizeHandle[1],
          resizeHandle[2],
          resizeHandle[3],
          resizeHandle[0] + resizeHandle[2] / 2,
          resizeHandle[1] + resizeHandle[3] / 2,
          angle,
          true, // fill before stroke
        );
      }
      context.lineWidth = lineWidth;
    }
  });
};

const renderSelectionBorder = (
  context: CanvasRenderingContext2D,
  sceneState: SceneState,
  elementProperties: {
    angle: number;
    elementX1: number;
    elementY1: number;
    elementX2: number;
    elementY2: number;
    selectionColors: string[];
  },
) => {
  const {
    angle,
    elementX1,
    elementY1,
    elementX2,
    elementY2,
    selectionColors,
  } = elementProperties;
  const elementWidth = elementX2 - elementX1;
  const elementHeight = elementY2 - elementY1;

  const initialLineDash = context.getLineDash();
  const lineWidth = context.lineWidth;
  const lineDashOffset = context.lineDashOffset;
  const strokeStyle = context.strokeStyle;

  const dashedLinePadding = 4 / sceneState.zoom;
  const dashWidth = 8 / sceneState.zoom;
  const spaceWidth = 4 / sceneState.zoom;

  context.lineWidth = 1 / sceneState.zoom;

  context.translate(sceneState.scrollX, sceneState.scrollY);

  const count = selectionColors.length;
  for (var i = 0; i < count; ++i) {
    context.strokeStyle = selectionColors[i];
    context.setLineDash([
      dashWidth,
      spaceWidth + (dashWidth + spaceWidth) * (count - 1),
    ]);
    context.lineDashOffset = (dashWidth + spaceWidth) * i;
    strokeRectWithRotation(
      context,
      elementX1 - dashedLinePadding,
      elementY1 - dashedLinePadding,
      elementWidth + dashedLinePadding * 2,
      elementHeight + dashedLinePadding * 2,
      elementX1 + elementWidth / 2,
      elementY1 + elementHeight / 2,
      angle,
    );
  }
  context.lineDashOffset = lineDashOffset;
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.setLineDash(initialLineDash);
  context.translate(-sceneState.scrollX, -sceneState.scrollY);
};

const renderBindingHighlight = (
  context: CanvasRenderingContext2D,
  sceneState: SceneState,
  suggestedBinding: SuggestedBinding,
) => {
  // preserve context settings to restore later
  const originalStrokeStyle = context.strokeStyle;
  const originalLineWidth = context.lineWidth;

  const renderHighlight = Array.isArray(suggestedBinding)
    ? renderBindingHighlightForSuggestedPointBinding
    : renderBindingHighlightForBindableElement;

  context.translate(sceneState.scrollX, sceneState.scrollY);
  renderHighlight(context, suggestedBinding as any);

  // restore context settings
  context.strokeStyle = originalStrokeStyle;
  context.lineWidth = originalLineWidth;
  context.translate(-sceneState.scrollX, -sceneState.scrollY);
};

const renderBindingHighlightForBindableElement = (
  context: CanvasRenderingContext2D,
  element: ExcalidrawBindableElement,
) => {
  const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
  const width = x2 - x1;
  const height = y2 - y1;
  const threshold = maxBindingGap(element, width, height);

  // So that we don't overlap the element itself
  const strokeOffset = 4;
  context.strokeStyle = "rgba(0,0,0,.05)";
  context.lineWidth = threshold - strokeOffset;
  const padding = strokeOffset + threshold / 2;

  switch (element.type) {
    case "rectangle":
    case "text":
      strokeRectWithRotation(
        context,
        x1 - padding,
        y1 - padding,
        width + padding * 2,
        height + padding * 2,
        x1 + width / 2,
        y1 + height / 2,
        element.angle,
      );
      break;
    case "diamond":
      const side = Math.hypot(width, height);
      const wPadding = (padding * side) / height;
      const hPadding = (padding * side) / width;
      strokeDiamondWithRotation(
        context,
        width + wPadding * 2,
        height + hPadding * 2,
        x1 + width / 2,
        y1 + height / 2,
        element.angle,
      );
      break;
    case "ellipse":
      strokeEllipseWithRotation(
        context,
        width + padding * 2,
        height + padding * 2,
        x1 + width / 2,
        y1 + height / 2,
        element.angle,
      );
      break;
  }
};

const renderBindingHighlightForSuggestedPointBinding = (
  context: CanvasRenderingContext2D,
  suggestedBinding: SuggestedPointBinding,
) => {
  const [element, startOrEnd, bindableElement] = suggestedBinding;

  const threshold = maxBindingGap(
    bindableElement,
    bindableElement.width,
    bindableElement.height,
  );

  context.strokeStyle = "rgba(0,0,0,0)";
  context.fillStyle = "rgba(0,0,0,.05)";

  const pointIndices =
    startOrEnd === "both" ? [0, -1] : startOrEnd === "start" ? [0] : [-1];
  pointIndices.forEach((index) => {
    const [x, y] = LinearElementEditor.getPointAtIndexGlobalCoordinates(
      element,
      index,
    );
    fillCircle(context, x, y, threshold);
  });
};

const isVisibleElement = (
  element: ExcalidrawElement,
  viewportWidth: number,
  viewportHeight: number,
  {
    scrollX,
    scrollY,
    zoom,
  }: {
    scrollX: FlooredNumber;
    scrollY: FlooredNumber;
    zoom: number;
  },
) => {
  const [x1, y1, x2, y2] = getElementBounds(element);

  // Apply zoom
  const viewportWidthWithZoom = viewportWidth / zoom;
  const viewportHeightWithZoom = viewportHeight / zoom;

  const viewportWidthDiff = viewportWidth - viewportWidthWithZoom;
  const viewportHeightDiff = viewportHeight - viewportHeightWithZoom;

  return (
    x2 + scrollX - viewportWidthDiff / 2 >= 0 &&
    x1 + scrollX - viewportWidthDiff / 2 <= viewportWidthWithZoom &&
    y2 + scrollY - viewportHeightDiff / 2 >= 0 &&
    y1 + scrollY - viewportHeightDiff / 2 <= viewportHeightWithZoom
  );
};

// This should be only called for exporting purposes
export const renderSceneToSvg = (
  elements: readonly NonDeletedExcalidrawElement[],
  rsvg: RoughSVG,
  svgRoot: SVGElement,
  {
    offsetX = 0,
    offsetY = 0,
  }: {
    offsetX?: number;
    offsetY?: number;
  } = {},
) => {
  if (!svgRoot) {
    return;
  }
  // render elements
  elements.forEach((element) => {
    if (!element.isDeleted) {
      renderElementToSvg(
        element,
        rsvg,
        svgRoot,
        element.x + offsetX,
        element.y + offsetY,
      );
    }
  });
};

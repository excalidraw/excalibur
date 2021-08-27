import { SHIFT_LOCKING_ANGLE } from "../constants";
import { rescalePoints } from "../points";

import {
  rotate,
  adjustXYWithRotation,
  centerPoint,
  rotatePoint,
} from "../math";
import {
  ExcalidrawLinearElement,
  ExcalidrawTextElement,
  NonDeletedExcalidrawElement,
  NonDeleted,
} from "./types";
import {
  getElementAbsoluteCoords,
  getCommonBounds,
  getResizedElementAbsoluteCoords,
} from "./bounds";
import {
  isFreeDrawElement,
  isLinearElement,
  isTextElement,
} from "./typeChecks";
import { mutateElement } from "./mutateElement";
import { getPerfectElementSize } from "./sizeHelpers";
import { measureTextElement } from "../textlike";
import { updateBoundElements } from "./binding";
import {
  TransformHandleType,
  MaybeTransformHandleType,
  TransformHandleDirection,
} from "./transformHandles";
import { Point, PointerDownState } from "../types";

export const normalizeAngle = (angle: number): number => {
  if (angle >= 2 * Math.PI) {
    return angle - 2 * Math.PI;
  }
  return angle;
};

// Returns true when transform (resizing/rotation) happened
export const transformElements = (
  pointerDownState: PointerDownState,
  transformHandleType: MaybeTransformHandleType,
  selectedElements: readonly NonDeletedExcalidrawElement[],
  resizeArrowDirection: "origin" | "end",
  isRotateWithDiscreteAngle: boolean,
  isResizeCenterPoint: boolean,
  shouldKeepSidesRatio: boolean,
  pointerX: number,
  pointerY: number,
  centerX: number,
  centerY: number,
) => {
  if (selectedElements.length === 1) {
    const [element] = selectedElements;
    if (transformHandleType === "rotation") {
      rotateSingleElement(
        element,
        pointerX,
        pointerY,
        isRotateWithDiscreteAngle,
      );
      updateBoundElements(element);
    } else if (
      isLinearElement(element) &&
      element.points.length === 2 &&
      (transformHandleType === "nw" ||
        transformHandleType === "ne" ||
        transformHandleType === "sw" ||
        transformHandleType === "se")
    ) {
      reshapeSingleTwoPointElement(
        element,
        resizeArrowDirection,
        isRotateWithDiscreteAngle,
        pointerX,
        pointerY,
      );
    } else if (
      isTextElement(element) &&
      (transformHandleType === "nw" ||
        transformHandleType === "ne" ||
        transformHandleType === "sw" ||
        transformHandleType === "se")
    ) {
      resizeSingleTextElement(
        element,
        transformHandleType,
        isResizeCenterPoint,
        pointerX,
        pointerY,
      );
      updateBoundElements(element);
    } else if (transformHandleType) {
      resizeSingleElement(
        pointerDownState.originalElements.get(element.id) as typeof element,
        shouldKeepSidesRatio,
        element,
        transformHandleType,
        isResizeCenterPoint,
        pointerX,
        pointerY,
      );
    }

    return true;
  } else if (selectedElements.length > 1) {
    if (transformHandleType === "rotation") {
      rotateMultipleElements(
        pointerDownState,
        selectedElements,
        pointerX,
        pointerY,
        isRotateWithDiscreteAngle,
        centerX,
        centerY,
      );
      return true;
    } else if (
      transformHandleType === "nw" ||
      transformHandleType === "ne" ||
      transformHandleType === "sw" ||
      transformHandleType === "se"
    ) {
      resizeMultipleElements(
        selectedElements,
        transformHandleType,
        pointerX,
        pointerY,
      );
      return true;
    }
  }
  return false;
};

const rotateSingleElement = (
  element: NonDeletedExcalidrawElement,
  pointerX: number,
  pointerY: number,
  isRotateWithDiscreteAngle: boolean,
) => {
  const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  let angle = (5 * Math.PI) / 2 + Math.atan2(pointerY - cy, pointerX - cx);
  if (isRotateWithDiscreteAngle) {
    angle += SHIFT_LOCKING_ANGLE / 2;
    angle -= angle % SHIFT_LOCKING_ANGLE;
  }
  angle = normalizeAngle(angle);
  mutateElement(element, { angle });
};

// used in DEV only
const validateTwoPointElementNormalized = (
  element: NonDeleted<ExcalidrawLinearElement>,
) => {
  if (
    element.points.length !== 2 ||
    element.points[0][0] !== 0 ||
    element.points[0][1] !== 0 ||
    Math.abs(element.points[1][0]) !== element.width ||
    Math.abs(element.points[1][1]) !== element.height
  ) {
    throw new Error("Two-point element is not normalized");
  }
};

const getPerfectElementSizeWithRotation = (
  elementType: string,
  width: number,
  height: number,
  angle: number,
): [number, number] => {
  const size = getPerfectElementSize(
    elementType,
    ...rotate(width, height, 0, 0, angle),
  );
  return rotate(size.width, size.height, 0, 0, -angle);
};

export const reshapeSingleTwoPointElement = (
  element: NonDeleted<ExcalidrawLinearElement>,
  resizeArrowDirection: "origin" | "end",
  isRotateWithDiscreteAngle: boolean,
  pointerX: number,
  pointerY: number,
) => {
  if (process.env.NODE_ENV !== "production") {
    validateTwoPointElementNormalized(element);
  }
  const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  // rotation pointer with reverse angle
  const [rotatedX, rotatedY] = rotate(
    pointerX,
    pointerY,
    cx,
    cy,
    -element.angle,
  );
  let [width, height] =
    resizeArrowDirection === "end"
      ? [rotatedX - element.x, rotatedY - element.y]
      : [
          element.x + element.points[1][0] - rotatedX,
          element.y + element.points[1][1] - rotatedY,
        ];
  if (isRotateWithDiscreteAngle) {
    [width, height] = getPerfectElementSizeWithRotation(
      element.type,
      width,
      height,
      element.angle,
    );
  }
  const [nextElementX, nextElementY] = adjustXYWithRotation(
    resizeArrowDirection === "end"
      ? { s: true, e: true }
      : { n: true, w: true },
    element.x,
    element.y,
    element.angle,
    0,
    0,
    (element.points[1][0] - width) / 2,
    (element.points[1][1] - height) / 2,
  );
  mutateElement(element, {
    x: nextElementX,
    y: nextElementY,
    points: [
      [0, 0],
      [width, height],
    ],
  });
};

const rescalePointsInElement = (
  element: NonDeletedExcalidrawElement,
  width: number,
  height: number,
) =>
  isLinearElement(element) || isFreeDrawElement(element)
    ? {
        points: rescalePoints(
          0,
          width,
          rescalePoints(1, height, element.points),
        ),
      }
    : {};

const MIN_FONT_SIZE = 1;

const measureFontSizeFromWH = (
  element: NonDeleted<ExcalidrawTextElement>,
  nextWidth: number,
  nextHeight: number,
): { size: number; baseline: number } | null => {
  // We only use width to scale font on resize
  const nextFontSize = element.fontSize * (nextWidth / element.width);
  if (nextFontSize < MIN_FONT_SIZE) {
    return null;
  }
  const metrics = measureTextElement(element, { fontSize: nextFontSize });
  return {
    size: nextFontSize,
    baseline: metrics.baseline + (nextHeight - metrics.height),
  };
};

const getSidesForTransformHandle = (
  transformHandleType: TransformHandleType,
  isResizeFromCenter: boolean,
) => {
  return {
    n:
      /^(n|ne|nw)$/.test(transformHandleType) ||
      (isResizeFromCenter && /^(s|se|sw)$/.test(transformHandleType)),
    s:
      /^(s|se|sw)$/.test(transformHandleType) ||
      (isResizeFromCenter && /^(n|ne|nw)$/.test(transformHandleType)),
    w:
      /^(w|nw|sw)$/.test(transformHandleType) ||
      (isResizeFromCenter && /^(e|ne|se)$/.test(transformHandleType)),
    e:
      /^(e|ne|se)$/.test(transformHandleType) ||
      (isResizeFromCenter && /^(w|nw|sw)$/.test(transformHandleType)),
  };
};

const resizeSingleTextElement = (
  element: NonDeleted<ExcalidrawTextElement>,
  transformHandleType: "nw" | "ne" | "sw" | "se",
  isResizeFromCenter: boolean,
  pointerX: number,
  pointerY: number,
) => {
  const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  // rotation pointer with reverse angle
  const [rotatedX, rotatedY] = rotate(
    pointerX,
    pointerY,
    cx,
    cy,
    -element.angle,
  );
  let scale: number;
  switch (transformHandleType) {
    case "se":
      scale = Math.max(
        (rotatedX - x1) / (x2 - x1),
        (rotatedY - y1) / (y2 - y1),
      );
      break;
    case "nw":
      scale = Math.max(
        (x2 - rotatedX) / (x2 - x1),
        (y2 - rotatedY) / (y2 - y1),
      );
      break;
    case "ne":
      scale = Math.max(
        (rotatedX - x1) / (x2 - x1),
        (y2 - rotatedY) / (y2 - y1),
      );
      break;
    case "sw":
      scale = Math.max(
        (x2 - rotatedX) / (x2 - x1),
        (rotatedY - y1) / (y2 - y1),
      );
      break;
  }
  if (scale > 0) {
    const nextWidth = element.width * scale;
    const nextHeight = element.height * scale;
    const nextFont = measureFontSizeFromWH(element, nextWidth, nextHeight);
    if (nextFont === null) {
      return;
    }
    const [nextX1, nextY1, nextX2, nextY2] = getResizedElementAbsoluteCoords(
      element,
      nextWidth,
      nextHeight,
    );
    const deltaX1 = (x1 - nextX1) / 2;
    const deltaY1 = (y1 - nextY1) / 2;
    const deltaX2 = (x2 - nextX2) / 2;
    const deltaY2 = (y2 - nextY2) / 2;
    const [nextElementX, nextElementY] = adjustXYWithRotation(
      getSidesForTransformHandle(transformHandleType, isResizeFromCenter),
      element.x,
      element.y,
      element.angle,
      deltaX1,
      deltaY1,
      deltaX2,
      deltaY2,
    );
    mutateElement(element, {
      fontSize: nextFont.size,
      width: nextWidth,
      height: nextHeight,
      baseline: nextFont.baseline,
      x: nextElementX,
      y: nextElementY,
    });
  }
};

export const resizeSingleElement = (
  stateAtResizeStart: NonDeletedExcalidrawElement,
  shouldKeepSidesRatio: boolean,
  element: NonDeletedExcalidrawElement,
  transformHandleDirection: TransformHandleDirection,
  isResizeFromCenter: boolean,
  pointerX: number,
  pointerY: number,
) => {
  // Gets bounds corners
  const [x1, y1, x2, y2] = getResizedElementAbsoluteCoords(
    stateAtResizeStart,
    stateAtResizeStart.width,
    stateAtResizeStart.height,
  );
  const startTopLeft: Point = [x1, y1];
  const startBottomRight: Point = [x2, y2];
  const startCenter: Point = centerPoint(startTopLeft, startBottomRight);

  // Calculate new dimensions based on cursor position
  const rotatedPointer = rotatePoint(
    [pointerX, pointerY],
    startCenter,
    -stateAtResizeStart.angle,
  );

  // Get bounds corners rendered on screen
  const [esx1, esy1, esx2, esy2] = getResizedElementAbsoluteCoords(
    element,
    element.width,
    element.height,
  );
  const boundsCurrentWidth = esx2 - esx1;
  const boundsCurrentHeight = esy2 - esy1;

  // It's important we set the initial scale value based on the width and height at resize start,
  // otherwise previous dimensions affected by modifiers will be taken into account.
  const atStartBoundsWidth = startBottomRight[0] - startTopLeft[0];
  const atStartBoundsHeight = startBottomRight[1] - startTopLeft[1];
  let scaleX = atStartBoundsWidth / boundsCurrentWidth;
  let scaleY = atStartBoundsHeight / boundsCurrentHeight;

  if (transformHandleDirection.includes("e")) {
    scaleX = (rotatedPointer[0] - startTopLeft[0]) / boundsCurrentWidth;
  }
  if (transformHandleDirection.includes("s")) {
    scaleY = (rotatedPointer[1] - startTopLeft[1]) / boundsCurrentHeight;
  }
  if (transformHandleDirection.includes("w")) {
    scaleX = (startBottomRight[0] - rotatedPointer[0]) / boundsCurrentWidth;
  }
  if (transformHandleDirection.includes("n")) {
    scaleY = (startBottomRight[1] - rotatedPointer[1]) / boundsCurrentHeight;
  }
  // Linear elements dimensions differ from bounds dimensions
  const eleInitialWidth = stateAtResizeStart.width;
  const eleInitialHeight = stateAtResizeStart.height;
  // We have to use dimensions of element on screen, otherwise the scaling of the
  // dimensions won't match the cursor for linear elements.
  let eleNewWidth = element.width * scaleX;
  let eleNewHeight = element.height * scaleY;

  // adjust dimensions for resizing from center
  if (isResizeFromCenter) {
    eleNewWidth = 2 * eleNewWidth - eleInitialWidth;
    eleNewHeight = 2 * eleNewHeight - eleInitialHeight;
  }

  // adjust dimensions to keep sides ratio
  if (shouldKeepSidesRatio) {
    const widthRatio = Math.abs(eleNewWidth) / eleInitialWidth;
    const heightRatio = Math.abs(eleNewHeight) / eleInitialHeight;
    if (transformHandleDirection.length === 1) {
      eleNewHeight *= widthRatio;
      eleNewWidth *= heightRatio;
    }
    if (transformHandleDirection.length === 2) {
      const ratio = Math.max(widthRatio, heightRatio);
      eleNewWidth = eleInitialWidth * ratio * Math.sign(eleNewWidth);
      eleNewHeight = eleInitialHeight * ratio * Math.sign(eleNewHeight);
    }
  }

  const [
    newBoundsX1,
    newBoundsY1,
    newBoundsX2,
    newBoundsY2,
  ] = getResizedElementAbsoluteCoords(
    stateAtResizeStart,
    eleNewWidth,
    eleNewHeight,
  );
  const newBoundsWidth = newBoundsX2 - newBoundsX1;
  const newBoundsHeight = newBoundsY2 - newBoundsY1;

  // Calculate new topLeft based on fixed corner during resize
  let newTopLeft = [...startTopLeft] as [number, number];
  if (["n", "w", "nw"].includes(transformHandleDirection)) {
    newTopLeft = [
      startBottomRight[0] - Math.abs(newBoundsWidth),
      startBottomRight[1] - Math.abs(newBoundsHeight),
    ];
  }
  if (transformHandleDirection === "ne") {
    const bottomLeft = [startTopLeft[0], startBottomRight[1]];
    newTopLeft = [bottomLeft[0], bottomLeft[1] - Math.abs(newBoundsHeight)];
  }
  if (transformHandleDirection === "sw") {
    const topRight = [startBottomRight[0], startTopLeft[1]];
    newTopLeft = [topRight[0] - Math.abs(newBoundsWidth), topRight[1]];
  }

  // Keeps opposite handle fixed during resize
  if (shouldKeepSidesRatio) {
    if (["s", "n"].includes(transformHandleDirection)) {
      newTopLeft[0] = startCenter[0] - newBoundsWidth / 2;
    }
    if (["e", "w"].includes(transformHandleDirection)) {
      newTopLeft[1] = startCenter[1] - newBoundsHeight / 2;
    }
  }

  // Flip horizontally
  if (eleNewWidth < 0) {
    if (transformHandleDirection.includes("e")) {
      newTopLeft[0] -= Math.abs(newBoundsWidth);
    }
    if (transformHandleDirection.includes("w")) {
      newTopLeft[0] += Math.abs(newBoundsWidth);
    }
  }
  // Flip vertically
  if (eleNewHeight < 0) {
    if (transformHandleDirection.includes("s")) {
      newTopLeft[1] -= Math.abs(newBoundsHeight);
    }
    if (transformHandleDirection.includes("n")) {
      newTopLeft[1] += Math.abs(newBoundsHeight);
    }
  }

  if (isResizeFromCenter) {
    newTopLeft[0] = startCenter[0] - Math.abs(newBoundsWidth) / 2;
    newTopLeft[1] = startCenter[1] - Math.abs(newBoundsHeight) / 2;
  }

  // adjust topLeft to new rotation point
  const angle = stateAtResizeStart.angle;
  const rotatedTopLeft = rotatePoint(newTopLeft, startCenter, angle);
  const newCenter: Point = [
    newTopLeft[0] + Math.abs(newBoundsWidth) / 2,
    newTopLeft[1] + Math.abs(newBoundsHeight) / 2,
  ];
  const rotatedNewCenter = rotatePoint(newCenter, startCenter, angle);
  newTopLeft = rotatePoint(rotatedTopLeft, rotatedNewCenter, -angle);

  // Readjust points for linear elements
  const rescaledPoints = rescalePointsInElement(
    stateAtResizeStart,
    eleNewWidth,
    eleNewHeight,
  );
  // For linear elements (x,y) are the coordinates of the first drawn point not the top-left corner
  // So we need to readjust (x,y) to be where the first point should be
  const newOrigin = [...newTopLeft];
  newOrigin[0] += stateAtResizeStart.x - newBoundsX1;
  newOrigin[1] += stateAtResizeStart.y - newBoundsY1;

  const resizedElement = {
    width: Math.abs(eleNewWidth),
    height: Math.abs(eleNewHeight),
    x: newOrigin[0],
    y: newOrigin[1],
    ...rescaledPoints,
  };

  if (
    resizedElement.width !== 0 &&
    resizedElement.height !== 0 &&
    Number.isFinite(resizedElement.x) &&
    Number.isFinite(resizedElement.y)
  ) {
    updateBoundElements(element, {
      newSize: { width: resizedElement.width, height: resizedElement.height },
    });
    mutateElement(element, resizedElement);
  }
};

const resizeMultipleElements = (
  elements: readonly NonDeletedExcalidrawElement[],
  transformHandleType: "nw" | "ne" | "sw" | "se",
  pointerX: number,
  pointerY: number,
) => {
  const [x1, y1, x2, y2] = getCommonBounds(elements);
  let scale: number;
  let getNextXY: (
    element: NonDeletedExcalidrawElement,
    origCoords: readonly [number, number, number, number],
    finalCoords: readonly [number, number, number, number],
  ) => { x: number; y: number };
  switch (transformHandleType) {
    case "se":
      scale = Math.max(
        (pointerX - x1) / (x2 - x1),
        (pointerY - y1) / (y2 - y1),
      );
      getNextXY = (element, [origX1, origY1], [finalX1, finalY1]) => {
        const x = element.x + (origX1 - x1) * (scale - 1) + origX1 - finalX1;
        const y = element.y + (origY1 - y1) * (scale - 1) + origY1 - finalY1;
        return { x, y };
      };
      break;
    case "nw":
      scale = Math.max(
        (x2 - pointerX) / (x2 - x1),
        (y2 - pointerY) / (y2 - y1),
      );
      getNextXY = (element, [, , origX2, origY2], [, , finalX2, finalY2]) => {
        const x = element.x - (x2 - origX2) * (scale - 1) + origX2 - finalX2;
        const y = element.y - (y2 - origY2) * (scale - 1) + origY2 - finalY2;
        return { x, y };
      };
      break;
    case "ne":
      scale = Math.max(
        (pointerX - x1) / (x2 - x1),
        (y2 - pointerY) / (y2 - y1),
      );
      getNextXY = (element, [origX1, , , origY2], [finalX1, , , finalY2]) => {
        const x = element.x + (origX1 - x1) * (scale - 1) + origX1 - finalX1;
        const y = element.y - (y2 - origY2) * (scale - 1) + origY2 - finalY2;
        return { x, y };
      };
      break;
    case "sw":
      scale = Math.max(
        (x2 - pointerX) / (x2 - x1),
        (pointerY - y1) / (y2 - y1),
      );
      getNextXY = (element, [, origY1, origX2], [, finalY1, finalX2]) => {
        const x = element.x - (x2 - origX2) * (scale - 1) + origX2 - finalX2;
        const y = element.y + (origY1 - y1) * (scale - 1) + origY1 - finalY1;
        return { x, y };
      };
      break;
  }
  if (scale > 0) {
    const updates = elements.reduce(
      (prev, element) => {
        if (!prev) {
          return prev;
        }
        const width = element.width * scale;
        const height = element.height * scale;
        let font: { fontSize?: number; baseline?: number } = {};
        if (element.type === "text") {
          const nextFont = measureFontSizeFromWH(element, width, height);
          if (nextFont === null) {
            return null;
          }
          font = { fontSize: nextFont.size, baseline: nextFont.baseline };
        }
        const origCoords = getElementAbsoluteCoords(element);

        const rescaledPoints = rescalePointsInElement(element, width, height);

        updateBoundElements(element, {
          newSize: { width, height },
          simultaneouslyUpdated: elements,
        });

        const finalCoords = getResizedElementAbsoluteCoords(
          {
            ...element,
            ...rescaledPoints,
          },
          width,
          height,
        );

        const { x, y } = getNextXY(element, origCoords, finalCoords);
        return [...prev, { width, height, x, y, ...rescaledPoints, ...font }];
      },
      [] as
        | {
            width: number;
            height: number;
            x: number;
            y: number;
            points?: (readonly [number, number])[];
            fontSize?: number;
            baseline?: number;
          }[]
        | null,
    );
    if (updates) {
      elements.forEach((element, index) => {
        mutateElement(element, updates[index]);
      });
    }
  }
};

const rotateMultipleElements = (
  pointerDownState: PointerDownState,
  elements: readonly NonDeletedExcalidrawElement[],
  pointerX: number,
  pointerY: number,
  isRotateWithDiscreteAngle: boolean,
  centerX: number,
  centerY: number,
) => {
  let centerAngle =
    (5 * Math.PI) / 2 + Math.atan2(pointerY - centerY, pointerX - centerX);
  if (isRotateWithDiscreteAngle) {
    centerAngle += SHIFT_LOCKING_ANGLE / 2;
    centerAngle -= centerAngle % SHIFT_LOCKING_ANGLE;
  }
  elements.forEach((element, index) => {
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const origAngle =
      pointerDownState.originalElements.get(element.id)?.angle ?? element.angle;
    const [rotatedCX, rotatedCY] = rotate(
      cx,
      cy,
      centerX,
      centerY,
      centerAngle + origAngle - element.angle,
    );
    mutateElement(element, {
      x: element.x + (rotatedCX - cx),
      y: element.y + (rotatedCY - cy),
      angle: normalizeAngle(centerAngle + origAngle),
    });
  });
};

export const getResizeOffsetXY = (
  transformHandleType: MaybeTransformHandleType,
  selectedElements: NonDeletedExcalidrawElement[],
  x: number,
  y: number,
): [number, number] => {
  const [x1, y1, x2, y2] =
    selectedElements.length === 1
      ? getElementAbsoluteCoords(selectedElements[0])
      : getCommonBounds(selectedElements);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const angle = selectedElements.length === 1 ? selectedElements[0].angle : 0;
  [x, y] = rotate(x, y, cx, cy, -angle);
  switch (transformHandleType) {
    case "n":
      return rotate(x - (x1 + x2) / 2, y - y1, 0, 0, angle);
    case "s":
      return rotate(x - (x1 + x2) / 2, y - y2, 0, 0, angle);
    case "w":
      return rotate(x - x1, y - (y1 + y2) / 2, 0, 0, angle);
    case "e":
      return rotate(x - x2, y - (y1 + y2) / 2, 0, 0, angle);
    case "nw":
      return rotate(x - x1, y - y1, 0, 0, angle);
    case "ne":
      return rotate(x - x2, y - y1, 0, 0, angle);
    case "sw":
      return rotate(x - x1, y - y2, 0, 0, angle);
    case "se":
      return rotate(x - x2, y - y2, 0, 0, angle);
    default:
      return [0, 0];
  }
};

export const getResizeArrowDirection = (
  transformHandleType: MaybeTransformHandleType,
  element: NonDeleted<ExcalidrawLinearElement>,
): "origin" | "end" => {
  const [, [px, py]] = element.points;
  const isResizeEnd =
    (transformHandleType === "nw" && (px < 0 || py < 0)) ||
    (transformHandleType === "ne" && px >= 0) ||
    (transformHandleType === "sw" && px <= 0) ||
    (transformHandleType === "se" && (px > 0 || py > 0));
  return isResizeEnd ? "end" : "origin";
};

import {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  NonDeleted,
} from "./types";
import { isInvisiblySmallElement } from "./sizeHelpers";
import { isLinearElementType } from "./typeChecks";

export {
  newElement,
  newTextElement,
  updateTextElement,
  newLinearElement,
  newImageElement,
  duplicateElement,
} from "./newElement";
export {
  getElementAbsoluteCoords,
  getElementBounds,
  getCommonBounds,
  getDiamondPoints,
  getArrowheadPoints,
  getClosestElementBounds,
} from "./bounds";

export {
  OMIT_SIDES_FOR_MULTIPLE_ELEMENTS,
  getTransformHandlesFromCoords,
  getTransformHandles,
} from "./transformHandles";
export {
  hitTest,
  isHittingElementBoundingBoxWithoutHittingElement,
} from "./collision";
export {
  resizeTest,
  getCursorForResizingElement,
  getElementWithTransformHandleType,
  getTransformHandleTypeFromCoords,
} from "./resizeTest";
export {
  transformElements,
  getResizeOffsetXY,
  getResizeArrowDirection,
} from "./resizeElements";
export {
  dragSelectedElements,
  getDragOffsetXY,
  dragNewElement,
} from "./dragElements";
export { isTextElement, isExcalidrawElement } from "./typeChecks";
export { textWysiwyg } from "./textWysiwyg";
export { redrawTextBoundingBox } from "./textElement";
export {
  getPerfectElementSize,
  isInvisiblySmallElement,
  resizePerfectLineForNWHandler,
  getNormalizedDimensions,
} from "./sizeHelpers";
export { showSelectedShapeActions } from "./showSelectedShapeActions";

export const getElementMap = (elements: readonly ExcalidrawElement[]) =>
  elements.reduce(
    (acc: { [key: string]: ExcalidrawElement }, element: ExcalidrawElement) => {
      acc[element.id] = element;
      return acc;
    },
    {},
  );

export const getSceneVersion = (elements: readonly ExcalidrawElement[]) =>
  elements.reduce((acc, el) => acc + el.version, 0);

export const getVisibleElements = (elements: readonly ExcalidrawElement[]) =>
  elements.filter(
    (el) => !el.isDeleted && !isInvisiblySmallElement(el),
  ) as readonly NonDeletedExcalidrawElement[];

export const getNonDeletedElements = (elements: readonly ExcalidrawElement[]) =>
  elements.filter(
    (element) => !element.isDeleted,
  ) as readonly NonDeletedExcalidrawElement[];

export const isNonDeletedElement = <T extends ExcalidrawElement>(
  element: T,
): element is NonDeleted<T> => !element.isDeleted;

const _clearElements = (
  elements: readonly ExcalidrawElement[],
): ExcalidrawElement[] =>
  getNonDeletedElements(elements).map((element) =>
    isLinearElementType(element.type)
      ? { ...element, lastCommittedPoint: null }
      : element,
  );

export const clearElementsForExport = (
  elements: readonly ExcalidrawElement[],
) => _clearElements(elements);

export const clearElementsForLocalStorage = (
  elements: readonly ExcalidrawElement[],
) => _clearElements(elements);

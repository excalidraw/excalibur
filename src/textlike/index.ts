import { ExcalidrawTextElement, NonDeleted } from "../element/types";
import { ElementUpdate, mutateElement } from "../element/mutateElement";

import {
  TextActionNameText,
  TextOptsText,
  registerTextElementSubtypeText,
} from "./text";

import { Action } from "../actions/types";
import { register } from "../actions/register";

type TextLikeMethodName =
  | "apply"
  | "clean"
  | "measure"
  | "render"
  | "renderSvg"
  | "restore";

type TextLikeMethod = {
  subtype: string;
  method: Function;
  default?: boolean;
};

type TextLikeMethods = Array<TextLikeMethod>;
type TextLikeMethodArrays = {
  subtypes: Array<string>;
  methods: Array<Function>;
};

const applyMethodsA = [] as TextLikeMethods;
const applyMethodsL = {} as TextLikeMethodArrays;

const cleanMethodsA = [] as TextLikeMethods;
const cleanMethodsL = {} as TextLikeMethodArrays;

const measureMethodsA = [] as TextLikeMethods;
const measureMethodsL = {} as TextLikeMethodArrays;

const renderMethodsA = [] as TextLikeMethods;
const renderMethodsL = {} as TextLikeMethodArrays;

const renderSvgMethodsA = [] as TextLikeMethods;
const renderSvgMethodsL = {} as TextLikeMethodArrays;

const restoreMethodsA = [] as TextLikeMethods;
const restoreMethodsL = {} as TextLikeMethodArrays;

export type TextOpts = TextOptsText;
export type TextActionName = TextActionNameText;

export const registerTextLikeMethod = (
  name: TextLikeMethodName,
  textLikeMethod: TextLikeMethod,
): void => {
  let methodsA: TextLikeMethods;
  let methodsL: TextLikeMethodArrays;
  switch (name) {
    case "apply":
      methodsA = applyMethodsA;
      methodsL = applyMethodsL;
      break;
    case "clean":
      methodsA = cleanMethodsA;
      methodsL = cleanMethodsL;
      break;
    case "measure":
      methodsA = measureMethodsA;
      methodsL = measureMethodsL;
      break;
    case "render":
      methodsA = renderMethodsA;
      methodsL = renderMethodsL;
      break;
    case "restore":
      methodsA = restoreMethodsA;
      methodsL = restoreMethodsL;
      break;
    case "renderSvg":
      methodsA = renderSvgMethodsA;
      methodsL = renderSvgMethodsL;
      break;
  }
  if (methodsL.subtypes === undefined) {
    methodsL.subtypes = Array<string>();
  }
  if (methodsL.methods === undefined) {
    methodsL.methods = Array<Function>();
  }
  if (!methodsA.includes(textLikeMethod)) {
    methodsA.push(textLikeMethod);
    methodsL.subtypes.push(textLikeMethod.subtype);
    methodsL.methods.push(textLikeMethod.method);
  }
};

export const applyTextOpts = (
  element: ExcalidrawTextElement,
  textOpts?: TextOpts,
): ExcalidrawTextElement => {
  mutateElement(element, cleanTextOptUpdates(element, element));
  for (let i = 0; i < applyMethodsA.length; i++) {
    if (applyMethodsA[i].subtype === element.subtype) {
      return applyMethodsA[i].method(element, textOpts);
    }
  }
  return applyMethodsA
    .find((value, index, applyMethodsA) => {
      return value.default !== undefined && value.default === true;
    })!
    .method(element, textOpts);
};

export const cleanTextOptUpdates = (
  element: ExcalidrawTextElement,
  opts: ElementUpdate<ExcalidrawTextElement>,
): ElementUpdate<ExcalidrawTextElement> => {
  for (let i = 0; i < cleanMethodsA.length; i++) {
    if (cleanMethodsA[i].subtype === element.subtype) {
      return cleanMethodsA[i].method(opts);
    }
  }
  return cleanMethodsA
    .find((value, index, cleanMethodsA) => {
      return value.default !== undefined && value.default === true;
    })!
    .method(opts);
};

export const measureTextElement = (
  element: Omit<
    ExcalidrawTextElement,
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
): { width: number; height: number; baseline: number } => {
  for (let i = 0; i < measureMethodsA.length; i++) {
    if (measureMethodsA[i].subtype === element.subtype) {
      return measureMethodsA[i].method(element, next);
    }
  }
  return measureMethodsA
    .find((value, index, measureMethodsA) => {
      return value.default !== undefined && value.default === true;
    })!
    .method(element, next);
};

export const renderTextElement = (
  element: NonDeleted<ExcalidrawTextElement>,
  context: CanvasRenderingContext2D,
  refresh?: () => void,
): void => {
  for (let i = 0; i < renderMethodsA.length; i++) {
    if (renderMethodsA[i].subtype === element.subtype) {
      renderMethodsA[i].method(element, context, refresh);
      return;
    }
  }
  renderMethodsA
    .find((value, index, renderMethodsA) => {
      return value.default !== undefined && value.default === true;
    })!
    .method(element, context, refresh);
};

export const renderSvgTextElement = (
  svgRoot: SVGElement,
  node: SVGElement,
  element: NonDeleted<ExcalidrawTextElement>,
): void => {
  for (let i = 0; i < renderSvgMethodsA.length; i++) {
    if (renderSvgMethodsA[i].subtype === element.subtype) {
      renderSvgMethodsA[i].method(svgRoot, node, element);
      return;
    }
  }
  renderSvgMethodsA
    .find((value, index, renderSvgMethodsA) => {
      return value.default !== undefined && value.default === true;
    })!
    .method(svgRoot, node, element);
};

export const restoreTextElement = (
  element: ExcalidrawTextElement,
  elementRestored: ExcalidrawTextElement,
): ExcalidrawTextElement => {
  for (let i = 0; i < restoreMethodsA.length; i++) {
    if (restoreMethodsA[i].subtype === element.subtype) {
      return restoreMethodsA[i].method(element, elementRestored);
    }
  }
  return restoreMethodsA
    .find((value, index, restoreMethodsA) => {
      return value.default !== undefined && value.default === true;
    })!
    .method(element, elementRestored);
};

export const registerTextElementSubtypes = (
  onSubtypesLoaded?: (isTextElementSubtype: Function) => void,
) => {
  registerTextElementSubtypeText(onSubtypesLoaded);
};

const textLikeActions: Action[] = [];

export const addTextLikeActions = (actions: Action[]) => {
  actions.forEach((action) => {
    if (!textLikeActions.includes(action)) {
      textLikeActions.push(action);
      register(action);
    }
  });
};

export const getTextLikeActions = (): readonly Action[] => {
  return textLikeActions;
};

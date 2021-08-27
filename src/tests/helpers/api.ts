import {
  ExcalidrawElement,
  ExcalidrawGenericElement,
  ExcalidrawTextElement,
  ExcalidrawLinearElement,
  ExcalidrawFreeDrawElement,
} from "../../element/types";
import { newElement, newTextElement, newLinearElement } from "../../element";
import { DEFAULT_VERTICAL_ALIGN } from "../../constants";
import { getDefaultAppState } from "../../appState";
import { GlobalTestState, createEvent, fireEvent } from "../test-utils";
import fs from "fs";
import util from "util";
import path from "path";
import { getMimeType } from "../../data/blob";
import { newFreeDrawElement } from "../../element/newElement";

const readFile = util.promisify(fs.readFile);

const { h } = window;

export class API {
  static setSelectedElements = (elements: ExcalidrawElement[]) => {
    h.setState({
      selectedElementIds: elements.reduce((acc, element) => {
        acc[element.id] = true;
        return acc;
      }, {} as Record<ExcalidrawElement["id"], true>),
    });
  };

  static getSelectedElements = (): ExcalidrawElement[] => {
    return h.elements.filter(
      (element) => h.state.selectedElementIds[element.id],
    );
  };

  static getSelectedElement = (): ExcalidrawElement => {
    const selectedElements = API.getSelectedElements();
    if (selectedElements.length !== 1) {
      throw new Error(
        `expected 1 selected element; got ${selectedElements.length}`,
      );
    }
    return selectedElements[0];
  };

  static getStateHistory = () => {
    // @ts-ignore
    return h.history.stateHistory;
  };

  static clearSelection = () => {
    // @ts-ignore
    h.app.clearSelection(null);
    expect(API.getSelectedElements().length).toBe(0);
  };

  static createElement = <
    T extends Exclude<ExcalidrawElement["type"], "selection">
  >({
    type,
    id,
    x = 0,
    y = x,
    width = 100,
    height = width,
    isDeleted = false,
    groupIds = [],
    ...rest
  }: {
    type: T;
    x?: number;
    y?: number;
    height?: number;
    width?: number;
    id?: string;
    isDeleted?: boolean;
    groupIds?: string[];
    // generic element props
    strokeColor?: ExcalidrawGenericElement["strokeColor"];
    backgroundColor?: ExcalidrawGenericElement["backgroundColor"];
    fillStyle?: ExcalidrawGenericElement["fillStyle"];
    strokeWidth?: ExcalidrawGenericElement["strokeWidth"];
    strokeStyle?: ExcalidrawGenericElement["strokeStyle"];
    strokeSharpness?: ExcalidrawGenericElement["strokeSharpness"];
    roughness?: ExcalidrawGenericElement["roughness"];
    opacity?: ExcalidrawGenericElement["opacity"];
    // text props
    text?: T extends "text" ? ExcalidrawTextElement["text"] : never;
    fontSize?: T extends "text" ? ExcalidrawTextElement["fontSize"] : never;
    fontFamily?: T extends "text" ? ExcalidrawTextElement["fontFamily"] : never;
    textAlign?: T extends "text" ? ExcalidrawTextElement["textAlign"] : never;
    verticalAlign?: T extends "text"
      ? ExcalidrawTextElement["verticalAlign"]
      : never;
    subtype?: T extends "text" ? ExcalidrawTextElement["subtype"] : never;
  }): T extends "arrow" | "line"
    ? ExcalidrawLinearElement
    : T extends "freedraw"
    ? ExcalidrawFreeDrawElement
    : T extends "text"
    ? ExcalidrawTextElement
    : ExcalidrawGenericElement => {
    let element: Mutable<ExcalidrawElement> = null!;

    const appState = h?.state || getDefaultAppState();

    const base = {
      x,
      y,
      strokeColor: rest.strokeColor ?? appState.currentItemStrokeColor,
      backgroundColor:
        rest.backgroundColor ?? appState.currentItemBackgroundColor,
      fillStyle: rest.fillStyle ?? appState.currentItemFillStyle,
      strokeWidth: rest.strokeWidth ?? appState.currentItemStrokeWidth,
      strokeStyle: rest.strokeStyle ?? appState.currentItemStrokeStyle,
      strokeSharpness:
        rest.strokeSharpness ?? appState.currentItemStrokeSharpness,
      roughness: rest.roughness ?? appState.currentItemRoughness,
      opacity: rest.opacity ?? appState.currentItemOpacity,
    };
    switch (type) {
      case "rectangle":
      case "diamond":
      case "ellipse":
        element = newElement({
          type: type as "rectangle" | "diamond" | "ellipse",
          width,
          height,
          ...base,
        });
        break;
      case "text":
        element = newTextElement({
          ...base,
          text: rest.text || "test",
          fontSize: rest.fontSize ?? appState.currentItemFontSize,
          fontFamily: rest.fontFamily ?? appState.currentItemFontFamily,
          textAlign: rest.textAlign ?? appState.currentItemTextAlign,
          verticalAlign: rest.verticalAlign ?? DEFAULT_VERTICAL_ALIGN,
          subtype: rest.subtype ?? "none",
        });
        element.width = width;
        element.height = height;
        break;
      case "freedraw":
        element = newFreeDrawElement({
          type: type as "freedraw",
          simulatePressure: true,
          ...base,
        });
        break;
      case "arrow":
      case "line":
        element = newLinearElement({
          type: type as "arrow" | "line",
          startArrowhead: null,
          endArrowhead: null,
          ...base,
        });
        break;
    }
    if (id) {
      element.id = id;
    }
    if (isDeleted) {
      element.isDeleted = isDeleted;
    }
    if (groupIds) {
      element.groupIds = groupIds;
    }
    return element as any;
  };

  static readFile = async <T extends "utf8" | null>(
    filepath: string,
    encoding?: T,
  ): Promise<T extends "utf8" ? string : Buffer> => {
    filepath = path.isAbsolute(filepath)
      ? filepath
      : path.resolve(path.join(__dirname, "../", filepath));
    return readFile(filepath, { encoding }) as any;
  };

  static loadFile = async (filepath: string) => {
    const { base, ext } = path.parse(filepath);
    return new File([await API.readFile(filepath, null)], base, {
      type: getMimeType(ext),
    });
  };

  static drop = async (blob: Blob) => {
    const fileDropEvent = createEvent.drop(GlobalTestState.canvas);
    const text = await new Promise<string>((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.readAsText(blob);
      } catch (error) {
        reject(error);
      }
    });

    Object.defineProperty(fileDropEvent, "dataTransfer", {
      value: {
        files: [blob],
        getData: (type: string) => {
          if (type === blob.type) {
            return text;
          }
          return "";
        },
      },
    });
    fireEvent(GlobalTestState.canvas, fileDropEvent);
  };
}

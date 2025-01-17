import type {
  ExcalidrawElement,
  ExcalidrawLinearElement,
  ExcalidrawTextElement,
  ExcalidrawArrowElement,
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
  ExcalidrawTextContainer,
  ExcalidrawTextElementWithContainer,
  ExcalidrawImageElement,
} from "../../element/types";
import type { TransformHandleType } from "../../element/transformHandles";
import {
  getTransformHandles,
  getTransformHandlesFromCoords,
  OMIT_SIDES_FOR_FRAME,
  OMIT_SIDES_FOR_MULTIPLE_ELEMENTS,
  type TransformHandle,
  type TransformHandleDirection,
} from "../../element/transformHandles";
import { KEYS } from "../../keys";
import { act, fireEvent, GlobalTestState, screen } from "../test-utils";
import { mutateElement } from "../../element/mutateElement";
import { API } from "./api";
import {
  isLinearElement,
  isFreeDrawElement,
  isTextElement,
  isFrameLikeElement,
} from "../../element/typeChecks";
import { getCommonBounds, getElementPointsCoords } from "../../element/bounds";
import { getTextEditor } from "../queries/dom";
import { arrayToMap } from "../../utils";
import { createTestHook } from "../../components/App";
import type { GlobalPoint, LocalPoint, Radians } from "../../../math";
import { pointFrom, pointRotateRads } from "../../../math";
import { cropElement } from "../../element/cropElement";
import type { ToolType } from "../../types";

const TEXT_EDITOR_SELECTOR = ".excalidraw-textEditorContainer > textarea";

// so that window.h is available when App.tsx is not imported as well.
createTestHook();

const { h } = window;

let altKey = false;
let shiftKey = false;
let ctrlKey = false;

export type KeyboardModifiers = {
  alt?: boolean;
  shift?: boolean;
  ctrl?: boolean;
};
export class Keyboard {
  static withModifierKeys = (modifiers: KeyboardModifiers, cb: () => void) => {
    const prevAltKey = altKey;
    const prevShiftKey = shiftKey;
    const prevCtrlKey = ctrlKey;

    altKey = !!modifiers.alt;
    shiftKey = !!modifiers.shift;
    ctrlKey = !!modifiers.ctrl;

    try {
      cb();
    } finally {
      altKey = prevAltKey;
      shiftKey = prevShiftKey;
      ctrlKey = prevCtrlKey;
    }
  };

  static keyDown = (
    key: string,
    target: HTMLElement | Document | Window = document,
  ) => {
    fireEvent.keyDown(target, {
      key,
      ctrlKey,
      shiftKey,
      altKey,
    });
  };

  static keyUp = (
    key: string,
    target: HTMLElement | Document | Window = document,
  ) => {
    fireEvent.keyUp(target, {
      key,
      ctrlKey,
      shiftKey,
      altKey,
    });
  };

  static keyPress = (key: string, target?: HTMLElement | Document | Window) => {
    Keyboard.keyDown(key, target);
    Keyboard.keyUp(key, target);
  };

  static codeDown = (code: string) => {
    fireEvent.keyDown(document, {
      code,
      ctrlKey,
      shiftKey,
      altKey,
    });
  };

  static codeUp = (code: string) => {
    fireEvent.keyUp(document, {
      code,
      ctrlKey,
      shiftKey,
      altKey,
    });
  };

  static codePress = (code: string) => {
    Keyboard.codeDown(code);
    Keyboard.codeUp(code);
  };

  static undo = () => {
    Keyboard.withModifierKeys({ ctrl: true }, () => {
      Keyboard.keyPress("z");
    });
  };

  static redo = () => {
    Keyboard.withModifierKeys({ ctrl: true, shift: true }, () => {
      Keyboard.keyPress("z");
    });
  };

  static exitTextEditor = (textarea: HTMLTextAreaElement) => {
    fireEvent.keyDown(textarea, { key: KEYS.ESCAPE });
  };
}

const getElementPointForSelection = (
  element: ExcalidrawElement,
): GlobalPoint => {
  const { x, y, width, height, angle } = element;
  const target = pointFrom<GlobalPoint>(
    x +
      (isLinearElement(element) || isFreeDrawElement(element) ? 0 : width / 2),
    y,
  );
  let center: GlobalPoint;

  if (isLinearElement(element)) {
    const bounds = getElementPointsCoords(element, element.points);
    center = pointFrom(
      (bounds[0] + bounds[2]) / 2,
      (bounds[1] + bounds[3]) / 2,
    );
  } else {
    center = pointFrom(x + width / 2, y + height / 2);
  }

  if (isTextElement(element)) {
    return center;
  }

  return pointRotateRads(target, center, angle);
};

export class Pointer {
  public clientX = 0;
  public clientY = 0;

  constructor(
    private readonly pointerType: "mouse" | "touch" | "pen",
    private readonly pointerId = 1,
  ) {}

  reset() {
    this.clientX = 0;
    this.clientY = 0;
  }

  getPosition() {
    return [this.clientX, this.clientY];
  }

  restorePosition(x = 0, y = 0) {
    this.clientX = x;
    this.clientY = y;
    fireEvent.pointerMove(GlobalTestState.interactiveCanvas, this.getEvent());
  }

  private getEvent() {
    return {
      clientX: this.clientX,
      clientY: this.clientY,
      pointerType: this.pointerType,
      pointerId: this.pointerId,
      altKey,
      shiftKey,
      ctrlKey,
    };
  }

  // incremental (moving by deltas)
  // ---------------------------------------------------------------------------

  move(dx: number, dy: number) {
    if (dx !== 0 || dy !== 0) {
      this.clientX += dx;
      this.clientY += dy;
      fireEvent.pointerMove(GlobalTestState.interactiveCanvas, this.getEvent());
    }
  }

  down(dx = 0, dy = 0) {
    this.move(dx, dy);
    fireEvent.pointerDown(GlobalTestState.interactiveCanvas, this.getEvent());
  }

  up(dx = 0, dy = 0) {
    this.move(dx, dy);
    fireEvent.pointerUp(GlobalTestState.interactiveCanvas, this.getEvent());
  }

  click(dx = 0, dy = 0) {
    this.down(dx, dy);
    this.up();
  }

  doubleClick(dx = 0, dy = 0) {
    this.move(dx, dy);
    fireEvent.doubleClick(GlobalTestState.interactiveCanvas, this.getEvent());
  }

  // absolute coords
  // ---------------------------------------------------------------------------

  moveTo(x: number = this.clientX, y: number = this.clientY) {
    this.clientX = x;
    this.clientY = y;
    // fire "mousemove" to update editor cursor position
    fireEvent.mouseMove(document, this.getEvent());
    fireEvent.pointerMove(GlobalTestState.interactiveCanvas, this.getEvent());
  }

  downAt(x = this.clientX, y = this.clientY) {
    this.clientX = x;
    this.clientY = y;
    fireEvent.pointerDown(GlobalTestState.interactiveCanvas, this.getEvent());
  }

  upAt(x = this.clientX, y = this.clientY) {
    this.clientX = x;
    this.clientY = y;
    fireEvent.pointerUp(GlobalTestState.interactiveCanvas, this.getEvent());
  }

  clickAt(x: number, y: number) {
    this.downAt(x, y);
    this.upAt();
  }

  rightClickAt(x: number, y: number) {
    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      button: 2,
      clientX: x,
      clientY: y,
    });
  }

  doubleClickAt(x: number, y: number) {
    this.moveTo(x, y);
    fireEvent.doubleClick(GlobalTestState.interactiveCanvas, this.getEvent());
  }

  // ---------------------------------------------------------------------------

  select(
    /** if multiple elements supplied, they're shift-selected */
    elements: ExcalidrawElement | ExcalidrawElement[],
  ) {
    API.clearSelection();

    Keyboard.withModifierKeys({ shift: true }, () => {
      elements = Array.isArray(elements) ? elements : [elements];
      elements.forEach((element) => {
        this.reset();
        this.click(...getElementPointForSelection(element));
      });
    });

    this.reset();
  }

  clickOn(element: ExcalidrawElement) {
    this.reset();
    this.click(...getElementPointForSelection(element));
    this.reset();
  }

  doubleClickOn(element: ExcalidrawElement) {
    this.reset();
    this.doubleClick(...getElementPointForSelection(element));
    this.reset();
  }
}

const mouse = new Pointer("mouse");

const transform = (
  element: ExcalidrawElement | ExcalidrawElement[],
  handle: TransformHandleType,
  mouseMove: [deltaX: number, deltaY: number],
  keyboardModifiers: KeyboardModifiers = {},
) => {
  const elements = Array.isArray(element) ? element : [element];
  act(() => {
    h.setState({
      selectedElementIds: elements.reduce(
        (acc, e) => ({
          ...acc,
          [e.id]: true,
        }),
        {},
      ),
    });
  });
  let handleCoords: TransformHandle | undefined;
  if (elements.length === 1) {
    handleCoords = getTransformHandles(
      elements[0],
      h.state.zoom,
      arrayToMap(h.elements),
      "mouse",
      {},
    )[handle];
  } else {
    const [x1, y1, x2, y2] = getCommonBounds(elements);
    const isFrameSelected = elements.some(isFrameLikeElement);
    const transformHandles = getTransformHandlesFromCoords(
      [x1, y1, x2, y2, (x1 + x2) / 2, (y1 + y2) / 2],
      0 as Radians,
      h.state.zoom,
      "mouse",
      isFrameSelected ? OMIT_SIDES_FOR_FRAME : OMIT_SIDES_FOR_MULTIPLE_ELEMENTS,
    );
    handleCoords = transformHandles[handle];
  }

  if (!handleCoords) {
    throw new Error(`There is no "${handle}" handle for this selection`);
  }

  const clientX = handleCoords[0] + handleCoords[2] / 2;
  const clientY = handleCoords[1] + handleCoords[3] / 2;

  Keyboard.withModifierKeys(keyboardModifiers, () => {
    mouse.reset();
    mouse.down(clientX, clientY);
    mouse.move(mouseMove[0], mouseMove[1]);
    mouse.up();
  });
};

const proxy = <T extends ExcalidrawElement>(
  element: T,
): typeof element & {
  /** Returns the actual, current element from the elements array, instead of
      the proxy */
  get(): typeof element;
} => {
  return new Proxy(
    {},
    {
      get(target, prop) {
        const currentElement = h.elements.find(
          ({ id }) => id === element.id,
        ) as any;
        if (prop === "get") {
          if (currentElement.hasOwnProperty("get")) {
            throw new Error(
              "trying to get `get` test property, but ExcalidrawElement seems to define its own",
            );
          }
          return () => currentElement;
        }
        return currentElement[prop];
      },
    },
  ) as any;
};

/** Tools that can be used to draw shapes */
type DrawingToolName = Exclude<ToolType, "lock" | "selection" | "eraser">;

type Element<T extends DrawingToolName> = T extends "line" | "freedraw"
  ? ExcalidrawLinearElement
  : T extends "arrow"
  ? ExcalidrawArrowElement
  : T extends "text"
  ? ExcalidrawTextElement
  : T extends "rectangle"
  ? ExcalidrawRectangleElement
  : T extends "ellipse"
  ? ExcalidrawEllipseElement
  : T extends "diamond"
  ? ExcalidrawDiamondElement
  : ExcalidrawElement;

export class UI {
  static clickTool = (toolName: ToolType | "lock") => {
    fireEvent.click(GlobalTestState.renderResult.getByToolName(toolName));
  };

  static clickLabeledElement = (label: string) => {
    const element = document.querySelector(`[aria-label='${label}']`);
    if (!element) {
      throw new Error(`No labeled element found: ${label}`);
    }
    fireEvent.click(element);
  };

  static clickOnTestId = (testId: string) => {
    const element = document.querySelector(`[data-testid='${testId}']`);
    // const element = GlobalTestState.renderResult.queryByTestId(testId);
    if (!element) {
      throw new Error(`No element with testid "${testId}" found`);
    }
    fireEvent.click(element);
  };

  static clickByTitle = (title: string) => {
    fireEvent.click(screen.getByTitle(title));
  };

  /**
   * Creates an Excalidraw element, and returns a proxy that wraps it so that
   * accessing props will return the latest ones from the object existing in
   * the app's elements array. This is because across the app lifecycle we tend
   * to recreate element objects and the returned reference will become stale.
   *
   * If you need to get the actual element, not the proxy, call `get()` method
   * on the proxy object.
   */
  static createElement<T extends DrawingToolName>(
    type: T,
    {
      position = 0,
      x = position,
      y = position,
      size = 10,
      width: initialWidth = size,
      height: initialHeight = initialWidth,
      angle = 0,
      points: initialPoints,
    }: {
      position?: number;
      x?: number;
      y?: number;
      size?: number;
      width?: number;
      height?: number;
      angle?: number;
      points?: T extends "line" | "arrow" | "freedraw" ? LocalPoint[] : never;
    } = {},
  ): Element<T> & {
    /** Returns the actual, current element from the elements array, instead
        of the proxy */
    get(): Element<T>;
  } {
    const width = initialWidth ?? initialHeight ?? size;
    const height = initialHeight ?? size;
    const points: LocalPoint[] = initialPoints ?? [
      pointFrom(0, 0),
      pointFrom(width, height),
    ];
    UI.clickTool(type);

    if (type === "text") {
      mouse.reset();
      mouse.click(x, y);

      const openedEditor =
        document.querySelector<HTMLTextAreaElement>(TEXT_EDITOR_SELECTOR);

      // NOTE this is a hack to make sure the editor is focused on edit
      // which for some reason doesn't work in tests after latest changes.
      // This means that a regression in wysiwyg editor might not be caught
      // tests.
      openedEditor?.focus();
    } else if ((type === "line" || type === "arrow") && points.length > 2) {
      points.forEach((point) => {
        mouse.reset();
        mouse.click(x + point[0], y + point[1]);
      });
      Keyboard.keyPress(KEYS.ESCAPE);
    } else if (type === "freedraw" && points.length > 2) {
      const firstPoint = points[0];
      mouse.reset();
      mouse.down(x + firstPoint[0], y + firstPoint[1]);
      points
        .slice(1)
        .forEach((point) => mouse.moveTo(x + point[0], y + point[1]));
      mouse.upAt();
      Keyboard.keyPress(KEYS.ESCAPE);
    } else {
      mouse.reset();
      mouse.down(x, y);
      mouse.reset();
      mouse.up(x + width, y + height);
    }
    const origElement = h.elements[h.elements.length - 1] as any;

    if (angle !== 0) {
      act(() => {
        mutateElement(origElement, { angle });
      });
    }

    return proxy(origElement);
  }

  static async editText<
    T extends ExcalidrawTextElement | ExcalidrawTextContainer,
  >(element: T, text: string) {
    const openedEditor =
      document.querySelector<HTMLTextAreaElement>(TEXT_EDITOR_SELECTOR);

    if (!openedEditor) {
      mouse.select(element);
      Keyboard.keyPress(KEYS.ENTER);
    }

    const editor = await getTextEditor();
    if (!editor) {
      throw new Error("Can't find wysiwyg text editor in the dom");
    }

    // NOTE this is a hack to make sure the editor is focused on edit
    // which for some reason doesn't work in tests after latest changes.
    // This means that a regression in wysiwyg editor might not be caught
    // tests.
    editor.focus();

    fireEvent.input(editor, { target: { value: text } });
    act(() => {
      editor.blur();
    });

    return isTextElement(element)
      ? element
      : proxy(
          h.elements[
            h.elements.length - 1
          ] as ExcalidrawTextElementWithContainer,
        );
  }

  static updateInput = (input: HTMLInputElement, value: string | number) => {
    act(() => {
      input.focus();
      fireEvent.change(input, { target: { value: String(value) } });
      input.blur();
    });
  };

  static resize(
    element: ExcalidrawElement | ExcalidrawElement[],
    handle: TransformHandleDirection,
    mouseMove: [deltaX: number, deltaY: number],
    keyboardModifiers: KeyboardModifiers = {},
  ) {
    return transform(element, handle, mouseMove, keyboardModifiers);
  }

  static crop(
    element: ExcalidrawImageElement,
    handle: TransformHandleDirection,
    naturalWidth: number,
    naturalHeight: number,
    mouseMove: [deltaX: number, deltaY: number],
    keepAspectRatio = false,
  ) {
    const handleCoords = getTransformHandles(
      element,
      h.state.zoom,
      arrayToMap(h.elements),
      "mouse",
      {},
    )[handle]!;

    const clientX = handleCoords[0] + handleCoords[2] / 2;
    const clientY = handleCoords[1] + handleCoords[3] / 2;

    const mutations = cropElement(
      element,
      handle,
      naturalWidth,
      naturalHeight,
      clientX + mouseMove[0],
      clientY + mouseMove[1],
      keepAspectRatio ? element.width / element.height : undefined,
    );

    API.updateElement(element, mutations);
  }

  static rotate(
    element: ExcalidrawElement | ExcalidrawElement[],
    mouseMove: [deltaX: number, deltaY: number],
    keyboardModifiers: KeyboardModifiers = {},
  ) {
    return transform(element, "rotation", mouseMove, keyboardModifiers);
  }

  static group(elements: ExcalidrawElement[]) {
    mouse.select(elements);
    Keyboard.withModifierKeys({ ctrl: true }, () => {
      Keyboard.keyPress(KEYS.G);
    });
  }

  static ungroup(elements: ExcalidrawElement[]) {
    mouse.select(elements);
    Keyboard.withModifierKeys({ ctrl: true, shift: true }, () => {
      Keyboard.keyPress(KEYS.G);
    });
  }

  static queryContextMenu = () => {
    return GlobalTestState.renderResult.container.querySelector(
      ".context-menu",
    ) as HTMLElement | null;
  };

  static queryStats = () => {
    return GlobalTestState.renderResult.container.querySelector(
      ".exc-stats",
    ) as HTMLElement | null;
  };

  static queryStatsProperty = (label: string) => {
    const elementStats = UI.queryStats()?.querySelector("#elementStats");

    expect(elementStats).not.toBeNull();

    if (elementStats) {
      return (
        elementStats?.querySelector(
          `.exc-stats__row .drag-input-container[data-testid="${label}"]`,
        ) || null
      );
    }

    return null;
  };
}

import React from "react";
import ReactDOM from "react-dom";
import {
  render,
  fireEvent,
  mockBoundingClientRect,
  restoreOriginalGetBoundingClientRect,
  assertSelectedElements,
} from "./test-utils";
import { Excalidraw } from "../index";
import * as StaticScene from "../renderer/staticScene";
import * as InteractiveCanvas from "../renderer/interactiveScene";
import { KEYS } from "../keys";
import { reseed } from "../random";
import { API } from "./helpers/api";
import { Keyboard, Pointer, UI } from "./helpers/ui";
import { SHAPES } from "../shapes";
import { vi } from "vitest";
import type { ExcalidrawElement } from "../element/types";

// Unmount ReactDOM from root
ReactDOM.unmountComponentAtNode(document.getElementById("root")!);

const renderInteractiveScene = vi.spyOn(
  InteractiveCanvas,
  "renderInteractiveScene",
);
const renderStaticScene = vi.spyOn(StaticScene, "renderStaticScene");

beforeEach(() => {
  localStorage.clear();
  renderInteractiveScene.mockClear();
  renderStaticScene.mockClear();
  reseed(7);
});

const { h } = window;

const mouse = new Pointer("mouse");

describe("box-selection", () => {
  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("should allow adding to selection via box-select when holding shift", async () => {
    const rect1 = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      backgroundColor: "red",
      fillStyle: "solid",
    });
    const rect2 = API.createElement({
      type: "rectangle",
      x: 100,
      y: 0,
      width: 50,
      height: 50,
    });

    API.setElements([rect1, rect2]);

    mouse.downAt(175, -20);
    mouse.moveTo(85, 70);
    mouse.up();

    assertSelectedElements([rect2.id]);

    Keyboard.withModifierKeys({ shift: true }, () => {
      mouse.downAt(75, -20);
      mouse.moveTo(-15, 70);
      mouse.up();
    });

    assertSelectedElements([rect2.id, rect1.id]);
  });

  it("should (de)select element when box-selecting over and out while not holding shift", async () => {
    const rect1 = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      backgroundColor: "red",
      fillStyle: "solid",
    });

    API.setElements([rect1]);

    mouse.downAt(75, -20);
    mouse.moveTo(-15, 70);

    assertSelectedElements([rect1.id]);

    mouse.moveTo(100, -100);

    assertSelectedElements([]);

    mouse.up();

    assertSelectedElements([]);
  });
});

describe("inner box-selection", () => {
  beforeEach(async () => {
    await render(<Excalidraw />);
  });
  it("selecting elements visually nested inside another", async () => {
    const rect1 = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      backgroundColor: "red",
      fillStyle: "solid",
    });
    const rect2 = API.createElement({
      type: "rectangle",
      x: 50,
      y: 50,
      width: 50,
      height: 50,
    });
    const rect3 = API.createElement({
      type: "rectangle",
      x: 150,
      y: 150,
      width: 50,
      height: 50,
    });
    API.setElements([rect1, rect2, rect3]);
    Keyboard.withModifierKeys({ ctrl: true }, () => {
      mouse.downAt(40, 40);
      mouse.moveTo(290, 290);
      mouse.up();

      assertSelectedElements([rect2.id, rect3.id]);
    });
  });

  it("selecting grouped elements visually nested inside another", async () => {
    const rect1 = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      backgroundColor: "red",
      fillStyle: "solid",
    });
    const rect2 = API.createElement({
      type: "rectangle",
      x: 50,
      y: 50,
      width: 50,
      height: 50,
      groupIds: ["A"],
    });
    const rect3 = API.createElement({
      type: "rectangle",
      x: 150,
      y: 150,
      width: 50,
      height: 50,
      groupIds: ["A"],
    });
    API.setElements([rect1, rect2, rect3]);

    Keyboard.withModifierKeys({ ctrl: true }, () => {
      mouse.downAt(40, 40);
      mouse.moveTo(rect2.x + rect2.width + 10, rect2.y + rect2.height + 10);
      mouse.up();

      assertSelectedElements([rect2.id, rect3.id]);
      expect(h.state.selectedGroupIds).toEqual({ A: true });
    });
  });

  it("selecting & deselecting grouped elements visually nested inside another", async () => {
    const rect1 = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      backgroundColor: "red",
      fillStyle: "solid",
    });
    const rect2 = API.createElement({
      type: "rectangle",
      x: 50,
      y: 50,
      width: 50,
      height: 50,
      groupIds: ["A"],
    });
    const rect3 = API.createElement({
      type: "rectangle",
      x: 150,
      y: 150,
      width: 50,
      height: 50,
      groupIds: ["A"],
    });
    API.setElements([rect1, rect2, rect3]);
    Keyboard.withModifierKeys({ ctrl: true }, () => {
      mouse.downAt(rect2.x - 20, rect2.y - 20);
      mouse.moveTo(rect2.x + rect2.width + 10, rect2.y + rect2.height + 10);
      assertSelectedElements([rect2.id, rect3.id]);
      expect(h.state.selectedGroupIds).toEqual({ A: true });
      mouse.moveTo(rect2.x - 10, rect2.y - 10);
      assertSelectedElements([rect1.id]);
      expect(h.state.selectedGroupIds).toEqual({});
      mouse.up();
    });
  });
});

describe("selection element", () => {
  it("create selection element on pointer down", async () => {
    const { getByToolName, container } = await render(<Excalidraw />);
    // select tool
    const tool = getByToolName("selection");
    fireEvent.click(tool);

    const canvas = container.querySelector("canvas.interactive")!;
    fireEvent.pointerDown(canvas, { clientX: 60, clientY: 100 });

    expect(renderInteractiveScene).toHaveBeenCalledTimes(3);
    expect(renderStaticScene).toHaveBeenCalledTimes(3);
    const selectionElement = h.state.selectionElement!;
    expect(selectionElement).not.toBeNull();
    expect(selectionElement.type).toEqual("selection");
    expect([selectionElement.x, selectionElement.y]).toEqual([60, 100]);
    expect([selectionElement.width, selectionElement.height]).toEqual([0, 0]);

    // TODO: There is a memory leak if pointer up is not triggered
    fireEvent.pointerUp(canvas);
  });

  it("resize selection element on pointer move", async () => {
    const { getByToolName, container } = await render(<Excalidraw />);
    // select tool
    const tool = getByToolName("selection");
    fireEvent.click(tool);

    const canvas = container.querySelector("canvas.interactive")!;
    fireEvent.pointerDown(canvas, { clientX: 60, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 30 });

    expect(renderInteractiveScene).toHaveBeenCalledTimes(4);
    expect(renderStaticScene).toHaveBeenCalledTimes(3);
    const selectionElement = h.state.selectionElement!;
    expect(selectionElement).not.toBeNull();
    expect(selectionElement.type).toEqual("selection");
    expect([selectionElement.x, selectionElement.y]).toEqual([60, 30]);
    expect([selectionElement.width, selectionElement.height]).toEqual([90, 70]);

    // TODO: There is a memory leak if pointer up is not triggered
    fireEvent.pointerUp(canvas);
  });

  it("remove selection element on pointer up", async () => {
    const { getByToolName, container } = await render(<Excalidraw />);
    // select tool
    const tool = getByToolName("selection");
    fireEvent.click(tool);

    const canvas = container.querySelector("canvas.interactive")!;
    fireEvent.pointerDown(canvas, { clientX: 60, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 30 });
    fireEvent.pointerUp(canvas);

    expect(renderInteractiveScene).toHaveBeenCalledTimes(5);
    expect(renderStaticScene).toHaveBeenCalledTimes(3);
    expect(h.state.selectionElement).toBeNull();
  });
});

describe("select single element on the scene", () => {
  beforeAll(() => {
    mockBoundingClientRect();
  });

  afterAll(() => {
    restoreOriginalGetBoundingClientRect();
  });

  it("rectangle", async () => {
    const { getByToolName, container } = await render(
      <Excalidraw handleKeyboardGlobally={true} />,
    );
    const canvas = container.querySelector("canvas.interactive")!;
    {
      // create element
      const tool = getByToolName("rectangle");
      fireEvent.click(tool);
      fireEvent.pointerDown(canvas, { clientX: 30, clientY: 20 });
      fireEvent.pointerMove(canvas, { clientX: 60, clientY: 70 });
      fireEvent.pointerUp(canvas);
      fireEvent.keyDown(document, {
        key: KEYS.ESCAPE,
      });
    }

    const tool = getByToolName("selection");
    fireEvent.click(tool);
    // click on a line on the rectangle
    fireEvent.pointerDown(canvas, { clientX: 45, clientY: 20 });
    fireEvent.pointerUp(canvas);

    expect(renderInteractiveScene).toHaveBeenCalledTimes(8);
    expect(renderStaticScene).toHaveBeenCalledTimes(6);
    expect(h.state.selectionElement).toBeNull();
    expect(h.elements.length).toEqual(1);
    expect(h.state.selectedElementIds[h.elements[0].id]).toBeTruthy();

    h.elements.forEach((element) => expect(element).toMatchSnapshot());
  });

  it("diamond", async () => {
    const { getByToolName, container } = await render(
      <Excalidraw handleKeyboardGlobally={true} />,
    );
    const canvas = container.querySelector("canvas.interactive")!;
    {
      // create element
      const tool = getByToolName("diamond");
      fireEvent.click(tool);
      fireEvent.pointerDown(canvas, { clientX: 30, clientY: 20 });
      fireEvent.pointerMove(canvas, { clientX: 60, clientY: 70 });
      fireEvent.pointerUp(canvas);
      fireEvent.keyDown(document, {
        key: KEYS.ESCAPE,
      });
    }

    const tool = getByToolName("selection");
    fireEvent.click(tool);
    // click on a line on the rectangle
    fireEvent.pointerDown(canvas, { clientX: 45, clientY: 20 });
    fireEvent.pointerUp(canvas);

    expect(renderInteractiveScene).toHaveBeenCalledTimes(8);
    expect(renderStaticScene).toHaveBeenCalledTimes(6);
    expect(h.state.selectionElement).toBeNull();
    expect(h.elements.length).toEqual(1);
    expect(h.state.selectedElementIds[h.elements[0].id]).toBeTruthy();

    h.elements.forEach((element) => expect(element).toMatchSnapshot());
  });

  it("ellipse", async () => {
    const { getByToolName, container } = await render(
      <Excalidraw handleKeyboardGlobally={true} />,
    );
    const canvas = container.querySelector("canvas.interactive")!;
    {
      // create element
      const tool = getByToolName("ellipse");
      fireEvent.click(tool);
      fireEvent.pointerDown(canvas, { clientX: 30, clientY: 20 });
      fireEvent.pointerMove(canvas, { clientX: 60, clientY: 70 });
      fireEvent.pointerUp(canvas);
      fireEvent.keyDown(document, {
        key: KEYS.ESCAPE,
      });
    }

    const tool = getByToolName("selection");
    fireEvent.click(tool);
    // click on a line on the rectangle
    fireEvent.pointerDown(canvas, { clientX: 45, clientY: 20 });
    fireEvent.pointerUp(canvas);

    expect(renderInteractiveScene).toHaveBeenCalledTimes(8);
    expect(renderStaticScene).toHaveBeenCalledTimes(6);
    expect(h.state.selectionElement).toBeNull();
    expect(h.elements.length).toEqual(1);
    expect(h.state.selectedElementIds[h.elements[0].id]).toBeTruthy();

    h.elements.forEach((element) => expect(element).toMatchSnapshot());
  });

  it("arrow", async () => {
    const { getByToolName, container } = await render(
      <Excalidraw handleKeyboardGlobally={true} />,
    );
    const canvas = container.querySelector("canvas.interactive")!;
    {
      // create element
      const tool = getByToolName("arrow");
      fireEvent.click(tool);
      fireEvent.pointerDown(canvas, { clientX: 30, clientY: 20 });
      fireEvent.pointerMove(canvas, { clientX: 60, clientY: 70 });
      fireEvent.pointerUp(canvas);
      fireEvent.keyDown(document, {
        key: KEYS.ESCAPE,
      });
    }

    /*
        1 2 3 4 5 6 7 8 9
      1
      2     x
      3
      4       .
      5
      6
      7           x
      8
      9
    */

    const tool = getByToolName("selection");
    fireEvent.click(tool);
    // click on a line on the arrow
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 40 });
    fireEvent.pointerUp(canvas);

    expect(renderInteractiveScene).toHaveBeenCalledTimes(8);
    expect(renderStaticScene).toHaveBeenCalledTimes(6);
    expect(h.state.selectionElement).toBeNull();
    expect(h.elements.length).toEqual(1);
    expect(h.state.selectedElementIds[h.elements[0].id]).toBeTruthy();
    h.elements.forEach((element) => expect(element).toMatchSnapshot());
  });

  it("arrow escape", async () => {
    const { getByToolName, container } = await render(
      <Excalidraw handleKeyboardGlobally={true} />,
    );
    const canvas = container.querySelector("canvas.interactive")!;
    {
      // create element
      const tool = getByToolName("line");
      fireEvent.click(tool);
      fireEvent.pointerDown(canvas, { clientX: 30, clientY: 20 });
      fireEvent.pointerMove(canvas, { clientX: 60, clientY: 70 });
      fireEvent.pointerUp(canvas);
      fireEvent.keyDown(document, {
        key: KEYS.ESCAPE,
      });
    }

    /*
        1 2 3 4 5 6 7 8 9
      1
      2     x
      3
      4       .
      5
      6
      7           x
      8
      9
    */

    const tool = getByToolName("selection");
    fireEvent.click(tool);
    // click on a line on the arrow
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 40 });
    fireEvent.pointerUp(canvas);

    expect(renderInteractiveScene).toHaveBeenCalledTimes(8);
    expect(renderStaticScene).toHaveBeenCalledTimes(6);
    expect(h.state.selectionElement).toBeNull();
    expect(h.elements.length).toEqual(1);
    expect(h.state.selectedElementIds[h.elements[0].id]).toBeTruthy();

    h.elements.forEach((element) => expect(element).toMatchSnapshot());
  });
});

describe("tool locking & selection", () => {
  it("should not select newly created element while tool is locked", async () => {
    await render(<Excalidraw />);

    UI.clickTool("lock");
    expect(h.state.activeTool.locked).toBe(true);

    for (const { value } of Object.values(SHAPES)) {
      if (value !== "image" && value !== "selection" && value !== "eraser") {
        const element = UI.createElement(value);
        expect(h.state.selectedElementIds[element.id]).not.toBe(true);
      }
    }
  });
});

describe("selectedElementIds stability", () => {
  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("box-selection should be stable when not changing selection", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });

    API.setElements([rectangle]);

    const selectedElementIds_1 = h.state.selectedElementIds;

    mouse.downAt(-100, -100);
    mouse.moveTo(-50, -50);
    mouse.up();

    expect(h.state.selectedElementIds).toBe(selectedElementIds_1);

    mouse.downAt(-50, -50);
    mouse.moveTo(50, 50);

    const selectedElementIds_2 = h.state.selectedElementIds;

    expect(selectedElementIds_2).toEqual({ [rectangle.id]: true });

    mouse.moveTo(60, 60);

    // box-selecting further without changing selection should keep
    // selectedElementIds stable (the same object)
    expect(h.state.selectedElementIds).toBe(selectedElementIds_2);

    mouse.up();

    expect(h.state.selectedElementIds).toBe(selectedElementIds_2);
  });
});

describe("edit-group selection", () => {
  let rect1: ExcalidrawElement;
  let rect2: ExcalidrawElement;
  let rect3: ExcalidrawElement;

  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally={true} />);

    rect1 = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      groupIds: ["A"],
    });
    rect2 = API.createElement({
      type: "rectangle",
      x: 50,
      y: 50,
      width: 20,
      height: 20,
      groupIds: ["A"],
    });
    rect3 = API.createElement({
      type: "rectangle",
      x: 100,
      y: 100,
      width: 20,
      height: 20,
    });
    API.setElements([rect1, rect2, rect3]);
  });

  it("edits group on Enter", () => {
    mouse.select(rect1);
    assertSelectedElements([rect1.id, rect2.id]);
    expect(h.state.selectedGroupIds).toEqual({ A: true });

    Keyboard.keyDown(KEYS.ENTER);
    expect(h.state.editingGroupId).toBe("A");
    assertSelectedElements([rect1.id, rect2.id]);
  });

  it("doesn't edit group if selected elements aren't part of the same group", () => {
    mouse.downAt(130, 130);
    mouse.moveTo(40, 40);
    mouse.up();
    assertSelectedElements([rect1.id, rect2.id, rect3.id]);

    Keyboard.keyDown(KEYS.ENTER);
    expect(h.state.editingGroupId).toBe(null);
  });
});

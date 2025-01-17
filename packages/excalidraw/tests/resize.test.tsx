import React from "react";
import ReactDOM from "react-dom";
import { render } from "./test-utils";
import { reseed } from "../random";
import { UI, Keyboard, Pointer } from "./helpers/ui";
import type {
  ExcalidrawElbowArrowElement,
  ExcalidrawFreeDrawElement,
  ExcalidrawLinearElement,
} from "../element/types";
import type { Bounds } from "../element/bounds";
import { getElementPointsCoords } from "../element/bounds";
import { Excalidraw } from "../index";
import { API } from "./helpers/api";
import { KEYS } from "../keys";
import { isLinearElement } from "../element/typeChecks";
import { LinearElementEditor } from "../element/linearElementEditor";
import { arrayToMap } from "../utils";
import type { LocalPoint } from "../../math";
import { pointFrom } from "../../math";
import { resizeSingleElement } from "../element/resizeElements";
import { getSizeFromPoints } from "../points";

ReactDOM.unmountComponentAtNode(document.getElementById("root")!);

const { h } = window;
const mouse = new Pointer("mouse");

const getBoundsFromPoints = (
  element: ExcalidrawLinearElement | ExcalidrawFreeDrawElement,
): Bounds => {
  if (isLinearElement(element)) {
    return getElementPointsCoords(element, element.points);
  }

  const { x, y, points } = element;
  const pointsX = points.map(([x]) => x);
  const pointsY = points.map(([, y]) => y);

  return [
    Math.min(...pointsX) + x,
    Math.min(...pointsY) + y,
    Math.max(...pointsX) + x,
    Math.max(...pointsY) + y,
  ];
};

beforeEach(async () => {
  localStorage.clear();
  reseed(7);
  mouse.reset();

  await render(<Excalidraw handleKeyboardGlobally={true} />);
  h.state.width = 1000;
  h.state.height = 1000;

  // The bounds of hand-drawn linear elements may change after flipping, so
  // removing this style for testing
  UI.clickTool("arrow");
  UI.clickByTitle("Architect");
  UI.clickTool("selection");
});

describe("generic element", () => {
  // = rectangle/diamond/ellipse

  describe("resizes", () => {
    it.each`
      handle  | move          | size          | xy
      ${"n"}  | ${[10, -27]}  | ${[200, 127]} | ${[0, -27]}
      ${"e"}  | ${[67, -45]}  | ${[267, 100]} | ${[0, 0]}
      ${"s"}  | ${[-50, -39]} | ${[200, 61]}  | ${[0, 0]}
      ${"w"}  | ${[20, 90]}   | ${[180, 100]} | ${[20, 0]}
      ${"ne"} | ${[5, -33]}   | ${[205, 133]} | ${[0, -33]}
      ${"se"} | ${[-30, -81]} | ${[170, 19]}  | ${[0, 0]}
      ${"sw"} | ${[37, 25]}   | ${[163, 125]} | ${[37, 0]}
      ${"nw"} | ${[-34, 42]}  | ${[234, 58]}  | ${[-34, 42]}
    `(
      "with handle $handle",
      async ({ handle, move, size: [width, height], xy: [x, y] }) => {
        const rectangle = UI.createElement("rectangle", {
          width: 200,
          height: 100,
        });
        UI.resize(rectangle, handle, move);

        expect(rectangle.x).toBeCloseTo(x);
        expect(rectangle.y).toBeCloseTo(y);
        expect(rectangle.width).toBeCloseTo(width);
        expect(rectangle.height).toBeCloseTo(height);
        expect(rectangle.angle).toBeCloseTo(0);
      },
    );
  });

  describe("flips while resizing", () => {
    it.each`
      handle  | move           | size          | xy
      ${"n"}  | ${[15, 139]}   | ${[200, 39]}  | ${[0, 100]}
      ${"e"}  | ${[-245, 67]}  | ${[45, 100]}  | ${[-45, 0]}
      ${"s"}  | ${[-26, -210]} | ${[200, 110]} | ${[0, -110]}
      ${"w"}  | ${[241, 0]}    | ${[41, 100]}  | ${[200, 0]}
      ${"ne"} | ${[-250, 125]} | ${[50, 25]}   | ${[-50, 100]}
      ${"se"} | ${[-283, -58]} | ${[83, 42]}   | ${[-83, 0]}
      ${"sw"} | ${[40, -123]}  | ${[160, 23]}  | ${[40, -23]}
      ${"nw"} | ${[270, 133]}  | ${[70, 33]}   | ${[200, 100]}
    `(
      "with handle $handle",
      async ({ handle, move, size: [width, height], xy: [x, y] }) => {
        const rectangle = UI.createElement("rectangle", {
          width: 200,
          height: 100,
        });
        UI.resize(rectangle, handle, move);

        expect(rectangle.x).toBeCloseTo(x);
        expect(rectangle.y).toBeCloseTo(y);
        expect(rectangle.width).toBeCloseTo(width);
        expect(rectangle.height).toBeCloseTo(height);
        expect(rectangle.angle).toBeCloseTo(0);
      },
    );
  });

  it("resizes with locked aspect ratio", async () => {
    const rectangle = UI.createElement("rectangle", {
      width: 200,
      height: 100,
    });
    UI.resize(rectangle, "se", [100, 10], { shift: true });

    expect(rectangle.x).toBeCloseTo(0);
    expect(rectangle.y).toBeCloseTo(0);
    expect(rectangle.width).toBeCloseTo(300);
    expect(rectangle.height).toBeCloseTo(150);
    expect(rectangle.angle).toBeCloseTo(0);

    UI.resize(rectangle, "n", [30, 50], { shift: true });

    expect(rectangle.x).toBeCloseTo(50);
    expect(rectangle.y).toBeCloseTo(50);
    expect(rectangle.width).toBeCloseTo(200);
    expect(rectangle.height).toBeCloseTo(100);
    expect(rectangle.angle).toBeCloseTo(0);
  });

  it("resizes from center", async () => {
    const rectangle = UI.createElement("rectangle", {
      width: 200,
      height: 100,
    });
    UI.resize(rectangle, "nw", [20, 10], { alt: true });

    expect(rectangle.x).toBeCloseTo(20);
    expect(rectangle.y).toBeCloseTo(10);
    expect(rectangle.width).toBeCloseTo(160);
    expect(rectangle.height).toBeCloseTo(80);
    expect(rectangle.angle).toBeCloseTo(0);

    UI.resize(rectangle, "e", [15, 43], { alt: true });

    expect(rectangle.x).toBeCloseTo(5);
    expect(rectangle.y).toBeCloseTo(10);
    expect(rectangle.width).toBeCloseTo(190);
    expect(rectangle.height).toBeCloseTo(80);
    expect(rectangle.angle).toBeCloseTo(0);
  });

  it("resizes with bound arrow", async () => {
    const rectangle = UI.createElement("rectangle", {
      width: 200,
      height: 100,
    });
    const arrow = UI.createElement("arrow", {
      x: -30,
      y: 50,
      width: 28,
      height: 5,
    });

    expect(arrow.endBinding?.elementId).toEqual(rectangle.id);

    UI.resize(rectangle, "e", [40, 0]);

    expect(arrow.width + arrow.endBinding!.gap).toBeCloseTo(30);

    UI.resize(rectangle, "w", [50, 0]);

    expect(arrow.endBinding?.elementId).toEqual(rectangle.id);
    expect(arrow.width + arrow.endBinding!.gap).toBeCloseTo(80);
  });

  it("resizes with a label", async () => {
    const rectangle = UI.createElement("rectangle", {
      width: 200,
      height: 100,
    });
    const label = await UI.editText(rectangle, "Hello world");
    UI.resize(rectangle, "se", [50, 50]);

    expect(label.x + label.width / 2).toBeCloseTo(
      rectangle.x + rectangle.width / 2,
    );
    expect(label.y + label.height / 2).toBeCloseTo(
      rectangle.y + rectangle.height / 2,
    );
    expect(label.angle).toBeCloseTo(rectangle.angle);
    expect(label.fontSize).toEqual(20);

    UI.resize(rectangle, "w", [190, 0]);

    expect(label.x + label.width / 2).toBeCloseTo(
      rectangle.x + rectangle.width / 2,
    );
    expect(label.y + label.height / 2).toBeCloseTo(
      rectangle.y + rectangle.height / 2,
    );
    expect(label.angle).toBeCloseTo(rectangle.angle);
    expect(label.fontSize).toEqual(20);
  });
});

describe.each(["line", "freedraw"] as const)("%s element", (type) => {
  const points: Record<typeof type, LocalPoint[]> = {
    line: [
      pointFrom(0, 0),
      pointFrom(60, -20),
      pointFrom(20, 40),
      pointFrom(-40, 0),
    ],
    freedraw: [
      pointFrom(0, 0),
      pointFrom(-2.474600807561444, 41.021700699972),
      pointFrom(3.6627956000014024, 47.84174560617245),
      pointFrom(40.495224145598115, 47.15909710753482),
    ],
  };

  it("resizes", async () => {
    const element = UI.createElement("freedraw", { points: points.freedraw });
    const bounds = getBoundsFromPoints(element);

    UI.resize(element, "ne", [30, -60]);
    const newBounds = getBoundsFromPoints(element);

    expect(newBounds[0]).toBeCloseTo(bounds[0]);
    expect(newBounds[1]).toBeCloseTo(bounds[1] - 60);
    expect(newBounds[2]).toBeCloseTo(bounds[2] + 30);
    expect(newBounds[3]).toBeCloseTo(bounds[3]);
    expect(element.angle).toBeCloseTo(0);
  });

  it("flips while resizing", async () => {
    const element = UI.createElement("freedraw", { points: points.freedraw });
    const bounds = getBoundsFromPoints(element);

    UI.resize(element, "sw", [140, -80]);
    const newBounds = getBoundsFromPoints(element);

    expect(newBounds[0]).toBeCloseTo(bounds[2]);
    expect(newBounds[1]).toBeCloseTo(bounds[3] - 80);
    expect(newBounds[2]).toBeCloseTo(bounds[0] + 140);
    expect(newBounds[3]).toBeCloseTo(bounds[1]);
    expect(element.angle).toBeCloseTo(0);
  });

  it("resizes with locked aspect ratio", async () => {
    const element = UI.createElement("freedraw", { points: points.freedraw });
    const bounds = getBoundsFromPoints(element);

    UI.resize(element, "ne", [30, -60], { shift: true });
    const newBounds = getBoundsFromPoints(element);
    const scale = 1 + 60 / (bounds[3] - bounds[1]);

    expect(newBounds[0]).toBeCloseTo(bounds[0]);
    expect(newBounds[1]).toBeCloseTo(bounds[1] - 60);
    expect(newBounds[2]).toBeCloseTo(
      bounds[0] + (bounds[2] - bounds[0]) * scale,
    );
    expect(newBounds[3]).toBeCloseTo(bounds[3]);
    expect(element.angle).toBeCloseTo(0);
  });

  it("resizes from center", async () => {
    const element = UI.createElement("freedraw", { points: points.freedraw });
    const bounds = getBoundsFromPoints(element);

    UI.resize(element, "nw", [-20, -30], { alt: true });
    const newBounds = getBoundsFromPoints(element);

    expect(newBounds[0]).toBeCloseTo(bounds[0] - 20);
    expect(newBounds[1]).toBeCloseTo(bounds[1] - 30);
    expect(newBounds[2]).toBeCloseTo(bounds[2] + 20);
    expect(newBounds[3]).toBeCloseTo(bounds[3] + 30);
    expect(element.angle).toBeCloseTo(0);
  });
});

describe("line element", () => {
  const points: LocalPoint[] = [
    pointFrom(0, 0),
    pointFrom(60, -20),
    pointFrom(20, 40),
    pointFrom(-40, 0),
  ];

  it("resizes", async () => {
    UI.createElement("line", { points });

    const element = h.elements[0] as ExcalidrawLinearElement;

    const {
      x: prevX,
      y: prevY,
      width: prevWidth,
      height: prevHeight,
    } = element;

    const nextWidth = prevWidth + 30;
    const nextHeight = prevHeight + 30;

    resizeSingleElement(
      nextWidth,
      nextHeight,
      element,
      element,
      h.app.scene.getNonDeletedElementsMap(),
      h.app.scene.getNonDeletedElementsMap(),
      "ne",
    );

    expect(element.x).not.toBe(prevX);
    expect(element.y).not.toBe(prevY);

    expect(element.width).toBe(nextWidth);
    expect(element.height).toBe(nextHeight);

    expect(element.points[0]).toEqual([0, 0]);

    const { width, height } = getSizeFromPoints(element.points);
    expect(width).toBe(element.width);
    expect(height).toBe(element.height);
  });

  it("flips while resizing", async () => {
    UI.createElement("line", { points });
    const element = h.elements[0] as ExcalidrawLinearElement;

    const {
      width: prevWidth,
      height: prevHeight,
      points: prevPoints,
    } = element;

    const nextWidth = prevWidth * -1;
    const nextHeight = prevHeight * -1;

    resizeSingleElement(
      nextWidth,
      nextHeight,
      element,
      element,
      h.app.scene.getNonDeletedElementsMap(),
      h.app.scene.getNonDeletedElementsMap(),
      "se",
    );

    expect(element.width).toBe(prevWidth);
    expect(element.height).toBe(prevHeight);

    element.points.forEach((point, idx) => {
      expect(point[0]).toBeCloseTo(prevPoints[idx][0] * -1);
      expect(point[1]).toBeCloseTo(prevPoints[idx][1] * -1);
    });
  });

  it("resizes with locked aspect ratio", async () => {
    UI.createElement("line", { points });
    const element = h.elements[0] as ExcalidrawLinearElement;

    const { width: prevWidth, height: prevHeight } = element;

    UI.resize(element, "ne", [30, -60], { shift: true });

    const scaleHeight = element.width / prevWidth;
    const scaleWidth = element.height / prevHeight;

    expect(scaleHeight).toBeCloseTo(scaleWidth);
  });

  it("resizes from center", async () => {
    UI.createElement("line", {
      points: [
        pointFrom(0, 0),
        pointFrom(338.05644048727373, -180.4761618151104),
        pointFrom(338.05644048727373, 180.4761618151104),
        pointFrom(-338.05644048727373, 180.4761618151104),
        pointFrom(-338.05644048727373, -180.4761618151104),
      ],
    });
    const element = h.elements[0] as ExcalidrawLinearElement;

    const {
      x: prevX,
      y: prevY,
      width: prevWidth,
      height: prevHeight,
    } = element;

    const prevSmallestX = Math.min(...element.points.map((p) => p[0]));
    const prevBiggestX = Math.max(...element.points.map((p) => p[0]));

    resizeSingleElement(
      prevWidth + 20,
      prevHeight,
      element,
      element,
      h.app.scene.getNonDeletedElementsMap(),
      h.app.scene.getNonDeletedElementsMap(),
      "e",
      {
        shouldResizeFromCenter: true,
      },
    );

    expect(element.width).toBeCloseTo(prevWidth + 20);
    expect(element.height).toBeCloseTo(prevHeight);

    expect(element.x).toBeCloseTo(prevX);
    expect(element.y).toBeCloseTo(prevY);

    const smallestX = Math.min(...element.points.map((p) => p[0]));
    const biggestX = Math.max(...element.points.map((p) => p[0]));

    expect(prevSmallestX - smallestX).toBeCloseTo(10);
    expect(biggestX - prevBiggestX).toBeCloseTo(10);
  });
});

describe("arrow element", () => {
  it("resizes with a label", async () => {
    const arrow = UI.createElement("arrow", {
      points: [
        pointFrom(0, 0),
        pointFrom(40, 140),
        pointFrom(80, 60), // label's anchor
        pointFrom(180, 20),
        pointFrom(200, 120),
      ],
    });
    const label = await UI.editText(arrow, "Hello");
    const elementsMap = arrayToMap(h.elements);
    UI.resize(arrow, "se", [50, 30]);
    let labelPos = LinearElementEditor.getBoundTextElementPosition(
      arrow,
      label,
      elementsMap,
    );

    expect(labelPos.x + label.width / 2).toBeCloseTo(
      arrow.x + arrow.points[2][0],
    );
    expect(labelPos.y + label.height / 2).toBeCloseTo(
      arrow.y + arrow.points[2][1],
    );
    expect(label.angle).toBeCloseTo(0);
    expect(label.fontSize).toEqual(20);

    UI.resize(arrow, "w", [20, 0]);
    labelPos = LinearElementEditor.getBoundTextElementPosition(
      arrow,
      label,
      elementsMap,
    );

    expect(labelPos.x + label.width / 2).toBeCloseTo(
      arrow.x + arrow.points[2][0],
    );
    expect(labelPos.y + label.height / 2).toBeCloseTo(
      arrow.y + arrow.points[2][1],
    );
    expect(label.angle).toBeCloseTo(0);
    expect(label.fontSize).toEqual(20);
  });

  it("flips the fixed point binding on negative resize for single bindable", () => {
    const rectangle = UI.createElement("rectangle", {
      x: -100,
      y: -75,
      width: 95,
      height: 100,
    });
    UI.clickTool("arrow");
    UI.clickOnTestId("elbow-arrow");
    mouse.reset();
    mouse.moveTo(-5, 0);
    mouse.click();
    mouse.moveTo(120, 200);
    mouse.click();

    const arrow = h.scene.getSelectedElements(
      h.state,
    )[0] as ExcalidrawElbowArrowElement;

    expect(arrow.startBinding?.fixedPoint?.[0]).toBeCloseTo(1.05);
    expect(arrow.startBinding?.fixedPoint?.[1]).toBeCloseTo(0.75);

    UI.resize(rectangle, "se", [-200, -150]);

    expect(arrow.startBinding?.fixedPoint?.[0]).toBeCloseTo(1.05);
    expect(arrow.startBinding?.fixedPoint?.[1]).toBeCloseTo(0.75);
  });

  it("flips the fixed point binding on negative resize for group selection", () => {
    const rectangle = UI.createElement("rectangle", {
      x: -100,
      y: -75,
      width: 95,
      height: 100,
    });
    UI.clickTool("arrow");
    UI.clickOnTestId("elbow-arrow");
    mouse.reset();
    mouse.moveTo(-5, 0);
    mouse.click();
    mouse.moveTo(120, 200);
    mouse.click();

    const arrow = h.scene.getSelectedElements(
      h.state,
    )[0] as ExcalidrawElbowArrowElement;

    expect(arrow.startBinding?.fixedPoint?.[0]).toBeCloseTo(1.05);
    expect(arrow.startBinding?.fixedPoint?.[1]).toBeCloseTo(0.75);

    UI.resize([rectangle, arrow], "nw", [300, 350]);

    expect(arrow.startBinding?.fixedPoint?.[0]).toBeCloseTo(-0.144);
    expect(arrow.startBinding?.fixedPoint?.[1]).toBeCloseTo(0.25);
  });
});

describe("text element", () => {
  it("resizes", async () => {
    const text = UI.createElement("text");
    await UI.editText(text, "hello\nworld");
    const { width, height, fontSize } = text;
    const scale = 40 / height + 1;
    UI.resize(text, "se", [30, 40]);

    expect(text.x).toBeCloseTo(0);
    expect(text.y).toBeCloseTo(0);
    expect(text.width).toBeCloseTo(width * scale);
    expect(text.height).toBeCloseTo(height * scale);
    expect(text.angle).toBeCloseTo(0);
    expect(text.fontSize).toBeCloseTo(fontSize * scale);
  });

  // TODO enable this test after adding single text element flipping
  it.skip("flips while resizing", async () => {
    const text = UI.createElement("text");
    await UI.editText(text, "hello\nworld");
    const { width, height, fontSize } = text;
    const scale = 100 / width - 1;
    UI.resize(text, "nw", [100, 80]);

    expect(text.x).toBeCloseTo(width);
    expect(text.y).toBeCloseTo(height);
    expect(text.width).toBeCloseTo(width * scale);
    expect(text.height).toBeCloseTo(height * scale);
    expect(text.angle).toBeCloseTo(0);
    expect(text.fontSize).toBeCloseTo(fontSize * scale);
  });

  // TODO enable this test after fixing text resizing from center
  it.skip("resizes from center", async () => {
    const text = UI.createElement("text");
    await UI.editText(text, "hello\nworld");
    const { x, y, width, height, fontSize } = text;
    const scale = 80 / height + 1;
    UI.resize(text, "nw", [-25, -40], { alt: true });

    expect(text.x).toBeCloseTo(x - ((scale - 1) * width) / 2);
    expect(text.y).toBeCloseTo(y - 40);
    expect(text.width).toBeCloseTo(width * scale);
    expect(text.height).toBeCloseTo(height * scale);
    expect(text.angle).toBeCloseTo(0);
    expect(text.fontSize).toBeCloseTo(fontSize * scale);
  });

  it("resizes with bound arrow", async () => {
    const text = UI.createElement("text");
    await UI.editText(text, "hello\nworld");
    const boundArrow = UI.createElement("arrow", {
      x: -30,
      y: 25,
      width: 28,
      height: 5,
    });

    expect(boundArrow.endBinding?.elementId).toEqual(text.id);

    UI.resize(text, "ne", [40, 0]);

    expect(boundArrow.width + boundArrow.endBinding!.gap).toBeCloseTo(30);

    const textWidth = text.width;
    const scale = 20 / text.height;
    UI.resize(text, "nw", [50, 20]);

    expect(boundArrow.endBinding?.elementId).toEqual(text.id);
    expect(boundArrow.width + boundArrow.endBinding!.gap).toBeCloseTo(
      30 + textWidth * scale,
    );
  });

  it("updates font size via keyboard", async () => {
    const text = UI.createElement("text");
    await UI.editText(text, "abc");
    const { fontSize } = text;
    mouse.select(text);

    Keyboard.withModifierKeys({ shift: true, ctrl: true }, () => {
      Keyboard.keyDown(KEYS.CHEVRON_RIGHT);
      expect(text.fontSize).toBe(fontSize * 1.1);

      Keyboard.keyDown(KEYS.CHEVRON_LEFT);
      expect(text.fontSize).toBe(fontSize);
    });
  });

  // text can be resized from sides
  it("can be resized from e", async () => {
    const text = UI.createElement("text");
    await UI.editText(text, "Excalidraw\nEditor");

    const width = text.width;
    const height = text.height;

    UI.resize(text, "e", [30, 0]);
    expect(text.width).toBe(width + 30);
    expect(text.height).toBe(height);

    UI.resize(text, "e", [-30, 0]);
    expect(text.width).toBe(width);
    expect(text.height).toBe(height);
  });

  it("can be resized from w", async () => {
    const text = UI.createElement("text");
    await UI.editText(text, "Excalidraw\nEditor");

    const width = text.width;
    const height = text.height;

    UI.resize(text, "w", [-50, 0]);
    expect(text.width).toBe(width + 50);
    expect(text.height).toBe(height);

    UI.resize(text, "w", [50, 0]);
    expect(text.width).toBe(width);
    expect(text.height).toBe(height);
  });

  it("wraps when width is narrower than texts inside", async () => {
    const text = UI.createElement("text");
    await UI.editText(text, "Excalidraw\nEditor");

    const prevWidth = text.width;
    const prevHeight = text.height;
    const prevText = text.text;

    UI.resize(text, "w", [50, 0]);
    expect(text.width).toBe(prevWidth - 50);
    expect(text.height).toBeGreaterThan(prevHeight);
    expect(text.text).not.toEqual(prevText);
    expect(text.autoResize).toBe(false);

    UI.resize(text, "w", [-50, 0]);
    expect(text.width).toBe(prevWidth);
    expect(text.height).toEqual(prevHeight);
    expect(text.text).toEqual(prevText);
    expect(text.autoResize).toBe(false);

    UI.resize(text, "e", [-20, 0]);
    expect(text.width).toBe(prevWidth - 20);
    expect(text.height).toBeGreaterThan(prevHeight);
    expect(text.text).not.toEqual(prevText);
    expect(text.autoResize).toBe(false);

    UI.resize(text, "e", [20, 0]);
    expect(text.width).toBe(prevWidth);
    expect(text.height).toEqual(prevHeight);
    expect(text.text).toEqual(prevText);
    expect(text.autoResize).toBe(false);
  });

  it("keeps properties when wrapped", async () => {
    const text = UI.createElement("text");
    await UI.editText(text, "Excalidraw\nEditor");

    const alignment = text.textAlign;
    const fontSize = text.fontSize;
    const fontFamily = text.fontFamily;

    UI.resize(text, "e", [-60, 0]);
    expect(text.textAlign).toBe(alignment);
    expect(text.fontSize).toBe(fontSize);
    expect(text.fontFamily).toBe(fontFamily);
    expect(text.autoResize).toBe(false);

    UI.resize(text, "e", [60, 0]);
    expect(text.textAlign).toBe(alignment);
    expect(text.fontSize).toBe(fontSize);
    expect(text.fontFamily).toBe(fontFamily);
    expect(text.autoResize).toBe(false);
  });

  it("has a minimum width when wrapped", async () => {
    const text = UI.createElement("text");
    await UI.editText(text, "Excalidraw\nEditor");

    const width = text.width;

    UI.resize(text, "e", [-width, 0]);
    expect(text.width).not.toEqual(0);
    UI.resize(text, "e", [width - text.width, 0]);
    expect(text.width).toEqual(width);
    expect(text.autoResize).toBe(false);

    UI.resize(text, "w", [width, 0]);
    expect(text.width).not.toEqual(0);
    UI.resize(text, "w", [text.width - width, 0]);
    expect(text.width).toEqual(width);
    expect(text.autoResize).toBe(false);
  });
});

describe("image element", () => {
  it("resizes", async () => {
    const image = API.createElement({ type: "image", width: 100, height: 100 });
    API.setElements([image]);
    UI.resize(image, "ne", [-20, -30]);

    expect(image.x).toBeCloseTo(0);
    expect(image.y).toBeCloseTo(-30);
    expect(image.width).toBeCloseTo(130);
    expect(image.height).toBeCloseTo(130);
    expect(image.angle).toBeCloseTo(0);
    expect(image.scale).toEqual([1, 1]);
  });

  it("flips while resizing", async () => {
    const image = API.createElement({ type: "image", width: 100, height: 100 });
    API.setElements([image]);
    UI.resize(image, "sw", [150, -150]);

    expect(image.x).toBeCloseTo(100);
    expect(image.y).toBeCloseTo(-50);
    expect(image.width).toBeCloseTo(50);
    expect(image.height).toBeCloseTo(50);
    expect(image.angle).toBeCloseTo(0);
    expect(image.scale).toEqual([-1, -1]);
  });

  it("resizes with locked/unlocked aspect ratio", async () => {
    const image = API.createElement({ type: "image", width: 100, height: 100 });
    API.setElements([image]);
    UI.resize(image, "ne", [30, -20]);

    expect(image.x).toBeCloseTo(0);
    expect(image.y).toBeCloseTo(-30);
    expect(image.width).toBeCloseTo(130);
    expect(image.height).toBeCloseTo(130);

    UI.resize(image, "ne", [-30, 50], { shift: true });

    expect(image.x).toBeCloseTo(0);
    expect(image.y).toBeCloseTo(20);
    expect(image.width).toBeCloseTo(100);
    expect(image.height).toBeCloseTo(80);
  });

  it("resizes from center", async () => {
    const image = API.createElement({ type: "image", width: 100, height: 100 });
    API.setElements([image]);
    UI.resize(image, "nw", [25, 15], { alt: true });

    expect(image.x).toBeCloseTo(15);
    expect(image.y).toBeCloseTo(15);
    expect(image.width).toBeCloseTo(70);
    expect(image.height).toBeCloseTo(70);
    expect(image.angle).toBeCloseTo(0);
    expect(image.scale).toEqual([1, 1]);
  });

  it("resizes with bound arrow", async () => {
    const image = API.createElement({
      type: "image",
      width: 100,
      height: 100,
    });
    API.setElements([image]);
    const arrow = UI.createElement("arrow", {
      x: -30,
      y: 50,
      width: 28,
      height: 5,
    });

    expect(arrow.endBinding?.elementId).toEqual(image.id);

    UI.resize(image, "ne", [40, 0]);

    expect(arrow.width + arrow.endBinding!.gap).toBeCloseTo(30);

    const imageWidth = image.width;
    const scale = 20 / image.height;
    UI.resize(image, "nw", [50, 20]);

    expect(arrow.endBinding?.elementId).toEqual(image.id);
    expect(arrow.width + arrow.endBinding!.gap).toBeCloseTo(
      30 + imageWidth * scale,
    );
  });
});

describe("multiple selection", () => {
  it("resizes with generic elements", async () => {
    const rectangle = UI.createElement("rectangle", {
      position: 0,
      width: 100,
      height: 80,
    });
    const rectLabel = await UI.editText(rectangle, "hello\nworld");
    const diamond = UI.createElement("diamond", {
      x: 140,
      y: 40,
      size: 80,
    });
    const ellipse = UI.createElement("ellipse", {
      x: 40,
      y: 100,
      width: 80,
      height: 60,
    });

    const selectionWidth = 220;
    const selectionHeight = 160;
    const move = [50, 30] as [number, number];
    const scale = Math.max(
      1 + move[0] / selectionWidth,
      1 + move[1] / selectionHeight,
    );

    UI.resize([rectangle, diamond, ellipse], "se", move, {
      shift: true,
    });

    expect(rectangle.x).toBeCloseTo(0);
    expect(rectangle.y).toBeCloseTo(0);
    expect(rectangle.width).toBeCloseTo(100 * scale);
    expect(rectangle.height).toBeCloseTo(80 * scale);
    expect(rectangle.angle).toEqual(0);

    expect(rectLabel.type).toEqual("text");
    expect(rectLabel.containerId).toEqual(rectangle.id);
    expect(rectLabel.x + rectLabel.width / 2).toBeCloseTo(
      rectangle.x + rectangle.width / 2,
    );
    expect(rectLabel.y + rectLabel.height / 2).toBeCloseTo(
      rectangle.y + rectangle.height / 2,
    );
    expect(rectLabel.angle).toEqual(0);
    expect(rectLabel.fontSize).toBeCloseTo(20 * scale, -1);

    expect(diamond.x).toBeCloseTo(140 * scale);
    expect(diamond.y).toBeCloseTo(40 * scale);
    expect(diamond.width).toBeCloseTo(80 * scale);
    expect(diamond.height).toBeCloseTo(80 * scale);
    expect(diamond.angle).toEqual(0);

    expect(ellipse.x).toBeCloseTo(40 * scale);
    expect(ellipse.y).toBeCloseTo(100 * scale);
    expect(ellipse.width).toBeCloseTo(80 * scale);
    expect(ellipse.height).toBeCloseTo(60 * scale);
    expect(ellipse.angle).toEqual(0);
  });

  it("resizes with linear elements > 2 points", async () => {
    UI.clickTool("line");
    UI.clickByTitle("Sharp");

    const line = UI.createElement("line", {
      x: 60,
      y: 40,
      points: [
        pointFrom(0, 0),
        pointFrom(-40, 40),
        pointFrom(-60, 0),
        pointFrom(0, -40),
        pointFrom(40, 20),
        pointFrom(0, 40),
      ],
    });
    const freedraw = UI.createElement("freedraw", {
      x: 63.56072661326618,
      y: 100,
      points: [
        pointFrom(0, 0),
        pointFrom(-43.56072661326618, 18.15048126846341),
        pointFrom(-43.56072661326618, 29.041198460587566),
        pointFrom(-38.115368017204105, 42.652452795512204),
        pointFrom(-19.964886748740696, 66.24829266003775),
        pointFrom(19.056612930986716, 77.1390098521619),
      ],
    });

    const selectionWidth = 100;
    const selectionHeight = 177.1390098521619;
    const move = [-25, -25] as [number, number];
    const scale = Math.max(
      1 + move[0] / selectionWidth,
      1 + move[1] / selectionHeight,
    );

    UI.resize([line, freedraw], "se", move, {
      shift: true,
    });

    expect(line.x).toBeCloseTo(60 * scale);
    expect(line.y).toBeCloseTo(40 * scale);
    expect(line.width).toBeCloseTo(100 * scale);
    expect(line.height).toBeCloseTo(80 * scale);
    expect(line.angle).toEqual(0);

    expect(freedraw.x).toBeCloseTo(63.56072661326618 * scale);
    expect(freedraw.y).toBeCloseTo(100 * scale);
    expect(freedraw.width).toBeCloseTo(62.6173395442529 * scale);
    expect(freedraw.height).toBeCloseTo(77.1390098521619 * scale);
    expect(freedraw.angle).toEqual(0);
  });

  it("resizes with 2-point lines", async () => {
    const horizLine = UI.createElement("line", {
      position: 0,
      width: 120,
      height: 0,
    });
    const vertLine = UI.createElement("line", {
      x: 0,
      y: 20,
      width: 0,
      height: 80,
    });
    const diagLine = UI.createElement("line", {
      position: 40,
      size: 60,
    });

    const selectionWidth = 120;
    const selectionHeight = 100;
    const move = [40, 40] as [number, number];
    const scale = Math.max(
      1 - move[0] / selectionWidth,
      1 - move[1] / selectionHeight,
    );

    UI.resize([horizLine, vertLine, diagLine], "nw", move, {
      shift: true,
    });

    expect(horizLine.x).toBeCloseTo(selectionWidth * (1 - scale));
    expect(horizLine.y).toBeCloseTo(selectionHeight * (1 - scale));
    expect(horizLine.width).toBeCloseTo(120 * scale);
    expect(horizLine.height).toBeCloseTo(0);
    expect(horizLine.angle).toEqual(0);

    expect(vertLine.x).toBeCloseTo(selectionWidth * (1 - scale));
    expect(vertLine.y).toBeCloseTo((selectionHeight - 20) * (1 - scale) + 20);
    expect(vertLine.width).toBeCloseTo(0);
    expect(vertLine.height).toBeCloseTo(80 * scale);
    expect(vertLine.angle).toEqual(0);

    expect(diagLine.x).toBeCloseTo((selectionWidth - 40) * (1 - scale) + 40);
    expect(diagLine.y).toBeCloseTo((selectionHeight - 40) * (1 - scale) + 40);
    expect(diagLine.width).toBeCloseTo(60 * scale);
    expect(diagLine.height).toBeCloseTo(60 * scale);
    expect(diagLine.angle).toEqual(0);
  });

  it("resizes with bound arrows", async () => {
    const rectangle = UI.createElement("rectangle", {
      position: 0,
      size: 100,
    });
    const leftBoundArrow = UI.createElement("arrow", {
      x: -110,
      y: 50,
      width: 100,
      height: 0,
    });

    const rightBoundArrow = UI.createElement("arrow", {
      x: 210,
      y: 50,
      width: -100,
      height: 0,
    });

    const selectionWidth = 210;
    const selectionHeight = 100;
    const move = [40, 40] as [number, number];
    const scale = Math.max(
      1 - move[0] / selectionWidth,
      1 - move[1] / selectionHeight,
    );
    const leftArrowBinding = { ...leftBoundArrow.endBinding };
    const rightArrowBinding = { ...rightBoundArrow.endBinding };
    delete rightArrowBinding.gap;

    UI.resize([rectangle, rightBoundArrow], "nw", move, {
      shift: true,
    });

    expect(leftBoundArrow.x).toBeCloseTo(-110);
    expect(leftBoundArrow.y).toBeCloseTo(50);
    expect(leftBoundArrow.width).toBeCloseTo(140, 0);
    expect(leftBoundArrow.height).toBeCloseTo(7, 0);
    expect(leftBoundArrow.angle).toEqual(0);
    expect(leftBoundArrow.startBinding).toBeNull();
    expect(leftBoundArrow.endBinding?.gap).toBeCloseTo(10);
    expect(leftBoundArrow.endBinding?.elementId).toBe(
      leftArrowBinding.elementId,
    );
    expect(leftBoundArrow.endBinding?.focus).toBe(leftArrowBinding.focus);

    expect(rightBoundArrow.x).toBeCloseTo(210);
    expect(rightBoundArrow.y).toBeCloseTo(
      (selectionHeight - 50) * (1 - scale) + 50,
    );
    expect(rightBoundArrow.width).toBeCloseTo(100 * scale);
    expect(rightBoundArrow.height).toBeCloseTo(0);
    expect(rightBoundArrow.angle).toEqual(0);
    expect(rightBoundArrow.startBinding).toBeNull();
    expect(rightBoundArrow.endBinding?.gap).toBeCloseTo(8.0952);
    expect(rightBoundArrow.endBinding?.elementId).toBe(
      rightArrowBinding.elementId,
    );
    expect(rightBoundArrow.endBinding?.focus).toBe(rightArrowBinding.focus);
  });

  it("resizes with labeled arrows", async () => {
    const topArrow = UI.createElement("arrow", {
      x: 0,
      y: 20,
      width: 220,
      height: 0,
    });
    const topArrowLabel = await UI.editText(topArrow.get(), "lorem ipsum");

    UI.clickTool("text");
    UI.clickByTitle("Large");
    const bottomArrow = UI.createElement("arrow", {
      x: 0,
      y: 80,
      width: 220,
      height: 0,
    });
    const bottomArrowLabel = await UI.editText(
      bottomArrow.get(),
      "dolor\nsit amet",
    );

    const selectionWidth = 220;
    const selectionTop = 20 - topArrowLabel.height / 2;
    const move = [80, 0] as [number, number];
    const scale = move[0] / selectionWidth + 1;
    const elementsMap = arrayToMap(h.elements);
    UI.resize([topArrow.get(), bottomArrow.get()], "se", move, {
      shift: true,
    });
    const topArrowLabelPos = LinearElementEditor.getBoundTextElementPosition(
      topArrow,
      topArrowLabel,
      elementsMap,
    );
    const bottomArrowLabelPos = LinearElementEditor.getBoundTextElementPosition(
      bottomArrow,
      bottomArrowLabel,
      elementsMap,
    );

    expect(topArrow.x).toBeCloseTo(0);
    expect(topArrow.y).toBeCloseTo(selectionTop + (20 - selectionTop) * scale);
    expect(topArrow.width).toBeCloseTo(300);
    expect(topArrow.points).toEqual([
      [0, 0],
      [300, 0],
    ]);

    expect(topArrowLabelPos.x + topArrowLabel.width / 2).toBeCloseTo(
      topArrow.width / 2,
    );
    expect(topArrowLabelPos.y + topArrowLabel.height / 2).toBeCloseTo(
      topArrow.y,
    );
    expect(topArrowLabel.fontSize).toBeCloseTo(20 * scale);

    expect(bottomArrow.x).toBeCloseTo(0);
    expect(bottomArrow.y).toBeCloseTo(
      selectionTop + (80 - selectionTop) * scale,
    );
    expect(bottomArrow.width).toBeCloseTo(300);
    expect(topArrow.points).toEqual([
      [0, 0],
      [300, 0],
    ]);

    expect(bottomArrowLabelPos.x + bottomArrowLabel.width / 2).toBeCloseTo(
      bottomArrow.width / 2,
    );
    expect(bottomArrowLabelPos.y + bottomArrowLabel.height / 2).toBeCloseTo(
      bottomArrow.y,
    );
    expect(bottomArrowLabel.fontSize).toBeCloseTo(28 * scale);
  });

  it.only("resizes with text elements", async () => {
    const topText = UI.createElement("text", { position: 0 });
    await UI.editText(topText, "lorem ipsum");

    UI.clickTool("text");
    UI.clickByTitle("Large");
    const bottomText = UI.createElement("text", { position: 40 });
    await UI.editText(bottomText, "dolor\nsit amet");

    const selectionWidth = 40 + bottomText.width;
    const selectionHeight = 40 + bottomText.height;
    const move = [30, -40] as [number, number];
    const scale = Math.max(
      1 + move[0] / selectionWidth,
      1 - move[1] / selectionHeight,
    );

    UI.resize([topText, bottomText], "ne", move, { shift: true });

    expect(topText.x).toBeCloseTo(0);
    expect(topText.y).toBeCloseTo(-selectionHeight * (scale - 1));
    expect(topText.fontSize).toBeCloseTo(20 * scale);
    expect(topText.angle).toEqual(0);

    expect(bottomText.x).toBeCloseTo(40 * scale);
    expect(bottomText.y).toBeCloseTo(40 - (selectionHeight - 40) * (scale - 1));
    expect(bottomText.fontSize).toBeCloseTo(28 * scale);
    expect(bottomText.angle).toEqual(0);
  });

  it("resizes with images (proportional)", () => {
    const topImage = API.createElement({
      type: "image",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    const bottomImage = API.createElement({
      type: "image",
      x: 30,
      y: 150,
      width: 120,
      height: 80,
    });
    API.setElements([topImage, bottomImage]);

    const selectionWidth = 200;
    const selectionHeight = 230;
    const move = [-50, -50] as [number, number];
    const scale = Math.max(
      1 + move[0] / selectionWidth,
      1 + move[1] / selectionHeight,
    );

    UI.resize([topImage, bottomImage], "se", move);

    expect(topImage.x).toBeCloseTo(0);
    expect(topImage.y).toBeCloseTo(0);
    expect(topImage.width).toBeCloseTo(200 * scale);
    expect(topImage.height).toBeCloseTo(100 * scale);
    expect(topImage.angle).toEqual(0);
    expect(topImage.scale).toEqual([1, 1]);

    expect(bottomImage.x).toBeCloseTo(30 * scale);
    expect(bottomImage.y).toBeCloseTo(150 * scale);
    expect(bottomImage.width).toBeCloseTo(120 * scale);
    expect(bottomImage.height).toBeCloseTo(80 * scale);
    expect(bottomImage.angle).toEqual(0);
    expect(bottomImage.scale).toEqual([1, 1]);
  });

  it("resizes from center", () => {
    const rectangle = UI.createElement("rectangle", {
      x: -200,
      y: -140,
      width: 120,
      height: 100,
    });
    const ellipse = UI.createElement("ellipse", {
      position: 60,
      width: 140,
      height: 80,
    });

    const selectionWidth = 400;
    const selectionHeight = 280;
    const move = [-80, -80] as [number, number];
    const scale = Math.max(
      1 + (2 * move[0]) / selectionWidth,
      1 + (2 * move[1]) / selectionHeight,
    );

    UI.resize([rectangle, ellipse], "se", move, { shift: true, alt: true });

    expect(rectangle.x).toBeCloseTo(-200 * scale);
    expect(rectangle.y).toBeCloseTo(-140 * scale);
    expect(rectangle.width).toBeCloseTo(120 * scale);
    expect(rectangle.height).toBeCloseTo(100 * scale);
    expect(rectangle.angle).toEqual(0);

    expect(ellipse.x).toBeCloseTo(60 * scale);
    expect(ellipse.y).toBeCloseTo(60 * scale);
    expect(ellipse.width).toBeCloseTo(140 * scale);
    expect(ellipse.height).toBeCloseTo(80 * scale);
    expect(ellipse.angle).toEqual(0);
  });

  it("flips while resizing", async () => {
    const image = API.createElement({
      type: "image",
      x: 60,
      y: 100,
      width: 100,
      height: 100,
      angle: (Math.PI * 7) / 6,
    });
    API.setElements([image]);

    const line = UI.createElement("line", {
      x: 60,
      y: 0,
      points: [
        pointFrom(0, 0),
        pointFrom(-40, 40),
        pointFrom(-20, 60),
        pointFrom(20, 20),
        pointFrom(40, 40),
        pointFrom(-20, 100),
        pointFrom(-60, 60),
      ],
    });

    const rectangle = UI.createElement("rectangle", {
      x: 180,
      y: 60,
      width: 160,
      height: 80,
      angle: Math.PI / 6,
    });
    const rectLabel = await UI.editText(rectangle, "hello\nworld");

    const boundArrow = UI.createElement("arrow", {
      x: 380,
      y: 240,
      width: -60,
      height: -80,
    });
    const arrowLabel = await UI.editText(boundArrow, "test");

    const selectionWidth = 380;
    const move = [-800, 0] as [number, number];
    const scaleX = move[0] / selectionWidth + 1;
    const scaleY = -scaleX;
    const lineOrigBounds = getBoundsFromPoints(line);
    const elementsMap = arrayToMap(h.elements);
    UI.resize([line, image, rectangle, boundArrow], "se", move, {
      shift: true,
    });
    const lineNewBounds = getBoundsFromPoints(line);
    const arrowLabelPos = LinearElementEditor.getBoundTextElementPosition(
      boundArrow,
      arrowLabel,
      elementsMap,
    );

    expect(line.x).toBeCloseTo(60 * scaleX);
    expect(line.y).toBeCloseTo(0);
    expect(lineNewBounds[0]).toBeCloseTo(
      (lineOrigBounds[2] - lineOrigBounds[0]) * scaleX,
    );
    expect(lineNewBounds[1]).toBeCloseTo(0);
    expect(lineNewBounds[3]).toBeCloseTo(
      (lineOrigBounds[3] - lineOrigBounds[1]) * scaleY,
    );
    expect(lineNewBounds[2]).toBeCloseTo(0);
    expect(line.angle).toEqual(0);

    expect(image.x).toBeCloseTo((60 + 100) * scaleX);
    expect(image.y).toBeCloseTo(100 * scaleY);
    expect(image.width).toBeCloseTo(100 * -scaleX);
    expect(image.height).toBeCloseTo(100 * scaleY);
    expect(image.angle).toBeCloseTo((Math.PI * 5) / 6);
    expect(image.scale).toEqual([-1, 1]);

    expect(rectangle.x).toBeCloseTo((180 + 160) * scaleX);
    expect(rectangle.y).toBeCloseTo(60 * scaleY);
    expect(rectangle.width).toBeCloseTo(160 * -scaleX);
    expect(rectangle.height).toBeCloseTo(80 * scaleY);
    expect(rectangle.angle).toEqual((Math.PI * 11) / 6);

    expect(rectLabel.x + rectLabel.width / 2).toBeCloseTo(
      rectangle.x + rectangle.width / 2,
    );
    expect(rectLabel.y + rectLabel.height / 2).toBeCloseTo(
      rectangle.y + rectangle.height / 2,
    );
    expect(rectLabel.angle).toBeCloseTo(rectangle.angle);
    expect(rectLabel.fontSize).toBeCloseTo(20 * scaleY);

    expect(boundArrow.x).toBeCloseTo(380 * scaleX);
    expect(boundArrow.y).toBeCloseTo(240 * scaleY);
    expect(boundArrow.points[1][0]).toBeCloseTo(-60 * scaleX);
    expect(boundArrow.points[1][1]).toBeCloseTo(-80 * scaleY);

    expect(arrowLabelPos.x + arrowLabel.width / 2).toBeCloseTo(
      boundArrow.x + boundArrow.points[1][0] / 2,
    );
    expect(arrowLabelPos.y + arrowLabel.height / 2).toBeCloseTo(
      boundArrow.y + boundArrow.points[1][1] / 2,
    );
    expect(arrowLabel.angle).toEqual(0);
    expect(arrowLabel.fontSize).toBeCloseTo(20 * scaleY);
  });
});

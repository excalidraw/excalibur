import { duplicateElement } from "./newElement";
import { mutateElement } from "./mutateElement";
import { API } from "../tests/helpers/api";
import { FONT_FAMILY } from "../constants";
import { registerTextElementSubtypes } from "../textlike";

registerTextElementSubtypes();

const isPrimitive = (val: any) => {
  const type = typeof val;
  return val == null || (type !== "object" && type !== "function");
};

const assertCloneObjects = (source: any, clone: any) => {
  for (const key in clone) {
    if (clone.hasOwnProperty(key) && !isPrimitive(clone[key])) {
      expect(clone[key]).not.toBe(source[key]);
      if (source[key]) {
        assertCloneObjects(source[key], clone[key]);
      }
    }
  }
};

it("clones arrow element", () => {
  const element = API.createElement({
    type: "arrow",
    x: 0,
    y: 0,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    strokeSharpness: "round",
    roughness: 1,
    opacity: 100,
  });

  // @ts-ignore
  element.__proto__ = { hello: "world" };

  mutateElement(element, {
    points: [
      [1, 2],
      [3, 4],
    ],
  });

  const copy = duplicateElement(null, new Map(), element);

  assertCloneObjects(element, copy);

  // @ts-ignore
  expect(copy.__proto__).toEqual({ hello: "world" });
  expect(copy.hasOwnProperty("hello")).toBe(false);

  expect(copy.points).not.toBe(element.points);
  expect(copy).not.toHaveProperty("shape");
  expect(copy.id).not.toBe(element.id);
  expect(typeof copy.id).toBe("string");
  expect(copy.seed).not.toBe(element.seed);
  expect(typeof copy.seed).toBe("number");
  expect(copy).toEqual({
    ...element,
    id: copy.id,
    seed: copy.seed,
  });
});

it("clones text element", () => {
  const element = API.createElement({
    type: "text",
    x: 0,
    y: 0,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    strokeSharpness: "round",
    roughness: 1,
    opacity: 100,
    text: "hello",
    fontSize: 20,
    fontFamily: FONT_FAMILY.Virgil,
    textAlign: "left",
    verticalAlign: "top",
  });

  const copy = duplicateElement(null, new Map(), element);

  assertCloneObjects(element, copy);

  expect(copy).not.toHaveProperty("points");
  expect(copy).not.toHaveProperty("shape");
  expect(copy.id).not.toBe(element.id);
  expect(typeof copy.id).toBe("string");
  expect(typeof copy.seed).toBe("number");
});

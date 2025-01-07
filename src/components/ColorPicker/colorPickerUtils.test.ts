import { ColorPaletteCustom } from "../../colors";
import { ExcalidrawElement } from "../../element/types";
import {
  getColorNameAndShadeFromColor,
  getMostUsedCustomColors,
  isCustomColor,
} from "./colorPickerUtils";

describe("getColorNameAndShadeFromColor", () => {
  it("returns null when no matching color is found", () => {
    const palette: ColorPaletteCustom = {
      green: "#00FF00",
      orange: "#E07C24",
    };
    const color = "#FF6666";

    const result = getColorNameAndShadeFromColor({ palette, color });

    expect(result).toBeNull();
  });

  it("returns color name and null when matching single color is found", () => {
    const palette: ColorPaletteCustom = {
      red: "#FF0000",
      orange: "#FFA500",
      yellow: "#FFFF00",
      green: "#008000",
      blue: "#0000FF",
      indigo: "#4B0082",
      violet: "#EE82EE",
      pink: "#FFC0CB",
      brown: "#A52A2A",
      black: "#000000",
      white: "#FFFFFF",
      gray: "#808080",
    };

    const color = "#FF0000";

    const result = getColorNameAndShadeFromColor({ palette, color });

    expect(result).toEqual({ colorName: "red", shade: null });
  });

  it("returns color name and shade index when matching array of colors is found", () => {
    const palette: ColorPaletteCustom = {
      red: ["#FF0000", "#FF6666", "#CC0000", "#990000", "#660000"],
      green: ["#00FF00", "#00CC00", "#009900", "#006600", "#003300"],
    };

    const color = "#FF6666";

    const result = getColorNameAndShadeFromColor({ palette, color });

    expect(result).toEqual({ colorName: "red", shade: 1 });
  });
});

describe("isCustomColor", () => {
  it("should return true for a custom color not present in the palette", () => {
    const palette = {
      green: "#00FF00",
      orange: "#E07C24",
    };
    const color = "#FF6666";

    const result = isCustomColor({ color, palette });

    expect(result).toBe(true);
  });

  it("should return false for a color present in the palette", () => {
    const palette = {
      green: "#00FF00",
      orange: "#E07C24",
    };
    const color = "#00FF00";

    const result = isCustomColor({ color, palette });

    expect(result).toBe(false);
  });

  it("should handle empty palette correctly", () => {
    const palette = {};
    const color = "#FF6666";

    const result = isCustomColor({ color, palette });

    expect(result).toBe(true);
  });
});

describe("getMostUsedCustomColors", () => {
const elements: readonly any[] = [
  {
    type: "rectangle",
    id: "1",
    isDeleted: false,
    backgroundColor: "#FF0000",
    strokeColor: "#00FF00",
  },
  {
    type: "ellipse",
    id: "2",
    isDeleted: false,
    backgroundColor: "#FF0000",
    strokeColor: "#0000FF",
  },
  {
    type: "rectangle",
    id: "3",
    isDeleted: false,
    backgroundColor: "#00FF00",
    strokeColor: "#00FF00",
  },
  {
    type: "rectangle",
    id: "4",
    isDeleted: true,
    backgroundColor: "#FFFF00",
    strokeColor: "#FF00FF",
  },
];

const palette = {
  red: "#FF0000",
  green: "#00FF00",
  blue: "#0000FF",
};

it("should return empty array for elementBackground.", () => {
  const type = "elementBackground";

  const result = getMostUsedCustomColors(elements, type, palette);

  expect(result).toEqual([]); 
});


it("should return empty array for elementStroke.", () => {
  const type = "elementStroke";

  const result = getMostUsedCustomColors(elements, type, palette);

  expect(result).toEqual([]); 
});


it("should handle empty elements correctly", () => {
  const type = "elementBackground";
  const emptyElements: readonly ExcalidrawElement[] = [];

  const result = getMostUsedCustomColors(emptyElements, type, palette);

  expect(result).toEqual([]);
});

it("should handle empty palette correctly", () => {
  const type = "elementBackground";
  const emptyPalette = {};
  const result = getMostUsedCustomColors(elements, type, emptyPalette);

  // Assuming MAX_CUSTOM_COLORS_USED_IN_CANVAS is set to 2
  expect(result).toEqual(["#FF0000", "#00FF00"]);
});
});

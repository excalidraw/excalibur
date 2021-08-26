import { measureTextElement } from "../textlike";
import { ExcalidrawTextElement } from "./types";
import { mutateElement } from "./mutateElement";

export const redrawTextBoundingBox = (element: ExcalidrawTextElement) => {
  const metrics = measureTextElement(element);
  mutateElement(element, {
    width: metrics.width,
    height: metrics.height,
    baseline: metrics.baseline,
  });
};

import type { ElementsMap, ExcalidrawElement } from "./element/types";
import { newElementWith } from "./element/mutateElement";
import type { BoundingBox } from "./element/bounds";
import { getCommonBoundingBox } from "./element/bounds";
import { getMaximumGroups } from "./groups";
import { getConnectedArrows } from "./element/binding";

export interface Alignment {
  position: "start" | "center" | "end";
  axis: "x" | "y";
}

export const alignElements = (
  selectedElements: ExcalidrawElement[],
  elementsMap: ElementsMap,
  alignment: Alignment,
): ExcalidrawElement[] => {
  const groups: ExcalidrawElement[][] = getMaximumGroups(
    selectedElements,
    elementsMap,
  );
  const selectionBoundingBox = getCommonBoundingBox(selectedElements);

  // Track all elements that need to be updated
  const updatedElements: ExcalidrawElement[] = [];

  // Align the non-arrow elements and their connected arrows
  groups.forEach((group) => {
    const translation = calculateTranslation(
      group,
      selectionBoundingBox,
      alignment,
    );

    // Update each element in the group
    group.forEach((element) => {
      // Add the translated element
      updatedElements.push(
        newElementWith(element, {
          x: element.x + translation.x,
          y: element.y + translation.y,
        }),
      );

      // Get and update connected arrows
      const connectedArrows = getConnectedArrows(element, elementsMap);
      connectedArrows.forEach((arrow) => {
        // Only update arrow if not already processed
        if (!updatedElements.some((el) => el.id === arrow.id)) {
          updatedElements.push(
            newElementWith(arrow, {
              x: arrow.x + translation.x,
              y: arrow.y + translation.y,
            }),
          );
        }
      });
    });
  });

  return updatedElements;
};

const calculateTranslation = (
  group: ExcalidrawElement[],
  selectionBoundingBox: BoundingBox,
  { axis, position }: Alignment,
): { x: number; y: number } => {
  const groupBoundingBox = getCommonBoundingBox(group);

  const [min, max]: ["minX" | "minY", "maxX" | "maxY"] =
    axis === "x" ? ["minX", "maxX"] : ["minY", "maxY"];

  const noTranslation = { x: 0, y: 0 };
  if (position === "start") {
    return {
      ...noTranslation,
      [axis]: selectionBoundingBox[min] - groupBoundingBox[min],
    };
  } else if (position === "end") {
    return {
      ...noTranslation,
      [axis]: selectionBoundingBox[max] - groupBoundingBox[max],
    };
  } // else if (position === "center") {
  return {
    ...noTranslation,
    [axis]:
      (selectionBoundingBox[min] + selectionBoundingBox[max]) / 2 -
      (groupBoundingBox[min] + groupBoundingBox[max]) / 2,
  };
};

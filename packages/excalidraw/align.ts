import type { ElementsMap, ExcalidrawElement, GroupId } from "./element/types";
import { newElementWith } from "./element/mutateElement";
import type { BoundingBox } from "./element/bounds";
import { getCommonBoundingBox } from "./element/bounds";
import { getInternalGroups, getMaximumGroups } from "./groups";

export interface Alignment {
  position: "start" | "center" | "end";
  axis: "x" | "y";
}

export const alignElements = (
  selectedElements: ExcalidrawElement[],
  elementsMap: ElementsMap,
  alignment: Alignment,
  selectedGroupIds: GroupId[],
): ExcalidrawElement[] => {
  const groups: ExcalidrawElement[][] = getMaximumGroups(
    selectedElements,
    elementsMap,
  );
  const selectionBoundingBox = getCommonBoundingBox(selectedElements);

  // #8522 Allow grouped elements to align within group
  // --------------------------------------------------
  const unpackedGroups =
    groups.length === 1 && selectedGroupIds.length <= 1
      ? getInternalGroups(selectedElements, elementsMap, selectedGroupIds[0])
      : groups;

  return unpackedGroups.flatMap((group) => {
    const translation = calculateTranslation(
      group,
      selectionBoundingBox,
      alignment,
    );
    return group.map((element) =>
      newElementWith(element, {
        x: element.x + translation.x,
        y: element.y + translation.y,
      }),
    );
  });
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

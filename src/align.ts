import { ExcalidrawElement } from "./element/types";
import { newElementWith } from "./element/mutateElement";
import { getCommonBounds } from "./element";

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Alignment {
  position: "start" | "center" | "end";
  axis: "x" | "y";
  alignType: "bounding" | "anchor";
}

export const alignElements = (
  selectedElements: ExcalidrawElement[],
  alignment: Alignment,
): ExcalidrawElement[] => {
  const groups: ExcalidrawElement[][] = getMaximumGroups(selectedElements);
  const useBoundingBox = alignment.alignType === "bounding";
  const selectionBoundingBox = getCommonBoundingBox(
    useBoundingBox ? selectedElements : [selectedElements[0]],
  );

  return groups.flatMap((group) => {
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

export const getMaximumGroups = (
  elements: ExcalidrawElement[],
): ExcalidrawElement[][] => {
  const groups: Map<String, ExcalidrawElement[]> = new Map<
    String,
    ExcalidrawElement[]
  >();

  elements.forEach((element: ExcalidrawElement) => {
    const groupId =
      element.groupIds.length === 0
        ? element.id
        : element.groupIds[element.groupIds.length - 1];

    const currentGroupMembers = groups.get(groupId) || [];

    groups.set(groupId, [...currentGroupMembers, element]);
  });

  return Array.from(groups.values());
};

const calculateTranslation = (
  group: ExcalidrawElement[],
  selectionBoundingBox: Box,
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

const getCommonBoundingBox = (elements: ExcalidrawElement[]): Box => {
  const [minX, minY, maxX, maxY] = getCommonBounds(elements);
  return { minX, minY, maxX, maxY };
};

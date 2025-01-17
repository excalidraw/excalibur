import {
  HEADING_DOWN,
  HEADING_LEFT,
  HEADING_RIGHT,
  HEADING_UP,
  compareHeading,
  headingForPointFromElement,
  type Heading,
} from "./heading";
import { bindLinearElement } from "./binding";
import { LinearElementEditor } from "./linearElementEditor";
import { newArrowElement, newElement } from "./newElement";
import type {
  ElementsMap,
  ExcalidrawBindableElement,
  ExcalidrawElement,
  ExcalidrawFlowchartNodeElement,
  NonDeletedSceneElementsMap,
  OrderedExcalidrawElement,
} from "./types";
import { KEYS } from "../keys";
import type { AppState, PendingExcalidrawElements } from "../types";
import { mutateElement } from "./mutateElement";
import { elementOverlapsWithFrame, elementsAreInFrameBounds } from "../frame";
import {
  isBindableElement,
  isElbowArrow,
  isFrameElement,
  isFlowchartNodeElement,
} from "./typeChecks";
import { invariant } from "../utils";
import { pointFrom, type LocalPoint } from "../../math";
import { aabbForElement } from "../shapes";

type LinkDirection = "up" | "right" | "down" | "left";

const VERTICAL_OFFSET = 100;
const HORIZONTAL_OFFSET = 100;

export const getLinkDirectionFromKey = (key: string): LinkDirection => {
  switch (key) {
    case KEYS.ARROW_UP:
      return "up";
    case KEYS.ARROW_DOWN:
      return "down";
    case KEYS.ARROW_RIGHT:
      return "right";
    case KEYS.ARROW_LEFT:
      return "left";
    default:
      return "right";
  }
};

const getNodeRelatives = (
  type: "predecessors" | "successors",
  node: ExcalidrawBindableElement,
  elementsMap: ElementsMap,
  direction: LinkDirection,
) => {
  const items = [...elementsMap.values()].reduce(
    (acc: { relative: ExcalidrawBindableElement; heading: Heading }[], el) => {
      let oppositeBinding;
      if (
        isElbowArrow(el) &&
        // we want check existence of the opposite binding, in the direction
        // we're interested in
        (oppositeBinding =
          el[type === "predecessors" ? "startBinding" : "endBinding"]) &&
        // similarly, we need to filter only arrows bound to target node
        el[type === "predecessors" ? "endBinding" : "startBinding"]
          ?.elementId === node.id
      ) {
        const relative = elementsMap.get(oppositeBinding.elementId);

        if (!relative) {
          return acc;
        }

        invariant(
          isBindableElement(relative),
          "not an ExcalidrawBindableElement",
        );

        const edgePoint = (
          type === "predecessors" ? el.points[el.points.length - 1] : [0, 0]
        ) as Readonly<LocalPoint>;

        const heading = headingForPointFromElement(node, aabbForElement(node), [
          edgePoint[0] + el.x,
          edgePoint[1] + el.y,
        ] as Readonly<LocalPoint>);

        acc.push({
          relative,
          heading,
        });
      }
      return acc;
    },
    [],
  );

  switch (direction) {
    case "up":
      return items
        .filter((item) => compareHeading(item.heading, HEADING_UP))
        .map((item) => item.relative);
    case "down":
      return items
        .filter((item) => compareHeading(item.heading, HEADING_DOWN))
        .map((item) => item.relative);
    case "right":
      return items
        .filter((item) => compareHeading(item.heading, HEADING_RIGHT))
        .map((item) => item.relative);
    case "left":
      return items
        .filter((item) => compareHeading(item.heading, HEADING_LEFT))
        .map((item) => item.relative);
  }
};

const getSuccessors = (
  node: ExcalidrawBindableElement,
  elementsMap: ElementsMap,
  direction: LinkDirection,
) => {
  return getNodeRelatives("successors", node, elementsMap, direction);
};

export const getPredecessors = (
  node: ExcalidrawBindableElement,
  elementsMap: ElementsMap,
  direction: LinkDirection,
) => {
  return getNodeRelatives("predecessors", node, elementsMap, direction);
};

const getOffsets = (
  element: ExcalidrawFlowchartNodeElement,
  linkedNodes: ExcalidrawElement[],
  direction: LinkDirection,
) => {
  const _HORIZONTAL_OFFSET = HORIZONTAL_OFFSET + element.width;

  // check if vertical space or horizontal space is available first
  if (direction === "up" || direction === "down") {
    const _VERTICAL_OFFSET = VERTICAL_OFFSET + element.height;
    // check vertical space
    const minX = element.x;
    const maxX = element.x + element.width;

    // vertical space is available
    if (
      linkedNodes.every(
        (linkedNode) =>
          linkedNode.x + linkedNode.width < minX || linkedNode.x > maxX,
      )
    ) {
      return {
        x: 0,
        y: _VERTICAL_OFFSET * (direction === "up" ? -1 : 1),
      };
    }
  } else if (direction === "right" || direction === "left") {
    const minY = element.y;
    const maxY = element.y + element.height;

    if (
      linkedNodes.every(
        (linkedNode) =>
          linkedNode.y + linkedNode.height < minY || linkedNode.y > maxY,
      )
    ) {
      return {
        x:
          (HORIZONTAL_OFFSET + element.width) * (direction === "left" ? -1 : 1),
        y: 0,
      };
    }
  }

  if (direction === "up" || direction === "down") {
    const _VERTICAL_OFFSET = VERTICAL_OFFSET + element.height;
    const y = linkedNodes.length === 0 ? _VERTICAL_OFFSET : _VERTICAL_OFFSET;
    const x =
      linkedNodes.length === 0
        ? 0
        : (linkedNodes.length + 1) % 2 === 0
        ? ((linkedNodes.length + 1) / 2) * _HORIZONTAL_OFFSET
        : (linkedNodes.length / 2) * _HORIZONTAL_OFFSET * -1;

    if (direction === "up") {
      return {
        x,
        y: y * -1,
      };
    }

    return {
      x,
      y,
    };
  }

  const _VERTICAL_OFFSET = VERTICAL_OFFSET + element.height;
  const x =
    (linkedNodes.length === 0 ? HORIZONTAL_OFFSET : HORIZONTAL_OFFSET) +
    element.width;
  const y =
    linkedNodes.length === 0
      ? 0
      : (linkedNodes.length + 1) % 2 === 0
      ? ((linkedNodes.length + 1) / 2) * _VERTICAL_OFFSET
      : (linkedNodes.length / 2) * _VERTICAL_OFFSET * -1;

  if (direction === "left") {
    return {
      x: x * -1,
      y,
    };
  }
  return {
    x,
    y,
  };
};

const addNewNode = (
  element: ExcalidrawFlowchartNodeElement,
  elementsMap: ElementsMap,
  appState: AppState,
  direction: LinkDirection,
) => {
  const successors = getSuccessors(element, elementsMap, direction);
  const predeccessors = getPredecessors(element, elementsMap, direction);

  const offsets = getOffsets(
    element,
    [...successors, ...predeccessors],
    direction,
  );

  const nextNode = newElement({
    type: element.type,
    x: element.x + offsets.x,
    y: element.y + offsets.y,
    // TODO: extract this to a util
    width: element.width,
    height: element.height,
    roundness: element.roundness,
    roughness: element.roughness,
    backgroundColor: element.backgroundColor,
    strokeColor: element.strokeColor,
    strokeWidth: element.strokeWidth,
  });

  invariant(
    isFlowchartNodeElement(nextNode),
    "not an ExcalidrawFlowchartNodeElement",
  );

  const bindingArrow = createBindingArrow(
    element,
    nextNode,
    elementsMap,
    direction,
    appState,
  );

  return {
    nextNode,
    bindingArrow,
  };
};

export const addNewNodes = (
  startNode: ExcalidrawFlowchartNodeElement,
  elementsMap: ElementsMap,
  appState: AppState,
  direction: LinkDirection,
  numberOfNodes: number,
) => {
  // always start from 0 and distribute evenly
  const newNodes: ExcalidrawElement[] = [];

  for (let i = 0; i < numberOfNodes; i++) {
    let nextX: number;
    let nextY: number;
    if (direction === "left" || direction === "right") {
      const totalHeight =
        VERTICAL_OFFSET * (numberOfNodes - 1) +
        numberOfNodes * startNode.height;

      const startY = startNode.y + startNode.height / 2 - totalHeight / 2;

      let offsetX = HORIZONTAL_OFFSET + startNode.width;
      if (direction === "left") {
        offsetX *= -1;
      }
      nextX = startNode.x + offsetX;
      const offsetY = (VERTICAL_OFFSET + startNode.height) * i;
      nextY = startY + offsetY;
    } else {
      const totalWidth =
        HORIZONTAL_OFFSET * (numberOfNodes - 1) +
        numberOfNodes * startNode.width;
      const startX = startNode.x + startNode.width / 2 - totalWidth / 2;
      let offsetY = VERTICAL_OFFSET + startNode.height;

      if (direction === "up") {
        offsetY *= -1;
      }
      nextY = startNode.y + offsetY;
      const offsetX = (HORIZONTAL_OFFSET + startNode.width) * i;
      nextX = startX + offsetX;
    }

    const nextNode = newElement({
      type: startNode.type,
      x: nextX,
      y: nextY,
      // TODO: extract this to a util
      width: startNode.width,
      height: startNode.height,
      roundness: startNode.roundness,
      roughness: startNode.roughness,
      backgroundColor: startNode.backgroundColor,
      strokeColor: startNode.strokeColor,
      strokeWidth: startNode.strokeWidth,
    });

    invariant(
      isFlowchartNodeElement(nextNode),
      "not an ExcalidrawFlowchartNodeElement",
    );

    const bindingArrow = createBindingArrow(
      startNode,
      nextNode,
      elementsMap,
      direction,
      appState,
    );

    newNodes.push(nextNode);
    newNodes.push(bindingArrow);
  }

  return newNodes;
};

const createBindingArrow = (
  startBindingElement: ExcalidrawFlowchartNodeElement,
  endBindingElement: ExcalidrawFlowchartNodeElement,
  elementsMap: ElementsMap,
  direction: LinkDirection,
  appState: AppState,
) => {
  let startX: number;
  let startY: number;

  const PADDING = 6;

  switch (direction) {
    case "up": {
      startX = startBindingElement.x + startBindingElement.width / 2;
      startY = startBindingElement.y - PADDING;
      break;
    }
    case "down": {
      startX = startBindingElement.x + startBindingElement.width / 2;
      startY = startBindingElement.y + startBindingElement.height + PADDING;
      break;
    }
    case "right": {
      startX = startBindingElement.x + startBindingElement.width + PADDING;
      startY = startBindingElement.y + startBindingElement.height / 2;
      break;
    }
    case "left": {
      startX = startBindingElement.x - PADDING;
      startY = startBindingElement.y + startBindingElement.height / 2;
      break;
    }
  }

  let endX: number;
  let endY: number;

  switch (direction) {
    case "up": {
      endX = endBindingElement.x + endBindingElement.width / 2 - startX;
      endY = endBindingElement.y + endBindingElement.height - startY + PADDING;
      break;
    }
    case "down": {
      endX = endBindingElement.x + endBindingElement.width / 2 - startX;
      endY = endBindingElement.y - startY - PADDING;
      break;
    }
    case "right": {
      endX = endBindingElement.x - startX - PADDING;
      endY = endBindingElement.y - startY + endBindingElement.height / 2;
      break;
    }
    case "left": {
      endX = endBindingElement.x + endBindingElement.width - startX + PADDING;
      endY = endBindingElement.y - startY + endBindingElement.height / 2;
      break;
    }
  }

  const bindingArrow = newArrowElement({
    type: "arrow",
    x: startX,
    y: startY,
    startArrowhead: null,
    endArrowhead: appState.currentItemEndArrowhead,
    strokeColor: startBindingElement.strokeColor,
    strokeStyle: startBindingElement.strokeStyle,
    strokeWidth: startBindingElement.strokeWidth,
    points: [pointFrom(0, 0), pointFrom(endX, endY)],
    elbowed: true,
  });

  bindLinearElement(
    bindingArrow,
    startBindingElement,
    "start",
    elementsMap as NonDeletedSceneElementsMap,
  );
  bindLinearElement(
    bindingArrow,
    endBindingElement,
    "end",
    elementsMap as NonDeletedSceneElementsMap,
  );

  const changedElements = new Map<string, OrderedExcalidrawElement>();
  changedElements.set(
    startBindingElement.id,
    startBindingElement as OrderedExcalidrawElement,
  );
  changedElements.set(
    endBindingElement.id,
    endBindingElement as OrderedExcalidrawElement,
  );
  changedElements.set(
    bindingArrow.id,
    bindingArrow as OrderedExcalidrawElement,
  );

  LinearElementEditor.movePoints(bindingArrow, [
    {
      index: 1,
      point: bindingArrow.points[1],
    },
  ]);

  return bindingArrow;
};

export class FlowChartNavigator {
  isExploring: boolean = false;
  // nodes that are ONE link away (successor and predecessor both included)
  private sameLevelNodes: ExcalidrawElement[] = [];
  private sameLevelIndex: number = 0;
  // set it to the opposite of the defalut creation direction
  private direction: LinkDirection | null = null;
  // for speedier navigation
  private visitedNodes: Set<ExcalidrawElement["id"]> = new Set();

  clear() {
    this.isExploring = false;
    this.sameLevelNodes = [];
    this.sameLevelIndex = 0;
    this.direction = null;
    this.visitedNodes.clear();
  }

  exploreByDirection(
    element: ExcalidrawElement,
    elementsMap: ElementsMap,
    direction: LinkDirection,
  ): ExcalidrawElement["id"] | null {
    if (!isBindableElement(element)) {
      return null;
    }

    // clear if going at a different direction
    if (direction !== this.direction) {
      this.clear();
    }

    // add the current node to the visited
    if (!this.visitedNodes.has(element.id)) {
      this.visitedNodes.add(element.id);
    }

    /**
     * CASE:
     * - already started exploring, AND
     * - there are multiple nodes at the same level, AND
     * - still going at the same direction, AND
     *
     * RESULT:
     * - loop through nodes at the same level
     *
     * WHY:
     * - provides user the capability to loop through nodes at the same level
     */
    if (
      this.isExploring &&
      direction === this.direction &&
      this.sameLevelNodes.length > 1
    ) {
      this.sameLevelIndex =
        (this.sameLevelIndex + 1) % this.sameLevelNodes.length;

      return this.sameLevelNodes[this.sameLevelIndex].id;
    }

    const nodes = [
      ...getSuccessors(element, elementsMap, direction),
      ...getPredecessors(element, elementsMap, direction),
    ];

    /**
     * CASE:
     * - just started exploring at the given direction
     *
     * RESULT:
     * - go to the first node in the given direction
     */
    if (nodes.length > 0) {
      this.sameLevelIndex = 0;
      this.isExploring = true;
      this.sameLevelNodes = nodes;
      this.direction = direction;
      this.visitedNodes.add(nodes[0].id);

      return nodes[0].id;
    }

    /**
     * CASE:
     * - (just started exploring or still going at the same direction) OR
     * - there're no nodes at the given direction
     *
     * RESULT:
     * - go to some other unvisited linked node
     *
     * WHY:
     * - provide a speedier navigation from a given node to some predecessor
     *   without the user having to change arrow key
     */
    if (direction === this.direction || !this.isExploring) {
      if (!this.isExploring) {
        // just started and no other nodes at the given direction
        // so the current node is technically the first visited node
        // (this is needed so that we don't get stuck between looping through )
        this.visitedNodes.add(element.id);
      }

      const otherDirections: LinkDirection[] = [
        "up",
        "right",
        "down",
        "left",
      ].filter((dir): dir is LinkDirection => dir !== direction);

      const otherLinkedNodes = otherDirections
        .map((dir) => [
          ...getSuccessors(element, elementsMap, dir),
          ...getPredecessors(element, elementsMap, dir),
        ])
        .flat()
        .filter((linkedNode) => !this.visitedNodes.has(linkedNode.id));

      for (const linkedNode of otherLinkedNodes) {
        if (!this.visitedNodes.has(linkedNode.id)) {
          this.visitedNodes.add(linkedNode.id);
          this.isExploring = true;
          this.direction = direction;
          return linkedNode.id;
        }
      }
    }

    return null;
  }
}

export class FlowChartCreator {
  isCreatingChart: boolean = false;
  private numberOfNodes: number = 0;
  private direction: LinkDirection | null = "right";
  pendingNodes: PendingExcalidrawElements | null = null;

  createNodes(
    startNode: ExcalidrawFlowchartNodeElement,
    elementsMap: ElementsMap,
    appState: AppState,
    direction: LinkDirection,
  ) {
    if (direction !== this.direction) {
      const { nextNode, bindingArrow } = addNewNode(
        startNode,
        elementsMap,
        appState,
        direction,
      );

      this.numberOfNodes = 1;
      this.isCreatingChart = true;
      this.direction = direction;
      this.pendingNodes = [nextNode, bindingArrow];
    } else {
      this.numberOfNodes += 1;
      const newNodes = addNewNodes(
        startNode,
        elementsMap,
        appState,
        direction,
        this.numberOfNodes,
      );

      this.isCreatingChart = true;
      this.direction = direction;
      this.pendingNodes = newNodes;
    }

    // add pending nodes to the same frame as the start node
    // if every pending node is at least intersecting with the frame
    if (startNode.frameId) {
      const frame = elementsMap.get(startNode.frameId);

      invariant(
        frame && isFrameElement(frame),
        "not an ExcalidrawFrameElement",
      );

      if (
        frame &&
        this.pendingNodes.every(
          (node) =>
            elementsAreInFrameBounds([node], frame, elementsMap) ||
            elementOverlapsWithFrame(node, frame, elementsMap),
        )
      ) {
        this.pendingNodes = this.pendingNodes.map((node) =>
          mutateElement(
            node,
            {
              frameId: startNode.frameId,
            },
            false,
          ),
        );
      }
    }
  }

  clear() {
    this.isCreatingChart = false;
    this.pendingNodes = null;
    this.direction = null;
    this.numberOfNodes = 0;
  }
}

export const isNodeInFlowchart = (
  element: ExcalidrawFlowchartNodeElement,
  elementsMap: ElementsMap,
) => {
  for (const [, el] of elementsMap) {
    if (
      el.type === "arrow" &&
      (el.startBinding?.elementId === element.id ||
        el.endBinding?.elementId === element.id)
    ) {
      return true;
    }
  }

  return false;
};

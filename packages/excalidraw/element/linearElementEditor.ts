import type {
  NonDeleted,
  ExcalidrawLinearElement,
  ExcalidrawElement,
  PointBinding,
  ExcalidrawBindableElement,
  ExcalidrawTextElementWithContainer,
  ElementsMap,
  NonDeletedSceneElementsMap,
  OrderedExcalidrawElement,
  FixedPointBinding,
  SceneElementsMap,
} from "./types";
import { getElementAbsoluteCoords, getLockedLinearCursorAlignSize } from ".";
import type { Bounds } from "./bounds";
import {
  getCurvePathOps,
  getElementPointsCoords,
  getMinMaxXYFromCurvePathOps,
} from "./bounds";
import type {
  AppState,
  PointerCoords,
  InteractiveCanvasAppState,
  AppClassProperties,
  NullableGridSize,
} from "../types";
import { mutateElement } from "./mutateElement";

import {
  bindOrUnbindLinearElement,
  getHoveredElementForBinding,
  isBindingEnabled,
} from "./binding";
import { invariant, toBrandedType, tupleToCoors } from "../utils";
import {
  isBindingElement,
  isElbowArrow,
  isFixedPointBinding,
} from "./typeChecks";
import { KEYS, shouldRotateWithDiscreteAngle } from "../keys";
import { getBoundTextElement, handleBindTextResize } from "./textElement";
import { DRAGGING_THRESHOLD } from "../constants";
import type { Mutable } from "../utility-types";
import { ShapeCache } from "../scene/ShapeCache";
import type { Store } from "../store";
import { mutateElbowArrow } from "./routing";
import type Scene from "../scene/Scene";
import type { Radians } from "../../math";
import {
  pointCenter,
  pointFrom,
  pointRotateRads,
  pointsEqual,
  vector,
  type GlobalPoint,
  type LocalPoint,
  pointDistance,
} from "../../math";
import {
  getBezierCurveLength,
  getBezierXY,
  getControlPointsForBezierCurve,
  isPathALoop,
  mapIntervalToBezierT,
} from "../shapes";
import { getGridPoint } from "../snapping";

const editorMidPointsCache: {
  version: number | null;
  points: (GlobalPoint | null)[];
  zoom: number | null;
} = { version: null, points: [], zoom: null };
export class LinearElementEditor {
  public readonly elementId: ExcalidrawElement["id"] & {
    _brand: "excalidrawLinearElementId";
  };
  /** indices */
  public readonly selectedPointsIndices: readonly number[] | null;

  public readonly pointerDownState: Readonly<{
    prevSelectedPointsIndices: readonly number[] | null;
    /** index */
    lastClickedPoint: number;
    lastClickedIsEndPoint: boolean;
    origin: Readonly<{ x: number; y: number }> | null;
    segmentMidpoint: {
      value: GlobalPoint | null;
      index: number | null;
      added: boolean;
    };
  }>;

  /** whether you're dragging a point */
  public readonly isDragging: boolean;
  public readonly lastUncommittedPoint: LocalPoint | null;
  public readonly pointerOffset: Readonly<{ x: number; y: number }>;
  public readonly startBindingElement:
    | ExcalidrawBindableElement
    | null
    | "keep";
  public readonly endBindingElement: ExcalidrawBindableElement | null | "keep";
  public readonly hoverPointIndex: number;
  public readonly segmentMidPointHoveredCoords: GlobalPoint | null;
  public readonly elbowed: boolean;

  constructor(element: NonDeleted<ExcalidrawLinearElement>) {
    this.elementId = element.id as string & {
      _brand: "excalidrawLinearElementId";
    };
    if (!pointsEqual(element.points[0], pointFrom(0, 0))) {
      console.error("Linear element is not normalized", Error().stack);
    }

    this.selectedPointsIndices = null;
    this.lastUncommittedPoint = null;
    this.isDragging = false;
    this.pointerOffset = { x: 0, y: 0 };
    this.startBindingElement = "keep";
    this.endBindingElement = "keep";
    this.pointerDownState = {
      prevSelectedPointsIndices: null,
      lastClickedPoint: -1,
      lastClickedIsEndPoint: false,
      origin: null,

      segmentMidpoint: {
        value: null,
        index: null,
        added: false,
      },
    };
    this.hoverPointIndex = -1;
    this.segmentMidPointHoveredCoords = null;
    this.elbowed = isElbowArrow(element) && element.elbowed;
  }

  // ---------------------------------------------------------------------------
  // static methods
  // ---------------------------------------------------------------------------

  static POINT_HANDLE_SIZE = 10;
  /**
   * @param id the `elementId` from the instance of this class (so that we can
   *  statically guarantee this method returns an ExcalidrawLinearElement)
   */
  static getElement(
    id: InstanceType<typeof LinearElementEditor>["elementId"],
    elementsMap: ElementsMap,
  ) {
    const element = elementsMap.get(id);
    if (element) {
      return element as NonDeleted<ExcalidrawLinearElement>;
    }
    return null;
  }

  static handleBoxSelection(
    event: PointerEvent,
    appState: AppState,
    setState: React.Component<any, AppState>["setState"],
    elementsMap: NonDeletedSceneElementsMap,
  ) {
    if (!appState.editingLinearElement || !appState.selectionElement) {
      return false;
    }
    const { editingLinearElement } = appState;
    const { selectedPointsIndices, elementId } = editingLinearElement;

    const element = LinearElementEditor.getElement(elementId, elementsMap);
    if (!element) {
      return false;
    }

    const [selectionX1, selectionY1, selectionX2, selectionY2] =
      getElementAbsoluteCoords(appState.selectionElement, elementsMap);

    const pointsSceneCoords = LinearElementEditor.getPointsGlobalCoordinates(
      element,
      elementsMap,
    );

    const nextSelectedPoints = pointsSceneCoords
      .reduce((acc: number[], point, index) => {
        if (
          (point[0] >= selectionX1 &&
            point[0] <= selectionX2 &&
            point[1] >= selectionY1 &&
            point[1] <= selectionY2) ||
          (event.shiftKey && selectedPointsIndices?.includes(index))
        ) {
          acc.push(index);
        }

        return acc;
      }, [])
      .filter((index) => {
        if (
          isElbowArrow(element) &&
          index !== 0 &&
          index !== element.points.length - 1
        ) {
          return false;
        }
        return true;
      });

    setState({
      editingLinearElement: {
        ...editingLinearElement,
        selectedPointsIndices: nextSelectedPoints.length
          ? nextSelectedPoints
          : null,
      },
    });
  }

  /** @returns whether point was dragged */
  static handlePointDragging(
    event: PointerEvent,
    app: AppClassProperties,
    scenePointerX: number,
    scenePointerY: number,
    maybeSuggestBinding: (
      element: NonDeleted<ExcalidrawLinearElement>,
      pointSceneCoords: { x: number; y: number }[],
    ) => void,
    linearElementEditor: LinearElementEditor,
    scene: Scene,
  ): boolean {
    if (!linearElementEditor) {
      return false;
    }
    const { elementId } = linearElementEditor;
    const elementsMap = scene.getNonDeletedElementsMap();
    const element = LinearElementEditor.getElement(elementId, elementsMap);
    if (!element) {
      return false;
    }

    if (
      isElbowArrow(element) &&
      !linearElementEditor.pointerDownState.lastClickedIsEndPoint &&
      linearElementEditor.pointerDownState.lastClickedPoint !== 0
    ) {
      return false;
    }

    const selectedPointsIndices = isElbowArrow(element)
      ? linearElementEditor.selectedPointsIndices
          ?.reduce(
            (startEnd, index) =>
              (index === 0
                ? [0, startEnd[1]]
                : [startEnd[0], element.points.length - 1]) as [
                boolean | number,
                boolean | number,
              ],
            [false, false] as [number | boolean, number | boolean],
          )
          .filter(
            (idx: number | boolean): idx is number => typeof idx === "number",
          )
      : linearElementEditor.selectedPointsIndices;
    const lastClickedPoint = isElbowArrow(element)
      ? linearElementEditor.pointerDownState.lastClickedPoint > 0
        ? element.points.length - 1
        : 0
      : linearElementEditor.pointerDownState.lastClickedPoint;

    // point that's being dragged (out of all selected points)
    const draggingPoint = element.points[lastClickedPoint] as
      | [number, number]
      | undefined;

    if (selectedPointsIndices && draggingPoint) {
      if (
        shouldRotateWithDiscreteAngle(event) &&
        selectedPointsIndices.length === 1 &&
        element.points.length > 1
      ) {
        const selectedIndex = selectedPointsIndices[0];
        const referencePoint =
          element.points[selectedIndex === 0 ? 1 : selectedIndex - 1];

        const [width, height] = LinearElementEditor._getShiftLockedDelta(
          element,
          elementsMap,
          referencePoint,
          pointFrom(scenePointerX, scenePointerY),
          event[KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize(),
        );

        LinearElementEditor.movePoints(
          element,
          [
            {
              index: selectedIndex,
              point: pointFrom(
                width + referencePoint[0],
                height + referencePoint[1],
              ),
              isDragging: selectedIndex === lastClickedPoint,
            },
          ],
          elementsMap,
        );
      } else {
        const newDraggingPointPosition = LinearElementEditor.createPointAt(
          element,
          elementsMap,
          scenePointerX - linearElementEditor.pointerOffset.x,
          scenePointerY - linearElementEditor.pointerOffset.y,
          event[KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize(),
        );

        const deltaX = newDraggingPointPosition[0] - draggingPoint[0];
        const deltaY = newDraggingPointPosition[1] - draggingPoint[1];

        LinearElementEditor.movePoints(
          element,
          selectedPointsIndices.map((pointIndex) => {
            const newPointPosition: LocalPoint =
              pointIndex === lastClickedPoint
                ? LinearElementEditor.createPointAt(
                    element,
                    elementsMap,
                    scenePointerX - linearElementEditor.pointerOffset.x,
                    scenePointerY - linearElementEditor.pointerOffset.y,
                    event[KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize(),
                  )
                : pointFrom(
                    element.points[pointIndex][0] + deltaX,
                    element.points[pointIndex][1] + deltaY,
                  );
            return {
              index: pointIndex,
              point: newPointPosition,
              isDragging: pointIndex === lastClickedPoint,
            };
          }),
          elementsMap,
        );
      }

      const boundTextElement = getBoundTextElement(element, elementsMap);
      if (boundTextElement) {
        handleBindTextResize(element, elementsMap, false);
      }

      // suggest bindings for first and last point if selected
      if (isBindingElement(element, false)) {
        const coords: { x: number; y: number }[] = [];

        const firstSelectedIndex = selectedPointsIndices[0];
        if (firstSelectedIndex === 0) {
          coords.push(
            tupleToCoors(
              LinearElementEditor.getPointGlobalCoordinates(
                element,
                element.points[0],
                elementsMap,
              ),
            ),
          );
        }

        const lastSelectedIndex =
          selectedPointsIndices[selectedPointsIndices.length - 1];
        if (lastSelectedIndex === element.points.length - 1) {
          coords.push(
            tupleToCoors(
              LinearElementEditor.getPointGlobalCoordinates(
                element,
                element.points[lastSelectedIndex],
                elementsMap,
              ),
            ),
          );
        }

        if (coords.length) {
          maybeSuggestBinding(element, coords);
        }
      }

      return true;
    }

    return false;
  }

  static handlePointerUp(
    event: PointerEvent,
    editingLinearElement: LinearElementEditor,
    appState: AppState,
    scene: Scene,
  ): LinearElementEditor {
    const elementsMap = scene.getNonDeletedElementsMap();
    const elements = scene.getNonDeletedElements();

    const { elementId, selectedPointsIndices, isDragging, pointerDownState } =
      editingLinearElement;
    const element = LinearElementEditor.getElement(elementId, elementsMap);
    if (!element) {
      return editingLinearElement;
    }

    const bindings: Mutable<
      Partial<
        Pick<
          InstanceType<typeof LinearElementEditor>,
          "startBindingElement" | "endBindingElement"
        >
      >
    > = {};

    if (isDragging && selectedPointsIndices) {
      for (const selectedPoint of selectedPointsIndices) {
        if (
          selectedPoint === 0 ||
          selectedPoint === element.points.length - 1
        ) {
          if (isPathALoop(element.points, appState.zoom.value)) {
            LinearElementEditor.movePoints(
              element,
              [
                {
                  index: selectedPoint,
                  point:
                    selectedPoint === 0
                      ? element.points[element.points.length - 1]
                      : element.points[0],
                },
              ],
              elementsMap,
            );
          }

          const bindingElement = isBindingEnabled(appState)
            ? getHoveredElementForBinding(
                tupleToCoors(
                  LinearElementEditor.getPointAtIndexGlobalCoordinates(
                    element,
                    selectedPoint!,
                    elementsMap,
                  ),
                ),
                elements,
                elementsMap,
              )
            : null;

          bindings[
            selectedPoint === 0 ? "startBindingElement" : "endBindingElement"
          ] = bindingElement;
        }
      }
    }

    return {
      ...editingLinearElement,
      ...bindings,
      // if clicking without previously dragging a point(s), and not holding
      // shift, deselect all points except the one clicked. If holding shift,
      // toggle the point.
      selectedPointsIndices:
        isDragging || event.shiftKey
          ? !isDragging &&
            event.shiftKey &&
            pointerDownState.prevSelectedPointsIndices?.includes(
              pointerDownState.lastClickedPoint,
            )
            ? selectedPointsIndices &&
              selectedPointsIndices.filter(
                (pointIndex) =>
                  pointIndex !== pointerDownState.lastClickedPoint,
              )
            : selectedPointsIndices
          : selectedPointsIndices?.includes(pointerDownState.lastClickedPoint)
          ? [pointerDownState.lastClickedPoint]
          : selectedPointsIndices,
      isDragging: false,
      pointerOffset: { x: 0, y: 0 },
    };
  }

  static getEditorMidPoints = (
    element: NonDeleted<ExcalidrawLinearElement>,
    elementsMap: ElementsMap,
    appState: InteractiveCanvasAppState,
  ): typeof editorMidPointsCache["points"] => {
    const boundText = getBoundTextElement(element, elementsMap);

    // Since its not needed outside editor unless 2 pointer lines or bound text
    if (
      !appState.editingLinearElement &&
      element.points.length > 2 &&
      !boundText
    ) {
      return [];
    }
    if (
      editorMidPointsCache.version === element.version &&
      editorMidPointsCache.zoom === appState.zoom.value
    ) {
      return editorMidPointsCache.points;
    }
    LinearElementEditor.updateEditorMidPointsCache(
      element,
      elementsMap,
      appState,
    );
    return editorMidPointsCache.points!;
  };

  static updateEditorMidPointsCache = (
    element: NonDeleted<ExcalidrawLinearElement>,
    elementsMap: ElementsMap,
    appState: InteractiveCanvasAppState,
  ) => {
    const points = LinearElementEditor.getPointsGlobalCoordinates(
      element,
      elementsMap,
    );

    let index = 0;
    const midpoints: (GlobalPoint | null)[] = [];
    while (index < points.length - 1) {
      if (
        LinearElementEditor.isSegmentTooShort(
          element,
          element.points[index],
          element.points[index + 1],
          appState.zoom,
        )
      ) {
        midpoints.push(null);
        index++;
        continue;
      }
      const segmentMidPoint = LinearElementEditor.getSegmentMidPoint(
        element,
        points[index],
        points[index + 1],
        index + 1,
        elementsMap,
      );
      midpoints.push(segmentMidPoint);
      index++;
    }
    editorMidPointsCache.points = midpoints;
    editorMidPointsCache.version = element.version;
    editorMidPointsCache.zoom = appState.zoom.value;
  };

  static getSegmentMidpointHitCoords = (
    linearElementEditor: LinearElementEditor,
    scenePointer: { x: number; y: number },
    appState: AppState,
    elementsMap: ElementsMap,
  ): GlobalPoint | null => {
    const { elementId } = linearElementEditor;
    const element = LinearElementEditor.getElement(elementId, elementsMap);
    if (!element) {
      return null;
    }
    const clickedPointIndex = LinearElementEditor.getPointIndexUnderCursor(
      element,
      elementsMap,
      appState.zoom,
      scenePointer.x,
      scenePointer.y,
    );
    if (clickedPointIndex >= 0) {
      return null;
    }
    const points = LinearElementEditor.getPointsGlobalCoordinates(
      element,
      elementsMap,
    );
    if (points.length >= 3 && !appState.editingLinearElement) {
      return null;
    }

    const threshold =
      LinearElementEditor.POINT_HANDLE_SIZE / appState.zoom.value;

    const existingSegmentMidpointHitCoords =
      linearElementEditor.segmentMidPointHoveredCoords;
    if (existingSegmentMidpointHitCoords) {
      const distance = pointDistance(
        pointFrom(
          existingSegmentMidpointHitCoords[0],
          existingSegmentMidpointHitCoords[1],
        ),
        pointFrom(scenePointer.x, scenePointer.y),
      );
      if (distance <= threshold) {
        return existingSegmentMidpointHitCoords;
      }
    }
    let index = 0;
    const midPoints: typeof editorMidPointsCache["points"] =
      LinearElementEditor.getEditorMidPoints(element, elementsMap, appState);
    while (index < midPoints.length) {
      if (midPoints[index] !== null) {
        const distance = pointDistance(
          pointFrom(midPoints[index]![0], midPoints[index]![1]),
          pointFrom(scenePointer.x, scenePointer.y),
        );
        if (distance <= threshold) {
          return midPoints[index];
        }
      }

      index++;
    }
    return null;
  };

  static isSegmentTooShort(
    element: NonDeleted<ExcalidrawLinearElement>,
    startPoint: GlobalPoint | LocalPoint,
    endPoint: GlobalPoint | LocalPoint,
    zoom: AppState["zoom"],
  ) {
    let distance = pointDistance(
      pointFrom(startPoint[0], startPoint[1]),
      pointFrom(endPoint[0], endPoint[1]),
    );
    if (element.points.length > 2 && element.roundness) {
      distance = getBezierCurveLength(element, endPoint);
    }

    return distance * zoom.value < LinearElementEditor.POINT_HANDLE_SIZE * 4;
  }

  static getSegmentMidPoint(
    element: NonDeleted<ExcalidrawLinearElement>,
    startPoint: GlobalPoint,
    endPoint: GlobalPoint,
    endPointIndex: number,
    elementsMap: ElementsMap,
  ): GlobalPoint {
    let segmentMidPoint = pointCenter(startPoint, endPoint);
    if (element.points.length > 2 && element.roundness) {
      const controlPoints = getControlPointsForBezierCurve(
        element,
        element.points[endPointIndex],
      );
      if (controlPoints) {
        const t = mapIntervalToBezierT(
          element,
          element.points[endPointIndex],
          0.5,
        );

        segmentMidPoint = LinearElementEditor.getPointGlobalCoordinates(
          element,
          getBezierXY(
            controlPoints[0],
            controlPoints[1],
            controlPoints[2],
            controlPoints[3],
            t,
          ),
          elementsMap,
        );
      }
    }

    return segmentMidPoint;
  }

  static getSegmentMidPointIndex(
    linearElementEditor: LinearElementEditor,
    appState: AppState,
    midPoint: GlobalPoint,
    elementsMap: ElementsMap,
  ) {
    const element = LinearElementEditor.getElement(
      linearElementEditor.elementId,
      elementsMap,
    );
    if (!element) {
      return -1;
    }
    const midPoints = LinearElementEditor.getEditorMidPoints(
      element,
      elementsMap,
      appState,
    );
    let index = 0;
    while (index < midPoints.length) {
      if (LinearElementEditor.arePointsEqual(midPoint, midPoints[index])) {
        return index + 1;
      }
      index++;
    }
    return -1;
  }

  static handlePointerDown(
    event: React.PointerEvent<HTMLElement>,
    app: AppClassProperties,
    store: Store,
    scenePointer: { x: number; y: number },
    linearElementEditor: LinearElementEditor,
    scene: Scene,
  ): {
    didAddPoint: boolean;
    hitElement: NonDeleted<ExcalidrawElement> | null;
    linearElementEditor: LinearElementEditor | null;
  } {
    const appState = app.state;
    const elementsMap = scene.getNonDeletedElementsMap();
    const elements = scene.getNonDeletedElements();

    const ret: ReturnType<typeof LinearElementEditor["handlePointerDown"]> = {
      didAddPoint: false,
      hitElement: null,
      linearElementEditor: null,
    };

    if (!linearElementEditor) {
      return ret;
    }

    const { elementId } = linearElementEditor;
    const element = LinearElementEditor.getElement(elementId, elementsMap);

    if (!element) {
      return ret;
    }
    const segmentMidpoint = LinearElementEditor.getSegmentMidpointHitCoords(
      linearElementEditor,
      scenePointer,
      appState,
      elementsMap,
    );
    let segmentMidpointIndex = null;
    if (segmentMidpoint) {
      segmentMidpointIndex = LinearElementEditor.getSegmentMidPointIndex(
        linearElementEditor,
        appState,
        segmentMidpoint,
        elementsMap,
      );
    }
    if (event.altKey && appState.editingLinearElement) {
      if (
        linearElementEditor.lastUncommittedPoint == null &&
        !isElbowArrow(element)
      ) {
        mutateElement(element, {
          points: [
            ...element.points,
            LinearElementEditor.createPointAt(
              element,
              elementsMap,
              scenePointer.x,
              scenePointer.y,
              event[KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize(),
            ),
          ],
        });
        ret.didAddPoint = true;
      }
      store.shouldCaptureIncrement();
      ret.linearElementEditor = {
        ...linearElementEditor,
        pointerDownState: {
          prevSelectedPointsIndices: linearElementEditor.selectedPointsIndices,
          lastClickedPoint: -1,
          lastClickedIsEndPoint: false,
          origin: { x: scenePointer.x, y: scenePointer.y },
          segmentMidpoint: {
            value: segmentMidpoint,
            index: segmentMidpointIndex,
            added: false,
          },
        },
        selectedPointsIndices: [element.points.length - 1],
        lastUncommittedPoint: null,
        endBindingElement: getHoveredElementForBinding(
          scenePointer,
          elements,
          elementsMap,
        ),
      };

      ret.didAddPoint = true;
      return ret;
    }

    const clickedPointIndex = LinearElementEditor.getPointIndexUnderCursor(
      element,
      elementsMap,
      appState.zoom,
      scenePointer.x,
      scenePointer.y,
    );
    // if we clicked on a point, set the element as hitElement otherwise
    // it would get deselected if the point is outside the hitbox area
    if (clickedPointIndex >= 0 || segmentMidpoint) {
      ret.hitElement = element;
    } else {
      // You might be wandering why we are storing the binding elements on
      // LinearElementEditor and passing them in, instead of calculating them
      // from the end points of the `linearElement` - this is to allow disabling
      // binding (which needs to happen at the point the user finishes moving
      // the point).
      const { startBindingElement, endBindingElement } = linearElementEditor;
      if (isBindingEnabled(appState) && isBindingElement(element)) {
        bindOrUnbindLinearElement(
          element,
          startBindingElement,
          endBindingElement,
          elementsMap,
          scene,
        );
      }
    }

    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, elementsMap);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const targetPoint =
      clickedPointIndex > -1 &&
      pointRotateRads(
        pointFrom(
          element.x + element.points[clickedPointIndex][0],
          element.y + element.points[clickedPointIndex][1],
        ),
        pointFrom(cx, cy),
        element.angle,
      );

    const nextSelectedPointsIndices =
      clickedPointIndex > -1 || event.shiftKey
        ? event.shiftKey ||
          linearElementEditor.selectedPointsIndices?.includes(clickedPointIndex)
          ? normalizeSelectedPoints([
              ...(linearElementEditor.selectedPointsIndices || []),
              clickedPointIndex,
            ])
          : [clickedPointIndex]
        : null;
    ret.linearElementEditor = {
      ...linearElementEditor,
      pointerDownState: {
        prevSelectedPointsIndices: linearElementEditor.selectedPointsIndices,
        lastClickedPoint: clickedPointIndex,
        lastClickedIsEndPoint: clickedPointIndex === element.points.length - 1,
        origin: { x: scenePointer.x, y: scenePointer.y },
        segmentMidpoint: {
          value: segmentMidpoint,
          index: segmentMidpointIndex,
          added: false,
        },
      },
      selectedPointsIndices: nextSelectedPointsIndices,
      pointerOffset: targetPoint
        ? {
            x: scenePointer.x - targetPoint[0],
            y: scenePointer.y - targetPoint[1],
          }
        : { x: 0, y: 0 },
    };

    return ret;
  }

  static arePointsEqual<Point extends LocalPoint | GlobalPoint>(
    point1: Point | null,
    point2: Point | null,
  ) {
    if (!point1 && !point2) {
      return true;
    }
    if (!point1 || !point2) {
      return false;
    }
    return pointsEqual(point1, point2);
  }

  static handlePointerMove(
    event: React.PointerEvent<HTMLCanvasElement>,
    scenePointerX: number,
    scenePointerY: number,
    app: AppClassProperties,
    elementsMap: NonDeletedSceneElementsMap | SceneElementsMap,
  ): LinearElementEditor | null {
    const appState = app.state;
    if (!appState.editingLinearElement) {
      return null;
    }
    const { elementId, lastUncommittedPoint } = appState.editingLinearElement;
    const element = LinearElementEditor.getElement(elementId, elementsMap);
    if (!element) {
      return appState.editingLinearElement;
    }

    const { points } = element;
    const lastPoint = points[points.length - 1];

    if (!event.altKey) {
      if (lastPoint === lastUncommittedPoint) {
        LinearElementEditor.deletePoints(
          element,
          [points.length - 1],
          elementsMap,
        );
      }
      return {
        ...appState.editingLinearElement,
        lastUncommittedPoint: null,
      };
    }

    let newPoint: LocalPoint;

    if (shouldRotateWithDiscreteAngle(event) && points.length >= 2) {
      const lastCommittedPoint = points[points.length - 2];

      const [width, height] = LinearElementEditor._getShiftLockedDelta(
        element,
        elementsMap,
        lastCommittedPoint,
        pointFrom(scenePointerX, scenePointerY),
        event[KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize(),
      );

      newPoint = pointFrom(
        width + lastCommittedPoint[0],
        height + lastCommittedPoint[1],
      );
    } else {
      newPoint = LinearElementEditor.createPointAt(
        element,
        elementsMap,
        scenePointerX - appState.editingLinearElement.pointerOffset.x,
        scenePointerY - appState.editingLinearElement.pointerOffset.y,
        event[KEYS.CTRL_OR_CMD] || isElbowArrow(element)
          ? null
          : app.getEffectiveGridSize(),
      );
    }

    if (lastPoint === lastUncommittedPoint) {
      LinearElementEditor.movePoints(
        element,
        [
          {
            index: element.points.length - 1,
            point: newPoint,
          },
        ],
        elementsMap,
      );
    } else {
      LinearElementEditor.addPoints(
        element,
        [{ point: newPoint }],
        elementsMap,
      );
    }
    return {
      ...appState.editingLinearElement,
      lastUncommittedPoint: element.points[element.points.length - 1],
    };
  }

  /** scene coords */
  static getPointGlobalCoordinates(
    element: NonDeleted<ExcalidrawLinearElement>,
    p: LocalPoint,
    elementsMap: ElementsMap,
  ): GlobalPoint {
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, elementsMap);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;

    const { x, y } = element;
    return pointRotateRads(
      pointFrom(x + p[0], y + p[1]),
      pointFrom(cx, cy),
      element.angle,
    );
  }

  /** scene coords */
  static getPointsGlobalCoordinates(
    element: NonDeleted<ExcalidrawLinearElement>,
    elementsMap: ElementsMap,
  ): GlobalPoint[] {
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, elementsMap);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    return element.points.map((p) => {
      const { x, y } = element;
      return pointRotateRads(
        pointFrom(x + p[0], y + p[1]),
        pointFrom(cx, cy),
        element.angle,
      );
    });
  }

  static getPointAtIndexGlobalCoordinates(
    element: NonDeleted<ExcalidrawLinearElement>,

    indexMaybeFromEnd: number, // -1 for last element
    elementsMap: ElementsMap,
  ): GlobalPoint {
    const index =
      indexMaybeFromEnd < 0
        ? element.points.length + indexMaybeFromEnd
        : indexMaybeFromEnd;
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, elementsMap);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const p = element.points[index];
    const { x, y } = element;

    return p
      ? pointRotateRads(
          pointFrom(x + p[0], y + p[1]),
          pointFrom(cx, cy),
          element.angle,
        )
      : pointRotateRads(pointFrom(x, y), pointFrom(cx, cy), element.angle);
  }

  static pointFromAbsoluteCoords(
    element: NonDeleted<ExcalidrawLinearElement>,
    absoluteCoords: GlobalPoint,
    elementsMap: ElementsMap,
  ): LocalPoint {
    if (isElbowArrow(element)) {
      // No rotation for elbow arrows
      return pointFrom(
        absoluteCoords[0] - element.x,
        absoluteCoords[1] - element.y,
      );
    }

    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, elementsMap);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const [x, y] = pointRotateRads(
      pointFrom(absoluteCoords[0], absoluteCoords[1]),
      pointFrom(cx, cy),
      -element.angle as Radians,
    );
    return pointFrom(x - element.x, y - element.y);
  }

  static getPointIndexUnderCursor(
    element: NonDeleted<ExcalidrawLinearElement>,
    elementsMap: ElementsMap,
    zoom: AppState["zoom"],
    x: number,
    y: number,
  ) {
    const pointHandles = LinearElementEditor.getPointsGlobalCoordinates(
      element,
      elementsMap,
    );
    let idx = pointHandles.length;
    // loop from right to left because points on the right are rendered over
    // points on the left, thus should take precedence when clicking, if they
    // overlap
    while (--idx > -1) {
      const p = pointHandles[idx];
      if (
        pointDistance(pointFrom(x, y), pointFrom(p[0], p[1])) * zoom.value <
        // +1px to account for outline stroke
        LinearElementEditor.POINT_HANDLE_SIZE + 1
      ) {
        return idx;
      }
    }
    return -1;
  }

  static createPointAt(
    element: NonDeleted<ExcalidrawLinearElement>,
    elementsMap: ElementsMap,
    scenePointerX: number,
    scenePointerY: number,
    gridSize: NullableGridSize,
  ): LocalPoint {
    const pointerOnGrid = getGridPoint(scenePointerX, scenePointerY, gridSize);
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, elementsMap);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const [rotatedX, rotatedY] = pointRotateRads(
      pointFrom(pointerOnGrid[0], pointerOnGrid[1]),
      pointFrom(cx, cy),
      -element.angle as Radians,
    );

    return pointFrom(rotatedX - element.x, rotatedY - element.y);
  }

  /**
   * Normalizes line points so that the start point is at [0,0]. This is
   * expected in various parts of the codebase. Also returns new x/y to account
   * for the potential normalization.
   */
  static getNormalizedPoints(element: ExcalidrawLinearElement): {
    points: LocalPoint[];
    x: number;
    y: number;
  } {
    const { points } = element;

    const offsetX = points[0][0];
    const offsetY = points[0][1];

    return {
      points: points.map((p) => {
        return pointFrom(p[0] - offsetX, p[1] - offsetY);
      }),
      x: element.x + offsetX,
      y: element.y + offsetY,
    };
  }

  // element-mutating methods
  // ---------------------------------------------------------------------------

  static normalizePoints(element: NonDeleted<ExcalidrawLinearElement>) {
    mutateElement(element, LinearElementEditor.getNormalizedPoints(element));
  }

  static duplicateSelectedPoints(
    appState: AppState,
    elementsMap: NonDeletedSceneElementsMap | SceneElementsMap,
    element: NonDeleted<ExcalidrawLinearElement>,
    selectedPointsIndices: readonly number[],
  ): AppState {

    const { points } = element;

    const nextSelectedIndices: number[] = [];

    let pointAddedToEnd = false;
    let indexCursor = -1;
    const nextPoints = points.reduce((acc: LocalPoint[], p, index) => {
      ++indexCursor;
      acc.push(p);

      const isSelected = selectedPointsIndices.includes(index);
      if (isSelected) {
        const nextPoint = points[index + 1];

        if (!nextPoint) {
          pointAddedToEnd = true;
        }
        acc.push(
          nextPoint
            ? pointFrom((p[0] + nextPoint[0]) / 2, (p[1] + nextPoint[1]) / 2)
            : pointFrom(p[0], p[1]),
        );

        nextSelectedIndices.push(indexCursor + 1);
        ++indexCursor;
      }

      return acc;
    }, []);

    mutateElement(element, { points: nextPoints });

    // temp hack to ensure the line doesn't move when adding point to the end,
    // potentially expanding the bounding box
    if (pointAddedToEnd) {
      const lastPoint = element.points[element.points.length - 1];
      LinearElementEditor.movePoints(
        element,
        [
          {
            index: element.points.length - 1,
            point: pointFrom(lastPoint[0] + 30, lastPoint[1] + 30),
          },
        ],
        elementsMap,
      );
    }

    return {
      ...appState,
      editingLinearElement: appState.editingLinearElement && {
        ...appState.editingLinearElement,
        selectedPointsIndices: nextSelectedIndices,
      },
    };
  }

  static deletePoints(
    element: NonDeleted<ExcalidrawLinearElement>,
    pointIndices: readonly number[],
    elementsMap: NonDeletedSceneElementsMap | SceneElementsMap,
  ) {
    let offsetX = 0;
    let offsetY = 0;

    const isDeletingOriginPoint = pointIndices.includes(0);

    // if deleting first point, make the next to be [0,0] and recalculate
    // positions of the rest with respect to it
    if (isDeletingOriginPoint) {
      const firstNonDeletedPoint = element.points.find((point, idx) => {
        return !pointIndices.includes(idx);
      });
      if (firstNonDeletedPoint) {
        offsetX = firstNonDeletedPoint[0];
        offsetY = firstNonDeletedPoint[1];
      }
    }

    const nextPoints = element.points.reduce((acc: LocalPoint[], p, idx) => {
      if (!pointIndices.includes(idx)) {
        acc.push(
          !acc.length
            ? pointFrom(0, 0)
            : pointFrom(p[0] - offsetX, p[1] - offsetY),
        );
      }
      return acc;
    }, []);

    LinearElementEditor._updatePoints(
      element,
      nextPoints,
      offsetX,
      offsetY,
      elementsMap,
    );
  }

  static addPoints(
    element: NonDeleted<ExcalidrawLinearElement>,
    targetPoints: { point: LocalPoint }[],
    elementsMap: NonDeletedSceneElementsMap | SceneElementsMap,
  ) {
    const offsetX = 0;
    const offsetY = 0;

    const nextPoints = [...element.points, ...targetPoints.map((x) => x.point)];
    LinearElementEditor._updatePoints(
      element,
      nextPoints,
      offsetX,
      offsetY,
      elementsMap,
    );
  }

  static movePoints(
    element: NonDeleted<ExcalidrawLinearElement>,
    targetPoints: { index: number; point: LocalPoint; isDragging?: boolean }[],
    elementsMap: NonDeletedSceneElementsMap | SceneElementsMap,
    otherUpdates?: {
      startBinding?: PointBinding | null;
      endBinding?: PointBinding | null;
    },
    options?: {
      changedElements?: Map<string, OrderedExcalidrawElement>;
      isDragging?: boolean;
    },
  ) {
    const { points } = element;

    // in case we're moving start point, instead of modifying its position
    // which would break the invariant of it being at [0,0], we move
    // all the other points in the opposite direction by delta to
    // offset it. We do the same with actual element.x/y position, so
    // this hacks are completely transparent to the user.
    let offsetX = 0;
    let offsetY = 0;

    const selectedOriginPoint = targetPoints.find(({ index }) => index === 0);

    if (selectedOriginPoint) {
      offsetX =
        selectedOriginPoint.point[0] + points[selectedOriginPoint.index][0];
      offsetY =
        selectedOriginPoint.point[1] + points[selectedOriginPoint.index][1];
    }

    const nextPoints: LocalPoint[] = points.map((p, idx) => {
      const selectedPointData = targetPoints.find((t) => t.index === idx);
      if (selectedPointData) {
        if (selectedPointData.index === 0) {
          return p;
        }

        const deltaX =
          selectedPointData.point[0] - points[selectedPointData.index][0];
        const deltaY =
          selectedPointData.point[1] - points[selectedPointData.index][1];

        return pointFrom(p[0] + deltaX - offsetX, p[1] + deltaY - offsetY);
      }
      return offsetX || offsetY ? pointFrom(p[0] - offsetX, p[1] - offsetY) : p;
    });

    LinearElementEditor._updatePoints(
      element,
      nextPoints,
      offsetX,
      offsetY,
      elementsMap,
      otherUpdates,
      {
        isDragging: targetPoints.reduce(
          (dragging, targetPoint): boolean =>
            dragging || targetPoint.isDragging === true,
          false,
        ),
        changedElements: options?.changedElements,
      },
    );
  }

  static shouldAddMidpoint(
    linearElementEditor: LinearElementEditor,
    pointerCoords: PointerCoords,
    appState: AppState,
    elementsMap: ElementsMap,
  ) {
    const element = LinearElementEditor.getElement(
      linearElementEditor.elementId,
      elementsMap,
    );

    // Elbow arrows don't allow midpoints
    if (element && isElbowArrow(element)) {
      return false;
    }

    if (!element) {
      return false;
    }

    const { segmentMidpoint } = linearElementEditor.pointerDownState;

    if (
      segmentMidpoint.added ||
      segmentMidpoint.value === null ||
      segmentMidpoint.index === null ||
      linearElementEditor.pointerDownState.origin === null
    ) {
      return false;
    }

    const origin = linearElementEditor.pointerDownState.origin!;
    const dist = pointDistance(
      pointFrom(origin.x, origin.y),
      pointFrom(pointerCoords.x, pointerCoords.y),
    );
    if (
      !appState.editingLinearElement &&
      dist < DRAGGING_THRESHOLD / appState.zoom.value
    ) {
      return false;
    }
    return true;
  }

  static addMidpoint(
    linearElementEditor: LinearElementEditor,
    pointerCoords: PointerCoords,
    app: AppClassProperties,
    snapToGrid: boolean,
    elementsMap: ElementsMap,
  ) {
    const element = LinearElementEditor.getElement(
      linearElementEditor.elementId,
      elementsMap,
    );
    if (!element) {
      return;
    }
    const { segmentMidpoint } = linearElementEditor.pointerDownState;
    const ret: {
      pointerDownState: LinearElementEditor["pointerDownState"];
      selectedPointsIndices: LinearElementEditor["selectedPointsIndices"];
    } = {
      pointerDownState: linearElementEditor.pointerDownState,
      selectedPointsIndices: linearElementEditor.selectedPointsIndices,
    };

    const midpoint = LinearElementEditor.createPointAt(
      element,
      elementsMap,
      pointerCoords.x,
      pointerCoords.y,
      snapToGrid && !isElbowArrow(element) ? app.getEffectiveGridSize() : null,
    );
    const points = [
      ...element.points.slice(0, segmentMidpoint.index!),
      midpoint,
      ...element.points.slice(segmentMidpoint.index!),
    ];

    mutateElement(element, {
      points,
    });

    ret.pointerDownState = {
      ...linearElementEditor.pointerDownState,
      segmentMidpoint: {
        ...linearElementEditor.pointerDownState.segmentMidpoint,
        added: true,
      },
      lastClickedPoint: segmentMidpoint.index!,
    };
    ret.selectedPointsIndices = [segmentMidpoint.index!];
    return ret;
  }

  private static _updatePoints(
    element: NonDeleted<ExcalidrawLinearElement>,
    nextPoints: readonly LocalPoint[],
    offsetX: number,
    offsetY: number,
    elementsMap: NonDeletedSceneElementsMap | SceneElementsMap,
    otherUpdates?: {
      startBinding?: PointBinding | null;
      endBinding?: PointBinding | null;
    },
    options?: {
      changedElements?: Map<string, OrderedExcalidrawElement>;
      isDragging?: boolean;
    },
  ) {
    if (isElbowArrow(element)) {
      const bindings: {
        startBinding?: FixedPointBinding | null;
        endBinding?: FixedPointBinding | null;
      } = {};
      if (otherUpdates?.startBinding !== undefined) {
        bindings.startBinding =
          otherUpdates.startBinding !== null &&
          isFixedPointBinding(otherUpdates.startBinding)
            ? otherUpdates.startBinding
            : null;
      }
      if (otherUpdates?.endBinding !== undefined) {
        bindings.endBinding =
          otherUpdates.endBinding !== null &&
          isFixedPointBinding(otherUpdates.endBinding)
            ? otherUpdates.endBinding
            : null;
      }

      const mergedElementsMap = options?.changedElements
        ? toBrandedType<SceneElementsMap>(
            new Map([...elementsMap, ...options.changedElements]),
          )
        : elementsMap;

      mutateElbowArrow(
        element,
        mergedElementsMap,
        nextPoints,
        vector(offsetX, offsetY),
        bindings,
        {
          isDragging: options?.isDragging,
        },
      );
    } else {
      const nextCoords = getElementPointsCoords(element, nextPoints);
      const prevCoords = getElementPointsCoords(element, element.points);
      const nextCenterX = (nextCoords[0] + nextCoords[2]) / 2;
      const nextCenterY = (nextCoords[1] + nextCoords[3]) / 2;
      const prevCenterX = (prevCoords[0] + prevCoords[2]) / 2;
      const prevCenterY = (prevCoords[1] + prevCoords[3]) / 2;
      const dX = prevCenterX - nextCenterX;
      const dY = prevCenterY - nextCenterY;
      const rotated = pointRotateRads(
        pointFrom(offsetX, offsetY),
        pointFrom(dX, dY),
        element.angle,
      );
      mutateElement(element, {
        ...otherUpdates,
        points: nextPoints,
        x: element.x + rotated[0],
        y: element.y + rotated[1],
      });
    }
  }

  private static _getShiftLockedDelta(
    element: NonDeleted<ExcalidrawLinearElement>,
    elementsMap: ElementsMap,
    referencePoint: LocalPoint,
    scenePointer: GlobalPoint,
    gridSize: NullableGridSize,
  ) {
    const referencePointCoords = LinearElementEditor.getPointGlobalCoordinates(
      element,
      referencePoint,
      elementsMap,
    );

    if (isElbowArrow(element)) {
      return [
        scenePointer[0] - referencePointCoords[0],
        scenePointer[1] - referencePointCoords[1],
      ];
    }

    const [gridX, gridY] = getGridPoint(
      scenePointer[0],
      scenePointer[1],
      gridSize,
    );

    const { width, height } = getLockedLinearCursorAlignSize(
      referencePointCoords[0],
      referencePointCoords[1],
      gridX,
      gridY,
    );

    return pointRotateRads(
      pointFrom(width, height),
      pointFrom(0, 0),
      -element.angle as Radians,
    );
  }

  static getBoundTextElementPosition = (
    element: ExcalidrawLinearElement,
    boundTextElement: ExcalidrawTextElementWithContainer,
    elementsMap: ElementsMap,
  ): { x: number; y: number } => {
    const points = LinearElementEditor.getPointsGlobalCoordinates(
      element,
      elementsMap,
    );
    if (points.length < 2) {
      mutateElement(boundTextElement, { isDeleted: true });
    }
    let x = 0;
    let y = 0;
    if (element.points.length % 2 === 1) {
      const index = Math.floor(element.points.length / 2);
      const midPoint = LinearElementEditor.getPointGlobalCoordinates(
        element,
        element.points[index],
        elementsMap,
      );
      x = midPoint[0] - boundTextElement.width / 2;
      y = midPoint[1] - boundTextElement.height / 2;
    } else {
      const index = element.points.length / 2 - 1;

      let midSegmentMidpoint = editorMidPointsCache.points[index];
      if (element.points.length === 2) {
        midSegmentMidpoint = pointCenter(points[0], points[1]);
      }
      if (
        !midSegmentMidpoint ||
        editorMidPointsCache.version !== element.version
      ) {
        midSegmentMidpoint = LinearElementEditor.getSegmentMidPoint(
          element,
          points[index],
          points[index + 1],
          index + 1,
          elementsMap,
        );
      }
      x = midSegmentMidpoint[0] - boundTextElement.width / 2;
      y = midSegmentMidpoint[1] - boundTextElement.height / 2;
    }
    return { x, y };
  };

  static getMinMaxXYWithBoundText = (
    element: ExcalidrawLinearElement,
    elementsMap: ElementsMap,
    elementBounds: Bounds,
    boundTextElement: ExcalidrawTextElementWithContainer,
  ): [number, number, number, number, number, number] => {
    let [x1, y1, x2, y2] = elementBounds;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const { x: boundTextX1, y: boundTextY1 } =
      LinearElementEditor.getBoundTextElementPosition(
        element,
        boundTextElement,
        elementsMap,
      );
    const boundTextX2 = boundTextX1 + boundTextElement.width;
    const boundTextY2 = boundTextY1 + boundTextElement.height;
    const centerPoint = pointFrom(cx, cy);

    const topLeftRotatedPoint = pointRotateRads(
      pointFrom(x1, y1),
      centerPoint,
      element.angle,
    );
    const topRightRotatedPoint = pointRotateRads(
      pointFrom(x2, y1),
      centerPoint,
      element.angle,
    );

    const counterRotateBoundTextTopLeft = pointRotateRads(
      pointFrom(boundTextX1, boundTextY1),
      centerPoint,
      -element.angle as Radians,
    );
    const counterRotateBoundTextTopRight = pointRotateRads(
      pointFrom(boundTextX2, boundTextY1),
      centerPoint,
      -element.angle as Radians,
    );
    const counterRotateBoundTextBottomLeft = pointRotateRads(
      pointFrom(boundTextX1, boundTextY2),
      centerPoint,
      -element.angle as Radians,
    );
    const counterRotateBoundTextBottomRight = pointRotateRads(
      pointFrom(boundTextX2, boundTextY2),
      centerPoint,
      -element.angle as Radians,
    );

    if (
      topLeftRotatedPoint[0] < topRightRotatedPoint[0] &&
      topLeftRotatedPoint[1] >= topRightRotatedPoint[1]
    ) {
      x1 = Math.min(x1, counterRotateBoundTextBottomLeft[0]);
      x2 = Math.max(
        x2,
        Math.max(
          counterRotateBoundTextTopRight[0],
          counterRotateBoundTextBottomRight[0],
        ),
      );
      y1 = Math.min(y1, counterRotateBoundTextTopLeft[1]);

      y2 = Math.max(y2, counterRotateBoundTextBottomRight[1]);
    } else if (
      topLeftRotatedPoint[0] >= topRightRotatedPoint[0] &&
      topLeftRotatedPoint[1] > topRightRotatedPoint[1]
    ) {
      x1 = Math.min(x1, counterRotateBoundTextBottomRight[0]);
      x2 = Math.max(
        x2,
        Math.max(
          counterRotateBoundTextTopLeft[0],
          counterRotateBoundTextTopRight[0],
        ),
      );
      y1 = Math.min(y1, counterRotateBoundTextBottomLeft[1]);

      y2 = Math.max(y2, counterRotateBoundTextTopRight[1]);
    } else if (topLeftRotatedPoint[0] >= topRightRotatedPoint[0]) {
      x1 = Math.min(x1, counterRotateBoundTextTopRight[0]);
      x2 = Math.max(x2, counterRotateBoundTextBottomLeft[0]);
      y1 = Math.min(y1, counterRotateBoundTextBottomRight[1]);

      y2 = Math.max(y2, counterRotateBoundTextTopLeft[1]);
    } else if (topLeftRotatedPoint[1] <= topRightRotatedPoint[1]) {
      x1 = Math.min(
        x1,
        Math.min(
          counterRotateBoundTextTopRight[0],
          counterRotateBoundTextTopLeft[0],
        ),
      );

      x2 = Math.max(x2, counterRotateBoundTextBottomRight[0]);
      y1 = Math.min(y1, counterRotateBoundTextTopRight[1]);
      y2 = Math.max(y2, counterRotateBoundTextBottomLeft[1]);
    }

    return [x1, y1, x2, y2, cx, cy];
  };

  static getElementAbsoluteCoords = (
    element: ExcalidrawLinearElement,
    elementsMap: ElementsMap,
    includeBoundText: boolean = false,
  ): [number, number, number, number, number, number] => {
    let coords: [number, number, number, number, number, number];
    let x1;
    let y1;
    let x2;
    let y2;
    if (element.points.length < 2 || !ShapeCache.get(element)) {
      // XXX this is just a poor estimate and not very useful
      const { minX, minY, maxX, maxY } = element.points.reduce(
        (limits, [x, y]) => {
          limits.minY = Math.min(limits.minY, y);
          limits.minX = Math.min(limits.minX, x);

          limits.maxX = Math.max(limits.maxX, x);
          limits.maxY = Math.max(limits.maxY, y);

          return limits;
        },
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
      );
      x1 = minX + element.x;
      y1 = minY + element.y;
      x2 = maxX + element.x;
      y2 = maxY + element.y;
    } else {
      const shape = ShapeCache.generateElementShape(element, null);

      // first element is always the curve
      const ops = getCurvePathOps(shape[0]);

      const [minX, minY, maxX, maxY] = getMinMaxXYFromCurvePathOps(ops);
      x1 = minX + element.x;
      y1 = minY + element.y;
      x2 = maxX + element.x;
      y2 = maxY + element.y;
    }
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    coords = [x1, y1, x2, y2, cx, cy];

    if (!includeBoundText) {
      return coords;
    }
    const boundTextElement = getBoundTextElement(element, elementsMap);
    if (boundTextElement) {
      coords = LinearElementEditor.getMinMaxXYWithBoundText(
        element,
        elementsMap,
        [x1, y1, x2, y2],
        boundTextElement,
      );
    }

    return coords;
  };
}

const normalizeSelectedPoints = (
  points: (number | null)[],
): number[] | null => {
  let nextPoints = [
    ...new Set(points.filter((p) => p !== null && p !== -1)),
  ] as number[];
  nextPoints = nextPoints.sort((a, b) => a - b);
  return nextPoints.length ? nextPoints : null;
};

import type { AppState } from "../types";
import { sceneCoordsToViewportCoords } from "../utils";
import type { ElementsMap, NonDeletedExcalidrawElement } from "./types";
import { getElementAbsoluteCoords } from ".";
import { useExcalidrawAppState } from "../components/App";

import "./ElementCanvasButtons.scss";
import { pointFrom } from "../../math";

const CONTAINER_PADDING = 5;

const getContainerCoords = (
  element: NonDeletedExcalidrawElement,
  appState: AppState,
  elementsMap: ElementsMap,
) => {
  const [x1, y1] = getElementAbsoluteCoords(element, elementsMap);
  const [viewportX, viewportY] = sceneCoordsToViewportCoords(
    pointFrom(x1 + element.width, y1),
    appState,
  );
  const x = viewportX - appState.offsetLeft + 10;
  const y = viewportY - appState.offsetTop;
  return { x, y };
};

export const ElementCanvasButtons = ({
  children,
  element,
  elementsMap,
}: {
  children: React.ReactNode;
  element: NonDeletedExcalidrawElement;
  elementsMap: ElementsMap;
}) => {
  const appState = useExcalidrawAppState();

  if (
    appState.contextMenu ||
    appState.newElement ||
    appState.resizingElement ||
    appState.isRotating ||
    appState.openMenu ||
    appState.viewModeEnabled
  ) {
    return null;
  }

  const { x, y } = getContainerCoords(element, appState, elementsMap);

  return (
    <div
      className="excalidraw-canvas-buttons"
      style={{
        top: `${y}px`,
        left: `${x}px`,
        // width: CONTAINER_WIDTH,
        padding: CONTAINER_PADDING,
      }}
    >
      {children}
    </div>
  );
};

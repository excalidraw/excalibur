import { AppState, Point } from "../types";
import { sceneCoordsToViewportCoords } from "../utils";
import { mutateElement } from "./mutateElement";
import { NonDeletedExcalidrawElement } from "./types";

import "./Hyperlink.scss";
import { register } from "../actions/register";
import { ToolButton } from "../components/ToolButton";
import { editIcon, link, trash } from "../components/icons";
import { t } from "../i18n";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import { KEYS } from "../keys";
import { DEFAULT_LINK_SIZE } from "../renderer/renderElement";
import { rotate } from "../math";
import { EVENT, MIME_TYPES } from "../constants";
import { Bounds } from "./bounds";
import { getElementAbsoluteCoords } from ".";
import { getTooltipDiv } from "../components/Tooltip";
import { getSelectedElements } from "../scene";

const VALID_PREFIXES = ["https://", "http://", "ftp://"];
const CONTAINER_WIDTH = 320;
const SPACE_BOTTOM = 85;
const CONTAINER_PADDING = 8;
const CONTAINER_HEIGHT = 42;

export const EXTERNAL_LINK_IMG = document.createElement("img");
EXTERNAL_LINK_IMG.src = `data:${MIME_TYPES.svg}, ${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1971c2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
)}`;

export const Hyperlink = ({
  element,
  appState,
  onSubmit,
  editView = false,
}: {
  element: NonDeletedExcalidrawElement;
  appState: AppState;
  onSubmit: () => void;
  editView: boolean;
}) => {
  const linkVal = element.link || "";

  const [isEditing, setIsEditing] = useState(editView);
  const [inputVal, setInputVal] = useState(linkVal);
  const [autoHide, setAutoHide] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const showInput = isEditing || !linkVal;

  const handleSubmit = useCallback(() => {
    if (!inputRef.current) {
      return;
    }

    const link = getAbsoluteLink(inputRef.current.value);

    if (link === element.link) {
      return;
    }
    mutateElement(element, { link });
    setIsEditing(false);
  }, [element]);

  useLayoutEffect(() => {
    return () => {
      handleSubmit();
    };
  }, [handleSubmit]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (isEditing) {
        return;
      }
      const shouldHide = shouldHideLinkPopup(element, appState, [
        event.clientX,
        event.clientY,
      ]) as boolean;
      setAutoHide(shouldHide);
    };
    window.addEventListener(EVENT.POINTER_MOVE, handlePointerMove, false);
    return () => {
      window.removeEventListener(EVENT.POINTER_MOVE, handlePointerMove, false);
    };
  }, [appState, element, isEditing]);

  const handleRemove = useCallback(() => {
    mutateElement(element, { link: null });
    if (showInput) {
      inputRef.current!.value = "";
    }
    onSubmit();
  }, [onSubmit, element, showInput]);

  const onEdit = () => {
    setIsEditing(true);
  };
  const { x, y } = getCoordsForPopover(element, appState);
  if (autoHide) {
    return null;
  }
  return (
    <div
      className="excalidraw-hyperlinkContainer"
      style={{
        top: `${y}px`,
        left: `${x}px`,
        width: CONTAINER_WIDTH,
        padding: CONTAINER_PADDING,
      }}
    >
      {showInput ? (
        <input
          className={clsx("excalidraw-hyperlinkContainer-input")}
          placeholder="Type or paste your link here"
          ref={inputRef}
          value={inputVal}
          onChange={(event) => setInputVal(event.target.value)}
          autoFocus
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === KEYS.ENTER || event.key === KEYS.ESCAPE) {
              handleSubmit();
            }
          }}
        />
      ) : (
        <a
          href={element.link || ""}
          className={clsx("excalidraw-hyperlinkContainer-link", {
            "d-none": isEditing,
          })}
          target="_blank"
          rel="noreferrer"
        >
          {element.link}
        </a>
      )}
      <div>
        {!showInput && (
          <ToolButton
            type="button"
            title={t("buttons.edit")}
            aria-label={t("buttons.edit")}
            label={t("buttons.edit")}
            onClick={onEdit}
            className="excalidraw-hyperlinkContainer--edit"
            icon={editIcon}
          />
        )}

        {linkVal && (
          <ToolButton
            type="button"
            title={t("buttons.remove")}
            aria-label={t("buttons.remove")}
            label={t("buttons.remove")}
            onClick={handleRemove}
            className="excalidraw-hyperlinkContainer--remove"
            icon={trash}
          />
        )}
      </div>
    </div>
  );
};

const getCoordsForPopover = (
  element: NonDeletedExcalidrawElement,
  appState: AppState,
) => {
  const { x: viewPortX, y: viewPortY } = sceneCoordsToViewportCoords(
    { sceneX: element.x, sceneY: element.y },
    appState,
  );
  const x = viewPortX + element.width / 2 - CONTAINER_WIDTH / 2;

  const y = viewPortY - SPACE_BOTTOM;
  return { x, y };
};

export const getAbsoluteLink = (link?: string) => {
  if (link) {
    const match = VALID_PREFIXES.find((prefix) => link!.startsWith(prefix));

    // prefix with https if no match
    if (!match) {
      link = `${VALID_PREFIXES[0]}${link}`;
    }
  }
  return link;
};

export const actionLink = register({
  name: "link",
  perform: (elements, appState) => {
    return {
      elements,
      appState: {
        ...appState,
        showHyperlinkPopup: !appState.showHyperlinkPopup,
        showEditViewInLinkPopup: true,
      },
      commitToHistory: true,
    };
  },
  keyTest: (event) => event[KEYS.CTRL_OR_CMD] && event.key === KEYS.K,
  contextItemLabel: (elements, appState) =>
    getContextMenuLabel(elements, appState),
  PanelComponent: ({ elements, appState, updateData }) => {
    return (
      <ToolButton
        type="button"
        icon={link}
        aria-label={t(getContextMenuLabel(elements, appState))}
        onClick={() => updateData(null)}
      />
    );
  },
});

export const getContextMenuLabel = (
  elements: readonly NonDeletedExcalidrawElement[],
  appState: AppState,
) => {
  const selectedElements = getSelectedElements(elements, appState);
  const label = selectedElements[0]!.link
    ? "labels.link.edit"
    : "labels.link.create";
  return label;
};
export const getLinkHandleFromCoords = (
  [x1, y1, x2, y2]: Bounds,
  angle: number,
  appState: AppState,
): [number, number, number, number] => {
  const size = DEFAULT_LINK_SIZE;
  const linkWidth = size / appState.zoom.value;
  const linkHeight = size / appState.zoom.value;
  const linkMarginY = size / appState.zoom.value;
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const centeringOffset = (size - 8) / (2 * appState.zoom.value);
  const dashedLineMargin = 4 / appState.zoom.value;

  // Same as `ne` resize handle
  const x = x2 + dashedLineMargin - centeringOffset;
  const y = y1 - dashedLineMargin - linkMarginY + centeringOffset;

  const [rotatedX, rotatedY] = rotate(
    x + linkWidth / 2,
    y + linkHeight / 2,
    centerX,
    centerY,
    angle,
  );
  return [
    rotatedX - linkWidth / 2,
    rotatedY - linkHeight / 2,
    linkWidth,
    linkHeight,
  ];
};

export const isPointHittingLinkIcon = (
  element: NonDeletedExcalidrawElement,
  appState: AppState,
  [x, y]: Point,
) => {
  const threshold = 10 / appState.zoom.value;

  const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);

  const [linkX, linkY, linkWidth, linkHeight] = getLinkHandleFromCoords(
    [x1, y1, x2, y2],
    element.angle,
    appState,
  );
  const hitLink =
    x > linkX - threshold &&
    x < linkX + threshold + linkWidth &&
    y > linkY - threshold &&
    y < linkY + linkHeight + threshold;

  return hitLink;
};

export const showHyperlinkTooltip = (
  element: NonDeletedExcalidrawElement,
  appState: AppState,
) => {
  const tooltipDiv = getTooltipDiv();
  const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);

  const [linkX, linkY] = getLinkHandleFromCoords(
    [x1, y1, x2, y2],
    element.angle,
    appState,
  );
  const { x, y } = sceneCoordsToViewportCoords(
    { sceneX: linkX, sceneY: linkY },
    appState,
  );

  const tooltipX = x - 80;
  const tooltipY = y - 40;

  tooltipDiv.style.top = `${tooltipY}px`;
  tooltipDiv.style.left = `${tooltipX}px`;
  tooltipDiv.classList.add("excalidraw-tooltip--visible");
  tooltipDiv.style.maxWidth = "20rem";
  tooltipDiv.innerHTML = element.link!;
};

export const hideHyperlinkToolip = () => {
  getTooltipDiv().classList.remove("excalidraw-tooltip--visible");
};

export const shouldHideLinkPopup = (
  element: NonDeletedExcalidrawElement,
  appState: AppState,
  [clientX, clientY]: Point,
): Boolean => {
  const { x, y } = sceneCoordsToViewportCoords(
    { sceneX: element.x, sceneY: element.y },
    appState,
  );

  const threshold = 15 / appState.zoom.value;

  // hitbox to prevent hiding when hovered in element bounding box
  if (
    clientX >= x - threshold &&
    clientX <= x + element.width + threshold &&
    clientY >= y - threshold &&
    clientY <= y + element.height + threshold
  ) {
    return false;
  }

  // hit box to prevent hiding when hovered in the vertical area between element and popover
  if (
    clientX >= x - threshold &&
    clientX <= x + element.width + threshold &&
    clientY >= y &&
    clientY <= y + SPACE_BOTTOM
  ) {
    return false;
  }
  // hit box to prevent hiding when hovered around popover within threshold
  const { x: popoverX, y: popoverY } = getCoordsForPopover(element, appState);

  if (
    clientX >= popoverX - threshold &&
    clientX <= popoverX + CONTAINER_WIDTH + CONTAINER_PADDING * 2 + threshold &&
    clientY >= popoverY - threshold &&
    clientY <= popoverY + threshold + CONTAINER_PADDING * 2 + CONTAINER_HEIGHT
  ) {
    return false;
  }
  return true;
};

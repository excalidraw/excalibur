import React from "react";
import { t } from "../i18n";
import { NonDeletedExcalidrawElement } from "../element/types";
import { getSelectedElements } from "../scene";

import "./HintViewer.scss";
import { AppState } from "../types";
import { isLinearElement, isTextElement } from "../element/typeChecks";
import { getShortcutKey } from "../utils";

interface Hint {
  appState: AppState;
  elements: readonly NonDeletedExcalidrawElement[];
}

const getHints = ({ appState, elements }: Hint) => {
  const {
    elementType,
    isResizing,
    isRotating,
    lastPointerDownWith,
    isLinking,
  } = appState;

  const multiMode = appState.multiElement !== null;

  if (isLinking) {
    return t("hints.link");
  }

  if (elementType === "arrow" || elementType === "line") {
    if (!multiMode) {
      return t("hints.linearElement");
    }
    return t("hints.linearElementMulti");
  }

  if (elementType === "freedraw") {
    return t("hints.freeDraw");
  }

  if (elementType === "text") {
    return t("hints.text");
  }

  const selectedElements = getSelectedElements(elements, appState);
  if (
    isResizing &&
    lastPointerDownWith === "mouse" &&
    selectedElements.length === 1
  ) {
    const targetElement = selectedElements[0];
    if (isLinearElement(targetElement) && targetElement.points.length === 2) {
      return t("hints.lockAngle");
    }
    return t("hints.resize");
  }

  if (isRotating && lastPointerDownWith === "mouse") {
    return t("hints.rotate");
  }

  if (selectedElements.length === 1 && isLinearElement(selectedElements[0])) {
    if (appState.editingLinearElement) {
      return appState.editingLinearElement.activePointIndex
        ? t("hints.lineEditor_pointSelected")
        : t("hints.lineEditor_nothingSelected");
    }
    return t("hints.lineEditor_info");
  }

  if (selectedElements.length === 1 && isTextElement(selectedElements[0])) {
    return t("hints.text_selected");
  }

  if (appState.editingElement && isTextElement(appState.editingElement)) {
    return t("hints.text_editing");
  }

  return null;
};

export const HintViewer = ({ appState, elements }: Hint) => {
  let hint = getHints({
    appState,
    elements,
  });
  if (!hint) {
    return null;
  }

  hint = getShortcutKey(hint);

  return (
    <div className="HintViewer">
      <span>{hint}</span>
    </div>
  );
};

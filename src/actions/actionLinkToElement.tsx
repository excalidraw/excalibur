import React from "react";
import { LinkIcon, UnlinkIcon } from "../components/icons";
import { ToolButton } from "../components/ToolButton";
import { CURSOR_TYPE } from "../constants";
import { getNonDeletedElements } from "../element";
import { newElementWith } from "../element/mutateElement";
import { ExcalidrawElement } from "../element/types";
import {
  getSelectedGroupIds,
  removeFromSelectedGroups,
  selectGroupsForSelectedElements,
} from "../groups";
import { t } from "../i18n";
import { CODES, KEYS } from "../keys";
import { getSelectedElements, isSomeElementSelected } from "../scene";
import { AppState } from "../types";
import { getShortcutKey, setCursor } from "../utils";
import { register } from "./register";

const allElementsAlreadyLinked = (elements: readonly ExcalidrawElement[]) => {
  if (elements.length > 0) {
    return false; // elements.every((element) => element.linkedTo);
  }

  return false;
};

const enableActionLink = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
) => {
  const selectedElements = getSelectedElements(
    getNonDeletedElements(elements),
    appState,
  );
  return (
    selectedElements.length >= 1 && !allElementsAlreadyLinked(selectedElements)
  );
};

export const actionLinkToElement = register({
  name: "link",
  perform: (elements, appState, _, app) => {
    const selectedElements = getSelectedElements(
      getNonDeletedElements(elements),
      appState,
    );

    if (!selectedElements.length) {
      // nothing to link
      return { appState, elements, commitToHistory: false };
    }

    if (app.canvas) {
      (app.canvas as any).isLinking = true;
    }

    setCursor(app.canvas, CURSOR_TYPE.CROSSHAIR);

    return {
      appState: {
        ...appState,
        isLinking: true,
        selectedElementIds: {
          ...appState.selectedElementIds,
          ...Object.fromEntries(
            selectedElements.map((element) => [element.id, true]),
          ),
        },
      },
      elements,
      commitToHistory: true,
    };
  },
  contextItemLabel: "labels.link",
  contextItemPredicate: (elements, appState) =>
    enableActionLink(elements, appState),
  keyTest: (event) =>
    !event.shiftKey && event[KEYS.CTRL_OR_CMD] && event.code === CODES.L,
  PanelComponent: ({ elements, appState, updateData }) => (
    <ToolButton
      hidden={!enableActionLink(elements, appState)}
      type="button"
      icon={<LinkIcon theme={appState.theme} />}
      onClick={() => updateData(null)}
      title={`${t("labels.link")} — ${getShortcutKey("CtrlOrCmd+L")}`}
      aria-label={t("labels.link")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    ></ToolButton>
  ),
});

export const actionUnlink = register({
  name: "unlink",
  perform: (elements, appState) => {
    const groupIds = getSelectedGroupIds(appState);
    if (groupIds.length === 0) {
      return { appState, elements, commitToHistory: false };
    }
    const nextElements = elements.map((element) => {
      const nextGroupIds = removeFromSelectedGroups(
        element.groupIds,
        appState.selectedGroupIds,
      );
      if (nextGroupIds.length === element.groupIds.length) {
        return element;
      }
      return newElementWith(element, {
        groupIds: nextGroupIds,
      });
    });
    return {
      appState: selectGroupsForSelectedElements(
        { ...appState, selectedGroupIds: {} },
        getNonDeletedElements(nextElements),
      ),
      elements: nextElements,
      commitToHistory: true,
    };
  },
  keyTest: (event) =>
    event.shiftKey && event[KEYS.CTRL_OR_CMD] && event.code === CODES.L,
  contextItemLabel: "labels.unlink",
  contextItemPredicate: (elements, appState) =>
    getSelectedGroupIds(appState).length > 0,

  PanelComponent: ({ elements, appState, updateData }) => (
    <ToolButton
      type="button"
      hidden={false}
      icon={<UnlinkIcon theme={appState.theme} />}
      onClick={() => updateData(null)}
      title={`${t("labels.unlink")} — ${getShortcutKey("CtrlOrCmd+Shift+L")}`}
      aria-label={t("labels.unlink")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    ></ToolButton>
  ),
});

import React from "react";
import { alignElements, Alignment } from "../align";
import {
  AlignBottomIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
  CenterHorizontallyIcon,
  CenterVerticallyIcon,
} from "../components/icons";
import { ToolButton } from "../components/ToolButton";
import { getElementMap, getNonDeletedElements } from "../element";
import { ExcalidrawElement } from "../element/types";
import { t } from "../i18n";
import { KEYS } from "../keys";
import { getSelectedElements, isSomeElementSelected } from "../scene";
import { AppState } from "../types";
import { getShortcutKey } from "../utils";
import { register } from "./register";

const enableActionGroup = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
) => getSelectedElements(getNonDeletedElements(elements), appState).length > 1;

const alignSelectedElements = (
  elements: readonly ExcalidrawElement[],
  appState: Readonly<AppState>,
  alignment: Alignment,
) => {
  const selectedElements = getSelectedElements(
    getNonDeletedElements(elements),
    appState,
  );

  const updatedElements = alignElements(selectedElements, alignment);

  const updatedElementsMap = getElementMap(updatedElements);

  return elements.map((element) => updatedElementsMap[element.id] || element);
};

export const actionAlignTop = register({
  name: "alignTop",
  perform: (elements, appState) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, {
        position: "start",
        axis: "y",
        alignType: appState.alignType,
      }),
      commitToHistory: true,
    };
  },
  keyTest: (event) =>
    event[KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === KEYS.ARROW_UP,
  PanelComponent: ({ elements, appState, updateData }) => (
    <ToolButton
      hidden={!enableActionGroup(elements, appState)}
      type="button"
      icon={<AlignTopIcon theme={appState.theme} />}
      onClick={() => updateData(null)}
      title={`${t("labels.alignTop")} — ${getShortcutKey(
        "CtrlOrCmd+Shift+Up",
      )}`}
      aria-label={t("labels.alignTop")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});

export const actionAlignBottom = register({
  name: "alignBottom",
  perform: (elements, appState) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, {
        position: "end",
        axis: "y",
        alignType: appState.alignType,
      }),
      commitToHistory: true,
    };
  },
  keyTest: (event) =>
    event[KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === KEYS.ARROW_DOWN,
  PanelComponent: ({ elements, appState, updateData }) => (
    <ToolButton
      hidden={!enableActionGroup(elements, appState)}
      type="button"
      icon={<AlignBottomIcon theme={appState.theme} />}
      onClick={() => updateData(null)}
      title={`${t("labels.alignBottom")} — ${getShortcutKey(
        "CtrlOrCmd+Shift+Down",
      )}`}
      aria-label={t("labels.alignBottom")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});

export const actionAlignLeft = register({
  name: "alignLeft",
  perform: (elements, appState) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, {
        position: "start",
        axis: "x",
        alignType: appState.alignType,
      }),
      commitToHistory: true,
    };
  },
  keyTest: (event) =>
    event[KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === KEYS.ARROW_LEFT,
  PanelComponent: ({ elements, appState, updateData }) => (
    <ToolButton
      hidden={!enableActionGroup(elements, appState)}
      type="button"
      icon={<AlignLeftIcon theme={appState.theme} />}
      onClick={() => updateData(null)}
      title={`${t("labels.alignLeft")} — ${getShortcutKey(
        "CtrlOrCmd+Shift+Left",
      )}`}
      aria-label={t("labels.alignLeft")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});

export const actionAlignRight = register({
  name: "alignRight",
  perform: (elements, appState) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, {
        position: "end",
        axis: "x",
        alignType: appState.alignType,
      }),
      commitToHistory: true,
    };
  },
  keyTest: (event) =>
    event[KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === KEYS.ARROW_RIGHT,
  PanelComponent: ({ elements, appState, updateData }) => (
    <ToolButton
      hidden={!enableActionGroup(elements, appState)}
      type="button"
      icon={<AlignRightIcon theme={appState.theme} />}
      onClick={() => updateData(null)}
      title={`${t("labels.alignRight")} — ${getShortcutKey(
        "CtrlOrCmd+Shift+Right",
      )}`}
      aria-label={t("labels.alignRight")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});

export const actionAlignVerticallyCentered = register({
  name: "alignVerticallyCentered",
  perform: (elements, appState) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, {
        position: "center",
        axis: "y",
        alignType: appState.alignType,
      }),
      commitToHistory: true,
    };
  },
  PanelComponent: ({ elements, appState, updateData }) => (
    <ToolButton
      hidden={!enableActionGroup(elements, appState)}
      type="button"
      icon={<CenterVerticallyIcon theme={appState.theme} />}
      onClick={() => updateData(null)}
      title={t("labels.centerVertically")}
      aria-label={t("labels.centerVertically")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});

export const actionAlignHorizontallyCentered = register({
  name: "alignHorizontallyCentered",
  perform: (elements, appState) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, {
        position: "center",
        axis: "x",
        alignType: appState.alignType,
      }),
      commitToHistory: true,
    };
  },
  PanelComponent: ({ elements, appState, updateData }) => (
    <ToolButton
      hidden={!enableActionGroup(elements, appState)}
      type="button"
      icon={<CenterHorizontallyIcon theme={appState.theme} />}
      onClick={() => updateData(null)}
      title={t("labels.centerHorizontally")}
      aria-label={t("labels.centerHorizontally")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});

import type { Alignment } from "../align";
import { alignElements } from "../align";
import {
  AlignBottomIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
  CenterHorizontallyIcon,
  CenterVerticallyIcon,
} from "../components/icons";
import { ToolButton } from "../components/ToolButton";
import { getNonDeletedElements } from "../element";
import { isFrameLikeElement } from "../element/typeChecks";
import type { ExcalidrawElement } from "../element/types";
import { updateFrameMembershipOfSelectedElements } from "../frame";
import { t } from "../i18n";
import { KEYS } from "../keys";
import { isSomeElementSelected } from "../scene";
import { StoreAction } from "../store";
import type { AppClassProperties, AppState, UIAppState } from "../types";
import { arrayToMap, getShortcutKey } from "../utils";
import { register } from "./register";

const alignActionsPredicate = (
  elements: readonly ExcalidrawElement[],
  appState: UIAppState,
  _: unknown,
  app: AppClassProperties,
) => {
  const selectedElements = app.scene.getSelectedElements(appState);
  return (
    selectedElements.length > 1 &&
    // TODO enable aligning frames when implemented properly
    !selectedElements.some((el) => isFrameLikeElement(el))
  );
};

const alignSelectedElements = (
  elements: readonly ExcalidrawElement[],
  appState: Readonly<AppState>,
  app: AppClassProperties,
  alignment: Alignment,
) => {
  const selectedElements = app.scene.getSelectedElements(appState);
  const elementsMap = arrayToMap(elements);

  const updatedElements = alignElements(
    selectedElements,
    elementsMap,
    alignment,
    app.scene,
  );

  const updatedElementsMap = arrayToMap(updatedElements);

  return updateFrameMembershipOfSelectedElements(
    elements.map((element) => updatedElementsMap.get(element.id) || element),
    appState,
    app,
  );
};

export const actionAlignTop = register({
  name: "alignTop",
  label: "labels.alignTop",
  icon: AlignTopIcon,
  trackEvent: { category: "element" },
  predicate: alignActionsPredicate,
  perform: (elements, appState, _, app) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, app, {
        position: "start",
        axis: "y",
      }),
      storeAction: StoreAction.CAPTURE,
    };
  },
  keyTest: (event) =>
    event[KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === KEYS.ARROW_UP,
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <ToolButton
      hidden={!alignActionsPredicate(elements, appState, null, app)}
      type="button"
      icon={AlignTopIcon}
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
  label: "labels.alignBottom",
  icon: AlignBottomIcon,
  trackEvent: { category: "element" },
  predicate: alignActionsPredicate,
  perform: (elements, appState, _, app) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, app, {
        position: "end",
        axis: "y",
      }),
      storeAction: StoreAction.CAPTURE,
    };
  },
  keyTest: (event) =>
    event[KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === KEYS.ARROW_DOWN,
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <ToolButton
      hidden={!alignActionsPredicate(elements, appState, null, app)}
      type="button"
      icon={AlignBottomIcon}
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
  label: "labels.alignLeft",
  icon: AlignLeftIcon,
  trackEvent: { category: "element" },
  predicate: alignActionsPredicate,
  perform: (elements, appState, _, app) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, app, {
        position: "start",
        axis: "x",
      }),
      storeAction: StoreAction.CAPTURE,
    };
  },
  keyTest: (event) =>
    event[KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === KEYS.ARROW_LEFT,
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <ToolButton
      hidden={!alignActionsPredicate(elements, appState, null, app)}
      type="button"
      icon={AlignLeftIcon}
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
  label: "labels.alignRight",
  icon: AlignRightIcon,
  trackEvent: { category: "element" },
  predicate: alignActionsPredicate,
  perform: (elements, appState, _, app) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, app, {
        position: "end",
        axis: "x",
      }),
      storeAction: StoreAction.CAPTURE,
    };
  },
  keyTest: (event) =>
    event[KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === KEYS.ARROW_RIGHT,
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <ToolButton
      hidden={!alignActionsPredicate(elements, appState, null, app)}
      type="button"
      icon={AlignRightIcon}
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
  label: "labels.centerVertically",
  icon: CenterVerticallyIcon,
  trackEvent: { category: "element" },
  predicate: alignActionsPredicate,
  perform: (elements, appState, _, app) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, app, {
        position: "center",
        axis: "y",
      }),
      storeAction: StoreAction.CAPTURE,
    };
  },
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <ToolButton
      hidden={!alignActionsPredicate(elements, appState, null, app)}
      type="button"
      icon={CenterVerticallyIcon}
      onClick={() => updateData(null)}
      title={t("labels.centerVertically")}
      aria-label={t("labels.centerVertically")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});

export const actionAlignHorizontallyCentered = register({
  name: "alignHorizontallyCentered",
  label: "labels.centerHorizontally",
  icon: CenterHorizontallyIcon,
  trackEvent: { category: "element" },
  predicate: alignActionsPredicate,
  perform: (elements, appState, _, app) => {
    return {
      appState,
      elements: alignSelectedElements(elements, appState, app, {
        position: "center",
        axis: "x",
      }),
      storeAction: StoreAction.CAPTURE,
    };
  },
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <ToolButton
      hidden={!alignActionsPredicate(elements, appState, null, app)}
      type="button"
      icon={CenterHorizontallyIcon}
      onClick={() => updateData(null)}
      title={t("labels.centerHorizontally")}
      aria-label={t("labels.centerHorizontally")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});

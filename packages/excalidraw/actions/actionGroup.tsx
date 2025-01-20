import { KEYS } from "../keys";
import { t } from "../i18n";
import { arrayToMap, getShortcutKey } from "../utils";
import { register } from "./register";
import { UngroupIcon, GroupIcon } from "../components/icons";
import { newElementWith } from "../element/mutateElement";
import { isSomeElementSelected } from "../scene";
import {
  getSelectedGroupIds,
  selectGroup,
  selectGroupsForSelectedElements,
  getElementsInGroup,
  addToGroup,
  removeFromSelectedGroups,
  isElementInGroup,
} from "../groups";
import { getNonDeletedElements } from "../element";
import { randomId } from "../random";
import { ToolButton } from "../components/ToolButton";
import type {
  ExcalidrawElement,
  ExcalidrawTextElement,
  OrderedExcalidrawElement,
} from "../element/types";
import type { AppClassProperties, AppState } from "../types";
import { isBoundToContainer } from "../element/typeChecks";
import {
  getElementsInResizingFrame,
  getFrameLikeElements,
  getRootElements,
  groupByFrameLikes,
  removeElementsFromFrame,
  replaceAllElementsInFrame,
} from "../frame";
import { syncMovedIndices } from "../fractionalIndex";
import { StoreAction } from "../store";

const allElementsInSameGroup = (elements: readonly ExcalidrawElement[]) => {
  if (elements.length >= 2) {
    const groupIds = elements[0].groupIds;
    for (const groupId of groupIds) {
      if (
        elements.reduce(
          (acc, element) => acc && isElementInGroup(element, groupId),
          true,
        )
      ) {
        return true;
      }
    }
  }
  return false;
};

const enableActionGroup = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  app: AppClassProperties,
) => {
  const selectedElements = app.scene.getSelectedElements({
    selectedElementIds: appState.selectedElementIds,
    includeBoundTextElement: true,
  });

  const elementsMap = arrayToMap(selectedElements);

  return (
    selectedElements.length >= 2 &&
    !allElementsInSameGroup(selectedElements) &&
    !selectedElements.some(
      (element) => element.frameId && elementsMap.has(element.frameId),
    )
  );
};

export const actionGroup = register({
  name: "group",
  label: "labels.group",
  icon: (appState) => <GroupIcon theme={appState.theme} />,
  trackEvent: { category: "element" },
  perform: (elements, appState, _, app) => {
    const selectedElements = getRootElements(
      app.scene.getSelectedElements({
        selectedElementIds: appState.selectedElementIds,
        includeBoundTextElement: true,
      }),
    );
    if (selectedElements.length < 2) {
      // nothing to group
      return { appState, elements, storeAction: StoreAction.NONE };
    }
    // if everything is already grouped into 1 group, there is nothing to do
    const selectedGroupIds = getSelectedGroupIds(appState);
    if (selectedGroupIds.length === 1) {
      const selectedGroupId = selectedGroupIds[0];
      const elementIdsInGroup = new Set(
        getElementsInGroup(elements, selectedGroupId).map(
          (element) => element.id,
        ),
      );
      const selectedElementIds = new Set(
        selectedElements.map((element) => element.id),
      );
      const combinedSet = new Set([
        ...Array.from(elementIdsInGroup),
        ...Array.from(selectedElementIds),
      ]);
      if (combinedSet.size === elementIdsInGroup.size) {
        // no incremental ids in the selected ids
        return { appState, elements, storeAction: StoreAction.NONE };
      }
    }

    let nextElements = [...elements];

    // this includes the case where we are grouping elements inside a frame
    // and elements outside that frame
    const groupingElementsFromDifferentFrames =
      new Set(selectedElements.map((element) => element.frameId)).size > 1;
    // when it happens, we want to remove elements that are in the frame
    // and are going to be grouped from the frame (mouthful, I know)
    if (groupingElementsFromDifferentFrames) {
      const frameElementsMap = groupByFrameLikes(selectedElements);

      frameElementsMap.forEach((elementsInFrame, frameId) => {
        removeElementsFromFrame(
          elementsInFrame,
          app.scene.getNonDeletedElementsMap(),
        );
      });
    }

    const newGroupId = randomId();
    const selectElementIds = arrayToMap(selectedElements);

    nextElements = nextElements.map((element) => {
      if (!selectElementIds.get(element.id)) {
        return element;
      }
      return newElementWith(element, {
        groupIds: addToGroup(
          element.groupIds,
          newGroupId,
          appState.editingGroupId,
        ),
      });
    });
    // keep the z order within the group the same, but move them
    // to the z order of the highest element in the layer stack
    const elementsInGroup = getElementsInGroup(nextElements, newGroupId);
    const lastElementInGroup = elementsInGroup[elementsInGroup.length - 1];
    const lastGroupElementIndex = nextElements.lastIndexOf(
      lastElementInGroup as OrderedExcalidrawElement,
    );
    const elementsAfterGroup = nextElements.slice(lastGroupElementIndex + 1);
    const elementsBeforeGroup = nextElements
      .slice(0, lastGroupElementIndex)
      .filter(
        (updatedElement) => !isElementInGroup(updatedElement, newGroupId),
      );
    const reorderedElements = syncMovedIndices(
      [...elementsBeforeGroup, ...elementsInGroup, ...elementsAfterGroup],
      arrayToMap(elementsInGroup),
    );

    return {
      appState: {
        ...appState,
        ...selectGroup(
          newGroupId,
          { ...appState, selectedGroupIds: {} },
          getNonDeletedElements(nextElements),
        ),
      },
      elements: reorderedElements,
      storeAction: StoreAction.CAPTURE,
    };
  },
  predicate: (elements, appState, _, app) =>
    enableActionGroup(elements, appState, app),
  keyTest: (event) =>
    !event.shiftKey && event[KEYS.CTRL_OR_CMD] && event.key === KEYS.G,
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <ToolButton
      hidden={!enableActionGroup(elements, appState, app)}
      type="button"
      icon={<GroupIcon theme={appState.theme} />}
      onClick={() => updateData(null)}
      title={`${t("labels.group")} — ${getShortcutKey("CtrlOrCmd+G")}`}
      aria-label={t("labels.group")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    ></ToolButton>
  ),
});

export const actionUngroup = register({
  name: "ungroup",
  label: "labels.ungroup",
  icon: (appState) => <UngroupIcon theme={appState.theme} />,
  trackEvent: { category: "element" },
  perform: (elements, appState, _, app) => {
    const groupIds = getSelectedGroupIds(appState);
    const elementsMap = arrayToMap(elements);

    if (groupIds.length === 0) {
      return { appState, elements, storeAction: StoreAction.NONE };
    }

    let nextElements = [...elements];

    const boundTextElementIds: ExcalidrawTextElement["id"][] = [];
    nextElements = nextElements.map((element) => {
      if (isBoundToContainer(element)) {
        boundTextElementIds.push(element.id);
      }
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

    const updateAppState = selectGroupsForSelectedElements(
      appState,
      getNonDeletedElements(nextElements),
      appState,
      null,
    );

    const selectedElements = app.scene.getSelectedElements(appState);

    const selectedElementFrameIds = new Set(
      selectedElements
        .filter((element) => element.frameId)
        .map((element) => element.frameId!),
    );

    const targetFrames = getFrameLikeElements(elements).filter((frame) =>
      selectedElementFrameIds.has(frame.id),
    );

    targetFrames.forEach((frame) => {
      if (frame) {
        nextElements = replaceAllElementsInFrame(
          nextElements,
          getElementsInResizingFrame(
            nextElements,
            frame,
            appState,
            elementsMap,
          ),
          frame,
          app,
        );
      }
    });

    // remove binded text elements from selection
    updateAppState.selectedElementIds = Object.entries(
      updateAppState.selectedElementIds,
    ).reduce(
      (acc: { [key: ExcalidrawElement["id"]]: true }, [id, selected]) => {
        if (selected && !boundTextElementIds.includes(id)) {
          acc[id] = true;
        }
        return acc;
      },
      {},
    );

    return {
      appState: { ...appState, ...updateAppState },
      elements: nextElements,
      storeAction: StoreAction.CAPTURE,
    };
  },
  keyTest: (event) =>
    event.shiftKey &&
    event[KEYS.CTRL_OR_CMD] &&
    event.key === KEYS.G.toUpperCase(),
  predicate: (elements, appState) => getSelectedGroupIds(appState).length > 0,

  PanelComponent: ({ elements, appState, updateData }) => (
    <ToolButton
      type="button"
      hidden={getSelectedGroupIds(appState).length === 0}
      icon={<UngroupIcon theme={appState.theme} />}
      onClick={() => updateData(null)}
      title={`${t("labels.ungroup")} — ${getShortcutKey("CtrlOrCmd+Shift+G")}`}
      aria-label={t("labels.ungroup")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    ></ToolButton>
  ),
});

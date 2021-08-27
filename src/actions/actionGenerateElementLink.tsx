import React from "react";
import { copyTextToSystemClipboard } from "../clipboard";
import { URL_HASH_KEYS } from "../constants";
import { getNonDeletedElements } from "../element";
import { ExcalidrawElement } from "../element/types";
import { getSelectedElements } from "../scene";
import { AppState } from "../types";
import { register } from "./register";

const isActionEnabled = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
) => {
  const selectedElements = getSelectedElements(
    getNonDeletedElements(elements),
    appState,
  ).filter(({ type }) => type !== "selection");

  return selectedElements.length === 1;
};

export const actionGenerateElementLink = register({
  name: "copyElementLink",
  perform: async (elements, appState) => {
    const selectedElements = getSelectedElements(
      getNonDeletedElements(elements),
      appState,
    );

    if (selectedElements.length === 1) {
      const elementLink = `${window.origin}/?#${URL_HASH_KEYS.elementRef}=${selectedElements[0].id}`;

      await copyTextToSystemClipboard(elementLink);
    }

    return { appState, elements, commitToHistory: false };
  },
  contextItemLabel: "labels.copyElementLink",
  contextItemPredicate: (elements, appState) =>
    isActionEnabled(elements, appState),
  keyTest: (event) => false, // TODO: should this action have a shortcut keys?
  PanelComponent: ({ elements, appState, updateData }) => (
    <></>
    // TODO: should this action appears on the actions bar ?
    // <ToolButton
    //   hidden={!isActionEnabled(elements, appState)}
    //   type="button"
    //   icon={<LinkIcon theme={appState.theme} />}
    //   onClick={() => updateData(null)}
    //   title={t("labels.copyElementLink")}
    //   aria-label={t("labels.copyElementLink")}
    //   visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    // ></ToolButton>
  ),
});

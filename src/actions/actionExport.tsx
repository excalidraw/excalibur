import { supported as fsSupported } from "browser-fs-access";
import React from "react";
import { trackEvent } from "../analytics";
import { ActiveFile } from "../components/ActiveFile";
import { useIsMobile } from "../components/App";
import { CheckboxItem } from "../components/CheckboxItem";
import { DarkModeToggle } from "../components/DarkModeToggle";
import { load, questionCircle, saveAs } from "../components/icons";
import { ProjectName } from "../components/ProjectName";
import { ToolButton } from "../components/ToolButton";
import "../components/ToolIcon.scss";
import { Tooltip } from "../components/Tooltip";
import {
  APPEARENCE,
  DEFAULT_EXPORT_PADDING,
  EXPORT_SCALES,
} from "../constants";
import { loadFromJSON, saveAsJSON } from "../data";
import { isImageFileHandle } from "../data/blob";
import { resaveAsImageWithScene } from "../data/resave";
import { getNonDeletedElements } from "../element";
import { t } from "../i18n";
import { KEYS } from "../keys";
import { getSelectedElements, isSomeElementSelected } from "../scene";
import { getExportSize } from "../scene/export";
import { Appearence } from "../types";
import { isDarkTheme } from "../utils";
import { register } from "./register";

export const actionChangeProjectName = register({
  name: "changeProjectName",
  perform: (_elements, appState, value) => {
    trackEvent("change", "title");
    return { appState: { ...appState, name: value }, commitToHistory: false };
  },
  PanelComponent: ({ appState, updateData, appProps }) => (
    <ProjectName
      label={t("labels.fileTitle")}
      value={appState.name || "Unnamed"}
      onChange={(name: string) => updateData(name)}
      isNameEditable={
        typeof appProps.name === "undefined" && !appState.viewModeEnabled
      }
    />
  ),
});

export const actionChangeExportScale = register({
  name: "changeExportScale",
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportScale: value },
      commitToHistory: false,
    };
  },
  PanelComponent: ({ elements: allElements, appState, updateData }) => {
    const elements = getNonDeletedElements(allElements);
    const exportSelected = isSomeElementSelected(elements, appState);
    const exportedElements = exportSelected
      ? getSelectedElements(elements, appState)
      : elements;

    return (
      <>
        {EXPORT_SCALES.map((s) => {
          const [width, height] = getExportSize(
            exportedElements,
            DEFAULT_EXPORT_PADDING,
            s,
          );

          const scaleButtonTitle = `${t(
            "buttons.scale",
          )} ${s}x (${width}x${height})`;

          return (
            <ToolButton
              key={s}
              size="small"
              type="radio"
              icon={`${s}x`}
              name="export-canvas-scale"
              title={scaleButtonTitle}
              aria-label={scaleButtonTitle}
              id="export-canvas-scale"
              checked={s === appState.exportScale}
              onChange={() => updateData(s)}
            />
          );
        })}
      </>
    );
  },
});

export const actionChangeExportBackground = register({
  name: "changeExportBackground",
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportBackground: value },
      commitToHistory: false,
    };
  },
  PanelComponent: ({ appState, updateData }) => (
    <CheckboxItem
      checked={appState.exportBackground}
      onChange={(checked) => updateData(checked)}
    >
      {t("labels.withBackground")}
    </CheckboxItem>
  ),
});

export const actionChangeExportEmbedScene = register({
  name: "changeExportEmbedScene",
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportEmbedScene: value },
      commitToHistory: false,
    };
  },
  PanelComponent: ({ appState, updateData }) => (
    <CheckboxItem
      checked={appState.exportEmbedScene}
      onChange={(checked) => updateData(checked)}
    >
      {t("labels.exportEmbedScene")}
      <Tooltip label={t("labels.exportEmbedScene_details")} long={true}>
        <div className="excalidraw-tooltip-icon">{questionCircle}</div>
      </Tooltip>
    </CheckboxItem>
  ),
});

export const actionSaveToActiveFile = register({
  name: "saveToActiveFile",
  perform: async (elements, appState, value) => {
    const fileHandleExists = !!appState.fileHandle;

    try {
      const { fileHandle } = isImageFileHandle(appState.fileHandle)
        ? await resaveAsImageWithScene(elements, appState)
        : await saveAsJSON(elements, appState);

      return {
        commitToHistory: false,
        appState: {
          ...appState,
          fileHandle,
          toastMessage: fileHandleExists
            ? fileHandle.name
              ? t("toast.fileSavedToFilename").replace(
                  "{filename}",
                  `"${fileHandle.name}"`,
                )
              : t("toast.fileSaved")
            : null,
        },
      };
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error(error);
      }
      return { commitToHistory: false };
    }
  },
  keyTest: (event) =>
    event.key === KEYS.S && event[KEYS.CTRL_OR_CMD] && !event.shiftKey,
  PanelComponent: ({ updateData, appState }) => (
    <ActiveFile
      onSave={() => updateData(null)}
      fileName={appState.fileHandle?.name}
    />
  ),
});

export const actionSaveFileToDisk = register({
  name: "saveFileToDisk",
  perform: async (elements, appState, value) => {
    try {
      const { fileHandle } = await saveAsJSON(elements, {
        ...appState,
        fileHandle: null,
      });
      return { commitToHistory: false, appState: { ...appState, fileHandle } };
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error(error);
      }
      return { commitToHistory: false };
    }
  },
  keyTest: (event) =>
    event.key === KEYS.S && event.shiftKey && event[KEYS.CTRL_OR_CMD],
  PanelComponent: ({ updateData }) => (
    <ToolButton
      type="button"
      icon={saveAs}
      title={t("buttons.saveAs")}
      aria-label={t("buttons.saveAs")}
      showAriaLabel={useIsMobile()}
      hidden={!fsSupported}
      onClick={() => updateData(null)}
      data-testid="save-as-button"
    />
  ),
});

export const actionLoadScene = register({
  name: "loadScene",
  perform: async (elements, appState) => {
    try {
      const {
        elements: loadedElements,
        appState: loadedAppState,
      } = await loadFromJSON(appState, elements);
      return {
        elements: loadedElements,
        appState: loadedAppState,
        commitToHistory: true,
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        return false;
      }
      return {
        elements,
        appState: { ...appState, errorMessage: error.message },
        commitToHistory: false,
      };
    }
  },
  keyTest: (event) => event[KEYS.CTRL_OR_CMD] && event.key === KEYS.O,
  PanelComponent: ({ updateData, appState }) => (
    <ToolButton
      type="button"
      icon={load}
      title={t("buttons.load")}
      aria-label={t("buttons.load")}
      showAriaLabel={useIsMobile()}
      onClick={updateData}
      data-testid="load-button"
    />
  ),
});

export const actionExportWithDarkMode = register({
  name: "exportWithDarkMode",
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportWithDarkMode: value },
      commitToHistory: false,
    };
  },
  PanelComponent: ({ appState, updateData }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "-45px",
        marginBottom: "10px",
      }}
    >
      <DarkModeToggle
        value={appState.exportWithDarkMode ? APPEARENCE.DARK : APPEARENCE.LIGHT}
        onChange={(theme: Appearence) => {
          updateData(isDarkTheme(theme));
        }}
        title={t("labels.toggleExportColorScheme")}
      />
    </div>
  ),
});

import { ExportIcon, questionCircle, saveAs } from "../components/icons";
import { ProjectName } from "../components/ProjectName";
import { ToolButton } from "../components/ToolButton";
import { Tooltip } from "../components/Tooltip";
import { DarkModeToggle } from "../components/DarkModeToggle";
import { loadFromJSON, saveAsJSON } from "../data";
import { resaveAsImageWithScene } from "../data/resave";
import { t } from "../i18n";
import { useDevice } from "../components/App";
import { KEYS } from "../keys";
import { register } from "./register";
import { CheckboxItem } from "../components/CheckboxItem";
import { getExportSize } from "../scene/export";
import { DEFAULT_EXPORT_PADDING, EXPORT_SCALES, THEME } from "../constants";
import { getSelectedElements, isSomeElementSelected } from "../scene";
import { getNonDeletedElements } from "../element";
import { isImageFileHandle } from "../data/blob";
import { nativeFileSystemSupported } from "../data/filesystem";
import type { Theme } from "../element/types";

import "../components/ToolIcon.scss";
import { StoreAction } from "../store";
import { get, del } from "idb-keyval";
import { createIndexedDBStore } from "../data/json";

export const actionChangeProjectName = register({
  name: "changeProjectName",
  label: "labels.fileTitle",
  trackEvent: false,
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, name: value },
      storeAction: StoreAction.NONE,
    };
  },
  PanelComponent: ({ appState, updateData, appProps, data, app }) => (
    <ProjectName
      label={t("labels.fileTitle")}
      value={app.getName()}
      onChange={(name: string) => updateData(name)}
      ignoreFocus={data?.ignoreFocus ?? false}
    />
  ),
});

export const actionChangeExportScale = register({
  name: "changeExportScale",
  label: "imageExportDialog.scale",
  trackEvent: { category: "export", action: "scale" },
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportScale: value },
      storeAction: StoreAction.NONE,
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
            "imageExportDialog.label.scale",
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
  label: "imageExportDialog.label.withBackground",
  trackEvent: { category: "export", action: "toggleBackground" },
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportBackground: value },
      storeAction: StoreAction.NONE,
    };
  },
  PanelComponent: ({ appState, updateData }) => (
    <CheckboxItem
      checked={appState.exportBackground}
      onChange={(checked) => updateData(checked)}
    >
      {t("imageExportDialog.label.withBackground")}
    </CheckboxItem>
  ),
});

export const actionChangeExportEmbedScene = register({
  name: "changeExportEmbedScene",
  label: "imageExportDialog.tooltip.embedScene",
  trackEvent: { category: "export", action: "embedScene" },
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportEmbedScene: value },
      storeAction: StoreAction.NONE,
    };
  },
  PanelComponent: ({ appState, updateData }) => (
    <CheckboxItem
      checked={appState.exportEmbedScene}
      onChange={(checked) => updateData(checked)}
    >
      {t("imageExportDialog.label.embedScene")}
      <Tooltip label={t("imageExportDialog.tooltip.embedScene")} long={true}>
        <div className="excalidraw-tooltip-icon">{questionCircle}</div>
      </Tooltip>
    </CheckboxItem>
  ),
});

export const actionSaveToActiveFile = register({
  name: "saveToActiveFile",
  label: "buttons.save",
  icon: ExportIcon,
  trackEvent: { category: "export" },
  predicate: (elements, appState, props, app) => {
    return (
      !!app.props.UIOptions.canvasActions.saveToActiveFile &&
      !!appState.fileHandle &&
      !appState.viewModeEnabled
    );
  },
  perform: async (elements, appState, value, app) => {
    const fileHandleExists = !!appState.fileHandle;

    try {
      const fileHandleStore = createIndexedDBStore();
      let fileHandle = await get(`${app.getName()}`, fileHandleStore);
      if (!fileHandle) {
        const { fileHandle: existingFilehandle } = isImageFileHandle(
          appState.fileHandle,
        )
          ? await resaveAsImageWithScene(
              elements,
              appState,
              app.files,
              app.getName(),
            )
          : await saveAsJSON(elements, appState, app.files, app.getName());
        fileHandle = existingFilehandle;
      }
      return {
        storeAction: StoreAction.NONE,
        appState: {
          ...appState,
          fileHandle,
          name: fileHandle?.name,
          toast: fileHandleExists
            ? {
                message: fileHandle?.name
                  ? t("toast.fileSavedToFilename").replace(
                      "{filename}",
                      `"${fileHandle.name}"`,
                    )
                  : t("toast.fileSaved"),
              }
            : null,
        },
      };
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error(error);
      } else {
        console.warn(error);
      }
      return { storeAction: StoreAction.NONE };
    }
  },
  keyTest: (event) =>
    event.key === KEYS.S && event[KEYS.CTRL_OR_CMD] && !event.shiftKey,
});

export const actionSaveFileToDisk = register({
  name: "saveFileToDisk",
  label: "exportDialog.disk_title",
  icon: ExportIcon,
  viewMode: true,
  trackEvent: { category: "export" },
  perform: async (elements, appState, value, app) => {
    try {
      const fileHandleStore = createIndexedDBStore();
      const previousFileName = app.getName();
      const { fileHandle } = await saveAsJSON(
        elements,
        {
          ...appState,
          fileHandle: null,
        },
        app.files,
        app.getName(),
      );
      await del(previousFileName, fileHandleStore);
      return {
        storeAction: StoreAction.NONE,
        appState: {
          ...appState,
          openDialog: null,
          name: fileHandle?.name,
          fileHandle,
          toast: { message: t("toast.fileSaved") },
        },
      };
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error(error);
      } else {
        console.warn(error);
      }
      return { storeAction: StoreAction.NONE };
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
      showAriaLabel={useDevice().editor.isMobile}
      hidden={!nativeFileSystemSupported}
      onClick={() => updateData(null)}
      data-testid="save-as-button"
    />
  ),
});

export const actionLoadScene = register({
  name: "loadScene",
  label: "buttons.load",
  trackEvent: { category: "export" },
  predicate: (elements, appState, props, app) => {
    return (
      !!app.props.UIOptions.canvasActions.loadScene && !appState.viewModeEnabled
    );
  },
  perform: async (elements, appState, _, app) => {
    try {
      const {
        elements: loadedElements,
        appState: loadedAppState,
        files,
      } = await loadFromJSON(appState, elements);
      return {
        elements: loadedElements,
        appState: loadedAppState,
        files,
        storeAction: StoreAction.CAPTURE,
      };
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.warn(error);
        return false;
      }
      return {
        elements,
        appState: { ...appState, errorMessage: error.message },
        files: app.files,
        storeAction: StoreAction.NONE,
      };
    }
  },
  keyTest: (event) => event[KEYS.CTRL_OR_CMD] && event.key === KEYS.O,
});

export const actionExportWithDarkMode = register({
  name: "exportWithDarkMode",
  label: "imageExportDialog.label.darkMode",
  trackEvent: { category: "export", action: "toggleTheme" },
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportWithDarkMode: value },
      storeAction: StoreAction.NONE,
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
        value={appState.exportWithDarkMode ? THEME.DARK : THEME.LIGHT}
        onChange={(theme: Theme) => {
          updateData(theme === THEME.DARK);
        }}
        title={t("imageExportDialog.label.darkMode")}
      />
    </div>
  ),
});

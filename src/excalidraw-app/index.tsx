import LanguageDetector from "i18next-browser-languagedetector";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { trackEvent } from "../analytics";
import { getDefaultAppState } from "../appState";
import { ErrorDialog } from "../components/ErrorDialog";
import { TopErrorBoundary } from "../components/TopErrorBoundary";
import {
  APP_NAME,
  EVENT,
  STORAGE_KEYS,
  TITLE_TIMEOUT,
  URL_HASH_KEYS,
  VERSION_TIMEOUT,
} from "../constants";
import { loadFromBlob } from "../data/blob";
import { ImportedDataState } from "../data/types";
import {
  ExcalidrawElement,
  ImageId,
  NonDeletedExcalidrawElement,
} from "../element/types";
import { useCallbackRefState } from "../hooks/useCallbackRefState";
import { Language, t } from "../i18n";
import Excalidraw, {
  defaultLang,
  languages,
} from "../packages/excalidraw/index";
import {
  AppState,
  LibraryItems,
  ExcalidrawImperativeAPI,
  BinaryFileData,
} from "../types";
import {
  debounce,
  getVersion,
  ResolvablePromise,
  resolvablePromise,
} from "../utils";
import {
  FIREBASE_STORAGE_PREFIXES,
  SAVE_TO_LOCAL_STORAGE_TIMEOUT,
} from "./app_constants";
import CollabWrapper, {
  CollabAPI,
  CollabContext,
  CollabContextConsumer,
} from "./collab/CollabWrapper";
import { LanguageList } from "./components/LanguageList";
import { exportToBackend, getCollaborationLinkData, loadScene } from "./data";
import {
  importFromLocalStorage,
  saveToLocalStorage,
} from "./data/localStorage";
import CustomStats from "./CustomStats";
import { restoreAppState, RestoredDataState } from "../data/restore";
import { Tooltip } from "../components/Tooltip";
import { shield } from "../components/icons";

import "./index.scss";
import { ExportToExcalidrawPlus } from "./components/ExportToExcalidrawPlus";

import { getMany, set, del, keys, createStore } from "idb-keyval";
import { FileSync } from "./data/FileSync";
import { mutateElement } from "../element/mutateElement";
import { isInitializedImageElement } from "../element/typeChecks";
import { loadFilesFromFirebase } from "./data/firebase";

const filesStore = createStore("files-db", "files-store");

const clearObsoleteFilesFromIndexedDB = async (opts: {
  currentFileIds: ImageId[];
}) => {
  const allIds = await keys(filesStore);
  for (const id of allIds) {
    if (!opts.currentFileIds.includes(id as ImageId)) {
      del(id, filesStore);
    }
  }
};

const localFileStorage = new FileSync({
  getFiles(ids) {
    return getMany(ids, filesStore).then(
      (filesData: (BinaryFileData | undefined)[]) => {
        const loadedFiles: BinaryFileData[] = [];
        const erroredFiles: ImageId[] = [];
        filesData.forEach((data, index) => {
          const id = ids[index];
          if (data) {
            loadedFiles.push(data);
          } else {
            erroredFiles.push(id);
          }
        });

        return { loadedFiles, erroredFiles };
      },
    );
  },
  async saveFiles({ addedFiles }) {
    const savedFiles = new Map<ImageId, true>();
    const erroredFiles = new Map<ImageId, true>();

    await Promise.all(
      [...addedFiles].map(async ([id, dataURL]) => {
        try {
          const data: BinaryFileData = {
            id,
            dataURL,
            type: "image",
            created: Date.now(),
          };
          await set(id, data, filesStore);
          savedFiles.set(id, true);
        } catch (error) {
          console.error(error);
          erroredFiles.set(id, true);
        }
      }),
    );

    return { savedFiles, erroredFiles };
  },
});

const languageDetector = new LanguageDetector();
languageDetector.init({
  languageUtils: {
    formatLanguageCode: (langCode: Language["code"]) => langCode,
    isWhitelisted: () => true,
  },
  checkWhitelist: false,
});

const saveDebounced = debounce(
  async (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    onFilesSaved: (savedFiles: Map<ImageId, true>) => void,
  ) => {
    saveToLocalStorage(elements, appState);

    const { savedFiles } = await localFileStorage.saveFiles({
      elements,
      appState,
    });

    if (savedFiles.size) {
      onFilesSaved(savedFiles);
    }
  },
  SAVE_TO_LOCAL_STORAGE_TIMEOUT,
);

const onBlur = () => {
  saveDebounced.flush();
};

const initializeScene = async (opts: {
  collabAPI: CollabAPI;
}): Promise<
  { scene: ImportedDataState | null } & (
    | { isExternalScene: true; id: string; key: string }
    | { isExternalScene: false; id?: null; key?: null }
  )
> => {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");
  const jsonBackendMatch = window.location.hash.match(
    /^#json=([0-9]+),([a-zA-Z0-9_-]+)$/,
  );
  const externalUrlMatch = window.location.hash.match(/^#url=(.*)$/);

  const localDataState = importFromLocalStorage();

  let scene: RestoredDataState & {
    scrollToContent?: boolean;
  } = await loadScene(null, null, localDataState);

  let roomLinkData = getCollaborationLinkData(window.location.href);
  const isExternalScene = !!(id || jsonBackendMatch || roomLinkData);
  if (isExternalScene) {
    if (
      // don't prompt if scene is empty
      !scene.elements.length ||
      // don't prompt for collab scenes because we don't override local storage
      roomLinkData ||
      // otherwise, prompt whether user wants to override current scene
      window.confirm(t("alerts.loadSceneOverridePrompt"))
    ) {
      // Backwards compatibility with legacy url format
      if (id) {
        scene = await loadScene(id, null, localDataState);
      } else if (jsonBackendMatch) {
        scene = await loadScene(
          jsonBackendMatch[1],
          jsonBackendMatch[2],
          localDataState,
        );
      }
      scene.scrollToContent = true;
      if (!roomLinkData) {
        // window.history.replaceState({}, APP_NAME, window.location.origin);
      }
    } else {
      // https://github.com/excalidraw/excalidraw/issues/1919
      if (document.hidden) {
        return new Promise((resolve, reject) => {
          window.addEventListener(
            "focus",
            () => initializeScene(opts).then(resolve).catch(reject),
            {
              once: true,
            },
          );
        });
      }

      roomLinkData = null;
      window.history.replaceState({}, APP_NAME, window.location.origin);
    }
  } else if (externalUrlMatch) {
    window.history.replaceState({}, APP_NAME, window.location.origin);

    const url = externalUrlMatch[1];
    try {
      const request = await fetch(window.decodeURIComponent(url));
      const data = await loadFromBlob(await request.blob(), null, null);
      if (
        !scene.elements.length ||
        window.confirm(t("alerts.loadSceneOverridePrompt"))
      ) {
        return { scene: data, isExternalScene };
      }
    } catch (error) {
      return {
        scene: {
          appState: {
            errorMessage: t("alerts.invalidSceneUrl"),
          },
        },
        isExternalScene,
      };
    }
  }

  if (roomLinkData) {
    return {
      scene: await opts.collabAPI.initializeSocketClient(roomLinkData),
      isExternalScene: true,
      id: roomLinkData.roomId,
      key: roomLinkData.roomKey,
    };
  } else if (scene) {
    return isExternalScene && jsonBackendMatch
      ? {
          scene,
          isExternalScene,
          id: jsonBackendMatch[1],
          key: jsonBackendMatch[2],
        }
      : { scene, isExternalScene: false };
  }
  return { scene: null, isExternalScene: false };
};

const PlusLinkJSX = (
  <p style={{ direction: "ltr", unicodeBidi: "embed" }}>
    Introducing Excalidraw+
    <br />
    <a
      href="https://plus.excalidraw.com/?utm_source=excalidraw&utm_medium=banner&utm_campaign=launch"
      target="_blank"
      rel="noreferrer"
    >
      Try out now!
    </a>
  </p>
);

const ExcalidrawWrapper = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const currentLangCode = languageDetector.detect() || defaultLang.code;
  const [langCode, setLangCode] = useState(currentLangCode);

  // initial state
  // ---------------------------------------------------------------------------

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<ImportedDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise = resolvablePromise<ImportedDataState | null>();
  }

  useEffect(() => {
    // Delayed so that the app has a time to load the latest SW
    setTimeout(() => {
      trackEvent("load", "version", getVersion());
    }, VERSION_TIMEOUT);
  }, []);

  const [
    excalidrawAPI,
    excalidrawRefCallback,
  ] = useCallbackRefState<ExcalidrawImperativeAPI>();

  const collabAPI = useContext(CollabContext)?.api;

  useEffect(() => {
    if (!collabAPI || !excalidrawAPI) {
      return;
    }

    initializeScene({ collabAPI }).then((data) => {
      if (data.scene) {
        if (collabAPI.isCollaborating()) {
          if (data.scene.elements) {
            collabAPI
              .fetchImageFilesFromFirebase({
                elements: data.scene.elements,
                appState: { files: data.scene.appState?.files || {} },
              })
              .then(({ loadedFiles }) => {
                excalidrawAPI.setFiles(loadedFiles);
              });
          }
        } else {
          const imageIds =
            data.scene.elements?.reduce((acc, element) => {
              if (isInitializedImageElement(element)) {
                return acc.concat(element.imageId);
              }
              return acc;
            }, [] as ImageId[]) || [];

          if (data.isExternalScene) {
            loadFilesFromFirebase(
              `${FIREBASE_STORAGE_PREFIXES.shareLinkFiles}/${data.id}`,
              data.key,
              imageIds,
            ).then(({ loadedFiles }) => {
              excalidrawAPI.setFiles(loadedFiles);
            });
          } else {
            if (imageIds.length) {
              localFileStorage.getFiles(imageIds).then(({ loadedFiles }) => {
                if (loadedFiles.length) {
                  excalidrawAPI.setFiles(loadedFiles);
                }
              });
            }
            // on fresh load, clear unused files from IDB (from previous
            // session)
            clearObsoleteFilesFromIndexedDB({ currentFileIds: imageIds });
          }
        }

        try {
          data.scene.libraryItems =
            JSON.parse(
              localStorage.getItem(
                STORAGE_KEYS.LOCAL_STORAGE_LIBRARY,
              ) as string,
            ) || [];
        } catch (e) {
          console.error(e);
        }
      }
      initialStatePromiseRef.current.promise.resolve(data.scene);
    });

    const onHashChange = (event: HashChangeEvent) => {
      event.preventDefault();
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const libraryUrl = hash.get(URL_HASH_KEYS.addLibrary);
      if (libraryUrl) {
        // If hash changed and it contains library url, import it and replace
        // the url to its previous state (important in case of collaboration
        // and similar).
        // Using history API won't trigger another hashchange.
        window.history.replaceState({}, "", event.oldURL);
        excalidrawAPI.importLibrary(libraryUrl, hash.get("token"));
      } else {
        initializeScene({ collabAPI }).then(({ scene }) => {
          if (scene) {
            excalidrawAPI.updateScene({
              ...scene,
              appState: restoreAppState(scene.appState, null),
            });
          }
        });
      }
    };

    const titleTimeout = setTimeout(
      () => (document.title = APP_NAME),
      TITLE_TIMEOUT,
    );
    window.addEventListener(EVENT.HASHCHANGE, onHashChange, false);
    window.addEventListener(EVENT.UNLOAD, onBlur, false);
    window.addEventListener(EVENT.BLUR, onBlur, false);
    return () => {
      window.removeEventListener(EVENT.HASHCHANGE, onHashChange, false);
      window.removeEventListener(EVENT.UNLOAD, onBlur, false);
      window.removeEventListener(EVENT.BLUR, onBlur, false);
      clearTimeout(titleTimeout);
    };
  }, [collabAPI, excalidrawAPI]);

  useEffect(() => {
    languageDetector.cacheUserLanguage(langCode);
  }, [langCode]);

  const onChange = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ) => {
    if (collabAPI?.isCollaborating()) {
      collabAPI.broadcastElements(elements);
    } else {
      saveDebounced(elements, appState, (savedFiles) => {
        if (excalidrawAPI) {
          excalidrawAPI.updateScene({
            elements: excalidrawAPI
              .getSceneElementsIncludingDeleted()
              .map((element) => {
                if (
                  isInitializedImageElement(element) &&
                  savedFiles.has(element.imageId)
                ) {
                  return mutateElement(element, { status: "saved" }, false);
                }
                return element;
              }),
          });
        }
      });
    }
  };

  const onExportToBackend = async (
    exportedElements: readonly NonDeletedExcalidrawElement[],
    appState: AppState,
    canvas: HTMLCanvasElement | null,
  ) => {
    if (exportedElements.length === 0) {
      return window.alert(t("alerts.cannotExportEmptyCanvas"));
    }
    if (canvas) {
      try {
        await exportToBackend(exportedElements, {
          ...appState,
          viewBackgroundColor: appState.exportBackground
            ? appState.viewBackgroundColor
            : getDefaultAppState().viewBackgroundColor,
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          const { width, height } = canvas;
          console.error(error, { width, height });
          setErrorMessage(error.message);
        }
      }
    }
  };

  const renderTopRightUI = useCallback(
    (isMobile: boolean, appState: AppState) => {
      return (
        <div
          style={{
            width: "24ch",
            fontSize: "0.7em",
            textAlign: "center",
          }}
        >
          {/* <GitHubCorner theme={appState.theme} dir={document.dir} /> */}
          {/* FIXME remove after 2021-05-20 */}
          {PlusLinkJSX}
        </div>
      );
    },
    [],
  );

  const renderFooter = useCallback(
    (isMobile: boolean) => {
      const renderEncryptedIcon = () => (
        <a
          className="encrypted-icon tooltip"
          href="https://blog.excalidraw.com/end-to-end-encryption/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("encrypted.link")}
        >
          <Tooltip label={t("encrypted.tooltip")} long={true}>
            {shield}
          </Tooltip>
        </a>
      );

      const renderLanguageList = () => (
        <LanguageList
          onChange={(langCode) => setLangCode(langCode)}
          languages={languages}
          currentLangCode={langCode}
        />
      );
      if (isMobile) {
        const isTinyDevice = window.innerWidth < 362;
        return (
          <div
            style={{
              display: "flex",
              flexDirection: isTinyDevice ? "column" : "row",
            }}
          >
            <fieldset>
              <legend>{t("labels.language")}</legend>
              {renderLanguageList()}
            </fieldset>
            {/* FIXME remove after 2021-05-20 */}
            <div
              style={{
                width: "24ch",
                fontSize: "0.7em",
                textAlign: "center",
                marginTop: isTinyDevice ? 16 : undefined,
                marginLeft: "auto",
                marginRight: isTinyDevice ? "auto" : undefined,
                padding: "4px 2px",
                border: "1px dashed #aaa",
                borderRadius: 12,
              }}
            >
              {PlusLinkJSX}
            </div>
          </div>
        );
      }
      return (
        <>
          {renderEncryptedIcon()}
          {renderLanguageList()}
        </>
      );
    },
    [langCode],
  );

  const renderCustomStats = () => {
    return (
      <CustomStats
        setToastMessage={(message) => excalidrawAPI!.setToastMessage(message)}
      />
    );
  };

  const onLibraryChange = async (items: LibraryItems) => {
    if (!items.length) {
      localStorage.removeItem(STORAGE_KEYS.LOCAL_STORAGE_LIBRARY);
      return;
    }
    const serializedItems = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_LIBRARY, serializedItems);
  };

  return (
    <>
      <Excalidraw
        ref={excalidrawRefCallback}
        onChange={onChange}
        initialData={initialStatePromiseRef.current.promise}
        onCollabButtonClick={collabAPI?.onCollabButtonClick}
        isCollaborating={collabAPI?.isCollaborating()}
        onPointerUpdate={collabAPI?.onPointerUpdate}
        UIOptions={{
          canvasActions: {
            export: {
              onExportToBackend,
              renderCustomUI: (elements, appState) => {
                return (
                  <ExportToExcalidrawPlus
                    elements={elements}
                    appState={appState}
                    onError={(error) => {
                      excalidrawAPI?.updateScene({
                        appState: {
                          errorMessage: error.message,
                        },
                      });
                    }}
                  />
                );
              },
            },
          },
        }}
        renderTopRightUI={renderTopRightUI}
        renderFooter={renderFooter}
        langCode={langCode}
        renderCustomStats={renderCustomStats}
        detectScroll={false}
        handleKeyboardGlobally={true}
        onLibraryChange={onLibraryChange}
        autoFocus={true}
      />
      {excalidrawAPI && <CollabWrapper excalidrawAPI={excalidrawAPI} />}
      {errorMessage && (
        <ErrorDialog
          message={errorMessage}
          onClose={() => setErrorMessage("")}
        />
      )}
    </>
  );
};

const ExcalidrawApp = () => {
  return (
    <TopErrorBoundary>
      <CollabContextConsumer>
        <ExcalidrawWrapper />
      </CollabContextConsumer>
    </TopErrorBoundary>
  );
};

export default ExcalidrawApp;

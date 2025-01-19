import { useEffect, useRef, useState } from "react";
import {
  useApp,
  useAppProps,
  useExcalidrawActionManager,
  useExcalidrawSetAppState,
} from "../App";
import { KEYS } from "../../keys";
import { Dialog } from "../Dialog";
import { TextField } from "../TextField";
import clsx from "clsx";
import { getSelectedElements } from "../../scene";
import type { Action } from "../../actions/types";
import type { TranslationKeys } from "../../i18n";
import { t } from "../../i18n";
import type { ShortcutName } from "../../actions/shortcuts";
import { getShortcutFromShortcutName } from "../../actions/shortcuts";
import { DEFAULT_SIDEBAR, EVENT } from "../../constants";
import {
  LockedIcon,
  UnlockedIcon,
  clockIcon,
  searchIcon,
  boltIcon,
  bucketFillIcon,
  ExportImageIcon,
  mermaidLogoIcon,
  brainIconThin,
  LibraryIcon,
} from "../icons";
import fuzzy from "fuzzy";
import { useUIAppState } from "../../context/ui-appState";
import type { AppProps, AppState, UIAppState } from "../../types";
import {
  capitalizeString,
  getShortcutKey,
  isWritableElement,
} from "../../utils";
import { atom, useAtom, editorJotaiStore } from "../../editor-jotai";
import { deburr } from "../../deburr";
import type { MarkRequired } from "../../utility-types";
import { InlineIcon } from "../InlineIcon";
import { SHAPES } from "../../shapes";
import { canChangeBackgroundColor, canChangeStrokeColor } from "../Actions";
import { useStableCallback } from "../../hooks/useStableCallback";
import {
  actionClearCanvas,
  actionLink,
  actionToggleSearchMenu,
} from "../../actions";
import { activeConfirmDialogAtom } from "../ActiveConfirmDialog";
import type { CommandPaletteItem } from "./types";
import * as defaultItems from "./defaultCommandPaletteItems";
import { trackEvent } from "../../analytics";
import { useStable } from "../../hooks/useStable";

import "./CommandPalette.scss";
import {
  actionCopyElementLink,
  actionLinkToElement,
} from "../../actions/actionElementLink";

const lastUsedPaletteItem = atom<CommandPaletteItem | null>(null);

export const DEFAULT_CATEGORIES = {
  app: "App",
  export: "Export",
  tools: "Tools",
  editor: "Editor",
  elements: "Elements",
  links: "Links",
};

const getCategoryOrder = (category: string) => {
  switch (category) {
    case DEFAULT_CATEGORIES.app:
      return 1;
    case DEFAULT_CATEGORIES.export:
      return 2;
    case DEFAULT_CATEGORIES.editor:
      return 3;
    case DEFAULT_CATEGORIES.tools:
      return 4;
    case DEFAULT_CATEGORIES.elements:
      return 5;
    case DEFAULT_CATEGORIES.links:
      return 6;
    default:
      return 10;
  }
};

const CommandShortcutHint = ({
  shortcut,
  className,
  children,
}: {
  shortcut: string;
  className?: string;
  children?: React.ReactNode;
}) => {
  const shortcuts = shortcut.replace("++", "+$").split("+");

  return (
    <div className={clsx("shortcut", className)}>
      {shortcuts.map((item, idx) => {
        return (
          <div className="shortcut-wrapper" key={item}>
            <div className="shortcut-key">{item === "$" ? "+" : item}</div>
          </div>
        );
      })}
      <div className="shortcut-desc">{children}</div>
    </div>
  );
};

const isCommandPaletteToggleShortcut = (event: KeyboardEvent) => {
  return (
    !event.altKey &&
    event[KEYS.CTRL_OR_CMD] &&
    ((event.shiftKey && event.key.toLowerCase() === KEYS.P) ||
      event.key === KEYS.SLASH)
  );
};

type CommandPaletteProps = {
  customCommandPaletteItems?: CommandPaletteItem[];
};

export const CommandPalette = Object.assign(
  (props: CommandPaletteProps) => {
    const uiAppState = useUIAppState();
    const setAppState = useExcalidrawSetAppState();

    useEffect(() => {
      const commandPaletteShortcut = (event: KeyboardEvent) => {
        if (isCommandPaletteToggleShortcut(event)) {
          event.preventDefault();
          event.stopPropagation();
          setAppState((appState) => {
            const nextState =
              appState.openDialog?.name === "commandPalette"
                ? null
                : ({ name: "commandPalette" } as const);

            if (nextState) {
              trackEvent("command_palette", "open", "shortcut");
            }

            return {
              openDialog: nextState,
            };
          });
        }
      };
      window.addEventListener(EVENT.KEYDOWN, commandPaletteShortcut, {
        capture: true,
      });
      return () =>
        window.removeEventListener(EVENT.KEYDOWN, commandPaletteShortcut, {
          capture: true,
        });
    }, [setAppState]);

    if (uiAppState.openDialog?.name !== "commandPalette") {
      return null;
    }

    return <CommandPaletteInner {...props} />;
  },
  {
    defaultItems,
  },
);

function CommandPaletteInner({
  customCommandPaletteItems,
}: CommandPaletteProps) {
  const app = useApp();
  const uiAppState = useUIAppState();
  const setAppState = useExcalidrawSetAppState();
  const appProps = useAppProps();
  const actionManager = useExcalidrawActionManager();

  const [lastUsed, setLastUsed] = useAtom(lastUsedPaletteItem);
  const [allCommands, setAllCommands] = useState<
    MarkRequired<CommandPaletteItem, "haystack" | "order">[] | null
  >(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const stableDeps = useStable({
    uiAppState,
    customCommandPaletteItems,
    appProps,
  });

  useEffect(() => {
    // these props change often and we don't want them to re-run the effect
    // which would renew `allCommands`, cascading down and resetting state.
    //
    // This means that the commands won't update on appState/appProps changes
    // while the command palette is open
    const { uiAppState, customCommandPaletteItems, appProps } = stableDeps;

    const getActionLabel = (action: Action) => {
      let label = "";
      if (action.label) {
        if (typeof action.label === "function") {
          label = t(
            action.label(
              app.scene.getNonDeletedElements(),
              uiAppState as AppState,
              app,
            ) as unknown as TranslationKeys,
          );
        } else {
          label = t(action.label as unknown as TranslationKeys);
        }
      }
      return label;
    };

    const getActionIcon = (action: Action) => {
      if (typeof action.icon === "function") {
        return action.icon(uiAppState, app.scene.getNonDeletedElements());
      }
      return action.icon;
    };

    let commandsFromActions: CommandPaletteItem[] = [];

    const actionToCommand = (
      action: Action,
      category: string,
      transformer?: (
        command: CommandPaletteItem,
        action: Action,
      ) => CommandPaletteItem,
    ): CommandPaletteItem => {
      const command: CommandPaletteItem = {
        label: getActionLabel(action),
        icon: getActionIcon(action),
        category,
        shortcut: getShortcutFromShortcutName(action.name as ShortcutName),
        keywords: action.keywords,
        predicate: action.predicate,
        viewMode: action.viewMode,
        perform: () => {
          actionManager.executeAction(action, "commandPalette");
        },
      };

      return transformer ? transformer(command, action) : command;
    };

    if (uiAppState && app.scene && actionManager) {
      const elementsCommands: CommandPaletteItem[] = [
        actionManager.actions.group,
        actionManager.actions.ungroup,
        actionManager.actions.cut,
        actionManager.actions.copy,
        actionManager.actions.deleteSelectedElements,
        actionManager.actions.wrapSelectionInFrame,
        actionManager.actions.copyStyles,
        actionManager.actions.pasteStyles,
        actionManager.actions.bringToFront,
        actionManager.actions.bringForward,
        actionManager.actions.sendBackward,
        actionManager.actions.sendToBack,
        actionManager.actions.alignTop,
        actionManager.actions.alignBottom,
        actionManager.actions.alignLeft,
        actionManager.actions.alignRight,
        actionManager.actions.alignVerticallyCentered,
        actionManager.actions.alignHorizontallyCentered,
        actionManager.actions.duplicateSelection,
        actionManager.actions.flipHorizontal,
        actionManager.actions.flipVertical,
        actionManager.actions.zoomToFitSelection,
        actionManager.actions.zoomToFitSelectionInViewport,
        actionManager.actions.increaseFontSize,
        actionManager.actions.decreaseFontSize,
        actionManager.actions.toggleLinearEditor,
        actionManager.actions.cropEditor,
        actionLink,
        actionCopyElementLink,
        actionLinkToElement,
      ].map((action: Action) =>
        actionToCommand(
          action,
          DEFAULT_CATEGORIES.elements,
          (command, action) => ({
            ...command,
            predicate: action.predicate
              ? action.predicate
              : (elements, appState, appProps, app) => {
                  const selectedElements = getSelectedElements(
                    elements,
                    appState,
                  );
                  return selectedElements.length > 0;
                },
          }),
        ),
      );
      const toolCommands: CommandPaletteItem[] = [
        actionManager.actions.toggleHandTool,
        actionManager.actions.setFrameAsActiveTool,
      ].map((action) => actionToCommand(action, DEFAULT_CATEGORIES.tools));

      const editorCommands: CommandPaletteItem[] = [
        actionManager.actions.undo,
        actionManager.actions.redo,
        actionManager.actions.zoomIn,
        actionManager.actions.zoomOut,
        actionManager.actions.resetZoom,
        actionManager.actions.zoomToFit,
        actionManager.actions.zenMode,
        actionManager.actions.viewMode,
        actionManager.actions.gridMode,
        actionManager.actions.objectsSnapMode,
        actionManager.actions.toggleShortcuts,
        actionManager.actions.selectAll,
        actionManager.actions.toggleElementLock,
        actionManager.actions.unlockAllElements,
        actionManager.actions.stats,
      ].map((action) => actionToCommand(action, DEFAULT_CATEGORIES.editor));

      const exportCommands: CommandPaletteItem[] = [
        actionManager.actions.saveToActiveFile,
        actionManager.actions.saveFileToDisk,
        actionManager.actions.copyAsPng,
        actionManager.actions.copyAsSvg,
      ].map((action) => actionToCommand(action, DEFAULT_CATEGORIES.export));

      commandsFromActions = [
        ...elementsCommands,
        ...editorCommands,
        {
          label: getActionLabel(actionClearCanvas),
          icon: getActionIcon(actionClearCanvas),
          shortcut: getShortcutFromShortcutName(
            actionClearCanvas.name as ShortcutName,
          ),
          category: DEFAULT_CATEGORIES.editor,
          keywords: ["delete", "destroy"],
          viewMode: false,
          perform: () => {
            editorJotaiStore.set(activeConfirmDialogAtom, "clearCanvas");
          },
        },
        {
          label: t("buttons.exportImage"),
          category: DEFAULT_CATEGORIES.export,
          icon: ExportImageIcon,
          shortcut: getShortcutFromShortcutName("imageExport"),
          keywords: [
            "export",
            "image",
            "png",
            "jpeg",
            "svg",
            "clipboard",
            "picture",
          ],
          perform: () => {
            setAppState({ openDialog: { name: "imageExport" } });
          },
        },
        ...exportCommands,
      ];

      const additionalCommands: CommandPaletteItem[] = [
        {
          label: t("toolBar.library"),
          category: DEFAULT_CATEGORIES.app,
          icon: LibraryIcon,
          viewMode: false,
          perform: () => {
            if (uiAppState.openSidebar) {
              setAppState({
                openSidebar: null,
              });
            } else {
              setAppState({
                openSidebar: {
                  name: DEFAULT_SIDEBAR.name,
                  tab: DEFAULT_SIDEBAR.defaultTab,
                },
              });
            }
          },
        },
        {
          label: t("search.title"),
          category: DEFAULT_CATEGORIES.app,
          icon: searchIcon,
          viewMode: true,
          perform: () => {
            actionManager.executeAction(actionToggleSearchMenu);
          },
        },
        {
          label: t("labels.changeStroke"),
          keywords: ["color", "outline"],
          category: DEFAULT_CATEGORIES.elements,
          icon: bucketFillIcon,
          viewMode: false,
          predicate: (elements, appState) => {
            const selectedElements = getSelectedElements(elements, appState);
            return (
              selectedElements.length > 0 &&
              canChangeStrokeColor(appState, selectedElements)
            );
          },
          perform: () => {
            setAppState((prevState) => ({
              openMenu: prevState.openMenu === "shape" ? null : "shape",
              openPopup: "elementStroke",
            }));
          },
        },
        {
          label: t("labels.changeBackground"),
          keywords: ["color", "fill"],
          icon: bucketFillIcon,
          category: DEFAULT_CATEGORIES.elements,
          viewMode: false,
          predicate: (elements, appState) => {
            const selectedElements = getSelectedElements(elements, appState);
            return (
              selectedElements.length > 0 &&
              canChangeBackgroundColor(appState, selectedElements)
            );
          },
          perform: () => {
            setAppState((prevState) => ({
              openMenu: prevState.openMenu === "shape" ? null : "shape",
              openPopup: "elementBackground",
            }));
          },
        },
        {
          label: t("labels.canvasBackground"),
          keywords: ["color"],
          icon: bucketFillIcon,
          category: DEFAULT_CATEGORIES.editor,
          viewMode: false,
          perform: () => {
            setAppState((prevState) => ({
              openMenu: prevState.openMenu === "canvas" ? null : "canvas",
              openPopup: "canvasBackground",
            }));
          },
        },
        ...SHAPES.reduce((acc: CommandPaletteItem[], shape) => {
          const { value, icon, key, numericKey } = shape;

          if (
            appProps.UIOptions.tools?.[
              value as Extract<
                typeof value,
                keyof AppProps["UIOptions"]["tools"]
              >
            ] === false
          ) {
            return acc;
          }

          const letter =
            key && capitalizeString(typeof key === "string" ? key : key[0]);
          const shortcut = letter || numericKey;

          const command: CommandPaletteItem = {
            label: t(`toolBar.${value}`),
            category: DEFAULT_CATEGORIES.tools,
            shortcut,
            icon,
            keywords: ["toolbar"],
            viewMode: false,
            perform: ({ event }) => {
              if (value === "image") {
                app.setActiveTool({
                  type: value,
                  insertOnCanvasDirectly: event.type === EVENT.KEYDOWN,
                });
              } else {
                app.setActiveTool({ type: value });
              }
            },
          };

          acc.push(command);

          return acc;
        }, []),
        ...toolCommands,
        {
          label: t("toolBar.lock"),
          category: DEFAULT_CATEGORIES.tools,
          icon: uiAppState.activeTool.locked ? LockedIcon : UnlockedIcon,
          shortcut: KEYS.Q.toLocaleUpperCase(),
          viewMode: false,
          perform: () => {
            app.toggleLock();
          },
        },
        {
          label: `${t("labels.textToDiagram")}...`,
          category: DEFAULT_CATEGORIES.tools,
          icon: brainIconThin,
          viewMode: false,
          predicate: appProps.aiEnabled,
          perform: () => {
            setAppState((state) => ({
              ...state,
              openDialog: {
                name: "ttd",
                tab: "text-to-diagram",
              },
            }));
          },
        },
        {
          label: `${t("toolBar.mermaidToExcalidraw")}...`,
          category: DEFAULT_CATEGORIES.tools,
          icon: mermaidLogoIcon,
          viewMode: false,
          predicate: appProps.aiEnabled,
          perform: () => {
            setAppState((state) => ({
              ...state,
              openDialog: {
                name: "ttd",
                tab: "mermaid",
              },
            }));
          },
        },
        // {
        //   label: `${t("toolBar.magicframe")}...`,
        //   category: DEFAULT_CATEGORIES.tools,
        //   icon: MagicIconThin,
        //   viewMode: false,
        //   predicate: appProps.aiEnabled,
        //   perform: () => {
        //     app.onMagicframeToolSelect();
        //   },
        // },
      ];

      const allCommands = [
        ...commandsFromActions,
        ...additionalCommands,
        ...(customCommandPaletteItems || []),
      ].map((command) => {
        return {
          ...command,
          icon: command.icon || boltIcon,
          order: command.order ?? getCategoryOrder(command.category),
          haystack: `${deburr(command.label.toLocaleLowerCase())} ${
            command.keywords?.join(" ") || ""
          }`,
        };
      });

      setAllCommands(allCommands);
      setLastUsed(
        allCommands.find((command) => command.label === lastUsed?.label) ??
          null,
      );
    }
  }, [
    stableDeps,
    app,
    actionManager,
    setAllCommands,
    lastUsed?.label,
    setLastUsed,
    setAppState,
  ]);

  const [commandSearch, setCommandSearch] = useState("");
  const [currentCommand, setCurrentCommand] =
    useState<CommandPaletteItem | null>(null);
  const [commandsByCategory, setCommandsByCategory] = useState<
    Record<string, CommandPaletteItem[]>
  >({});

  const closeCommandPalette = (cb?: () => void) => {
    setAppState(
      {
        openDialog: null,
      },
      cb,
    );
    setCommandSearch("");
  };

  const executeCommand = (
    command: CommandPaletteItem,
    event: React.MouseEvent | React.KeyboardEvent | KeyboardEvent,
  ) => {
    if (uiAppState.openDialog?.name === "commandPalette") {
      event.stopPropagation();
      event.preventDefault();
      document.body.classList.add("excalidraw-animations-disabled");
      closeCommandPalette(() => {
        command.perform({ actionManager, event });
        setLastUsed(command);

        requestAnimationFrame(() => {
          document.body.classList.remove("excalidraw-animations-disabled");
        });
      });
    }
  };

  const isCommandAvailable = useStableCallback(
    (command: CommandPaletteItem) => {
      if (command.viewMode === false && uiAppState.viewModeEnabled) {
        return false;
      }

      return typeof command.predicate === "function"
        ? command.predicate(
            app.scene.getNonDeletedElements(),
            uiAppState as AppState,
            appProps,
            app,
          )
        : command.predicate === undefined || command.predicate;
    },
  );

  const handleKeyDown = useStableCallback((event: KeyboardEvent) => {
    const ignoreAlphanumerics =
      isWritableElement(event.target) ||
      isCommandPaletteToggleShortcut(event) ||
      event.key === KEYS.ESCAPE;

    if (
      ignoreAlphanumerics &&
      event.key !== KEYS.ARROW_UP &&
      event.key !== KEYS.ARROW_DOWN &&
      event.key !== KEYS.ENTER
    ) {
      return;
    }

    const matchingCommands = Object.values(commandsByCategory).flat();
    const shouldConsiderLastUsed =
      lastUsed && !commandSearch && isCommandAvailable(lastUsed);

    if (event.key === KEYS.ARROW_UP) {
      event.preventDefault();
      const index = matchingCommands.findIndex(
        (item) => item.label === currentCommand?.label,
      );

      if (shouldConsiderLastUsed) {
        if (index === 0) {
          setCurrentCommand(lastUsed);
          return;
        }

        if (currentCommand === lastUsed) {
          const nextItem = matchingCommands[matchingCommands.length - 1];
          if (nextItem) {
            setCurrentCommand(nextItem);
          }
          return;
        }
      }

      let nextIndex;

      if (index === -1) {
        nextIndex = matchingCommands.length - 1;
      } else {
        nextIndex =
          index === 0
            ? matchingCommands.length - 1
            : (index - 1) % matchingCommands.length;
      }

      const nextItem = matchingCommands[nextIndex];
      if (nextItem) {
        setCurrentCommand(nextItem);
      }

      return;
    }

    if (event.key === KEYS.ARROW_DOWN) {
      event.preventDefault();
      const index = matchingCommands.findIndex(
        (item) => item.label === currentCommand?.label,
      );

      if (shouldConsiderLastUsed) {
        if (!currentCommand || index === matchingCommands.length - 1) {
          setCurrentCommand(lastUsed);
          return;
        }

        if (currentCommand === lastUsed) {
          const nextItem = matchingCommands[0];
          if (nextItem) {
            setCurrentCommand(nextItem);
          }
          return;
        }
      }

      const nextIndex = (index + 1) % matchingCommands.length;
      const nextItem = matchingCommands[nextIndex];
      if (nextItem) {
        setCurrentCommand(nextItem);
      }

      return;
    }

    if (event.key === KEYS.ENTER) {
      if (currentCommand) {
        setTimeout(() => {
          executeCommand(currentCommand, event);
        });
      }
    }

    if (ignoreAlphanumerics) {
      return;
    }

    // prevent regular editor shortcuts
    event.stopPropagation();

    // if alphanumeric keypress and we're not inside the input, focus it
    if (/^[a-zA-Z0-9]$/.test(event.key)) {
      inputRef?.current?.focus();
      return;
    }

    event.preventDefault();
  });

  useEffect(() => {
    window.addEventListener(EVENT.KEYDOWN, handleKeyDown, {
      capture: true,
    });
    return () =>
      window.removeEventListener(EVENT.KEYDOWN, handleKeyDown, {
        capture: true,
      });
  }, [handleKeyDown]);

  useEffect(() => {
    if (!allCommands) {
      return;
    }

    const getNextCommandsByCategory = (commands: CommandPaletteItem[]) => {
      const nextCommandsByCategory: Record<string, CommandPaletteItem[]> = {};
      for (const command of commands) {
        if (nextCommandsByCategory[command.category]) {
          nextCommandsByCategory[command.category].push(command);
        } else {
          nextCommandsByCategory[command.category] = [command];
        }
      }

      return nextCommandsByCategory;
    };

    let matchingCommands = allCommands
      .filter(isCommandAvailable)
      .sort((a, b) => a.order - b.order);

    const showLastUsed =
      !commandSearch && lastUsed && isCommandAvailable(lastUsed);

    if (!commandSearch) {
      setCommandsByCategory(
        getNextCommandsByCategory(
          showLastUsed
            ? matchingCommands.filter(
                (command) => command.label !== lastUsed?.label,
              )
            : matchingCommands,
        ),
      );
      setCurrentCommand(showLastUsed ? lastUsed : matchingCommands[0] || null);
      return;
    }

    const _query = deburr(
      commandSearch.toLocaleLowerCase().replace(/[<>_| -]/g, ""),
    );

    const matchingCommandsHaystack = fuzzy
      .filter(_query, matchingCommands, {
        extract: (command) => command.haystack,
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => item.original);

    const matchingCommandsShortcut = fuzzy
      .filter(_query, matchingCommands, {
        extract: (command) => command.shortcut || "",
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => item.original)
      .filter(
        (item) =>
          !matchingCommandsHaystack.some((item2) => item.label === item2.label),
      );

    matchingCommands = matchingCommandsHaystack.concat(
      matchingCommandsShortcut,
    );

    setCommandsByCategory(getNextCommandsByCategory(matchingCommands));
    setCurrentCommand(matchingCommands[0] ?? null);
  }, [commandSearch, allCommands, isCommandAvailable, lastUsed]);

  return (
    <Dialog
      onCloseRequest={() => closeCommandPalette()}
      closeOnClickOutside
      title={false}
      size={720}
      autofocus
      className="command-palette-dialog"
    >
      <TextField
        value={commandSearch}
        placeholder={t("commandPalette.search.placeholder")}
        onChange={(value) => {
          setCommandSearch(value);
        }}
        selectOnRender
        ref={inputRef}
      />

      {!app.device.viewport.isMobile && (
        <div className="shortcuts-wrapper">
          <CommandShortcutHint shortcut="↑↓">
            {t("commandPalette.shortcuts.select")}
          </CommandShortcutHint>
          <CommandShortcutHint shortcut="↵">
            {t("commandPalette.shortcuts.confirm")}
          </CommandShortcutHint>
          <CommandShortcutHint shortcut={getShortcutKey("Esc")}>
            {t("commandPalette.shortcuts.close")}
          </CommandShortcutHint>
        </div>
      )}

      <div className="commands">
        {lastUsed && !commandSearch && (
          <div className="command-category">
            <div className="command-category-title">
              {t("commandPalette.recents")}
              <div
                className="icon"
                style={{
                  marginLeft: "6px",
                }}
              >
                {clockIcon}
              </div>
            </div>
            <CommandItem
              command={lastUsed}
              isSelected={lastUsed.label === currentCommand?.label}
              onClick={(event) => executeCommand(lastUsed, event)}
              disabled={!isCommandAvailable(lastUsed)}
              onMouseMove={() => setCurrentCommand(lastUsed)}
              showShortcut={!app.device.viewport.isMobile}
              appState={uiAppState}
            />
          </div>
        )}

        {Object.keys(commandsByCategory).length > 0 ? (
          Object.keys(commandsByCategory).map((category, idx) => {
            return (
              <div className="command-category" key={category}>
                <div className="command-category-title">{category}</div>
                {commandsByCategory[category].map((command) => (
                  <CommandItem
                    key={command.label}
                    command={command}
                    isSelected={command.label === currentCommand?.label}
                    onClick={(event) => executeCommand(command, event)}
                    onMouseMove={() => setCurrentCommand(command)}
                    showShortcut={!app.device.viewport.isMobile}
                    appState={uiAppState}
                  />
                ))}
              </div>
            );
          })
        ) : allCommands ? (
          <div className="no-match">
            <div className="icon">{searchIcon}</div>{" "}
            {t("commandPalette.search.noMatch")}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

const CommandItem = ({
  command,
  isSelected,
  disabled,
  onMouseMove,
  onClick,
  showShortcut,
  appState,
}: {
  command: CommandPaletteItem;
  isSelected: boolean;
  disabled?: boolean;
  onMouseMove: () => void;
  onClick: (event: React.MouseEvent) => void;
  showShortcut: boolean;
  appState: UIAppState;
}) => {
  const noop = () => {};

  return (
    <div
      className={clsx("command-item", {
        "item-selected": isSelected,
        "item-disabled": disabled,
      })}
      ref={(ref) => {
        if (isSelected && !disabled) {
          ref?.scrollIntoView?.({
            block: "nearest",
          });
        }
      }}
      onClick={disabled ? noop : onClick}
      onMouseMove={disabled ? noop : onMouseMove}
      title={disabled ? t("commandPalette.itemNotAvailable") : ""}
    >
      <div className="name">
        {command.icon && (
          <InlineIcon
            icon={
              typeof command.icon === "function"
                ? command.icon(appState)
                : command.icon
            }
          />
        )}
        {command.label}
      </div>
      {showShortcut && command.shortcut && (
        <CommandShortcutHint shortcut={command.shortcut} />
      )}
    </div>
  );
};

import clsx from "clsx";
import React, { useEffect, useState } from "react";
import { useCallbackRefState } from "../hooks/useCallbackRefState";
import {
  useExcalidrawContainer,
  useDevice,
  useExcalidrawSetAppState,
} from "./App";
import { KEYS } from "../keys";
import "./Dialog.scss";
import { Island } from "./Island";
import { Modal } from "./Modal";
import { queryFocusableElements } from "../utils";
import { useSetAtom } from "jotai";
import { isLibraryMenuOpenAtom } from "./LibraryMenu";
import { jotaiScope } from "../jotai";
import { t } from "../i18n";
import { CloseIcon } from "./icons";

export type DialogSize = number | "small" | "regular" | "wide" | undefined;

export interface DialogProps {
  children: React.ReactNode;
  className?: string;
  size?: DialogSize;
  onCloseRequest(): void;
  title: React.ReactNode | false;
  autofocus?: boolean;
  closeOnClickOutside?: boolean;
}

function getDialogSize(size: DialogSize): number {
  if (size && typeof size === "number") {
    return size;
  }

  switch (size) {
    case "small":
      return 550;
    case "wide":
      return 1024;
    case "regular":
    default:
      return 800;
  }
}

export const Dialog = (props: DialogProps) => {
  const [islandNode, setIslandNode] = useCallbackRefState<HTMLDivElement>();
  const [lastActiveElement] = useState(document.activeElement);
  const { id } = useExcalidrawContainer();
  const isFullscreen = useDevice().viewport.isMobile;

  useEffect(() => {
    if (!islandNode) {
      return;
    }

    const focusableElements = queryFocusableElements(islandNode);

    setTimeout(() => {
      if (focusableElements.length > 0 && props.autofocus !== false) {
        // If there's an element other than close, focus it.
        (focusableElements[1] || focusableElements[0]).focus();
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === KEYS.TAB) {
        const focusableElements = queryFocusableElements(islandNode);
        const { activeElement } = document;
        const currentIndex = focusableElements.findIndex(
          (element) => element === activeElement,
        );

        if (currentIndex === 0 && event.shiftKey) {
          focusableElements[focusableElements.length - 1].focus();
          event.preventDefault();
        } else if (
          currentIndex === focusableElements.length - 1 &&
          !event.shiftKey
        ) {
          focusableElements[0].focus();
          event.preventDefault();
        }
      }
    };

    islandNode.addEventListener("keydown", handleKeyDown);

    return () => islandNode.removeEventListener("keydown", handleKeyDown);
  }, [islandNode, props.autofocus]);

  const setAppState = useExcalidrawSetAppState();
  const setIsLibraryMenuOpen = useSetAtom(isLibraryMenuOpenAtom, jotaiScope);

  const onClose = () => {
    setAppState({ openMenu: null });
    setIsLibraryMenuOpen(false);
    (lastActiveElement as HTMLElement).focus();
    props.onCloseRequest();
  };

  return (
    <Modal
      className={clsx("Dialog", props.className, {
        "Dialog--fullscreen": isFullscreen,
      })}
      labelledBy="dialog-title"
      maxWidth={getDialogSize(props.size)}
      onCloseRequest={onClose}
      closeOnClickOutside={props.closeOnClickOutside}
    >
      <Island ref={setIslandNode}>
        {props.title && (
          <h2 id={`${id}-dialog-title`} className="Dialog__title">
            <span className="Dialog__titleContent">{props.title}</span>
          </h2>
        )}
          <button
            className="Dialog__close"
            onClick={onClose}
            title={t("buttons.close")}
            aria-label={t("buttons.close")}
            type="button"
          >
            {CloseIcon}
          </button>
        <div className="Dialog__content">{props.children}</div>
      </Island>
    </Modal>
  );
};

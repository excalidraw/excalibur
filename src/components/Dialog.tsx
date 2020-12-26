import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Modal } from "./Modal";
import { Island } from "./Island";
import { t } from "../i18n";
import useIsMobile from "../is-mobile";
import { back, close } from "./icons";
import { KEYS } from "../keys";

import "./Dialog.scss";

const useRefState = <T,>() => {
  const [refValue, setRefValue] = useState<T | null>(null);
  const refCallback = useCallback((value: T) => {
    setRefValue(value);
  }, []);
  return [refValue, refCallback] as const;
};

export const Dialog = (props: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: number;
  onCloseRequest(): void;
  title: React.ReactNode;
  autofocus?: boolean;
}) => {
  const [islandNode, setIslandNode] = useRefState<HTMLDivElement>();

  useEffect(() => {
    if (!islandNode) {
      return;
    }

    const focusableElements = queryFocusableElements(islandNode);

    if (focusableElements.length > 0 && props.autofocus !== false) {
      // If there's an element other than close, focus it.
      (focusableElements[1] || focusableElements[0]).focus();
    }

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
  }, [islandNode]);

  const queryFocusableElements = (node: HTMLElement) => {
    const focusableElements = node.querySelectorAll<HTMLElement>(
      "button, a, input, select, textarea, div[tabindex]",
    );

    return focusableElements ? Array.from(focusableElements) : [];
  };

  return (
    <Modal
      className={clsx("Dialog", props.className)}
      labelledBy="dialog-title"
      maxWidth={props.maxWidth}
      onCloseRequest={props.onCloseRequest}
    >
      <Island padding={4} ref={setIslandNode}>
        <h2 id="dialog-title" className="Dialog__title">
          <span className="Dialog__titleContent">{props.title}</span>
          <button
            className="Modal__close"
            onClick={props.onCloseRequest}
            aria-label={t("buttons.close")}
          >
            {useIsMobile() ? back : close}
          </button>
        </h2>
        {props.children}
      </Island>
    </Modal>
  );
};

import "./Modal.scss";

import clsx from "clsx";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useCreatePortalContainer } from "../hooks/useCreatePortalContainer";
import { KEYS } from "../keys";
import type { AppState } from "../types";

export const Modal: React.FC<{
  className?: string;
  children: React.ReactNode;
  maxWidth?: number;
  onCloseRequest(): void;
  labelledBy: string;
  theme?: AppState["theme"];
  closeOnClickOutside?: boolean;
}> = (props) => {
  const { closeOnClickOutside = true } = props;
  const modalRoot = useCreatePortalContainer({
    className: "excalidraw-modal-container",
  });

  const animationsDisabledRef = useRef(
    document.body.classList.contains("excalidraw-animations-disabled"),
  );

  if (!modalRoot) {
    return null;
  }

  const handleKeydown = (event: React.KeyboardEvent) => {
    if (event.key === KEYS.ESCAPE) {
      event.nativeEvent.stopImmediatePropagation();
      event.stopPropagation();
      props.onCloseRequest();
    }
  };

  return createPortal(
    <dialog
      className={clsx("Modal", props.className, {
        "animations-disabled": animationsDisabledRef.current,
      })}
      aria-modal="true"
      onKeyDown={handleKeydown}
      aria-labelledby={props.labelledBy}
      data-prevent-outside-click
    >
      <div
        className="Modal__background"
        onClick={closeOnClickOutside ? props.onCloseRequest : undefined}
      />
      <div
        className="Modal__content"
        style={{ "--max-width": `${props.maxWidth}px` }}
        tabIndex={0}
      >
        {props.children}
      </div>
    </dialog>,
    modalRoot,
  );
};

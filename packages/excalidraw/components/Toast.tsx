import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef } from "react";
import { CloseIcon } from "./icons";
import "./Toast.scss";
import { ToolButton } from "./ToolButton";

const DEFAULT_TOAST_TIMEOUT = 5000;

export type ToastType = "message" | "warning" | "danger" | "success";

export const Toast = ({
  message,
  onClose,
  closable = false,
  // To prevent autoclose, pass duration as Infinity
  duration = DEFAULT_TOAST_TIMEOUT,
  style,
  type = "message",
}: {
  message: string;
  onClose: () => void;
  closable?: boolean;
  duration?: number;
  style?: CSSProperties;
  type?: ToastType;
}) => {
  const timerRef = useRef<number>(0);
  const shouldAutoClose = duration !== Infinity;
  const scheduleTimeout = useCallback(() => {
    if (!shouldAutoClose) {
      return;
    }
    timerRef.current = window.setTimeout(() => onClose(), duration);
  }, [onClose, duration, shouldAutoClose]);

  useEffect(() => {
    if (!shouldAutoClose) {
      return;
    }
    scheduleTimeout();
    return () => clearTimeout(timerRef.current);
  }, [scheduleTimeout, message, duration, shouldAutoClose]);

  const onMouseEnter = shouldAutoClose
    ? () => clearTimeout(timerRef?.current)
    : undefined;
  const onMouseLeave = shouldAutoClose ? scheduleTimeout : undefined;

  // Toast classnames: Toast__message, Toast__warning, Toast__danger, Toast__success
  const className = `Toast__${type}`;
  const backgroundColor = `var(--bg-toast-${type})`;

  return (
    <div
      className="Toast"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        backgroundColor,
        ...style,
      }}
    >
      <p className={className}>{message}</p>
      {closable && (
        <ToolButton
          icon={CloseIcon}
          aria-label="close"
          type="icon"
          onClick={onClose}
          className={`close ${className}__close`}
        />
      )}
    </div>
  );
};

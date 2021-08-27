import "./ToolIcon.scss";

import React from "react";
import clsx from "clsx";
import { useExcalidrawContainer } from "./App";

export type ToolButtonSize = "small" | "medium";

type ToolButtonBaseProps = {
  icon?: React.ReactNode;
  "aria-label": string;
  "aria-keyshortcuts"?: string;
  "data-testid"?: string;
  label?: string;
  title?: string;
  name?: string;
  id?: string;
  size?: ToolButtonSize;
  keyBindingLabel?: string;
  showAriaLabel?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  visible?: boolean;
  selected?: boolean;
  className?: string;
};

type ToolButtonProps =
  | (ToolButtonBaseProps & {
      type: "button";
      children?: React.ReactNode;
      onClick?(): void;
    })
  | (ToolButtonBaseProps & {
      type: "icon";
      children?: React.ReactNode;
      onClick?(): void;
    })
  | (ToolButtonBaseProps & {
      type: "radio";
      checked: boolean;
      onChange?(): void;
    });

export const ToolButton = React.forwardRef((props: ToolButtonProps, ref) => {
  const { id: excalId } = useExcalidrawContainer();
  const innerRef = React.useRef(null);
  React.useImperativeHandle(ref, () => innerRef.current);
  const sizeCn = `ToolIcon_size_${props.size}`;

  if (props.type === "button" || props.type === "icon") {
    return (
      <button
        className={clsx(
          "ToolIcon_type_button",
          sizeCn,
          props.className,
          props.visible && !props.hidden
            ? "ToolIcon_type_button--show"
            : "ToolIcon_type_button--hide",
          {
            ToolIcon: !props.hidden,
            "ToolIcon--selected": props.selected,
            "ToolIcon--plain": props.type === "icon",
          },
        )}
        data-testid={props["data-testid"]}
        hidden={props.hidden}
        disabled={props.disabled}
        title={props.title}
        aria-label={props["aria-label"]}
        type="button"
        onClick={props.onClick}
        ref={innerRef}
      >
        {(props.icon || props.label) && (
          <div className="ToolIcon__icon" aria-hidden="true">
            {props.icon || props.label}
            {props.keyBindingLabel && (
              <span className="ToolIcon__keybinding">
                {props.keyBindingLabel}
              </span>
            )}
          </div>
        )}
        {props.showAriaLabel && (
          <div className="ToolIcon__label">{props["aria-label"]}</div>
        )}
        {props.children}
      </button>
    );
  }

  return (
    <label
      className={clsx(
        "ToolIcon",
        props.className,
        props.disabled ? "ToolIcon_disabled" : "",
      )}
      title={props.title}
    >
      <input
        className={`ToolIcon_type_radio ${sizeCn}`}
        type="radio"
        name={props.name}
        disabled={props.disabled}
        aria-label={props["aria-label"]}
        aria-keyshortcuts={props["aria-keyshortcuts"]}
        data-testid={props["data-testid"]}
        id={`${excalId}-${props.id}`}
        onChange={props.onChange}
        checked={props.checked}
        ref={innerRef}
      />
      <div
        className={clsx(
          "ToolIcon__icon",
          props.disabled ? "ToolIcon__icon_disabled" : "",
        )}
      >
        {props.icon}
        {props.keyBindingLabel && (
          <span className="ToolIcon__keybinding">{props.keyBindingLabel}</span>
        )}
      </div>
    </label>
  );
});

ToolButton.defaultProps = {
  visible: true,
  className: "",
  size: "medium",
};

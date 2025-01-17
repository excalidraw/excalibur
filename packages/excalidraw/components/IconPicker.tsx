import React, { useEffect, useRef } from "react";
import * as Popover from "@radix-ui/react-popover";
import { isArrowKey, KEYS } from "../keys";
import { getLanguage, t } from "../i18n";
import clsx from "clsx";
import Collapsible from "./Stats/Collapsible";
import { atom, useAtom } from "../editor-jotai";
import { useDevice } from "..";

import "./IconPicker.scss";

const moreOptionsAtom = atom(false);

type Option<T> = {
  value: T;
  text: string;
  icon: JSX.Element;
  keyBinding: string | null;
};

function Picker<T>({
  options,
  value,
  label,
  onChange,
  onClose,
  numberOfOptionsToAlwaysShow = options.length,
}: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  onClose: () => void;
  numberOfOptionsToAlwaysShow?: number;
}) {
  const device = useDevice();

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const pressedOption = options.find(
      (option) => option.keyBinding === event.key.toLowerCase(),
    )!;

    if (!(event.metaKey || event.altKey || event.ctrlKey) && pressedOption) {
      // Keybinding navigation
      onChange(pressedOption.value);

      event.preventDefault();
    } else if (event.key === KEYS.TAB) {
      const index = options.findIndex((option) => option.value === value);
      const nextIndex = event.shiftKey
        ? (options.length + index - 1) % options.length
        : (index + 1) % options.length;
      onChange(options[nextIndex].value);
    } else if (isArrowKey(event.key)) {
      // Arrow navigation
      const isRTL = getLanguage().rtl;
      const index = options.findIndex((option) => option.value === value);
      if (index !== -1) {
        const length = options.length;
        let nextIndex = index;

        switch (event.key) {
          // Select the next option
          case isRTL ? KEYS.ARROW_LEFT : KEYS.ARROW_RIGHT:
            nextIndex = (index + 1) % length;
            break;
          // Select the previous option
          case isRTL ? KEYS.ARROW_RIGHT : KEYS.ARROW_LEFT:
            nextIndex = (length + index - 1) % length;
            break;
          // Go the next row
          case KEYS.ARROW_DOWN: {
            nextIndex = (index + (numberOfOptionsToAlwaysShow ?? 1)) % length;
            break;
          }
          // Go the previous row
          case KEYS.ARROW_UP: {
            nextIndex =
              (length + index - (numberOfOptionsToAlwaysShow ?? 1)) % length;
            break;
          }
        }

        onChange(options[nextIndex].value);
      }
      event.preventDefault();
    } else if (event.key === KEYS.ESCAPE || event.key === KEYS.ENTER) {
      // Close on escape or enter
      event.preventDefault();
      onClose();
    }
    event.nativeEvent.stopImmediatePropagation();
    event.stopPropagation();
  };

  const [showMoreOptions, setShowMoreOptions] = useAtom(moreOptionsAtom);

  const alwaysVisibleOptions = React.useMemo(
    () => options.slice(0, numberOfOptionsToAlwaysShow),
    [options, numberOfOptionsToAlwaysShow],
  );
  const moreOptions = React.useMemo(
    () => options.slice(numberOfOptionsToAlwaysShow),
    [options, numberOfOptionsToAlwaysShow],
  );

  useEffect(() => {
    if (!alwaysVisibleOptions.some((option) => option.value === value)) {
      setShowMoreOptions(true);
    }
  }, [value, alwaysVisibleOptions, setShowMoreOptions]);

  const renderOptions = (options: Option<T>[]) => {
    return (
      <div className="picker-content">
        {options.map((option, i) => (
          <button
            type="button"
            className={clsx("picker-option", {
              active: value === option.value,
            })}
            onClick={(event) => {
              onChange(option.value);
            }}
            title={`${option.text} ${
              option.keyBinding && `— ${option.keyBinding.toUpperCase()}`
            }`}
            aria-label={option.text || "none"}
            aria-keyshortcuts={option.keyBinding || undefined}
            key={option.text}
            ref={(ref) => {
              if (value === option.value) {
                // Use a timeout here to render focus properly
                setTimeout(() => {
                  ref?.focus();
                }, 0);
              }
            }}
          >
            {option.icon}
            {option.keyBinding && (
              <span className="picker-keybinding">{option.keyBinding}</span>
            )}
          </button>
        ))}
      </div>
    );
  };
  
  // Handles popup overflowing viewport after getting More options 
  const arrowHeadRef = useRef<HTMLDivElement|null>(null); 
  useEffect(()=>{
    const adjustHeight = ()=>{
      if(arrowHeadRef.current){
        const popup = arrowHeadRef.current;
        const rect = popup.getBoundingClientRect();
        if (showMoreOptions && rect.bottom >= window.innerHeight){
          popup.style.maxHeight = `${rect.height - (rect.bottom - window.innerHeight)- 20}px`;
          popup.style.overflowY = "scroll";
        }
      }
    }

    adjustHeight();
  },[showMoreOptions])
  
  return (
    <Popover.Content
      side={
        device.editor.isMobile && !device.viewport.isLandscape
          ? "top"
          : "bottom"
      }
      align="start"
      sideOffset={12}
      style={{ zIndex: "var(--zIndex-popup)" }}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`picker`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        ref={arrowHeadRef}
      >
        {renderOptions(alwaysVisibleOptions)}

        {moreOptions.length > 0 && (
          <Collapsible
            label={t("labels.more_options")}
            open={showMoreOptions}
            openTrigger={() => {
              setShowMoreOptions((value) => !value);
            }}
            className="picker-collapsible"
          >
            {renderOptions(moreOptions)}
          </Collapsible>
        )}
      </div>
    </Popover.Content>
  );
}

export function IconPicker<T>({
  value,
  label,
  options,
  onChange,
  group = "",
  numberOfOptionsToAlwaysShow,
}: {
  label: string;
  value: T;
  options: readonly {
    value: T;
    text: string;
    icon: JSX.Element;
    keyBinding: string | null;
  }[];
  onChange: (value: T) => void;
  numberOfOptionsToAlwaysShow?: number;
  group?: string;
}) {
  const [isActive, setActive] = React.useState(false);
  const rPickerButton = React.useRef<any>(null);

  // Handles popup directly overflowing viewport when triggered 
  const arrowHeadRef = useRef<HTMLDivElement|null>(null); 
  useEffect(()=>{
    const adjustHeight = ()=>{
      if(arrowHeadRef.current){
        const popup = arrowHeadRef.current;
        const currDiv = popup?.childNodes[0]?.childNodes[0]?.childNodes[0] as HTMLElement;
        const PosRect = popup.getBoundingClientRect();
        const HeightRect = currDiv.getBoundingClientRect();
        
        // posRect.top contains the y axis position of the div's top
        // HeightRect.height contains height of div
        // DivBottom gives y axis position of bottom of div
        const DivBottom = PosRect.top + HeightRect.height;
        
        // in Case divBottom below windoHeight; the Picker is overflowing viewport; 
        if (isActive &&  DivBottom >= window.innerHeight){
          currDiv.style.maxHeight = `${HeightRect.bottom - (DivBottom - window.innerHeight) - 20}px`;  
          currDiv.style.overflowY = "scroll";
        }
        else{
          popup.style.maxHeight = "fit-content";
        }
      }
    }

    adjustHeight();
  },[isActive])
  
  return (
    <div>
      <Popover.Root open={isActive} onOpenChange={(open) => setActive(open)}>
        <Popover.Trigger
          name={group}
          type="button"
          aria-label={label}
          onClick={() => setActive(!isActive)}
          ref={rPickerButton}
          className={isActive ? "active" : ""}
        >
          {options.find((option) => option.value === value)?.icon}
        </Popover.Trigger>
        {isActive && (
          <div ref = {arrowHeadRef}>
          <Picker
            options={options}
            value={value}
            label={label}
            onChange={onChange}
            onClose={() => {
              setActive(false);
            }}
            numberOfOptionsToAlwaysShow={numberOfOptionsToAlwaysShow}
          />
          </div>
        )}
      </Popover.Root>
    </div>
  );
}

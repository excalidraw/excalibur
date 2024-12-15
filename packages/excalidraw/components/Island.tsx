import "./Island.scss";

import React, { useState }  from "react";
import clsx from "clsx";
import { Button } from "./Button";
import { palette } from "./icons";

type IslandProps = {
  children: React.ReactNode;
  padding?: number;
  className?: string | boolean;
  style?: object;
  collapsable?: boolean;
};

export const Island = React.forwardRef<HTMLDivElement, IslandProps>(
  ({ children, padding, className, style, collapsable}, ref) => {
    const [isVisible, setIsVisible] = useState(true);

    const toggleIslandVisibility = () => { setIsVisible(!isVisible) };

    if (collapsable) {
      if (isVisible) {
        return (
          <div
            className={clsx("Island", className)}
            style={{ "--padding": padding, ...style }}
            ref={ref}
          >
            <Button
              onSelect={() => {toggleIslandVisibility()}}
              className="ToolIcon_type_button"
            >
              {palette}
            </Button><br/>
            {children}
          </div>
        )
      }
      else {
        return (
          <Button
            onSelect={() => {toggleIslandVisibility()}}
            className="dropdown-menu-button"
          >
            {palette}
          </Button>
        )
      }
    }

    else {
      return (
        <div
          className={clsx("Island", className)}
          style={{ "--padding": padding, ...style }}
          ref={ref}
        >
          {children}
        </div>
    )
  }
  },
);

import clsx from "clsx";
import React from "react";
import { searchIcon } from "./icons";
import { TextField } from "./TextField";

import "./QuickSearch.scss";

interface QuickSearchProps {
  className?: string;
  placeholder: string;
  onChange: (term: string) => void;
}

export const QuickSearch = React.forwardRef<HTMLInputElement, QuickSearchProps>(
  ({ className, placeholder, onChange }, ref) => {
    return (
      <div className={clsx("layer-ui__search-header", className)}>
        <TextField
          className="layer-ui__search-inputWrapper"
          ref={ref}
          placeholder={placeholder}
          onChange={(value) => onChange(value.trim().toLowerCase())}
          defaultValue=""
          icon={searchIcon}
        />
      </div>
    );
  },
);

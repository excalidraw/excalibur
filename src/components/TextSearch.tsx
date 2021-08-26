import React from "react";
import { NonDeletedExcalidrawElement } from "../element/types";
import { useIsMobile } from "../components/App";
import { AppState } from "../types";
import { Island } from "./Island";
import "./TextSearch.scss";

export const TextSearch = (props: {
  appState: AppState;
  setAppState: React.Component<any, AppState>["setState"];
  elements: readonly NonDeletedExcalidrawElement[];
  onClose: () => void;
}) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return null;
  }

  return (
    <div className="TextSearch">
      <Island padding={1}>
        <input
          type="text"
          className="searchInput"
          id="inputText"
          onChange={(event) => {
            props.setAppState({ searchMatchText: event.target.value });
          }}
        />
      </Island>
    </div>
  );
};

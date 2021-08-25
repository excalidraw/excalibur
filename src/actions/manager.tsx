import React from "react";
import {
  Action,
  ActionsManagerInterface,
  UpdaterFn,
  ActionName,
  ActionResult,
  PanelComponentProps,
} from "./types";
import { ExcalidrawElement } from "../element/types";
import { AppClassProperties, AppState } from "../types";
import { MODES } from "../constants";

export class ActionManager implements ActionsManagerInterface {
  actions = {} as ActionsManagerInterface["actions"];

  updater: (actionResult: ActionResult | Promise<ActionResult>) => void;

  getAppState: () => Readonly<AppState>;
  getElementsIncludingDeleted: () => readonly ExcalidrawElement[];
  app: AppClassProperties;

  constructor(
    updater: UpdaterFn,
    getAppState: () => AppState,
    getElementsIncludingDeleted: () => readonly ExcalidrawElement[],
    app: AppClassProperties,
  ) {
    this.updater = (actionResult) => {
      if (actionResult && "then" in actionResult) {
        actionResult.then((actionResult) => {
          return updater(actionResult);
        });
      } else {
        return updater(actionResult);
      }
    };
    this.getAppState = getAppState;
    this.getElementsIncludingDeleted = getElementsIncludingDeleted;
    this.app = app;
  }

  registerAction(action: Action) {
    this.actions[action.name] = action;
  }

  registerAll(actions: readonly Action[]) {
    actions.forEach((action) => this.registerAction(action));
  }

  handleKeyDown(event: React.KeyboardEvent | KeyboardEvent) {
    const canvasActions = this.app.props.UIOptions.canvasActions;
    const data = Object.values(this.actions)
      .sort((a, b) => (b.keyPriority || 0) - (a.keyPriority || 0))
      .filter(
        (action) =>
          (action.name in canvasActions
            ? canvasActions[action.name as keyof typeof canvasActions]
            : true) &&
          action.keyTest &&
          action.keyTest(
            event,
            this.getAppState(),
            this.getElementsIncludingDeleted(),
          ),
      );

    if (data.length === 0) {
      return false;
    }
    const { viewModeEnabled } = this.getAppState();
    if (viewModeEnabled) {
      if (!Object.values(MODES).includes(data[0].name)) {
        return false;
      }
    }

    event.preventDefault();
    this.updater(
      data[0].perform(
        this.getElementsIncludingDeleted(),
        this.getAppState(),
        null,
        this.app,
      ),
    );
    return true;
  }

  executeAction(action: Action) {
    this.updater(
      action.perform(
        this.getElementsIncludingDeleted(),
        this.getAppState(),
        null,
        this.app,
      ),
    );
  }

  /**
   * @param data additional data sent to the PanelComponent
   */
  renderAction = (name: ActionName, data?: PanelComponentProps["data"]) => {
    const canvasActions = this.app.props.UIOptions.canvasActions;

    if (
      this.actions[name] &&
      "PanelComponent" in this.actions[name] &&
      (name in canvasActions
        ? canvasActions[name as keyof typeof canvasActions]
        : true)
    ) {
      const action = this.actions[name];
      const PanelComponent = action.PanelComponent!;
      const updateData = (formState?: any) => {
        this.updater(
          action.perform(
            this.getElementsIncludingDeleted(),
            this.getAppState(),
            formState,
            this.app,
          ),
        );
      };

      return (
        <PanelComponent
          elements={this.getElementsIncludingDeleted()}
          appState={this.getAppState()}
          updateData={updateData}
          appProps={this.app.props}
          data={data}
        />
      );
    }

    return null;
  };
}

import { CODES, KEYS } from "../keys";
import { register } from "./register";
import type { AppState } from "../types";
import { gridIcon } from "../components/icons";
import { StoreAction } from "../store";

export const actionToggleShowGrid = register({
  name: "showGrid",
  icon: gridIcon,
  keywords: ["snap"],
  label: "labels.toggleShowGrid",
  viewMode: true,
  trackEvent: {
    category: "canvas",
    predicate: (appState) => appState.showGrid,
  },
  perform(elements, appState) {
    return {
      appState: {
        ...appState,
        showGrid: !this.checked!(appState),
      },
      storeAction: StoreAction.NONE,
    };
  },
  checked: (appState: AppState) => appState.showGrid,
});

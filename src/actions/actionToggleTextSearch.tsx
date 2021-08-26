import { register } from "./register";
import { CODES, KEYS } from "../keys";

export const actionToggleTextSearch = register({
  name: "textSearch",
  perform(elements, appState) {
    return {
      appState: {
        ...appState,
        textSearchActive: !this.checked!(appState),
      },
      commitToHistory: false,
    };
  },
  checked: (appState) => appState.textSearchActive,
  keyTest: (event) => event[KEYS.CTRL_OR_CMD] && event.code === CODES.F,
});

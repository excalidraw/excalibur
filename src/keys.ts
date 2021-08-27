export const isDarwin = /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);
export const isWindows = /^Win/.test(window.navigator.platform);

export const CODES = {
  EQUAL: "Equal",
  MINUS: "Minus",
  NUM_ADD: "NumpadAdd",
  NUM_SUBTRACT: "NumpadSubtract",
  NUM_ZERO: "Numpad0",
  BRACKET_RIGHT: "BracketRight",
  BRACKET_LEFT: "BracketLeft",
  ONE: "Digit1",
  TWO: "Digit2",
  NINE: "Digit9",
  QUOTE: "Quote",
  ZERO: "Digit0",
  SLASH: "Slash",
  C: "KeyC",
  D: "KeyD",
  G: "KeyG",
  F: "KeyF",
  H: "KeyH",
  V: "KeyV",
  X: "KeyX",
  Z: "KeyZ",
  R: "KeyR",
  L: "KeyL",
} as const;

export const KEYS = {
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  ARROW_UP: "ArrowUp",
  BACKSPACE: "Backspace",
  ALT: "Alt",
  CTRL_OR_CMD: isDarwin ? "metaKey" : "ctrlKey",
  DELETE: "Delete",
  ENTER: "Enter",
  ESCAPE: "Escape",
  QUESTION_MARK: "?",
  SPACE: " ",
  TAB: "Tab",

  A: "a",
  D: "d",
  E: "e",
  G: "g",
  L: "l",
  O: "o",
  P: "p",
  Q: "q",
  R: "r",
  S: "s",
  T: "t",
  V: "v",
  X: "x",
  Y: "y",
  Z: "z",
} as const;

export type Key = keyof typeof KEYS;

export const isArrowKey = (key: string) =>
  key === KEYS.ARROW_LEFT ||
  key === KEYS.ARROW_RIGHT ||
  key === KEYS.ARROW_DOWN ||
  key === KEYS.ARROW_UP;

export const getResizeCenterPointKey = (event: MouseEvent | KeyboardEvent) =>
  event.altKey;

export const getResizeWithSidesSameLengthKey = (
  event: MouseEvent | KeyboardEvent,
) => event.shiftKey;

export const getRotateWithDiscreteAngleKey = (
  event: MouseEvent | KeyboardEvent,
) => event.shiftKey;

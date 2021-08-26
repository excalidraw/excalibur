/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_IS_NODE_BUILD: boolean;
  }
}

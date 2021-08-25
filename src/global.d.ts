// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Document {
  fonts?: {
    ready?: Promise<void>;
    addEventListener?(
      type: "loading" | "loadingdone" | "loadingerror",
      listener: (this: Document, ev: Event) => any,
    ): void;
  };
}

interface Window {
  ClipboardItem: any;
  __EXCALIDRAW_SHA__: string | undefined;
  EXCALIDRAW_ASSET_PATH: string | undefined;
  gtag: Function;
}

// https://github.com/facebook/create-react-app/blob/ddcb7d5/packages/react-scripts/lib/react-app.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_BACKEND_V1_GET_URL: string;
    readonly REACT_APP_BACKEND_V2_GET_URL: string;
    readonly REACT_APP_BACKEND_V2_POST_URL: string;
    readonly REACT_APP_SOCKET_SERVER_URL: string;
    readonly REACT_APP_FIREBASE_CONFIG: string;
  }
}

interface Clipboard extends EventTarget {
  write(data: any[]): Promise<void>;
}

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

type ResolutionType<T extends (...args: any) => any> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any;

// https://github.com/krzkaczor/ts-essentials
type MarkOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type MarkRequired<T, RK extends keyof T> = Exclude<T, RK> &
  Required<Pick<T, RK>>;

type MarkNonNullable<T, K extends keyof T> = {
  [P in K]-?: P extends K ? NonNullable<T[P]> : T[P];
} &
  { [P in keyof T]: T[P] };

// PNG encoding/decoding
// -----------------------------------------------------------------------------
type TEXtChunk = { name: "tEXt"; data: Uint8Array };

declare module "png-chunk-text" {
  function encode(
    name: string,
    value: string,
  ): { name: "tEXt"; data: Uint8Array };
  function decode(data: Uint8Array): { keyword: string; text: string };
}
declare module "png-chunks-encode" {
  function encode(chunks: TEXtChunk[]): Uint8Array;
  export = encode;
}
declare module "png-chunks-extract" {
  function extract(buffer: Uint8Array): TEXtChunk[];
  export = extract;
}
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// type getter for interface's callable type
// src: https://stackoverflow.com/a/58658851/927631
// -----------------------------------------------------------------------------
type SignatureType<T> = T extends (...args: infer R) => any ? R : never;
type CallableType<T extends (...args: any[]) => any> = (
  ...args: SignatureType<T>
) => ReturnType<T>;
// --------------------------------------------------------------------------—

// Type for React.forwardRef --- supply only the first generic argument T
type ForwardRef<T, P = any> = Parameters<
  CallableType<React.ForwardRefRenderFunction<T, P>>
>[1];

// --------------------------------------------------------------------------—

interface Blob {
  handle?: import("browser-fs-acces").FileSystemHandle;
  name?: string;
}

declare module "*.scss";

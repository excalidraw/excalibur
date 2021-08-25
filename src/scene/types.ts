import { ExcalidrawTextElement, ImageId } from "../element/types";
import { AppState, Zoom } from "../types";

export type SceneState = {
  scrollX: number;
  scrollY: number;
  // null indicates transparent bg
  viewBackgroundColor: string | null;
  zoom: Zoom;
  shouldCacheIgnoreZoom: boolean;
  remotePointerViewportCoords: { [id: string]: { x: number; y: number } };
  remotePointerButton?: { [id: string]: string | undefined };
  remoteSelectedElementIds: { [elementId: string]: string[] };
  remotePointerUsernames: { [id: string]: string };
  remotePointerUserStates: { [id: string]: string };
  theme: AppState["theme"];
  imageCache: Map<ImageId, HTMLImageElement>;
};

export type SceneScroll = {
  scrollX: number;
  scrollY: number;
};

export interface Scene {
  elements: ExcalidrawTextElement[];
}

export type ExportType =
  | "png"
  | "clipboard"
  | "clipboard-svg"
  | "backend"
  | "svg";

export type ScrollBars = {
  horizontal: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  vertical: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

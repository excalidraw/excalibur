import { ElementId, ExcalidrawElement } from "../element/types";
import { AppState, LibraryItems } from "../types";
import type { cleanAppStateForExport } from "../appState";

export interface ExportedDataState {
  type: string;
  version: number;
  source: string;
  elements: readonly ExcalidrawElement[];
  appState: ReturnType<typeof cleanAppStateForExport>;
}

export interface ImportedDataState {
  type?: string;
  version?: number;
  source?: string;
  elements?: readonly ExcalidrawElement[] | null;
  appState?: Readonly<Partial<AppState>> | null;
  scrollToContent?: boolean;
  scrollToElement?: ElementId;
  libraryItems?: LibraryItems;
}

export interface ExportedLibraryData {
  type: string;
  version: number;
  source: string;
  library: LibraryItems;
}

export interface ImportedLibraryData extends Partial<ExportedLibraryData> {}

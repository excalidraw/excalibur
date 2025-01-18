import type { FileSystemHandle } from "browser-fs-access";
import {
  fileOpen as _fileOpen,
  fileSave as _fileSave,
  supported as nativeFileSystemSupported,
} from "browser-fs-access";
import { EVENT, MIME_TYPES } from "../constants";
import { AbortError } from "../errors";
import { debounce } from "../utils";

type FILE_EXTENSION = Exclude<keyof typeof MIME_TYPES, "binary">;

const INPUT_CHANGE_INTERVAL_MS = 1000;

export const fileOpen = <M extends boolean | undefined = false>(opts: {
  extensions?: FILE_EXTENSION[];
  description: string;
  multiple?: M;
}): Promise<M extends false | undefined ? File : File[]> => {
  // an unsafe TS hack, alas not much we can do AFAIK
  type RetType = M extends false | undefined ? File : File[];

  const mimeTypes = opts.extensions?.reduce((mimeTypes, type) => {
    mimeTypes.push(MIME_TYPES[type]);

    return mimeTypes;
  }, [] as string[]);

  const extensions = opts.extensions?.reduce((acc, ext) => {
    if (ext === "jpg") {
      return acc.concat(".jpg", ".jpeg");
    }
    return acc.concat(`.${ext}`);
  }, [] as string[]);

  return _fileOpen({
    description: opts.description,
    extensions,
    mimeTypes,
    multiple: opts.multiple ?? false,
    legacySetup: (resolve, reject, input) => {
      const scheduleRejection = debounce(reject, INPUT_CHANGE_INTERVAL_MS);
      const focusHandler = () => {
        checkForFile();
        document.addEventListener(EVENT.KEYUP, scheduleRejection);
        document.addEventListener(EVENT.POINTER_UP, scheduleRejection);
        scheduleRejection();
      };
      const checkForFile = () => {
        // this hack might not work when expecting multiple files
        if (input.files?.length) {
          const ret = opts.multiple ? [...input.files] : input.files[0];
          resolve(ret as RetType);
        }
      };
      requestAnimationFrame(() => {
        window.addEventListener(EVENT.FOCUS, focusHandler);
      });
      const interval = window.setInterval(() => {
        checkForFile();
      }, INPUT_CHANGE_INTERVAL_MS);
      return (rejectPromise) => {
        clearInterval(interval);
        scheduleRejection.cancel();
        window.removeEventListener(EVENT.FOCUS, focusHandler);
        document.removeEventListener(EVENT.KEYUP, scheduleRejection);
        document.removeEventListener(EVENT.POINTER_UP, scheduleRejection);
        if (rejectPromise) {
          // so that something is shown in console if we need to debug this
          console.warn("Opening the file was canceled (legacy-fs).");
          rejectPromise(new AbortError());
        }
      };
    },
  }) as Promise<RetType>;
};

export const fileSave = (
  blob: Blob | Promise<Blob>,
  opts: {
    /** supply without the extension */
    name: string;
    /** file extension */
    extension: FILE_EXTENSION;
    mimeTypes?: string[];
    description: string;
    /** existing FileSystemHandle */
    fileHandle?: FileSystemHandle | null;
  },
) => {
  return _fileSave(
    blob,
    {
      fileName: `${opts.name}.${opts.extension}`,
      description: opts.description,
      extensions: [`.${opts.extension}`],
      mimeTypes: opts.mimeTypes,
    },
    opts.fileHandle,
  );
};

export { nativeFileSystemSupported };
export type { FileSystemHandle };

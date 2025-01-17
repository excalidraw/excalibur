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

const INPUT_CHANGE_INTERVAL_MS = 500;

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
      let isResolved = false;
      let checkInterval: number | null = null;

      // Increased delay for iOS to ensure file selection is complete
      const CHECK_INTERVAL = 100; // 100ms
      const MAX_CHECKS = 50; // 5 seconds total
      let checkCount = 0;

      const scheduleRejection = debounce(reject, INPUT_CHANGE_INTERVAL_MS);

      const checkForFile = () => {
        if (isResolved) {
          return;
        }

        if (input.files?.length) {
          isResolved = true;
          const ret = opts.multiple ? [...input.files] : input.files[0];
          resolve(ret as RetType);
          return true;
        }

        checkCount++;
        if (checkCount >= MAX_CHECKS) {
          scheduleRejection();
          return true;
        }
        return false;
      };

      const focusHandler = () => {
        // Start checking for files only after focus event
        checkInterval = window.setInterval(() => {
          if (checkForFile()) {
            clearInterval(checkInterval!);
          }
        }, CHECK_INTERVAL);

        document.addEventListener(EVENT.KEYUP, scheduleRejection);
        document.addEventListener(EVENT.POINTER_UP, scheduleRejection);
      };

      requestAnimationFrame(() => {
        window.addEventListener(EVENT.FOCUS, focusHandler);
      });

      return (rejectPromise) => {
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        scheduleRejection.cancel();
        window.removeEventListener(EVENT.FOCUS, focusHandler);
        document.removeEventListener(EVENT.KEYUP, scheduleRejection);
        document.removeEventListener(EVENT.POINTER_UP, scheduleRejection);

        if (rejectPromise && !isResolved) {
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

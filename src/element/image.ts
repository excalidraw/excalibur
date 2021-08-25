// -----------------------------------------------------------------------------
// ExcalidrawImageElement helpers
// -----------------------------------------------------------------------------

import { invalidateShapeForElement } from "../renderer/renderElement";
import { AppState } from "../types";
import { isInitializedImageElement } from "./typeChecks";
import {
  ExcalidrawElement,
  ImageId,
  InitializedExcalidrawImageElement,
} from "./types";

export const updateImageCache = async ({
  imageElements,
  files,
  imageCache,
}: {
  imageElements: readonly InitializedExcalidrawImageElement[];
  files: AppState["files"];
  imageCache: Map<ImageId, HTMLImageElement>;
}) => {
  for (const element of imageElements) {
    const imageData = files[element.imageId as string];
    if (imageData) {
      const cached = imageCache.get(element.imageId);
      const image = await (cached ||
        new Promise<HTMLImageElement>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.src = imageData.data;
        }));

      // TODO limit the size of the imageCache
      imageCache.set(element.imageId, image);
      invalidateShapeForElement(element);
    }
  }

  return imageCache;
};

export const getInitializedImageElements = (
  elements: readonly ExcalidrawElement[],
) =>
  elements.filter((element) =>
    isInitializedImageElement(element),
  ) as InitializedExcalidrawImageElement[];

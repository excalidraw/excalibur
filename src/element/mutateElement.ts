import { ExcalidrawElement } from "./types";
import { randomSeed } from "roughjs/bin/math";
import { invalidateShapeForElement } from "../renderer/renderElement";
import { globalSceneState } from "../scene";

type ElementUpdate<TElement extends ExcalidrawElement> = Omit<
  Partial<TElement>,
  "id" | "seed"
>;

// This function tracks updates of text elements for the purposes for collaboration.
// The version is used to compare updates when more than one user is working in
// the same drawing. Note: this will trigger the component to update. Make sure you
// are calling it either from a React event handler or within unstable_batchedUpdates().
export function mutateElement<TElement extends Mutable<ExcalidrawElement>>(
  element: TElement,
  updates: ElementUpdate<TElement>,
) {
  for (const key in updates) {
    const value = (updates as any)[key];
    if (typeof value !== "undefined") {
      // @ts-ignore
      element[key] = value;
    }
  }

  if (
    typeof updates.height !== "undefined" ||
    typeof updates.width !== "undefined" ||
    typeof (updates as any).points !== "undefined"
  ) {
    invalidateShapeForElement(element);
  }

  element.version++;
  element.versionNonce = randomSeed();

  globalSceneState.informMutation();
}

export function newElementWith<TElement extends ExcalidrawElement>(
  element: TElement,
  updates: ElementUpdate<TElement>,
): TElement {
  return {
    ...element,
    ...updates,
    version: element.version + 1,
    versionNonce: randomSeed(),
  };
}

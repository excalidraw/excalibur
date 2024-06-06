import { mutateElement } from "../../element/mutateElement";
import { getBoundTextElement } from "../../element/textElement";
import { isArrowElement } from "../../element/typeChecks";
import { ElementsMap, ExcalidrawElement } from "../../element/types";
import { isInGroup } from "../../groups";
import { degreeToRadian, radianToDegree } from "../../math";
import Scene from "../../scene/Scene";
import DragInput, { DragInputCallbackType } from "./DragInput";
import { getStepSizedValue, isPropertyEditable } from "./utils";

interface MultiAngleProps {
  elements: ExcalidrawElement[];
  elementsMap: ElementsMap;
}

const STEP_SIZE = 15;

const MultiAngle = ({ elements, elementsMap }: MultiAngleProps) => {
  const handleDegreeChange: DragInputCallbackType = ({
    accumulatedChange,
    stateAtStart,
    shouldChangeByStepSize,
    nextValue,
  }) => {
    const editableLatestIndividualElements = elements.filter(
      (el) => !isInGroup(el) && isPropertyEditable(el, "angle"),
    );
    const editableOriginalIndividualElements = stateAtStart.filter(
      (el) => !isInGroup(el) && isPropertyEditable(el, "angle"),
    );

    if (nextValue !== undefined) {
      const nextAngle = degreeToRadian(nextValue);

      for (const element of editableLatestIndividualElements) {
        mutateElement(
          element,
          {
            angle: nextAngle,
          },
          false,
        );

        const boundTextElement = getBoundTextElement(element, elementsMap);
        if (boundTextElement && !isArrowElement(element)) {
          mutateElement(boundTextElement, { angle: nextAngle }, false);
        }
      }

      Scene.getScene(editableLatestIndividualElements[0])?.triggerUpdate();

      return;
    }

    for (let i = 0; i < editableLatestIndividualElements.length; i++) {
      const latestElement = editableLatestIndividualElements[i];
      const originalElement = editableOriginalIndividualElements[i];
      const originalAngleInDegrees =
        Math.round(radianToDegree(originalElement.angle) * 100) / 100;
      const changeInDegrees = Math.round(accumulatedChange);
      let nextAngleInDegrees = (originalAngleInDegrees + changeInDegrees) % 360;
      if (shouldChangeByStepSize) {
        nextAngleInDegrees = getStepSizedValue(nextAngleInDegrees, STEP_SIZE);
      }

      nextAngleInDegrees =
        nextAngleInDegrees < 0 ? nextAngleInDegrees + 360 : nextAngleInDegrees;

      const nextAngle = degreeToRadian(nextAngleInDegrees);

      mutateElement(
        latestElement,
        {
          angle: nextAngle,
        },
        false,
      );

      const boundTextElement = getBoundTextElement(latestElement, elementsMap);
      if (boundTextElement && !isArrowElement(latestElement)) {
        mutateElement(boundTextElement, { angle: nextAngle }, false);
      }
    }
    Scene.getScene(editableLatestIndividualElements[0])?.triggerUpdate();
  };

  const editableLatestIndividualElements = elements.filter(
    (el) => !isInGroup(el) && isPropertyEditable(el, "angle"),
  );
  const angles = editableLatestIndividualElements.map(
    (el) => Math.round(radianToDegree(el.angle) * 100) / 100,
  );
  const value = new Set(angles).size === 1 ? angles[0] : "Mixed";

  const editable = editableLatestIndividualElements.some((el) =>
    isPropertyEditable(el, "angle"),
  );

  return (
    <DragInput
      label="A"
      value={value}
      elements={elements}
      dragInputCallback={handleDegreeChange}
      editable={editable}
    />
  );
};

export default MultiAngle;

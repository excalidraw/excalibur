import clsx from "clsx";
import type { ColorPickerType } from "./colorPickerUtils";
import {
  DEFAULT_CANVAS_BACKGROUND_PICKS,
  DEFAULT_ELEMENT_BACKGROUND_PICKS,
  DEFAULT_ELEMENT_STROKE_PICKS,
} from "../../colors";

interface TopPicksProps {
  onChange: (color: string) => void;
  type: ColorPickerType;
  activeColor: string;
  topPicks?: readonly string[];
}

export const TopPicks = ({
  onChange,
  type,
  activeColor,
  topPicks,
}: TopPicksProps) => {
  let colors;
  if (type === "elementStroke") {
    colors = DEFAULT_ELEMENT_STROKE_PICKS;
  }

  if (type === "elementBackground") {
    colors = DEFAULT_ELEMENT_BACKGROUND_PICKS;
  }

  if (type === "canvasBackground") {
    colors = DEFAULT_CANVAS_BACKGROUND_PICKS;
  }

  // this one can overwrite defaults
  if (topPicks) {
    colors = topPicks;
  }

  if (!colors) {
    console.error("Invalid type for TopPicks");
    return null;
  }

  return (
    <div className="color-picker__top-picks">
      {colors.map((color: string) => (
        <button
          className={clsx("color-picker__button", {
            active: color === activeColor,
            "is-transparent": color === "transparent" || !color,
          })}
          style={{ "--swatch-color": color }}
          key={color}
          type="button"
          title={color}
          onClick={() => onChange(color)}
          data-testid={`color-top-pick-${color}`}
          tabIndex={-1}
        >
          <div className="color-picker__button-outline" />
        </button>
      ))}
    </div>
  );
};

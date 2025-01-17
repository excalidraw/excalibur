import * as Popover from "@radix-ui/react-popover";
import { useMemo } from "react";
import { ButtonIcon } from "../ButtonIcon";
import { TextIcon } from "../icons";
import type { FontFamilyValues } from "../../element/types";
import { t } from "../../i18n";
import { isDefaultFont } from "./FontPicker";
import { CLASSES } from "../../constants";

interface FontPickerTriggerProps {
  selectedFontFamily: FontFamilyValues | null;
}

export const FontPickerTrigger = ({
  selectedFontFamily,
}: FontPickerTriggerProps) => {
  const isTriggerActive = useMemo(
    () => Boolean(selectedFontFamily && !isDefaultFont(selectedFontFamily)),
    [selectedFontFamily],
  );

  return (
    <Popover.Trigger asChild>
      {/* Empty div as trigger so it's stretched 100% due to different button sizes */}
      <div>
        <ButtonIcon
          standalone
          icon={TextIcon}
          title={t("labels.showFonts")}
          className={CLASSES.PROPERTIES_POPOVER_TRIGGER}
          testId={"font-family-show-fonts"}
          active={isTriggerActive}
          // no-op
          onClick={() => {}}
        />
      </div>
    </Popover.Trigger>
  );
};

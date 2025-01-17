import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEventHandler,
} from "react";
import { useApp, useAppProps, useExcalidrawContainer } from "../App";
import { PropertiesPopover } from "../PropertiesPopover";
import { QuickSearch } from "../QuickSearch";
import { ScrollableList } from "../ScrollableList";
import DropdownMenuGroup from "../dropdownMenu/DropdownMenuGroup";
import DropdownMenuItem, {
  DropDownMenuItemBadgeType,
  DropDownMenuItemBadge,
} from "../dropdownMenu/DropdownMenuItem";
import { type FontFamilyValues } from "../../element/types";
import { arrayToList, debounce, getFontFamilyString } from "../../utils";
import { t } from "../../i18n";
import { fontPickerKeyHandler } from "./keyboardNavHandlers";
import { Fonts } from "../../fonts";
import type { ValueOf } from "../../utility-types";
import { FontFamilyNormalIcon } from "../icons";

export interface FontDescriptor {
  value: number;
  icon: JSX.Element;
  text: string;
  deprecated?: true;
  badge?: {
    type: ValueOf<typeof DropDownMenuItemBadgeType>;
    placeholder: string;
  };
}

interface FontPickerListProps {
  selectedFontFamily: FontFamilyValues | null;
  hoveredFontFamily: FontFamilyValues | null;
  onSelect: (value: number) => void;
  onHover: (value: number) => void;
  onLeave: () => void;
  onOpen: () => void;
  onClose: () => void;
}

export const FontPickerList = React.memo(
  ({
    selectedFontFamily,
    hoveredFontFamily,
    onSelect,
    onHover,
    onLeave,
    onOpen,
    onClose,
  }: FontPickerListProps) => {
    const { container } = useExcalidrawContainer();
    const { fonts } = useApp();
    const { showDeprecatedFonts } = useAppProps();

    const [searchTerm, setSearchTerm] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const allFonts = useMemo(
      () =>
        Array.from(Fonts.registered.entries())
          .filter(
            ([_, { metadata }]) => !metadata.serverSide && !metadata.fallback,
          )
          .map(([familyId, { metadata, fontFaces }]) => {
            const fontDescriptor = {
              value: familyId,
              icon: metadata.icon ?? FontFamilyNormalIcon,
              text: fontFaces[0]?.fontFace?.family ?? "Unknown",
            };

            if (metadata.deprecated) {
              Object.assign(fontDescriptor, {
                deprecated: metadata.deprecated,
                badge: {
                  type: DropDownMenuItemBadgeType.RED,
                  placeholder: t("fontList.badge.old"),
                },
              });
            }

            return fontDescriptor as FontDescriptor;
          })
          .sort((a, b) =>
            a.text.toLowerCase() > b.text.toLowerCase() ? 1 : -1,
          ),
      [],
    );

    const sceneFamilies = useMemo(
      () => new Set(fonts.getSceneFamilies()),
      // cache per selected font family, so hover re-render won't mess it up
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [selectedFontFamily],
    );

    const sceneFonts = useMemo(
      () => allFonts.filter((font) => sceneFamilies.has(font.value)), // always show all the fonts in the scene, even those that were deprecated
      [allFonts, sceneFamilies],
    );

    const availableFonts = useMemo(
      () =>
        allFonts.filter(
          (font) =>
            !sceneFamilies.has(font.value) &&
            (showDeprecatedFonts || !font.deprecated), // skip deprecated fonts
        ),
      [allFonts, sceneFamilies, showDeprecatedFonts],
    );

    const filteredFonts = useMemo(
      () =>
        arrayToList(
          [...sceneFonts, ...availableFonts].filter((font) =>
            font.text?.toLowerCase().includes(searchTerm),
          ),
        ),
      [sceneFonts, availableFonts, searchTerm],
    );

    const hoveredFont = useMemo(() => {
      let font;

      if (hoveredFontFamily) {
        font = filteredFonts.find((font) => font.value === hoveredFontFamily);
      } else if (selectedFontFamily) {
        font = filteredFonts.find((font) => font.value === selectedFontFamily);
      }

      if (!font && searchTerm) {
        if (filteredFonts[0]?.value) {
          // hover first element on search
          onHover(filteredFonts[0].value);
        } else {
          // re-render cache on no results
          onLeave();
        }
      }

      return font;
    }, [
      hoveredFontFamily,
      selectedFontFamily,
      searchTerm,
      filteredFonts,
      onHover,
      onLeave,
    ]);

    const onKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
      (event) => {
        const handled = fontPickerKeyHandler({
          event,
          inputRef,
          hoveredFont,
          filteredFonts,
          onSelect,
          onHover,
          onClose,
        });

        if (handled) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      [hoveredFont, filteredFonts, onSelect, onHover, onClose],
    );

    useEffect(() => {
      onOpen();

      return () => {
        onClose();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sceneFilteredFonts = useMemo(
      () => filteredFonts.filter((font) => sceneFamilies.has(font.value)),
      [filteredFonts, sceneFamilies],
    );

    const availableFilteredFonts = useMemo(
      () => filteredFonts.filter((font) => !sceneFamilies.has(font.value)),
      [filteredFonts, sceneFamilies],
    );

    const renderFont = (font: FontDescriptor, index: number) => (
      <DropdownMenuItem
        key={font.value}
        icon={font.icon}
        value={font.value}
        order={index}
        textStyle={{
          fontFamily: getFontFamilyString({ fontFamily: font.value }),
        }}
        hovered={font.value === hoveredFont?.value}
        selected={font.value === selectedFontFamily}
        // allow to tab between search and selected font
        tabIndex={font.value === selectedFontFamily ? 0 : -1}
        onClick={(e) => {
          onSelect(Number(e.currentTarget.value));
        }}
        onMouseMove={() => {
          if (hoveredFont?.value !== font.value) {
            onHover(font.value);
          }
        }}
      >
        {font.text}
        {font.badge && (
          <DropDownMenuItemBadge type={font.badge.type}>
            {font.badge.placeholder}
          </DropDownMenuItemBadge>
        )}
      </DropdownMenuItem>
    );

    const groups = [];

    if (sceneFilteredFonts.length) {
      groups.push(
        <DropdownMenuGroup title={t("fontList.sceneFonts")} key="group_1">
          {sceneFilteredFonts.map(renderFont)}
        </DropdownMenuGroup>,
      );
    }

    if (availableFilteredFonts.length) {
      groups.push(
        <DropdownMenuGroup title={t("fontList.availableFonts")} key="group_2">
          {availableFilteredFonts.map((font, index) =>
            renderFont(font, index + sceneFilteredFonts.length),
          )}
        </DropdownMenuGroup>,
      );
    }

    return (
      <PropertiesPopover
        className="properties-content"
        container={container}
        style={{ width: "15rem" }}
        onClose={onClose}
        onPointerLeave={onLeave}
        onKeyDown={onKeyDown}
        onFocusOutside={(event) => {
          // so we don't close when refocusing wysiwyg while editing
          event.preventDefault();
        }}
      >
        <QuickSearch
          ref={inputRef}
          placeholder={t("quickSearch.placeholder")}
          onChange={debounce(setSearchTerm, 20)}
        />
        <ScrollableList
          className="dropdown-menu fonts manual-hover"
          placeholder={t("fontList.empty")}
        >
          {groups.length ? groups : null}
        </ScrollableList>
      </PropertiesPopover>
    );
  },
  (prev, next) =>
    prev.selectedFontFamily === next.selectedFontFamily &&
    prev.hoveredFontFamily === next.hoveredFontFamily,
);

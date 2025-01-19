import { Fragment, memo, useEffect, useRef, useState } from "react";
import { collapseDownIcon, upIcon, searchIcon } from "./icons";
import { TextField } from "./TextField";
import { Button } from "./Button";
import { useApp, useExcalidrawSetAppState } from "./App";
import { debounce } from "lodash";
import type { AppClassProperties } from "../types";
import { isTextElement, newTextElement } from "../element";
import type { ExcalidrawTextElement } from "../element/types";
import { measureText } from "../element/textElement";
import { addEventListener, getFontString } from "../utils";
import { KEYS } from "../keys";
import clsx from "clsx";
import { atom, useAtom } from "../editor-jotai";
import { t } from "../i18n";
import { isElementCompletelyInViewport } from "../element/sizeHelpers";
import { randomInteger } from "../random";
import { CLASSES, EVENT } from "../constants";
import { useStable } from "../hooks/useStable";

import "./SearchMenu.scss";
import { round } from "../../math";

const searchQueryAtom = atom<string>("");
export const searchItemInFocusAtom = atom<number | null>(null);

const SEARCH_DEBOUNCE = 350;

type SearchMatchItem = {
  textElement: ExcalidrawTextElement;
  searchQuery: SearchQuery;
  index: number;
  preview: {
    indexInSearchQuery: number;
    previewText: string;
    moreBefore: boolean;
    moreAfter: boolean;
  };
  matchedLines: {
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  }[];
};

type SearchMatches = {
  nonce: number | null;
  items: SearchMatchItem[];
};

type SearchQuery = string & { _brand: "SearchQuery" };

export const SearchMenu = () => {
  const app = useApp();
  const setAppState = useExcalidrawSetAppState();

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useAtom(searchQueryAtom);
  const searchQuery = inputValue.trim() as SearchQuery;

  const [isSearching, setIsSearching] = useState(false);

  const [searchMatches, setSearchMatches] = useState<SearchMatches>({
    nonce: null,
    items: [],
  });
  const searchedQueryRef = useRef<SearchQuery | null>(null);
  const lastSceneNonceRef = useRef<number | undefined>(undefined);

  const [focusIndex, setFocusIndex] = useAtom(searchItemInFocusAtom);
  const elementsMap = app.scene.getNonDeletedElementsMap();

  useEffect(() => {
    if (isSearching) {
      return;
    }
    if (
      searchQuery !== searchedQueryRef.current ||
      app.scene.getSceneNonce() !== lastSceneNonceRef.current
    ) {
      searchedQueryRef.current = null;
      handleSearch(searchQuery, app, (matchItems, index) => {
        setSearchMatches({
          nonce: randomInteger(),
          items: matchItems,
        });
        searchedQueryRef.current = searchQuery;
        lastSceneNonceRef.current = app.scene.getSceneNonce();
        setAppState({
          searchMatches: matchItems.map((searchMatch) => ({
            id: searchMatch.textElement.id,
            focus: false,
            matchedLines: searchMatch.matchedLines,
          })),
        });
      });
    }
  }, [
    isSearching,
    searchQuery,
    elementsMap,
    app,
    setAppState,
    setFocusIndex,
    lastSceneNonceRef,
  ]);

  const goToNextItem = () => {
    if (searchMatches.items.length > 0) {
      setFocusIndex((focusIndex) => {
        if (focusIndex === null) {
          return 0;
        }

        return (focusIndex + 1) % searchMatches.items.length;
      });
    }
  };

  const goToPreviousItem = () => {
    if (searchMatches.items.length > 0) {
      setFocusIndex((focusIndex) => {
        if (focusIndex === null) {
          return 0;
        }

        return focusIndex - 1 < 0
          ? searchMatches.items.length - 1
          : focusIndex - 1;
      });
    }
  };

  const fixInputCursorPosition = () => {
    requestAnimationFrame(() => {
      const searchInput = searchInputRef.current;
      const isFocus = document.activeElement === searchInput;
      // if input is not focus and input instance is not exist return
      if (!searchInput || !isFocus) {
        return;
      }
      const cursorPosition = searchInput.selectionStart;
      const textLength = searchInput.value.length!;
      if (cursorPosition !== textLength) {
        searchInput.setSelectionRange(textLength, textLength);
      }
    });
  };

  useEffect(() => {
    setAppState((state) => {
      return {
        searchMatches: state.searchMatches.map((match, index) => {
          if (index === focusIndex) {
            return { ...match, focus: true };
          }
          return { ...match, focus: false };
        }),
      };
    });
  }, [focusIndex, setAppState]);

  useEffect(() => {
    if (searchMatches.items.length > 0 && focusIndex !== null) {
      const match = searchMatches.items[focusIndex];

      if (match) {
        const zoomValue = app.state.zoom.value;

        const matchAsElement = newTextElement({
          text: match.searchQuery,
          x: match.textElement.x + (match.matchedLines[0]?.offsetX ?? 0),
          y: match.textElement.y + (match.matchedLines[0]?.offsetY ?? 0),
          width: match.matchedLines[0]?.width,
          height: match.matchedLines[0]?.height,
          fontSize: match.textElement.fontSize,
          fontFamily: match.textElement.fontFamily,
        });

        const FONT_SIZE_LEGIBILITY_THRESHOLD = 14;

        const fontSize = match.textElement.fontSize;
        const isTextTiny =
          fontSize * zoomValue < FONT_SIZE_LEGIBILITY_THRESHOLD;

        if (
          !isElementCompletelyInViewport(
            [matchAsElement],
            app.canvas.width / window.devicePixelRatio,
            app.canvas.height / window.devicePixelRatio,
            {
              offsetLeft: app.state.offsetLeft,
              offsetTop: app.state.offsetTop,
              scrollX: app.state.scrollX,
              scrollY: app.state.scrollY,
              zoom: app.state.zoom,
            },
            app.scene.getNonDeletedElementsMap(),
            app.getEditorUIOffsets(),
          ) ||
          isTextTiny
        ) {
          let zoomOptions: Parameters<AppClassProperties["scrollToContent"]>[1];

          if (isTextTiny) {
            if (fontSize >= FONT_SIZE_LEGIBILITY_THRESHOLD) {
              zoomOptions = { fitToContent: true };
            } else {
              zoomOptions = {
                fitToViewport: true,
                // calculate zoom level to make the fontSize ~equal to FONT_SIZE_THRESHOLD, rounded to nearest 10%
                maxZoom: round(FONT_SIZE_LEGIBILITY_THRESHOLD / fontSize, 1),
              };
            }
          } else {
            zoomOptions = { fitToContent: true };
          }

          app.scrollToContent(matchAsElement, {
            animate: true,
            duration: 300,
            ...zoomOptions,
            canvasOffsets: app.getEditorUIOffsets(),
          });
        }
      }
    }
  }, [focusIndex, searchMatches, app]);

  useEffect(() => {
    return () => {
      setFocusIndex(null);
      searchedQueryRef.current = null;
      lastSceneNonceRef.current = undefined;
      setAppState({
        searchMatches: [],
      });
      setIsSearching(false);
    };
  }, [setAppState, setFocusIndex]);

  const stableState = useStable({
    goToNextItem,
    goToPreviousItem,
    searchMatches,
  });

  useEffect(() => {
    const eventHandler = (event: KeyboardEvent) => {
      if (
        event.key === KEYS.ESCAPE &&
        !app.state.openDialog &&
        !app.state.openPopup
      ) {
        event.preventDefault();
        event.stopPropagation();
        setAppState({
          openSidebar: null,
        });
        return;
      }

      if (event[KEYS.CTRL_OR_CMD] && event.key === KEYS.F) {
        event.preventDefault();
        event.stopPropagation();

        if (!searchInputRef.current?.matches(":focus")) {
          if (app.state.openDialog) {
            setAppState({
              openDialog: null,
            });
          }
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        } else {
          setAppState({
            openSidebar: null,
          });
        }
      }

      if (
        event.target instanceof HTMLElement &&
        event.target.closest(".layer-ui__search")
      ) {
        if (stableState.searchMatches.items.length) {
          if (event.key === KEYS.ENTER) {
            event.stopPropagation();
            stableState.goToNextItem();
          }

          if (event.key === KEYS.ARROW_UP) {
            event.stopPropagation();
            stableState.goToPreviousItem();
            fixInputCursorPosition();
          } else if (event.key === KEYS.ARROW_DOWN) {
            event.stopPropagation();
            stableState.goToNextItem();
          }
        }
      }
    };

    // `capture` needed to prevent firing on initial open from App.tsx,
    // as well as to handle events before App ones
    return addEventListener(window, EVENT.KEYDOWN, eventHandler, {
      capture: true,
      passive: false,
    });
  }, [setAppState, stableState, app]);

  const matchCount = `${searchMatches.items.length} ${
    searchMatches.items.length === 1
      ? t("search.singleResult")
      : t("search.multipleResults")
  }`;

  return (
    <div className="layer-ui__search">
      <div className="layer-ui__search-header">
        <TextField
          className={CLASSES.SEARCH_MENU_INPUT_WRAPPER}
          value={inputValue}
          ref={searchInputRef}
          placeholder={t("search.placeholder")}
          icon={searchIcon}
          onChange={(value) => {
            setInputValue(value);
            setIsSearching(true);
            const searchQuery = value.trim() as SearchQuery;
            handleSearch(searchQuery, app, (matchItems, index) => {
              setSearchMatches({
                nonce: randomInteger(),
                items: matchItems,
              });
              setFocusIndex(index);
              searchedQueryRef.current = searchQuery;
              lastSceneNonceRef.current = app.scene.getSceneNonce();
              setAppState({
                searchMatches: matchItems.map((searchMatch) => ({
                  id: searchMatch.textElement.id,
                  focus: false,
                  matchedLines: searchMatch.matchedLines,
                })),
              });

              setIsSearching(false);
            });
          }}
          selectOnRender
        />
      </div>

      <div className="layer-ui__search-count">
        {searchMatches.items.length > 0 && (
          <>
            {focusIndex !== null && focusIndex > -1 ? (
              <div>
                {focusIndex + 1} / {matchCount}
              </div>
            ) : (
              <div>{matchCount}</div>
            )}
            <div className="result-nav">
              <Button
                onSelect={() => {
                  goToNextItem();
                }}
                className="result-nav-btn"
              >
                {collapseDownIcon}
              </Button>
              <Button
                onSelect={() => {
                  goToPreviousItem();
                }}
                className="result-nav-btn"
              >
                {upIcon}
              </Button>
            </div>
          </>
        )}

        {searchMatches.items.length === 0 &&
          searchQuery &&
          searchedQueryRef.current && (
            <div style={{ margin: "1rem auto" }}>{t("search.noMatch")}</div>
          )}
      </div>

      <MatchList
        matches={searchMatches}
        onItemClick={setFocusIndex}
        focusIndex={focusIndex}
        searchQuery={searchQuery}
      />
    </div>
  );
};

const ListItem = (props: {
  preview: SearchMatchItem["preview"];
  searchQuery: SearchQuery;
  highlighted: boolean;
  onClick?: () => void;
}) => {
  const preview = [
    props.preview.moreBefore ? "..." : "",
    props.preview.previewText.slice(0, props.preview.indexInSearchQuery),
    props.preview.previewText.slice(
      props.preview.indexInSearchQuery,
      props.preview.indexInSearchQuery + props.searchQuery.length,
    ),
    props.preview.previewText.slice(
      props.preview.indexInSearchQuery + props.searchQuery.length,
    ),
    props.preview.moreAfter ? "..." : "",
  ];

  return (
    <div
      tabIndex={-1}
      className={clsx("layer-ui__result-item", {
        active: props.highlighted,
      })}
      onClick={props.onClick}
      ref={(ref) => {
        if (props.highlighted) {
          ref?.scrollIntoView({ behavior: "auto", block: "nearest" });
        }
      }}
    >
      <div className="preview-text">
        {preview.flatMap((text, idx) => (
          <Fragment key={idx}>{idx === 2 ? <b>{text}</b> : text}</Fragment>
        ))}
      </div>
    </div>
  );
};

interface MatchListProps {
  matches: SearchMatches;
  onItemClick: (index: number) => void;
  focusIndex: number | null;
  searchQuery: SearchQuery;
}

const MatchListBase = (props: MatchListProps) => {
  return (
    <div className="layer-ui__search-result-container">
      {props.matches.items.map((searchMatch, index) => (
        <ListItem
          key={searchMatch.textElement.id + searchMatch.index}
          searchQuery={props.searchQuery}
          preview={searchMatch.preview}
          highlighted={index === props.focusIndex}
          onClick={() => props.onItemClick(index)}
        />
      ))}
    </div>
  );
};

const areEqual = (prevProps: MatchListProps, nextProps: MatchListProps) => {
  return (
    prevProps.matches.nonce === nextProps.matches.nonce &&
    prevProps.focusIndex === nextProps.focusIndex
  );
};

const MatchList = memo(MatchListBase, areEqual);

const getMatchPreview = (
  text: string,
  index: number,
  searchQuery: SearchQuery,
) => {
  const WORDS_BEFORE = 2;
  const WORDS_AFTER = 5;

  const substrBeforeQuery = text.slice(0, index);
  const wordsBeforeQuery = substrBeforeQuery.split(/\s+/);
  // text = "small", query = "mall", not complete before
  // text = "small", query = "smal", complete before
  const isQueryCompleteBefore = substrBeforeQuery.endsWith(" ");
  const startWordIndex =
    wordsBeforeQuery.length -
    WORDS_BEFORE -
    1 -
    (isQueryCompleteBefore ? 0 : 1);
  let wordsBeforeAsString =
    wordsBeforeQuery.slice(startWordIndex <= 0 ? 0 : startWordIndex).join(" ") +
    (isQueryCompleteBefore ? " " : "");

  const MAX_ALLOWED_CHARS = 20;

  wordsBeforeAsString =
    wordsBeforeAsString.length > MAX_ALLOWED_CHARS
      ? wordsBeforeAsString.slice(-MAX_ALLOWED_CHARS)
      : wordsBeforeAsString;

  const substrAfterQuery = text.slice(index + searchQuery.length);
  const wordsAfter = substrAfterQuery.split(/\s+/);
  // text = "small", query = "mall", complete after
  // text = "small", query = "smal", not complete after
  const isQueryCompleteAfter = !substrAfterQuery.startsWith(" ");
  const numberOfWordsToTake = isQueryCompleteAfter
    ? WORDS_AFTER + 1
    : WORDS_AFTER;
  const wordsAfterAsString =
    (isQueryCompleteAfter ? "" : " ") +
    wordsAfter.slice(0, numberOfWordsToTake).join(" ");

  return {
    indexInSearchQuery: wordsBeforeAsString.length,
    previewText: wordsBeforeAsString + searchQuery + wordsAfterAsString,
    moreBefore: startWordIndex > 0,
    moreAfter: wordsAfter.length > numberOfWordsToTake,
  };
};

const normalizeWrappedText = (
  wrappedText: string,
  originalText: string,
): string => {
  const wrappedLines = wrappedText.split("\n");
  const normalizedLines: string[] = [];
  let originalIndex = 0;

  for (let i = 0; i < wrappedLines.length; i++) {
    let currentLine = wrappedLines[i];
    const nextLine = wrappedLines[i + 1];

    if (nextLine) {
      const nextLineIndexInOriginal = originalText.indexOf(
        nextLine,
        originalIndex,
      );

      if (nextLineIndexInOriginal > currentLine.length + originalIndex) {
        let j = nextLineIndexInOriginal - (currentLine.length + originalIndex);

        while (j > 0) {
          currentLine += " ";
          j--;
        }
      }
    }

    normalizedLines.push(currentLine);
    originalIndex = originalIndex + currentLine.length;
  }

  return normalizedLines.join("\n");
};

const getMatchedLines = (
  textElement: ExcalidrawTextElement,
  searchQuery: SearchQuery,
  index: number,
) => {
  const normalizedText = normalizeWrappedText(
    textElement.text,
    textElement.originalText,
  );

  const lines = normalizedText.split("\n");

  const lineIndexRanges = [];
  let currentIndex = 0;
  let lineNumber = 0;

  for (const line of lines) {
    const startIndex = currentIndex;
    const endIndex = startIndex + line.length - 1;

    lineIndexRanges.push({
      line,
      startIndex,
      endIndex,
      lineNumber,
    });

    // Move to the next line's start index
    currentIndex = endIndex + 1;
    lineNumber++;
  }

  let startIndex = index;
  let remainingQuery = textElement.originalText.slice(
    index,
    index + searchQuery.length,
  );
  const matchedLines: {
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  }[] = [];

  for (const lineIndexRange of lineIndexRanges) {
    if (remainingQuery === "") {
      break;
    }

    if (
      startIndex >= lineIndexRange.startIndex &&
      startIndex <= lineIndexRange.endIndex
    ) {
      const matchCapacity = lineIndexRange.endIndex + 1 - startIndex;
      const textToStart = lineIndexRange.line.slice(
        0,
        startIndex - lineIndexRange.startIndex,
      );

      const matchedWord = remainingQuery.slice(0, matchCapacity);
      remainingQuery = remainingQuery.slice(matchCapacity);

      const offset = measureText(
        textToStart,
        getFontString(textElement),
        textElement.lineHeight,
        true,
      );

      // measureText returns a non-zero width for the empty string
      // which is not what we're after here, hence the check and the correction
      if (textToStart === "") {
        offset.width = 0;
      }

      if (textElement.textAlign !== "left" && lineIndexRange.line.length > 0) {
        const lineLength = measureText(
          lineIndexRange.line,
          getFontString(textElement),
          textElement.lineHeight,
          true,
        );

        const spaceToStart =
          textElement.textAlign === "center"
            ? (textElement.width - lineLength.width) / 2
            : textElement.width - lineLength.width;
        offset.width += spaceToStart;
      }

      const { width, height } = measureText(
        matchedWord,
        getFontString(textElement),
        textElement.lineHeight,
      );

      const offsetX = offset.width;
      const offsetY = lineIndexRange.lineNumber * offset.height;

      matchedLines.push({
        offsetX,
        offsetY,
        width,
        height,
      });

      startIndex += matchCapacity;
    }
  }

  return matchedLines;
};

const escapeSpecialCharacters = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
};

const handleSearch = debounce(
  (
    searchQuery: SearchQuery,
    app: AppClassProperties,
    cb: (matchItems: SearchMatchItem[], focusIndex: number | null) => void,
  ) => {
    if (!searchQuery || searchQuery === "") {
      cb([], null);
      return;
    }

    const elements = app.scene.getNonDeletedElements();
    const texts = elements.filter((el) =>
      isTextElement(el),
    ) as ExcalidrawTextElement[];

    texts.sort((a, b) => a.y - b.y);

    const matchItems: SearchMatchItem[] = [];

    const regex = new RegExp(escapeSpecialCharacters(searchQuery), "gi");

    for (const textEl of texts) {
      let match = null;
      const text = textEl.originalText;

      while ((match = regex.exec(text)) !== null) {
        const preview = getMatchPreview(text, match.index, searchQuery);
        const matchedLines = getMatchedLines(textEl, searchQuery, match.index);

        if (matchedLines.length > 0) {
          matchItems.push({
            textElement: textEl,
            searchQuery,
            preview,
            index: match.index,
            matchedLines,
          });
        }
      }
    }

    const visibleIds = new Set(
      app.visibleElements.map((visibleElement) => visibleElement.id),
    );

    const focusIndex =
      matchItems.findIndex((matchItem) =>
        visibleIds.has(matchItem.textElement.id),
      ) ?? null;

    cb(matchItems, focusIndex);
  },
  SEARCH_DEBOUNCE,
);

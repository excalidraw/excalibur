import { useEffect, useMemo, useState, memo } from "react";
import { getCommonBounds } from "../../element/bounds";
import type { NonDeletedExcalidrawElement } from "../../element/types";
import { t } from "../../i18n";
import type {
  AppClassProperties,
  AppState,
  ExcalidrawProps,
} from "../../types";
import { CloseIcon } from "../icons";
import { Island } from "../Island";
import { throttle } from "lodash";
import Dimension from "./Dimension";
import Angle from "./Angle";
import FontSize from "./FontSize";
import MultiDimension from "./MultiDimension";
import { elementsAreInSameGroup } from "../../groups";
import MultiAngle from "./MultiAngle";
import MultiFontSize from "./MultiFontSize";
import Position from "./Position";
import MultiPosition from "./MultiPosition";
import Collapsible from "./Collapsible";
import { useExcalidrawAppState, useExcalidrawSetAppState } from "../App";
import { getAtomicUnits } from "./utils";
import { STATS_PANELS } from "../../constants";
import {
  isElbowArrow,
  isFrameLikeElement,
  isImageElement,
} from "../../element/typeChecks";
import CanvasGrid from "./CanvasGrid";
import clsx from "clsx";

import "./Stats.scss";
import { isGridModeEnabled } from "../../snapping";
import { getUncroppedWidthAndHeight } from "../../element/cropElement";
import { round } from "../../../math";
import { arrayToMap } from "../../utils";

interface StatsProps {
  app: AppClassProperties;
  onClose: () => void;
  renderCustomStats: ExcalidrawProps["renderCustomStats"];
}

const STATS_TIMEOUT = 50;

export const Stats = (props: StatsProps) => {
  const appState = useExcalidrawAppState();
  const sceneNonce = props.app.scene.getSceneNonce() || 1;
  const selectedElements = props.app.scene.getSelectedElements({
    selectedElementIds: appState.selectedElementIds,
    includeBoundTextElement: false,
  });
  const gridModeEnabled = isGridModeEnabled(props.app);

  return (
    <StatsInner
      {...props}
      appState={appState}
      sceneNonce={sceneNonce}
      selectedElements={selectedElements}
      gridModeEnabled={gridModeEnabled}
    />
  );
};

const StatsRow = ({
  children,
  columns = 1,
  heading,
  style,
  ...rest
}: {
  children: React.ReactNode;
  columns?: number;
  heading?: boolean;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsx("exc-stats__row", { "exc-stats__row--heading": heading })}
    style={{
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
);
StatsRow.displayName = "StatsRow";

const StatsRows = ({
  children,
  order,
  style,
  ...rest
}: {
  children: React.ReactNode;
  order?: number;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div className="exc-stats__rows" style={{ order, ...style }} {...rest}>
    {children}
  </div>
);
StatsRows.displayName = "StatsRows";

Stats.StatsRow = StatsRow;
Stats.StatsRows = StatsRows;

export const StatsInner = memo(
  ({
    app,
    onClose,
    renderCustomStats,
    selectedElements,
    appState,
    sceneNonce,
    gridModeEnabled,
  }: StatsProps & {
    sceneNonce: number;
    selectedElements: readonly NonDeletedExcalidrawElement[];
    appState: AppState;
    gridModeEnabled: boolean;
  }) => {
    const scene = app.scene;
    const elements = scene.getNonDeletedElements();
    const elementsMap = scene.getNonDeletedElementsMap();
    const setAppState = useExcalidrawSetAppState();

    const singleElement =
      selectedElements.length === 1 ? selectedElements[0] : null;

    const multipleElements =
      selectedElements.length > 1 ? selectedElements : null;

    const cropMode =
      appState.croppingElementId && isImageElement(singleElement);

    const unCroppedDimension = cropMode
      ? getUncroppedWidthAndHeight(singleElement)
      : null;

    const [sceneDimension, setSceneDimension] = useState<{
      width: number;
      height: number;
    }>({
      width: 0,
      height: 0,
    });

    const throttledSetSceneDimension = useMemo(
      () =>
        throttle((elements: readonly NonDeletedExcalidrawElement[]) => {
          const boundingBox = getCommonBounds(elements);
          setSceneDimension({
            width: Math.round(boundingBox[2]) - Math.round(boundingBox[0]),
            height: Math.round(boundingBox[3]) - Math.round(boundingBox[1]),
          });
        }, STATS_TIMEOUT),
      [],
    );

    useEffect(() => {
      throttledSetSceneDimension(elements);
    }, [sceneNonce, elements, throttledSetSceneDimension]);

    useEffect(
      () => () => throttledSetSceneDimension.cancel(),
      [throttledSetSceneDimension],
    );

    const atomicUnits = useMemo(() => {
      return getAtomicUnits(selectedElements, appState);
    }, [selectedElements, appState]);

    const frameAndChildrenSelectedTogether = useMemo(() => {
      const selectedMap = arrayToMap(selectedElements);
      return selectedElements.some(
        (element) =>
          !isFrameLikeElement(element) &&
          element.frameId &&
          selectedMap.has(element.frameId),
      );
    }, [selectedElements]);

    return (
      <div className="exc-stats">
        <Island padding={3}>
          <div className="title">
            <h2>{t("stats.title")}</h2>
            <div className="close" onClick={onClose}>
              {CloseIcon}
            </div>
          </div>

          <Collapsible
            label={<h3>{t("stats.generalStats")}</h3>}
            open={!!(appState.stats.panels & STATS_PANELS.generalStats)}
            openTrigger={() =>
              setAppState((state) => {
                return {
                  stats: {
                    open: true,
                    panels: state.stats.panels ^ STATS_PANELS.generalStats,
                  },
                };
              })
            }
          >
            <StatsRows>
              <StatsRow heading>{t("stats.scene")}</StatsRow>
              <StatsRow columns={2}>
                <div>{t("stats.shapes")}</div>
                <div>{elements.length}</div>
              </StatsRow>
              <StatsRow columns={2}>
                <div>{t("stats.width")}</div>
                <div>{sceneDimension.width}</div>
              </StatsRow>
              <StatsRow columns={2}>
                <div>{t("stats.height")}</div>
                <div>{sceneDimension.height}</div>
              </StatsRow>
              {gridModeEnabled && (
                <>
                  <StatsRow heading>Canvas</StatsRow>
                  <StatsRow>
                    <CanvasGrid
                      property="gridStep"
                      scene={scene}
                      appState={appState}
                      setAppState={setAppState}
                    />
                  </StatsRow>
                </>
              )}
            </StatsRows>

            {renderCustomStats?.(elements, appState)}
          </Collapsible>

          {!frameAndChildrenSelectedTogether && selectedElements.length > 0 && (
            <div
              id="elementStats"
              style={{
                marginTop: 12,
              }}
            >
              <Collapsible
                label={<h3>{t("stats.elementProperties")}</h3>}
                open={
                  !!(appState.stats.panels & STATS_PANELS.elementProperties)
                }
                openTrigger={() =>
                  setAppState((state) => {
                    return {
                      stats: {
                        open: true,
                        panels:
                          state.stats.panels ^ STATS_PANELS.elementProperties,
                      },
                    };
                  })
                }
              >
                <StatsRows>
                  {singleElement && (
                    <>
                      {cropMode && (
                        <StatsRow heading>
                          {t("labels.unCroppedDimension")}
                        </StatsRow>
                      )}

                      {appState.croppingElementId &&
                        isImageElement(singleElement) &&
                        unCroppedDimension && (
                          <StatsRow columns={2}>
                            <div>{t("stats.width")}</div>
                            <div>{round(unCroppedDimension.width, 2)}</div>
                          </StatsRow>
                        )}

                      {appState.croppingElementId &&
                        isImageElement(singleElement) &&
                        unCroppedDimension && (
                          <StatsRow columns={2}>
                            <div>{t("stats.height")}</div>
                            <div>{round(unCroppedDimension.height, 2)}</div>
                          </StatsRow>
                        )}

                      <StatsRow heading data-testid="stats-element-type">
                        {appState.croppingElementId
                          ? t("labels.imageCropping")
                          : t(`element.${singleElement.type}`)}
                      </StatsRow>

                      <StatsRow>
                        <Position
                          element={singleElement}
                          property="x"
                          elementsMap={elementsMap}
                          scene={scene}
                          appState={appState}
                        />
                      </StatsRow>
                      <StatsRow>
                        <Position
                          element={singleElement}
                          property="y"
                          elementsMap={elementsMap}
                          scene={scene}
                          appState={appState}
                        />
                      </StatsRow>
                      <StatsRow>
                        <Dimension
                          property="width"
                          element={singleElement}
                          scene={scene}
                          appState={appState}
                        />
                      </StatsRow>
                      <StatsRow>
                        <Dimension
                          property="height"
                          element={singleElement}
                          scene={scene}
                          appState={appState}
                        />
                      </StatsRow>
                      {!isElbowArrow(singleElement) && (
                        <StatsRow>
                          <Angle
                            property="angle"
                            element={singleElement}
                            scene={scene}
                            appState={appState}
                          />
                        </StatsRow>
                      )}
                      <StatsRow>
                        <FontSize
                          property="fontSize"
                          element={singleElement}
                          scene={scene}
                          appState={appState}
                        />
                      </StatsRow>
                    </>
                  )}

                  {multipleElements && (
                    <>
                      {elementsAreInSameGroup(multipleElements) && (
                        <StatsRow heading>{t("element.group")}</StatsRow>
                      )}

                      <StatsRow columns={2} style={{ margin: "0.3125rem 0" }}>
                        <div>{t("stats.shapes")}</div>
                        <div>{selectedElements.length}</div>
                      </StatsRow>

                      <StatsRow>
                        <MultiPosition
                          property="x"
                          elements={multipleElements}
                          elementsMap={elementsMap}
                          atomicUnits={atomicUnits}
                          scene={scene}
                          appState={appState}
                        />
                      </StatsRow>
                      <StatsRow>
                        <MultiPosition
                          property="y"
                          elements={multipleElements}
                          elementsMap={elementsMap}
                          atomicUnits={atomicUnits}
                          scene={scene}
                          appState={appState}
                        />
                      </StatsRow>
                      <StatsRow>
                        <MultiDimension
                          property="width"
                          elements={multipleElements}
                          elementsMap={elementsMap}
                          atomicUnits={atomicUnits}
                          scene={scene}
                          appState={appState}
                        />
                      </StatsRow>
                      <StatsRow>
                        <MultiDimension
                          property="height"
                          elements={multipleElements}
                          elementsMap={elementsMap}
                          atomicUnits={atomicUnits}
                          scene={scene}
                          appState={appState}
                        />
                      </StatsRow>
                      <StatsRow>
                        <MultiAngle
                          property="angle"
                          elements={multipleElements}
                          scene={scene}
                          appState={appState}
                        />
                      </StatsRow>
                      <StatsRow>
                        <MultiFontSize
                          property="fontSize"
                          elements={multipleElements}
                          scene={scene}
                          appState={appState}
                          elementsMap={elementsMap}
                        />
                      </StatsRow>
                    </>
                  )}
                </StatsRows>
              </Collapsible>
            </div>
          )}
        </Island>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.sceneNonce === next.sceneNonce &&
      prev.selectedElements === next.selectedElements &&
      prev.appState.stats.panels === next.appState.stats.panels &&
      prev.gridModeEnabled === next.gridModeEnabled &&
      prev.appState.gridStep === next.appState.gridStep &&
      prev.appState.croppingElementId === next.appState.croppingElementId
    );
  },
);

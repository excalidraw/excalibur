import colors from "./colors";
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, ENV } from "./constants";
import { newElement, newLinearElement, newTextElement } from "./element";
import { NonDeletedExcalidrawElement } from "./element/types";
import { randomId } from "./random";

export type ChartElements = readonly NonDeletedExcalidrawElement[];

const BAR_WIDTH = 32;
const BAR_GAP = 12;
const BAR_HEIGHT = 256;
const GRID_OPACITY = 50;

export interface Spreadsheet {
  title: string | null;
  labels: string[] | null;
  values: number[];
}

export const NOT_SPREADSHEET = "NOT_SPREADSHEET";
export const VALID_SPREADSHEET = "VALID_SPREADSHEET";

type ParseSpreadsheetResult =
  | { type: typeof NOT_SPREADSHEET; reason: string }
  | { type: typeof VALID_SPREADSHEET; spreadsheet: Spreadsheet };

const tryParseNumber = (s: string): number | null => {
  const match = /^[$€£¥₩]?([0-9,]+(\.[0-9]+)?)$/.exec(s);
  if (!match) {
    return null;
  }
  return parseFloat(match[1].replace(/,/g, ""));
};

const isNumericColumn = (lines: string[][], columnIndex: number) =>
  lines.slice(1).every((line) => tryParseNumber(line[columnIndex]) !== null);

const tryParseCells = (cells: string[][]): ParseSpreadsheetResult => {
  const numCols = cells[0].length;

  if (numCols > 2) {
    return { type: NOT_SPREADSHEET, reason: "More than 2 columns" };
  }

  if (numCols === 1) {
    if (!isNumericColumn(cells, 0)) {
      return { type: NOT_SPREADSHEET, reason: "Value is not numeric" };
    }

    const hasHeader = tryParseNumber(cells[0][0]) === null;
    const values = (hasHeader ? cells.slice(1) : cells).map((line) =>
      tryParseNumber(line[0]),
    );

    if (values.length < 2) {
      return { type: NOT_SPREADSHEET, reason: "Less than two rows" };
    }

    return {
      type: VALID_SPREADSHEET,
      spreadsheet: {
        title: hasHeader ? cells[0][0] : null,
        labels: null,
        values: values as number[],
      },
    };
  }

  const valueColumnIndex = isNumericColumn(cells, 0) ? 0 : 1;

  if (!isNumericColumn(cells, valueColumnIndex)) {
    return { type: NOT_SPREADSHEET, reason: "Value is not numeric" };
  }

  const labelColumnIndex = (valueColumnIndex + 1) % 2;
  const hasHeader = tryParseNumber(cells[0][valueColumnIndex]) === null;
  const rows = hasHeader ? cells.slice(1) : cells;

  if (rows.length < 2) {
    return { type: NOT_SPREADSHEET, reason: "Less than 2 rows" };
  }

  return {
    type: VALID_SPREADSHEET,
    spreadsheet: {
      title: hasHeader ? cells[0][valueColumnIndex] : null,
      labels: rows.map((row) => row[labelColumnIndex]),
      values: rows.map((row) => tryParseNumber(row[valueColumnIndex])!),
    },
  };
};

const transposeCells = (cells: string[][]) => {
  const nextCells: string[][] = [];
  for (let col = 0; col < cells[0].length; col++) {
    const nextCellRow: string[] = [];
    for (let row = 0; row < cells.length; row++) {
      nextCellRow.push(cells[row][col]);
    }
    nextCells.push(nextCellRow);
  }
  return nextCells;
};

export const tryParseSpreadsheet = (text: string): ParseSpreadsheetResult => {
  // Copy/paste from excel, spreadhseets, tsv, csv.
  // For now we only accept 2 columns with an optional header

  // Check for tab separated values
  let lines = text
    .trim()
    .split("\n")
    .map((line) => line.trim().split("\t"));

  // Check for comma separated files
  if (lines.length && lines[0].length !== 2) {
    lines = text
      .trim()
      .split("\n")
      .map((line) => line.trim().split(","));
  }

  if (lines.length === 0) {
    return { type: NOT_SPREADSHEET, reason: "No values" };
  }

  const numColsFirstLine = lines[0].length;
  const isSpreadsheet = lines.every((line) => line.length === numColsFirstLine);

  if (!isSpreadsheet) {
    return {
      type: NOT_SPREADSHEET,
      reason: "All rows don't have same number of columns",
    };
  }

  const result = tryParseCells(lines);
  if (result.type !== VALID_SPREADSHEET) {
    const transposedResults = tryParseCells(transposeCells(lines));
    if (transposedResults.type === VALID_SPREADSHEET) {
      return transposedResults;
    }
  }
  return result;
};

const bgColors = colors.elementBackground.slice(
  2,
  colors.elementBackground.length,
);

// Put all the common properties here so when the whole chart is selected
// the properties dialog shows the correct selected values
const commonProps = {
  fillStyle: "hachure",
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: DEFAULT_FONT_SIZE,
  opacity: 100,
  roughness: 1,
  strokeColor: colors.elementStroke[0],
  strokeSharpness: "sharp",
  strokeStyle: "solid",
  strokeWidth: 1,
  verticalAlign: "middle",
} as const;

const getChartDimentions = (spreadsheet: Spreadsheet) => {
  const chartWidth =
    (BAR_WIDTH + BAR_GAP) * spreadsheet.values.length + BAR_GAP;
  const chartHeight = BAR_HEIGHT + BAR_GAP * 2;
  return { chartWidth, chartHeight };
};

const chartXLabels = (
  spreadsheet: Spreadsheet,
  x: number,
  y: number,
  groupId: string,
  backgroundColor: string,
): ChartElements => {
  return (
    spreadsheet.labels?.map((label, index) => {
      return newTextElement({
        groupIds: [groupId],
        backgroundColor,
        ...commonProps,
        text: label.length > 8 ? `${label.slice(0, 5)}...` : label,
        x: x + index * (BAR_WIDTH + BAR_GAP) + BAR_GAP * 2,
        y: y + BAR_GAP / 2,
        width: BAR_WIDTH,
        angle: 5.87,
        fontSize: 16,
        textAlign: "center",
        verticalAlign: "top",
        subtype: "none",
      });
    }) || []
  );
};

const chartYLabels = (
  spreadsheet: Spreadsheet,
  x: number,
  y: number,
  groupId: string,
  backgroundColor: string,
): ChartElements => {
  const minYLabel = newTextElement({
    groupIds: [groupId],
    backgroundColor,
    ...commonProps,
    x: x - BAR_GAP,
    y: y - BAR_GAP,
    text: "0",
    textAlign: "right",
    subtype: "none",
  });

  const maxYLabel = newTextElement({
    groupIds: [groupId],
    backgroundColor,
    ...commonProps,
    x: x - BAR_GAP,
    y: y - BAR_HEIGHT - minYLabel.height / 2,
    text: Math.max(...spreadsheet.values).toLocaleString(),
    textAlign: "right",
    subtype: "none",
  });

  return [minYLabel, maxYLabel];
};

const chartLines = (
  spreadsheet: Spreadsheet,
  x: number,
  y: number,
  groupId: string,
  backgroundColor: string,
): ChartElements => {
  const { chartWidth, chartHeight } = getChartDimentions(spreadsheet);
  const xLine = newLinearElement({
    backgroundColor,
    groupIds: [groupId],
    ...commonProps,
    type: "line",
    x,
    y,
    startArrowhead: null,
    endArrowhead: null,
    width: chartWidth,
    points: [
      [0, 0],
      [chartWidth, 0],
    ],
  });

  const yLine = newLinearElement({
    backgroundColor,
    groupIds: [groupId],
    ...commonProps,
    type: "line",
    x,
    y,
    startArrowhead: null,
    endArrowhead: null,
    height: chartHeight,
    points: [
      [0, 0],
      [0, -chartHeight],
    ],
  });

  const maxLine = newLinearElement({
    backgroundColor,
    groupIds: [groupId],
    ...commonProps,
    type: "line",
    x,
    y: y - BAR_HEIGHT - BAR_GAP,
    startArrowhead: null,
    endArrowhead: null,
    strokeStyle: "dotted",
    width: chartWidth,
    opacity: GRID_OPACITY,
    points: [
      [0, 0],
      [chartWidth, 0],
    ],
  });

  return [xLine, yLine, maxLine];
};

// For the maths behind it https://excalidraw.com/#json=6320864370884608,O_5xfD-Agh32tytHpRJx1g
const chartBaseElements = (
  spreadsheet: Spreadsheet,
  x: number,
  y: number,
  groupId: string,
  backgroundColor: string,
  debug?: boolean,
): ChartElements => {
  const { chartWidth, chartHeight } = getChartDimentions(spreadsheet);

  const title = spreadsheet.title
    ? newTextElement({
        backgroundColor,
        groupIds: [groupId],
        ...commonProps,
        text: spreadsheet.title,
        x: x + chartWidth / 2,
        y: y - BAR_HEIGHT - BAR_GAP * 2 - DEFAULT_FONT_SIZE,
        strokeSharpness: "sharp",
        strokeStyle: "solid",
        textAlign: "center",
        subtype: "none",
      })
    : null;

  const debugRect = debug
    ? newElement({
        backgroundColor,
        groupIds: [groupId],
        ...commonProps,
        type: "rectangle",
        x,
        y: y - chartHeight,
        width: chartWidth,
        height: chartHeight,
        strokeColor: colors.elementStroke[0],
        fillStyle: "solid",
        opacity: 6,
      })
    : null;

  return [
    ...(debugRect ? [debugRect] : []),
    ...(title ? [title] : []),
    ...chartXLabels(spreadsheet, x, y, groupId, backgroundColor),
    ...chartYLabels(spreadsheet, x, y, groupId, backgroundColor),
    ...chartLines(spreadsheet, x, y, groupId, backgroundColor),
  ];
};

const chartTypeBar = (
  spreadsheet: Spreadsheet,
  x: number,
  y: number,
): ChartElements => {
  const max = Math.max(...spreadsheet.values);
  const groupId = randomId();
  const backgroundColor = bgColors[Math.floor(Math.random() * bgColors.length)];

  const bars = spreadsheet.values.map((value, index) => {
    const barHeight = (value / max) * BAR_HEIGHT;
    return newElement({
      backgroundColor,
      groupIds: [groupId],
      ...commonProps,
      type: "rectangle",
      x: x + index * (BAR_WIDTH + BAR_GAP) + BAR_GAP,
      y: y - barHeight - BAR_GAP,
      width: BAR_WIDTH,
      height: barHeight,
    });
  });

  return [
    ...bars,
    ...chartBaseElements(
      spreadsheet,
      x,
      y,
      groupId,
      backgroundColor,
      process.env.NODE_ENV === ENV.DEVELOPMENT,
    ),
  ];
};

const chartTypeLine = (
  spreadsheet: Spreadsheet,
  x: number,
  y: number,
): ChartElements => {
  const max = Math.max(...spreadsheet.values);
  const groupId = randomId();
  const backgroundColor = bgColors[Math.floor(Math.random() * bgColors.length)];

  let index = 0;
  const points = [];
  for (const value of spreadsheet.values) {
    const cx = index * (BAR_WIDTH + BAR_GAP);
    const cy = -(value / max) * BAR_HEIGHT;
    points.push([cx, cy]);
    index++;
  }

  const maxX = Math.max(...points.map((element) => element[0]));
  const maxY = Math.max(...points.map((element) => element[1]));
  const minX = Math.min(...points.map((element) => element[0]));
  const minY = Math.min(...points.map((element) => element[1]));

  const line = newLinearElement({
    backgroundColor,
    groupIds: [groupId],
    ...commonProps,
    type: "line",
    x: x + BAR_GAP + BAR_WIDTH / 2,
    y: y - BAR_GAP,
    startArrowhead: null,
    endArrowhead: null,
    height: maxY - minY,
    width: maxX - minX,
    strokeWidth: 2,
    points: points as any,
  });

  const dots = spreadsheet.values.map((value, index) => {
    const cx = index * (BAR_WIDTH + BAR_GAP) + BAR_GAP / 2;
    const cy = -(value / max) * BAR_HEIGHT + BAR_GAP / 2;
    return newElement({
      backgroundColor,
      groupIds: [groupId],
      ...commonProps,
      fillStyle: "solid",
      strokeWidth: 2,
      type: "ellipse",
      x: x + cx + BAR_WIDTH / 2,
      y: y + cy - BAR_GAP * 2,
      width: BAR_GAP,
      height: BAR_GAP,
    });
  });

  const lines = spreadsheet.values.map((value, index) => {
    const cx = index * (BAR_WIDTH + BAR_GAP) + BAR_GAP / 2;
    const cy = (value / max) * BAR_HEIGHT + BAR_GAP / 2 + BAR_GAP;
    return newLinearElement({
      backgroundColor,
      groupIds: [groupId],
      ...commonProps,
      type: "line",
      x: x + cx + BAR_WIDTH / 2 + BAR_GAP / 2,
      y: y - cy,
      startArrowhead: null,
      endArrowhead: null,
      height: cy,
      strokeStyle: "dotted",
      opacity: GRID_OPACITY,
      points: [
        [0, 0],
        [0, cy],
      ],
    });
  });

  return [
    ...chartBaseElements(
      spreadsheet,
      x,
      y,
      groupId,
      backgroundColor,
      process.env.NODE_ENV === ENV.DEVELOPMENT,
    ),
    line,
    ...lines,
    ...dots,
  ];
};

export const renderSpreadsheet = (
  chartType: string,
  spreadsheet: Spreadsheet,
  x: number,
  y: number,
): ChartElements => {
  if (chartType === "line") {
    return chartTypeLine(spreadsheet, x, y);
  }
  return chartTypeBar(spreadsheet, x, y);
};

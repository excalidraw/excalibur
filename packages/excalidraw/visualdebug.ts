import type { Arc, Curve, Segment } from "../math";
import { isSegment, segment, pointFrom, type GlobalPoint } from "../math";
import { isBounds } from "./element/typeChecks";
import type { Bounds } from "./element/types";

// The global data holder to collect the debug operations
declare global {
  interface Window {
    visualDebug?: {
      data: DebugElement[][];
      currentFrame?: number;
    };
  }
}

export type DebugElement = {
  color: string;
  data: Segment<GlobalPoint> | Arc<GlobalPoint> | Curve<GlobalPoint>;
  permanent: boolean;
};

export const debugDrawCubicBezier = (
  c: Curve<GlobalPoint>,
  opts?: {
    color?: string;
    permanent?: boolean;
  },
) => {
  addToCurrentFrame({
    color: opts?.color ?? "purple",
    permanent: !!opts?.permanent,
    data: c,
  });
};

export const debugDrawArc = (
  a: Arc<GlobalPoint>,
  opts?: {
    color?: string;
    permanent?: boolean;
  },
) => {
  addToCurrentFrame({
    color: opts?.color ?? "blue",
    permanent: !!opts?.permanent,
    data: a,
  });
};

export const debugDrawLine = (
  segment: Segment<GlobalPoint> | Segment<GlobalPoint>[],
  opts?: {
    color?: string;
    permanent?: boolean;
  },
) => {
  const segments = (
    isSegment(segment) ? [segment] : segment
  ) as Segment<GlobalPoint>[];

  segments.forEach((data) =>
    addToCurrentFrame({
      color: opts?.color ?? "red",
      data,
      permanent: !!opts?.permanent,
    }),
  );
};

export const debugDrawPoint = (
  p: GlobalPoint,
  opts?: {
    color?: string;
    permanent?: boolean;
    fuzzy?: boolean;
  },
) => {
  const xOffset = opts?.fuzzy ? Math.random() * 3 : 0;
  const yOffset = opts?.fuzzy ? Math.random() * 3 : 0;

  debugDrawLine(
    segment(
      pointFrom<GlobalPoint>(p[0] + xOffset - 10, p[1] + yOffset - 10),
      pointFrom<GlobalPoint>(p[0] + xOffset + 10, p[1] + yOffset + 10),
    ),
    {
      color: opts?.color ?? "cyan",
      permanent: opts?.permanent,
    },
  );
  debugDrawLine(
    segment(
      pointFrom<GlobalPoint>(p[0] + xOffset - 10, p[1] + yOffset + 10),
      pointFrom<GlobalPoint>(p[0] + xOffset + 10, p[1] + yOffset - 10),
    ),
    {
      color: opts?.color ?? "cyan",
      permanent: opts?.permanent,
    },
  );
};

export const debugDrawBounds = (
  box: Bounds | Bounds[],
  opts?: {
    color?: string;
    permanent?: boolean;
  },
) => {
  (isBounds(box) ? [box] : box).forEach((bbox) =>
    debugDrawLine(
      [
        segment(
          pointFrom<GlobalPoint>(bbox[0], bbox[1]),
          pointFrom<GlobalPoint>(bbox[2], bbox[1]),
        ),
        segment(
          pointFrom<GlobalPoint>(bbox[2], bbox[1]),
          pointFrom<GlobalPoint>(bbox[2], bbox[3]),
        ),
        segment(
          pointFrom<GlobalPoint>(bbox[2], bbox[3]),
          pointFrom<GlobalPoint>(bbox[0], bbox[3]),
        ),
        segment(
          pointFrom<GlobalPoint>(bbox[0], bbox[3]),
          pointFrom<GlobalPoint>(bbox[0], bbox[1]),
        ),
      ],
      {
        color: opts?.color ?? "green",
        permanent: !!opts?.permanent,
      },
    ),
  );
};

export const debugCloseFrame = () => {
  window.visualDebug?.data.push([]);
};

export const debugClear = () => {
  if (window.visualDebug?.data) {
    window.visualDebug.data = [];
  }
};

const addToCurrentFrame = (element: DebugElement) => {
  if (window.visualDebug?.data && window.visualDebug.data.length === 0) {
    window.visualDebug.data[0] = [];
  }
  window.visualDebug?.data &&
    window.visualDebug.data[window.visualDebug.data.length - 1].push(element);
};

//
// Measurements
//

/**
 * By definition one radian is the angle subtended at the centre
 * of a circle by an arc that is equal in length to the radius.
 */
export type Radians = number & { _brand: "excalimath__radian" };

/**
 * An angle measurement of a plane angle in which one full
 * rotation is 360 degrees.
 */
export type Degrees = number & { _brand: "excalimath_degree" };

/**
 * A number range which includes the start and end numbers in the range.
 */
export type InclusiveRange = [number, number] & { _brand: "excalimath_degree" };

/**
 * Represents a 2D position in world or canvas space. A
 * global coordinate.
 */
export type GlobalPoint = [x: number, y: number] & {
  _brand: "excalimath__globalpoint";
};

/**
 * Represents a 2D position in whatever local space it's
 * needed. A local coordinate.
 */
export type LocalPoint = [x: number, y: number] & {
  _brand: "excalimath__localpoint";
};

/**
 * Represents a 2D position on the browser viewport.
 */
export type ViewportPoint = [x: number, y: number] & {
  _brand: "excalimath_viewportpoint";
};

/**
 * A coordinate system useful for circular path calculations
 */
export type PolarCoords = [radius: number, angle: Radians] & {
  _brand: "excalimath_polarCoords";
};

/**
 * Aggregate type of all the point types when a function
 * is point type agnostic
 */
export type GenericPoint = GlobalPoint | LocalPoint | ViewportPoint;

/**
 * A line is an infinitely long object with no width, depth, or curvature.
 */
export type Line<P extends GenericPoint> = [p: P, q: P] & {
  _brand: "excalimath_line";
};

/**
 * In geometry, a line segment is a part of a straight
 * line that is bounded by two distinct end points, and
 * contains every point on the line that is between its endpoints.
 */
export type Segment<P extends GenericPoint> = [a: P, b: P] & {
  _brand: "excalimath_segment";
};

/**
 * Represents a 2D vector
 */
export type Vector = [u: number, v: number] & {
  _brand: "excalimath__vector";
};

/**
 * A triangle represented by 3 points
 */
export type Triangle<P extends GenericPoint> = [a: P, b: P, c: P] & {
  _brand: "excalimath__triangle";
};

/**
 * A rectangular shape represented by 4 points at its corners
 */
export type Rectangle<P extends GenericPoint> = [a: P, b: P] & {
  _brand: "excalimath__rectangle";
};

/**
 * A polygon is a closed shape by connecting the given points
 * rectangles and diamonds are modelled by polygons
 */
export type Polygon<Point extends GenericPoint> = Point[] & {
  _brand: "excalimath_polygon";
};

/**
 * Cubic bezier curve where the start and end points are at the 0 and 3 index
 * respectively, and the control points are at the 1 and 2 index respectively.
 *
 * It conveniently maps into the following code:
 *
 * ```javascript
 *  canvasCtx.moveTo(start);
 *  canvasCtx.bezierCurveTo(control1, control2, end);
 * ```
 */
export type Curve<Point extends GenericPoint> = [
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
] & {
  _brand: "excalimath_curve";
};

/**
 * Represents a symmetric arc, a segment of a circular path
 *
 * Angles are in radians and centered on 0, 0. Zero radians on a 1 radius circle
 * corresponds to (1, 0) cartesian coordinates (point), i.e. to the "right"
 */
export type Arc<Point extends GenericPoint> = {
  center: Point;
  radius: number;
  startAngle: Radians;
  endAngle: Radians;
} & {
  _brand: "excalimath_symmetricarc";
};

/**
 * The width and height represented as a type
 */
export type Extent = {
  width: number;
  height: number;
} & {
  _brand: "excalimath_extent";
};

/**
  An ellipse is specified by its center, angle, and its major and minor axes
  but for the sake of simplicity, we've used halfWidth and halfHeight instead
  in replace of semi major and semi minor axes
 */
export type Ellipse<Point extends GenericPoint> = {
  center: Point;
  halfWidth: number;
  halfHeight: number;
} & {
  _brand: "excalimath_ellipse";
};

import type { GlobalPoint, LocalPoint } from "./types";

// Types

/**
 * A triangle represented by 3 points
 */
export type Triangle<P extends GlobalPoint | LocalPoint> = [
  a: P,
  b: P,
  c: P,
] & {
  _brand: "excalimath__triangle";
};

/**
 * Tests if a point lies inside a triangle. This function
 * will return FALSE if the point lies exactly on the sides
 * of the triangle.
 *
 * @param triangle The triangle to test the point for
 * @param p The point to test whether is in the triangle
 * @returns TRUE if the point is inside of the triangle
 */
export function triangleIncludesPoint<P extends GlobalPoint | LocalPoint>(
  [a, b, c]: Triangle<P>,
  p: P,
): boolean {
  const d1 = _triangleSign(p, a, b);
  const d2 = _triangleSign(p, b, c);
  const d3 = _triangleSign(p, c, a);

  const has_neg = d1 < 0 || d2 < 0 || d3 < 0;
  const has_pos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(has_neg && has_pos);
}

// Utils

function _triangleSign<P extends GlobalPoint | LocalPoint>(
  p1: P,
  p2: P,
  p3: P,
): number {
  "inline";

  return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
}
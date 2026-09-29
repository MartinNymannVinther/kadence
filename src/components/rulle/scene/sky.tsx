/**
 * The quiet sky behind the ride when there is no landscape to draw: while
 * the landscape loads, where WebGL is missing, or when the rider has asked
 * for less motion on the screen. The palette's paper fading into its moss.
 */
export function Sky() {
  return (
    <div
      aria-hidden
      className="h-full w-full"
      style={{
        background:
          "linear-gradient(to bottom, var(--accent) 0%, var(--background) 55%, var(--success-tint) 100%)",
      }}
    />
  );
}

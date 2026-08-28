export const ActorType = {
  FACTORY: 'FACTORY',
} as const;
export type ActorType = typeof ActorType[keyof typeof ActorType];

/**
 * A placed actor in the world (currently only factories).
 * All fields that drive rendering must be serializable (JSON-compatible).
 * Procedural visuals are re-derived at render time from `id` + `config`;
 * nothing non-serializable (GSAP timelines, synth instances) should be stored here.
 *
 * See docs/BUILDING_DESIGN.md for the full Factory Actor schema.
 */
export interface Actor {
  /** Unique identifier — also used as the seed for all procedural generation. */
  id: string;
  type: ActorType;
  position: { x: number; y: number };
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  isActive: boolean;
  /** Measures remaining until the actor can activate again. */
  cooldownRemaining: number;
  /**
   * Variant-specific spawn-time configuration.  All values are serializable
   * primitives so the world state can be saved/loaded without conversion.
   *
   * Color shift fields (`hueShift`, `satShift`) are generated deterministically
   * from the actor's id seed at spawn time using the variant's `colorRanges`.
   * See `selectVariantFromSeed` in factoryVariants.ts and docs/BUILDING_DESIGN.md.
   */
  config?: {
    robotBlueprint?: string;
    productionInterval?: number;
    /** Index into FACTORY_ROWS (systems/factoryPlacementSystem.ts); use getRowConfig(row)?.row for the depth group ('background'/'midground'/'foreground'). */
    row?: number;
    /**
     * Degrees of hue rotation applied to the variant's base body color.
     * Picked deterministically at spawn from the variant's `hueShiftRange`.
     * Passed to `applyColorShift()` in colorUtils.ts at render time.
     */
    hueShift?: number;
    /**
     * Percentage-point saturation delta applied to the variant's base body color.
     * Picked deterministically at spawn from the variant's `satShiftRange`.
     * Passed to `applyColorShift()` in colorUtils.ts at render time.
     */
    satShift?: number;
    /**
     * Percentage-point lightness delta contributed by the active Attenuation
     * Style, applied ONLY to the factory wall's base fill (Factory.tsx's
     * eastFill/westFill) via colorUtils.ts's `boostLightness()` — not folded
     * into `hueShift`/`satShift` (those combine local + AS additively) and
     * not passed to rooftop/facade greebles. Dark base wall colors otherwise
     * make an AS's hue shift nearly imperceptible regardless of magnitude;
     * this exists purely to keep that shift legible. Always >= 0 — an AS
     * only ever brightens a wall, never dims it. See
     * docs/specs/ATTENUATION_STYLE.md §1.2.
     */
    asLightShift?: number;
    /** Rooftop greeble selected at spawn; drives ROOFTOP_RENDERERS lookup. */
    rooftopGreeble?: import('../components/actors/greebles/greebleTypes').RooftopGreeble;
    /** Facade greeble selected at spawn; drives FACADE_RENDERERS lookup. */
    facadeGreeble?: import('../components/actors/greebles/greebleTypes').FacadeGreeble;
    /**
     * Number of decorative horizontal belt courses chosen at spawn time.
     * Uniform random pick from `[0 .. variant.greebleConfig.maxBeltCourses]`.
     * Stored here so the zone-based window layout in Factory.tsx stays
     * deterministic without re-running the PRNG at render time.
     */
    beltCourseCount?: number;
    /** High‑level purpose derived from factory variant. Read-only after spawn. */
    purpose?: import('../components/actors/factoryVariants').FactoryPurpose;
    /** Convenience flag set when a factory has been powered down. */
    isOffline?: boolean;
    /** Measure at which the factory went offline. */
    offlineSince?: number;
  };
}

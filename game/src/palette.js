// Visual theme and palette constants for Sector-7 tactical aesthetic.
// Calibrated for bright, readable daylight-industrial environments (mean luma 70-85).
export const PALETTE = {
  // Atmosphere and Sky
  canvas: 0x546677,        // Daylight industrial sky fill
  skyFill: 0x8297ab,       // Upper hemisphere skylight
  groundHemisphere: 0x47515c, // Ground hemisphere bounce fill
  surface: 0x1f2733,      // UI modal surfaces
  surfaceAlt: 0x2b3544,   // Secondary UI containers
  border: 0x475569,       // UI borders and trims
  ink: 0xf8fafc,          // High contrast bright text
  muted: 0x94a3b8,        // Secondary text
  accent: 0xf59e0b,       // Tactical amber accent

  // Architecture and industrial materials
  concrete: 0x8e9ca9,     // Bright cast concrete flooring
  concreteDark: 0x64748b, // Structural foundations
  concreteLight: 0xa8b6c4,// Concrete highlights
  steel: 0x718092,        // Steel beams and bulkheads
  steelLight: 0x9aa8b7,   // Railings and trims
  metalTrim: 0x4d5b6a,    // Architectural seams
  hazardYellow: 0xf59e0b, // Hazard stripes
  hazardBlack: 0x1e242d,  // Contrast stripe

  // Tactical lighting and faction accents
  sunLight: 0xfff6ea,     // Sunlight key
  siteAlphaGlow: 0x10b981,// Emerald beacon marker
  siteBravoGlow: 0x06b6d4,// Cyan quantum marker
  midLight: 0xf59e0b,     // Amber corridor illumination

  // Factions
  aeroSec: 0x0284c7,      // AeroSec blue
  aeroSecGlow: 0x38bdf8,  // AeroSec visor
  helix: 0xd97706,        // Helix Syndicate orange-red
  helixGlow: 0xef4444,    // Helix sensor visor

  // Effects & Weapons
  tracer: 0xfef08a,       // Gold tracer
  tracerEnemy: 0xf87171,  // Coral enemy tracer
  flash: 0xffedd5,        // Muzzle illumination
  spark: 0xfbbf24,        // Impact sparks
  smoke: 0x94a3b8,        // Tactical aerosol smoke
  grenadeGreen: 0x16a34a, // Frag grenade casing
  blastOrange: 0xf97316,  // Explosion core
};

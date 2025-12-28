/**
 * Heat system configuration - single source of truth for heat thresholds and behavior.
 */
export const HEAT_CONFIG = {
  /** Heat level (as percentage of max) at which warning triggers */
  WARNING_THRESHOLD: 0.7,

  /** Heat level (as percentage of max) at which shutdown triggers */
  SHUTDOWN_THRESHOLD: 0.95,

  /** Heat level (as percentage of max) at which recovery from overheat occurs */
  RECOVERY_THRESHOLD: 0.5,
} as const;

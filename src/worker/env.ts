export type ProviderSecretName =
  | "MAPBOX_TOKEN"
  | "MAPTILER_KEY"
  | "STADIA_KEY"
  | "CUSTOM_PROVIDER_KEY";

export type RuntimeEnv = Omit<Env, "ALLOWED_ORIGINS"> & {
  TILEMUX_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  MAPBOX_TOKEN?: string;
  MAPTILER_KEY?: string;
  STADIA_KEY?: string;
  CUSTOM_PROVIDER_KEY?: string;
};

export type ProviderSecretName =
  | "AZURE_MAPS_KEY"
  | "GOOGLE_MAPS_KEY"
  | "MAPBOX_TOKEN"
  | "MAPTILER_KEY"
  | "STADIA_KEY"
  | "THUNDERFOREST_KEY"
  | "CUSTOM_PROVIDER_KEY";

export type RuntimeEnv = Omit<Env, "ALLOWED_ORIGINS"> & {
  TILEMUX_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  AZURE_MAPS_KEY?: string;
  GOOGLE_MAPS_KEY?: string;
  MAPBOX_TOKEN?: string;
  MAPTILER_KEY?: string;
  STADIA_KEY?: string;
  THUNDERFOREST_KEY?: string;
  CUSTOM_PROVIDER_KEY?: string;
};

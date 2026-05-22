// Brand theme — values are read from env at render time so the same
// composition can be rendered for any workspace by exporting the right
// variables before invoking `npx remotion render`.

export const BrandTheme = {
  primary: process.env.BRAND_COLOR_PRIMARY ?? "#7C5CFC",
  secondary: process.env.BRAND_COLOR_SECONDARY ?? "#3B82F6",
  background: process.env.BRAND_BG ?? "#F4F6FB",
  text: "#0B1220",
  logoPath: process.env.BRAND_LOGO_PATH ?? "/logo.svg",
};

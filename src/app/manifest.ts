import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Communication Mirror",
    short_name: "Mirror",
    description: "A private, on-device communication practice room.",
    start_url: "/",
    display: "standalone",
    background_color: "#171611",
    theme_color: "#171611",
    icons: [
      { src: "/mirror-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/mirror-icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}


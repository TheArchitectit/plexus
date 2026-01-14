/**
 * Type declarations for static asset imports in Bun
 * 
 * Bun's bundler natively supports importing static assets (images, SVGs, etc.)
 * and provides the resolved path as a string export. These declarations tell
 * TypeScript that these imports are valid and what type they return.
 */

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}

declare module "*.ico" {
  const content: string;
  export default content;
}

declare module "*.gif" {
  const content: string;
  export default content;
}

declare module "*.webmanifest" {
  const content: string;
  export default content;
}

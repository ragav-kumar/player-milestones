/**
 * Allows TypeScript to understand side-effect CSS imports handled by Vite.
 * Foundry ultimately receives the bundled CSS via the build output.
 */
declare module "*.css";

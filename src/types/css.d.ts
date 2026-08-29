declare module "*.css";

declare global {
  interface Window {
    eruda?: {
      init: () => void;
    };
  }

  const __DEV__: boolean;
}

export {};


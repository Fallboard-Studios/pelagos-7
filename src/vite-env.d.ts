/// <reference types="vite/client" />

declare module '*.css';

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

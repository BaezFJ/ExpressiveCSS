/// <reference types="astro/client" />
//
// Brings in Vite's ambient module declarations -- `*?raw`, which is how the
// LLM endpoints read the two canonical root documents -- and `import.meta.env`.
// The root tsconfig sets `types: []` so the framework's own source cannot
// reach for Node or test globals; this is a file reference, not an automatic
// type package, so it is unaffected by that.

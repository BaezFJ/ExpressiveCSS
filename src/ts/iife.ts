// The IIFE entry: the main bundle plus `core`, so `<script>` pages get the
// extension API as `Expressive.core`. Kept out of index.ts and modular.ts,
// whose exports are the documented component surface.
export * from './index';
export * as core from './core';

import { register } from "node:module";

// Unit-only loader: preserves server-only boundaries in the real Next build.
register("./typescript-loader.mjs", import.meta.url);

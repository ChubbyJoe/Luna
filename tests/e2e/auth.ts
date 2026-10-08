import path from "node:path";

// Storage states written by auth.setup.ts. Signed in specs pick one with
// `test.use({ storageState: ACCOUNT_A })`.
export const ACCOUNT_A = path.join(__dirname, ".auth", "a.json");
export const ACCOUNT_B = path.join(__dirname, ".auth", "b.json");

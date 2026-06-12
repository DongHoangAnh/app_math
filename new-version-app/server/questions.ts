// Generation logic now lives in shared/ so the practice client can import it too.
// This barrel keeps the server's import paths (and existing tests) stable.
export { normalizeDifficulty, generateQuestion, generateQuestions } from "../shared/questions";
export type { ArithOp } from "../shared/questions";

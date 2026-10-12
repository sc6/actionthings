/** Comparisons an action's condition clause can use. Shared by server and client code. */
export const OPS = ["<", "<=", "=", "!=", ">=", ">"] as const;
export type Op = (typeof OPS)[number];

export const OP_SYMBOL: Record<Op, string> = { "<": "<", "<=": "≤", "=": "=", "!=": "≠", ">=": "≥", ">": ">" };

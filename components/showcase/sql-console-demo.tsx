"use client";

import { type QueryResult, SqlConsole } from "@/components/craft/sql-console";

const USERS: QueryResult = {
  columns: ["id", "name", "plan", "active"],
  rows: [
    [1, "Ada Lovelace", "enterprise", true],
    [2, "Linus Park", "pro", true],
    [4, "Margaret Hamilton", "pro", true],
    [5, "Alan Turing", "enterprise", true],
    [7, "Donald Knuth", "pro", true],
  ],
};

const ORDERS: QueryResult = {
  columns: ["id", "user_id", "status", "total"],
  rows: [
    [1042, 1, "shipped", 129.99],
    [1039, 4, "refunded", 99.99],
    [1051, 2, "pending", 49],
  ],
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mockRun(sql: string): Promise<QueryResult> {
  await delay(350);
  const q = sql.toLowerCase();
  if (q.includes("drop") || q.includes("delete")) {
    return {
      columns: [],
      error: "permission denied: destructive statements are disabled",
      rows: [],
    };
  }
  if (!q.includes("select")) {
    return {
      columns: [],
      error: `syntax error near "${sql.trim().split(/\s+/)[0] ?? ""}"`,
      rows: [],
    };
  }
  return q.includes("orders") ? ORDERS : USERS;
}

export function SqlConsoleDemo() {
  return (
    <SqlConsole
      initialQuery={"select id, name, plan, active\nfrom users\nwhere active = true\nlimit 5;"}
      onRun={mockRun}
    />
  );
}

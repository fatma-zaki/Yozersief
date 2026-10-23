import "server-only";
import { db, type Db } from "./client";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Repositories accept either, so a use case can compose them inside one transaction. */
export type DbOrTx = Db | Tx;

/** Runs `fn` in a transaction; any throw rolls back. */
export function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}

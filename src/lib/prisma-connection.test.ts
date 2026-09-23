import assert from "node:assert/strict";
import test from "node:test";

import { resolvePrismaConnection } from "./prisma-connection";

test("passes the requested PostgreSQL schema to the driver adapter", () => {
  const connection = resolvePrismaConnection(
    "postgresql://user:secret@db.example.test/mailpulse?sslmode=require&schema=tenant_e2e&channel_binding=require",
  );

  assert.equal(connection.schema, "tenant_e2e");
  assert.equal(new URL(connection.connectionString).searchParams.get("schema"), null);
  assert.equal(new URL(connection.connectionString).searchParams.get("sslmode"), "verify-full");
  assert.equal(new URL(connection.connectionString).searchParams.get("channel_binding"), "require");
});

test("keeps the default database schema when none is requested", () => {
  const connection = resolvePrismaConnection("postgresql://user:secret@db.example.test/mailpulse?sslmode=verify-full");

  assert.equal(connection.schema, undefined);
  assert.equal(new URL(connection.connectionString).searchParams.get("sslmode"), "verify-full");
});

export type PrismaConnection = {
  connectionString: string;
  schema?: string;
};

export function resolvePrismaConnection(value: string): PrismaConnection {
  const url = new URL(value);
  const schema = url.searchParams.get("schema")?.trim() || undefined;

  url.searchParams.delete("schema");
  if (url.searchParams.get("sslmode") === "require") {
    url.searchParams.set("sslmode", "verify-full");
  }

  return {
    connectionString: url.toString(),
    ...(schema ? { schema } : {}),
  };
}

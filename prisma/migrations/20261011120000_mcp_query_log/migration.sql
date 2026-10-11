-- Audit log of AI client requests to the MCP server.
CREATE TABLE "McpQueryLog" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "tool" TEXT,
    "arguments" JSONB,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "McpQueryLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "McpQueryLog_licenseeId_createdAt_idx" ON "McpQueryLog"("licenseeId", "createdAt");

ALTER TABLE "McpQueryLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "McpQueryLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "McpQueryLog"
  USING (current_setting('app.is_admin', true) = 'true' OR "licenseeId" = current_setting('app.current_licensee_id', true));

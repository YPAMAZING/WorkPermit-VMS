-- Create PermitActionHistory table to track all permit actions (approve, revoke, reapprove, etc.)
CREATE TABLE IF NOT EXISTS "permit_action_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "permitId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT,
    "performedByName" TEXT,
    "performedByRole" TEXT,
    "comment" TEXT,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "signature" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permit_action_history_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "permit_requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "permit_action_history_permitId_idx" ON "permit_action_history"("permitId");
CREATE INDEX IF NOT EXISTS "permit_action_history_action_idx" ON "permit_action_history"("action");

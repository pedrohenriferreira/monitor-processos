CREATE TYPE "ProcessStatus" AS ENUM ('PENDING', 'OK', 'NEW_EVENT', 'NOT_FOUND', 'ERROR');
CREATE TYPE "ImportStatus" AS ENUM ('PREVIEW', 'COMPLETED', 'FAILED');

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "full_name" TEXT,
  "password_hash" TEXT NOT NULL,
  "session_version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "imports" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "filename" TEXT NOT NULL,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "imported_rows" INTEGER NOT NULL DEFAULT 0,
  "rejected_rows" INTEGER NOT NULL DEFAULT 0,
  "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEW',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "processes" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "import_id" UUID,
  "numero_cnj" TEXT NOT NULL,
  "tribunal" TEXT NOT NULL,
  "advogado" TEXT,
  "last_event_name" TEXT,
  "last_event_code" INTEGER,
  "last_event_at" TIMESTAMPTZ(6),
  "last_checked_at" TIMESTAMPTZ(6),
  "status" "ProcessStatus" NOT NULL DEFAULT 'PENDING',
  "last_error" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "processes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "process_events" (
  "id" UUID NOT NULL,
  "process_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "code" INTEGER,
  "name" TEXT NOT NULL,
  "happened_at" TIMESTAMPTZ(6) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "notified_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "process_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telegram_connections" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "chat_id" TEXT,
  "link_token_hash" TEXT,
  "link_token_expires_at" TIMESTAMPTZ(6),
  "connected_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "telegram_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "worker_runs" (
  "id" UUID NOT NULL,
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6),
  "total_processes" INTEGER NOT NULL DEFAULT 0,
  "new_events" INTEGER NOT NULL DEFAULT 0,
  "errors" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "details" TEXT,
  CONSTRAINT "worker_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "imports_user_id_created_at_idx" ON "imports"("user_id", "created_at");
CREATE INDEX "processes_is_active_updated_at_idx" ON "processes"("is_active", "updated_at");
CREATE UNIQUE INDEX "processes_user_id_numero_cnj_tribunal_key" ON "processes"("user_id", "numero_cnj", "tribunal");
CREATE INDEX "process_events_process_id_happened_at_idx" ON "process_events"("process_id", "happened_at");
CREATE UNIQUE INDEX "process_events_process_id_happened_at_name_key" ON "process_events"("process_id", "happened_at", "name");
CREATE UNIQUE INDEX "telegram_connections_user_id_key" ON "telegram_connections"("user_id");
CREATE UNIQUE INDEX "telegram_connections_chat_id_key" ON "telegram_connections"("chat_id");

ALTER TABLE "imports" ADD CONSTRAINT "imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "processes" ADD CONSTRAINT "processes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "processes" ADD CONSTRAINT "processes_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "process_events" ADD CONSTRAINT "process_events_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_events" ADD CONSTRAINT "process_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_connections" ADD CONSTRAINT "telegram_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

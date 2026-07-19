-- AlterTable
ALTER TABLE "process_events" ADD COLUMN     "prazo_notified_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "processes" ADD COLUMN     "audiencia_alertada_para" TIMESTAMPTZ(6),
ADD COLUMN     "classe" TEXT,
ADD COLUMN     "parte_adversa" TEXT,
ADD COLUMN     "proxima_audiencia" TIMESTAMPTZ(6),
ADD COLUMN     "valor_causa" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "telegram_connections" ADD COLUMN     "notify_audiencia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notify_novo_andamento" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_prazo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan_label" TEXT NOT NULL DEFAULT 'Pro — Ilimitado';

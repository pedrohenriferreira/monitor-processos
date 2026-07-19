"use client";
import { RecentNotifications, type NotificationItem } from "@/components/dashboard/recent-notifications";
import { TelegramSettings } from "@/components/dashboard/telegram-settings";

type Prefs = { notifyNovoAndamento: boolean; notifyPrazo: boolean; notifyAudiencia: boolean };

export default function Content({ items, connected, prefs }: { items: NotificationItem[]; connected: boolean; prefs: Prefs }) {
  return (
    <div>
      <RecentNotifications items={items} />
      <div className="mb-3 text-sm font-semibold">Conectar ao Telegram</div>
      <TelegramSettings connected={connected} prefs={prefs} />
    </div>
  );
}

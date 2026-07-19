export function TelegramIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#26A5E4" />
      <path
        d="M17.5 7.2 15.6 17c-.14.63-.5.78-1.02.49l-2.82-2.08-1.36 1.31c-.15.15-.28.28-.57.28l.2-2.88 5.24-4.74c.23-.2-.05-.32-.35-.11l-6.48 4.08-2.79-.87c-.6-.19-.61-.6.13-.89l10.9-4.2c.5-.18.94.12.78.9Z"
        fill="#fff"
      />
    </svg>
  );
}

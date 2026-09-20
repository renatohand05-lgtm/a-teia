"use client";

import { FocusTrap } from "@/components/ui/FocusTrap";

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <FocusTrap active onEscape={onClose}>
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          aria-label="Fechar painel"
          className="absolute inset-0 bg-black/55"
          onClick={onClose}
        />
        <aside
          data-teia-drawer="true"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col overflow-auto border-l px-5 py-5"
          style={{ background: "#0c0d10", borderColor: "var(--border)" }}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="m-0 text-[16px] font-bold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-lg border px-2.5 py-1.5 text-[12px] font-bold"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              Fechar
            </button>
          </div>
          {children}
        </aside>
      </div>
    </FocusTrap>
  );
}

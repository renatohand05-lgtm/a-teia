export function ChartCard({
  title,
  children,
  demo = false,
}: {
  title: string;
  children: React.ReactNode;
  demo?: boolean;
}) {
  return (
    <section className="surface-card p-[22px]">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="m-0 text-[15px] font-bold tracking-[-0.01em]">{title}</h3>
        {demo ? (
          <span className="text-[9px] font-extrabold tracking-[0.12em]" style={{ color: "var(--gold-soft)" }}>
            DEMO
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

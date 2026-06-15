type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="mx-auto grid min-h-[55dvh] max-w-md place-items-center text-center">
      <div className="space-y-5">
        <div className="pattern-hatch mx-auto size-16 rounded-[28px] bg-surface-warm shadow-inner" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="text-base leading-7 text-muted">{description}</p>
        </div>
        {action ? (
          <div className="inline-flex rounded-pill bg-ink px-5 py-3 text-sm font-semibold text-white">
            {action}
          </div>
        ) : null}
      </div>
    </section>
  );
}

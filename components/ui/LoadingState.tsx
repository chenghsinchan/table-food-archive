export function LoadingState() {
  return (
    <div className="table-container grid gap-5">
      <div className="h-10 w-44 animate-pulse rounded-pill bg-surface-warm" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-table bg-surface-warm"
            style={{ height: index % 3 === 0 ? 250 : 190 }}
          />
        ))}
      </div>
    </div>
  );
}

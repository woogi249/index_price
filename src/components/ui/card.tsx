export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface border border-border rounded-lg p-4 overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

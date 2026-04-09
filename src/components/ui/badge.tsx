const styles = {
  warning: "bg-warn/15 text-warn border-warn/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  safe: "bg-safe/15 text-safe border-safe/30",
} as const;

export function Badge({
  severity,
  children,
}: {
  severity: "warning" | "danger" | "safe";
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[severity]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          severity === "warning"
            ? "bg-warn"
            : severity === "danger"
            ? "bg-danger"
            : "bg-safe"
        }`}
      />
      {children}
    </span>
  );
}

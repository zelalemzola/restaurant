export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dashboard pages are already wrapped by AppShell at the root,
  // so this layout just passes children through to avoid double layout.
  return <>{children}</>;
}



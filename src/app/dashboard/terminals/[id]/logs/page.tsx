import TerminalDetailLogsPage from "@/components/dashboard/TerminalDetailLogsPage";

type TerminalLogsRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function DashboardTerminalLogsRoute({
  params,
}: TerminalLogsRouteProps) {
  const { id } = await params;
  return <TerminalDetailLogsPage id={id} />;
}


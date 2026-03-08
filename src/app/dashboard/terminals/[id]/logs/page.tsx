import TerminalDetailLogsPage from "@/components/dashboard/TerminalDetailLogsPage";

type TerminalLogsRouteProps = {
  params: {
    id: string;
  };
};

export default function DashboardTerminalLogsRoute({
  params,
}: TerminalLogsRouteProps) {
  return <TerminalDetailLogsPage id={params.id} />;
}


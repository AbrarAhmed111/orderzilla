import TerminalDetailOverviewPage from "@/components/dashboard/TerminalDetailOverviewPage";

type TerminalDetailRouteProps = {
  params: {
    id: string;
  };
};

export default function DashboardTerminalDetailRoute({
  params,
}: TerminalDetailRouteProps) {
  return <TerminalDetailOverviewPage id={params.id} />;
}


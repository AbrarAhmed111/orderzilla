import TerminalDetailOverviewPage from "@/components/dashboard/TerminalDetailOverviewPage";

type TerminalDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function DashboardTerminalDetailRoute({
  params,
}: TerminalDetailRouteProps) {
  const { id } = await params;
  return <TerminalDetailOverviewPage id={id} />;
}


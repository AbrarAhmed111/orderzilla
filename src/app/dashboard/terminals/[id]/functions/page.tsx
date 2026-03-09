import TerminalDetailFunctionsPage from "@/components/dashboard/TerminalDetailFunctionsPage";

type TerminalFunctionsRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function DashboardTerminalFunctionsRoute({
  params,
}: TerminalFunctionsRouteProps) {
  const { id } = await params;
  return <TerminalDetailFunctionsPage id={id} />;
}


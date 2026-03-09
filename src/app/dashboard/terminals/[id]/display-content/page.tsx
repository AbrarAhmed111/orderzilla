import TerminalDetailDisplayContentPage from "@/components/dashboard/TerminalDetailDisplayContentPage";

type TerminalDisplayContentRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function DashboardTerminalDisplayContentRoute({
  params,
}: TerminalDisplayContentRouteProps) {
  const { id } = await params;
  return <TerminalDetailDisplayContentPage id={id} />;
}


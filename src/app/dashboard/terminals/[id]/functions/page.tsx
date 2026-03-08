import TerminalDetailFunctionsPage from "@/components/dashboard/TerminalDetailFunctionsPage";

type TerminalFunctionsRouteProps = {
  params: {
    id: string;
  };
};

export default function DashboardTerminalFunctionsRoute({
  params,
}: TerminalFunctionsRouteProps) {
  return <TerminalDetailFunctionsPage id={params.id} />;
}


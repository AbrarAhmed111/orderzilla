import TerminalDetailDisplayContentPage from "@/components/dashboard/TerminalDetailDisplayContentPage";

type TerminalDisplayContentRouteProps = {
  params: {
    id: string;
  };
};

export default function DashboardTerminalDisplayContentRoute({
  params,
}: TerminalDisplayContentRouteProps) {
  return <TerminalDetailDisplayContentPage id={params.id} />;
}


import EditCustomerPage from "@/components/dashboard/EditCustomerPage";

type EditCustomerRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DashboardEditCustomerRoute({
  params,
}: EditCustomerRouteProps) {
  const resolvedParams = await params;
  return <EditCustomerPage id={resolvedParams.id} />;
}


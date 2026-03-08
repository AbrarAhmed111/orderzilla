import CustomerDetailPage from "@/components/dashboard/CustomerDetailPage";

type CustomerDetailRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DashboardCustomerDetailRoute({
  params,
}: CustomerDetailRouteProps) {
  const resolvedParams = await params;
  return <CustomerDetailPage id={resolvedParams.id} />;
}


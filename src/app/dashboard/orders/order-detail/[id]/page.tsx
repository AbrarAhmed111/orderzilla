import OrderDetailPage from "@/components/dashboard/OrderDetailPage";

type OrderDetailRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DashboardOrderDetailRoute({
  params,
}: OrderDetailRouteProps) {
  const resolvedParams = await params;
  return <OrderDetailPage id={resolvedParams.id} />;
}


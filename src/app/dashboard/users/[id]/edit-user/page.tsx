import EditUserPage from "@/components/dashboard/EditUserPage";

type EditUserRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DashboardEditUserRoute({
  params,
}: EditUserRouteProps) {
  const resolvedParams = await params;
  return <EditUserPage id={resolvedParams.id} />;
}


import EditCategoryPage from "@/components/dashboard/EditCategoryPage";

type EditCategoryRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCategoryRoute({ params }: EditCategoryRouteProps) {
  const resolvedParams = await params;
  return <EditCategoryPage id={resolvedParams.id} />;
}


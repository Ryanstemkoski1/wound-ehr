import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import FacilityForm from "@/components/facilities/facility-form";
import { createClient } from "@/lib/supabase/server";

export default async function EditFacilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Check if user has access to this facility
  const facility = await prisma.facility.findFirst({
    where: {
      id,
      users: {
        some: {
          userId: user.id,
        },
      },
    },
  });

  if (!facility) {
    notFound();
  }

  return <FacilityForm facility={facility} />;
}

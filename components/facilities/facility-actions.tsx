"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { deleteFacility } from "@/app/actions/facilities";

export default function FacilityActions({
  facilityId,
}: {
  facilityId: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this facility?")) {
      return;
    }

    setLoading(true);
    const result = await deleteFacility(facilityId);

    if (result.error) {
      alert(result.error);
    }

    setLoading(false);
    setShowMenu(false);
  }

  function handleEdit() {
    router.push(`/dashboard/facilities/${facilityId}/edit`);
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        className="h-8 w-8 p-0"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-8 right-0 z-20 w-48 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="p-1">
              <button
                onClick={handleEdit}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

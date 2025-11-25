"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";
import { getVisitAddendums } from "@/app/actions/visits";

type Addendum = {
  id: string;
  note: string;
  created_at: string;
  users:
    | {
        full_name: string;
        email: string;
        credentials: string | null;
      }[]
    | null;
};

type VisitAddendumsProps = {
  visitId: string;
};

export function VisitAddendums({ visitId }: VisitAddendumsProps) {
  const [addendums, setAddendums] = useState<Addendum[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAddendums() {
      setIsLoading(true);
      console.log("Fetching addendums for visit:", visitId);
      const result = await getVisitAddendums(visitId);
      console.log("Addendums result:", result);
      if (result.data) {
        setAddendums(result.data as Addendum[]);
      }
      setIsLoading(false);
    }
    loadAddendums();
  }, [visitId]);

  if (isLoading) {
    return null;
  }

  if (addendums.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Addendums</h3>
        <Badge variant="secondary">{addendums.length}</Badge>
      </div>

      <div className="space-y-3">
        {addendums.map((addendum, index) => {
          const date = new Date(addendum.created_at);
          const author =
            addendum.users && addendum.users.length > 0
              ? addendum.users[0]
              : null;
          const authorName = author?.full_name || author?.email || "Unknown";
          const credentials = author?.credentials;

          return (
            <Card key={addendum.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">
                      Addendum #{index + 1}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {date.toLocaleDateString()} at {date.toLocaleTimeString()}{" "}
                      by {authorName}
                      {credentials && (
                        <Badge variant="outline" className="ml-2">
                          {credentials}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {addendum.note}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

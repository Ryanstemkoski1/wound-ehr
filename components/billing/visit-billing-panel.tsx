/**
 * VisitBillingPanel — Server component
 *
 * Renders in the visit detail page's third column. Shows:
 * - Billing status badge + claim lifecycle actions (BillingStatusActions client)
 * - CPT / ICD-10 / modifier codes (read-only when locked)
 * - BillingFormServerWrapper for editing when claim is still in draft/ready
 *
 * Props are supplied by the visit page which pre-fetches the billing record.
 */

import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BillingFormServerWrapper } from "./billing-form-server-wrapper";
import { BillingStatusActions } from "./billing-status-actions";
import type { BillingStatus } from "@/app/actions/billing";

type BillingRecord = {
  id: string;
  billingStatus: BillingStatus;
  submittedAt?: string | null;
  claimNumber?: string | null;
  cptCodes: string[];
  icd10Codes: string[];
  modifiers: string[];
  timeSpent: boolean;
  notes: string | null;
};

type Props = {
  visitId: string;
  patientId: string;
  billing: BillingRecord | null;
  /** Prevent edits when the visit is signed/submitted */
  locked?: boolean;
};

const LOCKED_STATUSES: BillingStatus[] = ["submitted", "paid", "denied"];

export async function VisitBillingPanel({
  visitId,
  patientId,
  billing,
  locked = false,
}: Props) {
  const isLocked =
    locked ||
    (billing ? LOCKED_STATUSES.includes(billing.billingStatus) : false);

  if (!billing) {
    // No billing record yet — show the form so staff can create one
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!locked ? (
            <BillingFormServerWrapper
              visitId={visitId}
              patientId={patientId}
              existingBilling={null}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              No billing record — visit is locked.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4" />
          Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badge + lifecycle actions */}
        <BillingStatusActions
          billingId={billing.id}
          status={billing.billingStatus}
          submittedAt={billing.submittedAt}
          claimNumber={billing.claimNumber}
          disabled={locked}
        />

        {/* Code summary (always shown) */}
        {billing.cptCodes.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">
              CPT Codes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {billing.cptCodes.map((code) => (
                <Badge key={code} variant="outline" className="text-xs">
                  {code}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {billing.icd10Codes.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">
              ICD-10 Codes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {billing.icd10Codes.map((code) => (
                <Badge key={code} variant="outline" className="text-xs">
                  {code}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {billing.modifiers.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">
              Modifiers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {billing.modifiers.map((mod) => (
                <Badge key={mod} variant="secondary" className="text-xs">
                  {mod}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {billing.timeSpent && (
          <div className="bg-primary/5 rounded-md p-2.5">
            <p className="text-primary/80 text-xs">
              Time-based billing applicable (45+ min)
            </p>
          </div>
        )}

        {billing.notes && (
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium">
              Billing Notes
            </p>
            <p className="text-sm whitespace-pre-wrap">{billing.notes}</p>
          </div>
        )}

        {/* Edit form — only when claim is still editable */}
        {!isLocked && (
          <div className="border-border mt-2 border-t pt-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              Edit billing codes
            </p>
            <BillingFormServerWrapper
              visitId={visitId}
              patientId={patientId}
              existingBilling={{
                id: billing.id,
                cptCodes: billing.cptCodes,
                icd10Codes: billing.icd10Codes,
                modifiers: billing.modifiers,
                timeSpent: billing.timeSpent,
                notes: billing.notes,
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

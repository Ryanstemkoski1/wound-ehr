import { createClient } from "@/lib/supabase/server";
import {
  getAllowedProcedures,
  getRestrictedProcedures,
} from "@/lib/procedures";
import { BillingFormWithCredentials } from "./billing-form-with-credentials";
import type { Credentials } from "@/lib/credentials";

type BillingFormServerWrapperProps = {
  visitId: string;
  patientId: string;
  existingBilling?: {
    id: string;
    cptCodes: string[];
    icd10Codes: string[];
    modifiers: string[];
    timeSpent: boolean;
    notes: string | null;
  } | null;
};

/**
 * Server Component wrapper for BillingFormWithCredentials
 * Fetches user credentials and procedure restrictions, then passes to client component
 */
export async function BillingFormServerWrapper({
  visitId,
  patientId,
  existingBilling,
}: BillingFormServerWrapperProps) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Please log in to access the billing form.
        </p>
      </div>
    );
  }

  // Get user credentials using RPC to bypass RLS
  const { data: userDataArray } = await supabase
    .rpc("get_current_user_credentials");

  const userData = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;
  const userCredentials = (userData?.credentials as Credentials) || null;

  // Get allowed and restricted procedures for this user
  const allowedProcedures = await getAllowedProcedures(userCredentials);
  const restrictedProcedures = await getRestrictedProcedures(userCredentials);

  // Extract CPT codes (procedures returned with snake_case from database)
  const allowedCPTCodes = allowedProcedures.map((p) => p.procedure_code);
  const restrictedCPTCodes = restrictedProcedures.map((p) => ({
    code: p.procedure_code,
    name: p.procedure_name,
    requiredCredentials: p.required_credentials,
  }));

  return (
    <BillingFormWithCredentials
      visitId={visitId}
      patientId={patientId}
      userCredentials={userCredentials}
      allowedCPTCodes={allowedCPTCodes}
      restrictedCPTCodes={restrictedCPTCodes}
      existingBilling={existingBilling}
    />
  );
}

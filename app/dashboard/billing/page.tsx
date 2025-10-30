import { getAllBilling } from "@/app/actions/billing";
import { getUserFacilities } from "@/app/actions/facilities";
import { BillingReportsClient } from "@/components/billing/billing-reports-client";

export default async function BillingReportsPage() {
  const [billingResult, facilities] = await Promise.all([
    getAllBilling(),
    getUserFacilities(),
  ]);

  if (!billingResult.success) {
    return (
      <div className="p-8">
        <h1 className="text-destructive text-2xl font-bold">
          Error Loading Billing Records
        </h1>
        <p className="text-muted-foreground mt-2">{billingResult.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Billing Reports</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          View and export billing records for insurance submissions
        </p>
      </div>

      <BillingReportsClient
        initialBillings={billingResult.billings}
        facilities={facilities}
      />
    </div>
  );
}

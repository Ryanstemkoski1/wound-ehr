"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Search,
  Filter,
  TrendingUp,
  Users,
  FileSignature,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSignatureAuditLogs,
  getSignatureAuditStats,
  exportSignatureAuditLogs,
  type SignatureAuditLog,
  type SignatureAuditStats,
  type SignatureAuditFilters,
} from "@/app/actions/signature-audit";
import { format } from "date-fns";

export function SignatureAuditClient() {
  const [logs, setLogs] = useState<SignatureAuditLog[]>([]);
  const [stats, setStats] = useState<SignatureAuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [filters, setFilters] = useState<SignatureAuditFilters>({
    limit: 50,
    offset: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Load data
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.signatureType,
    filters.startDate,
    filters.endDate,
    filters.limit,
    filters.offset,
  ]);

  async function loadData() {
    setLoading(true);

    try {
      // Fetch logs and stats in parallel
      const [logsResult, statsResult] = await Promise.all([
        getSignatureAuditLogs(filters),
        getSignatureAuditStats({
          tenantId: filters.tenantId,
          facilityId: filters.facilityId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }),
      ]);

      if (logsResult.error) {
        toast.error(logsResult.error);
        setLogs([]);
      } else {
        setLogs(logsResult.data || []);
      }

      if (statsResult.error) {
        toast.error(statsResult.error);
        setStats(null);
      } else {
        setStats(statsResult.data || null);
      }
    } catch (error) {
      console.error("Error loading audit logs:", error);
      toast.error("Failed to load audit logs");
      setLogs([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);

    const result = await exportSignatureAuditLogs(filters);

    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      // Create download link
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signature-audit-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Audit logs exported successfully");
    }

    setExporting(false);
  }

  function handleFilterChange(key: keyof SignatureAuditFilters, value: string | number | undefined) {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" || !value ? undefined : value,
      offset: 0, // Reset pagination
    }));
  }

  function clearFilters() {
    setFilters({ limit: 50, offset: 0 });
    setSearchTerm("");
  }

  // Client-side search filter
  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.patient_name.toLowerCase().includes(term) ||
      log.patient_mrn.toLowerCase().includes(term) ||
      log.signer_name.toLowerCase().includes(term) ||
      log.facility_name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Signatures
              </CardTitle>
              <FileSignature className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_signatures}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.consent_signatures} consent, {stats.patient_signatures}{" "}
                patient, {stats.provider_signatures} provider
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Visits Signed
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_visits_signed}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Complete visit documentation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unique Signers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unique_signers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active clinical staff
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Signature Methods
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.drawn_signatures}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.typed_signatures} typed, {stats.uploaded_signatures}{" "}
                uploaded
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Signature Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Signature Type</label>
              <Select
                value={filters.signatureType || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "signatureType",
                    value === "all" ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="consent">Consent</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate?.split('T')[0] || ""}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined)
                }
              />
            </div>

            {/* End Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate?.split('T')[0] || ""}
                onChange={(e) =>
                  handleFilterChange("endDate", e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined)
                }
              />
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Patient, MRN, signer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button variant="outline" size="sm" onClick={loadData}>
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Logs ({filteredLogs.length})</span>
            {loading && (
              <span className="text-sm text-muted-foreground">Loading...</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No signature logs found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Signer</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Visit</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.signature_id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {format(new Date(log.signed_at), "MMM d, yyyy")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(log.signed_at), "h:mm a")}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.signature_type === "consent"
                              ? "default"
                              : log.signature_type === "provider"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {log.signature_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.patient_name}</div>
                          <div className="text-sm text-muted-foreground">
                            MRN: {log.patient_mrn}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{log.facility_name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.signer_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {log.signer_credentials || log.signer_role || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.signature_method}</Badge>
                      </TableCell>
                      <TableCell>
                        {log.visit_date ? (
                          <div>
                            <div className="text-sm">
                              {format(new Date(log.visit_date), "MMM d")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.visit_type}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            N/A
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {log.ip_address || "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {filters.offset! + 1} to{" "}
                {Math.min(filters.offset! + filters.limit!, logs.length)} of{" "}
                {logs.length} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleFilterChange(
                      "offset",
                      Math.max(0, filters.offset! - filters.limit!)
                    )
                  }
                  disabled={filters.offset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleFilterChange(
                      "offset",
                      filters.offset! + filters.limit!
                    )
                  }
                  disabled={
                    filters.offset! + filters.limit! >= filteredLogs.length
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AuditLogViewer from "@/components/audit/AuditLogViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle } from "lucide-react";
import { BackButton } from "@/components/navigation/BackButton";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";

export default function AuditPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Check if user has audit permissions (admin or manager)
  const hasAuditPermissions =
    (session?.user as any)?.role === "admin" ||
    (session?.user as any)?.role === "manager";

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!hasAuditPermissions) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              You don't have permission to access audit logs. This feature is
              only available to administrators and managers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <BackButton fallbackPath="/dashboard" showText={true} />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
              </div>
              <Breadcrumb
                items={[
                  { label: "System", href: "/system" },
                  { label: "Audit Logs", href: "/audit" },
                ]}
              />
            </div>
          </div>
        </div>
        <p className="text-gray-600">
          Monitor all system activities and user actions for security and
          compliance.
        </p>
      </div>

      <AuditLogViewer />
    </div>
  );
}

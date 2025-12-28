'use client';

import { useSession } from '@/lib/auth-client';
import { SystemSettings } from '@/components/system/SystemSettings';

export default function SystemPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Access denied</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>
      <SystemSettings />
    </div>
  );
}
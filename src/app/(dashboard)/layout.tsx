"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { AuthGate } from "@/components/auth/AuthGate";
import { WorkspaceProvider } from "@/lib/workspaceContext";
import { WorkspaceSwitcher } from "@/components/shared/WorkspaceSwitcher";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AuthGate>
          <WorkspaceProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <div className="flex flex-1 justify-end">
                  <WorkspaceSwitcher />
                </div>
              </header>
              <main className="flex-1 p-4 md:p-6">{children}</main>
            </SidebarInset>
          </WorkspaceProvider>
        </AuthGate>
      </SidebarProvider>
    </TooltipProvider>
  );
}

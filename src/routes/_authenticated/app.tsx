import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

function AppShell() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 max-w-full overflow-x-hidden">
          <header className="flex h-12 sm:h-14 items-center justify-between border-b border-border px-2 sm:px-4 shrink-0 bg-background/95 backdrop-blur z-20">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="h-9 w-9 min-h-[40px] min-w-[40px] cursor-pointer" />
              <span className="text-sm font-semibold truncate sm:hidden">Coach Montanha</span>
            </div>
            <div className="flex items-center gap-2">
              <InstallAppButton size="sm" />
            </div>
          </header>
          <main className="flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden pb-12 sm:pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
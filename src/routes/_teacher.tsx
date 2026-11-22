import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/client/components/AppShell";
import { getViewer } from "@/serverFunctions/admin";

// Every page a teacher uses: signed-in members only.
export const Route = createFileRoute("/_teacher")({
  loader: () => getViewer(),
  staleTime: Infinity,
  component: TeacherLayout,
});

const LINK =
  "shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground";
const ACTIVE = { className: "text-foreground font-medium" };

function TeacherLayout() {
  const { admin } = Route.useLoaderData();
  return (
    <AppShell
      nav={
        <nav className="flex items-center gap-4">
          <Link to="/" className={LINK} activeProps={ACTIVE} activeOptions={{ exact: true }}>
            Classes
          </Link>
          <Link to="/plans" className={LINK} activeProps={ACTIVE}>
            Lesson plans
          </Link>
          <Link to="/worksheets" className={LINK} activeProps={ACTIVE}>
            Worksheets
          </Link>
          {admin ? (
            <Link to="/admin" className={LINK} activeProps={ACTIVE}>
              Admin
            </Link>
          ) : null}
        </nav>
      }
    >
      <Outlet />
    </AppShell>
  );
}

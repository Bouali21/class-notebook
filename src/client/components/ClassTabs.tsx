import { Link } from "@tanstack/react-router";
import { Button } from "@/client/components/ui/button";

const TABS = [
  { to: "/classes/$classId", label: "Roster" },
  { to: "/classes/$classId/attendance", label: "Attendance" },
  { to: "/classes/$classId/grades", label: "Gradebook" },
] as const;

export function ClassTabs({
  classId,
  active,
}: {
  classId: string;
  active: (typeof TABS)[number]["label"];
}) {
  return (
    <nav className="flex flex-wrap gap-2 print:hidden">
      {TABS.map((tab) => (
        <Button
          key={tab.to}
          size="sm"
          variant={tab.label === active ? "secondary" : "ghost"}
          nativeButton={false}
          render={<Link to={tab.to} params={{ classId }} />}
        >
          {tab.label}
        </Button>
      ))}
    </nav>
  );
}

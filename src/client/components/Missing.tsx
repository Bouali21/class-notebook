import { Link } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { Button } from "@/client/components/ui/button";

/** A record that doesn't exist, or isn't this teacher's. */
export function Missing() {
  return (
    <div data-testid="not-found">
      <EmptyState
        variant="plain"
        icon={SearchX}
        title="Not found"
        description="It may have been deleted."
        action={
          <Button nativeButton={false} render={<Link to="/" />}>
            Go to classes
          </Button>
        }
      />
    </div>
  );
}

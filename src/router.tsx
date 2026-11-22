import { createRouter } from "@tanstack/react-router";
import { EmptyState } from "@/client/components/EmptyState";
import { errorMessage } from "@/client/lib/errors";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: () => (
      <div className="p-10">
        <EmptyState kind="filtered" title="Page not found" />
      </div>
    ),
    defaultErrorComponent: ({ error }) => (
      <div className="p-10">
        <EmptyState kind="error" title="Something went wrong" description={errorMessage(error)} />
      </div>
    ),
  });
}

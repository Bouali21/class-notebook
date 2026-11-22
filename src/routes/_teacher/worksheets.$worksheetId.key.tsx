import { createFileRoute } from "@tanstack/react-router";
import { Missing } from "@/client/components/Missing";
import { WorksheetSheet } from "@/client/components/WorksheetSheet";
import { getWorksheet } from "@/serverFunctions/worksheets";

export const Route = createFileRoute("/_teacher/worksheets/$worksheetId/key")({
  loader: ({ params }) => getWorksheet({ data: { id: params.worksheetId } }),
  component: AnswerKeyPage,
});

function AnswerKeyPage() {
  const sheet = Route.useLoaderData();
  if (!sheet) return <Missing />;
  return <WorksheetSheet sheet={sheet} withAnswers={true} />;
}

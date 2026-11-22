import { createServerFn } from "@tanstack/react-start";
import * as worksheets from "@/server/worksheets";
import { idInput } from "@/server/classes";
import { teacherMiddleware } from "./middleware";

const byId = (data: unknown) => idInput.parse(data);

export const getWorksheets = createServerFn()
  .middleware([teacherMiddleware])
  .handler(({ context }) => worksheets.listWorksheets(context.user.id));

export const getWorksheet = createServerFn()
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    worksheets.getWorksheet(context.user.id, data.id),
  );

export const createWorksheet = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => worksheets.createWorksheetInput.parse(data))
  .handler(({ data, context }) =>
    worksheets.createWorksheet(context.user.id, data),
  );

export const saveWorksheet = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => worksheets.saveWorksheetInput.parse(data))
  .handler(({ data, context }) =>
    worksheets.saveWorksheet(context.user.id, data),
  );

export const setPublished = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => worksheets.publishInput.parse(data))
  .handler(({ data, context }) =>
    worksheets.setPublished(context.user.id, data),
  );

export const deleteWorksheet = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    worksheets.deleteWorksheet(context.user.id, data.id),
  );

export const getResults = createServerFn()
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    worksheets.worksheetResults(context.user.id, data.id),
  );

export const getSubmission = createServerFn()
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    worksheets.getSubmission(context.user.id, data.id),
  );

export const scoreSubmission = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => worksheets.scoreInput.parse(data))
  .handler(({ data, context }) =>
    worksheets.scoreSubmission(context.user.id, data),
  );

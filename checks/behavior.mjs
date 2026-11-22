// Main path of every frozen feature, against the packaged release.
import { startRuntime, expect } from "/home/user/oss-new/control/runtime/index.mjs";

const runtime = await startRuntime();
const json = (body) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
try {
  const teacher = await (await runtime.context("owner")).newPage();
  await teacher.goto("/");
  await runtime.assertBackLink(teacher);

  // F001: classes and roster
  await teacher.getByRole("button", { name: "New class" }).click();
  await teacher.getByLabel("Name").fill("Year 7 Science");
  await teacher.getByLabel("Subject").fill("Science");
  await teacher.getByLabel("Grade").fill("7");
  await teacher.getByLabel("School year").fill("2026-2027");
  await teacher.getByRole("button", { name: "Create class" }).click();
  await teacher.getByRole("link", { name: "Year 7 Science" }).click();
  await expect(teacher.getByRole("heading", { name: "Year 7 Science" })).toBeVisible();
  const classUrl = teacher.url();

  await teacher.getByRole("button", { name: "Add students" }).click();
  await teacher.getByLabel("Names").fill("Maya Okafor\nLeo Brandt\nPriya Nair\nSam Ortiz");
  await teacher.getByRole("button", { name: "Add", exact: true }).click();
  const rows = teacher.getByTestId("student-row");
  await expect(rows).toHaveCount(4);
  const row = (name) => rows.filter({ hasText: name });
  const mayaCode = (await row("Maya Okafor").getByTestId("access-code").innerText()).trim();
  expect(mayaCode).toMatch(/^[A-Z0-9]{6}$/);

  const leoOld = (await row("Leo Brandt").getByTestId("access-code").innerText()).trim();
  await teacher.getByRole("button", { name: "New code for Leo Brandt" }).click();
  await expect(row("Leo Brandt").getByTestId("access-code")).not.toHaveText(leoOld);

  await teacher.getByRole("button", { name: "Edit Priya Nair" }).click();
  await teacher.getByRole("dialog").getByLabel("Name").fill("Priya Nair-Shah");
  await teacher.getByRole("button", { name: "Save" }).click();
  await expect(row("Priya Nair-Shah")).toHaveCount(1);

  await teacher.getByRole("button", { name: "Remove Sam Ortiz" }).click();
  await teacher.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(rows).toHaveCount(3);

  await teacher.locator("a", { hasText: "Print codes" }).click();
  await expect(teacher.getByText(mayaCode)).toBeVisible();
  await expect(teacher.getByText("Maya Okafor")).toBeVisible();

  // F002: lesson plans
  await teacher.goto("/plans");
  await teacher.locator("a", { hasText: "New plan" }).click();
  await expect(teacher.getByRole("button", { name: "Draft with AI" })).toHaveCount(0);
  await teacher.getByLabel("Date", { exact: true }).fill("2026-11-23");
  await teacher.getByLabel("Class", { exact: true }).selectOption({ label: "Year 7 Science" });
  await teacher.getByLabel("Subject").fill("Science");
  await teacher.getByLabel("Topic").fill("States of matter");
  await teacher.getByLabel("Duration (minutes)").fill("50");
  await teacher.getByLabel("Learning objectives").fill("Describe solids, liquids and gases using the particle model.");
  await teacher.getByLabel("Teaching strategies").fill("Think-pair-share, demonstration with syringes.");
  await teacher.getByLabel("Warm-up minutes").fill("5");
  await teacher.getByLabel("Warm-up activity").fill("Sort pictures of everyday materials into three groups.");
  await teacher.getByLabel("Practice activity").fill("Model particles with counters in pairs.");
  await teacher.getByLabel("Materials").fill("Syringes, counters, ice cubes");
  await teacher.getByLabel("Assessment", { exact: true }).fill("Exit ticket: draw particles in each state.");
  await teacher.getByLabel("Notes").fill("Book the lab trolley.");
  await teacher.getByRole("button", { name: "Save plan" }).click();
  await expect(teacher).toHaveURL(/\/plans\/[0-9a-f-]{36}$/);
  const planUrl = teacher.url();

  await teacher.getByRole("button", { name: "Duplicate" }).click();
  await expect(teacher).not.toHaveURL(planUrl);
  await expect(teacher).toHaveURL(/\/plans\/[0-9a-f-]{36}$/);
  const copyPath = new URL(teacher.url()).pathname;
  await teacher.goto("/plans");
  await expect(teacher.getByTestId("plan-row").filter({ hasText: "States of matter" })).toHaveCount(2);
  await teacher.getByLabel("Filter by date").fill("2026-11-24");
  await expect(teacher.getByTestId("plan-row")).toHaveCount(0);
  await teacher.getByLabel("Filter by date").fill("2026-11-23");
  await expect(teacher.getByTestId("plan-row")).toHaveCount(2);
  await teacher.locator(`[data-testid="plan-row"] a[href="${copyPath}"]`).first().click();
  await expect(teacher).toHaveURL(new RegExp(copyPath + "$"));
  await teacher.getByRole("button", { name: "Delete" }).click();
  await teacher.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(teacher).toHaveURL(/\/plans$/);
  await expect(teacher.getByTestId("plan-row")).toHaveCount(1);

  await teacher.goto(planUrl + "/print");
  await expect(teacher.getByText("States of matter").first()).toBeVisible();
  await expect(teacher.getByText("Model particles with counters in pairs.")).toBeVisible();

  // F003: worksheets
  await teacher.goto("/worksheets");
  await teacher.getByRole("button", { name: "New worksheet" }).click();
  await teacher.getByLabel("Title").fill("Particles check");
  await teacher.getByLabel("Subject").fill("Science");
  await teacher.getByLabel("Level").selectOption("core");
  await teacher.getByRole("button", { name: "Create worksheet" }).click();
  await expect(teacher).toHaveURL(/\/worksheets\/[0-9a-f-]{36}$/);
  const worksheetUrl = teacher.url();
  const worksheetId = worksheetUrl.split("/").pop();
  await expect(teacher.getByRole("button", { name: "Draft with AI" })).toHaveCount(0);

  await teacher.getByRole("button", { name: "Add multiple choice" }).click();
  await teacher.getByLabel("Question 1", { exact: true }).fill("Which state of matter keeps a fixed shape?");
  await teacher.getByLabel("Question 1 choice 1").fill("Solid");
  await teacher.getByLabel("Question 1 choice 2").fill("Liquid");
  await teacher.getByRole("button", { name: "Add choice to question 1" }).click();
  await teacher.getByLabel("Question 1 choice 3").fill("Gas");
  await teacher.getByLabel("Correct choice for question 1").selectOption({ label: "Choice 1" });
  await teacher.getByLabel("Points for question 1").fill("2");
  await teacher.getByRole("button", { name: "Add short answer" }).click();
  await teacher.getByLabel("Question 2", { exact: true }).fill("What is it called when a gas turns into a liquid?");
  await teacher.getByLabel("Expected answer for question 2").fill("Condensation");
  await teacher.getByRole("button", { name: "Add open response" }).click();
  await teacher.getByLabel("Question 3", { exact: true }).fill("Explain why a gas can be squashed into a smaller space.");
  await teacher.getByLabel("Points for question 3").fill("3");
  await teacher.getByLabel("Assigned class").selectOption({ label: "Year 7 Science" });
  await teacher.getByRole("button", { name: "Save worksheet" }).click();
  await expect(teacher.getByText("Worksheet saved")).toBeVisible();
  await teacher.getByRole("button", { name: "Publish" }).click();
  await expect(teacher.getByTestId("worksheet-status")).toHaveText("Published");

  await teacher.goto(worksheetUrl + "/print");
  await expect(teacher.getByText("Which state of matter keeps a fixed shape?")).toBeVisible();
  await expect(teacher.getByText("Condensation")).toHaveCount(0);
  await teacher.goto(worksheetUrl + "/key");
  await expect(teacher.getByText("Condensation")).toBeVisible();

  // F004: a student answers with their code, no account
  const bad = await runtime.fetch("/api/student/session", json({ code: "ZZZZZZ" }));
  expect(bad.status).toBe(404);
  const session = await runtime.fetch("/api/student/session", json({ code: mayaCode }));
  expect(session.status).toBe(200);
  const sessionBody = await session.text();
  expect(sessionBody).toContain("Particles check");
  const sheet = await runtime.fetch("/api/student/worksheet", json({ code: mayaCode, worksheetId }));
  expect(sheet.status).toBe(200);
  expect(await sheet.text()).not.toContain("Condensation");

  const student = await (await runtime.context(null)).newPage();
  await student.goto("/student");
  await student.getByLabel("Access code").fill(mayaCode.toLowerCase());
  await student.getByRole("button", { name: "Continue" }).click();
  await student.getByRole("button", { name: /Particles check/ }).click();
  await student.getByRole("radio", { name: "Solid" }).click();
  await student.getByLabel("What is it called when a gas turns into a liquid?").fill("  condensation ");
  await student.getByLabel("Explain why a gas can be squashed into a smaller space.").fill("The particles have big gaps between them, so they can be pushed closer.");
  await student.getByRole("button", { name: "Submit answers" }).click();
  await expect(student.getByTestId("student-score")).toHaveText("3 / 6");

  const again = await runtime.fetch("/api/student/submit", json({ code: mayaCode, worksheetId, answers: {} }));
  expect(again.status).toBe(409);

  await teacher.goto(worksheetUrl + "/results");
  const subRow = teacher.getByTestId("submission-row").filter({ hasText: "Maya Okafor" });
  await expect(subRow).toContainText("3 / 6");
  await expect(teacher.getByTestId("not-submitted")).toContainText("Leo Brandt");
  await expect(teacher.getByTestId("not-submitted")).toContainText("Priya Nair-Shah");
  await subRow.getByRole("link", { name: "Maya Okafor" }).click();
  await expect(teacher.getByText("The particles have big gaps between them")).toBeVisible();
  await teacher.getByLabel("Score for question 3").fill("2");
  await teacher.getByRole("button", { name: "Save scores" }).click();
  await expect(teacher.getByTestId("submission-total")).toHaveText("5 / 6");

  // F005: attendance, participation and marks
  await teacher.goto(classUrl + "/attendance");
  await teacher.getByLabel("Date").fill("2026-11-23");
  await expect(teacher.getByTestId("attendance-table")).toHaveAttribute("data-date", "2026-11-23");
  const att = (name) => teacher.getByTestId("attendance-row").filter({ hasText: name });
  await att("Maya Okafor").getByRole("button", { name: "Present" }).click();
  await teacher.getByLabel("Participation for Maya Okafor").selectOption("3");
  await teacher.getByLabel("Note for Maya Okafor").fill("Great questions about particles");
  await att("Leo Brandt").getByRole("button", { name: "Absent" }).click();
  await att("Priya Nair-Shah").getByRole("button", { name: "Late" }).click();
  await teacher.getByRole("button", { name: "Save attendance" }).click();
  await expect(teacher.getByText("Attendance saved")).toBeVisible();
  await teacher.reload();
  await expect(teacher.getByTestId("attendance-table")).toHaveAttribute("data-date", "2026-11-23");
  await expect(att("Leo Brandt").getByRole("button", { name: "Absent" })).toHaveAttribute("aria-pressed", "true");
  await expect(teacher.getByLabel("Note for Maya Okafor")).toHaveValue("Great questions about particles");

  await teacher.goto(classUrl + "/grades");
  await teacher.getByRole("button", { name: "New assessment" }).click();
  await teacher.getByLabel("Title").fill("Unit 3 quiz");
  await teacher.getByLabel("Date").fill("2026-11-20");
  await teacher.getByLabel("Max score").fill("20");
  await teacher.getByRole("button", { name: "Create assessment" }).click();
  await teacher.getByRole("link", { name: "Unit 3 quiz" }).click();
  await teacher.getByLabel("Mark for Maya Okafor").fill("17");
  await teacher.getByLabel("Mark for Leo Brandt").fill("12");
  await teacher.getByRole("button", { name: "Save marks" }).click();
  await expect(teacher.getByText("Marks saved")).toBeVisible();
  await teacher.goto(classUrl + "/grades");
  const gradeRow = teacher.getByTestId("gradebook-row").filter({ hasText: "Maya Okafor" });
  await expect(gradeRow).toContainText("17/20");
  await expect(gradeRow).toContainText("5/6");

  await gradeRow.getByRole("link", { name: "Maya Okafor" }).click();
  await expect(teacher.getByTestId("attendance-rate")).toHaveText("100%");
  await expect(teacher.getByTestId("average-mark")).toHaveText("84%");
  await expect(teacher.getByText("Great questions about particles")).toBeVisible();
  const studentUrl = teacher.url();

  // F006: family results link with a PIN
  await expect(teacher.getByTestId("family-status")).toHaveText("Not shared");
  await teacher.getByRole("button", { name: "Share with family" }).click();
  const link = (await teacher.getByTestId("family-link").innerText()).trim();
  const pin = (await teacher.getByTestId("family-pin").innerText()).trim();
  expect(new URL(link).hostname).toBe(runtime.hostname);
  expect(pin).toMatch(/^\d{6}$/);
  await teacher.keyboard.press("Escape");

  const family = await (await runtime.context(null)).newPage();
  await family.goto(link);
  await family.getByLabel("PIN").fill(pin === "000000" ? "111111" : "000000");
  await family.getByRole("button", { name: "View results" }).click();
  await expect(family.getByRole("alert")).toBeVisible();
  await family.getByLabel("PIN").fill(pin);
  await family.getByRole("button", { name: "View results" }).click();
  const results = family.getByTestId("family-results");
  await expect(results).toContainText("Maya Okafor");
  await expect(results).toContainText("Unit 3 quiz");
  await expect(results).toContainText("17/20");
  await expect(results).toContainText("Particles check");
  await expect(results).toContainText("100%");

  await teacher.goto(studentUrl);
  await expect(teacher.getByTestId("family-status")).toContainText("Viewed");
  const token = new URL(link).pathname.split("/").pop();
  await teacher.getByRole("button", { name: "Revoke" }).click();
  await teacher.getByRole("button", { name: "Revoke", exact: true }).last().click();
  await expect(teacher.getByTestId("family-status")).toHaveText("Not shared");
  const revoked = await runtime.fetch(`/api/family/${token}`, json({ pin }));
  expect(revoked.status).toBe(404);

  // The class gradebook, with the day's work in it.
  await teacher.goto(classUrl + "/grades");
  await expect(gradeRow).toContainText("17/20");
  await runtime.screenshot(teacher);

  // Phone-sized smoke
  const phone = await (
    await runtime.context("owner", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  ).newPage();
  await phone.goto("/");
  await expect(phone.getByRole("heading", { name: "Classes" })).toBeVisible();
  await expect(phone.getByRole("link", { name: "Year 7 Science" })).toBeVisible();
  const phoneStudent = await (
    await runtime.context(null, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  ).newPage();
  await phoneStudent.goto("/student");
  await expect(phoneStudent.getByLabel("Access code")).toBeVisible();
  console.log("behavior: ok");
} finally {
  await runtime.close();
}

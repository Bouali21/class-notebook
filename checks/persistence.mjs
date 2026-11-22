// Records survive a restart of the Workers on the same storage.
import { startRuntime, expect } from "/home/user/oss-new/control/runtime/index.mjs";

const runtime = await startRuntime();
try {
  const page = await (await runtime.context("owner")).newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "New class" }).click();
  await page.getByLabel("Name").fill("Grade 5 Reading");
  await page.getByRole("button", { name: "Create class" }).click();
  await page.getByRole("link", { name: "Grade 5 Reading" }).click();
  await page.getByRole("button", { name: "Add students" }).click();
  await page.getByLabel("Names").fill("Noor Haddad");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const code = (await page.getByTestId("access-code").first().innerText()).trim();

  await page.goto("/plans/new");
  await page.getByLabel("Date", { exact: true }).fill("2026-12-01");
  await page.getByLabel("Topic").fill("Finding the main idea");
  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(page).toHaveURL(/\/plans\/[0-9a-f-]{36}$/);

  await runtime.restart();

  const again = await (await runtime.context("owner")).newPage();
  await again.goto("/");
  await again.getByRole("link", { name: "Grade 5 Reading" }).click();
  await expect(again.getByTestId("student-row").filter({ hasText: "Noor Haddad" })).toContainText(code);
  await again.goto("/plans");
  await expect(again.getByTestId("plan-row").filter({ hasText: "Finding the main idea" })).toHaveCount(1);
  console.log("persistence: ok");
} finally {
  await runtime.close();
}

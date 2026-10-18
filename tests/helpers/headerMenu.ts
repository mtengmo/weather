import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

/** Opens the header overflow menu (no-op if already open). */
export async function openMenu(user: UserEvent) {
  const trigger = await screen.findByRole("button", { name: /^(Menu|Meny)$/ });
  if (trigger.getAttribute("aria-expanded") !== "true") await user.click(trigger);
  return trigger;
}

/** Opens the header menu and activates the named item. */
export async function clickMenuItem(user: UserEvent, name: string | RegExp) {
  await openMenu(user);
  await user.click(await screen.findByRole("menuitem", { name }));
}

/** Opens the header menu, then its Settings panel. */
export async function openSettings(user: UserEvent) {
  await clickMenuItem(user, /^(Settings|Inställningar)$/);
}

/** Opens the header menu, returns the accessible names of its items, then closes it again. */
export async function menuItemNames(user: UserEvent): Promise<string[]> {
  await user.keyboard("{Escape}");
  await openMenu(user);
  const names = screen.getAllByRole("menuitem").map((el) => el.textContent ?? "");
  await user.keyboard("{Escape}");
  return names;
}

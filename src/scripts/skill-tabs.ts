export function initSkillTabs(root: ParentNode = document): void {
  const container = root.querySelector<HTMLElement>("[data-skill-tabs]");
  if (!container || container.dataset.tabsInit === "1") return;
  container.dataset.tabsInit = "1";

  const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(container.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  if (!tabs.length || tabs.length !== panels.length) return;

  const activate = (index: number) => {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.classList.toggle("is-active", selected);
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      const show = i === index;
      panel.hidden = !show;
      panel.classList.toggle("is-active", show);
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(index));
    tab.addEventListener("keydown", (event) => {
      let next = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = (index + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = tabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      activate(next);
      tabs[next]?.focus();
    });
  });
}

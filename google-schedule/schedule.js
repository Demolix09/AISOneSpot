const scheduleGroupButtons = document.querySelectorAll("[data-schedule-group]");
const scheduleSubgroups = document.querySelectorAll("[data-schedule-subgroup]");
const scheduleTitle = document.querySelector("[data-schedule-title]");

if (scheduleGroupButtons.length && scheduleSubgroups.length) {
  const setActiveGroup = (group) => {
    scheduleGroupButtons.forEach((button) => {
      const isSelected = button.getAttribute("data-schedule-group") === group;
      button.classList.toggle("is-active", isSelected);
    });

    scheduleSubgroups.forEach((subgroup) => {
      const isSelected = subgroup.getAttribute("data-schedule-subgroup") === group;
      subgroup.classList.toggle("is-active", isSelected);
    });

    const activeSubgroup = document.querySelector(
      `[data-schedule-subgroup="${group}"]`,
    );
    const activeSubfilter = activeSubgroup?.querySelector("[data-schedule-subfilter].is-active");
    const firstSubfilter = activeSubgroup?.querySelector("[data-schedule-subfilter]");
    const selectedButton = activeSubfilter || firstSubfilter;

    if (activeSubgroup && !activeSubfilter && firstSubfilter) {
      firstSubfilter.classList.add("is-active");
    }

    if (scheduleTitle && selectedButton) {
      const label = selectedButton.getAttribute("data-schedule-subfilter");
      scheduleTitle.textContent = `${label} Daily Schedule`;
    }
  };

  scheduleGroupButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.getAttribute("data-schedule-group");
      setActiveGroup(group);
    });
  });

  scheduleSubgroups.forEach((subgroup) => {
    const subfilterButtons = subgroup.querySelectorAll("[data-schedule-subfilter]");
    subfilterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        subfilterButtons.forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");

        if (scheduleTitle) {
          const label = button.getAttribute("data-schedule-subfilter");
          scheduleTitle.textContent = `${label} Daily Schedule`;
        }
      });
    });
  });

  setActiveGroup("early-childhood");
}

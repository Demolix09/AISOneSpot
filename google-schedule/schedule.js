const scheduleGroupButtons = document.querySelectorAll("[data-schedule-group]");
const scheduleSubgroups = document.querySelectorAll("[data-schedule-subgroup]");
const scheduleTitle = document.querySelector("[data-schedule-title]");
const scheduleCaption = document.querySelector("[data-schedule-caption]");
const scheduleImage = document.querySelector("[data-schedule-image]");

const DEFAULT_SCHEDULE_IMAGE = "../assets/schedule-coming-soon.svg";
const SCHEDULE_IMAGE_BY_FILTER = {
  "7th Grade": "../assets/schedules/7th-grade.png",
  "8th Grade": "../assets/schedules/8th-grade.png",
  "9th Grade": "../assets/schedules/9th-grade.png",
  "10th Grade": "../assets/schedules/10th-grade.png",
  "11th Grade": "../assets/schedules/11th-grade.png",
  Seniors: "../assets/schedules/12th-grade.png"
};

function updateSchedulePreview(label) {
  if (!label) {
    return;
  }

  const imageSrc = SCHEDULE_IMAGE_BY_FILTER[label] || DEFAULT_SCHEDULE_IMAGE;
  const hasDedicatedImage = Boolean(SCHEDULE_IMAGE_BY_FILTER[label]);

  if (scheduleTitle) {
    scheduleTitle.textContent = `${label} Daily Schedule`;
  }

  if (scheduleCaption) {
    scheduleCaption.textContent = hasDedicatedImage
      ? `Showing the current daily schedule for ${label}.`
      : `Daily schedule image preview. ${label} is currently marked as coming soon.`;
  }

  if (scheduleImage) {
    scheduleImage.src = imageSrc;
    scheduleImage.alt = hasDedicatedImage
      ? `${label} daily schedule`
      : `${label} daily schedule coming soon placeholder`;
  }
}

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
      updateSchedulePreview(label);
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

        const label = button.getAttribute("data-schedule-subfilter");
        updateSchedulePreview(label);
      });
    });
  });

  if (scheduleImage) {
    scheduleImage.addEventListener("error", () => {
      scheduleImage.src = DEFAULT_SCHEDULE_IMAGE;
      scheduleImage.alt = "Daily schedule coming soon placeholder";
      if (scheduleCaption) {
        scheduleCaption.textContent =
          "This schedule image is not uploaded yet. It is currently marked as coming soon.";
      }
    });
  }

  setActiveGroup("early-childhood");
}

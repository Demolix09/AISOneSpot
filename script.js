const menuButton = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("is-open", !expanded);
  });
}

const filterButtons = document.querySelectorAll("[data-filter]");
const announcementCards = document.querySelectorAll("[data-category]");

if (filterButtons.length && announcementCards.length) {
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.getAttribute("data-filter");

      filterButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");

      announcementCards.forEach((card) => {
        const category = card.getAttribute("data-category");
        const show = filter === "all" || category === filter;
        card.classList.toggle("is-hidden", !show);
      });
    });
  });
}

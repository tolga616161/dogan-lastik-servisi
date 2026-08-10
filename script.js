const year = document.getElementById("year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const items = document.querySelectorAll(".service-item, .why-grid article");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.18 }
  );

  items.forEach((el, i) => {
    el.style.setProperty("--i", String(i));
    io.observe(el);
  });
} else {
  items.forEach((el) => el.classList.add("is-in"));
}

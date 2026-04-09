(function () {
  const navWrap = document.querySelector("[data-nav-wrap]");
  const toggle = document.querySelector("[data-menu-toggle]");

  if (toggle && navWrap) {
    toggle.addEventListener("click", () => {
      navWrap.classList.toggle("is-open");
    });
  }

  const hero = document.querySelector("[data-hero]");
  if (!hero) {
    return;
  }

  const track = hero.querySelector("[data-hero-track]");
  const dots = Array.from(hero.querySelectorAll("[data-hero-dot]"));
  const slides = Array.from(hero.querySelectorAll(".hero-slide"));

  if (!track || slides.length <= 1) {
    return;
  }

  let index = 0;
  let timer = null;

  const render = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
    });
  };

  const next = () => {
    index = (index + 1) % slides.length;
    render();
  };

  const start = () => {
    timer = window.setInterval(next, 4500);
  };

  const stop = () => {
    if (timer) {
      window.clearInterval(timer);
    }
  };

  dots.forEach((dot, dotIndex) => {
    dot.addEventListener("click", () => {
      index = dotIndex;
      render();
      stop();
      start();
    });
  });

  hero.addEventListener("mouseenter", stop);
  hero.addEventListener("mouseleave", start);

  render();
  start();
})();

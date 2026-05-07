// Landing page micro-interactions
(function () {
  // Parallax glow on cards
  const cards = document.querySelectorAll('.module-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty('--mx', mx + '%');
      card.style.setProperty('--my', my + '%');
    });
  });

  // Reveal-on-scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.module-card, .about-tile, .team-card, .lp-section-head').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = `opacity 0.6s ease ${i * 30}ms, transform 0.6s cubic-bezier(.2,.7,.3,1) ${i * 30}ms`;
    io.observe(el);
  });
})();

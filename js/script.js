// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Scroll-reveal
const revealEls = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

// Theater curtains: scroll position sets a target parting amount, and a
// damped spring chases that target every frame rather than snapping to it
// instantly. While actively scrolling this just reads as responsive
// tracking, but the moment scrolling stops mid-motion, the curtain still
// has velocity, so it overshoots the target and settles with a couple of
// bounces — like real fabric would, instead of freezing rigidly in place.
// The fabric additionally skews as it opens, anchored at the top, so the
// hem sweeps out further and faster than the header — a flowing curve
// rather than a rigid rectangle sliding sideways.
const leftCurtain = document.querySelector('.theater-curtain-left');
const rightCurtain = document.querySelector('.theater-curtain-right');
const leftFabric = leftCurtain && leftCurtain.querySelector('.curtain-fabric');
const rightFabric = rightCurtain && rightCurtain.querySelector('.curtain-fabric');

if (leftCurtain && rightCurtain && leftFabric && rightFabric) {
  const SLIVER_PX = 26; // width left visible, gathered at the true edge, once fully parted
  const MAX_SKEW_DEG = 13; // how far the hem leads the header at full parting
  const MAX_HEM_CURVE = 34; // border-radius %, rounds the sweeping bottom corner

  // Underdamped spring: low enough damping ratio to visibly bounce a
  // couple of times before settling, but not so loose it wobbles forever.
  const STIFFNESS = 280;
  const DAMPING = 13;
  const REST_EPSILON = 0.0006;
  const MAX_DT = 1 / 30; // clamp huge frame gaps (tab switches, etc.)

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const partingRange = () => Math.min(window.innerHeight * 1.1, 900);
  const targetProgress = () => Math.min(Math.max(window.scrollY / partingRange(), 0), 1);

  let current = targetProgress();
  let velocity = 0;
  let lastTime = null;
  let rafId = null;

  const render = (progress) => {
    const width = leftCurtain.getBoundingClientRect().width;
    const travel = Math.max(width - SLIVER_PX, 0);
    const shapeProgress = Math.min(Math.max(progress, 0), 1);
    const offset = Math.round(travel * progress);
    const skew = (MAX_SKEW_DEG * shapeProgress).toFixed(2);
    const hemCurve = Math.round(MAX_HEM_CURVE * shapeProgress);

    leftCurtain.style.transform = `translateX(${-offset}px)`;
    rightCurtain.style.transform = `translateX(${offset}px)`;

    leftFabric.style.transform = `skewX(${-skew}deg)`;
    leftFabric.style.borderRadius = `0 0 ${hemCurve}% 0`;
    rightFabric.style.transform = `skewX(${skew}deg)`;
    rightFabric.style.borderRadius = `0 0 0 ${hemCurve}%`;
  };

  const step = (time) => {
    if (lastTime == null) lastTime = time;
    const dt = Math.min((time - lastTime) / 1000, MAX_DT);
    lastTime = time;

    const target = targetProgress();
    const displacement = current - target;
    const accel = -STIFFNESS * displacement - DAMPING * velocity;
    velocity += accel * dt;
    current += velocity * dt;

    render(current);

    if (Math.abs(velocity) > REST_EPSILON || Math.abs(current - target) > REST_EPSILON) {
      rafId = requestAnimationFrame(step);
    } else {
      current = target;
      velocity = 0;
      render(current);
      rafId = null;
      lastTime = null;
    }
  };

  const kick = () => {
    if (reduceMotion) {
      render(targetProgress());
      return;
    }
    if (rafId == null) {
      lastTime = null;
      rafId = requestAnimationFrame(step);
    }
  };

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  render(current);
}

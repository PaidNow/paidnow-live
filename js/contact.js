document.addEventListener('DOMContentLoaded', function () {
  var overlay = document.getElementById('contact');
  if (!overlay) return;

  document.querySelectorAll('[data-contact="open"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      overlay.classList.add('active');
    });
  });

  var closeBtn = overlay.querySelector('.cta-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      overlay.classList.remove('active');
    });
  }
});

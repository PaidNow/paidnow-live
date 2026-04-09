document.addEventListener('DOMContentLoaded', function () {
  var hamburger = document.querySelector('.hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', function () {
      this.classList.toggle('open');
      var menu = document.querySelector('.nav-menu');
      if (menu) menu.classList.toggle('nav-open');
    });
  }
});

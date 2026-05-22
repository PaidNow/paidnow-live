document.addEventListener('DOMContentLoaded', function () {
  // "Get Early Access" — scroll to waitlist input
  document.querySelectorAll('[data-action="scroll-waitlist"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.getElementById('hero-waitlist-email');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function () { target.focus(); }, 350);
      }
    });
  });

  // Hero waitlist form
  var heroForm = document.getElementById('hero-waitlist-form');
  if (heroForm) {
    var lastSubmit = 0;
    heroForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var now = Date.now();
      var msg = document.getElementById('hero-waitlist-msg');
      if (now - lastSubmit < 10000) {
        msg.style.color = '#c0392b';
        msg.textContent = 'Please wait a moment.';
        return;
      }
      lastSubmit = now;
      var btn = document.getElementById('hero-waitlist-btn');
      var emailVal = document.getElementById('hero-waitlist-email').value.trim();
      if (emailVal.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        msg.style.color = '#c0392b'; msg.textContent = 'Please enter a valid email.'; return;
      }
      btn.disabled = true; btn.textContent = 'Sending…';
      try {
        var res = await fetch('https://x1qmkbi32b.execute-api.af-south-1.amazonaws.com/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailVal })
        });
        msg.style.color = res.ok ? '#0E2A40' : '#c0392b';
        msg.textContent = res.ok ? "You're on the list - we'll be in touch." : 'Something went wrong. Try again.';
        if (res.ok) heroForm.reset();
      } catch (err) { msg.style.color = '#c0392b'; msg.textContent = 'Something went wrong. Try again.'; }
      btn.disabled = false; btn.textContent = 'Notify Me';
    });
  }
});

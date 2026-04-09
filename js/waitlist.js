document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('waitlist-form');
  if (!form) return;

  var lastSubmit = 0;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var hp = document.getElementById('waitlist-hp');
    if (hp && hp.value) return;
    var now = Date.now();
    var msg = document.getElementById('form-msg');
    if (now - lastSubmit < 10000) {
      msg.style.color = '#c0392b';
      msg.textContent = 'Please wait a moment before trying again.';
      return;
    }
    lastSubmit = now;
    var btn = document.getElementById('waitlist-btn');
    var email = document.getElementById('waitlist-email').value.trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.style.color = '#c0392b';
      msg.textContent = 'Please enter a valid email.';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      var res = await fetch('https://x1qmkbi32b.execute-api.af-south-1.amazonaws.com/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      msg.style.color = res.ok ? '#0E2A40' : '#c0392b';
      msg.textContent = res.ok
        ? "You're on the list. We'll notify you when we launch."
        : 'Something went wrong. Try again.';
      if (res.ok) form.reset();
    } catch (err) {
      msg.style.color = '#c0392b';
      msg.textContent = 'Something went wrong. Try again.';
    }
    btn.disabled = false;
    btn.textContent = 'Notify Me';
  });
});

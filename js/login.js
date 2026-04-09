document.addEventListener('DOMContentLoaded', function () {
  var API = 'https://82pvumiwgj.execute-api.af-south-1.amazonaws.com/v1';
  var session = null;
  var phone = '', email = '';

  // Toggle login panel
  document.querySelectorAll('[data-login="toggle"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      document.getElementById('login-panel').classList.toggle('login-open');
    });
  });

  // Close via overlay click
  var loginOverlay = document.querySelector('#login-panel .login-overlay');
  if (loginOverlay) {
    loginOverlay.addEventListener('click', function () {
      document.getElementById('login-panel').classList.remove('login-open');
    });
  }

  // Close via X button
  var loginClose = document.querySelector('.login-close');
  if (loginClose) {
    loginClose.addEventListener('click', function () {
      document.getElementById('login-panel').classList.remove('login-open');
    });
  }

  // Back button in OTP step
  var loginBack = document.querySelector('.login-back');
  if (loginBack) {
    loginBack.addEventListener('click', function () {
      document.getElementById('login-step-phone').style.display = '';
      document.getElementById('login-step-otp').style.display = 'none';
      document.getElementById('login-otp').value = '';
      document.getElementById('login-otp-error').textContent = '';
    });
  }

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

  // Login form — OTP flow
  var form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var otpStep = document.getElementById('login-step-otp');
      if (otpStep.style.display === 'none') {
        // Step 1: initiate OTP
        phone = document.getElementById('login-phone').value.trim().replace(/\s/g, '');
        email = document.getElementById('login-email').value.trim();
        var err = document.getElementById('login-error');
        var btn = document.getElementById('login-btn');
        if (!phone || !email) { err.textContent = 'Phone and email are required'; return; }
        err.textContent = '';
        btn.disabled = true; btn.textContent = 'Sending\u2026';
        try {
          var res = await fetch(API + '/auth/otp/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, email: email })
          });
          var data = await res.json();
          if (data.authenticated) {
            window.location.href = 'https://dashboard.paidnow.live#token='
              + encodeURIComponent(data.accessToken)
              + '&refresh=' + encodeURIComponent(data.refreshToken || '');
            return;
          }
          if (data.error) {
            err.textContent = data.error.message;
            btn.disabled = false; btn.textContent = 'Sign in \u2192';
            return;
          }
          session = data.session || null;
          document.getElementById('login-step-phone').style.display = 'none';
          otpStep.style.display = '';
          document.getElementById('login-phone-display').textContent =
            phone.replace(/(\+\d{2})(\d{2})(\d+)(\d{2})/, '$1 $2 *** $4');
          document.getElementById('login-otp').focus();
        } catch (ex) { err.textContent = 'Something went wrong. Try again.'; }
        btn.disabled = false; btn.textContent = 'Sign in \u2192';
      } else {
        // Step 2: verify OTP
        var otp = document.getElementById('login-otp').value.trim();
        var err2 = document.getElementById('login-otp-error');
        var btn2 = document.getElementById('login-otp-btn');
        if (otp.length !== 6) { err2.textContent = 'Enter the 6-digit code'; return; }
        err2.textContent = '';
        btn2.disabled = true; btn2.textContent = 'Verifying\u2026';
        try {
          var res2 = await fetch(API + '/auth/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, otp: otp, session: session })
          });
          var data2 = await res2.json();
          if (data2.error) {
            err2.textContent = data2.error.message;
            document.getElementById('login-otp').value = '';
            btn2.disabled = false; btn2.textContent = 'Verify \u2192';
            return;
          }
          // Pass tokens via URL hash (cleared immediately by dashboard on arrival)
          window.location.href = 'https://dashboard.paidnow.live#token='
            + encodeURIComponent(data2.accessToken)
            + '&refresh=' + encodeURIComponent(data2.refreshToken || '')
            + '&id=' + encodeURIComponent(data2.idToken || '');
        } catch (ex) { err2.textContent = 'Something went wrong. Try again.'; }
        btn2.disabled = false; btn2.textContent = 'Verify \u2192';
      }
    });
  }

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
      btn.disabled = true; btn.textContent = 'Sending\u2026';
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

document.addEventListener('DOMContentLoaded', function () {
  var API = 'https://82pvumiwgj.execute-api.af-south-1.amazonaws.com/v1';
  var DASHBOARD = 'https://dashboard.paidnow.live';
  var session = null;
  var phone = '', email = '';

  // Prefill phone + email from last successful login
  var savedPhone = localStorage.getItem('paidnow_phone');
  var savedEmail = localStorage.getItem('paidnow_email');
  if (savedPhone) { var ph = document.getElementById('login-phone'); if (ph) ph.value = savedPhone; }
  if (savedEmail) { var em = document.getElementById('login-email'); if (em) em.value = savedEmail; }

  // Relay auth tokens to an already-opened dashboard window via postMessage.
  // The dashboard must respond with { type: 'paidnow_ready' } once its listener is active,
  // then receive { type: 'paidnow_auth', accessToken, refreshToken, idToken } in response.
  function sendAuthToDashboard(dashWin, tokens) {
    var timer = null;
    function relay(e) {
      if (e.origin !== DASHBOARD) return;
      if (!e.data || e.data.type !== 'paidnow_ready') return;
      clearTimeout(timer);
      window.removeEventListener('message', relay);
      dashWin.postMessage({
        type: 'paidnow_auth',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || '',
        idToken: tokens.idToken || ''
      }, DASHBOARD);
    }
    window.addEventListener('message', relay);
    // Clean up listener if the dashboard never signals ready within 30 s
    timer = setTimeout(function () { window.removeEventListener('message', relay); }, 30000);
  }

  // Open the dashboard and relay tokens. If window.open is blocked by the browser,
  // render a manual link into errEl so the user can proceed.
  function openDashboard(tokens, errEl) {
    var dashWin = window.open(DASHBOARD, '_blank');
    if (dashWin) {
      sendAuthToDashboard(dashWin, tokens);
    } else {
      var link = document.createElement('a');
      link.href = DASHBOARD;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open your dashboard →';
      errEl.textContent = '';
      errEl.appendChild(link);
    }
  }

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
        btn.disabled = true; btn.textContent = 'Sending…';
        try {
          var res = await fetch(API + '/auth/otp/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, email: email })
          });
          var data = await res.json();
          if (data.authenticated) {
            openDashboard({ accessToken: data.accessToken, refreshToken: data.refreshToken }, err);
            return;
          }
          if (data.error) {
            err.textContent = data.error.message;
            btn.disabled = false; btn.textContent = 'Sign in →';
            return;
          }
          session = data.session || null;
          localStorage.setItem('paidnow_phone', phone);
          localStorage.setItem('paidnow_email', email);
          document.getElementById('login-step-phone').style.display = 'none';
          otpStep.style.display = '';
          document.getElementById('login-phone-display').textContent =
            phone.replace(/(\+\d{2})(\d{2})(\d+)(\d{2})/, '$1 $2 *** $4');
          document.getElementById('login-otp').focus();
        } catch (ex) { err.textContent = 'Something went wrong. Try again.'; }
        btn.disabled = false; btn.textContent = 'Sign in →';
      } else {
        // Step 2: verify OTP.
        // Open the dashboard window here, before the await, to retain the user-gesture
        // popup allowance. If verification fails we close it immediately.
        var otp = document.getElementById('login-otp').value.trim();
        var err2 = document.getElementById('login-otp-error');
        var btn2 = document.getElementById('login-otp-btn');
        if (otp.length !== 6) { err2.textContent = 'Enter the 6-digit code'; return; }
        err2.textContent = '';
        btn2.disabled = true; btn2.textContent = 'Verifying…';
        var dashWin = window.open(DASHBOARD, '_blank');
        try {
          var res2 = await fetch(API + '/auth/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, otp: otp, session: session })
          });
          var data2 = await res2.json();
          if (data2.error) {
            if (dashWin) dashWin.close();
            err2.textContent = data2.error.message;
            document.getElementById('login-otp').value = '';
            btn2.disabled = false; btn2.textContent = 'Verify →';
            return;
          }
          if (dashWin) {
            sendAuthToDashboard(dashWin, {
              accessToken: data2.accessToken,
              refreshToken: data2.refreshToken,
              idToken: data2.idToken
            });
          } else {
            // Popup was blocked — render a manual link
            var link = document.createElement('a');
            link.href = DASHBOARD;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Open your dashboard →';
            err2.textContent = '';
            err2.appendChild(link);
          }
        } catch (ex) {
          if (dashWin) dashWin.close();
          err2.textContent = 'Something went wrong. Try again.';
        }
        btn2.disabled = false; btn2.textContent = 'Verify →';
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

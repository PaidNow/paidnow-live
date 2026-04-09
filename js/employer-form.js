document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('employer-form');
  if (!form) return;

  var lastSubmit = 0;
  var freemails = ['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com',
                   'mail.com','aol.com','protonmail.com','zoho.com','yandex.com',
                   'live.com','msn.com'];

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (document.getElementById('emp-hp').value) return;
    var now = Date.now();
    var msg = document.getElementById('emp-msg');
    if (now - lastSubmit < 15000) {
      msg.style.color = '#c0392b';
      msg.textContent = 'Please wait a moment before trying again.';
      return;
    }
    lastSubmit = now;
    var name     = document.getElementById('emp-name').value.trim();
    var email    = document.getElementById('emp-email').value.trim().toLowerCase();
    var phone    = document.getElementById('emp-phone').value.trim().replace(/[^0-9+\- ]/g, '');
    var company  = document.getElementById('emp-company').value.trim();
    var industry = document.getElementById('emp-industry').value;
    var role     = document.getElementById('emp-role').value;
    var size     = document.getElementById('emp-size').value;
    var payroll  = document.getElementById('emp-payroll').value;
    var message  = document.getElementById('emp-message').value.trim();

    if (!name || !email || !company || !industry || !role || !size || !payroll) {
      msg.style.color = '#c0392b';
      msg.textContent = 'Please fill in all required fields.';
      return;
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.style.color = '#c0392b';
      msg.textContent = 'Please enter a valid email address.';
      return;
    }
    if (freemails.indexOf(email.split('@')[1]) !== -1) {
      msg.style.color = '#c0392b';
      msg.textContent = 'Please use your work email address.';
      return;
    }

    var btn = document.getElementById('emp-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      var params = new URLSearchParams(window.location.search);
      var utm = {
        source:   params.get('utm_source')   || '',
        medium:   params.get('utm_medium')   || '',
        campaign: params.get('utm_campaign') || ''
      };
      var res = await fetch('https://x1qmkbi32b.execute-api.af-south-1.amazonaws.com/employer-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, company, industry, role, size, payroll, message, utm })
      });
      if (res.ok) {
        msg.style.color = '#0E2A40';
        msg.textContent = "Thank you. We've saved your details and will reach out once we're live.";
        form.reset();
      } else {
        var d = await res.json().catch(function () { return {}; });
        msg.style.color = '#c0392b';
        msg.textContent = d.message || 'Something went wrong. Please try again.';
      }
    } catch (err) {
      msg.style.color = '#c0392b';
      msg.textContent = 'Something went wrong. Please try again.';
    }
    btn.disabled = false;
    btn.textContent = 'Register Interest';
  });
});

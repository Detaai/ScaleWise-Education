// ScaleWise Education — Shared Script

document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  // Highlight the current page link in the nav
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (link) {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });

  // Web3Forms submission handler — reused for the booking form and the review form
  function wireWeb3Form(formId, confirmationId, errorId) {
    var form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var confirmation = document.getElementById(confirmationId);
      var error = document.getElementById(errorId);
      var submitButton = form.querySelector('button[type="submit"]');

      if (error) error.hidden = true;
      if (confirmation) confirmation.hidden = true;
      if (submitButton) submitButton.disabled = true;

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          if (data.success) {
            if (confirmation) {
              confirmation.hidden = false;
              confirmation.scrollIntoView({ behavior: 'smooth' });
            }
            form.reset();
          } else if (error) {
            error.hidden = false;
            error.scrollIntoView({ behavior: 'smooth' });
          }
        })
        .catch(function () {
          if (error) {
            error.hidden = false;
            error.scrollIntoView({ behavior: 'smooth' });
          }
        })
        .finally(function () {
          if (submitButton) submitButton.disabled = false;
        });
    });
  }

  wireWeb3Form('booking-form', 'booking-confirmation', 'booking-error');
  wireWeb3Form('review-form', 'review-confirmation', 'review-error');
});

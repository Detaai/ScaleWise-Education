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

  // Booking/contact form — submits to Web3Forms via fetch so we can show an inline confirmation
  var bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var confirmation = document.getElementById('booking-confirmation');
      var error = document.getElementById('booking-error');
      var submitButton = bookingForm.querySelector('button[type="submit"]');

      if (error) error.hidden = true;
      if (confirmation) confirmation.hidden = true;
      if (submitButton) submitButton.disabled = true;

      fetch(bookingForm.action, {
        method: 'POST',
        body: new FormData(bookingForm),
        headers: { Accept: 'application/json' },
      })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          if (data.success) {
            if (confirmation) {
              confirmation.hidden = false;
              confirmation.scrollIntoView({ behavior: 'smooth' });
            }
            bookingForm.reset();
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
});

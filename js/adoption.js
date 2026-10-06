(function () {
  var animals = [];
  var list = document.getElementById('animal-list');
  var search = document.getElementById('animal-search');
  var speciesFilter = document.getElementById('species-filter');
  var sexFilter = document.getElementById('sex-filter');
  var enclosureFilter = document.getElementById('enclosure-filter');
  var sortSelect = document.getElementById('sort-animals');
  var animalSelect = document.getElementById('application-animal');

  function showView(view, focusApplication) {
    var pages = document.querySelectorAll('[data-adoption-page]');
    var tabs = document.querySelectorAll('[data-adoption-view][role="tab"]');
    pages.forEach(function (page) {
      page.hidden = page.dataset.adoptionPage !== view;
    });
    tabs.forEach(function (tab) {
      var selected = tab.dataset.adoptionView === view;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    if (focusApplication) {
      document.getElementById('apply').scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('applicant-name').focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function formatFee(value) {
    return Number(value) > 0
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value)
      : 'Contact us';
  }

  function addDetail(container, label, value) {
    if (!value) return;
    var row = document.createElement('div');
    var term = document.createElement('dt');
    var description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    container.appendChild(row);
  }

  function makeCard(animal) {
    var card = document.createElement('article');
    card.className = 'adoption-animal-card';

    var imageWrap = document.createElement('div');
    imageWrap.className = 'adoption-animal-image';
    if (animal.imagePath) {
      var image = document.createElement('img');
      image.src = animal.imagePath;
      image.alt = 'Photo of ' + animal.name;
      image.loading = 'lazy';
      imageWrap.appendChild(image);
    } else {
      imageWrap.textContent = 'Photo coming soon';
    }

    var content = document.createElement('div');
    content.className = 'adoption-animal-content';
    var title = document.createElement('h3');
    title.textContent = animal.name;
    var species = document.createElement('p');
    species.className = 'adoption-animal-species';
    species.textContent = [animal.species, animal.morph].filter(Boolean).join(' · ');
    var details = document.createElement('dl');
    details.className = 'adoption-animal-details';
    addDetail(details, 'Age', animal.age);
    addDetail(details, 'Sex', animal.sex);
    addDetail(details, 'Adoption fee', formatFee(animal.adoptionFee));
    addDetail(details, 'Minimum enclosure', animal.minimumEnclosure);
    addDetail(details, 'Diet', animal.diet);

    content.append(title, species, details);
    if (animal.description) {
      var description = document.createElement('p');
      description.className = 'adoption-animal-description';
      description.textContent = animal.description;
      content.appendChild(description);
    }
    var button = document.createElement('a');
    button.className = 'btn btn-primary';
    button.href = '#apply';
    button.textContent = 'Apply to adopt';
    button.addEventListener('click', function () {
      animalSelect.value = String(animal.id);
      showView('information', true);
    });

    content.appendChild(button);
    card.append(imageWrap, content);
    return card;
  }

  function addFilterOptions(select, values) {
    Array.from(new Set(values.filter(Boolean))).sort(function (a, b) {
      return a.localeCompare(b);
    }).forEach(function (value) {
      var option = document.createElement('option');
      option.value = value.toLowerCase();
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function renderAnimals() {
    var query = search.value.trim().toLowerCase();
    var species = speciesFilter.value;
    var sex = sexFilter.value;
    var enclosure = enclosureFilter.value;
    var filtered = animals.filter(function (animal) {
      var searchable = [animal.name, animal.species, animal.morph, animal.description].join(' ').toLowerCase();
      return (!query || searchable.indexOf(query) !== -1)
        && (!species || animal.species.toLowerCase() === species)
        && (!sex || (animal.sex || 'unknown').toLowerCase() === sex)
        && (!enclosure || (animal.minimumEnclosure || '').toLowerCase() === enclosure);
    });

    if (sortSelect.value === 'name') filtered.sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (sortSelect.value === 'species') filtered.sort(function (a, b) { return a.species.localeCompare(b.species) || a.name.localeCompare(b.name); });

    list.replaceChildren.apply(list, filtered.map(makeCard));
    document.getElementById('animal-count').textContent =
      filtered.length + (filtered.length === 1 ? ' animal available' : ' animals available');
    document.getElementById('animal-empty').hidden = animals.length !== 0;
    document.getElementById('animal-no-results').hidden = animals.length === 0 || filtered.length !== 0;
  }

  function setMessage(element, message, isError) {
    element.textContent = message;
    element.classList.toggle('adoption-message-error', Boolean(isError));
    element.hidden = !message;
  }

  function sendForm(form, endpoint, submitButton) {
    submitButton.disabled = true;
    return fetch(endpoint, { method: 'POST', body: new FormData(form) })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
          return data;
        });
      })
      .finally(function () {
        submitButton.disabled = false;
      });
  }

  fetch('/api/adoptions/animals')
    .then(function (response) {
      if (!response.ok) throw new Error('Animal listings could not be loaded.');
      return response.json();
    })
    .then(function (data) {
      animals = data.animals || [];
      addFilterOptions(speciesFilter, animals.map(function (animal) { return animal.species; }));
      addFilterOptions(enclosureFilter, animals.map(function (animal) { return animal.minimumEnclosure; }));
      animals.forEach(function (animal) {
        var option = document.createElement('option');
        option.value = String(animal.id);
        option.textContent = animal.name + ' — ' + animal.species;
        animalSelect.appendChild(option);
      });
      renderAnimals();
    })
    .catch(function (error) {
      console.error('Could not load adoption listings:', error);
      document.getElementById('animal-error').hidden = false;
      document.getElementById('animal-count').textContent = '';
    });

  [search, speciesFilter, sexFilter, enclosureFilter, sortSelect].forEach(function (control) {
    control.addEventListener('input', renderAnimals);
    control.addEventListener('change', renderAnimals);
  });

  document.querySelectorAll('[data-adoption-view]').forEach(function (control) {
    control.addEventListener('click', function () {
      showView(control.dataset.adoptionView, false);
    });
  });

  document.querySelectorAll('[role="tab"]').forEach(function (tab) {
    tab.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      var currentIndex = tabs.indexOf(tab);
      var direction = event.key === 'ArrowRight' ? 1 : -1;
      var next = tabs[(currentIndex + direction + tabs.length) % tabs.length];
      next.focus();
      showView(next.dataset.adoptionView, false);
    });
  });

  var initialView = window.location.hash === '#application-status'
    ? 'status'
    : window.location.hash === '#adoption-information' || window.location.hash === '#apply'
      ? 'information'
      : 'available';
  showView(initialView, false);

  document.getElementById('adoption-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    var submitButton = form.querySelector('button[type="submit"]');
    var message = document.getElementById('application-message-status');
    setMessage(message, 'Sending your application…', false);
    sendForm(form, '/api/adoptions/applications', submitButton)
      .then(function (data) {
        form.reset();
        document.getElementById('tracking-code-value').textContent = data.trackingCode;
        document.getElementById('application-code').hidden = false;
        setMessage(message, data.message, false);
        document.getElementById('application-code').scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function (error) {
        setMessage(message, error.message, true);
      });
  });

  document.getElementById('status-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    var submitButton = form.querySelector('button[type="submit"]');
    var message = document.getElementById('status-message');
    var result = document.getElementById('status-result');
    result.hidden = true;
    setMessage(message, 'Checking your application…', false);
    submitButton.disabled = true;
    fetch('/api/adoptions/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
          return data;
        });
      })
      .finally(function () {
        submitButton.disabled = false;
      })
      .then(function (data) {
        var labels = {
          received: 'Received',
          under_review: 'Under review',
          need_info: 'More information requested',
          approved: 'Approved',
          not_approved: 'Not approved',
          completed: 'Completed',
        };
        result.replaceChildren();
        var heading = document.createElement('h3');
        heading.textContent = 'Application status';
        var animal = document.createElement('p');
        animal.textContent = 'Animal: ' + data.application.animalName;
        var status = document.createElement('p');
        status.className = 'adoption-status-pill';
        status.textContent = labels[data.application.status] || 'Received';
        var updated = document.createElement('p');
        updated.className = 'adoption-muted';
        updated.textContent = 'Last updated: ' + new Date(data.application.updatedAt + 'Z').toLocaleString();
        result.append(heading, animal, status, updated);
        result.hidden = false;
        setMessage(message, '', false);
      })
      .catch(function (error) {
        setMessage(message, error.message, true);
      });
  });
})();

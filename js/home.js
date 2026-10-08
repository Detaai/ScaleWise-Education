(function () {
  var grid = document.getElementById('round-about');
  if (!grid) return;

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  }

  var slots = grid.querySelectorAll('.photo-placeholder');
  var rotateSeconds = parseFloat(grid.dataset.rotateSeconds) || 0;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  fetch(grid.dataset.manifest)
    .then(function (response) {
      if (!response.ok) throw new Error('Could not load the animal image manifest.');
      return response.json();
    })
    .then(function (manifest) {
      var animalImages = {};
      Object.keys(manifest.animals || {}).forEach(function (animal) {
        if (manifest.animals[animal].length) animalImages[animal] = manifest.animals[animal];
      });
      var animals = Object.keys(animalImages);
      if (!animals.length) return;
      var unused = {};
      var animalRound = [];
      var lastAnimal = null;

      function refill(exclude) {
        var anyLeft = false;
        animals.forEach(function (animal) {
          unused[animal] = shuffle(animalImages[animal].filter(function (src) {
            return exclude.indexOf(src) === -1;
          }));
          if (unused[animal].length) anyLeft = true;
        });
        if (!anyLeft && exclude.length) refill([]);
      }

      function buildAnimalRound() {
        animalRound = shuffle(animals.filter(function (animal) {
          return unused[animal].length > 0;
        }));
        if (animalRound.length > 1 && animalRound[0] === lastAnimal) {
          var swap = 1 + Math.floor(Math.random() * (animalRound.length - 1));
          animalRound[0] = animalRound[swap];
          animalRound[swap] = lastAnimal;
        }
      }

      refill([]);
      function showRound() {
        var selected = [];
        while (selected.length < slots.length) {
          if (!animalRound.length) buildAnimalRound();
          if (!animalRound.length) {
            refill(selected.map(function (pick) { return pick.src; }));
            continue;
          }
          var animal = animalRound.shift();
          selected.push({ animal: animal, src: unused[animal].pop() });
          lastAnimal = animal;
        }
        selected.forEach(function (pick, i) {
          var slot = slots[i];
          var img = slot.querySelector('img');
          if (!img) {
            img = document.createElement('img');
            slot.textContent = '';
            slot.classList.add('has-image');
            slot.appendChild(img);
          }
          img.src = encodeURI(pick.src);
          img.alt = 'Photo of ' + pick.animal + ', one of our program animals';
        });
      }
      showRound();
      if (rotateSeconds > 0 && !reduceMotion) {
        setInterval(function () {
          grid.classList.add('fading');
          setTimeout(function () {
            showRound();
            grid.classList.remove('fading');
          }, 600);
        }, rotateSeconds * 1000);
      }
    })
    .catch(function (error) {
      console.error('Home page roundabout failed:', error);
    });
})();

import json
import random
import re
from pathlib import Path


# ==================== SETTINGS ====================

# The main folder that contains "Animal 1", "Animal 2", "Animal 3", ...
ANIMALS_FOLDER = Path(__file__).parent / "round-about"

# The website's root folder (image paths in the manifest are relative to this).
SITE_ROOT = Path(__file__).parent.parent

# The file the website reads to know which images exist (browsers can't list folders).
MANIFEST_FILE = ANIMALS_FOLDER / "manifest.json"

# How many image slots you need filled.
NUMBER_OF_IMAGES = 4

# File types that count as images (compared in lowercase).
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

# Folder names must look like "Animal 1", "Animal 2", "animal 12", etc.
ANIMAL_FOLDER_PATTERN = re.compile(r"^animal\s+(\d+)$", re.IGNORECASE)


# ==================== IMAGE SELECTION ====================

def find_animal_folders(animals_folder):
    """Return a list of numbered animal folders, sorted by their number."""
    animals_folder = Path(animals_folder)

    if not animals_folder.is_dir():
        print(f"Animals folder not found: {animals_folder}")
        return []

    numbered_folders = []
    for item in animals_folder.iterdir():
        if item.is_dir():
            match = ANIMAL_FOLDER_PATTERN.match(item.name)
            if match:
                animal_number = int(match.group(1))
                numbered_folders.append((animal_number, item))

    # Sort by number so "Animal 10" comes after "Animal 9" (not after "Animal 1").
    numbered_folders.sort()
    return [folder for _, folder in numbered_folders]


def find_images_in_folder(folder):
    """Return every image file directly inside a folder (non-images are ignored)."""
    return [
        file
        for file in folder.iterdir()
        if file.is_file() and file.suffix.lower() in IMAGE_EXTENSIONS
    ]


def load_animal_images(animals_folder):
    """
    Build a dictionary like:
        {"Animal 1": [path1, path2], "Animal 2": [path3], ...}
    Animal folders with no images are skipped.
    """
    animal_images = {}
    for folder in find_animal_folders(animals_folder):
        images = find_images_in_folder(folder)
        if images:
            animal_images[folder.name] = images
        else:
            print(f"Skipping '{folder.name}' (no images found).")
    return animal_images


def refill_unused_images(animal_images):
    """Give every animal a fresh, randomly shuffled list of its images."""
    unused = {}
    for animal, images in animal_images.items():
        shuffled = list(images)
        random.shuffle(shuffled)
        unused[animal] = shuffled
    return unused


def build_animal_round(unused_images, last_animal):
    """
    Make a new randomly shuffled "round" of animals that still have unused images.
    Every animal in the round is used once before a new round starts, which
    keeps animal variety as high as possible.
    """
    round_of_animals = [animal for animal, images in unused_images.items() if images]
    random.shuffle(round_of_animals)

    # Avoid picking the same animal twice in a row across two rounds (if possible).
    if len(round_of_animals) > 1 and round_of_animals[0] == last_animal:
        swap_index = random.randint(1, len(round_of_animals) - 1)
        round_of_animals[0], round_of_animals[swap_index] = (
            round_of_animals[swap_index],
            round_of_animals[0],
        )

    return round_of_animals


def select_random_animal_images(number_of_images, animals_folder=ANIMALS_FOLDER):
    """
    Pick `number_of_images` image paths using this priority:
        1. Maximum animal variety (use every animal before reusing any).
        2. Maximum image variety (never repeat an image until ALL images are used).
        3. Random order everywhere.
    Returns a list of image paths (as strings).
    """
    if number_of_images <= 0:
        return []

    animal_images = load_animal_images(animals_folder)

    if not animal_images:
        print("No animal folders with images were found. Nothing to select.")
        return []

    total_unique_images = sum(len(images) for images in animal_images.values())

    if len(animal_images) < number_of_images:
        print(
            f"Note: {number_of_images} slots requested but only "
            f"{len(animal_images)} animal(s) available, so animals will be reused."
        )

    if number_of_images > total_unique_images:
        print(
            f"Note: {number_of_images} slots requested but only "
            f"{total_unique_images} unique image(s) exist. Duplicate images are "
            f"unavoidable, so images will be reused randomly once all are used."
        )

    # Each animal's images that have NOT been picked yet (already shuffled).
    unused_images = refill_unused_images(animal_images)

    selected_images = []
    current_round = []
    last_animal = None

    while len(selected_images) < number_of_images:
        # Start a new round of animals when the current one is used up.
        if not current_round:
            current_round = build_animal_round(unused_images, last_animal)

        # Every single image has been used: put all animals/images back in the pool.
        if not current_round:
            unused_images = refill_unused_images(animal_images)
            continue

        animal = current_round.pop(0)

        # Take one of this animal's remaining unused images (list is pre-shuffled).
        image = unused_images[animal].pop()
        selected_images.append(str(image))
        last_animal = animal

    return selected_images


# ==================== WEBSITE MANIFEST ====================

def write_manifest(animals_folder=ANIMALS_FOLDER, manifest_file=MANIFEST_FILE):
    """Save every animal's image list to a JSON file the website's roundabout reads."""
    animal_images = load_animal_images(animals_folder)

    manifest = {
        "animals": {
            animal: [image.relative_to(SITE_ROOT).as_posix() for image in sorted(images)]
            for animal, images in animal_images.items()
        }
    }

    Path(manifest_file).write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    total = sum(len(images) for images in animal_images.values())
    print(f"Wrote {manifest_file} ({len(animal_images)} animal(s), {total} image(s)).")


# ==================== MAIN PROGRAM ====================

if __name__ == "__main__":
    write_manifest()

    # Preview of what one round of the roundabout could look like.
    selected_images = select_random_animal_images(NUMBER_OF_IMAGES)

    for slot_number, image in enumerate(selected_images, start=1):
        print(f"Image slot {slot_number} -> {image}")

"""
Unit tests for the heuristics in scripts/import_recipes.py.

Run:  python scripts/test_import_recipes.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from import_recipes import looks_like_instruction, split_dumped_instructions


# Lines that SHOULD be classified as instructions.
INSTRUCTIONS_TRUE = [
    # massaman protein notes
    "You have options for added protein or you can just stick with vegetables.",
    "To keep it vegan-friendly, follow the link above to make Crispy Peanut Tofu.",
    "Alternatively, add meat such as shrimp or chicken to the curry once it's simmering (during step 4) and simmer until cooked completely through.",
    # massaman cooking steps
    "Heat a large pot or dutch oven (we like this one) over medium heat. Once hot, add oil (or water) and shallot. Sauté 2 minutes, stirring frequently.",
    "Add whole cumin and coriander seeds (or powder) and sauté for another 1-2 minutes, stirring frequently.",
    "Add potatoes and carrots and stir to coat. Cook for 2 minutes.",
    "Once it reaches a low boil, reduce heat to a simmer and cook for 10-15 minutes uncovered.",
    "Stir and cook a few minutes more.",
    "To serve, divide between serving bowls and enjoy as is or with a side of rice.",
    # coconut-chia
    "In a small bowl, whisk together coconut milk, water, chia seeds, and maple syrup until well mixed.",
    "Cover and refrigerate until a gel-like mixture has formed, at least 2 hours.",
    # greek-salad / tzatziki / pesto
    "Whisk all together",
    "Blend all together",
    # very long sentence with no measurement
    "Or, to keep this a 1-pot recipe, simply add (pressed) cubed extra-firm tofu to the curry in the last 10 minutes of cooking or sauté pressed tofu in a little oil and season with salt, pepper, and curry powder before cooking the curry.",
]

# Lines that SHOULD NOT be classified as instructions. Most are real
# ingredients that lost their leading digit ("1 Tbsp" → "Tbsp") from the
# old parser bug, plus a few short ingredient-section headers.
INSTRUCTIONS_FALSE = [
    # Section headers (already-marked)
    "## Curry",
    "## Protein options (optional)",
    # Short labels
    "CURRY",
    "PROTEIN OPTIONS optional",
    # Real ingredients (most with digit-prefix, some with stripped quantities)
    "1/2 lb. shrimp (seafood option — wild caught when possible)",
    "1 large skinless chicken breast, cubed",
    "1 Tbsp coconut or avocado oil",
    "Tbsp coconut or avocado oil (if avoiding oil, sub water and add more as needed)",
    "2 medium shallots, thinly sliced (or sub 1 small onion)",
    "1 tsp whole cumin seed (or sub powder)",
    "14-oz. cans light fat coconut milk",
    "1/4 tsp ground cinnamon",
    "dash each cardamom and nutmeg (if you don't have, omit)",
    "Optional tumeric, ginger, garlic or onion powder to taste",
    "Or a pack of frozen mushrooms",
    "Add-ins (chicken, black beans, avocado, veggies)",
    "Any toppings (fruit, chopped nut, coconut, chia seeds, flaxseed, hemp seeds)",
    "About a tsp each of Italian seasoning, garlic powder, onion powder, black pepper",
    "Handful of fresh parsley, roughly chopped",
    "Tbsp fresh lemon juice, from one lemon",
    "Brown rice noodles (I use half of an 8oz bag, Wegmans brand)",
    "Almond milk, about a cup and a half (or until consistency desired)",
    "Pickled or plain cut red onion",
    "Potatoes (red or gold are good)",
    "Freshly ground black pepper, to taste",
    "Farro, quinoa, or brown rice, cooked",
    "Any add-ins, as desired (can make homemade jam)",
    "Tbsp melted coconut oil or butter",
    "A few twists of ground black pepper",
    "About ¼ tsp each of garlic powder and onion powder",
    "Trader Joe's grilled peppers and onions bag",
    "Parsley, optional (preferred if no curry leaves)",
    "Pinch of salt, black pepper, and crushed red pepper flakes",
    "Dash of cinnamon if you'd like",
    "About 4-5 zucchini, cut into strips",
]


def test_looks_like_instruction():
    failures = []
    for line in INSTRUCTIONS_TRUE:
        if not looks_like_instruction(line):
            failures.append(("FALSE NEGATIVE", line))
    for line in INSTRUCTIONS_FALSE:
        if looks_like_instruction(line):
            failures.append(("FALSE POSITIVE", line))

    if failures:
        print(f"{len(failures)} failures:")
        for kind, line in failures:
            print(f"  [{kind}] {line[:100]}")
        return False

    print(f"looks_like_instruction: "
          f"{len(INSTRUCTIONS_TRUE)} positives + "
          f"{len(INSTRUCTIONS_FALSE)} negatives all correct")
    return True


def test_split_massaman():
    """The full massaman ingredients[] array (as the import would have
    produced it, with proper digit prefixes restored) should split at the
    'You have options for added protein...' line, giving 20 ingredients
    and 12 instructions."""
    massaman_mixed = [
        "PROTEIN OPTIONS optional",
        "1 batch Crispy Baked Peanut Tofu (vegan-option)",
        "1/2 lb. shrimp (seafood option — wild caught when possible)",
        "1 large skinless chicken breast, cubed (meat option — free-range, local, organic when possible)",
        "CURRY",
        "1 Tbsp coconut or avocado oil (if avoiding oil, sub water and add more as needed)",
        "2 medium shallots, thinly sliced (or sub 1 small onion)",
        "1 tsp whole cumin seed (or sub powder)",
        "1 tsp whole coriander seed (or sub powder)",
        "1 Tbsp red curry paste (we love Thai Kitchen brand)",
        "1 ½ cups baby potatoes cut into bite-size pieces",
        "2 large carrots, peeled and diced 1/4-inch thick",
        "2 14-oz. cans light fat coconut milk",
        "1 ½ cups water",
        "1/4 tsp ground cinnamon",
        "dash each cardamom and nutmeg (if you don't have, omit)",
        "1 Tbsp coconut aminos",
        "1 Tbsp maple syrup or coconut sugar",
        "1 Tbsp peanut butter",
        "1 Tbsp lime juice (or lemon)",
        "You have options for added protein or you can just stick with vegetables.",
        "To keep it vegan-friendly, follow the link above to make Crispy Peanut Tofu.",
        "Or, to keep this a 1-pot recipe, simply add (pressed) cubed extra-firm tofu to the curry in the last 10 minutes of cooking.",
        "Alternatively, add meat such as shrimp or chicken to the curry once it's simmering.",
        "Heat a large pot or dutch oven over medium heat. Once hot, add oil and shallot. Sauté 2 minutes.",
        "Add whole cumin and coriander seeds and sauté for 1-2 minutes.",
        "Add potatoes and carrots and stir to coat. Cook for 2 minutes.",
        "The liquid should cover all of the ingredients — if it does not, add a bit more coconut milk or water.",
        "Once it reaches a low boil, reduce heat to a simmer and cook for 10-15 minutes uncovered.",
        "Add lime in the last few minutes of cooking and stir.",
        "Stir and cook a few minutes more. Then turn off heat and let stand for at least 5 minutes.",
        "To serve, divide between serving bowls and enjoy.",
    ]
    real, recovered = split_dumped_instructions(massaman_mixed)
    if len(real) != 20:
        print(f"FAIL split_massaman: expected 20 ingredients, got {len(real)}")
        print(f"  first 'instruction' was: {recovered[0] if recovered else '(none)'}")
        return False
    if len(recovered) != 12:
        print(f"FAIL split_massaman: expected 12 instructions, got {len(recovered)}")
        return False
    print(f"split_massaman: 20 ingredients + 12 instructions OK")
    return True


def test_split_pesto():
    """Pesto has 5 ingredients then 'Blend all together' — 3-word
    instruction. Should still split correctly."""
    pesto_mixed = [
        "2 cups carrot top greens, or other greens (remove tough stems)",
        "1 Tbsp fresh lemon juice, from one lemon",
        "2 cloves garlic",
        "About ½ cup walnuts",
        "About ½ tsp kosher salt",
        "Blend all together",
    ]
    real, recovered = split_dumped_instructions(pesto_mixed)
    if len(real) != 5 or len(recovered) != 1:
        print(f"FAIL split_pesto: got {len(real)} ingredients + {len(recovered)} instructions")
        return False
    print(f"split_pesto: 5 + 1 OK")
    return True


def test_split_no_instructions():
    """A pure-ingredient list with no instruction text should not split."""
    plain = [
        "1 cup flour",
        "2 large eggs",
        "1/2 tsp salt",
        "Pinch of pepper",
    ]
    real, recovered = split_dumped_instructions(plain)
    if recovered:
        print(f"FAIL split_no_instructions: unexpectedly split out {recovered}")
        return False
    print(f"split_no_instructions: no false split OK")
    return True


if __name__ == "__main__":
    tests = [
        test_looks_like_instruction,
        test_split_massaman,
        test_split_pesto,
        test_split_no_instructions,
    ]
    failed = sum(1 for t in tests if not t())
    print()
    if failed:
        print(f"{failed} test(s) FAILED")
        sys.exit(1)
    print(f"All {len(tests)} tests passed")

export const ALLERGY_GROUPS = [
  { label: 'Fruits',        items: ['Apple', 'Avocado', 'Banana', 'Cherry', 'Coconut', 'Kiwi', 'Mango', 'Peach', 'Pear', 'Strawberry'] },
  { label: 'Grains',        items: ['Barley', 'Buckwheat', 'Maize', 'Oat', 'Rye', 'Wheat'] },
  { label: 'Legumes',       items: ['Chickpea', 'Lentil', 'Pea', 'Peanut', 'Soy'] },
  { label: 'Nuts & seeds',  items: ['Almond', 'Brazil nut', 'Cashew', 'Hazelnut', 'Pecan', 'Pistachio', 'Sesame', 'Sunflower seed', 'Walnut'] },
  { label: 'Spices',        items: ['Mustard'] },
  { label: 'Vegetables',    items: ['Celery', 'Garlic', 'Onion', 'Potato', 'Tomato'] },
  { label: 'Egg',           items: ['Egg'] },
  { label: 'Fish & seafood', items: ['Cod', 'Crab', 'Lobster', 'Mackerel', 'Salmon', 'Shrimp', 'Squid', 'Tuna'] },
  { label: 'Meat',          items: ['Beef', 'Chicken', 'Lamb', 'Pork', 'Turkey'] },
  { label: 'Milk',          items: ["Cow's milk", "Goat's milk"] },
];

export const COMMON_INTOLERANCES = ['Lactose', 'Gluten', 'Fructose', 'Histamine', 'Sulphites'];

export const ALL_ALLERGENS = ALLERGY_GROUPS.flatMap(g => g.items);

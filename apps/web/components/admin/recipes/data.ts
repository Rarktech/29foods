// Ported verbatim from AdminRecipesWebDark.dc.html's Component class.
export interface RecipeLine {
  name: string;
  qty: string;
  cost: number;
}
export interface Recipe {
  id: string;
  name: string;
  price: string;
  documented: boolean;
  yield: number;
  prep: string;
  cook: string;
  lines: RecipeLine[];
  steps: string[];
  notes: string;
}

const rate = {
  rice: 900,
  chicken: 3200,
  pepper: 1800,
  tomatoes: 12000,
  oil: 1100,
  garlic: 2400,
  assortedMeat: 4500,
  peas: 2100,
};

export const RECIPES: Recipe[] = [
  {
    id: "jollof", name: "Party Jollof", price: "₦2,900", documented: true, yield: 20, prep: "35 min", cook: "1 hr 05 min",
    lines: [
      { name: "Rice (bag, 50kg)", qty: "6 kg (0.12 bag)", cost: 6 * rate.rice },
      { name: "Tomatoes (crate)", qty: "1/4 crate", cost: 0.25 * rate.tomatoes },
      { name: "Fresh pepper (kg)", qty: "1.2 kg", cost: 1.2 * rate.pepper },
      { name: "Vegetable oil (25L)", qty: "2.5 L", cost: 2.5 * rate.oil },
      { name: "Garlic (kg)", qty: "0.15 kg", cost: 0.15 * rate.garlic },
      { name: "Onions, stock cubes, curry, thyme, bay (allowance)", qty: "per batch", cost: 2400 },
    ],
    steps: [
      "Rinse the parboiled rice in cool water until the water runs clear, then drain it properly in a sieve for 10 minutes. Wet rice will steam instead of frying and the grains will clump.",
      "Blend the tomatoes, fresh pepper, garlic and half the onions into a thick paste. Add no water — the paste should hold its shape on a spoon.",
      "Heat the vegetable oil in the big pot over medium heat, add the remaining sliced onions and the bay leaves, and fry 2 minutes until fragrant.",
      "Pour in the blended paste and fry 20–25 minutes, stirring every few minutes, until the oil separates and floats clear on top. This is the step that makes it party jollof — do not cut it short.",
      "Stir in the curry, thyme, crushed stock cubes and salt, and fry 5 minutes more so the spices bloom in the oil.",
      "Add 7 litres of chicken stock and bring to a rolling boil. Taste and correct the salt NOW — once the rice goes in you cannot fix it.",
      "Add the drained rice, stir once to level it, cover the pot with foil and then the lid, and drop the heat to low.",
      "Cook 30 minutes without opening the pot. Then stir from the bottom upward, cover again, and give it 10–15 minutes more until the grains are tender and separate.",
      "Take the lid off, raise the heat for 2 minutes to catch a light smoky base at the bottom, kill the heat and let it rest 10 minutes before you portion it.",
    ],
    notes: "Finished grains should stand apart, never mushy — if it looks wet at step 8, leave the lid off for the last 5 minutes. Colour should be deep orange-red, not pale: that comes from frying the paste long enough, not from adding more tomato purée. Portion with the 350ml scoop, levelled, so 20 portions come out of one pot every time.",
  },
  {
    id: "native", name: "Native Jollof", price: "₦2,600", documented: true, yield: 18, prep: "30 min", cook: "55 min",
    lines: [
      { name: "Rice (bag, 50kg)", qty: "5 kg (0.1 bag)", cost: 5 * rate.rice },
      { name: "Fresh pepper (kg)", qty: "1 kg", cost: 1 * rate.pepper },
      { name: "Garden peas (kg)", qty: "0.6 kg", cost: 0.6 * rate.peas },
      { name: "Tomatoes (crate)", qty: "1/8 crate", cost: 0.125 * rate.tomatoes },
      { name: "Vegetable oil (25L)", qty: "1.5 L", cost: 1.5 * rate.oil },
      { name: "Palm oil, iru, dried fish, crayfish, scent leaf (allowance)", qty: "per batch", cost: 3600 },
    ],
    steps: [
      "Soak the dried fish in hot water for 10 minutes, then flake it off the bone and pick out every bone. Keep the soaking water — it is the base of the stock.",
      "Parboil the rice for 8 minutes only, then drain and rinse. Native jollof finishes in the pot, so do not soften it here.",
      "Heat the palm oil gently until it just loosens — never until it smokes or bleaches, or the dish will taste burnt.",
      "Fry the sliced onions and the locust beans (iru) for 3 minutes until you can smell the iru, then add the blended pepper and tomato and fry 12 minutes.",
      "Add the crayfish, the flaked fish and the fish stock, and let it simmer 5 minutes so the smoky flavour goes into the sauce.",
      "Add the parboiled rice and just enough stock to sit level with the rice — this dish should never swim.",
      "Cover and cook on low for 25 minutes, stirring once at the halfway mark with a wooden spatula so the bottom does not catch.",
      "Stir in the garden peas, cover, and give it 5 more minutes.",
      "Kill the heat, scatter the shredded scent leaf over the top, put the lid back on and let the residual heat wilt it for 5 minutes before serving.",
    ],
    notes: "Native jollof should be darker and softer than party jollof, with visible flecks of fish and scent leaf — that contrast is what customers are paying for. If the iru smell is too strong at step 4, it was fried too long; pull it earlier next batch. Never add scent leaf over live heat, it goes black and bitter.",
  },
  {
    id: "ofada", name: "Ofada Special", price: "₦3,200", documented: true, yield: 16, prep: "45 min", cook: "1 hr 20 min",
    lines: [
      { name: "Rice (bag, 50kg)", qty: "4.5 kg ofada (0.09 bag)", cost: 4.5 * rate.rice },
      { name: "Assorted meat (kg)", qty: "1.8 kg", cost: 1.8 * rate.assortedMeat },
      { name: "Fresh pepper (kg)", qty: "1.3 kg", cost: 1.3 * rate.pepper },
      { name: "Vegetable oil (25L)", qty: "1 L", cost: 1 * rate.oil },
      { name: "Palm oil, iru, boiled eggs, stock cubes (allowance)", qty: "per batch", cost: 3400 },
    ],
    steps: [
      "Wash the ofada rice three times, rubbing between your palms, until the water is nearly clear — this is what removes the strong stone-like smell.",
      "Boil the assorted meat with onion, salt and two stock cubes for 40 minutes until tender. Keep every drop of that stock.",
      "Roast the red bell pepper, habanero and onions, then blend them coarse — ayamase should have texture, not be smooth like a party stew.",
      "Boil the blended pepper mix down in an open pot for 20 minutes until most of the water is gone, or the stew will be watery and split later.",
      "Bleach the palm oil over medium heat for 8–10 minutes until it turns pale and stops smoking heavily. Do this with the extractor on and the door open.",
      "Add the sliced onions and iru to the bleached oil, fry 3 minutes, then add the reduced pepper and fry 20 minutes until the oil rises to the top.",
      "Add the boiled assorted meat and 500ml of the meat stock, then simmer 10 minutes so the meat takes the sauce.",
      "While the stew simmers, cook the washed ofada rice in salted water for 25–30 minutes until just tender, then drain it well.",
      "Plate: one scoop of ofada rice, a generous ladle of ayamase over it, two pieces of assorted meat and half a boiled egg. Wrap in a leaf if serving in-house.",
    ],
    notes: "The stew must look green-brown and oily on top, not red — if it is red, the pepper was not fried long enough after bleaching. Taste for salt only after the meat stock goes in, because the stock is already seasoned. This is the highest food-cost dish on the menu; weigh the assorted meat, do not eyeball it.",
  },
  {
    id: "garlic", name: "Garlic Fried Rice", price: "₦2,700", documented: true, yield: 18, prep: "25 min", cook: "40 min",
    lines: [
      { name: "Rice (bag, 50kg)", qty: "5.5 kg (0.11 bag)", cost: 5.5 * rate.rice },
      { name: "Garlic (kg)", qty: "0.4 kg", cost: 0.4 * rate.garlic },
      { name: "Garden peas (kg)", qty: "0.8 kg", cost: 0.8 * rate.peas },
      { name: "Vegetable oil (25L)", qty: "1.8 L", cost: 1.8 * rate.oil },
      { name: "Chicken (kg)", qty: "0.8 kg (diced, for the base)", cost: 0.8 * rate.chicken },
      { name: "Carrots, spring onion, soy sauce, white pepper (allowance)", qty: "per batch", cost: 2200 },
    ],
    steps: [
      "Cook the rice in salted water until just al dente — a grain should still resist slightly when you bite it. Drain, spread on trays and let it cool completely. Hot rice fries into paste.",
      "Peel and mince the garlic finely. Keep a third of it back to go in at the very end.",
      "Dice the chicken small, season with white pepper and salt, and fry it off in a little oil until coloured. Lift it out and reserve.",
      "Get the wok or wide pot properly hot, add the oil, then two-thirds of the garlic. Fry only 30–45 seconds until it turns pale gold — garlic goes bitter the moment it browns.",
      "Add the diced carrots, stir-fry 2 minutes, then the garden peas and stir-fry 1 minute more. They should stay bright and firm.",
      "Add the cooled rice in two batches, tossing and lifting rather than stirring, so it heats through without breaking the grains.",
      "Splash in the soy sauce around the edge of the pan, not into the middle, and toss until the colour is even.",
      "Return the chicken, add the reserved raw garlic and the sliced spring onion, toss 30 seconds and take it straight off the heat.",
      "Taste for salt and white pepper, then portion immediately — this dish does not hold well and should not sit more than 20 minutes.",
    ],
    notes: "Day-old rice works best; if you must use same-day rice, cook it in the morning and spread it out to dry. The garlic hit should be sharp and fresh on the nose — that is what the last handful of raw garlic at step 8 is for. If the rice looks greasy, the pan was not hot enough when the rice went in.",
  },
  {
    id: "chicken", name: "Grilled Chicken", price: "₦1,800", documented: true, yield: 24, prep: "20 min + 4 hr marinate", cook: "45 min",
    lines: [
      { name: "Chicken (kg)", qty: "3.8 kg (24 pieces)", cost: 3.8 * rate.chicken },
      { name: "Vegetable oil (25L)", qty: "0.5 L", cost: 0.5 * rate.oil },
      { name: "Garlic (kg)", qty: "0.1 kg", cost: 0.1 * rate.garlic },
      { name: "Ginger, stock cubes, curry, paprika, lemon (allowance)", qty: "per batch", cost: 1200 },
    ],
    steps: [
      "Cut the chicken into 24 even pieces and trim the loose fat. Even sizing matters more than anything else here — uneven pieces mean some portions are dry and some are raw.",
      "Blend the garlic, ginger, stock cubes, curry, paprika, a little oil and the lemon juice into a marinade.",
      "Rub the marinade into every piece, getting under the skin where you can, then cover and refrigerate at least 4 hours. Overnight is better.",
      "Take the chicken out 30 minutes before cooking so it comes up to room temperature — cold chicken on the grill burns outside and stays pink inside.",
      "Steam or part-boil the pieces in their own marinade for 12 minutes to render fat and guarantee they cook through. Reserve the liquid.",
      "Reduce that reserved liquid by half over high heat to make the basting glaze.",
      "Grill over medium coals or in the oven at 200°C for 20–25 minutes, turning every 6–7 minutes and basting with the glaze each turn.",
      "For the last 5 minutes, move the pieces over direct heat to char the edges and crisp the skin.",
      "Rest the chicken 5 minutes before serving so the juices settle. Serve with a wedge of lemon.",
    ],
    notes: "Thickest part of the thigh should read 75°C, and the juice must run clear — check one piece from every tray. The skin wants to be lacquered and blistered, not black. If a batch comes off dry, the part-boil at step 5 ran too long; pull it at 10 minutes next time.",
  },
  {
    id: "peppered", name: "Peppered Chicken", price: "₦2,100", documented: true, yield: 22, prep: "25 min", cook: "50 min",
    lines: [
      { name: "Chicken (kg)", qty: "3.2 kg (22 pieces)", cost: 3.2 * rate.chicken },
      { name: "Fresh pepper (kg)", qty: "1 kg", cost: 1 * rate.pepper },
      { name: "Vegetable oil (25L)", qty: "1.2 L", cost: 1.2 * rate.oil },
      { name: "Tomatoes (crate)", qty: "1/16 crate", cost: 0.0625 * rate.tomatoes },
      { name: "Garlic (kg)", qty: "0.12 kg", cost: 0.12 * rate.garlic },
      { name: "Onions, ginger, stock cubes, thyme (allowance)", qty: "per batch", cost: 1500 },
    ],
    steps: [
      "Season the chicken pieces with stock cubes, thyme, salt, crushed garlic and ginger, and let them sit 20 minutes.",
      "Boil the seasoned chicken in just enough water to cover for 15 minutes until almost done. Lift the pieces out and keep the stock.",
      "Deep-fry the boiled pieces in hot oil for 5–6 minutes until golden and firm on the outside. Drain on a rack, not on paper, so they stay crisp.",
      "Blend the fresh pepper, tomatoes, onions and the rest of the garlic coarsely — you want visible bits in the finished sauce.",
      "Pour off all but about 400ml of the frying oil, then fry the blended pepper in it for 15 minutes until it thickens and darkens and the oil separates.",
      "Add 300ml of the reserved chicken stock, the remaining thyme and a stock cube, and simmer 5 minutes.",
      "Add sliced onion rings and green pepper strips, cook 2 minutes so they soften but keep their bite.",
      "Return the fried chicken to the pot and toss until every piece is coated. Cook only 3–4 minutes more — any longer and the crisp coating goes soft.",
      "Serve hot with the onion rings spooned over the top.",
    ],
    notes: "Sauce should cling to the chicken, not pool around it — if it pools, it needed another 3 minutes of frying at step 5. Heat level: hot enough to notice, not enough to stop them eating. Keep a milder batch of the sauce back for customers who ask for less pepper; it is a common request from the hostels.",
  },
  {
    id: "poundedYamEgusi", name: "Pounded Yam & Egusi", price: "₦2,800", documented: true, yield: 16, prep: "30 min", cook: "1 hr",
    lines: [
      { name: "Assorted meat (kg)", qty: "1.4 kg", cost: 1.4 * rate.assortedMeat },
      { name: "Fresh pepper (kg)", qty: "0.5 kg", cost: 0.5 * rate.pepper },
      { name: "Vegetable oil (25L)", qty: "0.4 L", cost: 0.4 * rate.oil },
      { name: "Egusi, palm oil, ugu, crayfish, stockfish, yam flour (allowance)", qty: "per batch", cost: 8000 },
    ],
    steps: [
      "Boil the assorted meat and stockfish with onion, salt and stock cubes for 40 minutes until tender. Keep the stock — egusi lives or dies on it.",
      "Grind the egusi seed with a little onion into a thick paste, then let it rest 10 minutes so it binds.",
      "Heat the palm oil gently, add the blended pepper and fry 10 minutes until the raw smell is gone.",
      "Drop the egusi paste into the oil in small lumps and DO NOT stir for 8 minutes. That is what makes the caked lumps customers expect.",
      "Once the lumps are set and the oil has risen around them, stir gently and fry 5 minutes more.",
      "Pour in the hot meat stock a ladle at a time until it loosens to a thick, spoonable consistency, then add the meat and crayfish.",
      "Simmer uncovered 15 minutes, correcting the salt. It should mound on a spoon, not run off it.",
      "Stir the washed, shredded ugu through in the last 3 minutes so it stays green.",
      "For the pounded yam: pour the yam flour into boiling water in a steady stream while stirring hard, then work it against the side of the pot for 4–5 minutes until smooth with no lumps. Cover and steam 3 minutes, stir once more, then mould 16 portions with a wet scoop.",
    ],
    notes: "Egusi should be lumpy and thick, never smooth or soupy — if it runs off the spoon, simmer it longer uncovered. Add the ugu last and briefly, or it goes khaki and tastes flat. Pounded yam must be stretchy and lump-free; if it is stiff, it took too much flour, and a stiff portion is the single most common complaint on this dish.",
  },
  {
    id: "assortedMeatDish", name: "Assorted Meat Dish", price: "₦2,400", documented: false, yield: 0, prep: "—", cook: "—", lines: [], steps: [], notes: "",
  },
  {
    id: "semoOgbono", name: "Semo & Ogbono", price: "₦2,600", documented: false, yield: 0, prep: "—", cook: "—", lines: [], steps: [], notes: "",
  },
];

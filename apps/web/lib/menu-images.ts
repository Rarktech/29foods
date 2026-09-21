import fantaImg from "@/public/images/menu/fanta-35cl.jpg";
import garlicFriedRiceImg from "@/public/images/menu/garlic-fried-rice.jpg";
import grilledChickenImg from "@/public/images/menu/grilled-chicken.jpg";
import nativeJollofImg from "@/public/images/menu/native-jollof.jpg";
import ofadaSpecialImg from "@/public/images/menu/ofada-special.jpg";
import partyJollofImg from "@/public/images/menu/party-jollof.jpg";
import pepperedChickenImg from "@/public/images/menu/peppered-chicken.jpg";
import type { StaticImageData } from "next/image";

/**
 * The approved design ships with real photography for the launch menu, keyed
 * by dish name rather than a database column — new/renamed items simply won't
 * have a match and the UI falls back to `imageUrl` from the database.
 */
const MENU_IMAGE_BY_NAME: Record<string, StaticImageData> = {
  "Party Jollof": partyJollofImg,
  "Grilled Chicken": grilledChickenImg,
  "Native Jollof": nativeJollofImg,
  "Ofada Special": ofadaSpecialImg,
  "Garlic Fried Rice": garlicFriedRiceImg,
  "Peppered Chicken": pepperedChickenImg,
  "Fanta 35cl": fantaImg,
};

export function getMenuImage(name: string): StaticImageData | null {
  // Order/cart snapshots may carry a protein add-on baked into the display name
  // (e.g. "Party Jollof — Fried Fish") — look up by the base dish name.
  const baseName = name.split(" — ")[0] ?? name;
  return MENU_IMAGE_BY_NAME[name] ?? MENU_IMAGE_BY_NAME[baseName] ?? null;
}

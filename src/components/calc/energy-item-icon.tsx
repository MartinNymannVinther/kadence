import type { FuelItemId } from "@/modules/calc/fuel-items";
import { cn } from "@/lib/utils";
import { MealIcon } from "./energy-meal-icon";

/**
 * The colours of the food, one for each thing, used for its icon and
 * the tint behind it. They are the illustration's own and the same in
 * light and dark: a bottle of sports drink is orange on any screen.
 */
export const ITEM_COLOUR: Record<FuelItemId, string> = {
  water: "#5fb3e0",
  saltWater: "#8fb8cf",
  drink: "#f08a24",
  fuel: "#d4407a",
  riceCake: "#c9b48a",
  banana: "#e8c22a",
  oats: "#d9c8a8",
  milk: "#9fc6e0",
  whiteBread: "#e8bf72",
  ryeBread: "#8a6248",
  pasta: "#f0cf5a",
  rice: "#cfd8dc",
  potatoes: "#c89a5b",
  raisins: "#7a4a5e",
  juice: "#f7a531",
  honey: "#f2b705",
  skyr: "#a9c7e8",
  cocoaMilk: "#8a5a3c",
  chicken: "#e3a76f",
  egg: "#e9dcb8",
  cheese: "#f2cc55",
};

function Bottle({ colour, salt }: { colour: string; salt?: boolean }) {
  return (
    <>
      <rect x="13" y="2.5" width="6" height="3.5" rx="1" fill="#3a3a44" />
      <rect x="11.5" y="5.5" width="9" height="3" rx="1" fill="#55555f" />
      <path
        d="M10 9.5 Q10 8 11.5 8 H20.5 Q22 8 22 9.5 V27 Q22 29.5 19.5 29.5 H12.5 Q10 29.5 10 27 Z"
        fill={colour}
        stroke="#00000033"
        strokeWidth="0.8"
      />
      <rect x="10" y="15" width="12" height="5" fill="#ffffffaa" />
      <path d="M12.5 11 V26" stroke="#ffffff88" strokeWidth="1.4" strokeLinecap="round" />
      {salt && (
        <g fill="#ffffff">
          <rect x="14" y="22.5" width="1.6" height="1.6" />
          <rect x="17.4" y="24.2" width="1.6" height="1.6" />
          <rect x="15.6" y="26" width="1.6" height="1.6" />
        </g>
      )}
    </>
  );
}

function RiceCake() {
  return (
    <>
      <path d="M5 10 L27 10 L27 24 L5 24 Z" fill="#cfd5dd" stroke="#9aa3ad" strokeWidth="0.8" />
      <path
        d="M8 11.5 H24 Q26 11.5 26 13.5 V21 Q26 23 24 23 H8 Q6 23 6 21 V13.5 Q6 11.5 8 11.5 Z"
        fill="#f7f1e1"
      />
      <g fill="#8a5a3c">
        <circle cx="10" cy="15" r="1.1" />
        <circle cx="15.5" cy="19.5" r="1.2" />
        <circle cx="20" cy="14.5" r="1" />
        <circle cx="22.5" cy="19.8" r="1.1" />
      </g>
      <g fill="#e5dcc6">
        <circle cx="13" cy="14" r="0.8" />
        <circle cx="18" cy="17.5" r="0.8" />
        <circle cx="11.5" cy="20" r="0.8" />
      </g>
    </>
  );
}

function Banana() {
  return (
    <>
      <path
        d="M5 9 Q7 25 26 22 Q27.5 21.6 27 20.2 Q14 21 9 7.5 Q7 6.8 5 9 Z"
        fill="#f2cf3a"
        stroke="#00000033"
        strokeWidth="0.8"
      />
      <path d="M8 10 Q11 19 23 20.4" fill="none" stroke="#d9a91c" strokeWidth="1" />
      <path d="M4.6 9.4 L5.6 6.6 L7.4 7.4 Z" fill="#6b4b2a" />
      <circle cx="26.6" cy="21.2" r="0.9" fill="#6b4b2a" />
    </>
  );
}

/** One food drawn small: a bottle in its drink's colour, a rice cake in foil, a banana, or a meal. */
export function ItemIcon({ id, className }: { id: FuelItemId; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      {id === "water" && <Bottle colour={ITEM_COLOUR.water} />}
      {id === "saltWater" && <Bottle colour={ITEM_COLOUR.saltWater} salt />}
      {id === "drink" && <Bottle colour={ITEM_COLOUR.drink} />}
      {id === "fuel" && <Bottle colour={ITEM_COLOUR.fuel} />}
      {id === "riceCake" && <RiceCake />}
      {id === "banana" && <Banana />}
      <MealIcon id={id} />
    </svg>
  );
}

import { describe, expect, it } from "vitest";
import { checkPlan, lanesFor, type FuelRace, type Lanes } from "@/modules/calc/fuel-check";
import { itemContent, MEAL_ITEM_IDS, RIDE_ITEM_IDS } from "@/modules/calc/fuel-items";

const RACE: FuelRace = { minutes: 120, celsius: 18, gutTrained: false, bottleMl: 750 };

describe("the pantry", () => {
  it("counts bottles by their size and food by the piece (ernaering.md, section 2)", () => {
    expect(itemContent("drink", 750)).toEqual({
      carbs: 45,
      protein: 0,
      fluidL: 0.75,
      sodiumMg: 443,
    });
    expect(itemContent("drink", 500)).toEqual({
      carbs: 30,
      protein: 0,
      fluidL: 0.5,
      sodiumMg: 295,
    });
    expect(itemContent("fuel", 750).carbs).toBe(60);
    expect(itemContent("saltWater", 1000 as 750).sodiumMg).toBe(590);
    expect(itemContent("riceCake", 750)).toEqual({
      carbs: 32,
      protein: 0,
      fluidL: 0,
      sodiumMg: 39,
    });
    expect(itemContent("gel", 500).carbs).toBe(25);
    expect(itemContent("banana", 500).carbs).toBe(25);
    expect(itemContent("oatBar", 500).carbs).toBe(33);
  });

  it("has eight things for the bike, four of them bottles, and sixteen meals", () => {
    expect(RIDE_ITEM_IDS).toHaveLength(8);
    expect(RIDE_ITEM_IDS.filter((id) => itemContent(id, 750).fluidL > 0)).toHaveLength(4);
    expect(MEAL_ITEM_IDS).toHaveLength(16);
  });

  it("counts the meals from the food database per portion, matching Team Danmark's 50 g list", () => {
    // Team Danmark: 2 slices of bread (100 g), 2½ dl cooked rice (150 g), 1 dl raisins (60 g),
    // 2½ dl oats (75 g) and 2 bananas (240 g) each give about 50 g.
    expect(itemContent("whiteBread", 750).carbs).toBe(49);
    expect(itemContent("rice", 750).carbs).toBe(57);
    expect(itemContent("raisins", 750).carbs).toBe(45);
    expect(itemContent("oats", 750).carbs).toBe(44);
    expect(itemContent("banana", 750).carbs * 2).toBe(50);
    expect(itemContent("cocoaMilk", 750)).toMatchObject({ carbs: 23, protein: 9, fluidL: 0.25 });
  });
});

describe("the hours of a race", () => {
  it("are whole hours with a shorter last one", () => {
    expect(lanesFor(150).map((l) => [l.fromMin, l.toMin])).toEqual([
      [0, 60],
      [60, 120],
      [120, 150],
    ]);
    expect(lanesFor(10)).toHaveLength(1);
    expect(lanesFor(10)[0]!.toMin).toBe(30);
    expect(lanesFor(1000)).toHaveLength(6);
  });
});

describe("checking a plan hour by hour", () => {
  it("one sports drink an hour in two hours is on target, with the rider over the line", () => {
    const check = checkPlan(RACE, [["drink"], ["drink"]]);
    expect(check.lanes.map((c) => [c.carbState, c.fluidState, c.mood])).toEqual([
      ["ok", "ok", "good"],
      ["ok", "ok", "good"],
    ]);
    expect(check.onTarget).toBe(2);
    expect(check.podium).toBe(true);
  });

  it("an empty first hour makes the rider hungry and thirsty, two in a row empty", () => {
    const check = checkPlan(RACE, [[], ["water"]]);
    expect(check.lanes[0]).toMatchObject({
      carbState: "under",
      fluidState: "under",
      mood: "thirsty",
    });
    expect(check.lanes[1]).toMatchObject({ carbState: "under", fluidState: "ok", mood: "empty" });
    expect(check.podium).toBe(false);
    expect(checkPlan(RACE, [["gel"], ["water"]]).lanes[1]!.mood).toBe("hungry");
  });

  it("counts the recommendation from the start, so a short hour is caught up later", () => {
    const check = checkPlan(RACE, [
      ["gel", "water"],
      ["riceCake", "gel"],
    ]);
    expect(check.lanes.map((c) => c.cumCarbs)).toEqual([25, 82]);
    expect(check.lanes.map((c) => c.carbState)).toEqual(["ok", "ok"]);
  });

  it("gives the stomach 60 g an hour without practice and 90 g with, 10 g over either", () => {
    const hour = (items: Lanes[number]) => checkPlan(RACE, [items, ["drink"]]).lanes[0]!;
    expect(hour(["drink", "gel"]).carbState).toBe("ok"); // 70 g
    expect(hour(["drink", "riceCake"])).toMatchObject({ carbState: "gut", mood: "stomach" }); // 77 g
    const trained = checkPlan({ ...RACE, gutTrained: true }, [["drink", "riceCake"], ["drink"]]);
    expect(trained.lanes[0]!.carbState).not.toBe("gut");
    expect(
      checkPlan({ ...RACE, gutTrained: true }, [["fuel", "fuel"], []]).lanes[0]!.carbState,
    ).toBe("gut");
  });

  it("more than 1.5 l in one hour floods, more than the sweat over the race sloshes", () => {
    const flood = checkPlan(RACE, [["drink", "water", "water"], []]);
    expect(flood.lanes[0]).toMatchObject({ fluidState: "flood", mood: "slosh" });
    const over = checkPlan(RACE, [
      ["drink", "water"],
      ["water", "water"],
    ]);
    expect(over.lanes[1]).toMatchObject({ fluidState: "over", mood: "slosh" });
  });

  it("allows half a bottle either way, so a 750 ml bottle fits a half-hour race", () => {
    const short: FuelRace = { ...RACE, minutes: 30 };
    expect(checkPlan(short, [["water"]]).lanes[0]!.fluidState).toBe("ok");
    expect(checkPlan(short, [[]]).lanes[0]!.fluidState).toBe("ok");
    expect(checkPlan({ ...short, bottleMl: 500 }, [["water", "water"]]).lanes[0]!.fluidState).toBe(
      "over",
    );
  });

  it("asks nothing of the carbohydrate under 75 minutes but the stomach's limit", () => {
    const check = checkPlan({ ...RACE, minutes: 60 }, [[]]);
    expect(check.lanes[0]!.carbState).toBe("free");
    expect(check.lanes[0]!.carbRange).toBeNull();
  });

  it("uses the hot fluid range from 25 °C", () => {
    const hot = checkPlan({ ...RACE, celsius: 28, bottleMl: 500 }, [["drink"], ["drink"]]);
    expect(hot.fluidPerHour).toEqual({ low: 0.8, high: 1.2 });
    expect(hot.lanes[1]!.fluidState).toBe("under");
    expect(hot.notes).toContain("heat");
  });
});

describe("the notes under a plan", () => {
  it("asks for salt in long races when the bottles hold water", () => {
    const long: FuelRace = { ...RACE, minutes: 180 };
    expect(checkPlan(long, [["water"], ["water"], ["water"]]).notes).toContain("sodium");
    expect(checkPlan(long, [["saltWater"], ["saltWater"], ["drink"]]).notes).not.toContain(
      "sodium",
    );
    expect(checkPlan(RACE, [["water"], ["water"]]).notes).not.toContain("sodium");
  });

  it("says when rice cakes are eaten late, and later still on a hot day", () => {
    const long: FuelRace = { ...RACE, minutes: 180 };
    expect(checkPlan(long, [[], ["riceCake"], []]).notes).not.toContain("riceCakeLate");
    expect(checkPlan(long, [[], [], ["riceCake"]]).notes).toContain("riceCakeLate");
    expect(checkPlan({ ...long, celsius: 26 }, [[], ["riceCake"], []]).notes).toContain(
      "riceCakeLate",
    );
  });

  it("keeps the oat bar out of the finale, the 8 % bottle out of the heat, and counts the cages", () => {
    expect(checkPlan(RACE, [["oatBar"], []]).notes).not.toContain("fatFibre");
    expect(checkPlan(RACE, [[], ["oatBar"]]).notes).toContain("fatFibre");
    expect(checkPlan({ ...RACE, celsius: 30 }, [["fuel"], []]).notes).toContain("fuelHeat");
    expect(checkPlan(RACE, [["drink", "drink"], ["drink"]]).notes).toContain("cages");
  });

  it("names the gut's 60 g and the practice it takes to go higher", () => {
    expect(checkPlan({ ...RACE, minutes: 180 }, [[], [], []]).notes).toContain("capped");
    expect(checkPlan({ ...RACE, gutTrained: true }, [["fuel", "gel"], []]).notes).toEqual(
      expect.arrayContaining(["multiple", "practise"]),
    );
  });

  it("does not count what lies after a shortened finish, and says so", () => {
    const plan: Lanes = [["drink"], ["drink"], ["gel", "gel"], [], [], []];
    const check = checkPlan(RACE, plan);
    expect(check.lanes).toHaveLength(2);
    expect(check.totals.pieces).toBe(0);
    expect(check.pastFinish).toBe(2);
    expect(check.notes).toContain("pastFinish");
  });
});

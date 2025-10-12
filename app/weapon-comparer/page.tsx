"use client";

import dynamic from "next/dynamic";
import { Form } from "@heroui/form";
import { NumberInput } from "@heroui/number-input";
import { Button } from "@heroui/button";
import { FormEvent, useState } from "react";
import {
  range,
  repeat,
  concat,
  reverse,
  reduce,
  mergeWith,
  pipe,
  mergeRight,
  pick,
  groupBy,
  map,
  mergeAll,
  filter,
  prop,
  zip,
  zipWith,
  KeyValuePair,
  tap,
  invoker,
  cond,
  gte,
  always,
  lte,
  gt,
  equals,
  lt,
} from "ramda";
import camelCase from "lodash/fp/camelCase";
import { PlotParams } from "react-plotly.js";
import { PlotType } from "plotly.js";
import { floor } from "lodash/fp";

interface StatCoordinates {
  toughnessCoordinates: number[];
  saveCoordinates: number[];
  woundsCoordinates: number[];
}
interface WeaponStats {
  attacks: number;
  skill: number;
  strength: number;
  armorPenetration: number;
  damage: number;
  weapon: string;
}
type WeaponAttribute = Partial<WeaponStats> & { weapon: string };

interface DefensiveStats {
  toughness: number;
  save: number;
  wounds: number;
}

const numberArray: number[] = [];
const toughnessRange = range(2, 13);
const saveRange = reverse(range(2, 8));
const woundsRange = range(1, 17);
const defaultCoordinates: StatCoordinates = {
  toughnessCoordinates: numberArray,
  saveCoordinates: numberArray,
  woundsCoordinates: numberArray,
};

const accumulateSavesWoundsCoordinates = (
  coordinates: Pick<StatCoordinates, "saveCoordinates" | "woundsCoordinates">,
  save: number
) =>
  mergeWith(concat, coordinates, {
    saveCoordinates: repeat(save, woundsRange.length),
    woundsCoordinates: woundsRange,
  });
const accumulateCoordinates = (
  coordinates: StatCoordinates,
  toughness: number
) =>
  pipe(
    reduce(
      accumulateSavesWoundsCoordinates,
      pick(["saveCoordinates", "woundsCoordinates"], defaultCoordinates)
    ),
    mergeRight({
      toughnessCoordinates: repeat(
        toughness,
        saveRange.length * woundsRange.length
      ),
    }),
    mergeWith(concat, coordinates)
  )(saveRange);

const statCoordinates = reduce(
  accumulateCoordinates,
  defaultCoordinates,
  toughnessRange
);
const zipCoordinateTriplets = zipWith<
  KeyValuePair<number, number>,
  number,
  DefensiveStats
>(
  ([toughness, save], wounds) => ({
    toughness,
    save,
    wounds,
  }),
  zip(statCoordinates.toughnessCoordinates, statCoordinates.saveCoordinates),
  statCoordinates.woundsCoordinates
);

const cleanFormData = ([name, value]: [string, string]): WeaponAttribute => {
  const attributeParts = name.split("-");
  const weapon = attributeParts[attributeParts.length - 1];
  const attribute = camelCase(attributeParts.slice(0, -1).join("-"));
  return {
    weapon,
    [attribute]: parseFloat(value),
  };
};
const diceFaceCount = 6;
const calculateHits = (skill: number, attacks: number) =>
  ((diceFaceCount - skill + 1) / diceFaceCount) * attacks;
const calculateWounds = (toughness: number, strength: number, hits: number) =>
  pipe(
    cond([
      [() => gte(toughness, strength * 2), always(6)],
      [() => lte(toughness, strength / 2), always(2)],
      [() => gt(toughness, strength), always(5)],
      [() => lt(toughness, strength), always(3)],
      [() => equals(toughness, strength), always(4)],
    ]),
    (rollToWound) => ((diceFaceCount - rollToWound + 1) / diceFaceCount) * hits
  )();
const calculateUnsavedWounds = (
  save: number,
  armorPenetration: number,
  woundsInflicted: number
) =>
  ((diceFaceCount - (diceFaceCount - save - armorPenetration + 1)) /
    diceFaceCount) *
  woundsInflicted;
const calculateKills = (
  wounds: number,
  damage: number,
  woundsInflicted: number
) => {
  const wholeWoundsInflicted = floor(woundsInflicted);
  const { kills } = reduce(
    ({ kills, damageTotal }) => {
      const newDamageTotal = damageTotal + damage;
      if (newDamageTotal >= wounds) return { kills: kills + 1, damageTotal: 0 };

      return { kills, damageTotal: newDamageTotal };
    },
    { kills: 0, damageTotal: 0 },
    range(1, wholeWoundsInflicted + 1)
  );
  const wholeDamage = floor((woundsInflicted - wholeWoundsInflicted) * damage)
  return kills + ;
};
const preparePlotData = (weaponStats: WeaponAttribute[]): Plotly.Data =>
  pipe(
    mergeAll,
    (weaponStats: WeaponStats) => ({
      weaponStats,
      text: map<DefensiveStats, string>(
        ({ toughness, save, wounds }): string =>
          pipe(
            (attacks) => calculateHits(weaponStats.skill, attacks),
            (hits) => calculateWounds(toughness, weaponStats.strength, hits),
            (woundsInflicted) =>
              calculateUnsavedWounds(
                save,
                weaponStats.armorPenetration,
                woundsInflicted
              ),
            (damageInflicted) => calculateKills(wounds, damageInflicted)
          )(weaponStats.attacks),
        zipCoordinateTriplets
      ),
    }),
    ({ weaponStats, text }) => ({
      type: "scatter3d",
      mode: "markers",
      name: `Weapon ${weaponStats.weapon}`,
      text,
      x: statCoordinates.toughnessCoordinates,
      y: statCoordinates.saveCoordinates,
      z: statCoordinates.woundsCoordinates,
    })
  )(weaponStats) as Plotly.Data;
const convertFormDataToPlotData = (
  formElement: HTMLFormElement
): Plotly.Data[] =>
  pipe(
    (formElement) => new FormData(formElement),
    Array.from,
    map<[string, string], WeaponAttribute>(cleanFormData),
    groupBy<WeaponAttribute>(prop("weapon")),
    (group): (WeaponAttribute[] | undefined)[] => Object.values(group),
    filter<WeaponAttribute[] | undefined, WeaponAttribute[]>(
      (item): item is WeaponAttribute[] => Boolean(item)
    ),
    map<WeaponAttribute[], Plotly.Data>(preparePlotData)
  )(formElement);

const Plot = dynamic(() => import("@/components/plot"), {
  ssr: false,
});

export default function WeaponComparer() {
  const [data, setData] = useState<Plotly.Data[]>();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    pipe(
      tap(invoker(0, "preventDefault")),
      prop("currentTarget"),
      convertFormDataToPlotData,
      setData
    )(event);
  };

  console.log(data);

  return (
    <div>
      <h1>Weapon Comparer</h1>
      <Form onSubmit={onSubmit}>
        <fieldset name="weapon-1">
          <legend>Weapon 1</legend>
          <NumberInput isRequired label="Attacks" name="attacks-1" />
          <NumberInput
            isRequired
            label="Ballistic Skill / Weapon Skill"
            name="skill-1"
          />
          <NumberInput isRequired label="Strength" name="strength-1" />
          <NumberInput
            isRequired
            label="Armor Penetration"
            name="armor-penetration-1"
          />
          <NumberInput
            isRequired
            label="Damage"
            name="damage-1"
            type="number"
          />
        </fieldset>
        <fieldset name="weapon-2">
          <legend>Weapon 2</legend>
          <NumberInput isRequired label="Attacks" name="attacks-2" />
          <NumberInput
            isRequired
            label="Ballistic Skill / Weapon Skill"
            name="skill-2"
          />
          <NumberInput isRequired label="Strength" name="strength-2" />
          <NumberInput
            isRequired
            label="Armor Penetration"
            name="armor-penetration-2"
          />
          <NumberInput
            isRequired
            label="Damage"
            name="damage-1"
            type="number"
          />
        </fieldset>
        <Button type="submit">Calculate</Button>
      </Form>
      {data ? <Plot data={data} layout={{}} /> : <></>}
    </div>
  );
}

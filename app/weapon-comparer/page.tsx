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
  replace,
  mergeAll,
  filter,
  prop,
  zip,
  zipWith,
  KeyValuePair,
  tap,
  invoker,
} from "ramda";
import camelCase from "lodash/fp/camelCase";

interface StatCoordinates {
  toughnessCoordinates: number[];
  saveCoordinates: number[];
  woundsCoordinates: number[];
}
interface WeaponStats {
  [x: string]: string;
  weapon: string;
}
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

const cleanFormData = ([name, value]: [string, string]) => {
  const attributeParts = name.split("-");
  const weapon = attributeParts[attributeParts.length - 1];
  const attribute = camelCase(attributeParts.slice(0, -1).join("-"));
  return {
    weapon,
    [attribute]: value,
  };
};
const preparePlotData = (weaponStats: WeaponStats[]): Plotly.Data =>
  pipe(
    mergeAll<WeaponStats>,
    (weaponStats: WeaponStats) => ({
      weaponStats,
      text: map<DefensiveStats, string>(
        (triplets): string =>
          `Weapon ${weaponStats.weapon}: ${JSON.stringify(triplets)}`,
        zipCoordinateTriplets
      ),
    }),
    ({ weaponStats, text }): Plotly.Data => ({
      type: "scatter3d",
      mode: "markers",
      name: `Weapon ${weaponStats.weapon}`,
      text,
      x: statCoordinates.toughnessCoordinates,
      y: statCoordinates.saveCoordinates,
      z: statCoordinates.woundsCoordinates,
    })
  )(weaponStats);
const convertFormDataToPlotData = (
  formElement: HTMLFormElement
): Plotly.Data[] =>
  pipe(
    (formElement) => new FormData(formElement),
    Array.from,
    map<[string, string], WeaponStats>(cleanFormData),
    groupBy<WeaponStats>(prop("weapon")),
    (group): (WeaponStats[] | undefined)[] => Object.values(group),
    filter<WeaponStats[] | undefined, WeaponStats[]>(
      (item): item is WeaponStats[] => Boolean(item)
    ),
    map<WeaponStats[], Plotly.Data>(preparePlotData)
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

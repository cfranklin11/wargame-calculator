"use client";

import { Form } from "@heroui/form";
import { NumberInput } from "@heroui/number-input";
import { Button } from "@heroui/button";
import { FormEvent } from "react";

export default function WeaponComparer() {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(event.currentTarget));
    console.log(data);
  };

  return (
    <div>
      <h1>Weapon Comparer</h1>
      <Form onSubmit={onSubmit}>
        <h2>Weapon 1</h2>
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
        <NumberInput isRequired label="Damage" name="damage-1" type="number" />
        <h2>Weapon 2</h2>
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
        <NumberInput isRequired label="Damage" name="damage-1" type="number" />
        <Button type="submit">Calculate</Button>
      </Form>
    </div>
  );
}

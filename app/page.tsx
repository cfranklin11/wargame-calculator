import { Link } from "@heroui/link";

export default function Home() {
  return (
    <div>
      <h1>Wargame Calculator</h1>
      <em>(but just Warhammer 40k for now)</em>
      <p>Choose a calculator below:</p>
      <ul>
        <li>
          <Link href="/weapon-comparer">Weapon Comparer</Link>
          <br></br>
          Compares two weapon profiles across multiple defender profiles.
        </li>
      </ul>
    </div>
  );
}

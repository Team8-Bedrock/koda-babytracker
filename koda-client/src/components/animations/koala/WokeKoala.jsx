import { WokeRig } from "../panda/WokePanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";
import SleepyKoala from "./SleepyKoala";

const QUALITIES = ["good", "fair", "poor", "groggy"];

export default function WokeKoala({ quality = "good", variant, ...props }) {
  const q = QUALITIES.includes(variant || quality) ? variant || quality : "good";
  if (q === "poor" || q === "groggy") return <SleepyKoala {...props} />;
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.idle} mood="woke" Rig={WokeRig} rigProps={{ quality: q, variant: q }} />;
}

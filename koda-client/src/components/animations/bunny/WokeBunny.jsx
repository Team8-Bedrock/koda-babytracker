import { WokeRig } from "../panda/WokePanda";
import { BunnyMood, BUNNY_IDLE_MODEL } from "./bunnyRig";
import SleepyBunny from "./SleepyBunny";

const QUALITIES = ["good", "fair", "poor", "groggy"];

export default function WokeBunny({ quality = "good", variant, ...props }) {
  const q = QUALITIES.includes(variant || quality) ? variant || quality : "good";
  if (q === "poor") return <SleepyBunny {...props} />;
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={WokeRig} rigProps={{ quality: q }} />;
}
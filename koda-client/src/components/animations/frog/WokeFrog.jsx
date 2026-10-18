import { WokeRig } from "../panda/WokePanda";
import { FrogMood, FROG_IDLE_MODEL } from "./frogRig";
import SleepyFrog from "./SleepyFrog";

const QUALITIES = ["good", "fair", "poor", "groggy"];

export default function WokeFrog({ quality = "good", variant, ...props }) {
  const q = QUALITIES.includes(variant || quality) ? variant || quality : "good";
  if (q === "poor" || q === "groggy") return <SleepyFrog {...props} />;
  return <FrogMood {...props} modelUrl={FROG_IDLE_MODEL} leaf="woke" Rig={WokeRig} rigProps={{ quality: q, variant: q }} />;
}

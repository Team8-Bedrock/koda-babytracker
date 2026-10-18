import { WokeRig } from "../panda/WokePanda";
import { FoxMood, FOX_MODELS } from "./foxRig";
import SleepyFox from "./SleepyFox";

const QUALITIES = ["good", "fair", "poor", "groggy"];

export default function WokeFox({ quality = "good", variant, ...props }) {
  const q = QUALITIES.includes(variant || quality) ? variant || quality : "good";
  if (q === "poor" || q === "groggy") return <SleepyFox {...props} />;
  return <FoxMood {...props} modelUrl={FOX_MODELS.idle} mood="woke" Rig={WokeRig} rigProps={{ quality: q, variant: q }} />;
}

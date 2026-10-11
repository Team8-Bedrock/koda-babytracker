import { WokeRig } from "../panda/WokePanda";
import { BearMood, BEAR_IDLE_MODEL } from "./bearRig";
import SleepyBear from "./SleepyBear";

const SLEEPY_MODEL = "/models/characters/bear/sleepy.glb";
const MODEL_BY_QUALITY = { good: BEAR_IDLE_MODEL, fair: BEAR_IDLE_MODEL, poor: SLEEPY_MODEL, groggy: SLEEPY_MODEL };

export default function WokeBear({ quality = "good", variant, ...props }) {
  const q = MODEL_BY_QUALITY[variant || quality] ? variant || quality : "good";
  if (q === "poor") return <SleepyBear {...props} />;
  return <BearMood {...props} modelUrl={MODEL_BY_QUALITY[q]} Rig={WokeRig} rigProps={{ quality: q }} />;
}

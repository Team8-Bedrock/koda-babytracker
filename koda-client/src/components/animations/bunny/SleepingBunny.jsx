import { SleepingRig } from "../panda/SleepingPanda";
import { BunnyMood, BUNNY_IDLE_MODEL } from "./bunnyRig";

export default function SleepingBunny(props) {
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={SleepingRig} />;
}
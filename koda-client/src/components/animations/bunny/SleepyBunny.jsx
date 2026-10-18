import { SleepyRig } from "../panda/SleepyPanda";
import { BunnyMood, BUNNY_IDLE_MODEL } from "./bunnyRig";

export default function SleepyBunny(props) {
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={SleepyRig} />;
}
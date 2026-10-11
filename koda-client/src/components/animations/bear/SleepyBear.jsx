import { SleepyRig } from "../panda/SleepyPanda";
import { BearMood } from "./bearRig";

export default function SleepyBear(props) {
  return <BearMood {...props} modelUrl={"/models/characters/bear/sleepy.glb"} Rig={SleepyRig} />;
}

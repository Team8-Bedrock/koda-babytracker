import { SleepingRig } from "../panda/SleepingPanda";
import { BearMood } from "./bearRig";

export default function SleepingBear(props) {
  return <BearMood {...props} modelUrl={"/models/characters/bear/sleeping.glb"} Rig={SleepingRig} />;
}

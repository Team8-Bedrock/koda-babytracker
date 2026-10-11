import { CryingRig } from "../panda/CryingPanda";
import { BearMood, BEAR_IDLE_MODEL } from "./bearRig";

export default function CryingBear(props) {
  return <BearMood {...props} modelUrl={BEAR_IDLE_MODEL} Rig={CryingRig} />;
}

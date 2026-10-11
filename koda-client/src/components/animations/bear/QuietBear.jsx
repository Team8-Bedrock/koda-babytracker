import { QuietRig } from "../panda/QuietPanda";
import { BearMood, BEAR_IDLE_MODEL } from "./bearRig";

export default function QuietBear(props) {
  return <BearMood {...props} modelUrl={BEAR_IDLE_MODEL} Rig={QuietRig} />;
}

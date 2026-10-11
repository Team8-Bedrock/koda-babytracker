import { OtherRig } from "../panda/OtherPanda";
import { BearMood, BEAR_IDLE_MODEL } from "./bearRig";

export default function OtherBear(props) {
  return <BearMood {...props} modelUrl={BEAR_IDLE_MODEL} Rig={OtherRig} />;
}

import { EnergeticRig } from "../panda/EnergeticPanda";
import { BearMood, BEAR_IDLE_MODEL } from "./bearRig";

export default function EnergeticBear(props) {
  return <BearMood {...props} modelUrl={BEAR_IDLE_MODEL} Rig={EnergeticRig} />;
}

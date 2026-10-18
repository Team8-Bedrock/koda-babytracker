import { EnergeticRig } from "../panda/EnergeticPanda";
import { FrogMood, FROG_IDLE_MODEL } from "./frogRig";

export default function EnergeticFrog(props) {
  return <FrogMood {...props} modelUrl={FROG_IDLE_MODEL} leaf="energetic" Rig={EnergeticRig} />;
}

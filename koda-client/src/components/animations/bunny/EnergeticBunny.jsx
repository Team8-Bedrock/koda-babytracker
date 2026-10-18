import { EnergeticRig } from "../panda/EnergeticPanda";
import { BunnyMood, BUNNY_IDLE_MODEL } from "./bunnyRig";

export default function EnergeticBunny(props) {
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={EnergeticRig} />;
}
import { OtherRig } from "../panda/OtherPanda";
import { BunnyMood, BUNNY_IDLE_MODEL } from "./bunnyRig";

export default function OtherBunny(props) {
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={OtherRig} />;
}
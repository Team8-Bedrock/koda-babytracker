import { AngryRig } from "../panda/AngryPanda";
import { BunnyMood, BUNNY_IDLE_MODEL, withClosedEyes } from "./bunnyRig";

export default function AngryBunny(props) {
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={withClosedEyes(AngryRig)} />;
}
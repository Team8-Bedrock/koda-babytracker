import { DiaperRig } from "../panda/DiaperPanda";
import { BunnyMood, BUNNY_IDLE_MODEL } from "./bunnyRig";

export default function DiaperBunny({ variant, type, ...props }) {
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={DiaperRig} rigProps={{ variant: variant || type }} />;
}
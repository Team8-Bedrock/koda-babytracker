import { DiaperRig } from "../panda/DiaperPanda";
import { BearMood, BEAR_IDLE_MODEL } from "./bearRig";

export default function DiaperBear({ variant, type, ...props }) {
  return <BearMood {...props} modelUrl={BEAR_IDLE_MODEL} Rig={DiaperRig} rigProps={{ variant: variant || type }} />;
}

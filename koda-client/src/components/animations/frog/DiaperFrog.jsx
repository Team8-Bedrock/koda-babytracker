import { DiaperRig } from "../panda/DiaperPanda";
import { FrogMood, FROG_IDLE_MODEL } from "./frogRig";

export default function DiaperFrog({ variant, type, ...props }) {
  return <FrogMood {...props} modelUrl={FROG_IDLE_MODEL} leaf="diaper" Rig={DiaperRig} rigProps={{ variant: variant || type }} />;
}

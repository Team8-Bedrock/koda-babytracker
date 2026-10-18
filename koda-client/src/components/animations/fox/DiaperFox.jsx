import { DiaperRig } from "../panda/DiaperPanda";
import { FoxMood, FOX_MODELS } from "./foxRig";

export default function DiaperFox({ variant, type, ...props }) {
  return <FoxMood {...props} modelUrl={FOX_MODELS.idle} mood="diaper" Rig={DiaperRig} rigProps={{ variant: variant || type }} />;
}

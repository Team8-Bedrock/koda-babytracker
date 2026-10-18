import { DiaperRig } from "../panda/DiaperPanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

export default function DiaperKoala({ variant, type, ...props }) {
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.idle} mood="diaper" Rig={DiaperRig} rigProps={{ variant: variant || type }} />;
}

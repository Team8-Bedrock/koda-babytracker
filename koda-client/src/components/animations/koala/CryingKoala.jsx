import { CryingRig } from "../panda/CryingPanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

export default function CryingKoala(props) {
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.crying} mood="crying" Rig={CryingRig} />;
}

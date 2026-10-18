import { EnergeticRig } from "../panda/EnergeticPanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

export default function EnergeticKoala(props) {
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.idle} mood="energetic" Rig={EnergeticRig} />;
}

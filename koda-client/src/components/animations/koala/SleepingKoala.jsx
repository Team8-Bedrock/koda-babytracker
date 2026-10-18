import { SleepingRig } from "../panda/SleepingPanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

export default function SleepingKoala(props) {
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.sleeping} mood="sleeping" Rig={SleepingRig} />;
}

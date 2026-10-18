import { QuietRig } from "../panda/QuietPanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

export default function QuietKoala(props) {
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.idle} mood="quiet" Rig={QuietRig} />;
}

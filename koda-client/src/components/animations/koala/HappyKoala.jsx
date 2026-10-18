import { HappyRig } from "../panda/HappyPanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

export default function HappyKoala(props) {
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.idle} mood="happy" Rig={HappyRig} />;
}

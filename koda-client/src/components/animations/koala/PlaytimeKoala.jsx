import { PlaytimeRig } from "../panda/PlaytimePanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

export default function PlaytimeKoala(props) {
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.idle} mood="playtime" Rig={PlaytimeRig} />;
}

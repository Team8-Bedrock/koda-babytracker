import { useEffect, useState } from "react";
import { API_URL } from "../config";

let warming = null;

export function warmServer() {
    if (!warming) {
        warming = fetch(`${API_URL}/api/health`, { cache: "no-store" })
            .catch(() => null)
            .finally(() => {
                setTimeout(() => {
                    warming = null;
                }, 60000);
            });
    }
    return warming;
}

export function useSlowFlag(active, delay = 4000) {
    const [slow, setSlow] = useState(false);
    useEffect(() => {
        if (!active) {
            setSlow(false);
            return undefined;
        }
        const id = setTimeout(() => setSlow(true), delay);
        return () => clearTimeout(id);
    }, [active, delay]);
    return slow;
}
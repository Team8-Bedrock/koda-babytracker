import * as THREE from "three";

const INNER_RATIO = 0.5;

function meshesOf(group) {
    const list = [];
    group.updateMatrixWorld(true);
    group.traverse((o) => {
        if (!o.isMesh) return;
        const box = new THREE.Box3().setFromObject(o);
        list.push({ mesh: o, box, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) });
    });
    return list;
}

export function fitInnerEars(group, ratio = INNER_RATIO) {
    if (!group) return;
    const parts = meshesOf(group);
    if (parts.length < 2) return;
    const outer = parts.reduce((a, b) => (b.center.z < a.center.z ? b : a));
    const v = new THREE.Vector3();
    parts.forEach((p) => {
        if (p === outer || p.center.z <= outer.center.z) return;
        const f = Math.min(1, (ratio * outer.size.x) / (p.size.x || 1), (ratio * outer.size.y) / (p.size.y || 1));
        if (f >= 0.999) return;
        const target = p.center.clone().lerp(outer.center, 0.35);
        target.z = p.center.z;
        const geo = p.mesh.geometry.clone();
        const toWorld = p.mesh.matrixWorld.clone();
        const toLocal = toWorld.clone().invert();
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(toWorld);
            v.set(target.x + (v.x - p.center.x) * f, target.y + (v.y - p.center.y) * f, v.z);
            v.applyMatrix4(toLocal);
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        pos.needsUpdate = true;
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
        p.mesh.geometry = geo;
        const box = new THREE.Box3().setFromObject(p.mesh);
        const lift = outer.box.max.z + 0.002 - box.max.z;
        if (lift > 0) {
            const shift = new THREE.Vector3(0, 0, lift);
            const local = p.mesh.parent.worldToLocal(p.mesh.getWorldPosition(new THREE.Vector3()).add(shift));
            p.mesh.position.copy(local);
        }
    });
}
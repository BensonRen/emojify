// ─── structures.js — authored low-poly hero architecture ───
// Every builder returns a THREE.Group whose static parts are merged into ONE
// vertex-colored, flat-shaded geometry (= one draw call per structure).
// userData.cols = [{p:[x,z], r}] collision discs in local space (r in surface units).
import * as THREE from 'three';

const _m4=new THREE.Matrix4(),_e=new THREE.Euler(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(),_p=new THREE.Vector3();

// merge [geometry, color, x,y,z, rx,ry,rz, sx,sy,sz] parts → one geometry
function merge(parts){
  const pos=[],col=[],c=new THREE.Color();
  for(const [g,color,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1] of parts){
    const ng=g.index?g.toNonIndexed():g;
    _m4.compose(_p.set(x,y,z),_q.setFromEuler(_e.set(rx,ry,rz)),_s.set(sx,sy,sz));
    ng.applyMatrix4(_m4);
    const a=ng.attributes.position;c.set(color);
    for(let i=0;i<a.count;i++){pos.push(a.getX(i),a.getY(i),a.getZ(i));col.push(c.r,c.g,c.b);}
    if(ng!==g)ng.dispose();g.dispose();
  }
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  out.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  out.computeVertexNormals(); // non-indexed → per-face normals → low-poly facets
  return out;
}
let _mat=null;
const mat=()=>_mat??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.95});
function G(parts,cols){
  const g=new THREE.Group();g.add(new THREE.Mesh(merge(parts),mat()));
  g.userData.cols=cols;return g;
}
const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const cyl=(rt,rb,h,n=8)=>new THREE.CylinderGeometry(rt,rb,h,n);
const cone=(r,h,n=8)=>new THREE.ConeGeometry(r,h,n);
const sph=(r,n=8)=>new THREE.SphereGeometry(r,n,Math.max(4,(n*0.75)|0));
const tor=(r,t,arc)=>new THREE.TorusGeometry(r,t,6,10,arc);

// ── palette ──
const C={cream:0xfff3dc,paper:0xfffdf6,honey:0xe7a32b,terra:0xd8772f,wood:0x9c7a52,
  vermil:0xc84b31,stone:0xe9e0cb,dark:0x4a4036,glass:0x9cc8d8,red:0xe05a4e,
  leaf:0x8ccb6a,leaf2:0x6fb45b,leaf3:0x5ea556,white:0xf4f7fa,grey:0xc9d2dc,
  indigo:0x3b3b66,violet:0x7b5cd6,cyan:0x9eeeff,gold:0xf2c14e,snow:0xeef4fa};

// ═══ Bureau planet (papercraft) ═══

export function postOffice(){ // the kiosk: a proud little head post office
  const g=G([
    [cyl(3.0,3.3,0.5,12),C.stone,0,0.25,0],
    [box(3.4,2.2,2.8),C.cream,0,1.6,0],
    [box(0.9,1.3,0.12),C.honey,0,1.15,1.42],                 // door
    [box(1.1,0.1,0.12),C.dark,0,1.85,1.43],                  // door lintel
    [box(0.7,0.7,0.1),C.glass,-1.05,1.9,1.42],[box(0.7,0.7,0.1),C.glass,1.05,1.9,1.42], // windows
    [box(0.8,0.08,0.1),C.dark,-1.05,2.28,1.43],[box(0.8,0.08,0.1),C.dark,1.05,2.28,1.43],
    // striped awning over the door
    [box(0.34,0.06,0.6),C.red,-0.51,2.18,1.6,-0.45],[box(0.34,0.06,0.6),C.paper,-0.17,2.18,1.6,-0.45],
    [box(0.34,0.06,0.6),C.red,0.17,2.18,1.6,-0.45],[box(0.34,0.06,0.6),C.paper,0.51,2.18,1.6,-0.45],
    [cone(2.9,1.5,4),C.terra,0,3.45,0,0,Math.PI/4,0,1.25,1,1], // hipped roof
    [box(0.42,0.8,0.42),C.terra,-1.1,3.6,0],                  // chimney
    [box(0.5,0.12,0.5),C.dark,-1.1,4.02,0],
    // the envelope gable: white card + honey V-flap (this building IS mail)
    [box(1.25,0.85,0.08),C.paper,0,3.1,1.06,-0.59],
    [box(0.74,0.09,0.1),C.honey,-0.28,3.28,1.13,-0.59,0,-0.55],
    [box(0.74,0.09,0.1),C.honey,0.28,3.28,1.13,-0.59,0,0.55],
    // sign post out front
    [cyl(0.05,0.06,1.6,6),C.wood,1.8,0.8,1.5],
    [box(0.78,0.55,0.07),C.paper,1.8,1.62,1.5],
    [box(0.42,0.07,0.08),C.honey,1.64,1.68,1.54,0,0,-0.5],
    [box(0.42,0.07,0.08),C.honey,1.96,1.68,1.54,0,0,0.5],
  ],[{p:[-1.7,0.3],r:1.5},{p:[1.7,0.3],r:1.5},{p:[0,-1.4],r:1.7}]); // sides+back solid, the DOOR is open
  return g;
}

export function cottage(v=0){ // envelope-roofed post house
  const body=v?0xf6e7c9:C.cream,roof=v?0x8fae6b:C.terra;
  return G([
    [box(2.0,1.5,1.8),body,0,1.0,0],
    [cone(1.9,1.1,4),roof,0,2.3,0,0,Math.PI/4,0,1.15,1,1],
    [box(0.6,0.95,0.1),C.wood,0,0.85,0.92],
    [cyl(0.26,0.26,0.1,10),C.glass,0.55,1.45,0.88,Math.PI/2],   // porthole window
    [box(0.9,0.6,0.06),C.paper,0,2.0,0.78,-0.62],               // envelope card on the roof
    [box(0.52,0.07,0.08),C.honey,-0.2,2.13,0.83,-0.62,0,-0.55],
    [box(0.52,0.07,0.08),C.honey,0.2,2.13,0.83,-0.62,0,0.55],
    [box(0.4,0.5,0.4),roof,0.75,2.0,-0.4],                      // chimney stub
  ],[{p:[0,0],r:1.7}]);
}

export function postbox(){ // the plaza postbox — a quest landmark
  return G([
    [cyl(0.09,0.12,0.9,8),C.dark,0,0.45,0],
    [box(0.68,0.8,0.52),C.red,0,1.3,0],
    [sph(0.345,10),C.red,0,1.7,0,0,0,0,1,0.55,0.76],
    [box(0.42,0.07,0.1),C.dark,0,1.52,0.27],                    // slot
    [box(0.5,0.3,0.04),C.paper,0,1.18,0.27],                    // timetable card
    [box(0.3,0.05,0.05),C.honey,-0.07,1.24,0.3,0,0,-0.5],[box(0.3,0.05,0.05),C.honey,0.07,1.24,0.3,0,0,0.5],
  ],[{p:[0,0],r:0.9}]);
}

export function torii(){ // moon shrine gate — walk THROUGH it (pillars collide, not the span)
  const g=G([
    [cyl(0.34,0.4,0.3,8),C.stone,-1.1,0.15,0],[cyl(0.34,0.4,0.3,8),C.stone,1.1,0.15,0],
    [cyl(0.14,0.18,2.6,8),C.vermil,-1.1,1.45,0],[cyl(0.14,0.18,2.6,8),C.vermil,1.1,1.45,0],
    [box(3.1,0.2,0.26),C.vermil,0,2.45,0],
    [box(3.8,0.28,0.36),C.dark,0,2.85,0],
    [box(0.55,0.32,0.4),C.dark,-1.95,2.97,0,0,0,0.2],[box(0.55,0.32,0.4),C.dark,1.95,2.97,0,0,0,-0.2],
    [box(0.5,0.6,0.1),C.paper,0,2.05,0],                        // prayer tablet
  ],[{p:[-1.1,0],r:0.55},{p:[1.1,0],r:0.55}]);
  g.userData.sh=3.4;return g;
}

export function lantern(){
  return G([
    [box(0.5,0.25,0.5),C.stone,0,0.12,0],
    [cyl(0.09,0.12,0.7,6),C.stone,0,0.6,0],
    [box(0.44,0.4,0.44),C.paper,0,1.15,0],
    [cone(0.44,0.32,4),C.stone,0,1.5,0,0,Math.PI/4],
    [sph(0.09,6),C.honey,0,1.72,0],
  ],[{p:[0,0],r:0.55}]);
}

export function boat(){ // the paper-mail boat aground on the shore
  const g=G([
    [box(2.2,0.5,0.95),C.wood,0,0.4,0],
    [cone(0.48,0.8,4),C.wood,1.45,0.4,0,0,Math.PI/4,-Math.PI/2],
    [cone(0.48,0.8,4),C.wood,-1.45,0.4,0,0,Math.PI/4,Math.PI/2],
    [box(2.0,0.08,0.8),0xb08a60,0,0.66,0],
    [cyl(0.05,0.06,1.9,6),C.wood,0.2,1.5,0],
    [cone(0.55,1.3,3),C.paper,-0.25,1.55,0,0,0,0,1,1,0.06],     // triangular paper sail
    [box(0.3,0.18,0.04),C.red,0.2,2.4,0],
  ],[{p:[0,0],r:1.5}]);
  g.userData.sh=2.8;return g;
}

const gTree=()=>merge([
  [cyl(0.13,0.2,1.0,7),C.wood,0,0.5,0],
  [sph(0.9,9),C.leaf,0,1.65,0],
  [sph(0.62,8),C.leaf2,0.52,1.3,0.15],
  [sph(0.56,8),C.leaf3,-0.48,1.45,-0.12],
  [sph(0.4,7),C.leaf,0.1,2.15,-0.3],
]);
export function tree(s=1){ // clay-canopy garden tree
  const g=new THREE.Group();g.add(new THREE.Mesh(gTree(),mat()));
  g.userData.cols=[{p:[0,0],r:0.65*s}];g.scale.setScalar(s);return g;
}

// ═══ Arcade planet (voxel) ═══

export function arcadeCab(){ // the kiosk: a chunky arcade cabinet (screen glows)
  const g=G([
    [box(2.0,2.6,1.6),C.indigo,0,1.3,0],
    [box(0.1,2.7,1.7),C.violet,-1.03,1.32,0],[box(0.1,2.7,1.7),C.violet,1.03,1.32,0],
    [box(1.7,1.05,0.14),C.dark,0,2.15,0.78,-0.12],              // screen bezel
    [box(1.9,0.26,0.78),C.dark,0,1.5,0.95,-0.3],                // control deck
    [cyl(0.1,0.1,0.12,8),C.red,-0.4,1.62,1.07],[cyl(0.1,0.1,0.12,8),0x4d79ff,-0.12,1.58,1.16],
    [cyl(0.05,0.05,0.3,6),C.dark,0.45,1.7,1.05,-0.3],[sph(0.11,7),C.red,0.45,1.85,1.1],
    [box(2.1,0.55,0.4),C.honey,0,2.95,0.45,0.18],               // marquee
    [box(0.5,0.18,0.4),C.dark,-0.7,0.09,0.6],[box(0.5,0.18,0.4),C.dark,0.7,0.09,0.6],
    [box(0.62,0.1,0.05),C.gold,0,1.06,0.83],                    // coin plate
  ],[{p:[-1.2,0],r:1.0},{p:[1.2,0],r:1.0},{p:[0,-1.0],r:1.2}]); // the front is a doorway now
  const screen=new THREE.Mesh(box(1.42,0.8,0.05),
    new THREE.MeshStandardMaterial({color:0x0c2030,emissive:C.cyan,emissiveIntensity:0.7}));
  screen.position.set(0,2.15,0.83);screen.rotation.x=-0.12;g.add(screen);
  return g;
}

export function diceTower(){ // stacked dice, pips and all
  const pip=(x,y,z)=>[sph(0.075,6),C.dark,x,y,z];
  return G([
    [cyl(1.0,1.15,0.3,10),C.honey,0,0.15,0],
    [box(1.3,1.3,1.3),C.white,0,0.95,0],
    pip(0,0.95,0.66),                                            // one
    [box(1.05,1.05,1.05),C.white,0,2.12,0,0,0.42],
    pip(-0.25,2.32,0.5),pip(0.25,1.92,0.52),                     // two (face is yawed with the cube)
    [box(0.82,0.82,0.82),C.white,0,3.06,0,0,-0.32],
    pip(0,3.06,0.42),pip(-0.2,3.26,0.4),pip(0.2,2.86,0.4),       // three
  ],[{p:[0,0],r:1.25}]);
}

export function finishArch(){ // drive through it — only the poles collide
  const parts=[
    [cyl(0.09,0.11,2.5,7),C.dark,-1.35,1.25,0],[cyl(0.09,0.11,2.5,7),C.dark,1.35,1.25,0],
    [sph(0.13,6),C.gold,-1.35,2.55,0],[sph(0.13,6),C.gold,1.35,2.55,0],
  ];
  for(let i=0;i<4;i++)for(let j=0;j<2;j++)                       // checkered banner
    parts.push([box(0.62,0.34,0.07),(i+j)%2?C.white:0x232323,-0.93+i*0.62,2.32-j*0.34,0]);
  const g=G(parts,[{p:[-1.35,0],r:0.45},{p:[1.35,0],r:0.45}]);
  g.userData.sh=3.2;return g;
}

export function trophy(){ // the summit: terraced plinth + golden cup
  return G([
    [box(1.7,0.4,1.7),C.stone,0,0.2,0],
    [box(1.25,0.4,1.25),C.stone,0,0.6,0],
    [box(0.9,0.3,0.9),0xd9cfb4,0,0.95,0],
    [box(0.52,0.1,0.52),C.dark,0,1.15,0],
    [cyl(0.1,0.16,0.3,8),C.gold,0,1.34,0],
    [cyl(0.44,0.16,0.55,10),C.gold,0,1.74,0],
    [tor(0.2,0.045,Math.PI),C.gold,-0.5,1.78,0,0,0,Math.PI/2],
    [tor(0.2,0.045,Math.PI),C.gold,0.5,1.78,0,0,0,-Math.PI/2],
    [cyl(0.46,0.46,0.06,10),C.gold,0,2.04,0],
  ],[{p:[0,0],r:1.3}]);
}

const gPine=()=>merge([
  [cyl(0.12,0.18,0.7,7),C.wood,0,0.35,0],
  [cone(0.95,1.0,7),C.leaf3,0,1.1,0],
  [cone(0.74,0.9,7),C.leaf2,0,1.75,0],
  [cone(0.5,0.8,7),C.leaf,0,2.4,0],
]);
export function pine(s=1){ // star pines of the forest
  const g=new THREE.Group();g.add(new THREE.Mesh(gPine(),mat()));
  g.userData.cols=[{p:[0,0],r:0.7*s}];g.scale.setScalar(s);return g;
}

export function drum(){ // the beach rhythm station
  return G([
    [cyl(0.85,0.95,0.9,12),C.red,0,0.55,0],
    [cyl(0.88,0.88,0.12,12),C.paper,0,1.04,0],
    [box(0.06,0.95,0.06),C.gold,-0.85,0.55,0,0,0,0.1],[box(0.06,0.95,0.06),C.gold,0.85,0.55,0,0,0,-0.1],
    [cyl(0.03,0.03,0.6,5),C.wood,-0.3,1.35,0,0,0,0.5],[sph(0.09,6),C.cream,-0.45,1.6,0],
    [cyl(0.03,0.03,0.6,5),C.wood,0.3,1.35,0,0,0,-0.5],[sph(0.09,6),C.cream,0.45,1.6,0],
  ],[{p:[0,0],r:1.1}]);
}

// ═══ instanced set-dressing archetypes ═══
// Zootopia rule, emoji edition: the world is BUILT BY emoji-kind, so set dressing is
// 3D objects quoting emoji iconography — never a flat glyph stuck in the grass.
// Each returns a base-anchored geometry; the world instances it with yaw/scale jitter.

function starShape(R,r,n=5){const s=new THREE.Shape();
  for(let i=0;i<n*2;i++){const a=i*Math.PI/n-Math.PI/2,rad=i%2?r:R;
    i?s.lineTo(Math.cos(a)*rad,Math.sin(a)*rad):s.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);}
  s.closePath();return s;}
const starGeo=(R,r,d)=>new THREE.ExtrudeGeometry(starShape(R,r),{depth:d,bevelEnabled:false});

export const ARCH={
  tree:gTree,pine:gPine,
  flowerP:()=>{const p=[[cyl(0.03,0.045,0.5,5),C.leaf2,0,0.25,0],[sph(0.1,6),C.gold,0,0.62,0]];
    for(let i=0;i<5;i++){const a=i*1.2566;p.push([sph(0.115,6),0xf2a7c3,Math.cos(a)*0.17,0.62,Math.sin(a)*0.17]);}
    p.push([sph(0.07,5),C.leaf,0.1,0.3,0.05]);return merge(p);},
  flowerY:()=>{const p=[[cyl(0.03,0.045,0.55,5),C.leaf2,0,0.27,0],[sph(0.1,6),0x8a5e06,0,0.66,0]];
    for(let i=0;i<5;i++){const a=i*1.2566+0.6;p.push([sph(0.115,6),0xf6c84c,Math.cos(a)*0.17,0.66,Math.sin(a)*0.17]);}
    return merge(p);},
  mushroom:()=>merge([[cyl(0.1,0.14,0.34,7),0xf3e7d0,0,0.17,0],
    [sph(0.3,8),C.red,0,0.4,0,0,0,0,1,0.62,1],
    [sph(0.05,5),C.paper,0.14,0.5,0.1],[sph(0.04,5),C.paper,-0.12,0.48,-0.08],[sph(0.045,5),C.paper,0,0.55,-0.14]]),
  tuft:()=>merge([[cone(0.06,0.4,4),C.leaf,0,0.2,0],[cone(0.05,0.34,4),C.leaf2,0.09,0.17,0.04,0,0,-0.3],
    [cone(0.05,0.3,4),C.leaf3,-0.08,0.15,-0.03,0,0,0.3]]),
  rock:()=>merge([[sph(0.42,5),0xb9b2a2,0,0.22,0,0.3,0.5,0,1,0.66,0.9],[sph(0.2,5),0xa8a191,0.3,0.12,0.15,0,0.8,0]]),
  crate:()=>merge([[box(0.8,0.8,0.8),C.wood,0,0.4,0],[box(0.84,0.12,0.84),C.honey,0,0.4,0],
    [box(0.12,0.84,0.84),C.honey,0,0.4,0]]),
  starlet:()=>{const g=starGeo(0.42,0.18,0.12);g.translate(0,0.5,-0.06);
    return merge([[g,C.gold],[cyl(0.025,0.035,0.22,5),C.wood,0,0.06,0]]);},
  note:()=>merge([[sph(0.16,7),C.dark,0,0.18,0,0,0,0,1.25,0.8,1],[box(0.05,0.75,0.05),C.dark,0.16,0.55,0],
    [box(0.26,0.16,0.05),C.dark,0.27,0.86,0,0,0,-0.25]]),
  wavelet:()=>merge([[tor(0.3,0.07,Math.PI),0xbfe2ef,0,0.12,0,0,0,0.5],
    [tor(0.2,0.055,Math.PI),0xdef2f8,0.4,0.08,0.1,0,0,0.8]]),
  coin:()=>merge([[cyl(0.32,0.32,0.09,12),C.gold,0,0.4,0,Math.PI/2],
    [cyl(0.2,0.2,0.1,10),0xd9a72e,0,0.4,0,Math.PI/2]]),
  flagS:()=>merge([[cyl(0.03,0.04,1.4,5),C.dark,0,0.7,0],[sph(0.05,5),C.gold,0,1.42,0],
    [box(0.55,0.32,0.04),C.red,0.3,1.2,0]]),
  lanternS:()=>merge([[box(0.34,0.16,0.34),C.stone,0,0.08,0],[cyl(0.06,0.08,0.45,5),C.stone,0,0.39,0],
    [box(0.3,0.28,0.3),C.paper,0,0.76,0],[cone(0.3,0.2,4),C.stone,0,1.0,0,0,Math.PI/4],[sph(0.06,5),C.honey,0,1.14,0]]),
  postboxS:()=>merge([[cyl(0.06,0.08,0.6,6),C.dark,0,0.3,0],[box(0.44,0.5,0.34),C.red,0,0.85,0],
    [sph(0.22,8),C.red,0,1.1,0,0,0,0,1,0.5,0.77],[box(0.28,0.05,0.06),C.dark,0,0.98,0.17]]),
  dice:()=>merge([[box(0.55,0.55,0.55),C.white,0,0.28,0],[sph(0.05,5),C.dark,0,0.28,0.28],
    [sph(0.045,5),C.dark,0.14,0.56,0.14],[sph(0.045,5),C.dark,-0.14,0.56,-0.14]]),
  drumS:()=>merge([[cyl(0.3,0.34,0.36,10),C.red,0,0.18,0],[cyl(0.32,0.32,0.06,10),C.paper,0,0.38,0],
    [box(0.04,0.4,0.04),C.gold,-0.3,0.2,0,0,0,0.12],[box(0.04,0.4,0.04),C.gold,0.3,0.2,0,0,0,-0.12]]),
  umbrella:()=>merge([[cyl(0.025,0.035,1.3,5),C.wood,0.1,0.65,0,0,0,-0.15],
    [cone(0.75,0.4,8),C.red,0.28,1.35,0,0,0,-0.15],[cone(0.45,0.26,8),C.paper,0.31,1.5,0,0,0,-0.15],
    [sph(0.05,5),C.honey,0.36,1.68,0]]),
  sheep:()=>merge([[sph(0.36,8),C.paper,0,0.5,0,0,0,0,1.3,1,1],[sph(0.2,7),C.paper,0.28,0.72,0.18],
    [sph(0.17,7),0x4a4036,0.52,0.6,0.1],[sph(0.06,5),0x4a4036,0.6,0.72,0.18],
    [cyl(0.045,0.05,0.3,5),0x4a4036,-0.2,0.15,0.14],[cyl(0.045,0.05,0.3,5),0x4a4036,0.2,0.15,-0.14],
    [cyl(0.045,0.05,0.3,5),0x4a4036,-0.2,0.15,-0.14],[cyl(0.045,0.05,0.3,5),0x4a4036,0.28,0.15,0.14]]),
  moonlet:()=>merge([[tor(0.32,0.1,4.3),0xf2dc9a,0,0.55,0,0,0,0.9],[cyl(0.025,0.035,0.3,5),C.wood,0,0.1,0]]),
  envelope:()=>merge([[box(0.62,0.05,0.44),C.paper,0,0.04,0],
    [box(0.36,0.06,0.05),C.honey,-0.13,0.06,-0.05,0,0.5],[box(0.36,0.06,0.05),C.honey,0.13,0.06,-0.05,0,-0.5],
    [sph(0.045,5),C.red,0,0.08,0.02]]),
  target:()=>merge([[cyl(0.42,0.42,0.07,12),C.red,0,0.55,0,Math.PI/2],
    [cyl(0.3,0.3,0.08,10),C.paper,0,0.55,0,Math.PI/2],[cyl(0.16,0.16,0.09,8),C.red,0,0.55,0,Math.PI/2],
    [box(0.06,0.6,0.06),C.wood,0,0.28,-0.12,0.25]]),
};
export const ARCH_R={tree:1.0,pine:0.95,flowerP:0.22,flowerY:0.22,mushroom:0.4,tuft:0.3,rock:0.55,
  crate:0.6,starlet:0.4,note:0.35,wavelet:0,coin:0.4,flagS:0.4,lanternS:0.42,postboxS:0.5,dice:0.5,
  drumS:0.45,umbrella:0.9,sheep:0.7,moonlet:0.4,envelope:0.45,target:0.5};
export const sharedMat=mat;

// ── floating 3D icons: the language of the world, given volume (no flat glyphs in the air) ──
function iconMesh(parts){return new THREE.Mesh(merge(parts),mat());}
export const ICON={
  bubble:(s=1)=>{const m=iconMesh([[box(0.95,0.62,0.34),C.paper,0,0.31,0],
    [box(0.99,0.5,0.28),C.paper,0,0.31,0],[box(0.85,0.66,0.28),C.paper,0,0.31,0], // fattened edges — a pillow, not a slab
    [cone(0.16,0.3,4),C.paper,-0.22,-0.06,0,Math.PI,0,0],
    // the sign turns — both faces carry the "…" so no angle reads as a blank arrow
    [sph(0.06,5),C.dark,-0.22,0.31,0.18],[sph(0.06,5),C.dark,0,0.31,0.18],[sph(0.06,5),C.dark,0.22,0.31,0.18],
    [sph(0.06,5),C.dark,-0.22,0.31,-0.18],[sph(0.06,5),C.dark,0,0.31,-0.18],[sph(0.06,5),C.dark,0.22,0.31,-0.18]]);
    m.scale.setScalar(s);return m;},
  moon:(s=1)=>{const m=iconMesh([[tor(0.4,0.13,4.3),0xf6df9d,0,0,0,0,0,0.9]]);m.scale.setScalar(s);return m;},
  star:(s=1)=>{const g=starGeo(0.5,0.21,0.14);g.translate(0,-0.1,-0.07);const m=iconMesh([[g,C.gold]]);m.scale.setScalar(s);return m;},
  dice:(s=1)=>{const m=iconMesh([[box(0.6,0.6,0.6),C.white,0,0,0,0.5,0.6],[sph(0.06,5),C.dark,0,0.1,0.3],
    [sph(0.05,5),C.dark,0.3,0.15,-0.05],[sph(0.05,5),C.dark,0.2,-0.25,0.18]]);m.scale.setScalar(s);return m;},
  env:(s=1)=>{const m=iconMesh([[box(0.8,0.55,0.1),C.paper,0,0,0],
    [box(0.48,0.07,0.11),C.honey,-0.17,0.12,0.005,0,0,-0.5],[box(0.48,0.07,0.11),C.honey,0.17,0.12,0.005,0,0,0.5],
    [sph(0.06,5),C.red,0,-0.04,0.07]]);m.scale.setScalar(s);return m;},
  note:(s=1)=>{const m=iconMesh([[sph(0.2,7),C.dark,-0.18,-0.32,0,0,0,0,1.25,0.8,1],[box(0.06,0.8,0.06),C.dark,0,0.05,0],
    [box(0.3,0.18,0.06),C.dark,0.13,0.38,0,0,0,-0.25]]);m.scale.setScalar(s);return m;},
};

// ── a resident's body: emoji head rides a chibi body (citizens, not floating decals) ──
export function citizen(color){
  const g=new THREE.Group();
  g.add(new THREE.Mesh(merge([
    [cyl(0.24,0.32,0.55,8),color,0,0.66,0],
    [cyl(0.34,0.34,0.09,8),0xfff3dc,0,0.42,0],
  ]),mat()));
  g.userData.legs=[-1,1].map(s=>{
    const hip=new THREE.Group();hip.position.set(0.12*s,0.42,0);
    hip.add(new THREE.Mesh(merge([[cyl(0.08,0.1,0.34,6),0x5d5346,0,-0.17,0],
      [box(0.16,0.1,0.22),0x4a4036,0,-0.36,0.03]]),mat()));
    g.add(hip);return hip;});
  return g;
}

// ── the PLAYER body: a citizen with working arms — your emoji rides as the head (skins) ──
export function player(color){
  const white=0xf7f9fc,honey=0xe7a32b,terra=0xd8772f;
  const g=new THREE.Group();
  const m=(geo,col)=>new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:col,roughness:0.85,flatShading:true,emissive:col,emissiveIntensity:0.22}));
  const torso=m(new THREE.CylinderGeometry(0.3,0.38,0.58,10),color);torso.position.y=0.95;g.add(torso);
  const belt=m(new THREE.CylinderGeometry(0.34,0.34,0.09,10),honey);belt.position.y=0.69;g.add(belt);
  const collar=m(new THREE.CylinderGeometry(0.2,0.24,0.12,8),white);collar.position.y=1.26;g.add(collar);
  const pack=m(new THREE.BoxGeometry(0.4,0.46,0.18),white);pack.position.set(0,1.0,-0.32);g.add(pack);
  g.userData.legs=[];g.userData.arms=[];
  [-1,1].forEach(s=>{
    const hip=new THREE.Group();hip.position.set(0.15*s,0.62,0);
    const leg=m(new THREE.CylinderGeometry(0.1,0.12,0.42,8),white);leg.position.y=-0.21;hip.add(leg);
    const boot=m(new THREE.BoxGeometry(0.2,0.13,0.28),terra);boot.position.set(0,-0.46,0.04);hip.add(boot);
    g.add(hip);g.userData.legs.push(hip);
    const sho=new THREE.Group();sho.position.set(0.38*s,1.18,0);sho.rotation.z=0.2*s;
    const arm=m(new THREE.CylinderGeometry(0.075,0.085,0.4,8),color);arm.position.y=-0.22;sho.add(arm);
    const glove=m(new THREE.SphereGeometry(0.1,7,6),honey);glove.position.y=-0.46;sho.add(glove);
    g.add(sho);g.userData.arms.push(sho);
  });
  return g;
}

// ── sky: clay clouds and little flying machines (no more sky decals) ──
let _cloudMat=null; // clouds glow softly white — shared lit material turns them into floating boulders
const cloudMat=()=>_cloudMat??=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xf6f3ea,emissiveIntensity:0.55,roughness:1});
export function cloud(s=1){
  const g=merge([[sph(0.9,9),0xffffff,0,0,0],[sph(0.62,8),0xffffff,0.85,-0.12,0.1],
    [sph(0.56,8),0xffffff,-0.8,-0.1,-0.08],[sph(0.5,7),0xffffff,0.2,0.42,-0.15]]);
  const m=new THREE.Mesh(g,cloudMat());
  m.scale.setScalar(s);return m;}
export function plane(){
  return iconMesh([[cyl(0.11,0.15,0.95,7),C.red,0,0,0,Math.PI/2],[sph(0.14,7),C.paper,0,0,0.5],
    [box(1.35,0.05,0.32),C.paper,0,0.02,0.08],[box(0.5,0.05,0.2),C.paper,0,0.18,-0.42],
    [box(0.05,0.26,0.2),C.red,0,0.16,-0.45]]);}
export function comet(){
  return iconMesh([[sph(0.24,8),C.gold,0,0,0],[cone(0.17,1.0,6),0xfff3dc,0,0,-0.6,-Math.PI/2],
    [cone(0.09,0.5,5),C.paper,0.12,0.1,-0.45,-Math.PI/2]]);}

// ═══ civic life: emoji travel by the media that carry them (mail IS transit) ═══

export function mailCart(accent=C.red){ // trundles the road; +Z is the direction of travel
  const g=new THREE.Group();
  g.add(new THREE.Mesh(merge([
    [box(0.7,0.45,1.15),accent,0,0.58,0],
    [box(0.64,0.07,1.05),C.wood,0,0.83,0],
    [box(0.42,0.3,0.5),C.paper,0,0.95,0.1,0,0.25],          // the letter pile rides on top
    [box(0.36,0.24,0.42),C.paper,0.04,1.02,-0.18,0,-0.3],
    [cyl(0.03,0.03,0.55,5),C.wood,0,0.7,-0.85,0.6],          // handle out the back
  ]),mat()));
  g.userData.wheels=[[-0.38,0.26,0.4],[0.38,0.26,0.4],[-0.38,0.26,-0.4],[0.38,0.26,-0.4]].map(p=>{
    const w=new THREE.Mesh(merge([[cyl(0.26,0.26,0.09,10),C.dark,0,0,0,0,0,Math.PI/2],
      [cyl(0.09,0.09,0.11,8),C.gold,0,0,0,0,0,Math.PI/2]]),mat());
    w.position.set(...p);g.add(w);return w;});
  g.userData.cols=[];
  return g;
}

export function balloon(accent=C.red){ // tethered at the plaza edge — emoji ride the lift
  const g=new THREE.Group();
  const parts=[
    [sph(0.85,10),accent,0,2.7,0,0,0,0,1,1.15,1],
    [tor(0.86,0.06,6.3),C.gold,0,2.7,0,Math.PI/2],           // equator band
    [cone(0.32,0.3,8),accent,0,1.6,0,Math.PI],               // throat
    [box(0.52,0.42,0.52),C.wood,0,0.9,0],
    [box(0.56,0.07,0.56),C.honey,0,1.13,0],
  ];
  [[-0.22,-0.22],[0.22,-0.22],[-0.22,0.22],[0.22,0.22]].forEach(([x,z])=>
    parts.push([cyl(0.015,0.015,0.62,4),C.dark,x,1.42,z,0.12*Math.sign(z),0,-0.12*Math.sign(x)]));
  g.add(new THREE.Mesh(merge(parts),mat()));
  g.userData.cols=[];return g;
}

export function board(){ // the bulletin board: a communication species posts NOTES
  return G([
    [cyl(0.06,0.08,1.5,6),C.wood,-0.75,0.75,0],[cyl(0.06,0.08,1.5,6),C.wood,0.75,0.75,0],
    [box(1.8,1.05,0.1),0xc9a36a,0,1.42,0],
    [box(1.92,0.14,0.16),C.terra,0,2.0,0],
    [box(0.44,0.52,0.04),C.paper,-0.52,1.46,0.08,0,0,0.06],
    [box(0.48,0.38,0.04),C.paper,0.1,1.38,0.08,0,0,-0.08],
    [box(0.32,0.42,0.04),C.paper,0.62,1.5,0.08,0,0,0.1],
    [sph(0.045,5),C.red,-0.52,1.7,0.11],[sph(0.045,5),C.red,0.1,1.55,0.11],[sph(0.045,5),C.red,0.62,1.69,0.11],
    [box(0.2,0.05,0.05),C.honey,-0.58,1.5,0.11,0,0,-0.5],[box(0.2,0.05,0.05),C.honey,-0.46,1.5,0.11,0,0,0.5],
  ],[{p:[-0.75,0],r:0.4},{p:[0.75,0],r:0.4}]);
}

export function spill(kind){ // a tipped delivery crate — "what happened here?"
  const parts=[[box(0.78,0.78,0.78),C.wood,0,0.32,0,0.5,0.3,1.15],
    [box(0.82,0.12,0.82),C.honey,0,0.32,0,0.5,0.3,1.15]];
  if(kind==='coins')for(let i=0;i<5;i++){const a=i*1.9,r2=0.55+i*0.16;
    parts.push([cyl(0.16,0.16,0.05,10),C.gold,Math.cos(a)*r2+0.4,0.04,Math.sin(a)*r2,Math.PI/2,a]);}
  else for(let i=0;i<4;i++){const a=i*2.2,r2=0.6+i*0.2;
    parts.push([box(0.5,0.04,0.36),C.paper,Math.cos(a)*r2+0.4,0.03,Math.sin(a)*r2,0,a,i%2?0.06:-0.06]);}
  return G(parts,[{p:[0,0],r:0.8}]);
}

export function well(gold=false){ // the wishing well: toss a wish in, a word comes back
  return G([
    [cyl(0.95,1.08,0.7,10),C.stone,0,0.35,0],
    [cyl(0.78,0.78,0.06,10),gold?0xd9a72e:0x4a7a96,0,0.71,0],   // the water (or the coins)
    [box(0.12,1.15,0.12),C.wood,-0.82,1.1,0],[box(0.12,1.15,0.12),C.wood,0.82,1.1,0],
    [cone(1.3,0.6,4),gold?C.gold:C.terra,0,1.95,0,0,Math.PI/4],
    [cyl(0.045,0.045,1.5,5),C.wood,0,1.5,0,0,0,Math.PI/2],      // axle
    [box(0.24,0.2,0.24),C.wood,0.2,1.18,0],                      // the bucket
    [cyl(0.015,0.015,0.35,4),C.dark,0.2,1.38,0],
  ],[{p:[0,0],r:1.35}]);
}

// ═══ INTERIORS: you can walk INSIDE the civic buildings (Stardew rule) ═══
let _glow=null;
const glowMat=()=>_glow??=new THREE.MeshStandardMaterial({color:0xfff2cc,emissive:0xffe9b0,emissiveIntensity:1.0});

export function postOfficeRoom(){ // the sorting hall: cubbies, counter, warm lamps
  const g=new THREE.Group();
  const W=13,D=10,H=4.6,wood=0xcaa46e,wall=0xf3e7cf,trim=0xb98a4e;
  const parts=[
    [box(W,0.24,D),wood,0,-0.12,0],
    [box(W,H,0.3),wall,0,H/2,-D/2],
    [box(0.3,H,D),wall,-W/2,H/2,0],[box(0.3,H,D),wall,W/2,H/2,0],
    [box(W/2-1.1,H,0.3),wall,-(W/4+0.55),H/2,D/2],[box(W/2-1.1,H,0.3),wall,(W/4+0.55),H/2,D/2],
    [box(2.2,H-3.0,0.3),wall,0,H-0.8,D/2],                     // lintel over the door gap
    [box(W,0.24,D),0xe8d9bd,0,H,0],
    [box(W,0.5,0.12),trim,0,0.85,-D/2+0.21],[box(0.12,0.5,D),trim,-W/2+0.21,0.85,0],[box(0.12,0.5,D),trim,W/2-0.21,0.85,0],
    [box(7,1.05,1.1),0xa97c4b,0,0.52,-1.9],[box(7.5,0.14,1.4),C.honey,0,1.12,-1.9], // the counter
    [sph(0.12,7),C.gold,1.8,1.27,-1.9],                        // the desk bell
    [cyl(2.4,2.4,0.05,16),C.red,0,0.03,1.4],                   // the rug
    [box(1.1,1.1,1.1),C.wood,-5.1,0.55,-3.4],[box(0.8,0.8,0.8),C.wood,-4.3,0.4,-3.8,0,0.5], // parcels
    [cyl(0.34,0.4,0.5,8),0x8a5a35,5.4,0.25,-3.6],[sph(0.55,8),C.leaf,5.4,0.9,-3.6],          // the office plant
  ];
  for(let cx=0;cx<6;cx++)for(let cy=0;cy<3;cy++){ // the cubby wall of sorted mail
    parts.push([box(0.78,0.6,0.4),trim,-2.2+cx*0.88,1.7+cy*0.72,-D/2+0.45]);
    parts.push([box(0.6,0.42,0.34),C.paper,-2.2+cx*0.88,1.68+cy*0.72,-D/2+0.52]);
  }
  g.add(new THREE.Mesh(merge(parts),mat()));
  [[-W/2+0.16,2.6,-1.5],[W/2-0.16,2.6,1.5]].forEach(([x,y,z])=>{ // warm windows
    const win=new THREE.Mesh(box(0.14,1.7,2.3),glowMat());win.position.set(x,y,z);g.add(win);});
  [-2.6,2.6].forEach(x=>{ // hanging lamps
    const lamp=new THREE.Mesh(merge([[cone(0.5,0.4,8),C.terra,0,0,0],[cyl(0.02,0.02,1.2,4),C.dark,0,0.75,0]]),mat());
    lamp.position.set(x,H-1.0,0);g.add(lamp);
    const bulb=new THREE.Mesh(sph(0.18,8),glowMat());bulb.position.set(x,H-1.28,0);g.add(bulb);});
  const pt=new THREE.PointLight(0xffe9c0,1.5,20,1.4);pt.position.set(0,H-1.2,0.5);g.add(pt);
  g.userData={w:W,d:D,counter:[0,-1.9],doorHalf:1.1};
  return g;
}

export function arcadeRoom(){ // the dim hall: neon trim, a cabinet row goes in front of the back wall
  const g=new THREE.Group();
  const W=13,D=10,H=4.6,floor=0x2c2c4e,wall=0x363662;
  const parts=[
    [box(W,0.24,D),floor,0,-0.12,0],
    [box(W,H,0.3),wall,0,H/2,-D/2],
    [box(0.3,H,D),wall,-W/2,H/2,0],[box(0.3,H,D),wall,W/2,H/2,0],
    [box(W/2-1.1,H,0.3),wall,-(W/4+0.55),H/2,D/2],[box(W/2-1.1,H,0.3),wall,(W/4+0.55),H/2,D/2],
    [box(2.2,H-3.0,0.3),wall,0,H-0.8,D/2],
    [box(W,0.24,D),0x232342,0,H,0],
    [cyl(2.6,2.6,0.05,16),0x4b3a78,0,0.03,1.2],                 // the violet carpet
    [sph(0.8,9),C.red,-4.8,0.45,2.6,0,0,0,1,0.62,1],[sph(0.8,9),0x4d79ff,4.8,0.45,2.2,0,0,0,1,0.62,1], // beanbags
    [box(3.2,0.18,0.6),0x4b3a78,4.9,2.2,-3.0,0,Math.PI/2],      // the prize shelf
    [cyl(0.16,0.3,0.4,8),C.gold,4.9,2.55,-3.6],[cyl(0.14,0.26,0.34,8),C.gold,4.9,2.5,-2.4],
  ];
  g.add(new THREE.Mesh(merge(parts),mat()));
  const neon=(col,x,y,z,w2,h2,d2)=>{const m=new THREE.Mesh(box(w2,h2,d2),
    new THREE.MeshStandardMaterial({color:0x101020,emissive:col,emissiveIntensity:1.3}));
    m.position.set(x,y,z);g.add(m);};
  neon(0x9eeeff,0,3.7,-D/2+0.2,W-1,0.12,0.1);                   // cyan band on the back wall
  neon(0xff7bd5,-W/2+0.2,3.7,0,0.1,0.12,D-1);neon(0xff7bd5,W/2-0.2,3.7,0,0.1,0.12,D-1);
  neon(0x9eeeff,0,0.18,D/2-0.6,2.4,0.06,0.12);                  // door strip
  const pt=new THREE.PointLight(0xb9a4ff,1.3,20,1.4);pt.position.set(0,H-1.2,0.5);g.add(pt);
  g.userData={w:W,d:D,counter:[0,-2.3],doorHalf:1.1};
  return g;
}

export function bumpBlock(){ // ❓ block you bump from below — a real golden cube now
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  x.fillStyle='#f2b21e';x.fillRect(0,0,64,64);
  x.fillStyle='#fadc7a';x.fillRect(0,0,64,6);x.fillRect(0,0,6,64);
  x.fillStyle='#9a6a08';x.fillRect(58,0,6,64);x.fillRect(0,58,64,6);
  [[10,10],[50,10],[10,50],[50,50]].forEach(([px,py])=>{x.fillStyle='#8a5e06';x.fillRect(px-3,py-3,6,6);});
  x.fillStyle='#fff6e0';x.font='bold 40px monospace';x.textAlign='center';x.textBaseline='middle';x.fillText('?',32,35);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;
  const g=new THREE.Group();
  g.add(new THREE.Mesh(box(1.0,1.0,1.0),new THREE.MeshStandardMaterial({map:t,roughness:0.8})));
  g.userData.cols=[];return g;
}

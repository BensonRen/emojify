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
  ],[{p:[0,0],r:3.0}]);
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

export function tree(s=1){ // clay-canopy garden tree
  const g=G([
    [cyl(0.13,0.2,1.0,7),C.wood,0,0.5,0],
    [sph(0.9,9),C.leaf,0,1.65,0],
    [sph(0.62,8),C.leaf2,0.52,1.3,0.15],
    [sph(0.56,8),C.leaf3,-0.48,1.45,-0.12],
    [sph(0.4,7),C.leaf,0.1,2.15,-0.3],
  ],[{p:[0,0],r:0.65*s}]);
  g.scale.setScalar(s);return g;
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
  ],[{p:[0,0],r:2.0}]);
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

export function pine(s=1){ // star pines of the forest
  const g=G([
    [cyl(0.12,0.18,0.7,7),C.wood,0,0.35,0],
    [cone(0.95,1.0,7),C.leaf3,0,1.1,0],
    [cone(0.74,0.9,7),C.leaf2,0,1.75,0],
    [cone(0.5,0.8,7),C.leaf,0,2.4,0],
  ],[{p:[0,0],r:0.7*s}]);
  g.scale.setScalar(s);return g;
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

import fs from 'fs';
globalThis.self = globalThis;
import * as THREE from 'three';
import { GLTFLoader } from './frontend/node_modules/three/examples/jsm/loaders/GLTFLoader.js';

const buf = fs.readFileSync('C:/Users/aicam/.gemini/antigravity/brain/432fc7df-1796-4cdb-b73b-fc2c3d322f06/scratch/hand_model.glb');
const loader = new GLTFLoader();
loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (gltf) => {
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const action = mixer.clipAction(gltf.animations.find(a => a.name === 'RigAction'));
  action.play();
  mixer.setTime(6.0);
  gltf.scene.updateMatrixWorld(true);
  
  let handMesh;
  gltf.scene.traverse(o => { if (o.name === 'Hand') handMesh = o; });
  
  const posAttr = handMesh.geometry.attributes.position;
  const normalAttr = handMesh.geometry.attributes.normal;
  const skinWeight = handMesh.geometry.attributes.skinWeight;
  const skinIndex = handMesh.geometry.attributes.skinIndex;
  const skeleton = handMesh.skeleton;
  skeleton.update();
  
  const skinnedPositions = [];
  const skinnedNormals = [];
  
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const skinnedV = new THREE.Vector3();
  const skinnedN = new THREE.Vector3();
  const targetV = new THREE.Vector3();
  const targetN = new THREE.Vector3();
  
  for (let i = 0; i < posAttr.count; i++) {
    targetV.set(0, 0, 0);
    targetN.set(0, 0, 0);
    v.fromBufferAttribute(posAttr, i);
    n.fromBufferAttribute(normalAttr, i);
    
    for (let j = 0; j < 4; j++) {
      const weight = skinWeight.getComponent(i, j);
      if (weight === 0) continue;
      const boneIndex = skinIndex.getComponent(i, j);
      const m = new THREE.Matrix4().fromArray(skeleton.boneMatrices, boneIndex * 16);
      
      skinnedV.copy(v).applyMatrix4(m).multiplyScalar(weight);
      targetV.add(skinnedV);
      
      skinnedN.copy(n).transformDirection(m).multiplyScalar(weight);
      targetN.add(skinnedN);
    }
    
    targetV.applyMatrix4(handMesh.matrixWorld);
    targetN.transformDirection(handMesh.matrixWorld).normalize();
    
    skinnedPositions.push(targetV.x, targetV.y, targetV.z);
    skinnedNormals.push(targetN.x, targetN.y, targetN.z);
  }
  
  const indices = Array.from(handMesh.geometry.index.array);
  
  const data = {
    positions: skinnedPositions,
    normals: skinnedNormals,
    indices: indices,
  };
  
  fs.writeFileSync('scratch/skinned_hand_data.json', JSON.stringify(data));
  console.log('Saved scratch/skinned_hand_data.json. Vertices:', posAttr.count, 'Triangles:', indices.length / 3);
});


import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const v3 = (array) => new THREE.Vector3(...array);
const smooth = (value) => value * value * (3 - 2 * value);
const physical = (color, roughness = 0.75, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

function canvasTexture(draw, width = 1024, height = width) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function newspaperTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#e8e2ce'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3c3d37'; ctx.font = 'bold 95px Georgia'; ctx.textAlign = 'center';
    ctx.fillText('THE DAILY WORLD', w / 2, 116);
    ctx.fillRect(50, 145, w - 100, 5);
    ctx.font = '22px Georgia'; ctx.fillText('SCIENCE  ·  CULTURE  ·  EVERYDAY LIFE', w / 2, 184);
    ctx.textAlign = 'left'; ctx.font = 'bold 48px Georgia'; ctx.fillText('A different perspective', 52, 265);
    ctx.fillStyle = '#8f9789'; ctx.fillRect(52, 306, 430, 247);
    ctx.fillStyle = '#b4b6a2'; ctx.beginPath(); ctx.moveTo(52, 553); ctx.lineTo(180, 376); ctx.lineTo(325, 480); ctx.lineTo(482, 395); ctx.lineTo(482, 553); ctx.fill();
    for (let col = 0; col < 4; col++) {
      for (let line = 0; line < 43; line++) {
        if (col < 2 && line < 16) continue;
        const x = 52 + col * 235, y = 309 + line * 14;
        ctx.fillStyle = line % 8 === 0 ? '#55564c' : '#77776b';
        ctx.fillRect(x, y, 180 + ((line * 31 + col * 13) % 36), 3);
      }
    }
  }, 1024, 1365);
}

function floorTexture() {
  return canvasTexture((ctx, w, h) => {
    let seed = 17;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    ctx.fillStyle = '#6c503a'; ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 10; row++) {
      const y = row * h / 10;
      const offset = row % 2 ? -w / 3 : 0;
      for (let col = 0; col < 4; col++) {
        const x = offset + col * w / 3;
        const tone = Math.floor(random() * 22);
        ctx.fillStyle = `rgb(${126 + tone},${91 + tone},${62 + tone})`;
        ctx.fillRect(x + 1, y + 1, w / 3 - 2, h / 10 - 2);
        for (let grain = 0; grain < 65; grain++) {
          ctx.strokeStyle = `rgba(55,32,16,${0.025 + random() * 0.06})`;
          const gy = y + random() * h / 10;
          ctx.beginPath(); ctx.moveTo(x, gy); ctx.bezierCurveTo(x + 100, gy - 3, x + 200, gy + 3, x + w / 3, gy); ctx.stroke();
        }
      }
    }
  });
}

export class RoomView {
  static async create(canvas, manifest, manifestURL, progress) {
    const context = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true });
    if (!context) throw Object.assign(new Error('WebGL 2 unavailable'), { code: 'WEBGL_UNAVAILABLE' });
    const room = new RoomView(canvas, context, manifest);
    try {
      await room.loadModels(manifestURL, progress);
      room.buildRoom();
      return room;
    } catch (error) { room.dispose(); throw error; }
  }

  constructor(canvas, context, manifest) {
    this.canvas = canvas;
    this.manifest = manifest;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#d9d6cb');
    this.camera = new THREE.PerspectiveCamera(65, 1, 0.04, 45);
    this.camera.rotation.order = 'YXZ';
    this.renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.props = new Map();
    this.doors = new Map();
    this.entities = new Map();
    this.templates = {};
    this.extraResources = [];
    this.disposed = false;
    this.lookYaw = 0; this.lookPitch = 0;
    this.lastCameraPosition = v3(manifest.anchors.start.position);
    this.baseQuaternion = new THREE.Quaternion();
    this.resizeObserver = new ResizeObserver(() => { this.resize(); this.onDirty?.(); });
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
  }

  async loadModels(manifestURL, progress) {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_, loaded, total) => progress(Math.min(95, Math.round(loaded / total * 95)));
    const loader = new GLTFLoader(manager);
    const results = await Promise.allSettled(Object.entries(this.manifest.models).map(async ([key, path]) => {
      const gltf = await loader.loadAsync(new URL(path, manifestURL).href);
      this.templates[key] = gltf.scene;
    }));
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
    progress(100);
  }

  resize() {
    if (this.disposed) return;
    if (!this.canvas.parentElement) return;
    const width = Math.max(1, this.canvas.parentElement.clientWidth);
    const height = Math.max(1, this.canvas.parentElement.clientHeight);
    if (width === this.viewWidth && height === this.viewHeight) return;
    this.viewWidth = width; this.viewHeight = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // Resizing clears the drawing buffer, including while playback is paused.
    if (this.lastClock) this.draw(this.lastClock);
  }

  box(size, material, position = [0, 0, 0], parent = this.scene) {
    const object = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    object.position.fromArray(position); object.castShadow = true; object.receiveShadow = true;
    parent.add(object); return object;
  }

  mesh(geometry, material, position, parent = this.scene) {
    const object = new THREE.Mesh(geometry, material);
    object.position.fromArray(position); object.castShadow = true; object.receiveShadow = true;
    parent.add(object); return object;
  }

  fitModel(template, item) {
    const model = template.clone(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -bounds.min.y, -center.z);
    const normalized = new THREE.Group(); normalized.add(model);
    normalized.scale.set(item.size[0] / size.x, item.size[1] / size.y, item.size[2] / size.z);
    const wrapper = new THREE.Group(); wrapper.add(normalized);
    wrapper.position.fromArray(item.position); wrapper.rotation.y = item.rotation || 0;
    wrapper.name = item.id;
    wrapper.traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
    this.scene.add(wrapper); this.entities.set(item.id, wrapper);
    return wrapper;
  }

  buildRoom() {
    const cream = physical('#d9d4c6', .92), trim = physical('#c5bba7', .7);
    const wood = physical('#5e4630', .65), metal = physical('#3b3934', .35, .65);
    const tiled = ['kitchen','bathroom'].includes(this.manifest.theme);
    const floorMap = tiled ? canvasTexture((ctx,w,h)=>{
      ctx.fillStyle='#c6cecb';ctx.fillRect(0,0,w,h);
      const size=w/4;
      for(let y=0;y<4;y++)for(let x=0;x<4;x++){
        ctx.fillStyle=(x+y)%2?'#d7ddd8':'#e2e6de';ctx.fillRect(x*size+2,y*size+2,size-4,size-4);
      }
    }) : floorTexture(); floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping; floorMap.repeat.set(3, 3);
    this.extraResources.push(floorMap);
    const floor = this.mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshStandardMaterial({ map: floorMap, roughness: .63 }), [0, -.015, 0]);
    floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
    [[10,3.1,.12,0,1.55,-4.55],[10,3.1,.12,0,1.55,4.55],[.12,3.1,9,-5.05,1.55,0],[.12,3.1,9,5.05,1.55,0]].forEach(([w,h,d,x,y,z]) => {
      const wall = this.box([w,h,d], cream, [x,y,z]); wall.castShadow = false;
    });
    this.box([10,.09,.05],trim,[0,.06,-4.46]); this.box([10,.09,.05],trim,[0,.06,4.46]);
    this.box([.05,.09,9],trim,[-4.96,.06,0]); this.box([.05,.09,9],trim,[4.96,.06,0]);
    this.box([10,.08,9],physical('#e5e0d4',.95),[0,3.15,0]).castShadow = false;

    // Window and soft daylight, outside the scripted camera paths.
    const glass = new THREE.MeshStandardMaterial({ color: '#d3e4e6', emissive: '#b4c9ce', emissiveIntensity: .5, roughness: .25 });
    this.box([.035,1.65,2.2],glass,[-4.96,1.95,1.2]);
    [[-4.92,1.1,1.2,.06,.09,2.38],[-4.92,2.8,1.2,.06,.09,2.38],[-4.92,1.95,.08,.06,1.8,.08],[-4.92,1.95,2.32,.06,1.8,.08],[-4.91,1.95,1.2,.08,1.7,.045]].forEach(([x,y,z,w,h,d])=>this.box([w,h,d],trim,[x,y,z]));
    const day = new THREE.DirectionalLight('#fff3db', 3.2);
    day.position.set(-3.6, 3.5, 1.4); day.target.position.set(1,0,-1);
    day.castShadow = true; day.shadow.mapSize.set(2048,2048);
    Object.assign(day.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:18});
    day.shadow.normalBias=.025; day.shadow.bias=-.00015;
    this.scene.add(day,day.target,new THREE.HemisphereLight('#e5edf0','#82715b',2.2));
    const fill = new THREE.PointLight('#ffe4bf',15,12,2); fill.position.set(0,2.75,-.5); this.scene.add(fill);
    // Local environment capture supplies reflections without external HDRI requests.
    const environment = new THREE.Scene();
    environment.add(new THREE.Mesh(new THREE.BoxGeometry(12,8,12),new THREE.MeshBasicMaterial({color:'#bdb7a6',side:THREE.BackSide})));
    const envWindow = new THREE.Mesh(new THREE.PlaneGeometry(4,3),new THREE.MeshBasicMaterial({color:'#ffffff'}));
    envWindow.position.set(-5,2,0); envWindow.rotation.y=Math.PI/2; environment.add(envWindow);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environmentTarget = pmrem.fromScene(environment,.02); this.scene.environment=this.environmentTarget.texture;
    pmrem.dispose(); environment.traverse(obj=>{obj.geometry?.dispose();obj.material?.dispose();});

    if (!tiled) {
    // A muted woven rug, with a low profile so the camera stays in free space.
    const rugMap = canvasTexture((ctx,w,h)=>{
      ctx.fillStyle='#958c76';ctx.fillRect(0,0,w,h);
      for(let i=0;i<1024;i+=3){ctx.fillStyle=i%2?'#8b836f':'#a49b85';ctx.fillRect(0,i,w,1)}
      ctx.strokeStyle='#d1c6a9';ctx.lineWidth=18;ctx.strokeRect(30,30,w-60,h-60);
      ctx.lineWidth=3;ctx.strokeRect(52,52,w-104,h-104);
    }); this.extraResources.push(rugMap);
    const rug = this.mesh(new THREE.PlaneGeometry(4.1,3.2),new THREE.MeshStandardMaterial({map:rugMap,roughness:1}),[0,.005,.6]); rug.rotation.x=-Math.PI/2; rug.castShadow=false;

    }

    this.manifest.furniture.forEach(item=>{
      if(this.templates[item.kind]) this.fitModel(this.templates[item.kind],item);
      else this.buildEntity(item);
      if (item.kind === 'table') {
        const label = canvasTexture((ctx,w,h)=>{
          ctx.fillStyle='#5e4933';ctx.fillRect(0,0,w,h);
          ctx.fillStyle='#eee2c8';ctx.textAlign='center';ctx.textBaseline='middle';
          ctx.font='54px monospace';ctx.fillText(item.id.toUpperCase(),w/2,h/2);
        },512,128);
        this.extraResources.push(label);
        const side = Math.sign(item.position[0]);
        const plaque=this.mesh(new THREE.PlaneGeometry(.34,.085),new THREE.MeshStandardMaterial({map:label,roughness:.9}),[item.position[0]-side*(item.size[0]/2+.005),.63,item.position[2]]);
        plaque.rotation.y=-side*Math.PI/2;
      }
    });
    this.manifest.drawerBanks.forEach(bank=>{
      const [x,,z]=bank.position;
      this.box([.85,1.9,.55],wood,[x,.95,z]);
      for(let i=0;i<bank.count;i++){
        const id=`drawer ${bank.first+i}`,y=.15+i*.25;
        const front=this.box([.78,.22,.04],physical(i%2?'#755a3d':'#806348',.62),[x,y,z+.3]);
        this.box([.18,.025,.04],metal,[x,y,z+.34]);this.entities.set(id,front);
      }
    });
    if (!tiled) {
    // Subtle wall artwork and skirting give scale to the first-person room.
    const art=canvasTexture((ctx,w,h)=>{ctx.fillStyle='#c0b49a';ctx.fillRect(0,0,w,h);ctx.fillStyle='#6e7d70';ctx.fillRect(100,320,820,620);ctx.fillStyle='#dad0b8';ctx.beginPath();ctx.arc(650,320,190,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9a785f';ctx.fillRect(60,650,900,200);});
    this.extraResources.push(art);
    this.box([1.35,1.0,.06],wood,[.2,2.25,-4.44]);
    this.box([1.21,.86,.015],new THREE.MeshStandardMaterial({map:art,roughness:.9}),[.2,2.25,-4.398]);
    }
    for(const [id,slot] of Object.entries(this.manifest.objectSlots)) {
      const object=this.makeProp(slot.kind);
      object.name=id; object.position.fromArray(slot.position);object.visible=true;
      this.scene.add(object);this.props.set(id,object);
    }
    this.newspaper=this.props.get('newspaper 1');
    this.resize();
  }

  buildEntity(item) {
    const group = new THREE.Group(); group.name = item.id;
    group.position.fromArray(item.position); group.rotation.y = item.rotation || 0;
    this.scene.add(group); this.entities.set(item.id,group);
    const [w,h,d] = item.size;
    const wood = physical('#a58a69',.7), white = physical('#e6e6df',.35), metal = physical('#868f8d',.3,.6), dark = physical('#343b39',.55);
    const box = (size,mat,pos) => this.box(size,mat,pos,group);
    if (['cabinet','fridge'].includes(item.kind)) {
      const shell = item.kind==='fridge'?white:wood;
      box([w,h,.05],shell,[0,h/2,-d/2]);
      box([.045,h,d],shell,[-w/2,h/2,0]);box([.045,h,d],shell,[w/2,h/2,0]);
      box([w,.045,d],shell,[0,h,0]);box([w,.045,d],shell,[0,.02,0]);
      box([w,.03,d-.05],white,[0,h*.35,0]);
      if(h>1.2)box([w,.03,d-.05],white,[0,h*.65,0]);
      if(item.openable){
        const hinge = new THREE.Group(); hinge.position.set(-w/2,0,d/2);group.add(hinge);
        this.box([w,h,.055],shell,[w/2,h/2,0],hinge);
        this.box([.035,Math.min(.32,h*.35),.05],metal,[w-.10,h*.55,.055],hinge);
        this.doors.set(item.id,{hinge,initialOpen:item.initialOpen});
      }
    } else if (item.kind==='microwave') {
      box([w,1,.75],wood,[0,-.51,0]);
      box([w,h,.04],white,[0,h/2,-d/2]);box([w,.04,d],white,[0,h,0]);box([w,.04,d],white,[0,0,0]);
      box([.04,h,d],white,[-w/2,h/2,0]);box([.04,h,d],white,[w/2,h/2,0]);
      const hinge=new THREE.Group();hinge.position.set(-w/2,0,d/2+.03);group.add(hinge);
      this.box([w*.9,h*.95,.035],white,[w*.45,h/2,0],hinge);
      this.box([w*.73,h*.68,.025],dark,[w*.40,h*.53,.025],hinge);
      this.box([.055,h*.55,.055],metal,[w*.78,h*.5,.06],hinge);
      this.doors.set(item.id,{hinge,initialOpen:item.initialOpen});
      this.mesh(new THREE.CylinderGeometry(.03,.03,.03,16),dark,[w*.43,h*.28,d/2+.03],group).rotation.x=Math.PI/2;
    } else if (item.kind==='counter'||item.kind==='dresser'||item.kind==='stove') {
      box([w,h-.06,d],wood,[0,(h-.06)/2,0]);box([w+.05,.065,d+.05],physical('#d3d2c6',.35),[0,h-.02,0]);
      for(let i=0;i<3;i++){box([w-.06,.012,.025],dark,[0,h*(.22+i*.24),d/2+.015]);box([.22,.025,.05],metal,[0,h*(.3+i*.24),d/2+.04]);}
      if(item.kind==='stove'){
        this.mesh(new THREE.TorusGeometry(.22,.022,8,32),dark,[0,h+.02,0],group).rotation.x=Math.PI/2;
        this.mesh(new THREE.TorusGeometry(.12,.012,8,24),dark,[0,h+.02,0],group).rotation.x=Math.PI/2;
      }
    } else if(item.kind==='sink'){
      box([w,h-.12,d],wood,[0,(h-.12)/2,0]);box([w+.03,.11,d+.03],white,[0,h-.055,0]);
      const basin=this.mesh(new THREE.SphereGeometry(1,24,16),metal,[0,h+.01,0],group);basin.scale.set(w*.35,.06,d*.32);
      this.mesh(new THREE.CylinderGeometry(.018,.018,.25,12),metal,[0,h+.12,-d*.32],group);
      box([.035,.035,.2],metal,[0,h+.24,-d*.23]);
    } else if(item.kind==='toilet'){
      box([w*.8,h*.68,.24],white,[0,h*.66,-d*.34]);
      this.mesh(new THREE.CylinderGeometry(w*.23,w*.18,h*.45,24),white,[0,h*.23,d*.12],group);
      const bowl=this.mesh(new THREE.SphereGeometry(1,32,18),white,[0,h*.52,d*.08],group);bowl.scale.set(w*.48,h*.22,d*.48);
      const seat=this.mesh(new THREE.TorusGeometry(w*.29,.045,12,32),physical('#d3d6cf',.25),[0,h*.7,d*.12],group);seat.rotation.x=-Math.PI/2;seat.scale.y=1.2;
    } else if(item.kind==='bath'){
      box([w,h,d],white,[0,h/2,0]);box([w*.78,.015,d*.82],physical('#aebec0',.25),[0,h+.01,0]);
      this.mesh(new THREE.CylinderGeometry(.025,.025,.25,12),metal,[w*.3,h+.12,-d*.35],group);
    } else if(item.kind==='bed'||item.kind==='seat'){
      box([w,h*.45,d],wood,[0,h*.24,0]);box([w*.97,h*.48,d*.97],physical('#c6cdc2',.95),[0,h*.71,0]);
      if(item.kind==='bed'){
        box([w,.75,.10],wood,[0,.65,-d/2]);box([w*.9,.09,d*.52],physical('#7b8c83',.97),[0,h+.02,d*.18]);
        box([w*.6,.12,.4],physical('#e8e4d8',.95),[0,h+.1,-d*.32]);
      } else box([w,.55,.18],physical('#9ba79b',.95),[0,h+.2,-d/2]);
    } else if(item.kind==='machine'){
      box([w,.95,d],wood,[0,-.475,0]);box([w,h,d],dark,[0,h/2,0]);box([w*.55,h*.5,.02],metal,[0,h*.45,d/2+.015]);
    } else if(item.kind==='bin'){
      this.mesh(new THREE.CylinderGeometry(w*.48,w*.38,h,24),dark,[0,h/2,0],group);
    } else {
      box([w,h,d],wood,[0,h/2,0]);
    }
    const label=canvasTexture((ctx,width,height)=>{ctx.fillStyle='#ede9de';ctx.fillRect(0,0,width,height);ctx.fillStyle='#4d504a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 36px monospace';ctx.fillText(item.id.toUpperCase(),width/2,height/2);},512,96);
    this.extraResources.push(label);
    this.mesh(new THREE.PlaneGeometry(Math.min(.65,w*.75),.10),new THREE.MeshStandardMaterial({map:label,roughness:.9}),[0,Math.max(.12,h*.22),d/2+.065],group);
    return group;
  }

  makeProp(kind) {
    const group=new THREE.Group();
    const black=physical('#242827',.38,.15),silver=physical('#a3a7a4',.3,.65),paper=physical('#e9e1cd',.95);
    if(kind==='newspaper'){
      const texture=newspaperTexture();this.extraResources.push(texture);
      const top=new THREE.MeshStandardMaterial({map:texture,roughness:.95});
      this.box([.42,.006,.30],[paper,paper,top,paper,paper,paper],[0,0,0],group);
      this.box([.415,.002,.296],paper,[.002,-.005,.003],group);
    } else if(kind==='book'){
      this.box([.22,.055,.28],physical('#3b535a'),[0,0,0],group);
      this.box([.205,.043,.263],paper,[.003,.002,.003],group);
      this.box([.22,.005,.28],physical('#3b535a'),[0,.027,0],group);
    } else if(kind==='phone'||kind==='remote'){
      this.box([kind==='phone'?.075:.045,.015,.145],black,[0,0,0],group);
      if(kind==='phone')this.box([.065,.001,.121],physical('#293b3c',.15,.2),[0,.009,0],group);
      else for(let i=0;i<5;i++)this.box([.025,.003,.011],silver,[0,.01,-.045+i*.022],group);
    } else if(kind==='tv'){
      this.box([.94,.54,.055],black,[0,.38,0],group);
      this.box([.88,.48,.006],physical('#172529',.18,.3),[0,.38,.031],group);
      this.box([.04,.18,.04],black,[0,.08,0],group);this.box([.38,.018,.18],black,[0,.01,.02],group);
    } else if(kind==='lamp'){
      this.mesh(new THREE.CylinderGeometry(.12,.12,.022,24),black,[0,.012,0],group);
      this.mesh(new THREE.CylinderGeometry(.012,.012,.34,12),silver,[0,.18,0],group);
      this.mesh(new THREE.ConeGeometry(.15,.19,32,1,true),physical('#d4c4a0',.9),[0,.39,0],group);
    } else if(kind==='statue'){
      const bronze=physical('#7c775a',.55,.4);
      this.mesh(new THREE.CylinderGeometry(.085,.1,.05,20),bronze,[0,.025,0],group);
      this.mesh(new THREE.SphereGeometry(.10,16,12),bronze,[0,.15,0],group).scale.set(.75,1,.65);
      this.mesh(new THREE.SphereGeometry(.055,16,12),bronze,[0,.28,0],group);
    } else if(kind==='card'){
      this.box([.086,.002,.054],physical('#6c7e71',.5),[0,0,0],group);
      this.box([.014,.001,.012],physical('#c8b981',.3,.6),[-.022,.002,0],group);
    } else if(kind==='laptop'){
      this.box([.3,.018,.22],silver,[0,0,0],group);
      this.box([.298,.004,.216],physical('#333b3e',.45,.4),[0,.012,0],group);
    } else if(kind==='pillow'){
      this.mesh(new THREE.SphereGeometry(1,24,16),physical('#bba57c',1),[0,0,0],group).scale.set(.23,.1,.2);
    } else if(kind==='keys'){
      this.mesh(new THREE.TorusGeometry(.025,.004,8,18),silver,[0,.01,0],group).rotation.x=Math.PI/2;
      this.box([.015,.006,.065],silver,[.012,.01,.05],group);
    }
    if(!group.children.length){
      const kindColor={egg:'#eee6ce',tomato:'#a94f3c',potato:'#b18a50',lettuce:'#72936a',apple:'#9aaa65',bread:'#ad7a42'};
      if(kind==='egg'||kindColor[kind]){
        const mesh=this.mesh(new THREE.SphereGeometry(.075,20,14),physical(kindColor[kind]||'#b6b6a5',.8),[0,.07,0],group);
        mesh.scale.set(kind==='bread'?1.7:1,kind==='egg'?1.35:.85,kind==='bread'?1.2:1);
      }else if(['spray','bottle'].includes(kind)){
        const body=physical(kind==='spray'?'#5d9da3':'#a6bdad',.4);
        this.mesh(new THREE.CylinderGeometry(.045,.055,.18,16),body,[0,.09,0],group);
        this.box([.045,.06,.045],black,[0,.21,0],group);
        if(kind==='spray')this.box([.10,.03,.04],black,[.018,.245,0],group);
      }else if(['plate','bowl','pan','pot'].includes(kind)){
        this.mesh(new THREE.CylinderGeometry(.13,.10,kind==='pot'?.10:.025,24),kind==='pan'||kind==='pot'?silver:paper,[0,.025,0],group);
        if(kind==='pan')this.box([.20,.025,.035],black,[.20,.03,0],group);
      }else if(kind==='cup'){
        this.mesh(new THREE.CylinderGeometry(.06,.048,.14,20),paper,[0,.07,0],group);
        const handle=this.mesh(new THREE.TorusGeometry(.04,.009,8,16),paper,[.065,.08,0],group);handle.rotation.y=Math.PI/2;
      }else if(kind==='utensil'||kind==='pen'||kind==='pencil'){
        this.box([.018,.012,.22],kind==='utensil'?silver:black,[0,.01,0],group);
      }else if(kind==='candle'||kind==='roll'){
        this.mesh(new THREE.CylinderGeometry(.06,.06,.11,20),paper,[0,.055,0],group);
      }else if(kind==='mirror'){
        this.box([.17,.23,.025],silver,[0,.12,0],group);
      }else if(kind==='clock'){
        this.mesh(new THREE.CylinderGeometry(.075,.075,.04,24),silver,[0,.08,0],group).rotation.x=Math.PI/2;
      }else{
        this.box([.13,.055,.11],physical(kind==='cloth'?'#a4b9b3':'#c3c5ad',.85),[0,.03,0],group);
      }
    }
    return group;
  }

  orientation(anchor) {
    const matrix=new THREE.Matrix4().lookAt(v3(anchor.position),v3(anchor.lookAt),new THREE.Vector3(0,1,0));
    return new THREE.Quaternion().setFromRotationMatrix(matrix);
  }

  cameraPose(clock) {
    const state=clock.state, step=clock.episode.steps[clock.stepIndex];
    const anchor=this.manifest.anchors[state.location]||this.manifest.anchors.start;
    let position=v3(anchor.position),quaternion=this.orientation(anchor);
    if(clock.phase==='action'&&step?.action.type==='go'&&step.effectiveAction!==false&&step.validAction===true){
      const from=clock.episode.snapshots[step.beforeSnapshot].location;
      const to=step.action.target;
      const a=this.manifest.anchors[from]||this.manifest.anchors.start,b=this.manifest.anchors[to];
      const points=[a.position,...(this.manifest.paths[`${from}|${to}`]||[]),b.position].map(v3);
      const progress=smooth(clock.progress);
      // Piecewise straight segments stay within the explicitly checked free-space route.
      const lengths=points.slice(1).map((point,i)=>point.distanceTo(points[i]));
      let distance=progress*lengths.reduce((sum,n)=>sum+n,0);
      position=points.at(-1).clone();
      for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]){position=points[i].clone().lerp(points[i+1],lengths[i]?distance/lengths[i]:1);break}distance-=lengths[i];}
      quaternion=this.orientation(a).slerp(this.orientation(b),progress);
    }
    return {position,quaternion};
  }

  draw(clock) {
    if(this.disposed)return;
    this.lastClock=clock;
    const pose=this.cameraPose(clock);
    this.baseQuaternion.copy(pose.quaternion);
    this.camera.position.copy(pose.position);
    const euler=new THREE.Euler().setFromQuaternion(pose.quaternion,'YXZ');
    euler.y+=this.lookYaw;euler.x=THREE.MathUtils.clamp(euler.x+this.lookPitch,-1.2,1.2);
    this.camera.quaternion.setFromEuler(euler);
    this.lastCameraPosition.copy(this.camera.position);
    for(const [id,door] of this.doors){
      const status=clock.state.containerStates?.[id];
      let opened=status?status==='open':door.initialOpen;
      let amount=opened?1:0;
      const step=clock.episode.steps[clock.stepIndex];
      if(clock.phase==='action'&&step?.effectiveAction!==false&&step?.validAction===true&&step.action.target===id&&['open','close'].includes(step.action.type)){
        const from=opened?1:0,to=step.action.type==='open'?1:0;amount=from+(to-from)*smooth(clock.progress);
      }
      door.hinge.rotation.y=-1.65*amount;
    }
    for(const [id,object]of this.props){
      const parent=clock.state.objects[id] ?? this.manifest.objectSlots[id].parent;
      object.visible=Boolean(parent);
      if(!parent)continue;
      object.rotation.set(0,0,0);
      const status=clock.state.objectStates?.[id];
      object.traverse(mesh=>{
        const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
        materials.forEach(material=>{if(material?.emissive){material.emissive.set(status==='hot'?'#b64b21':status==='cold'?'#327496':'#000000');material.emissiveIntensity=status ? .25 : 0;}});
      });
      if(parent==='inventory')this.applyHeld(object);
      else object.position.fromArray(this.manifest.placementSlots[`${id}|${parent}`]||this.manifest.objectSlots[id].position);
    }
    const step=clock.episode.steps[clock.stepIndex];
    if(clock.phase==='action'&&step?.effectiveAction!==false&&step?.validAction===true&&['take','put'].includes(step.action.type)){
      const paper=this.props.get(step.action.object);
      if(paper){
        paper.visible=true;
        const held=this.heldPose();
        const fromParent=clock.state.objects[step.action.object];
        const slot=step.action.type==='take'?(this.manifest.placementSlots[`${step.action.object}|${fromParent}`]||this.manifest.objectSlots[step.action.object]?.position):this.manifest.placementSlots[`${step.action.object}|${step.action.target}`];
        if(slot){const p=smooth(clock.progress);const world=v3(slot);paper.position.copy(step.action.type==='take'?world.lerp(held.position,p):held.position.clone().lerp(world,p));paper.quaternion.copy(step.action.type==='take'?new THREE.Quaternion().slerp(held.quaternion,p):held.quaternion.clone().slerp(new THREE.Quaternion(),p));}
      }
    }
    this.renderer.render(this.scene,this.camera);
  }

  heldPose() {
    const offset=new THREE.Vector3(.28,-.30,-.65).applyQuaternion(this.camera.quaternion).add(this.camera.position);
    const rotation=this.camera.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(1.05,0,-.13)));
    return {position:offset,quaternion:rotation};
  }
  applyHeld(object) { const pose=this.heldPose();object.position.copy(pose.position);object.quaternion.copy(pose.quaternion); }
  get stats() {return {drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};}

  dispose() {
    if(this.disposed)return;this.disposed=true;this.resizeObserver.disconnect();
    const geometries=new Set(),materials=new Set(),textures=new Set(this.extraResources);
    const collect=root=>root?.traverse(obj=>{if(obj.geometry)geometries.add(obj.geometry);for(const material of [].concat(obj.material||[])){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});
    collect(this.scene);Object.values(this.templates).forEach(collect);
    geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());
    this.environmentTarget?.dispose();this.renderer.dispose();
  }
}

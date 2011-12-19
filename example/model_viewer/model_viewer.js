var vec3 = KICK.math.vec3,
    quat4 = KICK.math.quat4;

function destroyAllMeshRenderersInScene(){
    var scene = engine.activeScene;
    for (var i=scene.getNumberOfGameObjects()-1;i>=0;i--){
        var gameObject = scene.getGameObject(i);
        if (gameObject.getComponentOfType(KICK.scene.MeshRenderer)){
            gameObject.destroy();
        }
    }
}

function load(content,url,func){
    destroyAllMeshRenderersInScene();

    var gameObjectsCreated = func(content,engine,engine.activeScene,true);
    for (var i=0;i<gameObjectsCreated.length;i++){
        var gameObject = gameObjectsCreated[i];
        var isDuck = url==="duck.dae" || url==="duck_triangulate.dae";
        if (isDuck){
            gameObject.transform.localScale = [0.01,0.01,0.01];

        }
        var meshRendererNew = gameObject.getComponentOfType(KICK.scene.MeshRenderer);
        if (meshRendererNew){
            var materials = [];
            for (var j = meshRendererNew.mesh.meshData.subMeshes.length-1;j>=0;j--){
                materials[j] = duckMaterial;
            }
            meshRendererNew.materials = materials;
            meshRenderer = meshRendererNew;
            recalculateNormals();
        }
    }
}

function loadCollada(url){
    var oReq = new XMLHttpRequest();
    function handler()
    {
        if (oReq.readyState == 4 /* complete */) {
            if (oReq.status == 200) {
                var xmlDom = oReq.responseXML;
                load(xmlDom,url,KICK.importer.ColladaImporter.import);
            }
        }
    }
    oReq.open("GET", url, true);
    oReq.onreadystatechange = handler;
    oReq.send();
}

var material;
var duckMaterial;

function duckClicked(){
    loadCollada("duck.dae");
}

function cubeClicked(){
    loadCollada("cube.dae");
}

function loadModelFile(file){
    var reader = new FileReader();

    reader.onload = function(event) {
        var txt = event.target.result,
            fileName = file.fileName;
        if (fileName.toLowerCase().lastIndexOf(".obj") === fileName.length-4){
            load(txt,fileName,KICK.importer.ObjImporter.import);
        } else {
            var parser=new DOMParser();
            load(parser.parseFromString(txt,"text/xml"),fileName,KICK.importer.ColladaImporter.import);
        }
    };

    reader.onerror = function() {
      alert("Error reading file");
    };

    reader.readAsText(file);
}

function loadClicked(files){
    for (var i=0;i<files.length;i++){
        var file = files[i];
        var fileLowerCase = file.fileName.toLowerCase(),
            fileLengthMinus4 = fileLowerCase.length-4;
        if (fileLowerCase.lastIndexOf(".dae") ===  fileLengthMinus4 ||
            fileLowerCase.lastIndexOf(".obj") === fileLengthMinus4 ){
            loadModelFile(file);
        } else if (fileLowerCase.lastIndexOf(".jpg") === fileLengthMinus4 ||
            fileLowerCase.lastIndexOf(".jpeg") === fileLengthMinus4-1 ||
            fileLowerCase.lastIndexOf(".png") === fileLengthMinus4){
            var reader = new FileReader();
            reader.onload = function(e) {
                loadTexture(e.target.result);
            };
            reader.readAsDataURL(file);

        }
    }
}

var engine;
var camera;
var meshRenderer;
var texture;

function createMaterial(vertexShaderId, fragmentShaderId){
    var vs = document.getElementById(vertexShaderId).value;
    var fs = document.getElementById(fragmentShaderId).value;
    var shader = new KICK.material.Shader(engine);
    shader.vertexShaderSrc = vs;
    shader.fragmentShaderSrc = fs;
    shader.errorLog = console.log;
    shader.updateShader();
    var missingAttributes = meshRenderer.mesh.verify(shader);
    if (missingAttributes){
        console.log("Missing attributes in mesh "+JSON.stringify(missingAttributes));
        return;
    }

    var material = new KICK.material.Material(engine,{
        name:"Some material",
        shader:shader
    });
    return material;
}

function recalculateNormals(){
    var mesh = meshRenderer.mesh;
    var meshData = mesh.meshData;
    if (!meshData.interleavedArrayFormat["normal"]){
        meshData.recalculateNormals();
        mesh.meshData = meshData;
    }
}

function RotatorComponent(){
    var thisObj = this,
        time,
        transform,
        rotationSpeed = 0.001,
        upDownSpeed = 0.0001,
        wheelSpeed = 0.0001,
        mouseRotationSpeed = 0.01,
        mouseInput,
        sphericalCoordinates = vec3.create([10,0,0]); // radius, polar, elevation
        cartesianCoordinates = vec3.create();

    this.activated = function(){
        var gameObject = thisObj.gameObject,
            engine = gameObject.engine;
        transform = gameObject.transform;
        time = engine.time;
        mouseInput = engine.mouseInput;
        mouseInput.mouseWheelPreventDefaultAction = true;
    };

    this.update = function(){
        if (mouseInput.isButton(0)){
            var mouseDelta = mouseInput.deltaMovement;
            sphericalCoordinates[1] -= mouseDelta[0]*mouseRotationSpeed;
            sphericalCoordinates[2] += mouseDelta[1]*mouseRotationSpeed;
            sphericalCoordinates[2] = Math.max(-Math.PI*0.499,sphericalCoordinates[2]);
            sphericalCoordinates[2] = Math.min(Math.PI*0.499,sphericalCoordinates[2]);
        } else {
            sphericalCoordinates[1] += time.deltaTime*rotationSpeed;
            sphericalCoordinates[2] = Math.sin(time.time*upDownSpeed)*Math.PI*0.25;
        }
        var wheelY = mouseInput.deltaWheel[1];
        if (wheelY){
            var delta = wheelY*wheelSpeed;
            sphericalCoordinates[0] *= 1+delta;
        }
        vec3.sphericalToCarterian(sphericalCoordinates,cartesianCoordinates);
        transform.position = cartesianCoordinates;
        transform.localRotation = quat4.lookAt(cartesianCoordinates,[0,0,0],[0,1,0]);
    };
}

function loadTexture(url){
    var image = new Image();
    image.onload = function() {
        texture.setImage(image, url);
    };
    image.src = url;
}

function initDuckTexture(){
    texture = new KICK.texture.Texture(engine);
    texture.setTemporaryTexture();
    duckMaterial.uniforms.tex = {
        value:texture,
        type: KICK.core.Constants.GL_SAMPLER_2D
    };
    loadTexture("duckCM.jpg");
}

function initLights(){
    var ambientlightGameObject = engine.activeScene.createGameObject();
    ambientlightGameObject.name = "ambient light";
    var ambientLight = new KICK.scene.Light({type :KICK.core.Constants._LIGHT_TYPE_AMBIENT});
    ambientLight.color = [0.1,0.1,0.1,1];
    ambientlightGameObject.addComponent(ambientLight);

    var lightGameObject = engine.activeScene.createGameObject();
    lightGameObject.name = "directional light";
    var light = new KICK.scene.Light(
        {
            type:KICK.core.Constants._LIGHT_TYPE_DIRECTIONAL,
            color:[1,1,1,1],
            intensity:1
        }
    );
    lightGameObject.transform.position = [1,1,1];
    lightGameObject.addComponent(light);
}

function initKick() {
    engine = new KICK.core.Engine('canvas',{
        enableDebugContext: true
    });
    var cameraObject = engine.activeScene.createGameObject();
    cameraObject.name = "Camera";
    camera = new KICK.scene.Camera({
        clearColor: [0,0,0,1],
        fieldOfView:60,
        far:100000
    });
    cameraObject.addComponent(camera);

    cameraObject.addComponent(new RotatorComponent());

    var gameObject = engine.activeScene.createGameObject();
    gameObject.name = "Mesh";
    meshRenderer = new KICK.scene.MeshRenderer();
    meshRenderer.mesh = engine.resourceManager.getMesh("kickjs://mesh/uvsphere/?radius=0.5");
    material = createMaterial('vertexShaderColor','fragmentShader');

    duckMaterial = createMaterial('vertexShaderColorImg','fragmentShaderImg');
    meshRenderer.material = duckMaterial;
    initDuckTexture();
    initLights();

    gameObject.addComponent(meshRenderer);
}

function pauseResume(){
    engine.paused = !engine.paused;
    this.innerHTML = engine.paused? "Play":"Pause";
}

function toogleBackground(){
    var background = window.background || 0;
    background++;
    if (background===3){
        background = 0;
    }
    window.background = background;
    if (background===0){
        camera.clearColor = [0,0,0,1];
    } else if (background===1){
        camera.clearColor = [1,1,1,1];
    } else if (background===2){
        camera.clearColor = [0,0,0,0];
    } 
}

window.addEventListener("load",function(){
    initKick();
    document.getElementById("duckButton").addEventListener("click", duckClicked,false);
    document.getElementById("cubeButton").addEventListener("click", cubeClicked,false);
    document.getElementById("pauseButton").addEventListener("click", pauseResume,false);
    document.getElementById("backgroundButton").addEventListener("click", toogleBackground,false);
    document.getElementById("file").onchange = function() {
          loadClicked(this.files);
        };

},false);
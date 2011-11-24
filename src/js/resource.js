/*!
 * New BSD License
 *
 * Copyright (c) 2011, Morten Nobel-Joergensen, Kickstart Games ( http://www.kickstartgames.com/ )
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
 * following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 * disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following
 * disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * description _
 * @module KICK
 */
var KICK = KICK || {};
KICK.namespace = function (ns_string) {
    var parts = ns_string.split("."),
        parent = window,
        i;

    for (i = 0; i < parts.length; i += 1) {
        // create property if it doesn't exist
        if (typeof parent[parts[i]] === "undefined") {
            parent[parts[i]] = {};
        }
        parent = parent[parts[i]];
    }
    return parent;
};

(function () {
    "use strict"; // force strict ECMAScript 5

    var core = KICK.namespace("KICK.core"),
        mesh = KICK.namespace("KICK.mesh"),
        constants = core.Constants,
        scene = KICK.namespace("KICK.scene"),
        ASSERT = constants._ASSERT,
        debug = constants._DEBUG,
        fail = core.Util.fail;
    
    /**
     * Responsible for allocation and deallocation of resources.
     * @class ResourceManager
     * @namespace KICK.core
     * @constructor
     */
    core.ResourceManager = function (engine) {
        var resourceProviders = [
            new core.URLResourceProvider(engine),
            new core.BuiltInResourceProvider(engine)],
            buildCache = function(){
                return {
                    ref: {},
                    refCount: {}
                }
            },
            meshCache = buildCache(),
            shaderCache = buildCache(),
            textureCache = buildCache(),
            allCaches = [meshCache,shaderCache,textureCache],
            getFromCache = function(cache, url){
                var res = cache.ref[url];
                if (res){
                    cache.refCount[url]++;
                }
                return res;
            },
            addToCache = function(cache, url, resource){
                cache.ref[url] = resource;
                cache.refCount[url] = 1;
            },
            /**
             * @method buildGetFunc
             * @param {Object} cache
             * @param {String} methodName
             * @return {Function} getter function with the signature function(url)
             * @private
             */
            buildGetFunc = function(cache,methodName){
                return function(url){
                    var res = getFromCache(cache,url),
                        i;
                    if (res){
                        return res;
                    }
                    for (i=resourceProviders.length-1;i>=0;i--){
                        var resourceProvider = resourceProviders[i];
                        var protocol = resourceProvider.protocol;
                        if (url.indexOf(protocol) === 0){
                            res = resourceProvider[methodName](url);
                            break;
                        }
                    }
                    if (res){
                        addToCache(cache,url,res);
                    }
                    return res;
                };
            },
            /**
             * Create a callback function
             * @method buildCallbackFunc
             * @private
             */
            buildCallbackFunc = function(methodName){
                return function(url,destination){
                    for (var i=resourceProviders.length-1;i>=0;i--){
                        var resourceProvider = resourceProviders[i];
                        var protocol = resourceProvider.protocol;
                        if (url.indexOf(protocol)===0){
                            resourceProvider[methodName](url,destination);
                            return;
                        }
                    }
                };
            };
        /**
         * @method getMeshData
         * @param {String} uri
         * @param {KICK.mesh.Mesh} meshDestination
         */
        this.getMeshData = buildCallbackFunc("getMeshData");
        /**
         * @method getImageData
         * @param {String} uri
         * @param {KICK.texture.Texture} textureDestination
         */
        this.getImageData = buildCallbackFunc("getImageData");

        /**
         * @method getShaderData
         * @param {String} uri
         * @param {KICK.material.Shader} shaderDestination
         */
        this.getShaderData = buildCallbackFunc("getShaderData");


        /**
         * @method getMesh
         * @param {String} uri
         * @return {KICK.mesh.Mesh}
         * @deprecated
         */
        this.getMesh = buildGetFunc(meshCache,"getMesh");
        /**
         * @method getShader
         * @param {String} uri
         * @return {KICK.material.Shader}
         * @deprecated
         */
        this.getShader = buildGetFunc(shaderCache,"getShader");
        /**
         * @method getTexture
         * @param {String} uri
         * @return {KICK.material.Shader}
         * @deprecated
         */
        this.getTexture = buildGetFunc(textureCache,"getTexture");

        /**
         * Release a reference to the resource.
         * If reference count is 0, then the reference is deleted and the destroy method on the
         * resource object are invoked.
         * @method release
         * @param {String} url
         */
        this.release = function(url){
            for (var i=allCaches.length-1;i>=0;i--){
                if (allCaches[i].refCount[url]){
                    allCaches[i].refCount[url]--;
                    if (allCaches[i].refCount[url]<=0){
                        if (allCaches[i].ref[url].destroy){
                            allCaches[i].ref[url].destroy();
                        }
                        delete allCaches[i].refCount[url];
                        delete allCaches[i].ref[url];
                    }
                }
            }
        };
    };

    /**
     * Responsible for creating or loading a resource using a given url
     * @class ResourceProvider
     * @namespace KICK.core
     * @constructor
     * @param {String} protocol
     * @private
     */
    /**
     * Protocol of the resource, such as http, kickjs<br>
     * The protocol must uniquely identify a resource provider
     * @property protocol
     * @type String
     */

    /**
     * @method getMeshData
     * @param {String} uri
     * @param {KICK.mesh.Mesh} meshDestination
     */
    /**
     * @method getImageData
     * @param {String} uri
     * @param {KICK.texture.Texture} textureDestination
     */
    /**
     * @method getShaderData
     * @param {String} uri
     * @param {KICK.material.Shader} shaderDestination
     */
    /**
     * @method getMesh
     * @param {String} url
     * @return {KICK.mesh.Mesh}
     * @deprecated
     */
    /**
     * @method getShader
     * @param {String} url
     * @return {KICK.material.Shader}
     * @deprecated
     */
    /**
     * @method getTexture
     * @param {String} url
     * @return {KICK.texture.Texture}
     * @deprecated
     */


    /**
     * Fall back handler of resources
     * @class URLResourceProvider
     * @namespace KICK.core
     * @constructor
     * @extends KICK.core.ResourceProvider
     * @param {KICK.core.Engine} engine
     * @private
     */
    core.URLResourceProvider = function(engine){
        var gl = engine.gl,
            thisObj = this;
        Object.defineProperties(this,{
            /**
             * Returns empty string (match all)
             * @property protocol
             * @type String
             */
            protocol:{
                value:""
            }
        });

        this.getMeshData = function(url,meshDestination){
            fail("Not implemented yet");
        };

        this.getImageData = function(uri,textureDestination){
            var img = new Image();
            img.onload = function(){
                try{
                    textureDestination.setImage(img,uri);
                } catch (e){
                    fail("Exception when loading image "+uri);
                }
            };
            img.onerror = function(e){
                fail(e);
                fail("Exception when loading image "+uri);
            };
            img.crossOrigin = "anonymous"; // Ask for a CORS image
            img.src = uri;
        };
    };

    /**
     * Responsible for providing the built-in resources (such as textures, shaders and mesh data).
     * All build-in resources have the prefix kickjs
     * @class BuiltInResourceProvider
     * @namespace KICK.core
     * @constructor
     * @extends KICK.core.ResourceProvider
     * @param {KICK.core.Engine} engine
     * @private
     */
    core.BuiltInResourceProvider = function(engine){
        var gl = engine.gl,
            thisObj = this;
        Object.defineProperties(this,{
            /**
             * Returns kickjs
             * @property protocol
             * @type String
             */
            protocol:{
                value:"kickjs"
            }
        });

        /**
         * <ul>
         * <li><b>Triangle</b> Url: kickjs://meshdata/triangle/</li>
         * <li><b>Plane</b> Url: kickjs://meshdata/plane/<br></li>
         * <li><b>UVSphere</b> Url: kickjs://meshdata/uvsphere/?slides=20&stacks=10&radius=1.0<br>Note that the parameters is optional</li>
         * <li><b>Cube</b> Url: kickjs://meshdata/cube/?length=1.0<br>Note that the parameters is optional</li>
         * </ul>
         * @param {String} url
         * @param {KICK.mesh.Mesh} meshDestination
         */
        this.getMeshData = function(url,meshDestination){
            var meshDataObj,
                getParameterInt = core.Util.getParameterInt,
                getParameterFloat = core.Util.getParameterFloat;
            if (url.indexOf("kickjs://meshdata/triangle/")==0){
                meshDataObj = mesh.MeshFactory.createTriangleData();
            } else if (url.indexOf("kickjs://meshdata/plane/")==0){
                meshDataObj = mesh.MeshFactory.createPlaneData();
            } else if (url.indexOf("kickjs://meshdata/uvsphere/")==0){
                var slices = getParameterInt(url, "slices"),
                    stacks = getParameterInt(url, "stacks"),
                    radius = getParameterFloat(url, "radius");
                meshDataObj = mesh.MeshFactory.createUVSphereData(slices, stacks, radius);
            } else if (url.indexOf("kickjs://meshdata/cube/")==0){
                var length = getParameterFloat(url, "length");
                meshDataObj = mesh.MeshFactory.createCubeData(length);
            } else {
                KICK.core.Util.fail("No meshdata found for "+url);
                return;
            }
            if (debug){
                // simulate asynchronous
                setTimeout(function(){
                    meshDestination.meshData = meshDataObj;
                },250);
            }
            else {
                meshDestination.meshData = meshDataObj;
            }
        };

        /**
         * Creates a Mesh object based on a url.<br>
         * The following resources can be created:<br>
         * <ul>
         * <li><b>Triangle</b> Url: kickjs://mesh/triangle/</li>
         * <li><b>Plane</b> Url: kickjs://mesh/plane/<br></li>
         * <li><b>UVSphere</b> Url: kickjs://mesh/uvsphere/?slides=20&stacks=10&radius=1.0<br>Note that the parameters is optional</li>
         * <li><b>Cube</b> Url: kickjs://mesh/cube/?length=1.0<br>Note that the parameters is optional</li>
         * </ul>
         * @method getMesh
         * @param {String} url
         * @return {KICK.mesh.Mesh}
         */
        this.getMesh = function(url){
            var config,
                meshDataObj,
                getParameterInt = core.Util.getParameterInt,
                getParameterFloat = core.Util.getParameterFloat;
            if (url.indexOf("kickjs://mesh/triangle/")==0){
                config = {
                    name: "Triangle"
                };
                meshDataObj = mesh.MeshFactory.createTriangleData();
            } else if (url.indexOf("kickjs://mesh/plane/")==0){
                config = {
                    name: "Plane"
                };
                meshDataObj = mesh.MeshFactory.createPlaneData();
            } else if (url.indexOf("kickjs://mesh/uvsphere/")==0){
                config = {
                    name: "UVSphere"
                };
                var slices = getParameterInt(url, "slices"),
                    stacks = getParameterInt(url, "stacks"),
                    radius = getParameterFloat(url, "radius");
                meshDataObj = mesh.MeshFactory.createUVSphereData(slices, stacks, radius);
            } else if (url.indexOf("kickjs://mesh/cube/")==0){
                config = {
                    name: "Cube"
                };
                var length = getParameterFloat(url, "length");
                meshDataObj = mesh.MeshFactory.createCubeData(length);
            } else {
                return null;
            }

            if (meshDataObj){
                config.meshData = meshDataObj;
                return new mesh.Mesh(engine,config);
            }
        };

        /**
         * Create a default shader config based on a URL<br>
         * The following shaders are available:
         *  <ul>
         *  <li><b>Phong</b> Url: kickjs://shader/phong/</li>
         *  <li><b>Unlit</b> Url: kickjs://shader/unlit/</li>
         *  <li><b>Transparent Phong</b> Url: kickjs://shader/transparent_phong/</li>
         *  <li><b>Transparent Unlit</b> Url: kickjs://shader/transparent_unlit/</li>
         *  <li><b>Error</b> Url: kickjs://shader/error/<br></li>
         *  </ul>
         * @method getShaderData
         * @param {String} url
         * @param {KICK.material.Shader} shaderDestination
         */
        this.getShaderData = function(url,shaderDestination){
            var vertexShaderSrc,
                fragmentShaderSrc,
                blend = false,
                depthMask = true,
                renderOrder = 1000,
                glslConstants = KICK.material.GLSLConstants;
            if (url.indexOf("kickjs://shader/phong/")==0){
                vertexShaderSrc = glslConstants["phong_vs.glsl"];
                fragmentShaderSrc = glslConstants["phong_fs.glsl"];
            } else if (url.indexOf("kickjs://shader/transparent_phong/")==0){
                vertexShaderSrc = glslConstants["transparent_phong_vs.glsl"];
                fragmentShaderSrc = glslConstants["transparent_phong_fs.glsl"];
                blend = true;
                depthMask = false;
                renderOrder = 2000;
            } else if (url.indexOf("kickjs://shader/error/")==0){
                vertexShaderSrc = glslConstants["error_vs.glsl"];
                fragmentShaderSrc = glslConstants["error_fs.glsl"];
            } else if (url.indexOf("kickjs://shader/unlit/")==0){
                vertexShaderSrc = glslConstants["unlit_vs.glsl"];
                fragmentShaderSrc = glslConstants["unlit_fs.glsl"];
            } else if (url.indexOf("kickjs://shader/transparent_unlit/")==0){
                vertexShaderSrc = glslConstants["transparent_unlit_vs.glsl"];
                fragmentShaderSrc = glslConstants["transparent_unlit_fs.glsl"];
                renderOrder = 2000;
                blend = true;
                depthMask = false;
            } else {
                return null;
            }
            var config = {
                blend:blend,
                depthMask:depthMask,
                renderOrder:renderOrder,
                vertexShaderSrc: vertexShaderSrc,
                fragmentShaderSrc: fragmentShaderSrc
            };
            KICK.core.Util.applyConfig(shaderDestination,config);

            shaderDestination.updateShader();
        };

        /**
         * Create a default shader based on a URL<br>
         * The following shaders are available:
         *  <ul>
         *  <li><b>Phong</b> Url: kickjs://shader/phong/</li>
         *  <li><b>Unlit</b> Url: kickjs://shader/unlit/</li>
         *  <li><b>Transparent Phong</b> Url: kickjs://shader/transparent_phong/</li>
         *  <li><b>Transparent Unlit</b> Url: kickjs://shader/transparent_unlit/</li>
         *  <li><b>Error</b> Url: kickjs://shader/error/<br></li>
         *  </ul>
         * @method getShader
         * @param {String} url
         * @return {KICK.material.Shader} Shader or null if not found
         */
        this.getShader = function(url,errorLog){

            var shader = new KICK.material.Shader(engine);
            this.getShaderData(url,shader);
            return shader;
        };

        /**
         * Create a default texture based on a URL.<br>
         * The following default textures exists:
         *  <ul>
         *  <li><b>Black</b> Url: kickjs://texture/black/</li>
         *  <li><b>White</b> Url: kickjs://texture/white/<br></li>
         *  <li><b>Gray</b>  Url: kickjs://texture/gray/<br></li>
         *  </ul>
         * @param uri
         * @param textureDestination
         */
        this.getImageData = function(uri,textureDestination){
            var data;

            if (uri.indexOf("kickjs://texture/black/")==0){
                data = new Uint8Array([0, 0, 0, 255,
                                         0,   0,   0,255,
                                         0,   0,   0,255,
                                         0,   0,   0,255]);
            } else if (uri.indexOf("kickjs://texture/white/")==0){
                data = new Uint8Array([255, 255, 255,255,
                                         255,   255,   255,255,
                                         255,   255,   255,255,
                                         255,   255,   255,255]);
            } else if (uri.indexOf("kickjs://texture/gray/")==0){
                data = new Uint8Array([127, 127, 127,255,
                                         127,   127,   127,255,
                                         127,   127,   127,255,
                                         127,   127,   127,255]);
            } else {
                KICK.core.Util.fail("Unknown uri "+uri);
                return null;
            }
            textureDestination.setImageData( 2, 2, 0, constants.GL_UNSIGNED_BYTE,data, uri);
        };

        /**
         * Create a default texture based on a URL.<br>
         * The following default textures exists:
         *  <ul>
         *  <li><b>Black</b> Url: kickjs://texture/black/</li>
         *  <li><b>White</b> Url: kickjs://texture/white/<br></li>
         *  <li><b>Gray</b>  Url: kickjs://texture/gray/<br></li>
         *  </ul>
         * @method getTexture
         * @param {String} url
         * @return {KICK.texture.Texture} Texture object - or null if no texture is found for the specified url
         */
        this.getTexture = function(url){
            var texture = new KICK.texture.Texture(engine,{
                minFilter: constants.GL_NEAREST,
                magFilter: constants.GL_NEAREST,
                generateMipmaps: false,
                internalFormat: constants.GL_RGBA
            });
            thisObj.getImageData(url,texture);

            return texture;
        };
    };
})();
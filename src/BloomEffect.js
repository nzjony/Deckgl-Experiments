import * as React from 'react';
import {
  Framebuffer,
  clear,
  Program,
  Texture2D,
  VertexArray,
  UniformBufferLayout,
  Buffer
} from '@luma.gl/webgl';
import GL from '@luma.gl/constants';

const FSQUAD_VS = `\
#version 300 es
#define SHADER_NAME fsquad.vs

layout(location=0) in vec3 aPosition;
out vec2 tex_coord;

void main() {
  gl_Position = vec4(aPosition, 1.0);
  vec2 scalefactor = vec2(0.5, 0.5);
  tex_coord = aPosition.xy * scalefactor + scalefactor;
}`;

const PREFILTER_FS = `\
#version 300 es
precision highp float;
#define SHADER_NAME prefilter.fs

uniform sampler2D uSceneTex;
in vec2 tex_coord;
out vec4 fragColor;

void main() {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    fragColor = texelFetch(uSceneTex, fragCoord,0);
    float brightness = dot(fragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    if(brightness < 0.5)    
      fragColor = vec4(0.0, 0.0, 0.0, 1.0);
}`;

const BLUR_FS = `\
#version 300 es
precision highp float;
#define SHADER_NAME blur.fs

uniform sampler2D uSceneFilterTex;
in vec2 tex_coord;
out vec4 fragColor;

vec4 boxFilter() {
  vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
  ivec2 tex_size = textureSize(uSceneFilterTex, 0);
  vec2 texelSize = vec2(1.0, 1.0) / vec2(tex_size.x, tex_size.y);
  vec4 coords = texelSize.xyxy * vec2(-1,1).xxyy;
  color += texture(uSceneFilterTex, tex_coord + coords.xy);
  color += texture(uSceneFilterTex, tex_coord + coords.zw);
  color += texture(uSceneFilterTex, tex_coord + coords.xw);
  color += texture(uSceneFilterTex, tex_coord + coords.zy);
  color *= 0.25;
  color.w = 1.0;
  return color;
}

void main() {    
    ivec2 tex_size = textureSize(uSceneFilterTex, 0);
    vec2 sampleCoord = vec2(gl_FragCoord.xy) / vec2(tex_size.x/2, tex_size.y/2);
    fragColor = texture(uSceneFilterTex, tex_coord);    
    fragColor = boxFilter();
}`;

const BLOOM_FS = `\
#version 300 es
precision highp float;
#define SHADER_NAME bloom.fs

uniform sampler2D uSceneTex;
uniform sampler2D uSceneFilterTex;
uniform sampler2D uSceneBlurTex;
in vec2 tex_coord;
out vec4 fragColor;

void main() {
    float intensity = 3.0;
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    //fragColor = texelFetch(uSceneTex, fragCoord, 0);
    fragColor = texture(uSceneTex, tex_coord) +  texture(uSceneBlurTex, tex_coord) * intensity;
}`;

export default class BloomEffect {  
  constructor(gl) {
    this.preFilterFB = new Framebuffer(gl, {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      depth: false,
      attachments: {
        [GL.COLOR_ATTACHMENT0]: new Texture2D(gl, {
          format: GL.RGBA,
          type: GL.UNSIGNED_BYTE,
          width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight,
          mipmaps: false,
          parameters: {
            [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
            [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
            [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
            [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
          }
        }),
      }
    });  
    
    this.blurFB = new Framebuffer(gl, {
      width: gl.drawingBufferWidth/2,
      height: gl.drawingBufferHeight/2,
      attachments: {
        [GL.COLOR_ATTACHMENT0]: new Texture2D(gl, {
          format: GL.RGBA,
          type: GL.UNSIGNED_BYTE,
          width: gl.drawingBufferWidth/2,
          height: gl.drawingBufferHeight/2,
          mipmaps: false,
          parameters: {
            [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
            [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
            [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
            [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
          }
        }),
      },
      depth: false,
    });    

    this.preFilterPass = new Program(gl, {
      id: 'PREFILTER_PASS',
      vs: FSQUAD_VS,
      fs: PREFILTER_FS
    });

    this.blurPass = new Program(gl, {
      id: 'BLUR_PASS',
      vs: FSQUAD_VS,
      fs: BLUR_FS
    });

    this.bloomPass = new Program(gl, {
      id: 'BLOOM_PASS',
      vs: FSQUAD_VS,
      fs: BLOOM_FS
    });

    this.fsQuadVAO = new VertexArray(gl, {
      program: this.blurPass,
      attributes: {
        0: new Buffer(gl, new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0]))
      }
    });
    console.log(this.fsQuadVAO);
  }

  render = (sceneFB, gl) => {
    this.preFilterFB.resize({width : gl.drawingBufferWidth, height: gl.drawingBufferHeight});
    this.blurFB.resize({width : gl.drawingBufferWidth/2, height: gl.drawingBufferHeight/2});

    //Pre Filter Pass
    clear(gl, {color: [0, 0, 0, 1], framebuffer: this.preFilterFB});

    this.preFilterPass.setUniforms({
      uSceneTex: sceneFB.color
    });

    this.preFilterPass.draw({
      vertexArray: this.fsQuadVAO,
      drawMode: gl.TRIANGLE_STRIP,
      vertexCount: 4,
      framebuffer: this.preFilterFB,
    });
    

    //Blur Pass
    gl.viewport(0, 0, this.blurFB.width, this.blurFB.height);
    clear(gl, {color: [0, 0, 0, 1], framebuffer: this.blurFB});    

    this.blurPass.setUniforms({
      uSceneFilterTex: this.preFilterFB.color, 
    });

    this.blurPass.draw({
      vertexArray: this.fsQuadVAO,
      drawMode: gl.TRIANGLE_STRIP,
      vertexCount: 4,
      framebuffer: this.blurFB,
    });

    
    //Render Bloom Effect to default FB
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.bloomPass.setUniforms({
      uSceneTex: sceneFB.color,
      uSceneFilterTex: this.preFilterFB.color,
      uSceneBlurTex: this.blurFB.color      
    });

    this.bloomPass.draw({
      vertexArray: this.fsQuadVAO,
      drawMode: gl.TRIANGLE_STRIP,
      vertexCount: 4,
    });
  }

}

const fs = `\
vec4 preFilter(vec4 color, vec2 texSize, vec2 texCoords) {
  if(color.x == 0.0 && color.y == 0.0 && color.z == 0.0)
    return color;
  
  float brightness = color.x + color.y + color.z;
  brightness /= 3.0;

  if(brightness > 0.3)
    return color;
  else
    return vec4(0.0, 0.0, 0.0, 1.0);
}
vec4 blur(sampler2D texture, vec2 texSize, vec2 texCoord) {  
  vec4 color = texture(texture, texCoord);

  vec4 blur_col = vec4(0.0, 0.0, 0.0, 1.0);
  vec2 texel_size = vec2(1.0, 1.0)/texSize;  
  for(int i = 0; i < 9; i++)
  {
    for(int j = 0; j < 9; j++)
    {
      vec2 coords = vec2(i, j);
      coords = texCoord + texel_size * (coords - vec2(1.0, 1.0));
      blur_col += texture(texture, coords);
    }
  }
  blur_col /= 81.0;
  return blur_col;
}

vec4 bloom(sampler2D texture, vec2 texSize, vec2 texCoord) {  
  vec4 color = texture(texture, texCoord);  
  color += blur(texture, texSize, texCoord);
  return color;
}
`;


export const BloomPass = {  
  name: 'bloom',
  fs: fs,
  passes: [
    //{filter: 'preFilter'},  -- Cant use prefilter since it doesn't render into a offsreen buffer. Every Pass gets stacked on top of the final image
    {sampler: 'bloom'},
  ]
};

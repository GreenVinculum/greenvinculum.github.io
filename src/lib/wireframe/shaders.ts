/** Single-draw-call wireframe Points shaders — motion on GPU, additive output. */

export const pointDataFetchGlsl = /* glsl */ `
uniform sampler2D uPointData;
uniform vec2 uPointTexSize;

vec4 fetchPointRow(float pointIndex, float row) {
  float linear = pointIndex * 4.0 + row;
  float x = mod(linear, uPointTexSize.x);
  float y = floor(linear / uPointTexSize.x);
  vec2 uv = (vec2(x, y) + 0.5) / uPointTexSize;
  return texture2D(uPointData, uv);
}

void loadPoint(float idx, out vec4 aPoint, out vec4 aAttrs, out vec4 aDrift, out vec4 aMeta) {
  aPoint = fetchPointRow(idx, 0.0);
  aAttrs = fetchPointRow(idx, 1.0);
  aDrift = fetchPointRow(idx, 2.0);
  aMeta = fetchPointRow(idx, 3.0);
}
`;

export const gpuAnimationGlsl = /* glsl */ `
uniform float uTime;
uniform float uRx;
uniform float uH;
uniform vec2 uPivot;
uniform float uRippleBand;
uniform float uYawLimit;
uniform float uTiltX;
uniform float uTiltY;
uniform vec2 uMeshScale;
uniform float uScrollY;
uniform float uScrollVel;

float effectiveYaw(float uYawDrag) {
  float idle = sin(uTime * 0.16) * 0.00082 + sin(uTime * 0.09 + 1.2) * 0.00034;
  return clamp(uYawDrag + idle, -uYawLimit, uYawLimit);
}

vec3 computeRelPos(vec4 aPoint, vec4 aAttrs, float yaw, vec3 groupFlow) {
  float baseX = aPoint.x;
  float baseY = aPoint.y;
  float z = (aPoint.z + aAttrs.z) * 2.28;
  float shellX = (baseX - uPivot.x) / max(uRx, 1.0);
  float shellY = (baseY - uPivot.y) / max(uH * 0.48, 1.0);
  float yawShell = sin(yaw) * shellX * 48.0 + sin(yaw) * sin(yaw) * shellX * abs(shellX) * 14.0;
  float yawShellY = cos(yaw) * shellY * 9.0;
  float relX = (baseX - uPivot.x) + groupFlow.x + uTiltX * z * 0.11;
  float relY = (baseY - uPivot.y) + groupFlow.y;
  float relZ = z + groupFlow.z + yawShell + yawShellY;
  float cosY = cos(yaw);
  float sinY = sin(yaw);
  float x1 = relX * cosY + relZ * sinY;
  float z2 = -relX * sinY + relZ * cosY;
  float yTilt = uTiltY;
  float xTilt = uTiltX;
  float y1 = relY * cos(yTilt) - z2 * sin(yTilt);
  float z3 = relY * sin(yTilt) + z2 * cos(yTilt);
  float x2 = x1 + xTilt * z3 * 0.65;
  return vec3(x2, y1, z3);
}

vec2 anchorFromRel(vec3 rel, float uFocal) {
  float depthScale = uFocal / max(70.0, uFocal + rel.z);
  float xScale = depthScale * 1.05;
  float yScale = 0.88 + depthScale * 0.12;
  return vec2(uPivot.x + rel.x * xScale, uPivot.y + rel.y * yScale);
}

float radialEdge(vec2 pos) {
  float nx = (pos.x - uPivot.x) / max(uRx, 1.0);
  float ny = (pos.y - uPivot.y) / max(uH * 0.42, 1.0);
  return length(vec2(nx, ny));
}

float edgeFadeWeight(float radial) {
  return smoothstep(0.32, 0.94, radial);
}

vec3 groupFlowVec() {
  float swirl = uTime * 0.14;
  float scrollLift = uScrollY * 3.6 + uScrollVel * 5.2;
  return vec3(
    sin(uTime * 0.11) * 0.92 + sin(uTime * 0.07 + 1.1) * 0.38 + cos(swirl) * 0.22 + uScrollVel * 0.35,
    cos(uTime * 0.1 + 0.7) * 0.78 + sin(uTime * 0.08) * 0.28 + sin(swirl * 0.85) * 0.18 - scrollLift,
    sin(uTime * 0.09 + 0.5) * 1.02 + sin(swirl * 1.1 + 0.6) * 0.28 + uScrollY * 1.4
  );
}

float ripplePush(vec2 pos, vec3 ripple, float band, float gain) {
  float rd = length(pos - ripple.xy);
  float ringDist = abs(rd - ripple.z);
  if (ringDist >= band) return 0.0;
  float t = 1.0 - ringDist / band;
  return t * t * gain;
}

vec2 projectWirePoint(
  vec4 aPoint,
  vec4 aAttrs,
  float yaw,
  float uFocal,
  vec3 groupFlow,
  vec2 pointer,
  float pointerActive,
  float pointerRadius,
  float dragActive
) {
  float feature = aAttrs.y;
  vec3 rel = computeRelPos(aPoint, aAttrs, yaw, groupFlow);
  vec2 anchor = anchorFromRel(rel, uFocal);
  vec2 screen = anchor;

  vec3 r0 = vec3(
    uPivot.x + cos(uTime * 0.36) * uRx * 0.68,
    uPivot.y + sin(uTime * 0.28) * uH * 0.14,
    118.0 + sin(uTime * 0.72) * 32.0
  );
  vec3 r1 = vec3(
    uPivot.x + cos(uTime * 0.26 + 2.1) * uRx * 0.64,
    uPivot.y + sin(uTime * 0.22 + 1.4) * uH * 0.14,
    102.0 + sin(uTime * 0.55 + 0.8) * 28.0
  );
  vec3 r2 = vec3(
    uPivot.x + cos(uTime * 0.19 + 4.2) * uRx * 0.56,
    uPivot.y + sin(uTime * 0.31 + 2.8) * uH * 0.11,
    86.0 + sin(uTime * 0.41 + 1.6) * 24.0
  );

  float rp = ripplePush(screen, r0, uRippleBand, 0.96);
  rp += ripplePush(screen, r1, uRippleBand * 0.92, 0.8);
  rp += ripplePush(screen, r2, uRippleBand * 0.8, 0.66);
  screen += normalize(screen - uPivot + vec2(0.001)) * rp * 14.0;

  if (pointerActive > 0.5) {
    vec2 d = screen - pointer;
    float dist = length(d);
    if (dist < pointerRadius) {
      float falloff = 1.0 - dist / pointerRadius;
      float push = falloff * falloff * (dragActive > 0.5 ? 6.4 : 5.8);
      screen += normalize(d + vec2(0.001)) * push * (0.72 + feature * 0.34);
    }
  }

  return screen;
}

float wireStretch(vec2 screen, vec2 anchor) {
  return length(screen - anchor);
}
`;

export const wireframePointsVertexShader = /* glsl */ `
attribute float aPointIndex;
${pointDataFetchGlsl}
${gpuAnimationGlsl}

uniform float uYaw;
uniform float uTiltX;
uniform float uTiltY;
uniform float uFocal;
uniform vec2 uSize;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uPointerRadius;
uniform float uDragActive;
uniform float uPixelRatio;
uniform float uLightTheme;

varying float vAlpha;
varying float vSmoke;
varying float vDepthShade;

void main() {
  vec4 aPoint, aAttrs, aDrift, aMeta;
  loadPoint(aPointIndex, aPoint, aAttrs, aDrift, aMeta);
  aPoint.x *= uMeshScale.x;
  aPoint.y *= uMeshScale.y;

  float lum = aPoint.w;
  float edge = aAttrs.x;
  float feature = aAttrs.y;
  float sizeJitter = aAttrs.z;
  float pulseOffset = aDrift.x;
  float kind = aMeta.y;
  float levelFlags = aMeta.w;
  float isMidpoint = step(127.5, aMeta.w);

  float yaw = effectiveYaw(uYaw);
  vec3 groupFlow = groupFlowVec();
  float radial = radialEdge(aPoint.xy);
  float edgeW = edgeFadeWeight(radial);
  float shellX = (aPoint.x - uPivot.x) / max(uRx, 1.0);
  float shellY = (aPoint.y - uPivot.y) / max(uH * 0.48, 1.0);

  vec3 relFront = computeRelPos(aPoint, aAttrs, 0.0, groupFlow);
  vec3 relYaw = computeRelPos(aPoint, aAttrs, yaw, groupFlow);
  vec2 frontAnchor = anchorFromRel(relFront, uFocal);
  vec2 anchor = anchorFromRel(relYaw, uFocal);
  float z3 = relYaw.z;

  vec2 screen = projectWirePoint(
    aPoint, aAttrs, yaw, uFocal, groupFlow,
    uPointer, uPointerActive, uPointerRadius, uDragActive
  );

  float turnAmt = smoothstep(0.07, 0.2, abs(yaw));
  float recede = clamp(sign(yaw) * shellX, 0.0, 1.0);
  float sideTurnFade = turnAmt * smoothstep(0.1, 0.78, recede + edgeW * 0.12);
  float backFade = turnAmt * (1.0 - smoothstep(-26.0, 10.0, z3)) * mix(0.4, 1.0, edgeW);

  float pointerStretch = wireStretch(screen, anchor);
  float yawDisp = length(anchor - frontAnchor);
  float rotSmoke = smoothstep(14.0, 50.0, yawDisp) * turnAmt * edgeW;
  float pointerSmoke = smoothstep(12.0, 44.0, pointerStretch) * step(0.5, uDragActive) * edgeW;
  float smoke = max(max(rotSmoke * 0.5, backFade * 0.75), max(sideTurnFade * 0.88, pointerSmoke * 0.38));

  float lightSide = 0.0;
  if (uLightTheme > 0.5) {
    float sideMask = edgeW * smoothstep(0.22, 0.9, abs(shellX));
    float stretchAmt = smoothstep(5.0, 30.0, yawDisp) * turnAmt;
    float recedeSide = smoothstep(0.0, 0.78, recede) * sideMask * turnAmt;
    lightSide = max(recedeSide, sideMask * stretchAmt);
    smoke = max(smoke, lightSide * 0.92);
    sideTurnFade = max(sideTurnFade, lightSide * 0.96);
  }

  vSmoke = smoke;

  vec2 smokeDir = normalize(anchor - frontAnchor + vec2(0.001));
  screen += smokeDir * smoke * smoke * 11.0;

  if (uLightTheme > 0.5 && lightSide > 0.001) {
    vec2 lateralDir = normalize(vec2(sign(shellX) + shellX * 0.03, shellY * 0.1));
    float spread = lightSide * lightSide;
    screen += lateralDir * spread * (16.0 + yawDisp * 0.48);
    screen += smokeDir * spread * 7.5;
  }

  float depthNorm = clamp((z3 + 36.0) / 92.0, 0.0, 1.0);
  vDepthShade = depthNorm;

  float level = mod(levelFlags, 16.0);
  float isAmbient = step(0.5, kind);
  float levelScale = level < 0.5 ? 0.78 : (level < 1.5 ? 1.0 : 1.26);
  float darkness = 1.0 - lum;
  float depthSize = max(-0.1, z3 * 0.0074);

  float edgeBoost = isMidpoint > 0.5 ? 1.35 : 1.0;
  float dotR = (
    mix(0.2, 0.12, isAmbient) +
    edge * 0.86 * edgeBoost +
    feature * 0.46 +
    darkness * 0.4 +
    depthSize
  ) * sizeJitter * levelScale;

  float lineGlow = edge * 0.42 + feature * 0.28;
  float nodeGlow = mix(0.12, 0.05, isAmbient) + lineGlow;
  float shimmer = 0.88 + (sin(uTime * 0.82 + pulseOffset * 0.9) * 0.5 + 0.5) * 0.28;
  float depthBoost = max(-0.06, z3 * 0.0038);
  float alpha = min(
    mix(0.94, 0.4, isAmbient),
    (nodeGlow + depthBoost + edge * 0.2) * shimmer
  );
  alpha *= 1.0 - sideTurnFade * turnAmt * 0.9;
  alpha *= 1.0 - smoothstep(0.22, 0.94, smoke) * 0.72;
  if (uLightTheme > 0.5) {
    alpha *= 1.0 - lightSide * 0.96;
    dotR *= 1.0 - lightSide * 0.62;
    if (lightSide > 0.84 && edgeW > 0.45) alpha = 0.0;
  }
  dotR *= mix(0.82, 1.08, depthNorm);
  dotR *= 1.0 - smoke * 0.35;
  if (smoke > 0.97 && edgeW > 0.62) alpha = 0.0;
  vAlpha = alpha;

  gl_Position = vec4(
    (screen.x / uSize.x) * 2.0 - 1.0,
    1.0 - (screen.y / uSize.y) * 2.0,
    0.0,
    1.0
  );
  gl_PointSize = max(1.0, dotR * 2.4 * uPixelRatio);
}
`;

export const wireframePointsFragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
varying float vSmoke;
varying float vDepthShade;

void main() {
  if (vAlpha < 0.02) discard;
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;
  float soft = 1.0 - smoothstep(0.18, 0.5, d);
  float puff = 1.0 - smoothstep(0.14, 0.5, d) * vSmoke * 0.5;
  vec3 col = (uColor / 255.0) * mix(0.42, 1.14, vDepthShade);
  gl_FragColor = vec4(col, vAlpha * soft * puff);
}
`;

/** @deprecated line pass removed — single Points draw */
export const lineVertexShader = wireframePointsVertexShader;
export const lineFragmentShader = wireframePointsFragmentShader;
export const pointVertexShader = wireframePointsVertexShader;
export const pointFragmentShader = wireframePointsFragmentShader;

/** Back-layer depth cloud — softer, larger, sits behind main wireframe. */
export const depthCloudVertexShader = /* glsl */ `
attribute float aPointIndex;
${pointDataFetchGlsl}
${gpuAnimationGlsl}

uniform float uYaw;
uniform float uTiltX;
uniform float uTiltY;
uniform float uFocal;
uniform vec2 uSize;
uniform float uPixelRatio;
uniform float uDepthPull;
uniform float uLightTheme;

varying float vAlpha;
varying float vDepthShade;

void main() {
  vec4 aPoint, aAttrs, aDrift, aMeta;
  loadPoint(aPointIndex, aPoint, aAttrs, aDrift, aMeta);
  aPoint.x *= uMeshScale.x;
  aPoint.y *= uMeshScale.y;

  float kind = aMeta.y;
  float edge = aAttrs.x;
  float feature = aAttrs.y;
  float sizeJitter = aAttrs.z;
  float pulseOffset = aDrift.x;

  float yaw = effectiveYaw(uYaw);
  vec3 groupFlow = groupFlowVec() * 0.72;

  float baseX = aPoint.x;
  float baseY = aPoint.y;
  float z = (aPoint.z + aAttrs.z) * 1.38 + uDepthPull;
  float shellX = (baseX - uPivot.x) / max(uRx, 1.0);
  float shellY = (baseY - uPivot.y) / max(uH * 0.48, 1.0);
  float yawShell = sin(yaw) * shellX * 26.0;
  float yawShellY = cos(yaw) * shellY * 5.0;
  float relX = (baseX - uPivot.x) + groupFlow.x + uTiltX * z * 0.07;
  float relY = (baseY - uPivot.y) + groupFlow.y;
  float relZ = z + groupFlow.z + yawShell + yawShellY;
  float cosY = cos(yaw);
  float sinY = sin(yaw);
  float x1 = relX * cosY + relZ * sinY;
  float z2 = -relX * sinY + relZ * cosY;
  float y1 = relY * cos(uTiltY) - z2 * sin(uTiltY);
  float z3 = relY * sin(uTiltY) + z2 * cos(uTiltY);
  float x2 = x1 + uTiltX * z3 * 0.42;
  float depthScale = uFocal / max(74.0, uFocal + z3);
  float yScale = 0.9 + depthScale * 0.1;
  vec2 screen = vec2(uPivot.x + x2 * depthScale, uPivot.y + y1 * yScale);

  float edgeRadial = length(vec2(shellX, shellY));
  float edgeW = smoothstep(0.34, 0.94, edgeRadial);
  float turnAmt = smoothstep(0.07, 0.2, abs(yaw));
  float lightSideFade = 0.0;
  if (uLightTheme > 0.5) {
    float sideMask = edgeW * smoothstep(0.22, 0.9, abs(shellX));
    lightSideFade = sideMask * turnAmt;
    vec2 lateralDir = normalize(vec2(sign(shellX) + shellX * 0.02, shellY * 0.08));
    screen += lateralDir * lightSideFade * lightSideFade * 11.0;
  }

  float depthNorm = clamp((z3 + 30.0) / 88.0, 0.0, 1.0);
  vDepthShade = depthNorm * 0.55;

  float dotR = (
    mix(0.42, 0.28, kind) +
    edge * 0.32 +
    feature * 0.18
  ) * sizeJitter;

  float shimmer = 0.82 + (sin(uTime * 0.55 + pulseOffset * 0.7) * 0.5 + 0.5) * 0.16;
  vAlpha = mix(0.1, 0.22, kind) * (0.75 + feature * 0.28) * shimmer;
  if (uLightTheme > 0.5) {
    vAlpha *= 1.0 - lightSideFade * 0.92;
  }

  gl_Position = vec4(
    (screen.x / uSize.x) * 2.0 - 1.0,
    1.0 - (screen.y / uSize.y) * 2.0,
    0.0,
    1.0
  );
  gl_PointSize = max(1.0, dotR * 4.2 * uPixelRatio);
}
`;

export const depthCloudFragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
varying float vDepthShade;

void main() {
  if (vAlpha < 0.015) discard;
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;
  float soft = 1.0 - smoothstep(0.08, 0.5, d);
  vec3 col = (uColor / 255.0) * mix(0.28, 0.62, vDepthShade);
  gl_FragColor = vec4(col, vAlpha * soft * soft);
}
`;

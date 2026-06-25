import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  NearestFilter,
  Points,
  RGBAFormat,
  ShaderMaterial,
  type Texture,
} from "three";
import type { GpuMeshBuffers } from "./mesh-packed";
import {
  depthCloudFragmentShader,
  depthCloudVertexShader,
  wireframePointsFragmentShader,
  wireframePointsVertexShader,
} from "./shaders";
import {
  makeInteractionUniforms,
  makeLayoutUniforms,
} from "./wireframe-interaction";
import { clampPixelRatio } from "./wireframe-renderer";

export type WireframeGpuGeometry = {
  points: Points;
  pointGeo: BufferGeometry;
  pointTexture: Texture;
  material: ShaderMaterial;
  pointTexSize: [number, number];
  drawCount: number;
  uniforms: Record<string, { value: unknown }>;
};

function makePointMaterial(
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, { value: unknown }>
) {
  return new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

export function gpuBuffersToGeometry(
  buffers: GpuMeshBuffers,
  display?: { w: number; h: number }
): WireframeGpuGeometry {
  const pixelRatio = clampPixelRatio();
  const pointTexture = new DataTexture(
    buffers.texData,
    buffers.texW,
    buffers.texH,
    RGBAFormat,
    FloatType
  );
  pointTexture.minFilter = NearestFilter;
  pointTexture.magFilter = NearestFilter;
  pointTexture.needsUpdate = true;

  const pointGeo = new BufferGeometry();
  pointGeo.setAttribute("aPointIndex", new BufferAttribute(buffers.pointIndices, 1));
  pointGeo.computeBoundingSphere();

  const layoutUniforms = makeLayoutUniforms(
    buffers.layout,
    [buffers.texW, buffers.texH],
    pixelRatio,
    display
  );
  const interactionUniforms = makeInteractionUniforms();
  const uniforms = {
    ...layoutUniforms,
    ...interactionUniforms,
    uPointData: { value: pointTexture },
  };

  const material = makePointMaterial(
    wireframePointsVertexShader,
    wireframePointsFragmentShader,
    uniforms
  );

  const points = new Points(pointGeo, material);
  points.frustumCulled = false;
  points.renderOrder = 1;

  return {
    points,
    pointGeo,
    pointTexture,
    material,
    pointTexSize: [buffers.texW, buffers.texH],
    drawCount: buffers.drawCount,
    uniforms: material.uniforms as Record<string, { value: unknown }>,
  };
}

/** Sparse depth cloud behind main wireframe — shares point texture, fewer vertices. */
export function gpuBuffersToDepthCloudGeometry(
  buffers: GpuMeshBuffers,
  pointTexture: Texture,
  display?: { w: number; h: number }
): WireframeGpuGeometry | null {
  if (buffers.depthCloudCount < 1) return null;

  const pixelRatio = clampPixelRatio();
  const pointGeo = new BufferGeometry();
  pointGeo.setAttribute("aPointIndex", new BufferAttribute(buffers.depthCloudIndices, 1));
  pointGeo.computeBoundingSphere();

  const layoutUniforms = makeLayoutUniforms(
    buffers.layout,
    [buffers.texW, buffers.texH],
    pixelRatio,
    display
  );
  const interactionUniforms = makeInteractionUniforms();
  const uniforms = {
    ...layoutUniforms,
    ...interactionUniforms,
    uPointData: { value: pointTexture },
    uDepthPull: { value: -34 },
  };

  const material = makePointMaterial(depthCloudVertexShader, depthCloudFragmentShader, uniforms);

  const points = new Points(pointGeo, material);
  points.frustumCulled = false;
  points.renderOrder = 0;

  return {
    points,
    pointGeo,
    pointTexture,
    material,
    pointTexSize: [buffers.texW, buffers.texH],
    drawCount: buffers.depthCloudCount,
    uniforms: material.uniforms as Record<string, { value: unknown }>,
  };
}

export function applyWireframePalette(
  uniforms: Record<string, { value: unknown }>,
  lineRgb: [number, number, number],
  isLight = false
) {
  uniforms.uColor.value = lineRgb;
  if (uniforms.uLightTheme) uniforms.uLightTheme.value = isLight ? 1 : 0;
}

export function applyDepthCloudPalette(
  uniforms: Record<string, { value: unknown }>,
  lineRgb: [number, number, number],
  isLight = false
) {
  uniforms.uColor.value = lineRgb.map((c) => Math.round(c * 0.42)) as [number, number, number];
  if (uniforms.uLightTheme) uniforms.uLightTheme.value = isLight ? 1 : 0;
}

export function disposeWireframeGpuGeometry(
  geo: WireframeGpuGeometry,
  opts?: { keepTexture?: boolean }
) {
  geo.material.dispose();
  geo.pointGeo.dispose();
  if (!opts?.keepTexture) geo.pointTexture.dispose();
}

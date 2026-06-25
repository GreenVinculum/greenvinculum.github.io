import { Vector2 } from "three";
import type { ParsedBinaryMesh } from "./mesh-binary";

export type InteractionUniforms = {
  uTime: { value: number };
  uYaw: { value: number };
  uTiltX: { value: number };
  uTiltY: { value: number };
  uFocal: { value: number };
  uPointer: { value: Vector2 };
  uPointerActive: { value: number };
  uPointerRadius: { value: number };
  uDragActive: { value: number };
  uScrollY: { value: number };
  uScrollVel: { value: number };
};

export type LayoutUniforms = {
  uPivot: { value: Vector2 };
  uSize: { value: Vector2 };
  uRx: { value: number };
  uH: { value: number };
  uMeshScale: { value: Vector2 };
  uRippleBand: { value: number };
  uPointTexSize: { value: Vector2 };
  uYawLimit: { value: number };
  uPixelRatio: { value: number };
  uColor: { value: [number, number, number] };
  uLightTheme: { value: number };
};

export function makeLayoutUniforms(
  layout: ParsedBinaryMesh["layout"],
  pointTexSize: [number, number],
  pixelRatio: number,
  display?: { w: number; h: number }
): LayoutUniforms {
  const dw = display?.w ?? layout.w;
  const dh = display?.h ?? layout.h;
  const sx = dw / layout.w;
  const sy = dh / layout.h;
  return {
    uPivot: { value: new Vector2(layout.pivotX * sx, layout.pivotY * sy) },
    uSize: { value: new Vector2(dw, dh) },
    uRx: { value: layout.rx * sx },
    uH: { value: layout.h * sy },
    uMeshScale: { value: new Vector2(sx, sy) },
    uRippleBand: { value: 72 },
    uPointTexSize: { value: new Vector2(pointTexSize[0], pointTexSize[1]) },
    uYawLimit: { value: Math.PI * 0.22 },
    uPixelRatio: { value: pixelRatio },
    uColor: { value: [174, 255, 214] },
    uLightTheme: { value: 0 },
  };
}

export function makeInteractionUniforms(): InteractionUniforms {
  return {
    uTime: { value: 0 },
    uYaw: { value: 0 },
    uTiltX: { value: 0 },
    uTiltY: { value: 0 },
    uFocal: { value: 348 },
    uPointer: { value: new Vector2(0, 0) },
    uPointerActive: { value: 0 },
    uPointerRadius: { value: 132 },
    uDragActive: { value: 0 },
    uScrollY: { value: 0 },
    uScrollVel: { value: 0 },
  };
}

export class WireframeInteraction {
  yaw = 0;
  yawVelocity = 0;
  readonly yawLimit = Math.PI * 0.22;
  pointerActive = false;
  pointerX = 0;
  pointerY = 0;
  dragActive = false;
  private lastDragX = 0;
  private tiltX = 0;
  private tiltY = 0;
  private capturedPointerId: number | null = null;
  private readonly pointerOut = new Vector2();

  constructor(
    private eventTarget: HTMLElement,
    private canvas: HTMLCanvasElement,
    private layoutW: number,
    private layoutH: number
  ) {
    eventTarget.style.cursor = "grab";
    canvas.style.pointerEvents = "auto";
  }

  canvasPoint(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const rw = rect.width || 1;
    const rh = rect.height || 1;
    return {
      x: ((event.clientX - rect.left) / rw) * this.layoutW,
      y: ((event.clientY - rect.top) / rh) * this.layoutH,
    };
  }

  private trackPointer(event: PointerEvent) {
    const pos = this.canvasPoint(event);
    this.pointerX = pos.x;
    this.pointerY = pos.y;
    this.pointerActive = true;
  }

  onPointerEnter = (event: PointerEvent) => {
    this.trackPointer(event);
  };

  onPointerDown = (event: PointerEvent) => {
    this.trackPointer(event);
    this.dragActive = true;
    this.lastDragX = event.clientX;
    this.eventTarget.style.cursor = "grabbing";
    this.capturedPointerId = event.pointerId;
    this.eventTarget.setPointerCapture(event.pointerId);
  };

  onPointerMove = (event: PointerEvent) => {
    this.trackPointer(event);
    if (!this.dragActive) return;
    const dx = event.clientX - this.lastDragX;
    this.lastDragX = event.clientX;
    this.yaw += dx * 0.005;
    this.yaw = Math.max(-this.yawLimit, Math.min(this.yawLimit, this.yaw));
    this.yawVelocity = dx * 0.00072;
  };

  onPointerUp = (event: PointerEvent) => {
    this.dragActive = false;
    this.eventTarget.style.cursor = "grab";
    if (this.capturedPointerId !== null) {
      try {
        this.eventTarget.releasePointerCapture(this.capturedPointerId);
      } catch {
        /* already released */
      }
      this.capturedPointerId = null;
    }
    this.trackPointer(event);
  };

  onPointerLeave = () => {
    this.pointerActive = false;
    this.dragActive = false;
    this.eventTarget.style.cursor = "grab";
    this.capturedPointerId = null;
  };

  attach() {
    this.eventTarget.addEventListener("pointerenter", this.onPointerEnter);
    this.eventTarget.addEventListener("pointerdown", this.onPointerDown);
    this.eventTarget.addEventListener("pointermove", this.onPointerMove);
    this.eventTarget.addEventListener("pointerup", this.onPointerUp);
    this.eventTarget.addEventListener("pointercancel", this.onPointerUp);
    this.eventTarget.addEventListener("pointerleave", this.onPointerLeave);
  }

  detach() {
    this.eventTarget.removeEventListener("pointerenter", this.onPointerEnter);
    this.eventTarget.removeEventListener("pointerdown", this.onPointerDown);
    this.eventTarget.removeEventListener("pointermove", this.onPointerMove);
    this.eventTarget.removeEventListener("pointerup", this.onPointerUp);
    this.eventTarget.removeEventListener("pointercancel", this.onPointerUp);
    this.eventTarget.removeEventListener("pointerleave", this.onPointerLeave);
  }

  /** CPU: drag yaw + pointer tilt; idle sway/ripples/scroll bias use shader uniforms. */
  tick(
    uTime: number,
    scroll?: { uScrollY: number; uScrollVel: number }
  ): InteractionUniforms {
    this.yaw += this.yawVelocity;
    this.yaw = Math.max(-this.yawLimit, Math.min(this.yawLimit, this.yaw));
    this.yawVelocity *= this.dragActive ? 0.82 : 0.94;
    if ((this.yaw >= this.yawLimit && this.yawVelocity > 0) || (this.yaw <= -this.yawLimit && this.yawVelocity < 0)) {
      this.yawVelocity *= 0.55;
    }

    const pivotX = this.layoutW * 0.5;
    const pivotY = this.layoutH * 0.4;
    const nx = this.pointerActive ? (this.pointerX - pivotX) / Math.max(1, pivotX) : 0;
    const ny = this.pointerActive ? (this.pointerY - pivotY) / Math.max(1, pivotY) : 0;
    const targetTiltX = Math.max(-0.16, Math.min(0.16, nx * 0.15));
    const targetTiltY = Math.max(-0.11, Math.min(0.11, ny * 0.095));
    const tiltLerp = this.pointerActive ? 0.22 : 0.08;
    this.tiltX += (targetTiltX - this.tiltX) * tiltLerp;
    this.tiltY += (targetTiltY - this.tiltY) * tiltLerp;

    return {
      uTime: { value: uTime },
      uYaw: { value: this.yaw },
      uTiltX: { value: this.tiltX },
      uTiltY: { value: this.tiltY },
      uFocal: {
        value: (this.dragActive ? 215 : this.pointerActive ? 288 : 348) - (scroll?.uScrollY ?? 0) * 18,
      },
      uPointer: { value: this.pointerOut.set(this.pointerX, this.pointerY) },
      uPointerActive: { value: this.pointerActive ? 1 : 0 },
      uPointerRadius: { value: this.dragActive ? 148 : 148 },
      uDragActive: { value: this.dragActive ? 1 : 0 },
      uScrollY: { value: scroll?.uScrollY ?? 0 },
      uScrollVel: { value: scroll?.uScrollVel ?? 0 },
    };
  }
}

function copyVec2(target: { value: unknown }, source: Vector2) {
  const v = target.value;
  if (v && typeof (v as Vector2).set === "function") {
    (v as Vector2).copy(source);
  } else {
    target.value = source.clone();
  }
}

export function applyInteractionUniforms(
  target: Record<string, { value: unknown }>,
  interaction: ReturnType<WireframeInteraction["tick"]>
) {
  target.uTime.value = interaction.uTime.value;
  target.uYaw.value = interaction.uYaw.value;
  target.uTiltX.value = interaction.uTiltX.value;
  target.uTiltY.value = interaction.uTiltY.value;
  target.uFocal.value = interaction.uFocal.value;
  copyVec2(target.uPointer, interaction.uPointer.value);
  target.uPointerActive.value = interaction.uPointerActive.value;
  target.uPointerRadius.value = interaction.uPointerRadius.value;
  target.uDragActive.value = interaction.uDragActive.value;
  target.uScrollY.value = interaction.uScrollY.value;
  target.uScrollVel.value = interaction.uScrollVel.value;
}

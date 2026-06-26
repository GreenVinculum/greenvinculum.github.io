import type { TennisGameOptions, TennisHudState, TennisMatchPhase } from "./types";

const MATCH_WIN = 21;
const PADDLE_W_RATIO = 0.16;
const PADDLE_H = 10;
const BALL_R = 7;
const NET_H = 3;
const WALL_PAD = 12;
const SERVE_DELAY_MS = 900;
const POINT_DELAY_MS = 1200;
const BASE_BALL_SPEED = 2.2;
const MAX_BALL_SPEED = 5.4;
const PADDLE_HIT_BOOST = 1.025;
const NET_CLIP_SPEED_SCALE = 0.78;
const CARRY_MOMENTUM_GAIN = 0.24;
const CARRY_LAUNCH_SLIDE = 1.35;
const CARRY_LAUNCH_POWER = 2.1;
const PADDLE_SPEED_SCALE = 5.8;
const PADDLE_ACCEL = 0.2;
const POINTER_GAIN = 0.11;
const FRAME_MS = 1000 / 60;

export class TennisGame {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width = 0;
  private height = 0;
  private dpr = 1;

  private phase: TennisMatchPhase = "menu";
  private paused = false;
  private phaseBeforePause: TennisMatchPhase = "playing";
  private playerX = 0;
  private playerVel = 0;
  private playerPaddleVx = 0;
  private carryMomentumVx = 0;
  private carryPower = 0;
  private playerCarrying = false;
  private aiX = 0;
  private aiPaddleVx = 0;
  private aiCarryMomentumVx = 0;
  private aiCarryPower = 0;
  private aiCarrying = false;
  private aiCarryAimX = 0;
  private aiWanderPhase = 0;
  private pointerX: number | null = null;
  private keys = { left: false, right: false };

  private ball = { x: 0, y: 0, vx: 0, vy: 0 };
  private playerScore = 0;
  private aiScore = 0;
  private aiLevel = 1;
  private pointWinner: "player" | "ai" | null = null;
  private matchWinner: "player" | "ai" | null = null;
  private phaseTimer = 0;
  private serveDirection: 1 | -1 = -1;
  private pendingServeVx = 0;
  private pendingServeVy = 0;
  private aiAimOffset = 0;
  private aiAimTimer = 0;
  private netBounceCooldown = 0;
  private raf = 0;
  private lastTs = 0;

  private onHudUpdate: TennisGameOptions["onHudUpdate"];
  private onMatchComplete: TennisGameOptions["onMatchComplete"];
  private onResize: () => void;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;

  constructor(options: TennisGameOptions) {
    this.canvas = options.canvas;
    this.ctx = options.canvas.getContext("2d")!;
    this.onHudUpdate = options.onHudUpdate;
    this.onMatchComplete = options.onMatchComplete;
    this.aiLevel = Math.max(1, options.initialAiLevel ?? 1);

    this.onResize = () => this.resize();
    this.onKeyDown = (e) => this.handleKeyDown(e);
    this.onKeyUp = (e) => this.handleKeyUp(e);
    this.bindInput();
    this.resize();
    window.addEventListener("resize", this.onResize);
    this.emitHud();
    this.lastTs = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  togglePause() {
    if (this.phase === "menu" || this.phase === "matchover" || this.phase === "point") return;

    if (this.paused) {
      this.paused = false;
      this.phase = this.phaseBeforePause;
    } else {
      this.phaseBeforePause = this.phase;
      this.paused = true;
      this.phase = "paused";
    }
    this.emitHud();
  }

  startMatch(aiLevel = 1) {
    this.aiLevel = Math.max(1, aiLevel);
    this.playerScore = 0;
    this.aiScore = 0;
    this.pointWinner = null;
    this.matchWinner = null;
    this.paused = false;
    this.netBounceCooldown = 0;
    this.resetCarry();
    this.centerPaddles();
    this.refreshAiAimOffset();
    this.enterServe(-1);
  }

  private paddleWidth() {
    return this.width * PADDLE_W_RATIO;
  }

  /** Gentle ramp: Lv 1 is very weak; approaches full strength around Lv 30. */
  private aiSkill() {
    const t = Math.min(1, Math.max(0, (this.aiLevel - 1) / 29));
    return t * t * (3 - 2 * t);
  }

  private playerY() {
    return this.height - WALL_PAD - PADDLE_H;
  }

  private aiY() {
    return WALL_PAD;
  }

  private netY() {
    return this.height / 2;
  }

  private resetCarry() {
    this.resetPlayerCarry();
    this.resetAiCarry();
    this.playerVel = 0;
    this.playerPaddleVx = 0;
  }

  private resetPlayerCarry() {
    this.playerCarrying = false;
    this.carryMomentumVx = 0;
    this.carryPower = 0;
  }

  private resetAiCarry() {
    this.aiCarrying = false;
    this.aiCarryMomentumVx = 0;
    this.aiCarryPower = 0;
  }

  private centerPaddles() {
    const cx = this.width / 2;
    this.playerX = cx;
    this.playerVel = 0;
    this.playerPaddleVx = 0;
    this.aiX = cx;
    this.aiPaddleVx = 0;
    this.aiCarryAimX = cx;
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(320, Math.floor(rect.width));
    this.height = Math.max(240, Math.floor(rect.height));
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.centerPaddles();
  }

  private bindInput() {
    const setPointer = (clientX: number) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerX = ((clientX - rect.left) / rect.width) * this.width;
    };

    this.canvas.addEventListener("mousemove", (e) => {
      if (this.phase === "menu" || this.phase === "matchover" || this.phase === "paused") return;
      setPointer(e.clientX);
    });

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        if (this.phase === "menu" || this.phase === "matchover" || this.phase === "paused") return;
        e.preventDefault();
        if (e.touches[0]) setPointer(e.touches[0].clientX);
      },
      { passive: false }
    );

    this.canvas.addEventListener("mouseleave", () => {
      this.pointerX = null;
    });

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);

    this.canvas.addEventListener("click", () => this.handleAction());
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      this.togglePause();
      return;
    }
    if (this.phase === "paused") return;

    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.keys.right = true;
    if (e.key === " " || e.key === "Enter") this.handleAction();
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.keys.right = false;
  }

  private handleAction() {
    if (this.phase === "paused") return;
    if (this.phase === "menu") {
      this.startMatch(this.aiLevel);
      return;
    }
    if (this.phase === "matchover") {
      const nextLevel =
        this.matchWinner === "player"
          ? this.aiLevel + 1
          : Math.max(1, this.aiLevel - 1);
      this.startMatch(nextLevel);
    }
  }

  private placeBallOnServer() {
    if (this.serveDirection === 1) {
      this.ball.x = this.aiX;
      this.ball.y = this.aiY() + PADDLE_H + BALL_R;
    } else {
      this.ball.x = this.playerX;
      this.ball.y = this.playerY() - BALL_R;
    }
  }

  private enterServe(direction: 1 | -1) {
    this.serveDirection = direction;
    this.phase = "serve";
    this.phaseBeforePause = "serve";
    this.paused = false;
    this.phaseTimer = SERVE_DELAY_MS;
    this.netBounceCooldown = 0;
    this.resetCarry();
    const skill = this.aiSkill();
    const speed = BASE_BALL_SPEED + skill * skill * 0.85;
    this.pendingServeVx = (Math.random() > 0.5 ? 1 : -1) * speed * 0.42;
    this.pendingServeVy = direction * speed;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.placeBallOnServer();
    this.emitHud();
  }

  private emitHud() {
    const state: TennisHudState = {
      phase: this.phase,
      paused: this.paused,
      playerScore: this.playerScore,
      aiScore: this.aiScore,
      aiLevel: this.aiLevel,
      pointWinner: this.pointWinner,
      matchWinner: this.matchWinner,
    };
    this.onHudUpdate(state);
  }

  private loop = (ts: number) => {
    const dt = Math.min(32, ts - this.lastTs);
    this.lastTs = ts;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (this.phase === "menu" || this.phase === "paused") return;

    if (this.phase === "point" || this.phase === "serve" || this.phase === "matchover") {
      if (this.phase === "serve") {
        this.updatePlayer(dt);
        this.updateAi(dt);
        if (this.serveDirection === -1) {
          this.handlePlayerCarry(dt / FRAME_MS);
          if (this.playerCarrying) {
            this.placeBallOnPlayerCarry();
          } else {
            this.placeBallOnServer();
          }
        } else {
          this.updateAiCarryIntent();
          this.handleAiCarry(dt / FRAME_MS);
          if (this.aiCarrying) {
            this.placeBallOnAiCarry();
          } else {
            this.placeBallOnServer();
          }
        }
      }

      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (this.phase === "point") {
          if (this.matchWinner) {
            this.phase = "matchover";
            this.phaseTimer = 0;
            this.onMatchComplete({
              playerScore: this.playerScore,
              aiScore: this.aiScore,
              aiLevel: this.aiLevel,
              playerWon: this.matchWinner === "player",
            });
            this.emitHud();
          } else {
            const serverIsAi = this.pointWinner === "player";
            this.pointWinner = null;
            this.enterServe(serverIsAi ? 1 : -1);
          }
        } else if (this.phase === "serve") {
          if (this.serveDirection === -1 && (this.carryPower > 0.4 || Math.abs(this.carryMomentumVx) > 0.4)) {
            this.launchBallFromPlayerCarry(true);
          } else if (this.serveDirection === 1 && (this.aiCarryPower > 0.4 || Math.abs(this.aiCarryMomentumVx) > 0.4)) {
            this.launchBallFromAiCarry(true);
          } else {
            this.ball.vx = this.pendingServeVx;
            this.ball.vy = this.pendingServeVy;
          }
          this.resetCarry();
          this.phase = "playing";
          this.phaseBeforePause = "playing";
          this.emitHud();
        }
      }
      return;
    }

    if (this.phase !== "playing") return;

    this.netBounceCooldown = Math.max(0, this.netBounceCooldown - dt);
    this.updatePlayer(dt);
    this.updateAi(dt);
    this.updateBall(dt);
  }

  private updatePlayer(dt: number) {
    const pw = this.paddleWidth();
    const half = pw / 2;
    const minX = WALL_PAD + half;
    const maxX = this.width - WALL_PAD - half;
    const scale = this.width / 640;
    const step = dt / FRAME_MS;
    const maxSpeed = PADDLE_SPEED_SCALE * scale;
    const blend = 1 - Math.exp(-PADDLE_ACCEL * dt / FRAME_MS);

    let targetVel = 0;
    if (this.keys.left) targetVel -= maxSpeed;
    if (this.keys.right) targetVel += maxSpeed;

    if (this.pointerX !== null && !this.keys.left && !this.keys.right) {
      const dist = this.pointerX - this.playerX;
      targetVel = Math.max(-maxSpeed, Math.min(maxSpeed, dist * POINTER_GAIN * scale));
    }

    this.playerVel += (targetVel - this.playerVel) * blend;

    if (!this.keys.left && !this.keys.right && this.pointerX === null) {
      this.playerVel *= Math.pow(0.78, step);
    }

    this.playerX += this.playerVel * step;
    if (this.playerX <= minX) {
      this.playerX = minX;
      this.playerVel = Math.max(0, this.playerVel);
    }
    if (this.playerX >= maxX) {
      this.playerX = maxX;
      this.playerVel = Math.min(0, this.playerVel);
    }

    this.playerPaddleVx = this.playerVel;
  }

  private refreshAiAimOffset() {
    const skill = this.aiSkill();
    const error = Math.max(22, 88 - skill * 64);
    this.aiAimOffset = (Math.random() - 0.5) * error;
    this.aiAimTimer = 320 + Math.random() * 280 - skill * 140;
  }

  private updateAi(dt: number) {
    const skill = this.aiSkill();
    const pw = this.paddleWidth();
    const half = pw / 2;
    const minX = WALL_PAD + half;
    const maxX = this.width - WALL_PAD - half;
    const prevAiX = this.aiX;
    const step = dt / FRAME_MS;

    this.aiAimTimer -= dt;
    if (this.aiAimTimer <= 0) this.refreshAiAimOffset();

    this.updateAiCarryIntent();

    this.aiWanderPhase += dt * (0.0016 + skill * 0.0012);
    const wander = Math.sin(this.aiWanderPhase) * this.width * (0.11 - skill * 0.08);
    const centerX = this.width / 2;
    const net = this.netY();
    const ballClosing = this.ball.vy < 0;
    const ballNearAi = this.ball.y < net + this.height * (0.22 + skill * 0.12);

    let targetX = centerX + wander;

    if (ballClosing && ballNearAi) {
      const track = 0.12 + skill * 0.78;
      targetX = targetX * (1 - track) + this.ball.x * track;
    }

    if (skill > 0.14 && ballClosing && ballNearAi) {
      const timeToNet = (this.ball.y - net) / Math.max(0.001, -this.ball.vy);
      const predict = (skill - 0.12) * 0.72;
      const predX = this.ball.x + this.ball.vx * timeToNet * predict;
      targetX = targetX * (1 - predict) + predX * predict;
    }

    targetX += this.aiAimOffset * (0.75 + skill * 0.25);

    if (skill < 0.45 && this.ball.vy > 0 && !this.aiCarrying) {
      targetX = centerX + wander * 0.7 + this.aiAimOffset * 0.45;
    }

    if (this.aiCarrying || this.isBallOnAiPaddle()) {
      const overshoot = 0.72 + skill * 0.42;
      targetX = this.aiCarryAimX + (this.aiCarryAimX - this.aiX) * overshoot;
    } else if (this.phase === "serve" && this.serveDirection === 1 && skill > 0.22) {
      targetX = this.aiCarryAimX;
    }

    const smooth = 1 - Math.exp(-(0.002 + skill * skill * 0.015) * dt);
    this.aiX += (targetX - this.aiX) * smooth;
    this.aiX = Math.max(minX, Math.min(maxX, this.aiX));
    this.aiPaddleVx = step > 0 ? (this.aiX - prevAiX) / step : 0;
  }

  private updateAiCarryIntent() {
    const skill = this.aiSkill();
    if (skill < 0.22) return;

    const pw = this.paddleWidth();
    const away = this.playerX > this.width / 2 ? -1 : 1;
    const spread = pw * (0.35 + Math.random() * (0.45 + skill * 0.35));

    if (this.phase === "serve" && this.serveDirection === 1) {
      this.aiCarryAimX = this.playerX + away * spread * (0.55 + skill * 0.35) + this.aiAimOffset * 0.5;
      return;
    }

    if (this.ball.vy >= 0 && !this.aiCarrying) return;

    const approachSpeed = Math.hypot(this.ball.vx, this.ball.vy);
    const catchLimit = MAX_BALL_SPEED * (0.5 + skill * 0.38);
    if (approachSpeed > catchLimit && !this.aiCarrying) return;

    this.aiCarryAimX = this.playerX + away * spread + this.aiAimOffset * (0.7 + skill * 0.3);
  }

  private updateBall(dt: number) {
    const step = dt / FRAME_MS;
    const prevY = this.ball.y;
    const playerCarrying = this.handlePlayerCarry(step);
    const aiCarrying = !playerCarrying && this.handleAiCarry(step);

    if (!playerCarrying && !aiCarrying) {
      this.ball.x += this.ball.vx * step;
      this.ball.y += this.ball.vy * step;
    }

    const r = BALL_R;

    if (this.ball.x - r <= WALL_PAD) {
      this.ball.x = WALL_PAD + r;
      this.ball.vx = Math.abs(this.ball.vx);
    }
    if (this.ball.x + r >= this.width - WALL_PAD) {
      this.ball.x = this.width - WALL_PAD - r;
      this.ball.vx = -Math.abs(this.ball.vx);
    }

    this.collideNet(prevY);
    if (!this.aiCarrying) {
      this.collidePaddle(this.aiX, this.aiY(), 1);
    }
    if (!this.playerCarrying) {
      this.collidePaddle(this.playerX, this.playerY(), -1);
    }

    if (this.ball.y - r < WALL_PAD) {
      this.awardPoint("player");
      return;
    }
    if (this.ball.y + r > this.height - WALL_PAD) {
      this.awardPoint("ai");
    }
  }

  private isBallOnPlayerPaddle() {
    const pw = this.paddleWidth();
    const left = this.playerX - pw / 2;
    const right = this.playerX + pw / 2;
    const top = this.playerY();
    const r = BALL_R;

    return (
      this.ball.x + r > left &&
      this.ball.x - r < right &&
      this.ball.y + r >= top - 2 &&
      this.ball.y - r <= top + PADDLE_H + 3 &&
      this.ball.vy > -1.4
    );
  }

  private placeBallOnPlayerCarry() {
    const pw = this.paddleWidth();
    const hit = Math.max(-1, Math.min(1, (this.ball.x - this.playerX) / (pw / 2)));
    this.ball.x = this.playerX + hit * (pw / 2) * 0.92;
    this.ball.y = this.playerY() - BALL_R;
  }

  private placeBallOnAiCarry() {
    const pw = this.paddleWidth();
    const hit = Math.max(-1, Math.min(1, (this.ball.x - this.aiX) / (pw / 2)));
    this.ball.x = this.aiX + hit * (pw / 2) * 0.92;
    this.ball.y = this.aiY() + PADDLE_H + BALL_R;
  }

  private isBallOnAiPaddle() {
    const pw = this.paddleWidth();
    const left = this.aiX - pw / 2;
    const right = this.aiX + pw / 2;
    const bottom = this.aiY() + PADDLE_H;
    const r = BALL_R;

    return (
      this.ball.x + r > left &&
      this.ball.x - r < right &&
      this.ball.y - r <= bottom + 3 &&
      this.ball.y + r >= this.aiY() - 2 &&
      this.ball.vy < 1.4
    );
  }

  private handlePlayerCarry(step: number): boolean {
    const onPaddle = this.isBallOnPlayerPaddle();
    const slideVx = this.playerPaddleVx;
    const approachSpeed = Math.hypot(this.ball.vx, this.ball.vy);
    const canCatch =
      this.playerCarrying || approachSpeed < MAX_BALL_SPEED * 0.82 || this.ball.vy < 1.8;

    if (onPaddle && canCatch && this.ball.vy > -1.2) {
      this.playerCarrying = true;
      const pw = this.paddleWidth();

      this.carryMomentumVx = this.carryMomentumVx * 0.9 + slideVx * CARRY_MOMENTUM_GAIN;
      this.carryPower = Math.min(
        3.8,
        this.carryPower * 0.97 + Math.abs(slideVx) * 0.07
      );

      const hit = Math.max(-1, Math.min(1, (this.ball.x - this.playerX) / (pw / 2)));
      this.ball.x = this.playerX + hit * (pw / 2) * 0.92 + slideVx * step * 0.55;
      this.ball.y = this.playerY() - BALL_R;
      this.ball.vx = this.carryMomentumVx;
      this.ball.vy = -0.12 - Math.abs(slideVx) * 0.05;

      if (Math.abs(slideVx) >= CARRY_LAUNCH_SLIDE || this.carryPower >= CARRY_LAUNCH_POWER) {
        this.launchBallFromPlayerCarry();
        return false;
      }
      return true;
    }

    if (this.playerCarrying && !onPaddle) {
      this.launchBallFromPlayerCarry();
    }

    this.playerCarrying = false;
    return false;
  }

  private handleAiCarry(step: number): boolean {
    const skill = this.aiSkill();
    if (skill < 0.22) return false;

    const onPaddle = this.isBallOnAiPaddle();
    const slideVx = this.aiPaddleVx;
    const approachSpeed = Math.hypot(this.ball.vx, this.ball.vy);
    const catchLimit = MAX_BALL_SPEED * (0.48 + skill * 0.4);
    const canCatch =
      this.aiCarrying || approachSpeed < catchLimit || this.ball.vy > -1.8;

    if (onPaddle && canCatch && this.ball.vy < 1.2) {
      this.aiCarrying = true;
      const pw = this.paddleWidth();
      const carryGain = CARRY_MOMENTUM_GAIN * (0.35 + skill * 0.65);

      this.aiCarryMomentumVx = this.aiCarryMomentumVx * 0.9 + slideVx * carryGain;
      this.aiCarryPower = Math.min(
        3.8,
        this.aiCarryPower * 0.97 + Math.abs(slideVx) * 0.07 * (0.4 + skill * 0.6)
      );

      const hit = Math.max(-1, Math.min(1, (this.ball.x - this.aiX) / (pw / 2)));
      this.ball.x = this.aiX + hit * (pw / 2) * 0.92 + slideVx * step * 0.55;
      this.ball.y = this.aiY() + PADDLE_H + BALL_R;
      this.ball.vx = this.aiCarryMomentumVx;
      this.ball.vy = 0.12 + Math.abs(slideVx) * 0.05;

      const aiLaunchSlide = CARRY_LAUNCH_SLIDE * (1.18 - skill * 0.28);
      const aiLaunchPower = CARRY_LAUNCH_POWER * (1.14 - skill * 0.22);
      if (Math.abs(slideVx) >= aiLaunchSlide || this.aiCarryPower >= aiLaunchPower) {
        this.launchBallFromAiCarry();
        return false;
      }
      return true;
    }

    if (this.aiCarrying && !onPaddle) {
      this.launchBallFromAiCarry();
    }

    this.aiCarrying = false;
    return false;
  }

  private launchBallFromPlayerCarry(fromServe = false) {
    const pw = this.paddleWidth();
    const hit = Math.max(-1, Math.min(1, (this.ball.x - this.playerX) / (pw / 2)));
    const slideVx = this.playerPaddleVx;
    const slideBoost = Math.abs(slideVx) + Math.abs(this.carryMomentumVx) + this.carryPower * 0.35;

    const outSpeed = Math.min(
      MAX_BALL_SPEED,
      Math.max(BASE_BALL_SPEED * 0.85, BASE_BALL_SPEED + slideBoost * 0.62)
    );

    this.ball.vx = hit * outSpeed * 0.68 + this.carryMomentumVx * 1.2 + slideVx * 1.05;
    this.ball.vy = fromServe
      ? -Math.abs(outSpeed * (0.82 + slideBoost * 0.05))
      : -Math.abs(outSpeed * (0.9 + slideBoost * 0.04));
    this.ball.y = this.playerY() - BALL_R - 1;

    this.carryMomentumVx = 0;
    this.carryPower = 0;
    this.playerCarrying = false;
  }

  private launchBallFromAiCarry(fromServe = false) {
    const pw = this.paddleWidth();
    const hit = Math.max(-1, Math.min(1, (this.ball.x - this.aiX) / (pw / 2)));
    const slideVx = this.aiPaddleVx;
    const slideBoost = Math.abs(slideVx) + Math.abs(this.aiCarryMomentumVx) + this.aiCarryPower * 0.35;

    const outSpeed = Math.min(
      MAX_BALL_SPEED,
      Math.max(BASE_BALL_SPEED * 0.85, BASE_BALL_SPEED + slideBoost * 0.62)
    );

    this.ball.vx = hit * outSpeed * 0.68 + this.aiCarryMomentumVx * 1.2 + slideVx * 1.05;
    this.ball.vy = fromServe
      ? Math.abs(outSpeed * (0.82 + slideBoost * 0.05))
      : Math.abs(outSpeed * (0.9 + slideBoost * 0.04));
    this.ball.y = this.aiY() + PADDLE_H + BALL_R + 1;

    this.aiCarryMomentumVx = 0;
    this.aiCarryPower = 0;
    this.aiCarrying = false;
  }

  private collideNet(prevY: number) {
    if (this.netBounceCooldown > 0) return;

    const netY = this.netY();
    const netTop = netY - NET_H / 2;
    const netBottom = netY + NET_H / 2;
    const r = BALL_R;
    const inX = this.ball.x + r > WALL_PAD && this.ball.x - r < this.width - WALL_PAD;

    if (!inX) return;

    const towardAi = this.ball.vy < 0;
    const towardPlayer = this.ball.vy > 0;
    const crossedTowardAi =
      towardAi && prevY - r >= netBottom && this.ball.y - r <= netBottom;
    const crossedTowardPlayer =
      towardPlayer && prevY + r <= netTop && this.ball.y + r >= netTop;

    if (!crossedTowardAi && !crossedTowardPlayer) return;

    const speed = Math.hypot(this.ball.vx, this.ball.vy);
    if (speed < 0.35) return;

    this.netBounceCooldown = 140;

    const outSpeed = Math.max(
      BASE_BALL_SPEED * 0.55,
      speed * (NET_CLIP_SPEED_SCALE + Math.random() * 0.1)
    );
    const forwardSign = towardAi ? -1 : 1;
    const lateral = (Math.random() - 0.5) * 2.2;
    const forward = 0.7 + Math.random() * 0.45;

    this.ball.vx = lateral * outSpeed * 0.62;
    this.ball.vy = forwardSign * forward * outSpeed;

    if (towardAi) {
      this.ball.y = netTop - r - 1;
    } else {
      this.ball.y = netBottom + r + 1;
    }
  }

  private collidePaddle(paddleX: number, paddleY: number, dir: 1 | -1) {
    const pw = this.paddleWidth();
    const left = paddleX - pw / 2;
    const right = paddleX + pw / 2;
    const top = paddleY;
    const bottom = paddleY + PADDLE_H;
    const r = BALL_R;

    const inX = this.ball.x + r > left && this.ball.x - r < right;
    const approaching =
      dir === 1 ? this.ball.vy < 0 && this.ball.y - r <= bottom : this.ball.vy > 0 && this.ball.y + r >= top;

    if (!inX || !approaching) return;

    if (dir === 1) {
      const skill = this.aiSkill();
      const reach = 0.28 + skill * 0.72;
      const hitFrac = Math.abs(this.ball.x - paddleX) / (pw / 2);
      if (hitFrac > reach) return;
      if (skill < 0.35 && Math.random() < 0.22 * (1 - skill / 0.35)) return;
    }

    const hit = (this.ball.x - paddleX) / (pw / 2);
    const speed = Math.min(
      MAX_BALL_SPEED,
      Math.hypot(this.ball.vx, this.ball.vy) * PADDLE_HIT_BOOST
    );
    const minSpeed = BASE_BALL_SPEED * 0.85;
    let outSpeed = Math.max(minSpeed, speed);

    if (dir === -1) {
      const slideVx = this.playerPaddleVx;
      const slideBoost = Math.abs(slideVx) + this.carryPower * 0.25;
      outSpeed = Math.min(MAX_BALL_SPEED, outSpeed + slideBoost * 0.5);
      this.ball.vy = -Math.abs(outSpeed * (0.9 + slideBoost * 0.035));
      this.ball.vx = hit * outSpeed * 0.72 + slideVx * 1.15 + this.carryMomentumVx * 0.5;
      this.resetPlayerCarry();
    } else {
      const slideVx = this.aiPaddleVx;
      const skill = this.aiSkill();
      const slideBoost = (Math.abs(slideVx) + this.aiCarryPower * 0.25) * (0.35 + skill * 0.65);
      outSpeed = Math.min(MAX_BALL_SPEED, outSpeed + slideBoost * 0.5);
      this.ball.vy = Math.abs(outSpeed * (0.9 + slideBoost * 0.035));
      this.ball.vx = hit * outSpeed * (0.62 + skill * 0.14) + slideVx * (0.55 + skill * 0.6) + this.aiCarryMomentumVx * (0.25 + skill * 0.35);
      this.resetAiCarry();
    }

    this.ball.y = dir === 1 ? bottom + r : top - r;
  }

  private awardPoint(winner: "player" | "ai") {
    this.resetCarry();
    if (winner === "player") this.playerScore += 1;
    else this.aiScore += 1;

    this.pointWinner = winner;
    this.phase = "point";
    this.phaseBeforePause = "point";
    this.paused = false;
    this.phaseTimer = POINT_DELAY_MS;

    if (this.isMatchWon(this.playerScore, this.aiScore)) {
      this.matchWinner = this.playerScore > this.aiScore ? "player" : "ai";
    }

    this.emitHud();
  }

  private isMatchWon(player: number, ai: number) {
    if (player >= MATCH_WIN && player >= ai + 2) return true;
    if (ai >= MATCH_WIN && ai >= player + 2) return true;
    if (player >= MATCH_WIN && ai < MATCH_WIN - 1) return true;
    if (ai >= MATCH_WIN && player < MATCH_WIN - 1) return true;
    return false;
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = "hsl(160 18% 8%)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = "hsl(160 40% 28%)";
    ctx.lineWidth = 2;
    ctx.strokeRect(WALL_PAD, WALL_PAD, this.width - WALL_PAD * 2, this.height - WALL_PAD * 2);

    const netY = this.netY();
    ctx.fillStyle = "hsl(0 0% 92%)";
    ctx.fillRect(WALL_PAD, netY - NET_H / 2, this.width - WALL_PAD * 2, NET_H);
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = "hsl(160 50% 40% / 0.5)";
    ctx.beginPath();
    ctx.moveTo(WALL_PAD, netY);
    ctx.lineTo(this.width - WALL_PAD, netY);
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawPaddle(this.aiX, this.aiY(), "hsl(0 75% 58%)");
    this.drawPaddle(this.playerX, this.playerY(), "hsl(174 72% 48%)");

    if (this.phase !== "menu") {
      ctx.fillStyle = "hsl(200 90% 72%)";
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "hsl(200 100% 92%)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (this.phase === "menu") {
      this.drawCenterText("Pocket Tennis", "Click or press Enter to serve");
    } else if (this.phase === "paused") {
      this.drawCenterText("Paused", "Press P or Esc to resume");
    } else if (this.phase === "matchover" && this.matchWinner) {
      const won = this.matchWinner === "player";
      this.drawCenterText(
        won ? "You win!" : "CPU wins",
        won ? "Click to face a harder CPU" : "Click to rematch"
      );
    } else if (this.phase === "point" && this.pointWinner) {
      this.drawCenterText(this.pointWinner === "player" ? "Point!" : "CPU scores", "");
    }
  }

  private drawPaddle(x: number, y: number, color: string) {
    const pw = this.paddleWidth();
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.roundRect(x - pw / 2, y, pw, PADDLE_H, 4);
    this.ctx.fill();
  }

  private drawCenterText(title: string, subtitle: string) {
    const ctx = this.ctx;
    if (this.phase === "paused") {
      ctx.fillStyle = "hsl(0 0% 0% / 0.45)";
      ctx.fillRect(0, 0, this.width, this.height);
    }
    ctx.fillStyle = "hsl(0 0% 100% / 0.92)";
    ctx.font = "bold 22px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, this.width / 2, this.height / 2 - 8);
    if (subtitle) {
      ctx.font = "14px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = "hsl(0 0% 100% / 0.65)";
      ctx.fillText(subtitle, this.width / 2, this.height / 2 + 18);
    }
  }
}

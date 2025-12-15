import type { CanvasKit, Paint, Surface, Shader, RuntimeEffect } from 'canvaskit-wasm';
import { Canvas } from './canvas';
import type { ICamera } from '@editor/types';
import type { ICanvas } from '@editor/types';
import type { Config } from '@editor/config';
import type { FontManager } from '@editor/font-manager';

export type GridOptions = {
	canvas: HTMLCanvasElement;
	canvasKit: CanvasKit;
	surface: Surface;
	camera: ICamera;
	config: Config;
	fontManager: FontManager;
};

export class Grid extends Canvas implements ICanvas {
	private paint: Paint;
	private shader: Shader | undefined;
	private runtimeEffect: RuntimeEffect | undefined;
	private camera: ICamera;
	private config: Config;
	private fontManager: FontManager;

	constructor({ canvas, canvasKit, surface, camera, config, fontManager }: GridOptions) {
		super(canvas, canvasKit, surface);

		this.camera = camera;
		this.config = config;
		this.fontManager = fontManager;

		this.paint = new canvasKit.Paint();
		this.paint.setAntiAlias(true);
		this.paint.setStyle(this.canvasKit.PaintStyle.Fill);

		this.config.on('changed', () => this.render());
		this.createGridShader();
	}

	public prepareForConfigChange(): void {
		this.createGridShader();
	}

	/**
	 * GRID DISABLED SHADER
	 * Fully transparent output – no dots, no grid
	 */
	private createGridShader(): void {
		const skslCode = `
			uniform float2 u_resolution;

			half4 main(float2 fragcoord) {
				// Grid disabled: render nothing
				return half4(0.0, 0.0, 0.0, 0.0);
			}
		`;

		const effect = this.canvasKit.RuntimeEffect.Make(skslCode);

		if (!effect) {
			throw new Error('Failed to compile grid shader');
		}

		this.runtimeEffect = effect;

		const uniformData = new Float32Array([
			this.canvas.width,
			this.canvas.height,
		]);

		this.shader = this.runtimeEffect.makeShader(uniformData);
		this.paint.setShader(this.shader);
	}

	private getUniforms(): number[] {
		// Still kept for compatibility / future re-enable
		const { offsetX, offsetY, scale } = this.camera;

		const {
			dimensions: { width: charWidth, height: charHeight }
		} = this.fontManager.getMetrics();

		const { grid: backgroundDots } = this.config.getTheme();

		const baseDotSize = 1;

		return [
			this.canvas.width,
			this.canvas.height,
			offsetX * scale,
			offsetY * scale,
			scale,
			charWidth,
			charHeight,
			baseDotSize,
			backgroundDots[0],
			backgroundDots[1],
			backgroundDots[2],
			backgroundDots[3],
		];
	}

	render(): void {
		// Shader is fully transparent, but pipeline stays intact
		this.skCanvas.clear(this.canvasKit.TRANSPARENT);
		this.skCanvas.drawPaint(this.paint);
		this.surface.flush();
	}

	dispose(): void {
		super.dispose();
		this.paint.delete();
		this.shader?.delete();
		this.runtimeEffect?.delete();
	}
}

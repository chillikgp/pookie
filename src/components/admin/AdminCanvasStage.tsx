"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Line, Text } from "react-konva";
import Konva from "konva";
import { useAdminStore, DUMMY_BABIES } from "@/lib/admin/themeState";
import { calculateShadowOffset } from "@/lib/shadow";

const MAX_CANVAS = 500; // Max canvas size in pixels

export default function AdminCanvasStage() {
    const { theme, dummyBabyUrl, setDummyBabyUrl, showGrid, showBoundingBox, showSafeArea } = useAdminStore();
    const stageRef = useRef<Konva.Stage>(null);
    const shadowRef = useRef<Konva.Image>(null);
    const [layerImages, setLayerImages] = useState<Map<string, HTMLImageElement>>(new Map());
    const [dummyImage, setDummyImage] = useState<HTMLImageElement | null>(null);

    // Stage dimensions — fit within MAX_CANVAS
    const stageDims = useMemo(() => {
        if (!theme) return { width: MAX_CANVAS, height: MAX_CANVAS };
        const aspect = theme.height / theme.width;
        if (aspect > 1) {
            return { width: Math.round(MAX_CANVAS / aspect), height: MAX_CANVAS };
        }
        return { width: MAX_CANVAS, height: Math.round(MAX_CANVAS * aspect) };
    }, [theme]);

    const scale = theme ? stageDims.width / theme.width : 1;

    // Load theme layers
    useEffect(() => {
        if (!theme) return;
        const load = async () => {
            const loaded = new Map<string, HTMLImageElement>();
            for (const layer of theme.layers) {
                try {
                    const img = new window.Image();
                    img.crossOrigin = "anonymous";
                    await new Promise<void>((res, rej) => {
                        img.onload = () => res();
                        img.onerror = () => rej();
                        img.src = layer.url;
                    });
                    loaded.set(layer.url, img);
                } catch { /* skip */ }
            }
            setLayerImages(loaded);
        };
        load();
    }, [theme]);

    // Load dummy baby
    useEffect(() => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => setDummyImage(img);
        img.onerror = () => setDummyImage(null);
        img.src = dummyBabyUrl;
    }, [dummyBabyUrl]);

    // ─── Apply RGBA + Blur filters to shadow node ──────────────────
    // Forces shadow to be a pure black silhouette with real gaussian blur
    useEffect(() => {
        const node = shadowRef.current;
        if (!node || !theme?.shadow.enabled || !dummyImage) return;

        const shadowOffset = calculateShadowOffset(theme.shadow);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node.filters([Konva.Filters.RGBA as any, Konva.Filters.Blur]);
        node.red(0);
        node.green(0);
        node.blue(0);
        node.alpha(1);
        node.blurRadius(shadowOffset.blur * scale);

        try { node.cache({ pixelRatio: 2 }); } catch { /* not yet rendered */ }
        node.getLayer()?.batchDraw();
    }, [theme?.shadow, dummyImage, scale]);

    if (!theme) return null;

    const sortedLayers = [...theme.layers].sort((a, b) => a.zIndex - b.zIndex);
    const belowBaby = sortedLayers.filter((l) => l.zIndex < theme.babyZIndex && l.visible !== false);
    const aboveBaby = sortedLayers.filter((l) => l.zIndex > theme.babyZIndex && l.visible !== false);

    // Placement in pixels
    const px = (theme.babyPlacement.x / 100) * stageDims.width;
    const py = (theme.babyPlacement.y / 100) * stageDims.height;
    const pw = (theme.babyPlacement.width / 100) * stageDims.width;
    const ph = (theme.babyPlacement.height / 100) * stageDims.height;

    // Shadow
    const shadowOffset = theme.shadow.enabled ? calculateShadowOffset(theme.shadow) : null;

    // Dummy baby positioning within placement box
    let babyX = px, babyY = py, babyScale = 1;
    if (dummyImage) {
        const fitScale = Math.min(pw / dummyImage.naturalWidth, ph / dummyImage.naturalHeight);
        babyScale = fitScale;
        babyX = px + (pw - dummyImage.naturalWidth * fitScale) / 2;
        babyY = py + (ph - dummyImage.naturalHeight * fitScale) / 2;
    }

    return (
        <div className="space-y-3">
            {/* Dummy selector */}
            <div className="flex items-center gap-2 justify-center">
                <span className="text-[10px] text-[#555] font-semibold uppercase">Dummy:</span>
                {DUMMY_BABIES.map((d) => (
                    <button
                        key={d.url}
                        onClick={() => setDummyBabyUrl(d.url)}
                        className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${dummyBabyUrl === d.url
                            ? "bg-[#ee652b]/15 text-[#ee652b] border border-[#ee652b]/30"
                            : "bg-[#1a1a24] text-[#666] border border-[#2a2a3a]"
                            }`}
                    >
                        {d.name}
                    </button>
                ))}
            </div>

            <div className="border border-[#2a2a3a] rounded-xl overflow-hidden inline-block">
                <Stage ref={stageRef} width={stageDims.width} height={stageDims.height}>
                    {/* Background layers */}
                    <Layer>
                        {belowBaby.map((layer) => {
                            const img = layerImages.get(layer.url);
                            if (!img) return null;
                            return <KonvaImage key={layer.url} image={img} width={stageDims.width} height={stageDims.height} />;
                        })}
                    </Layer>

                    {/* Shadow — pure black silhouette with blur via RGBA + Blur filters */}
                    {shadowOffset && dummyImage && (
                        <Layer>
                            <KonvaImage
                                ref={shadowRef}
                                image={dummyImage}
                                x={babyX + shadowOffset.offsetX * scale}
                                y={babyY + shadowOffset.offsetY * scale}
                                scaleX={babyScale}
                                scaleY={babyScale}
                                opacity={shadowOffset.opacity}
                            />
                        </Layer>
                    )}

                    {/* Dummy baby */}
                    {dummyImage && (
                        <Layer>
                            <KonvaImage
                                image={dummyImage}
                                x={babyX}
                                y={babyY}
                                scaleX={babyScale}
                                scaleY={babyScale}
                            />
                        </Layer>
                    )}

                    {/* Foreground layers */}
                    <Layer>
                        {aboveBaby.map((layer) => {
                            const img = layerImages.get(layer.url);
                            if (!img) return null;
                            return <KonvaImage key={layer.url} image={img} width={stageDims.width} height={stageDims.height} listening={false} />;
                        })}
                    </Layer>

                    {/* Overlays */}
                    <Layer listening={false}>
                        {/* Placement bounding box */}
                        {showBoundingBox && (
                            <>
                                <Rect
                                    x={px} y={py} width={pw} height={ph}
                                    stroke="#ee652b" strokeWidth={1.5} dash={[6, 3]}
                                    rotation={theme.babyPlacement.rotation}
                                    fill="rgba(238,101,43,0.05)"
                                />
                                <Text x={px + 2} y={py - 14} text="PLACEMENT" fontSize={9} fill="#ee652b" fontStyle="bold" />
                                <Text x={px + 2} y={py + ph + 3} text={`${theme.babyPlacement.width.toFixed(0)}% × ${theme.babyPlacement.height.toFixed(0)}%`} fontSize={8} fill="#ee652b80" />
                            </>
                        )}

                        {/* Grid */}
                        {showGrid && Array.from({ length: 9 }).map((_, i) => (
                            <React.Fragment key={`grid-${i}`}>
                                <Line points={[(i + 1) * stageDims.width / 10, 0, (i + 1) * stageDims.width / 10, stageDims.height]} stroke="#ffffff10" strokeWidth={0.5} />
                                <Line points={[0, (i + 1) * stageDims.height / 10, stageDims.width, (i + 1) * stageDims.height / 10]} stroke="#ffffff10" strokeWidth={0.5} />
                            </React.Fragment>
                        ))}

                        {/* Safe area margins (5%) */}
                        {showSafeArea && (
                            <Rect
                                x={stageDims.width * 0.05}
                                y={stageDims.height * 0.05}
                                width={stageDims.width * 0.9}
                                height={stageDims.height * 0.9}
                                stroke="#22c55e40"
                                strokeWidth={1}
                                dash={[4, 4]}
                            />
                        )}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
}

"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Stage, Layer, Image as KonvaImage, Transformer, Circle, Line } from "react-konva";
import Konva from "konva";
import { useEditorStore } from "@/lib/store";
import { calculateInitialPlacement } from "@/lib/placement";
import { calculateShadowOffset } from "@/lib/shadow";

interface CanvasStageProps {
    containerWidth: number;
}

export default function CanvasStage({ containerWidth }: CanvasStageProps) {
    const {
        selectedTheme,
        processedBabyImageUrl,
        babyTransform,
        setBabyTransform,
        adjustValues,
        maskStrokes,
        activeTab,
        maskMode,
        maskBrushSize,
        setEditorStageWidth,
    } = useEditorStore();

    const stageRef = useRef<Konva.Stage>(null);
    const babyRef = useRef<Konva.Image>(null);
    const shadowRef = useRef<Konva.Image>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const [babyImage, setBabyImage] = useState<HTMLImageElement | null>(null);
    const [layerImages, setLayerImages] = useState<Map<string, HTMLImageElement>>(new Map());
    const [maskedBabyCanvas, setMaskedBabyCanvas] = useState<HTMLCanvasElement | null>(null);
    const [placementDone, setPlacementDone] = useState(false);

    // Brush cursor state
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

    const theme = selectedTheme;

    // ─── Stage dimensions ──────────────────────────────────────────
    const stageDims = useMemo(() => {
        if (!theme) return { width: containerWidth, height: Math.round(containerWidth * 1.33) };
        const aspect = theme.height / theme.width;
        return { width: containerWidth, height: Math.round(containerWidth * aspect) };
    }, [theme, containerWidth]);

    // ─── Sync stage width to store for export ─────────────────────
    useEffect(() => {
        setEditorStageWidth(stageDims.width);
    }, [stageDims.width, setEditorStageWidth]);

    // ─── Load baby image ───────────────────────────────────────────
    useEffect(() => {
        if (!processedBabyImageUrl) return;
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => setBabyImage(img);
        img.src = processedBabyImageUrl;
    }, [processedBabyImageUrl]);

    // ─── Load theme layers ─────────────────────────────────────────
    useEffect(() => {
        if (!theme) return;
        const loadLayers = async () => {
            const loaded = new Map<string, HTMLImageElement>();
            for (const layer of theme.layers) {
                try {
                    const img = new window.Image();
                    img.crossOrigin = "anonymous";
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = () => reject();
                        img.src = layer.url;
                    });
                    loaded.set(layer.url, img);
                } catch { /* skip */ }
            }
            setLayerImages(loaded);
        };
        loadLayers();
    }, [theme]);

    // ─── Auto-place baby ONCE ──────────────────────────────────────
    useEffect(() => {
        if (!theme || !babyImage || placementDone) return;
        const initial = calculateInitialPlacement(
            theme, stageDims.width, stageDims.height,
            babyImage.naturalWidth, babyImage.naturalHeight
        );
        setBabyTransform(initial);
        setPlacementDone(true);
    }, [theme, babyImage, placementDone, stageDims.width, stageDims.height, setBabyTransform]);

    // ─── Attach transformer ────────────────────────────────────────
    useEffect(() => {
        if (!transformerRef.current || !babyRef.current) return;
        if (activeTab === "move") {
            transformerRef.current.nodes([babyRef.current]);
        } else {
            transformerRef.current.nodes([]);
        }
        transformerRef.current.getLayer()?.batchDraw();
    }, [activeTab, babyImage]);

    // ─── Apply 4 independent Konva filters ─────────────────────────
    // Brighten + Contrast + Saturation (vibrance) + RGB (warmth)
    useEffect(() => {
        const node = babyRef.current;
        if (!node) return;

        // Build filter list — use 'as any' since Konva's Filter type is a string union
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filters: any[] = [
            Konva.Filters.Brighten,
            Konva.Filters.Contrast,
        ];

        // Set brightness and contrast
        node.brightness(adjustValues.brightness);
        node.contrast(adjustValues.contrast);

        // Only add HSL filter if vibrance is non-zero
        if (adjustValues.vibrance !== 0) {
            filters.push(Konva.Filters.HSL);
            node.saturation(adjustValues.vibrance);
        }

        node.filters(filters);

        // Cache is REQUIRED for filters to render
        try { node.cache(); } catch { /* not yet rendered */ }
        node.getLayer()?.batchDraw();
    }, [adjustValues, babyImage, maskedBabyCanvas]);

    // ─── Apply warmth as post-filter RGB adjustment ────────────────
    // Warmth is applied via a sceneFunc override or separate image processing.
    // Since Konva doesn't expose node.red()/node.blue() directly on Konva.Image,
    // we apply warmth by modifying the cached image data.
    useEffect(() => {
        const node = babyRef.current;
        if (!node || adjustValues.warmth === 0) return;

        // Re-cache to get fresh pixel data, then modify
        try {
            node.cache();
            // Get the cached canvas and apply warmth shift
            const cachedCanvas = node._cache?.get("canvas")?.scene?._canvas;
            if (cachedCanvas) {
                const ctx = cachedCanvas.getContext("2d");
                if (ctx) {
                    const imgData = ctx.getImageData(0, 0, cachedCanvas.width, cachedCanvas.height);
                    const warmth = adjustValues.warmth;
                    for (let i = 0; i < imgData.data.length; i += 4) {
                        if (imgData.data[i + 3] === 0) continue;
                        imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] * (1 + warmth * 0.05)));
                        imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] * (1 - warmth * 0.05)));
                    }
                    ctx.putImageData(imgData, 0, 0);
                }
            }
        } catch { /* cache not ready */ }

        node.getLayer()?.batchDraw();
    }, [adjustValues.warmth, adjustValues.brightness, adjustValues.contrast, adjustValues.vibrance, babyImage, maskedBabyCanvas]);

    // ─── Build masked baby canvas ──────────────────────────────────
    useEffect(() => {
        if (!babyImage) return;
        if (maskStrokes.length === 0) {
            setMaskedBabyCanvas(null);
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = babyImage.naturalWidth;
        canvas.height = babyImage.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(babyImage, 0, 0);

        const cos = Math.cos((-babyTransform.rotation * Math.PI) / 180);
        const sin = Math.sin((-babyTransform.rotation * Math.PI) / 180);

        for (const stroke of maskStrokes) {
            const nativeBrushSize = stroke.brushSize / babyTransform.scaleX;
            ctx.lineWidth = nativeBrushSize;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            if (stroke.type === "erase") {
                ctx.globalCompositeOperation = "destination-out";
                ctx.strokeStyle = "rgba(0,0,0,1)";
                ctx.beginPath();
                for (let i = 0; i < stroke.points.length; i += 2) {
                    const dx = stroke.points[i] - babyTransform.x;
                    const dy = stroke.points[i + 1] - babyTransform.y;
                    const rx = dx * cos - dy * sin;
                    const ry = dx * sin + dy * cos;
                    const px = rx / babyTransform.scaleX;
                    const py = ry / babyTransform.scaleY;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
            } else {
                ctx.save();
                ctx.globalCompositeOperation = "source-over";
                ctx.beginPath();
                for (let i = 0; i < stroke.points.length; i += 2) {
                    const dx = stroke.points[i] - babyTransform.x;
                    const dy = stroke.points[i + 1] - babyTransform.y;
                    const rx = dx * cos - dy * sin;
                    const ry = dx * sin + dy * cos;
                    const px = rx / babyTransform.scaleX;
                    const py = ry / babyTransform.scaleY;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.clip();
                ctx.drawImage(babyImage, 0, 0);
                ctx.restore();
            }
        }
        setMaskedBabyCanvas(canvas);
    }, [
        maskStrokes,
        babyImage,
        babyTransform.x,
        babyTransform.y,
        babyTransform.scaleX,
        babyTransform.scaleY,
        babyTransform.rotation,
    ]);

    // ─── Apply RGBA + Blur filters to shadow node ──────────────────
    // Forces shadow to be a pure black silhouette with real gaussian blur
    useEffect(() => {
        const node = shadowRef.current;
        if (!node || !theme?.shadow.enabled) return;

        // Calculate how much the theme is scaled down to fit the preview stage.
        // Konva's Blur filter applies in *container* pixel space, so a 50px blur from the theme
        // needs to be scaled down to look proportional on a 420px phone screen.
        const pScale = stageDims.width / theme.width;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node.filters([Konva.Filters.RGBA as any, Konva.Filters.Blur]);
        node.red(0);
        node.green(0);
        node.blue(0);
        node.alpha(1);
        node.blurRadius(theme.shadow.blur);

        // Required for Konva filters to apply visually to a node without clipping
        node.clearCache();
        try {
            node.cache({
                pixelRatio: 2,
                offset: Math.ceil(theme.shadow.blur)
            });
        } catch { /* not yet rendered */ }

        node.getLayer()?.batchDraw();
    }, [

        theme?.shadow,
        theme?.width,
        stageDims.width,
        maskedBabyCanvas,
        babyImage,
    ]);


    // ─── Cursor: hide default in mask mode ─────────────────────────
    useEffect(() => {
        const container = stageRef.current?.container();
        if (!container) return;
        container.style.cursor = activeTab === "mask" ? "none" : "default";
    }, [activeTab]);

    // ─── DRAG handler ──────────────────────────────────────────────
    const handleBabyDragEnd = useCallback(
        (e: Konva.KonvaEventObject<DragEvent>) => {
            setBabyTransform({ ...babyTransform, x: e.target.x(), y: e.target.y() });
        },
        [babyTransform, setBabyTransform]
    );

    // ─── TRANSFORM handler ────────────────────────────────────────
    const handleBabyTransformEnd = useCallback(() => {
        const node = babyRef.current;
        if (!node) return;
        setBabyTransform({
            x: node.x(), y: node.y(),
            scaleX: node.scaleX(), scaleY: node.scaleY(),
            rotation: node.rotation(),
        });
    }, [setBabyTransform]);

    // ─── Mask stroke handlers ──────────────────────────────────────
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStrokePoints, setCurrentStrokePoints] = useState<number[]>([]);

    const handleMaskPointerDown = useCallback(
        (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
            if (activeTab !== "mask") return;
            setIsDrawing(true);
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                setCurrentStrokePoints([pos.x, pos.y]);
                setCursorPos({ x: pos.x, y: pos.y });
            }
        },
        [activeTab]
    );

    const handleMaskPointerMove = useCallback(
        (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos && activeTab === "mask") {
                setCursorPos({ x: pos.x, y: pos.y });
            }
            if (!isDrawing || activeTab !== "mask") return;
            if (pos) {
                setCurrentStrokePoints((prev) => [...prev, pos.x, pos.y]);
            }
        },
        [isDrawing, activeTab]
    );

    const handleMaskPointerUp = useCallback(() => {
        if (!isDrawing || activeTab !== "mask") return;
        setIsDrawing(false);
        if (currentStrokePoints.length > 0) {
            const state = useEditorStore.getState();
            state.addMaskStroke({
                points: currentStrokePoints,
                brushSize: state.maskBrushSize,
                type: state.maskMode,
            });
        }
        setCurrentStrokePoints([]);
    }, [isDrawing, activeTab, currentStrokePoints]);

    // ─── Render ────────────────────────────────────────────────────
    if (!theme) return null;

    const sortedLayers = [...theme.layers].sort((a, b) => a.zIndex - b.zIndex);
    const belowBaby = sortedLayers.filter((l) => l.zIndex < theme.babyZIndex);
    const aboveBaby = sortedLayers.filter((l) => l.zIndex > theme.babyZIndex);

    const shadowOffset = theme.shadow.enabled ? calculateShadowOffset(theme.shadow) : null;
    const previewScale = stageDims.width / theme.width;
    const babyImageSource = maskedBabyCanvas || babyImage;

    return (
        <div className="relative">
            <Stage
                ref={stageRef}
                width={stageDims.width}
                height={stageDims.height}
                onMouseDown={handleMaskPointerDown}
                onMouseMove={handleMaskPointerMove}
                onMouseUp={handleMaskPointerUp}
                onTouchStart={handleMaskPointerDown}
                onTouchMove={handleMaskPointerMove}
                onTouchEnd={handleMaskPointerUp}
                style={{ borderRadius: "12px", overflow: "hidden" }}
            >
                {/* Background layers */}
                <Layer>
                    {belowBaby.map((layer) => {
                        const img = layerImages.get(layer.url);
                        if (!img) return null;
                        return <KonvaImage key={layer.url} image={img} width={stageDims.width} height={stageDims.height} />;
                    })}
                </Layer>

                {/* Shadow — pure black silhouette with blur via RGBA + Blur filters */}
                {shadowOffset && babyImageSource && (
                    <Layer>
                        <KonvaImage
                            ref={shadowRef}
                            image={babyImageSource}
                            x={babyTransform.x + shadowOffset.offsetX}
                            y={babyTransform.y + shadowOffset.offsetY}
                            scaleX={babyTransform.scaleX}
                            scaleY={babyTransform.scaleY}
                            rotation={babyTransform.rotation}
                            opacity={shadowOffset.opacity}
                        />
                    </Layer>
                )}

                {/* Baby */}
                <Layer>
                    {babyImageSource && (
                        <>
                            <KonvaImage
                                ref={babyRef}
                                image={babyImageSource}
                                x={babyTransform.x}
                                y={babyTransform.y}
                                scaleX={babyTransform.scaleX}
                                scaleY={babyTransform.scaleY}
                                rotation={babyTransform.rotation}
                                draggable={activeTab !== "mask"}
                                onDragEnd={handleBabyDragEnd}
                                onTransformEnd={handleBabyTransformEnd}
                            />
                            {activeTab === "move" && (
                                <Transformer
                                    ref={transformerRef}
                                    rotateEnabled
                                    enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                                    boundBoxFunc={(oldBox, newBox) => {
                                        if (newBox.width < 20 || newBox.height < 20) return oldBox;
                                        return newBox;
                                    }}
                                    borderStroke="#ee652b"
                                    anchorStroke="#ee652b"
                                    anchorFill="#fff"
                                    anchorSize={12}
                                    anchorCornerRadius={6}
                                />
                            )}
                        </>
                    )}
                </Layer>

                {/* Foreground layers */}
                <Layer>
                    {aboveBaby.map((layer) => {
                        const img = layerImages.get(layer.url);
                        if (!img) return null;
                        return <KonvaImage key={layer.url} image={img} width={stageDims.width} height={stageDims.height} listening={false} />;
                    })}
                </Layer>

                {/* Brush cursor (mask mode only) */}
                {activeTab === "mask" && (
                    <Layer>
                        {isDrawing && currentStrokePoints.length > 0 && (
                            <Line
                                points={currentStrokePoints}
                                stroke={maskMode === "erase" ? "rgba(255,0,0,0.5)" : "rgba(0,255,0,0.5)"}
                                strokeWidth={maskBrushSize}
                                lineCap="round"
                                lineJoin="round"
                                globalCompositeOperation={maskMode === "erase" ? "destination-out" : "source-over"}
                            />
                        )}
                        {cursorPos && (
                            <Circle
                                x={cursorPos.x}
                                y={cursorPos.y}
                                radius={maskBrushSize / 2}
                                stroke={maskMode === "erase" ? "#ff4444" : "#44ff44"}
                                strokeWidth={1.5}
                                fill={maskMode === "erase" ? "rgba(255,0,0,0.1)" : "rgba(0,255,0,0.1)"}
                                listening={false}
                            />
                        )}
                    </Layer>
                )}
            </Stage>

            {/* Watermark overlay */}
            <div
                className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm text-white/70 text-[10px] font-bold px-2.5 py-1 rounded-full pointer-events-none"
                style={{ zIndex: 10 }}
            >
                MelaBabu
            </div>
        </div>
    );
}

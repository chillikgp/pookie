"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Stage, Layer, Image as KonvaImage, Transformer, Circle, Line, Group } from "react-konva";
import Konva from "konva";
import { useEditorStore } from "@/lib/store";
import { calculateInitialPlacement } from "@/lib/placement";
import { calculateShadowOffset } from "@/lib/shadow";
import { createShadowCanvas } from "@/lib/shadowCanvas";

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
        addMaskStroke,
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

        let isHovered = true; // prevent racing unmounts

        const loadLayers = async () => {
            try {
                const layerPromises = theme.layers.map(async (layer) => {
                    return new Promise<{ url: string; img: HTMLImageElement }>((resolve, reject) => {
                        const img = new window.Image();
                        img.crossOrigin = "anonymous";
                        img.onload = () => resolve({ url: layer.previewUrl, img });
                        img.onerror = () => reject(new Error(`Failed to load layer: ${layer.previewUrl}`));
                        img.src = layer.previewUrl;
                    });
                });

                const loadedArray = await Promise.all(layerPromises);

                if (isHovered) {
                    const loadedMap = new Map<string, HTMLImageElement>();
                    for (const item of loadedArray) {
                        loadedMap.set(item.url, item.img);
                    }
                    setLayerImages(loadedMap);
                }
            } catch (err) {
                console.error("Failed to load theme layers:", err);
            }
        };

        loadLayers();

        return () => {
            isHovered = false;
        };
    }, [theme]);

    // ─── Auto-place baby ONCE ──────────────────────────────────────
    useEffect(() => {
        if (!theme || !babyImage || placementDone) return;
        const initial = calculateInitialPlacement(
            theme, stageDims.width, stageDims.height,
            babyImage.naturalWidth, babyImage.naturalHeight
        );
        setBabyTransform(initial);
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

        // Cache is REQUIRED for Konva filters to render. 
        // 🚨 PHASE 3 MOBILE MEMORY OPTIMIZATION: 
        // Only trigger the heavy cache generation if the user actually moved a slider. 
        // Always force pixelRatio: 1 to prevent Safari from exploding on rotation.
        try {
            const hasActiveFilters = adjustValues.brightness !== 0 || adjustValues.contrast !== 0 || adjustValues.vibrance !== 0;
            if (hasActiveFilters) {
                node.cache({ pixelRatio: 1 });
            } else {
                node.clearCache();
            }
        } catch { /* not yet rendered */ }
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

    // ─── Build masked baby canvas (DISABLED FOR STABILITY) ─────────
    useEffect(() => {
        if (!babyImage) return;

        // 🚨 EMERGENCY FIX: Disable the Mask canvas until a memory-safe alternative is built.
        // As requested, 90% of users don't need this, and it consumes massive RAM.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMaskedBabyCanvas(null);
        return;


        /* 
        const canvas = document.createElement("canvas");
        canvas.width = babyImage.naturalWidth;
        canvas.height = babyImage.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(babyImage, 0, 0);

        for (const stroke of maskStrokes) {
            // stroke.brushSize is already stored in native pixel space
            ctx.lineWidth = stroke.brushSize;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            if (stroke.type === "erase") {
                ctx.globalCompositeOperation = "destination-out";
                ctx.strokeStyle = "rgba(0,0,0,1)";
                ctx.beginPath();
                for (let i = 0; i < stroke.points.length; i += 2) {
                    const lx = stroke.points[i];
                    const ly = stroke.points[i + 1];
                    if (i === 0) ctx.moveTo(lx, ly);
                    else ctx.lineTo(lx, ly);
                }
                ctx.stroke();
            } else {
                ctx.save();
                ctx.globalCompositeOperation = "source-over";
                ctx.beginPath();
                for (let i = 0; i < stroke.points.length; i += 2) {
                    const lx = stroke.points[i];
                    const ly = stroke.points[i + 1];
                    if (i === 0) ctx.moveTo(lx, ly);
                    else ctx.lineTo(lx, ly);
                }
                ctx.clip();
                ctx.drawImage(babyImage, 0, 0);
                ctx.restore();
            }
        }
        setMaskedBabyCanvas(canvas); 
        */
    }, [
        maskStrokes,
        babyImage,
        // REMOVED `babyTransform` dependencies! 
        // Masked canvas no longer regenerates when user drags or transforms the baby.
        // This stops mobile memory exhaustion immediately.
    ]);

    // ─── Apply Blur filter to shadow node ─────────────────────────────
    // Uses the real generated black silhouette, heavily blurred
    useEffect(() => {
        const node = shadowRef.current;
        if (!node) return;

        if (!theme?.shadow.enabled) {
            node.clearCache();
            return;
        }

        const previewScale = stageDims.width / theme.width;
        // Boost blur slightly for visual parity since preview has lower intrinsic resolution
        const scaledBlur = theme.shadow.blur * previewScale * 1.05;

        // Apply ONLY blur. Pure black is guaranteed by the physical Canvas source now.
        node.filters([Konva.Filters.Blur]);
        node.blurRadius(scaledBlur);

        node.clearCache();
        try {
            // 🚨 PHASE 3 MOBILE MEMORY OPTIMIZATION: 
            // Shadow requires caching to blur, but we MUST force pixelRatio 1.
            node.cache({
                pixelRatio: 1,
                offset: Math.ceil(scaledBlur)
            });
        } catch { /* not yet rendered */ }

        node.getLayer()?.batchDraw();
    }, [
        theme?.shadow,
        stageDims.width,
        theme?.width,
        babyTransform // Required if transform scales affect visual boundaries, but primarily blur relies on theme.
    ]);


    // ─── Cursor: hide default in mask mode ─────────────────────────
    useEffect(() => {
        const container = stageRef.current?.container();
        if (!container) return;
        container.style.cursor = (activeTab as string) === "mask" ? "none" : "default";
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
            if ((activeTab as string) !== "mask") return;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => {
            if (!isDrawing || (activeTab as string) !== "mask") return;
            const pos = e.target.getStage()?.getPointerPosition();
            if (!pos) return;

            setCursorPos(pos); // Keep cursor visual strictly in stage space

            // Project stroke point into NATIVE baby image space
            const dx = pos.x - babyTransform.x;
            const dy = pos.y - babyTransform.y;
            const cos = Math.cos((-babyTransform.rotation * Math.PI) / 180);
            const sin = Math.sin((-babyTransform.rotation * Math.PI) / 180);
            const rx = dx * cos - dy * sin;
            const ry = dx * sin + dy * cos;
            const lx = rx / babyTransform.scaleX;
            const ly = ry / babyTransform.scaleY;

            setCurrentStrokePoints((prev) => [...prev, lx, ly]);
        },
        [isDrawing, activeTab, babyTransform]
    );

    const handleMaskPointerUp = useCallback(() => {
        if (!isDrawing || (activeTab as string) !== "mask") return;
        setIsDrawing(false);
        if (currentStrokePoints.length > 0) {
            // Save native brush size instead of stage brush size
            addMaskStroke({
                points: currentStrokePoints,
                brushSize: maskBrushSize / babyTransform.scaleX,
                type: maskMode,
            });
            setCurrentStrokePoints([]);
        }
    }, [isDrawing, activeTab, currentStrokePoints, maskMode, maskBrushSize, addMaskStroke, babyTransform.scaleX]);

    // ─── Render ────────────────────────────────────────────────────
    if (!theme) return null;

    const sortedLayers = [...theme.layers].sort((a, b) => a.zIndex - b.zIndex);
    const belowBaby = sortedLayers.filter((l) => l.zIndex < theme.babyZIndex);
    const aboveBaby = sortedLayers.filter((l) => l.zIndex > theme.babyZIndex);

    const shadowOffset = theme.shadow.enabled ? calculateShadowOffset(theme.shadow) : null;
    const babyImageSource = maskedBabyCanvas || babyImage;
    const previewScale = theme ? stageDims.width / theme.width : 1;

    // Build real black silhouette canvas for the shadow source identical to export
    const shadowSource = useMemo(() => {
        if (!theme.shadow.enabled || !babyImageSource) return null;
        // Import createShadowCanvas dynamically or assume it's available. We'll add the import at the top.
        return createShadowCanvas(babyImageSource);
    }, [theme.shadow.enabled, babyImageSource]);

    // 🚨 PHASE 4 IOS OPTIMIZATION: 
    // Do not mount the Stage and allocate heavy canvas contexts until ALL images are physically decoded.
    // Mounting a Konva stage with incomplete assets causes Rapid Repaints on mobile Safari, resulting in immediate VRAM exhaustion.
    const isReady = babyImage !== null && layerImages.size === theme.layers.length;

    if (!isReady) {
        return (
            <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
                <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 rounded-full bg-[var(--color-primary-soft)] loading-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">
                        🎨
                    </div>
                </div>
                <p className="text-sm text-gray-400 font-medium">Assembling layers...</p>
            </div>
        );
    }

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
                        const img = layerImages.get(layer.previewUrl);
                        if (!img) return null;
                        return <KonvaImage key={layer.previewUrl} image={img} width={stageDims.width} height={stageDims.height} />;
                    })}
                </Layer>

                {/* Shadow — pure black silhouette with blur via Blur filter */}
                {shadowOffset && shadowSource && (
                    <Layer>
                        <KonvaImage
                            ref={shadowRef}
                            image={shadowSource}
                            x={babyTransform.x + shadowOffset.offsetX * previewScale}
                            y={babyTransform.y + shadowOffset.offsetY * previewScale}
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
                                draggable={(activeTab as string) !== "mask"}
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
                        const img = layerImages.get(layer.previewUrl);
                        if (!img) return null;
                        return <KonvaImage key={layer.previewUrl} image={img} width={stageDims.width} height={stageDims.height} listening={false} />;
                    })}
                </Layer>

                {/* Brush cursor and Live Drawing (mask mode only) */}
                {(activeTab as string) === "mask" && (
                    <Layer>
                        {/* 
                            Project the native local points back to screen space for the live preview line.
                            By grouping it and applying `babyTransform`, Konva flawlessly projects the line
                            exactly aligned with the scaled/rotated baby underneath it without having to 
                            re-convert manually!
                        */}
                        {isDrawing && currentStrokePoints.length > 0 && (
                            <Group
                                x={babyTransform.x}
                                y={babyTransform.y}
                                scaleX={babyTransform.scaleX}
                                scaleY={babyTransform.scaleY}
                                rotation={babyTransform.rotation}
                            >
                                <Line
                                    points={currentStrokePoints}
                                    stroke={maskMode === "erase" ? "rgba(255,0,0,0.5)" : "rgba(0,255,0,0.5)"}
                                    // Scale down the strokeWidth directly so it appears visually correct on screen
                                    strokeWidth={maskBrushSize / babyTransform.scaleX}
                                    lineCap="round"
                                    lineJoin="round"
                                    globalCompositeOperation={maskMode === "erase" ? "destination-out" : "source-over"}
                                />
                            </Group>
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

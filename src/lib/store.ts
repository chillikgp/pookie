import { create } from "zustand";
import { Theme } from "./themes";

export interface MaskStroke {
    points: number[];
    brushSize: number;
    type: "erase" | "restore";
}

export interface AdjustValues {
    brightness: number;   // Konva brightness: -1 to 1
    contrast: number;     // Konva contrast: -100 to 100
    vibrance: number;     // Konva saturation: -1 to 1
    warmth: number;       // RGB shift: -1 to 1
}

export interface BabyTransform {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
}

export type EditorTab = "move" | "adjust" | "filters";

export interface EditorState {
    selectedTheme: Theme | null;
    setSelectedTheme: (theme: Theme) => void;

    originalBabyImageUrl: string | null;
    processedBabyImageUrl: string | null;
    setOriginalBabyImageUrl: (url: string) => void;
    setProcessedBabyImageUrl: (url: string | null) => void;

    babyTransform: BabyTransform;
    setBabyTransform: (transform: BabyTransform) => void;
    resetBabyTransform: () => void;

    adjustValues: AdjustValues;
    setAdjustValues: (values: Partial<AdjustValues>) => void;
    resetAdjustValues: () => void;

    activeFilter: string | null;
    setActiveFilter: (filter: string | null) => void;

    maskStrokes: MaskStroke[];
    addMaskStroke: (stroke: MaskStroke) => void;
    undoMaskStroke: () => void;
    clearMaskStrokes: () => void;

    maskMode: "erase" | "restore";
    setMaskMode: (mode: "erase" | "restore") => void;
    maskBrushSize: number;
    setMaskBrushSize: (size: number) => void;

    activeTab: EditorTab;
    setActiveTab: (tab: EditorTab) => void;

    isProcessing: boolean;
    processingMessage: string;
    setProcessing: (isProcessing: boolean, message?: string) => void;

    exportedImageUrl: string | null;
    setExportedImageUrl: (url: string | null) => void;

    editorStageWidth: number;
    setEditorStageWidth: (width: number) => void;

    clearProcessedImage: () => void;
    resetAll: () => void;
}

const defaultTransform: BabyTransform = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
};

const defaultAdjust: AdjustValues = {
    brightness: 0,
    contrast: 0,
    vibrance: 0,
    warmth: 0,
};

export const useEditorStore = create<EditorState>((set) => ({
    selectedTheme: null,
    setSelectedTheme: (theme) => set({
        selectedTheme: theme,
        // Auto-apply the theme's defaultAdjust preset (configured in admin)
        adjustValues: theme.defaultAdjust
            ? { ...theme.defaultAdjust }
            : { ...defaultAdjust },
    }),

    originalBabyImageUrl: null,
    processedBabyImageUrl: null,
    setOriginalBabyImageUrl: (url) => set({ originalBabyImageUrl: url }),
    setProcessedBabyImageUrl: (url) => set({ processedBabyImageUrl: url }),

    babyTransform: { ...defaultTransform },
    setBabyTransform: (transform) => set({ babyTransform: transform }),
    resetBabyTransform: () => set({ babyTransform: { ...defaultTransform } }),

    adjustValues: { ...defaultAdjust },
    setAdjustValues: (values) =>
        set((state) => ({
            adjustValues: { ...state.adjustValues, ...values },
        })),
    resetAdjustValues: () => set({ adjustValues: { ...defaultAdjust } }),

    activeFilter: null,
    setActiveFilter: (filter) => set({ activeFilter: filter }),

    maskStrokes: [],
    addMaskStroke: (stroke) =>
        set((state) => ({ maskStrokes: [...state.maskStrokes, stroke] })),
    undoMaskStroke: () =>
        set((state) => ({ maskStrokes: state.maskStrokes.slice(0, -1) })),
    clearMaskStrokes: () => set({ maskStrokes: [] }),

    maskMode: "erase",
    setMaskMode: (mode) => set({ maskMode: mode }),
    maskBrushSize: 20,
    setMaskBrushSize: (size) => set({ maskBrushSize: size }),

    activeTab: "move",
    setActiveTab: (tab) => set({ activeTab: tab }),

    isProcessing: false,
    processingMessage: "Preparing your baby photo...",
    setProcessing: (isProcessing, message) =>
        set({
            isProcessing,
            processingMessage: message || "Preparing your baby photo...",
        }),

    exportedImageUrl: null,
    setExportedImageUrl: (url) => set({ exportedImageUrl: url }),

    editorStageWidth: 1024, // Default logical width
    setEditorStageWidth: (width) => set({ editorStageWidth: width }),

    clearProcessedImage: () =>
        set({
            processedBabyImageUrl: null,
            babyTransform: { ...defaultTransform },
            maskStrokes: [],
            adjustValues: { ...defaultAdjust },
            activeFilter: null,
            exportedImageUrl: null,
        }),

    resetAll: () =>
        set({
            selectedTheme: null,
            originalBabyImageUrl: null,
            processedBabyImageUrl: null,
            babyTransform: { ...defaultTransform },
            adjustValues: { ...defaultAdjust },
            activeFilter: null,
            maskStrokes: [],
            maskMode: "erase",
            maskBrushSize: 20,
            activeTab: "move",
            isProcessing: false,
            processingMessage: "Preparing your baby photo...",
            exportedImageUrl: null,
            editorStageWidth: 1024,
        }),
}));

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, RefreshCw, Move, Play, Pause, Save, MinusSquare, PlusSquare } from 'lucide-react';

interface Concept {
  id: number;
  text: string;
  speaker: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parent: number | null;
  children: number[];
  timestamp: number;
}

interface Arrow {
  from: number;
  to: number;
  text: string;
  timestamp: number;
}

interface SavedLayout {
  positions: { id: number; x: number; y: number }[];
  zoomLevel: number;
  viewBox: string;
  fontSizeScale?: number; 
}

const ConceptMap = () => {
  const INITIAL_ZOOM_LEVEL = 1.1; 
  const INITIAL_VIEWBOX = "102.72727272727266 -26.363636363636363 1600 1200";
  const INITIAL_FONT_SIZE_SCALE = 1.5;

  // --- State Hooks ---
  const [expandedConcepts, setExpandedConcepts] = useState<{ [key: number]: boolean }>({
    1: true, 2: true, 3: true, 4: true, 5: true, 8: true, 12: true, 23: true,
  });
  const [zoomLevel, setZoomLevel] = useState(INITIAL_ZOOM_LEVEL);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState("all");
  const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingConcept, setDraggingConcept] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [fontSizeScale, setFontSizeScale] = useState(INITIAL_FONT_SIZE_SCALE);
  const [activeConceptId, setActiveConceptId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Refs ---
  const svgRef = useRef<SVGSVGElement | null>(null); 
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  // --- Constants ---
  const LAYOUT_STORAGE_KEY = 'conceptMapLayout_v3'; 
  const defaultVideoPath = "/On Culture-Design-Purpose-and-Technoscience-in-the-Age-of-Biology.mp4";
  const defaultVideoType = "video"; 
  const mediaSrc = defaultVideoPath; 
  const mediaType = defaultVideoType; 
  const speakers: { [key: string]: string } = {
    "Fiona": "#6366f1", "Mickey": "#ef4444", "Kit": "#f97316",
    "David": "#84cc16", "Sophia": "#06b6d4", "John": "#8b5cf6",
  };

  // --- useEffect for initial data load and edit mode check ---
  useEffect(() => {
    // Edit mode check
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('editMode') === 'true') {
      setIsEditMode(true);
      console.log("Super User Edit Mode Activated! Drag concepts, pan, zoom, adjust text size, then Save Layout.");
    }

    // Initial concepts and arrows data load
    let conceptsToLoad: Concept[];
    const savedLayoutString = localStorage.getItem(LAYOUT_STORAGE_KEY);
    const baseConceptsStructure: Omit<Concept, 'x' | 'y'>[] = [
        { id: 1, text: "Design, Culture, Values, and Technoscience in the Age of Biology", speaker: "All", width: 500, height: 70, parent: null, children: [2, 3, 4, 5, 23, 36], timestamp: 0 },
        { id: 2, text: "Storytelling in Technology", speaker: "Fiona", width: 220, height: 60, parent: 1, children: [6, 24, 8, 25, 37], timestamp: 276 },
        { id: 3, text: "Product Design & Consumerism", speaker: "Kit", width: 240, height: 60, parent: 1, children: [9, 10, 11, 28, 29], timestamp: 908 },
        { id: 4, text: "Science, Society & Power", speaker: "John", width: 220, height: 60, parent: 1, children: [12, 13, 14, 26, 27], timestamp: 741 },
        { id: 5, text: "Alternative Paradigms & Values", speaker: "Sophia", width: 260, height: 60, parent: 1, children: [15, 16, 17, 30, 37], timestamp: 1684 },
        { id: 6, text: "Mythology Building", speaker: "Mickey", width: 160, height: 50, parent: 2, children: [], timestamp: 320 },
        { id: 24, text: "Prototyping the Future", speaker: "Mickey", width: 180, height: 50, parent: 2, children: [], timestamp: 385 },
        { id: 8, text: "Public Narrative", speaker: "David", width: 150, height: 50, parent: 2, children: [18, 19, 20], timestamp: 650 },
        { id: 9, text: "Embodied Values in Products", speaker: "Kit", width: 200, height: 50, parent: 3, children: [], timestamp: 1040 },
        { id: 10, text: "Planned Obsolescence", speaker: "Mickey", width: 180, height: 50, parent: 3, children: [], timestamp: 1160 },
        { id: 11, text: "Visualization Tools (Museums)", speaker: "Kit", width: 200, height: 50, parent: 3, children: [], timestamp: 960 },
        { id: 12, text: "Trust Dynamics", speaker: "David", width: 150, height: 50, parent: 4, children: [21, 22, 31], timestamp: 1985 },
        { id: 13, text: "Power Dynamics", speaker: "John", width: 160, height: 50, parent: 4, children: [30], timestamp: 1518 },
        { id: 14, text: "Public vs. Private Research", speaker: "John", width: 210, height: 50, parent: 4, children: [32], timestamp: 1540 },
        { id: 15, text: "Stewardship Mindset", speaker: "Sophia", width: 170, height: 50, parent: 5, children: [29], timestamp: 1700 },
        { id: 16, text: "Indigenous Knowledge & Biotech", speaker: "David", width: 220, height: 50, parent: 5, children: [], timestamp: 1760 },
        { id: 17, text: "Relational Science", speaker: "David", width: 160, height: 50, parent: 5, children: [], timestamp: 2070 },
        { id: 18, text: "Story of Self", speaker: "David", width: 130, height: 40, parent: 8, children: [], timestamp: 655 },
        { id: 19, text: "Story of Us", speaker: "David", width: 120, height: 40, parent: 8, children: [], timestamp: 658 },
        { id: 20, text: "Story of Now", speaker: "David", width: 130, height: 40, parent: 8, children: [], timestamp: 660 },
        { id: 21, text: "Societal Atomization", speaker: "David", width: 180, height: 40, parent: 12, children: [], timestamp: 2020 },
        { id: 22, text: "Relational Engagement", speaker: "David", width: 190, height: 40, parent: 12, children: [], timestamp: 2075 },
        { id: 23, text: "Cultivating Culture", speaker: "Sophia", width: 200, height: 60, parent: 1, children: [33, 25], timestamp: 495 },
        { id: 25, text: "Stories Embody Values", speaker: "David", width: 190, height: 50, parent: 2, children: [], timestamp: 690 },
        { id: 26, text: "Urgency of Current Times", speaker: "John", width: 200, height: 50, parent: 4, children: [27], timestamp: 741 },
        { id: 27, text: "Anti-Science Movement", speaker: "John", width: 190, height: 50, parent: 26, children: [], timestamp: 750 },
        { id: 28, text: "Technology Creates New Problems", speaker: "Mickey", width: 240, height: 50, parent: 3, children: [], timestamp: 1350 },
        { id: 29, text: "Consumer vs. Maker Mindset", speaker: "Mickey", width: 220, height: 50, parent: 3, children: [], timestamp: 2380 },
        { id: 30, text: "Democratizing Technology", speaker: "Mickey", width: 210, height: 50, parent: 5, children: [], timestamp: 2300 },
        { id: 31, text: "Link to Relational Science", speaker: "David", width: 0, height: 0, parent:12, children:[], timestamp: 2070 }, 
        { id: 32, text: "Funding & Research Direction", speaker: "John", width: 220, height: 50, parent: 14, children:[], timestamp: 1560 },
        { id: 33, text: "Shared Beliefs & Values", speaker: "Sophia", width: 200, height: 50, parent: 23, children:[25], timestamp: 525 },
        { id: 7, text: "DEPRECATED - Was Future Prototyping", speaker: "Mickey", width:0,height:0, parent:2, children:[], timestamp: 420 }, 
        { id: 36, text: "Pace Layers of Change", speaker: "Mickey", width: 200, height: 50, parent: 1, children:[], timestamp: 1415 },
        { id: 37, text: "Metaphors in Science", speaker: "David", width: 190, height: 50, parent: 2, children:[], timestamp: 1870 },
    ];
    const defaultPositions: { [id: number]: { x: number, y: number } } = {
        1: { "x": 800, "y": 100 }, 2: { "x": 0, "y": 177 }, 3: { "x": 802, "y": 254 },
        4: { "x": 1596, "y": 64 }, 5: { "x": 235, "y": 457 }, 6: { "x": 290, "y": 213 },
        8: { "x": 49, "y": 669 }, 9: { "x": 545, "y": 297 }, 10: { "x": 1251, "y": 365 },
        11: { "x": 1066, "y": 646 }, 12: { "x": 1566, "y": 423 }, 13: { "x": 1801, "y": 286 },
        14: { "x": 1997, "y": 122 }, 15: { "x": 113, "y": 589 }, 16: { "x": 15, "y": 329 },
        17: { "x": 1696, "y": 828 }, 18: { "x": -112, "y": 864 }, 19: { "x": 2, "y": 951 },
        20: { "x": 135, "y": 833 }, 21: { "x": 1804, "y": 632 }, 22: { "x": 1986, "y": 415 },
        23: { "x": 798, "y": 609 }, 24: { "x": 217, "y": 302 }, 25: { "x": -194, "y": 660 },
        26: { "x": 1960, "y": 225 }, 27: { "x": 1050, "y": 420 }, 28: { "x": 1282, "y": 503 },
        29: { "x": 364, "y": 883 }, 30: { "x": 295, "y": 741 }, 31: { "x": 950, "y": 560 },
        32: { "x": 1350, "y": 520 }, 33: { "x": 852, "y": 908 }, 36: { "x": 1283, "y": 641 },
        37: { "x": -453, "y": 660 }, 7: { "x": 0, "y": 0 } 
    };
    let loadedZoom = INITIAL_ZOOM_LEVEL;
    let loadedViewBox = INITIAL_VIEWBOX;
    let loadedFontSizeScale = INITIAL_FONT_SIZE_SCALE;
    if (savedLayoutString) {
      try {
        const parsedLayout: SavedLayout = JSON.parse(savedLayoutString);
        if (parsedLayout.positions && typeof parsedLayout.zoomLevel === 'number' && typeof parsedLayout.viewBox === 'string') {
            conceptsToLoad = baseConceptsStructure.map(baseConcept => {
              const savedPos = parsedLayout.positions.find(p => p.id === baseConcept.id);
              const fallbackPos = defaultPositions[baseConcept.id] || { x: Math.random() * 1200 + 200, y: Math.random() * 800 + 200 };
              return { ...baseConcept, x: savedPos ? savedPos.x : fallbackPos.x, y: savedPos ? savedPos.y : fallbackPos.y };
            });
            loadedZoom = parsedLayout.zoomLevel;
            loadedViewBox = parsedLayout.viewBox;
            if (typeof parsedLayout.fontSizeScale === 'number') {
                loadedFontSizeScale = parsedLayout.fontSizeScale;
            }
        } else { throw new Error("Saved layout has incorrect structure."); }
      } catch (error) {
        console.error("Failed to parse saved layout, using defaults for all:", error);
        conceptsToLoad = baseConceptsStructure.map(baseConcept => {
            const pos = defaultPositions[baseConcept.id] || { x: Math.random() * 1200 + 200, y: Math.random() * 800 + 200 };
            return {...baseConcept, x: pos.x, y: pos.y };
        });
      }
    } else {
      conceptsToLoad = baseConceptsStructure.map(baseConcept => {
        const pos = defaultPositions[baseConcept.id] || { x: Math.random() * 1200 + 200, y: Math.random() * 800 + 200 };
        return {...baseConcept, x: pos.x, y: pos.y };
      });
    }
    setZoomLevel(loadedZoom);
    setViewBox(loadedViewBox);
    setFontSizeScale(loadedFontSizeScale);
    const initialArrows: Arrow[] = [
        { from: 1, to: 2, text: "explores", timestamp: 10 }, { from: 1, to: 3, text: "shapes", timestamp: 15 },
        { from: 1, to: 4, text: "intersects", timestamp: 20 }, { from: 1, to: 5, text: "inspires", timestamp: 25 },
        { from: 1, to: 23, text: "requires", timestamp: 30 }, { from: 1, to: 36, text: "operates via", timestamp: 1420 },
        { from: 2, to: 6, text: "builds", timestamp: 325 }, { from: 2, to: 24, text: "enables", timestamp: 390 },
        { from: 2, to: 8, text: "uses", timestamp: 652 }, { from: 2, to: 25, text: "embodies", timestamp: 695 },
        { from: 2, to: 37, text: "uses", timestamp: 1875 }, { from: 3, to: 9, text: "embeds", timestamp: 1045 },
        { from: 3, to: 10, text: "led to", timestamp: 1165 }, { from: 3, to: 11, text: "shown by", timestamp: 965 },
        { from: 3, to: 28, text: "can create", timestamp: 1355 }, { from: 3, to: 29, text: "contrasts", timestamp: 2385 },
        { from: 4, to: 12, text: "needs", timestamp: 1990 }, { from: 4, to: 13, text: "reveals", timestamp: 1520 },
        { from: 4, to: 14, text: "questions", timestamp: 1545 }, { from: 4, to: 26, text: "faces", timestamp: 745 },
        { from: 26, to: 27, text: "includes", timestamp: 755 }, { from: 14, to: 32, text: "determines", timestamp: 1565 },
        { from: 5, to: 15, text: "promotes", timestamp: 1705 }, { from: 5, to: 16, text: "learns from", timestamp: 1765 },
        { from: 5, to: 17, text: "practices", timestamp: 2075 }, { from: 5, to: 30, text: "advocates", timestamp: 2305 },
        { from: 5, to: 37, text: "re-evaluates", timestamp: 1880 }, { from: 23, to: 33, text: "based on", timestamp: 530 },
        { from: 33, to: 25, text: "are expressed in", timestamp: 700 }, { from: 8, to: 18, text: "includes", timestamp: 656 },
        { from: 8, to: 19, text: "includes", timestamp: 659 }, { from: 8, to: 20, text: "includes", timestamp: 661 },
        { from: 12, to: 21, text: "combats", timestamp: 2025 }, { from: 12, to: 22, text: "fosters", timestamp: 2080 },
        { from: 12, to: 17, text: "is built on", timestamp: 2072 }, { from: 10, to: 29, text: "challenges", timestamp: 2390 },
        { from: 15, to: 29, text: "aligns with", timestamp: 2395 }, { from: 13, to: 30, text: "reduced by", timestamp: 2310 },
        { from: 16, to: 15, text: "embodies", timestamp: 1770}, { from: 27, to: 12, text: "erodes", timestamp: 760},
        { from: 24, to: 9, text: "can show", timestamp: 400}, { from: 37, to: 17, text: "enables new", timestamp: 1900},
    ];
    const activeConcepts = conceptsToLoad.filter(c => !c.text.startsWith("DEPRECATED"));
    setConcepts(activeConcepts);
    setArrows(initialArrows);
  }, []); 

  // --- Derived State Calculations (AFTER state and initial data useEffect) ---
  const visibleConcepts = concepts.filter(concept => {
    if (selectedSpeaker !== "all" && concept.speaker !== selectedSpeaker && concept.speaker !== "All") return false;
    if (concept.parent !== null) {
      let currentParentId: number | null = concept.parent;
      while (currentParentId !== null) {
        if (!expandedConcepts[currentParentId]) return false;
        const parentConcept = concepts.find(c => c.id === currentParentId);
        currentParentId = parentConcept ? parentConcept.parent : null;
      }
    }
    return concept.width > 0 && concept.height > 0;
  });

  // --- useEffect for Active Concept Highlighting (MUST be AFTER visibleConcepts is defined) ---
  useEffect(() => {
    if (!visibleConcepts.length) { // Check if visibleConcepts is populated
        setActiveConceptId(null);
        return;
    }
    let currentActiveId: number | null = null;
    let mostRecentTimestamp = -1; 

    visibleConcepts.forEach(concept => {
        if (concept.timestamp <= currentTime && concept.timestamp > mostRecentTimestamp) {
            mostRecentTimestamp = concept.timestamp;
            currentActiveId = concept.id;
        }
    });
    setActiveConceptId(currentActiveId);
  }, [currentTime, visibleConcepts]); // visibleConcepts is now a dependency

  // --- Other useEffects ---
  useEffect(() => { // For media player events
    const media = mediaRef.current;
    if (!media) return;
    const onLoadedMetadata = () => { if (media) setMediaDuration(media.duration); };
    const onTimeUpdate = () => { if (media) setCurrentTime(media.currentTime); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); if (media) media.currentTime = 0; };
    media.addEventListener('loadedmetadata', onLoadedMetadata);
    media.addEventListener('timeupdate', onTimeUpdate);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('ended', onEnded);
    if (media.readyState >= media.HAVE_METADATA) onLoadedMetadata();
    if (mediaSrc && media.currentSrc !== mediaSrc && !mediaSrc.startsWith('blob:')) media.load();
    return () => {
      media.removeEventListener('loadedmetadata', onLoadedMetadata);
      media.removeEventListener('timeupdate', onTimeUpdate);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('ended', onEnded);
    };
  }, [mediaSrc]); // mediaSrc is a constant, effect runs once for default setup


  // --- Callbacks and Event Handlers ---
  const toggleExpand = (id: number) => setExpandedConcepts(prev => ({ ...prev, [id]: !prev[id] }));
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.3));
  const handleResetView = () => { 
    setZoomLevel(INITIAL_ZOOM_LEVEL); 
    setViewBox(INITIAL_VIEWBOX); 
    setFontSizeScale(INITIAL_FONT_SIZE_SCALE);
  };
  const increaseFontSize = () => setFontSizeScale(prev => Math.min(prev + 0.1, 2));
  const decreaseFontSize = () => setFontSizeScale(prev => Math.max(prev - 0.1, 0.5));

  const startPan = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (e.button !== 0 || (isEditMode && draggingConcept)) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const doPan = (e: React.MouseEvent<SVGSVGElement, MouseEvent> | MouseEvent) => {
    if (isEditMode && draggingConcept) {
      doDragConcept(e as React.MouseEvent<SVGSVGElement, MouseEvent>);
      return;
    }
    if (!isPanning) return;
    const dx = (e.clientX - panStart.x);
    const dy = (e.clientY - panStart.y);
    setPanStart({ x: e.clientX, y: e.clientY });
    setViewBox(prevViewBox => {
        const [vx, vy, vwidth, vheight] = prevViewBox.split(" ").map(Number);
        return `${vx - dx / zoomLevel} ${vy - dy / zoomLevel} ${vwidth} ${vheight}`;
    });
  };

  const endPan = () => {
    setIsPanning(false);
    if (isEditMode && draggingConcept) {
      setDraggingConcept(null);
    }
  };

  const startDragConcept = (e: React.MouseEvent<SVGGElement, MouseEvent>, id: number) => {
    if (!isEditMode || e.button !== 0) return;
    e.stopPropagation(); 
    setDraggingConcept(id);
    if (svgRef.current) {
        const CTM = svgRef.current.getScreenCTM();
        if (CTM) {
            let screenPoint = svgRef.current.createSVGPoint();
            screenPoint.x = e.clientX; screenPoint.y = e.clientY;
            let svgGlobalPoint = screenPoint.matrixTransform(CTM.inverse());
            setDragStartPos({ x: svgGlobalPoint.x / zoomLevel, y: svgGlobalPoint.y / zoomLevel });
        }
    }
  };

  const doDragConcept = (e: React.MouseEvent<SVGSVGElement, MouseEvent> | MouseEvent) => {
    if (!isEditMode || !draggingConcept) return;
    if (svgRef.current) {
        const CTM = svgRef.current.getScreenCTM();
        if (CTM) {
            let screenPoint = svgRef.current.createSVGPoint();
            screenPoint.x = e.clientX; screenPoint.y = e.clientY;
            let currentSvgGlobalPoint = screenPoint.matrixTransform(CTM.inverse());
            const currentScaledSvgPoint = { x: currentSvgGlobalPoint.x / zoomLevel, y: currentSvgGlobalPoint.y / zoomLevel };
            const dx = currentScaledSvgPoint.x - dragStartPos.x;
            const dy = currentScaledSvgPoint.y - dragStartPos.y;
            setDragStartPos(currentScaledSvgPoint);
            setConcepts(prev => prev.map(c => c.id === draggingConcept ? { ...c, x: c.x + dx, y: c.y + dy } : c));
        }
    }
  };
  
  const formatTime = (seconds: number): string => {
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value, 10);
    setCurrentTime(newTime);
    if (mediaRef.current) mediaRef.current.currentTime = newTime;
  };

  const handleSpeakerChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSpeaker(e.target.value);

  const togglePlayPause = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        if (mediaRef.current.currentTime >= mediaRef.current.duration - 0.1) mediaRef.current.currentTime = 0;
        mediaRef.current.play().catch(error => console.error("Error playing media:", error));
      }
    }
  };

  const handleSaveLayout = useCallback(() => {
    if (!isEditMode) return;
    const layoutToSave: SavedLayout = {
        positions: concepts.map(c => ({ id: c.id, x: Math.round(c.x), y: Math.round(c.y) })),
        zoomLevel: Number(zoomLevel.toFixed(2)),
        viewBox: viewBox,
        fontSizeScale: Number(fontSizeScale.toFixed(2))
    };
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutToSave));
      alert("Layout saved to localStorage! See console for data to paste into ConceptMap.tsx.");
      console.log("COPY AND PASTE THE FOLLOWING into your ConceptMap.tsx file:");
      console.log("For `defaultPositions` object (replace its content):");
      const positionsObject: { [id: number]: { x: number, y: number } } = {};
      layoutToSave.positions.forEach(p => { positionsObject[p.id] = { x: p.x, y: p.y } });
      console.log(JSON.stringify(positionsObject, null, 2));
      console.log("\nFor `INITIAL_ZOOM_LEVEL` constant (replace its value):");
      console.log(layoutToSave.zoomLevel);
      console.log("\nFor `INITIAL_VIEWBOX` constant (replace its value):");
      console.log(`"${layoutToSave.viewBox}"`);
      console.log("\nFor `INITIAL_FONT_SIZE_SCALE` constant (replace its value):");
      console.log(layoutToSave.fontSizeScale);
    } catch (error) {
      console.error("Failed to save layout:", error);
      alert("Error saving layout. Check console.");
    }
  }, [concepts, isEditMode, zoomLevel, viewBox, fontSizeScale]);


  // --- Derived State for Arrows (depends on visibleConcepts) ---
  const visibleConceptIds = visibleConcepts.map(c => c.id);
  const visibleArrows = arrows.filter(arrow => {
    const fromC = concepts.find(c => c.id === arrow.from);
    const toC = concepts.find(c => c.id === arrow.to);
    return fromC && toC && fromC.width > 0 && toC.width > 0 &&
           visibleConceptIds.includes(arrow.from) &&
           visibleConceptIds.includes(arrow.to);
  });

  // --- JSX Return ---
  return (
    <div className="flex flex-col items-center w-full h-screen p-4 box-border">
      {/* Media Player and Timeline */}
      <div className="w-full max-w-3xl mb-4 px-4">
        {mediaSrc && mediaType === 'video' && (
          <video ref={mediaRef as React.RefObject<HTMLVideoElement>} src={mediaSrc} controls className="w-full mb-2 rounded-lg" />
        )}
        <div className="flex items-center justify-between mb-1">
          {mediaSrc && (
            <button onClick={togglePlayPause} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full mr-2" title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
          )}
          <span className="text-sm font-medium text-gray-700">Media Timeline</span>
          <span className="text-sm text-gray-600">{formatTime(currentTime)} / {formatTime(mediaDuration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{formatTime(0)}</span>
          <input
            type="range" min="0"
            max={mediaDuration > 0 ? Math.floor(mediaDuration) : 0}
            value={Math.floor(currentTime)}
            onChange={handleTimeChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={!mediaSrc || mediaDuration === 0}
          />
          <span className="text-xs text-gray-500">{formatTime(mediaDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex items-center gap-4 flex-wrap justify-center w-full">
        <div>
          <label htmlFor="speaker-filter" className="mr-2 text-gray-700">Filter by Speaker:</label>
          <select id="speaker-filter" className="px-2 py-1 border border-gray-300 rounded bg-white text-gray-800" value={selectedSpeaker} onChange={handleSpeakerChange}>
            <option value="all">All Speakers</option>
            {Object.keys(speakers).map(speaker => (<option key={speaker} value={speaker}>{speaker}</option>))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full" onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={20} /></button>
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full" onClick={handleZoomIn} title="Zoom In"><ZoomIn size={20} /></button>
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full" onClick={handleResetView} title="Reset View"><RefreshCw size={20} /></button>
          <span className="ml-2 text-sm text-gray-600">Zoom: {Math.round(zoomLevel * 100)}%</span>
        </div>
         <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 mr-1">Text:</span>
            <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full" onClick={decreaseFontSize} title="Decrease Font Size"><MinusSquare size={20} /></button>
            <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full" onClick={increaseFontSize} title="Increase Font Size"><PlusSquare size={20} /></button>
            <span className="ml-1 text-sm text-gray-600">{Math.round(fontSizeScale * 100)}%</span>
        </div>
        <div className="text-sm text-gray-600"><Move className="inline-block mr-1" size={16} /> Drag BG to pan</div>
        {isEditMode && (<button onClick={handleSaveLayout} className="p-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2" title="Save Current Layout"><Save size={18} /> Save Layout</button>)}
      </div>

      {/* Visualization */}
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white p-4 w-full flex-grow" style={{ minHeight: "500px" }}>
        {isEditMode && <p className="text-center text-sm text-orange-600 mb-2">EDIT MODE ACTIVE: Arrange map, then "Save Layout".</p>}
        <svg ref={svgRef} width="100%" height="100%" viewBox={viewBox} style={{ cursor: isPanning ? 'grabbing' : (isEditMode && draggingConcept ? 'grabbing' : (isEditMode ? 'grab' : 'default')) }}
          onMouseDown={startPan} onMouseMove={doPan} onMouseUp={endPan} onMouseLeave={endPan}>
          <defs>
            <marker id="arrowhead" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b" /></marker>
            <filter id="activeConceptGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <g transform={`scale(${zoomLevel})`}>
            <g className="concepts">
              {visibleConcepts.map(concept => {
                const isRoot = concept.parent === null;
                const isExpanded = !!expandedConcepts[concept.id];
                const hasChildren = concepts.some(c => c.parent === concept.id && c.id !== concept.id);
                const isDraggingThis = draggingConcept === concept.id;
                const speakerColor = concept.speaker === "All" ? "#1e293b" : speakers[concept.speaker];
                const isActiveByTime = concept.timestamp <= currentTime;
                const opacity = isActiveByTime ? 1 : 0.4;
                const baseFontSize = isRoot ? (concept.text.length > 40 ? 13 : 15) : (concept.width < 180 ? 11 : 12);
                const currentFontSize = Math.max(6, baseFontSize * fontSizeScale);
                const isCurrentlySpeakingActive = concept.id === activeConceptId && isActiveByTime;
                return (
                  <g key={`concept-${concept.id}`} filter={isCurrentlySpeakingActive ? "url(#activeConceptGlow)" : undefined}
                    onClick={(e) => {
                        const target = e.target as SVGElement; 
                        const expanderClicked = target.closest('[data-expander="true"]');
                        if (expanderClicked) { if (hasChildren) { e.stopPropagation(); toggleExpand(concept.id); }} 
                        else if (hasChildren && !isEditMode) { toggleExpand(concept.id); }
                    }}
                    onMouseDown={(e) => { if (isEditMode && !isRoot) { if(e.target instanceof SVGRectElement){ startDragConcept(e, concept.id);}}}}
                    style={{ cursor: (hasChildren && !isEditMode) ? 'pointer' : (isRoot ? 'default' : (isEditMode ? (isDraggingThis ? 'grabbing' : 'grab') : 'default'))}}>
                    <rect x={concept.x - concept.width / 2} y={concept.y - concept.height / 2} width={concept.width} height={concept.height}
                      rx={10} ry={10} fill={speakerColor} fillOpacity={0.8 * opacity}
                      stroke={isCurrentlySpeakingActive ? 'orange' : speakerColor} strokeWidth={isCurrentlySpeakingActive ? 4 : (isDraggingThis ? 3 : 2)}
                      strokeDasharray={isActiveByTime ? "none" : "5,5"}/>
                    <foreignObject x={concept.x - concept.width / 2 + 5} y={concept.y - concept.height / 2 + 5} width={concept.width - 10} height={concept.height - 10}
                      opacity={opacity} pointerEvents="none" >
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'white',
                          fontSize: `${currentFontSize}px`, fontWeight: isRoot ? 'bold' : 'normal', textAlign: 'center',
                          wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.2'}}>
                        {concept.text}
                      </div>
                    </foreignObject>
                    {hasChildren && (
                      <g data-expander="true" style={{ cursor: 'pointer' }} >
                        <circle cx={concept.x + concept.width / 2 - 10} cy={concept.y + concept.height / 2 - 10} r={7} fill="white" opacity={opacity}/>
                        <text x={concept.x + concept.width / 2 - 10} y={concept.y + concept.height / 2 - 10} textAnchor="middle" dominantBaseline="central"
                          fill={speakerColor} fontSize={Math.max(6, 12 * fontSizeScale)} fontWeight="bold" opacity={opacity} pointerEvents="none">
                          {isExpanded ? "-" : "+"}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
            <g className="arrows">
              {visibleArrows.map(arrow => {
                const fromConcept = concepts.find(c => c.id === arrow.from);
                const toConcept = concepts.find(c => c.id === arrow.to);
                if (!fromConcept || !toConcept) return null;
                const arrowIsActiveByTime = arrow.timestamp <= currentTime;
                const opacity = arrowIsActiveByTime ? 1 : 0.3;
                const fromNode = concepts.find(c => c.id === arrow.from);
                const toNode = concepts.find(c => c.id === arrow.to);
                const isFromNodeSpeakingActive = fromNode?.id === activeConceptId && (fromNode?.timestamp <= currentTime);
                const isToNodeSpeakingActive = toNode?.id === activeConceptId && (toNode?.timestamp <= currentTime);
                const isArrowRelatedToActiveConcept = (isFromNodeSpeakingActive || isToNodeSpeakingActive) && arrowIsActiveByTime;
                const fromX = fromConcept.x; const fromY = fromConcept.y;
                const toX = toConcept.x; const toY = toConcept.y;
                const angle = Math.atan2(toY - fromY, toX - fromX);
                const startOffset = Math.min(fromConcept.width, fromConcept.height) / 2 + 2;
                const endOffset = Math.min(toConcept.width, toConcept.height) / 2 + 7;
                const adjustedFromX = fromX + startOffset * Math.cos(angle);
                const adjustedFromY = fromY + startOffset * Math.sin(angle);
                const adjustedToX = toX - endOffset * Math.cos(angle);
                const adjustedToY = toY - endOffset * Math.sin(angle);
                const midX = (adjustedFromX + adjustedToX) / 2; const midY = (adjustedFromY + adjustedToY) / 2;
                const dx = adjustedToX - adjustedFromX; const dy = adjustedToY - adjustedFromY;
                const curveFactor = 0.25;
                const controlX = midX - curveFactor * dy * (Math.abs(dx) > Math.abs(dy) ? 2 : 1);
                const controlY = midY + curveFactor * dx * (Math.abs(dy) > Math.abs(dx) ? 2 : 1);
                const t = 0.5;
                const labelX = (1 - t) * (1 - t) * adjustedFromX + 2 * (1 - t) * t * controlX + t * t * adjustedToX;
                const labelY = (1 - t) * (1 - t) * adjustedFromY + 2 * (1 - t) * t * controlY + t * t * adjustedToY;
                const baseArrowFontSize = 10;
                const currentArrowFontSize = Math.max(5, baseArrowFontSize * fontSizeScale);
                return (
                  <g key={`arrow-group-${arrow.from}-${arrow.to}-${arrow.text}`}>
                    <path d={`M ${adjustedFromX} ${adjustedFromY} Q ${controlX} ${controlY} ${adjustedToX} ${adjustedToY}`}
                      stroke={isArrowRelatedToActiveConcept ? 'darkorange' : '#64748b'} strokeWidth={isArrowRelatedToActiveConcept ? 3 : 2} 
                      strokeDasharray={arrowIsActiveByTime ? "none" : "5,5"} fill="none" opacity={opacity} markerEnd="url(#arrowhead)"/>
                    <g opacity={opacity}>
                      <rect x={labelX - (arrow.text.length * (currentArrowFontSize * 0.4) + 10)} y={labelY - (currentArrowFontSize * 0.5 + 5)} 
                        width={arrow.text.length * (currentArrowFontSize*0.8) + 20} height={currentArrowFontSize + 10}
                        rx={5} ry={5} fill="white" fillOpacity={0.95} stroke={isArrowRelatedToActiveConcept ? 'darkorange' : '#64748b'} 
                        strokeWidth={1} strokeDasharray={arrowIsActiveByTime ? "none" : "3,3"}/>
                      <text x={labelX} y={labelY + 1} textAnchor="middle" dominantBaseline="central" fontSize={currentArrowFontSize} 
                        fill={isArrowRelatedToActiveConcept ? 'darkorange' : '#334155'}>
                        {arrow.text}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {Object.entries(speakers).map(([name, color]) => ( <div key={name} className="flex items-center gap-1"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div><span className="text-sm text-gray-700">{name}</span></div>))}
      </div>
      <div className="mt-4 text-sm text-gray-600 text-center max-w-lg">
        <p>Default video loaded. Use timeline/player to scrub. {isEditMode ? " In Edit Mode, arrange map, then 'Save Layout'." : " Click concepts (+/-) to expand/collapse."}</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1"><svg width="24" height="8"><line x1="2" y1="4" x2="22" y2="4" stroke="#64748b" strokeWidth="2" strokeDasharray="5,5" /></svg><span className="text-xs text-gray-500">Not yet discussed</span></div>
          <div className="flex items-center gap-1"><svg width="24" height="8"><line x1="2" y1="4" x2="22" y2="4" stroke="#64748b" strokeWidth="2" /></svg><span className="text-xs text-gray-500">Discussed</span></div>
        </div>
        {isEditMode && <p className="mt-2 text-xs text-gray-500">To exit Edit Mode, remove '?editMode=true' from URL & refresh.</p>}
      </div>
    </div>
  );
};

export default ConceptMap;